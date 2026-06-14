import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen, Clock, Target, Award, ChevronDown, ChevronUp,
  CheckCircle, XCircle, ArrowRight, ArrowLeft, Send,
  RefreshCw, AlertCircle, Trophy, AlertTriangle
} from 'lucide-react';
import { quizApi } from '../../api/quizApi';
import Loader from '../common/Loader';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export default function StudentQuizPanel({ courseId }) {
  const qc = useQueryClient();
  const [activeQuiz, setActiveQuiz]   = useState(null); // quiz being taken
  const [resultView, setResultView]   = useState(null); // { quiz, result }

  const { data, isLoading } = useQuery({
    queryKey: ['student-quizzes', courseId],
    queryFn: () => quizApi.getStudentQuizzes(courseId),
    enabled: !!courseId,
  });

  const quizzes = data?.quizzes ?? [];

  if (isLoading) return <div className="flex justify-center py-8"><Loader /></div>;

  if (quizzes.length === 0) {
    return (
      <div className="text-center py-12">
        <BookOpen className="w-10 h-10 text-stone-600 mx-auto mb-3" />
        <p className="text-stone-400 text-sm">No quizzes for this course yet.</p>
      </div>
    );
  }

  // Taking a quiz
  if (activeQuiz) {
    return (
      <QuizTaker
        quiz={activeQuiz}
        onFinish={(result) => {
          setActiveQuiz(null);
          setResultView({ quiz: activeQuiz, result });
          qc.invalidateQueries(['student-quizzes', courseId]);
        }}
        onCancel={() => setActiveQuiz(null)}
      />
    );
  }

  // Viewing a result
  if (resultView) {
    return (
      <QuizResultView
        quiz={resultView.quiz}
        result={resultView.result}
        attemptsLeft={resultView.result.attemptsLeft}
        onRetry={() => { setActiveQuiz(resultView.quiz); setResultView(null); }}
        onBack={() => setResultView(null)}
      />
    );
  }

  // Quiz list
  return (
    <div className="space-y-3 p-1">
      <p className="text-stone-400 text-xs font-semibold uppercase tracking-wider">
        {quizzes.length} Quiz{quizzes.length !== 1 ? 'zes' : ''}
      </p>

      {quizzes.map((quiz) => (
        <QuizCard
          key={quiz._id}
          quiz={quiz}
          onStart={() => setActiveQuiz(quiz)}
          onViewResult={(result) => setResultView({ quiz, result })}
        />
      ))}
    </div>
  );
}

