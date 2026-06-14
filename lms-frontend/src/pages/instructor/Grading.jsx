import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckSquare, Clock, FileText, Star, ChevronDown, MessageSquare } from 'lucide-react';
import { instructorApi } from '../../api/instructorApi';
import { useQuery as useQ } from '@tanstack/react-query';
import Avatar from '../../components/common/Avatar';
import PageHeader from '../../components/ui/PageHeader';
import Modal from '../../components/ui/Modal';
import EmptyState from '../../components/ui/EmptyState';
import Loader from '../../components/common/Loader';
import { formatDate } from '../../utils/formatters';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import API from '../../api/axios';

const fetchAssignments = (courseId) =>
  API.get(`/instructor/courses/${courseId}/assignments`).then(r => r.data).catch(() => ({ assignments: [] }));

export default function Grading() {
  const qc = useQueryClient();
  const [selectedCourse, setSelectedCourse]       = useState('');
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [gradingTarget, setGradingTarget]          = useState(null);
  const [gradeForm, setGradeForm] = useState({ score: '', feedback: '' });

  const { data: coursesData } = useQ({
    queryKey: ['instructor-courses'],
    queryFn: () => instructorApi.getMyCourses({ status: 'published' }),
  });

  const { data: assignData, isLoading: loadingAssignments } = useQ({
    queryKey: ['assignments', selectedCourse],
    queryFn: () => fetchAssignments(selectedCourse),
    enabled: !!selectedCourse,
  });

  const { data: subData, isLoading: loadingSubs } = useQ({
    queryKey: ['submissions', selectedAssignment?._id],
    queryFn: () => instructorApi.getSubmissions(selectedAssignment._id),
    enabled: !!selectedAssignment,
  });

  const gradeMutation = useMutation({
    mutationFn: ({ id, data }) => instructorApi.gradeSubmission(id, data),
    onSuccess: () => {
      toast.success('Graded successfully!');
      qc.invalidateQueries(['submissions', selectedAssignment?._id]);
      setGradingTarget(null);
      setGradeForm({ score: '', feedback: '' });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Grading failed'),
  });

  const courses     = coursesData?.courses?.filter(c => c.status === 'published') ?? [];
  const assignments = assignData?.assignments ?? [];
  const submissions = subData?.submissions ?? [];

  const openGrade = (sub) => {
    setGradingTarget(sub);
    setGradeForm({ score: sub.score ?? '', feedback: sub.feedback ?? '' });
  };

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Grading" subtitle="Review and grade student submissions" />

      {/* Step 1: Select course */}
      <div className="card p-5 mb-4">
        <label className="text-sm font-semibold text-stone-700 mb-3 block">1. Select Course</label>
        <select value={selectedCourse} onChange={e => { setSelectedCourse(e.target.value); setSelectedAssignment(null); }}
          className="input-field max-w-sm">
          <option value="">Choose a course…</option>
          {courses.map(c => <option key={c._id} value={c._id}>{c.title}</option>)}
        </select>
      </div>

      {/* Step 2: Select assignment */}
      {selectedCourse && (
        <div className="card p-5 mb-4">
          <label className="text-sm font-semibold text-stone-700 mb-3 block">2. Select Assignment</label>
          {loadingAssignments ? <Loader size="sm" /> : assignments.length === 0 ? (
            <p className="text-sm text-stone-400 italic">No assignments for this course.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {assignments.map(a => (
                <button key={a._id} onClick={() => setSelectedAssignment(a)}
                  className={clsx('px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all',
                    selectedAssignment?._id === a._id ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-stone-200 text-stone-600 hover:border-stone-300')}>
                  {a.title}
                  <span className="text-xs ml-1.5 opacity-60">/{a.maxScore} pts</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Submissions */}
      {selectedAssignment && (
        <div className="card">
          <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
            <h2 className="font-bold text-stone-900">{selectedAssignment.title} — Submissions</h2>
            <div className="flex gap-3 text-xs text-stone-500">
              <span>{submissions.filter(s => s.status === 'graded').length}/{submissions.length} graded</span>
            </div>
          </div>

          {loadingSubs ? (
            <div className="flex justify-center py-16"><Loader /></div>
          ) : submissions.length === 0 ? (
            <EmptyState compact icon="📝" title="No submissions yet" description="Students haven't submitted yet." />
          ) : (
            <ul className="divide-y divide-stone-50">
              {submissions.map((sub) => (
                <li key={sub._id} className="flex items-center gap-4 px-6 py-4">
                  <Avatar src={sub.student?.profilePicture} name={sub.student?.name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-stone-800 text-sm">{sub.student?.name}</p>
                    <p className="text-xs text-stone-400">{sub.student?.email}</p>
                    {sub.textContent && (
                      <p className="text-xs text-stone-500 mt-1 line-clamp-1">{sub.textContent}</p>
                    )}
                    {sub.fileUrl && (
                      <a href={sub.fileUrl} target="_blank" rel="noreferrer"
                        className="text-xs text-brand-600 hover:underline mt-1 flex items-center gap-1">
                        <FileText className="w-3 h-3" /> View submitted file
                      </a>
                    )}
                    <p className="text-[10px] text-stone-400 mt-1">{formatDate(sub.createdAt)}{sub.isLate && <span className="text-amber-600 ml-1">· Late</span>}</p>
                  </div>

                  {/* Score display */}
                  <div className="text-right flex-shrink-0">
                    {sub.status === 'graded' ? (
                      <div>
                        <span className={clsx('text-lg font-extrabold', sub.passed ? 'text-emerald-600' : 'text-red-500')}>
                          {sub.score}/{selectedAssignment.maxScore}
                        </span>
                        <p className="text-xs text-stone-400">{sub.percentage}%</p>
                        {sub.feedback && (
                          <p className="text-xs text-stone-400 max-w-[120px] truncate" title={sub.feedback}>
                            "{sub.feedback}"
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="badge bg-amber-100 text-amber-700 text-[10px]">Pending</span>
                    )}
                  </div>

                  <button onClick={() => openGrade(sub)}
                    className={clsx('btn-secondary text-xs px-3 py-1.5 flex-shrink-0',
                      sub.status === 'graded' ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50' : '')}>
                    {sub.status === 'graded' ? 'Re-grade' : 'Grade'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Grade modal */}
      <Modal open={!!gradingTarget} onClose={() => setGradingTarget(null)} title="Grade Submission" size="sm"
        footer={
          <>
            <button onClick={() => setGradingTarget(null)} className="btn-secondary">Cancel</button>
            <button
              onClick={() => gradeMutation.mutate({ id: gradingTarget._id, data: { score: parseFloat(gradeForm.score), feedback: gradeForm.feedback } })}
              disabled={gradeMutation.isPending || !gradeForm.score}
              className="btn-primary flex items-center gap-2">
              {gradeMutation.isPending && <Loader size="sm" white />}
              Save Grade
            </button>
          </>
        }>
        {gradingTarget && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl">
              <Avatar src={gradingTarget.student?.profilePicture} name={gradingTarget.student?.name} size="sm" />
              <div>
                <p className="font-semibold text-stone-800 text-sm">{gradingTarget.student?.name}</p>
                <p className="text-xs text-stone-400">Attempt #{gradingTarget.attemptNumber}</p>
              </div>
            </div>

            {gradingTarget.textContent && (
              <div className="p-3 bg-stone-50 rounded-xl text-sm text-stone-700 max-h-32 overflow-y-auto border border-stone-200">
                {gradingTarget.textContent}
              </div>
            )}

            <div>
              <label className="text-sm font-semibold text-stone-700 mb-1.5 block">
                Score (out of {selectedAssignment?.maxScore ?? 100})
              </label>
              <input type="number" value={gradeForm.score}
                onChange={e => setGradeForm(p => ({ ...p, score: e.target.value }))}
                min="0" max={selectedAssignment?.maxScore ?? 100}
                placeholder={`0 – ${selectedAssignment?.maxScore ?? 100}`}
                className="input-field" />
            </div>

            <div>
              <label className="text-sm font-semibold text-stone-700 mb-1.5 block">Feedback (optional)</label>
              <textarea value={gradeForm.feedback}
                onChange={e => setGradeForm(p => ({ ...p, feedback: e.target.value }))}
                rows={3} placeholder="Leave feedback for the student…"
                className="input-field resize-none" />
            </div>

            {gradeForm.score && (
              <div className={clsx('p-3 rounded-xl text-sm font-semibold',
                (gradeForm.score / (selectedAssignment?.maxScore ?? 100)) >= 0.5 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600')}>
                {Math.round((gradeForm.score / (selectedAssignment?.maxScore ?? 100)) * 100)}% —
                {' '}{(gradeForm.score / (selectedAssignment?.maxScore ?? 100)) >= 0.5 ? 'Passed ✓' : 'Failed ✗'}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
