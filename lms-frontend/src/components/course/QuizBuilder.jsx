import { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp, CheckCircle, GripVertical } from 'lucide-react';
import clsx from 'clsx';

const DEFAULT_QUESTION = () => ({
  _tempId: Math.random().toString(36).slice(2),
  type: 'multiple-choice',
  text: '',
  points: 1,
  explanation: '',
  options: [
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
  ],
  correctAnswer: '', // for true-false / short-answer
});

export default function QuizBuilder({ questions = [], onChange }) {
  const [expanded, setExpanded] = useState({ 0: true });

  const update = (newQs) => onChange(newQs);

  const addQuestion = () => {
    const newQ = DEFAULT_QUESTION();
    const next = [...questions, newQ];
    update(next);
    setExpanded(p => ({ ...p, [next.length - 1]: true }));
  };

  const removeQuestion = (idx) => {
    update(questions.filter((_, i) => i !== idx));
  };

  const updateQuestion = (idx, patch) => {
    update(questions.map((q, i) => i === idx ? { ...q, ...patch } : q));
  };

  const updateOption = (qIdx, optIdx, text) => {
    const q = questions[qIdx];
    const options = q.options.map((o, i) => i === optIdx ? { ...o, text } : o);
    updateQuestion(qIdx, { options });
  };

  const setCorrectOption = (qIdx, optIdx) => {
    const q = questions[qIdx];
    const options = q.options.map((o, i) => ({ ...o, isCorrect: i === optIdx }));
    updateQuestion(qIdx, { options });
  };

  const addOption = (qIdx) => {
    const q = questions[qIdx];
    updateQuestion(qIdx, { options: [...q.options, { text: '', isCorrect: false }] });
  };

  const removeOption = (qIdx, optIdx) => {
    const q = questions[qIdx];
    if (q.options.length <= 2) return;
    const options = q.options.filter((_, i) => i !== optIdx);
    // If removed option was correct, clear correctness
    updateQuestion(qIdx, { options: options.map(o => ({ ...o })) });
  };

  const changeType = (qIdx, type) => {
    const q = questions[qIdx];
    const patch = { type, correctAnswer: '' };
    if (type === 'multiple-choice') {
      patch.options = q.options?.length >= 2 ? q.options : [
        { text: '', isCorrect: false }, { text: '', isCorrect: false },
        { text: '', isCorrect: false }, { text: '', isCorrect: false },
      ];
    }
    updateQuestion(qIdx, patch);
  };

  if (questions.length === 0) {
    return (
      <div className="border-2 border-dashed border-stone-300 rounded-xl p-8 text-center">
        <p className="text-stone-400 text-sm mb-4">No questions yet. Add your first question below.</p>
        <button type="button" onClick={addQuestion}
          className="btn-primary flex items-center gap-2 mx-auto">
          <Plus className="w-4 h-4" /> Add Question
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {questions.map((q, idx) => {
        const isOpen = !!expanded[idx];
        const isValid = q.text.trim() && (
          q.type === 'multiple-choice'
            ? q.options.some(o => o.isCorrect) && q.options.every(o => o.text.trim())
            : q.correctAnswer.trim()
        );

        return (
          <div key={q._tempId ?? q._id ?? idx} className={clsx(
            'border rounded-xl overflow-hidden transition-all',
            isValid ? 'border-stone-200 bg-white' : 'border-amber-200 bg-amber-50/40'
          )}>
            {/* Question header */}
            <div className="flex items-center gap-3 px-4 py-3">
              <GripVertical className="w-4 h-4 text-stone-300 flex-shrink-0 cursor-grab" />
              <span className="w-6 h-6 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                {idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className={clsx('text-sm truncate', q.text ? 'text-stone-800 font-medium' : 'text-stone-400 italic')}>
                  {q.text || 'Untitled question'}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-stone-400 capitalize">
                    {q.type.replace('-', ' ')}
                  </span>
                  <span className="text-[10px] text-stone-400">· {q.points} pt{q.points !== 1 ? 's' : ''}</span>
                  {isValid && <CheckCircle className="w-3 h-3 text-emerald-500" />}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => removeQuestion(idx)}
                  className="p-1.5 text-stone-300 hover:text-red-500 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => setExpanded(p => ({ ...p, [idx]: !p[idx] }))}
                  className="p-1.5 text-stone-400 hover:text-stone-600 transition-colors">
                  {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Question body */}
            {isOpen && (
              <div className="px-4 pb-4 space-y-4 border-t border-stone-100 pt-4">
                {/* Question text */}
                <div>
                  <label className="text-xs font-semibold text-stone-500 mb-1.5 block">Question Text *</label>
                  <textarea
                    value={q.text}
                    onChange={e => updateQuestion(idx, { text: e.target.value })}
                    rows={2}
                    placeholder="Enter your question…"
                    className="input-field resize-none text-sm"
                  />
                </div>

                {/* Type + Points row */}
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-xs font-semibold text-stone-500 mb-1.5 block">Question Type</label>
                    <select value={q.type} onChange={e => changeType(idx, e.target.value)}
                      className="input-field text-sm bg-white">
                      <option value="multiple-choice">Multiple Choice</option>
                      <option value="true-false">True / False</option>
                      <option value="short-answer">Short Answer</option>
                    </select>
                  </div>
                  <div className="w-28">
                    <label className="text-xs font-semibold text-stone-500 mb-1.5 block">Points</label>
                    <input type="number" min={1} max={100}
                      value={q.points}
                      onChange={e => updateQuestion(idx, { points: Number(e.target.value) || 1 })}
                      className="input-field text-sm" />
                  </div>
                </div>

                {/* MCQ options */}
                {q.type === 'multiple-choice' && (
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-stone-500 block">Answer Options (select correct one) *</label>
                    {q.options.map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        <button type="button" onClick={() => setCorrectOption(idx, oi)}
                          className={clsx(
                            'w-5 h-5 rounded-full border-2 flex-shrink-0 transition-colors',
                            opt.isCorrect ? 'border-emerald-500 bg-emerald-500' : 'border-stone-300 hover:border-emerald-400'
                          )}
                          title="Mark as correct">
                          {opt.isCorrect && <span className="block w-2 h-2 bg-white rounded-full mx-auto" />}
                        </button>
                        <input
                          type="text"
                          value={opt.text}
                          onChange={e => updateOption(idx, oi, e.target.value)}
                          placeholder={`Option ${oi + 1}`}
                          className={clsx(
                            'flex-1 input-field text-sm py-2',
                            opt.isCorrect ? 'border-emerald-400 bg-emerald-50' : ''
                          )}
                        />
                        {q.options.length > 2 && (
                          <button type="button" onClick={() => removeOption(idx, oi)}
                            className="p-1 text-stone-300 hover:text-red-400 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                    {q.options.length < 6 && (
                      <button type="button" onClick={() => addOption(idx)}
                        className="flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 font-medium mt-1">
                        <Plus className="w-3.5 h-3.5" /> Add option
                      </button>
                    )}
                  </div>
                )}

                {/* True / False */}
                {q.type === 'true-false' && (
                  <div>
                    <label className="text-xs font-semibold text-stone-500 mb-1.5 block">Correct Answer *</label>
                    <div className="flex gap-3">
                      {['true', 'false'].map(val => (
                        <button key={val} type="button"
                          onClick={() => updateQuestion(idx, { correctAnswer: val })}
                          className={clsx(
                            'flex-1 py-2 rounded-lg border-2 text-sm font-semibold capitalize transition-all',
                            q.correctAnswer === val
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                              : 'border-stone-200 text-stone-500 hover:border-stone-300'
                          )}>
                          {val === 'true' ? '✓ True' : '✗ False'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Short Answer */}
                {q.type === 'short-answer' && (
                  <div>
                    <label className="text-xs font-semibold text-stone-500 mb-1.5 block">Expected Answer *</label>
                    <input type="text" value={q.correctAnswer}
                      onChange={e => updateQuestion(idx, { correctAnswer: e.target.value })}
                      placeholder="Expected answer (case-insensitive match)"
                      className="input-field text-sm" />
                    <p className="text-[10px] text-stone-400 mt-1">Student's answer must contain or match this text.</p>
                  </div>
                )}

                {/* Explanation (shown to student after grading) */}
                <div>
                  <label className="text-xs font-semibold text-stone-500 mb-1.5 block">
                    Explanation <span className="font-normal text-stone-400">(optional — shown after grading)</span>
                  </label>
                  <input type="text" value={q.explanation}
                    onChange={e => updateQuestion(idx, { explanation: e.target.value })}
                    placeholder="Explain why this is the correct answer…"
                    className="input-field text-sm" />
                </div>
              </div>
            )}
          </div>
        );
      })}

      <button type="button" onClick={addQuestion}
        className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-stone-300 rounded-xl text-sm text-stone-500 hover:border-brand-400 hover:text-brand-600 hover:bg-brand-50 transition-all font-medium">
        <Plus className="w-4 h-4" /> Add Question
      </button>
    </div>
  );
}