/* ── Quiz list card ─────────────────────────────────────── */
function QuizCard({ quiz, onStart, onViewResult }) {
  const [expanded, setExpanded] = useState(false);

  const sub = quiz.mySubmission;
  const hasTaken = !!sub;
  const passed   = sub?.passed;
  const canRetry = quiz.attemptsLeft > 0;

  const handleViewResult = () => {
    quizApi.getMyQuizResult(quiz._id).then(res => {
      if (res.result) onViewResult(res.result);
    }).catch(() => toast.error('Could not load result'));
  };

  const statusBadge = hasTaken
    ? passed
      ? { cls: 'bg-emerald-900/40 text-emerald-400', label: `Passed · ${sub.percentage}%` }
      : { cls: 'bg-red-900/40 text-red-400',         label: `Failed · ${sub.percentage}%` }
    : { cls: 'bg-stone-700 text-stone-400', label: 'Not attempted' };

  return (
    <div className={clsx(
      'rounded-xl border overflow-hidden transition-all',
      hasTaken && passed  ? 'border-emerald-700/50 bg-emerald-950/20' :
      hasTaken && !passed ? 'border-red-800/50 bg-red-950/20' :
                            'border-stone-700 bg-stone-800/40'
    )}>
      {/* Header */}
      <button className="w-full flex items-start justify-between gap-3 p-4 text-left"
        onClick={() => setExpanded(p => !p)}>
        <div className="flex items-start gap-3">
          <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5',
            hasTaken && passed  ? 'bg-emerald-800/50 text-emerald-400' :
            hasTaken && !passed ? 'bg-red-800/50 text-red-400' :
                                  'bg-stone-700 text-stone-400')}>
            {hasTaken && passed  ? <Trophy className="w-4 h-4" /> :
             hasTaken && !passed ? <XCircle className="w-4 h-4" /> :
                                   <BookOpen className="w-4 h-4" />}
          </div>

          <div>
            <p className="text-white font-semibold text-sm">{quiz.title}</p>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className={clsx('text-[10px] font-bold px-2 py-0.5 rounded-full', statusBadge.cls)}>
                {statusBadge.label}
              </span>
              <span className="text-[10px] text-stone-500">
                {quiz.questions?.length ?? 0} Qs
              </span>
              {quiz.timeLimit > 0 && (
                <span className="text-[10px] text-stone-500 flex items-center gap-0.5">
                  <Clock className="w-3 h-3" /> {quiz.timeLimit}m
                </span>
              )}
              <span className="text-[10px] text-stone-500">Pass: {quiz.passingScore}%</span>
            </div>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-stone-500 mt-1" /> : <ChevronDown className="w-4 h-4 text-stone-500 mt-1" />}
      </button>

      {/* Body */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-stone-700/50 pt-4 space-y-3">
          {quiz.description && (
            <p className="text-stone-300 text-sm leading-relaxed">{quiz.description}</p>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: BookOpen, label: 'Questions', val: quiz.questions?.length ?? 0 },
              { icon: Target,   label: 'To pass',   val: `${quiz.passingScore}%` },
              { icon: Award,    label: 'Attempts',  val: `${quiz.attemptsLeft} left` },
            ].map(({ icon: Icon, label, val }) => (
              <div key={label} className="bg-stone-900/50 rounded-lg p-2.5 text-center border border-stone-700">
                <Icon className="w-4 h-4 text-stone-400 mx-auto mb-1" />
                <p className="text-white text-sm font-bold">{val}</p>
                <p className="text-stone-500 text-[10px]">{label}</p>
              </div>
            ))}
          </div>

          {/* Attempt limit warning */}
          {!canRetry && hasTaken && (
            <div className="flex items-center gap-2 text-amber-400 text-xs bg-amber-900/20 px-3 py-2 rounded-lg border border-amber-800/30">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              Maximum attempts reached.
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            {hasTaken && (
              <button onClick={handleViewResult}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-stone-700 text-stone-200 text-sm font-semibold hover:bg-stone-600 transition-colors">
                <CheckCircle className="w-4 h-4" /> View Result
              </button>
            )}
            {canRetry && (
              <button onClick={onStart}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors">
                {hasTaken ? <><RefreshCw className="w-4 h-4" /> Retry Quiz</> : <><ArrowRight className="w-4 h-4" /> Start Quiz</>}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Quiz taker (in-progress) ───────────────────────────── */
function QuizTaker({ quiz, onFinish, onCancel }) {
  const totalQs = quiz.questions?.length ?? 0;
  const [current, setCurrent]   = useState(0);
  const [answers, setAnswers]   = useState({}); // { questionId: { selectedOption?, textAnswer? } }
  const [timeLeft, setTimeLeft] = useState(quiz.timeLimit > 0 ? quiz.timeLimit * 60 : null);
  const timerRef = useRef(null);

  const submitMutation = useMutation({
    mutationFn: () => {
      const payload = quiz.questions.map(q => ({
        questionId:     q._id,
        selectedOption: answers[q._id]?.selectedOption,
        textAnswer:     answers[q._id]?.textAnswer,
      }));
      return quizApi.submitQuiz(quiz._id, payload);
    },
    onSuccess: (res) => {
      toast.success(res.message);
      onFinish(res.result);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Submission failed'),
  });

  // Timer
  useEffect(() => {
    if (timeLeft === null) return;
    if (timeLeft <= 0) { submitMutation.mutate(); return; }
    timerRef.current = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(timerRef.current);
  }, [timeLeft]);

  const question    = quiz.questions[current];
  const answered    = Object.keys(answers).length;
  const progress    = Math.round((answered / totalQs) * 100);
  const currAnswered = answers[question?._id] !== undefined;

  const setAnswer = (qId, patch) => setAnswers(p => ({ ...p, [qId]: { ...(p[qId] || {}), ...patch } }));

  const formatTime = (secs) => {
    if (secs === null) return null;
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const isTimeLow = timeLeft !== null && timeLeft <= 60;

  return (
    <div className="space-y-4">
      {/* Quiz header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white font-bold">{quiz.title}</h3>
          <p className="text-stone-400 text-xs">Question {current + 1} of {totalQs}</p>
        </div>
        <div className="flex items-center gap-3">
          {timeLeft !== null && (
            <div className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-mono font-bold',
              isTimeLow ? 'bg-red-900/40 text-red-400 animate-pulse' : 'bg-stone-800 text-stone-200'
            )}>
              <Clock className="w-4 h-4" />
              {formatTime(timeLeft)}
            </div>
          )}
          <button onClick={onCancel}
            className="px-3 py-1.5 rounded-lg bg-stone-800 text-stone-400 text-xs hover:text-stone-200 transition-colors">
            Cancel
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-stone-700 rounded-full overflow-hidden">
        <div className="h-full bg-brand-500 rounded-full transition-all"
          style={{ width: `${((current + 1) / totalQs) * 100}%` }} />
      </div>

      {/* Question card */}
      {question && (
        <div className="bg-stone-800/40 border border-stone-700 rounded-xl p-5 space-y-4">
          {/* Question number + points */}
          <div className="flex items-start justify-between gap-3">
            <p className="text-white font-semibold leading-snug">{question.text}</p>
            <span className="text-[10px] text-stone-400 bg-stone-700 px-2 py-0.5 rounded-full flex-shrink-0 mt-1">
              {question.points} pt{question.points !== 1 ? 's' : ''}
            </span>
          </div>

          {/* MCQ */}
          {question.type === 'multiple-choice' && (
            <div className="space-y-2">
              {question.options.map((opt, oi) => {
                const selected = answers[question._id]?.selectedOption === oi;
                return (
                  <button key={oi} type="button"
                    onClick={() => setAnswer(question._id, { selectedOption: oi })}
                    className={clsx(
                      'w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all text-sm',
                      selected
                        ? 'border-brand-500 bg-brand-900/30 text-white'
                        : 'border-stone-600 text-stone-300 hover:border-stone-500 hover:text-white hover:bg-stone-700/30'
                    )}>
                    <div className={clsx(
                      'w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center',
                      selected ? 'border-brand-400 bg-brand-500' : 'border-stone-500'
                    )}>
                      {selected && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                    </div>
                    <span>{opt.text}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* True / False */}
          {question.type === 'true-false' && (
            <div className="flex gap-3">
              {['true', 'false'].map(val => {
                const selected = answers[question._id]?.textAnswer === val;
                return (
                  <button key={val} type="button"
                    onClick={() => setAnswer(question._id, { textAnswer: val })}
                    className={clsx(
                      'flex-1 py-3 rounded-xl border-2 text-sm font-semibold capitalize transition-all',
                      selected
                        ? 'border-brand-500 bg-brand-900/30 text-brand-300'
                        : 'border-stone-600 text-stone-400 hover:border-stone-500 hover:text-white'
                    )}>
                    {val === 'true' ? '✓ True' : '✗ False'}
                  </button>
                );
              })}
            </div>
          )}

          {/* Short Answer */}
          {question.type === 'short-answer' && (
            <input type="text"
              value={answers[question._id]?.textAnswer || ''}
              onChange={e => setAnswer(question._id, { textAnswer: e.target.value })}
              placeholder="Type your answer here…"
              className="w-full bg-stone-900 border border-stone-600 text-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder-stone-600"
            />
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center gap-3">
        <button onClick={() => setCurrent(c => Math.max(0, c - 1))} disabled={current === 0}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-stone-800 text-stone-300 text-sm font-semibold hover:text-white disabled:opacity-30 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Prev
        </button>

        <div className="flex-1 flex items-center justify-center gap-1 flex-wrap">
          {quiz.questions.map((q, i) => {
            const isAnswered = answers[q._id] !== undefined && (
              answers[q._id].selectedOption !== undefined ||
              answers[q._id].textAnswer !== undefined && answers[q._id].textAnswer !== ''
            );
            return (
              <button key={i} onClick={() => setCurrent(i)}
                className={clsx(
                  'w-7 h-7 rounded-full text-xs font-bold transition-all',
                  i === current
                    ? 'bg-brand-600 text-white'
                    : isAnswered
                      ? 'bg-emerald-800/60 text-emerald-400'
                      : 'bg-stone-700 text-stone-400 hover:bg-stone-600'
                )}>
                {i + 1}
              </button>
            );
          })}
        </div>

        {current < totalQs - 1 ? (
          <button onClick={() => setCurrent(c => Math.min(totalQs - 1, c + 1))}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-stone-800 text-stone-300 text-sm font-semibold hover:text-white transition-colors">
            Next <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button onClick={() => submitMutation.mutate()}
            disabled={submitMutation.isPending}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors disabled:opacity-60">
            {submitMutation.isPending ? <Loader size="sm" white /> : <Send className="w-4 h-4" />}
            Submit Quiz
          </button>
        )}
      </div>

      {/* Answered count */}
      <p className="text-[11px] text-stone-500 text-center">
        {answered} of {totalQs} answered
        {answered < totalQs && ' — unanswered questions will be marked incorrect'}
      </p>
    </div>
  );
}

/* ── Result view ────────────────────────────────────────── */
function QuizResultView({ quiz, result, attemptsLeft, onRetry, onBack }) {
  const { score, maxScore, percentage, passed, passingScore, questionBreakdown = [], showAnswers } = result;
  const [showBreakdown, setShowBreakdown] = useState(false);

  return (
    <div className="space-y-4">
      {/* Back */}
      <button onClick={onBack}
        className="flex items-center gap-1.5 text-stone-400 hover:text-white text-sm transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to quizzes
      </button>

      {/* Score card */}
      <div className={clsx(
        'rounded-2xl border p-6 text-center',
        passed ? 'bg-emerald-950/30 border-emerald-700/50' : 'bg-red-950/30 border-red-700/50'
      )}>
        {/* Score circle */}
        <div className={clsx(
          'w-28 h-28 rounded-full border-[6px] flex flex-col items-center justify-center mx-auto mb-4',
          passed ? 'border-emerald-500 bg-emerald-900/40' : 'border-red-500 bg-red-900/40'
        )}>
          <span className={clsx('text-3xl font-extrabold', passed ? 'text-emerald-400' : 'text-red-400')}>
            {percentage}%
          </span>
          <span className="text-[11px] text-stone-400">{score}/{maxScore} pts</span>
        </div>

        {/* Pass / fail */}
        <div className="flex items-center justify-center gap-2 mb-1">
          {passed
            ? <CheckCircle className="w-6 h-6 text-emerald-400" />
            : <XCircle className="w-6 h-6 text-red-400" />}
          <span className={clsx('text-xl font-bold', passed ? 'text-emerald-300' : 'text-red-300')}>
            {passed ? 'Passed! 🎉' : 'Not Passed'}
          </span>
        </div>
        <p className="text-stone-400 text-sm">
          Passing score: {passingScore}% · Attempt #{result.attemptNumber}
        </p>

        {/* Progress bar */}
        <div className="h-3 bg-stone-700 rounded-full overflow-hidden mt-4">
          <div className={clsx('h-full rounded-full transition-all', passed ? 'bg-emerald-500' : 'bg-red-500')}
            style={{ width: `${percentage}%` }} />
        </div>

        {/* Passing bar marker */}
        <div className="relative h-0">
          <div className="absolute top-[-1px] h-4 w-0.5 bg-white/40"
            style={{ left: `${passingScore}%`, transform: 'translateX(-50%)' }} />
        </div>
      </div>

      {/* Quick stats */}
      {questionBreakdown.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Correct',   val: questionBreakdown.filter(q => q.isCorrect).length, cls: 'text-emerald-400' },
            { label: 'Wrong',     val: questionBreakdown.filter(q => !q.isCorrect).length, cls: 'text-red-400' },
            { label: 'Questions', val: questionBreakdown.length, cls: 'text-stone-300' },
          ].map(({ label, val, cls }) => (
            <div key={label} className="bg-stone-800/40 border border-stone-700 rounded-xl p-3 text-center">
              <p className={clsx('text-xl font-bold', cls)}>{val}</p>
              <p className="text-stone-500 text-xs">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Question breakdown toggle */}
      {showAnswers && questionBreakdown.length > 0 && (
        <div>
          <button onClick={() => setShowBreakdown(p => !p)}
            className="w-full flex items-center justify-between px-4 py-3 bg-stone-800/40 border border-stone-700 rounded-xl text-sm text-stone-300 hover:text-white transition-colors">
            <span className="font-semibold">Question Breakdown</span>
            {showBreakdown ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showBreakdown && (
            <div className="mt-2 space-y-2">
              {questionBreakdown.map((q, i) => (
                <div key={String(q._id)} className={clsx(
                  'rounded-xl border p-4 space-y-2',
                  q.isCorrect ? 'bg-emerald-950/20 border-emerald-800/40' : 'bg-red-950/20 border-red-800/40'
                )}>
                  <div className="flex items-start gap-2.5">
                    <div className={clsx('w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
                      q.isCorrect ? 'bg-emerald-700/60' : 'bg-red-700/60')}>
                      {q.isCorrect
                        ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                        : <XCircle className="w-3.5 h-3.5 text-red-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-stone-200 text-sm font-medium">Q{i + 1}. {q.text}</p>
                      <p className="text-[10px] text-stone-500 mt-0.5 capitalize">
                        {q.type.replace('-', ' ')} · {q.pointsEarned}/{q.points} pts
                      </p>
                    </div>
                  </div>

                  {/* Your answer */}
                  <div className="ml-7 space-y-1.5">
                    {q.type === 'multiple-choice' && q.options && (
                      <div className="space-y-1">
                        {q.options.map((opt, oi) => {
                          const isSelected = q.selectedOption === oi;
                          const isCorrect  = opt.isCorrect;
                          return (
                            <div key={oi} className={clsx(
                              'flex items-center gap-2 text-xs px-2 py-1 rounded-lg',
                              isCorrect  ? 'bg-emerald-900/40 text-emerald-300' :
                              isSelected ? 'bg-red-900/40 text-red-300' :
                                           'text-stone-500'
                            )}>
                              <div className={clsx('w-3.5 h-3.5 rounded-full border flex-shrink-0',
                                isCorrect ? 'border-emerald-500 bg-emerald-500' :
                                isSelected ? 'border-red-400 bg-red-400' : 'border-stone-600')}>
                              </div>
                              {opt.text}
                              {isCorrect && <span className="ml-auto text-emerald-400 font-bold">✓ Correct</span>}
                              {isSelected && !isCorrect && <span className="ml-auto text-red-400 font-bold">✗ Your answer</span>}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {q.type === 'true-false' && (
                      <div className="flex gap-2 text-xs">
                        <span className="text-stone-400">Your answer:</span>
                        <span className={clsx('font-semibold capitalize',
                          q.isCorrect ? 'text-emerald-400' : 'text-red-400')}>
                          {q.textAnswer || '—'}
                        </span>
                        {!q.isCorrect && (
                          <>
                            <span className="text-stone-500">·</span>
                            <span className="text-emerald-400 font-semibold capitalize">
                              Correct: {q.correctAnswer}
                            </span>
                          </>
                        )}
                      </div>
                    )}

                    {q.type === 'short-answer' && (
                      <div className="flex gap-2 text-xs flex-wrap">
                        <span className="text-stone-400">Your answer:</span>
                        <span className={clsx('font-semibold', q.isCorrect ? 'text-emerald-400' : 'text-red-400')}>
                          "{q.textAnswer || 'no answer'}"
                        </span>
                        {!q.isCorrect && (
                          <>
                            <span className="text-stone-500">·</span>
                            <span className="text-stone-400">Expected:</span>
                            <span className="text-emerald-400 font-semibold">"{q.correctAnswer}"</span>
                          </>
                        )}
                      </div>
                    )}

                    {/* Explanation */}
                    {q.explanation && (
                      <div className="flex items-start gap-1.5 mt-1.5 bg-stone-800/50 rounded-lg p-2">
                        <AlertCircle className="w-3.5 h-3.5 text-brand-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-stone-300 leading-relaxed">{q.explanation}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Retry */}
      <div className="flex gap-2">
        <button onClick={onBack}
          className="flex-1 py-3 rounded-xl bg-stone-800 text-stone-300 text-sm font-semibold hover:text-white transition-colors">
          Back to List
        </button>
        {attemptsLeft > 0 && (
          <button onClick={onRetry}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors">
            <RefreshCw className="w-4 h-4" /> Retry ({attemptsLeft} left)
          </button>
        )}
      </div>
    </div>
  );
}
