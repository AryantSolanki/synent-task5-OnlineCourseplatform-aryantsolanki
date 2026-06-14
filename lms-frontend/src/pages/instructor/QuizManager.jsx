import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Trash2, Edit2, Eye, BookOpen, Clock, Target,
  ChevronLeft, CheckCircle, XCircle, Users, ToggleLeft, ToggleRight,
  Award, ClipboardList
} from 'lucide-react';
import { quizApi } from '../../api/quizApi';
import QuizBuilder from '../../components/course/QuizBuilder';
import Loader from '../../components/common/Loader';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const EMPTY_FORM = () => ({
  title: '',
  description: '',
  timeLimit: 0,
  passingScore: 70,
  maxAttempts: 3,
  isPublished: true,
  showAnswers: true,
  questions: [],
});

export default function QuizManager() {
  const { courseId } = useParams();
  const qc = useQueryClient();

  const [modalOpen, setModalOpen]   = useState(false);
  const [editTarget, setEditTarget] = useState(null); // null = create mode
  const [form, setForm]             = useState(EMPTY_FORM());
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [viewSubmissions, setViewSubmissions] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['instructor-quizzes', courseId],
    queryFn: () => quizApi.getCourseQuizzes(courseId),
    enabled: !!courseId,
  });

  const { data: subData } = useQuery({
    queryKey: ['quiz-submissions', viewSubmissions?._id],
    queryFn: () => quizApi.getQuizSubmissions(viewSubmissions._id),
    enabled: !!viewSubmissions,
  });

  const quizzes = data?.quizzes ?? [];

  const invalidate = () => qc.invalidateQueries(['instructor-quizzes', courseId]);

  const saveMutation = useMutation({
    mutationFn: (d) => editTarget
      ? quizApi.updateQuiz(editTarget._id, d)
      : quizApi.createQuiz(courseId, d),
    onSuccess: () => {
      toast.success(editTarget ? 'Quiz updated!' : 'Quiz created!');
      setModalOpen(false);
      setEditTarget(null);
      setForm(EMPTY_FORM());
      invalidate();
    },
    onError: err => toast.error(err.response?.data?.message || 'Save failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: quizApi.deleteQuiz,
    onSuccess: () => { toast.success('Quiz deleted'); setDeleteTarget(null); invalidate(); },
    onError: err => toast.error(err.response?.data?.message || 'Delete failed'),
  });

  const togglePublish = useMutation({
    mutationFn: ({ id, val }) => quizApi.updateQuiz(id, { isPublished: val }),
    onSuccess: () => { toast.success('Quiz updated!'); invalidate(); },
  });

  const openCreate = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM());
    setModalOpen(true);
  };

  const openEdit = (quiz) => {
    setEditTarget(quiz);
    setForm({
      title:       quiz.title,
      description: quiz.description || '',
      timeLimit:   quiz.timeLimit,
      passingScore: quiz.passingScore,
      maxAttempts:  quiz.maxAttempts,
      isPublished:  quiz.isPublished,
      showAnswers:  quiz.showAnswers,
      questions:    quiz.questions.map(q => ({ ...q, _tempId: Math.random().toString(36).slice(2) })),
    });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.title.trim()) { toast.error('Quiz title is required'); return; }
    if (!form.questions.length) { toast.error('Add at least one question'); return; }
    const invalid = form.questions.findIndex((q, i) => {
      if (!q.text.trim()) return true;
      if (q.type === 'multiple-choice' && !q.options.some(o => o.isCorrect)) return true;
      if ((q.type === 'true-false' || q.type === 'short-answer') && !q.correctAnswer?.trim()) return true;
      return false;
    });
    if (invalid !== -1) {
      toast.error(`Question ${invalid + 1} is incomplete — add text and correct answer`);
      return;
    }
    saveMutation.mutate(form);
  };

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link to="/instructor/courses" className="p-2 rounded-lg hover:bg-stone-100 text-stone-500">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-stone-900">Quiz Manager</h1>
          <p className="text-stone-400 text-sm">{quizzes.length} quiz{quizzes.length !== 1 ? 'zes' : ''}</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Quiz
        </button>
      </div>

      {/* Quiz list */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Loader size="lg" /></div>
      ) : quizzes.length === 0 ? (
        <div className="card p-12 text-center">
          <ClipboardList className="w-12 h-12 text-stone-300 mx-auto mb-3" />
          <h3 className="font-semibold text-stone-700 mb-1">No quizzes yet</h3>
          <p className="text-stone-400 text-sm mb-4">Create your first quiz to assess student knowledge.</p>
          <button onClick={openCreate} className="btn-primary mx-auto flex items-center gap-2">
            <Plus className="w-4 h-4" /> Create Quiz
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {quizzes.map((quiz) => (
            <div key={quiz._id} className="card p-5 hover:shadow-card-hover transition-all">
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className={clsx(
                  'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                  quiz.isPublished ? 'bg-brand-50 text-brand-600' : 'bg-stone-100 text-stone-400'
                )}>
                  <BookOpen className="w-5 h-5" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-semibold text-stone-900">{quiz.title}</h3>
                    <span className={clsx('badge text-[10px] font-bold uppercase',
                      quiz.isPublished ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-500')}>
                      {quiz.isPublished ? 'Published' : 'Draft'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-4 text-xs text-stone-500">
                    <span className="flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> {quiz.questions?.length ?? 0} questions
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {quiz.timeLimit > 0 ? `${quiz.timeLimit} min` : 'No time limit'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Target className="w-3 h-3" /> Pass: {quiz.passingScore}%
                    </span>
                    <span className="flex items-center gap-1">
                      <Award className="w-3 h-3" /> {quiz.maxAttempts} attempts
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" /> {quiz.submissionCount ?? 0} submissions
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {/* Toggle publish */}
                  <button
                    onClick={() => togglePublish.mutate({ id: quiz._id, val: !quiz.isPublished })}
                    className={clsx('p-2 rounded-lg transition-colors',
                      quiz.isPublished ? 'text-emerald-600 hover:bg-emerald-50' : 'text-stone-400 hover:text-emerald-600 hover:bg-emerald-50')}
                    title={quiz.isPublished ? 'Unpublish' : 'Publish'}>
                    {quiz.isPublished ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                  </button>

                  {/* Submissions */}
                  {quiz.submissionCount > 0 && (
                    <button onClick={() => setViewSubmissions(quiz)}
                      className="p-2 rounded-lg text-stone-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                      title="View submissions">
                      <Eye className="w-4 h-4" />
                    </button>
                  )}

                  <button onClick={() => openEdit(quiz)}
                    className="p-2 rounded-lg text-stone-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                    title="Edit">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => setDeleteTarget(quiz)}
                    className="p-2 rounded-lg text-stone-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Create / Edit Modal ── */}
      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditTarget(null); }}
        title={editTarget ? 'Edit Quiz' : 'Create Quiz'}
        size="xl"
        footer={
          <>
            <button onClick={() => { setModalOpen(false); setEditTarget(null); }} className="btn-secondary">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saveMutation.isPending}
              className="btn-primary flex items-center gap-2">
              {saveMutation.isPending && <Loader size="sm" white />}
              {editTarget ? 'Save Changes' : 'Create Quiz'}
            </button>
          </>
        }
      >
        <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
          {/* Title */}
          <div>
            <label className="text-sm font-semibold text-stone-700 mb-1.5 block">Quiz Title *</label>
            <input type="text" value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="e.g. Chapter 1 Assessment"
              className="input-field" />
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-semibold text-stone-700 mb-1.5 block">Description</label>
            <textarea value={form.description} rows={2}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Brief description about this quiz…"
              className="input-field resize-none" />
          </div>

          {/* Settings row */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-stone-500 mb-1.5 block">Time Limit (min)</label>
              <input type="number" min={0} value={form.timeLimit}
                onChange={e => setForm(p => ({ ...p, timeLimit: Number(e.target.value) || 0 }))}
                placeholder="0 = no limit" className="input-field text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-stone-500 mb-1.5 block">Passing Score (%)</label>
              <input type="number" min={1} max={100} value={form.passingScore}
                onChange={e => setForm(p => ({ ...p, passingScore: Number(e.target.value) || 70 }))}
                className="input-field text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-stone-500 mb-1.5 block">Max Attempts</label>
              <input type="number" min={1} max={10} value={form.maxAttempts}
                onChange={e => setForm(p => ({ ...p, maxAttempts: Number(e.target.value) || 1 }))}
                className="input-field text-sm" />
            </div>
          </div>

          {/* Toggles */}
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.showAnswers}
                onChange={e => setForm(p => ({ ...p, showAnswers: e.target.checked }))}
                className="w-4 h-4 accent-brand-600" />
              <span className="text-sm text-stone-700">Show correct answers after submission</span>
            </label>
          </div>

          {/* Divider */}
          <div className="border-t border-stone-100 pt-4">
            <h4 className="text-sm font-bold text-stone-800 mb-3">
              Questions <span className="text-stone-400 font-normal">({form.questions.length})</span>
            </h4>
            <QuizBuilder
              questions={form.questions}
              onChange={qs => setForm(p => ({ ...p, questions: qs }))}
            />
          </div>
        </div>
      </Modal>

      {/* ── View Submissions Modal ── */}
      <Modal
        open={!!viewSubmissions}
        onClose={() => setViewSubmissions(null)}
        title={`Submissions — ${viewSubmissions?.title}`}
        size="lg"
        footer={<button onClick={() => setViewSubmissions(null)} className="btn-secondary">Close</button>}
      >
        {subData ? (
          <div className="max-h-[60vh] overflow-y-auto">
            {subData.submissions?.length === 0 ? (
              <p className="text-stone-400 text-center py-8">No submissions yet</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-stone-500 text-xs border-b border-stone-100">
                    <th className="pb-2 font-semibold">Student</th>
                    <th className="pb-2 font-semibold">Score</th>
                    <th className="pb-2 font-semibold">%</th>
                    <th className="pb-2 font-semibold">Result</th>
                    <th className="pb-2 font-semibold">Attempt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {subData.submissions.map(sub => (
                    <tr key={sub._id} className="py-2">
                      <td className="py-2.5 pr-4">
                        <p className="font-medium text-stone-800">{sub.student?.name}</p>
                        <p className="text-xs text-stone-400">{sub.student?.email}</p>
                      </td>
                      <td className="py-2.5 pr-4 font-mono text-stone-700">
                        {sub.score}/{sub.maxScore}
                      </td>
                      <td className="py-2.5 pr-4 font-semibold text-stone-700">{sub.percentage}%</td>
                      <td className="py-2.5 pr-4">
                        {sub.passed
                          ? <span className="flex items-center gap-1 text-emerald-600 font-semibold"><CheckCircle className="w-3.5 h-3.5" />Passed</span>
                          : <span className="flex items-center gap-1 text-red-500 font-semibold"><XCircle className="w-3.5 h-3.5" />Failed</span>}
                      </td>
                      <td className="py-2.5 text-stone-500">#{sub.attemptNumber}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          <div className="flex justify-center py-8"><Loader /></div>
        )}
      </Modal>

      {/* ── Delete confirm ── */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget._id)}
        loading={deleteMutation.isPending}
        title="Delete quiz?"
        message={`"${deleteTarget?.title}" and all its submissions will be permanently deleted.`}
        confirmLabel="Delete Quiz"
      />
    </div>
  );
}
