import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText, CheckCircle, XCircle, Clock, Send, Upload,
  Link, AlertTriangle, Award, ChevronDown, ChevronUp, RefreshCw
} from 'lucide-react';
import { assignmentApi } from '../../api/assignmentApi';
import { instructorApi } from '../../api/instructorApi';
import { formatDate } from '../../utils/formatters';
import Loader from '../common/Loader';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export default function StudentAssignmentPanel({ courseId }) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState({});

  const { data, isLoading } = useQuery({
    queryKey: ['student-assignments', courseId],
    queryFn: () => assignmentApi.getStudentAssignments(courseId),
    enabled: !!courseId,
  });

  const assignments = data?.assignments ?? [];

  const toggleExpand = (id) => setExpanded(p => ({ ...p, [id]: !p[id] }));

  if (isLoading) return <div className="flex justify-center py-8"><Loader /></div>;

  if (assignments.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="w-10 h-10 text-stone-600 mx-auto mb-3" />
        <p className="text-stone-400 text-sm">No assignments for this course yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-1">
      <p className="text-stone-400 text-xs font-semibold uppercase tracking-wider">
        {assignments.length} Assignment{assignments.length !== 1 ? 's' : ''}
      </p>

      {assignments.map((assignment) => (
        <AssignmentCard
          key={assignment._id}
          assignment={assignment}
          courseId={courseId}
          expanded={!!expanded[assignment._id]}
          onToggle={() => toggleExpand(assignment._id)}
          onSubmitSuccess={() => qc.invalidateQueries(['student-assignments', courseId])}
        />
      ))}
    </div>
  );
}

/* ── Single assignment card ─────────────────────────────── */
function AssignmentCard({ assignment, courseId, expanded, onToggle, onSubmitSuccess }) {
  const [form, setForm] = useState({
    textContent: '',
    submissionUrl: '',
  });
  const [fileUploading, setFileUploading] = useState(false);
  const [fileUrl, setFileUrl] = useState('');
  const [result, setResult] = useState(null); // instant result after submit

  const submission = assignment.mySubmission;
  const isSubmitted = !!submission;
  const isGraded    = submission?.status === 'graded';
  const isPastDue   = assignment.dueDate && new Date() > new Date(assignment.dueDate);

  const submitMutation = useMutation({
    mutationFn: (data) => assignmentApi.submitAssignment(assignment._id, data),
    onSuccess: (res) => {
      toast.success(res.message);
      setResult(res.result ?? null);
      onSubmitSuccess();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Submission failed'),
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileUploading(true);
    try {
      const res = await instructorApi.uploadFile(file);
      setFileUrl(res.url);
      toast.success('File uploaded!');
    } catch { toast.error('Upload failed'); }
    finally { setFileUploading(false); }
  };

  const handleSubmit = () => {
    const payload = {
      ...(form.textContent   && { textContent:   form.textContent }),
      ...(form.submissionUrl && { submissionUrl: form.submissionUrl }),
      ...(fileUrl            && { fileUrl }),
    };
    if (!payload.textContent && !payload.submissionUrl && !payload.fileUrl) {
      toast.error('Please provide your answer or file.'); return;
    }
    submitMutation.mutate(payload);
  };

  // Status color
  const statusBadge = isGraded
    ? submission.passed
      ? { cls: 'bg-emerald-900/40 text-emerald-400', label: `Passed · ${submission.percentage}%` }
      : { cls: 'bg-red-900/40 text-red-400',         label: `Failed · ${submission.percentage}%` }
    : isSubmitted
      ? { cls: 'bg-amber-900/40 text-amber-400', label: 'Submitted — Awaiting grade' }
      : isPastDue
        ? { cls: 'bg-red-900/40 text-red-400',  label: 'Past due' }
        : { cls: 'bg-stone-800 text-stone-400',  label: 'Not submitted' };

  return (
    <div className={clsx(
      'rounded-xl border overflow-hidden transition-all',
      isGraded && submission.passed  ? 'border-emerald-700/50 bg-emerald-950/20' :
      isGraded && !submission.passed ? 'border-red-800/50 bg-red-950/20' :
      isSubmitted                    ? 'border-amber-700/50 bg-amber-950/20' :
                                       'border-stone-700 bg-stone-800/40'
    )}>
      {/* Header */}
      <button className="w-full flex items-start justify-between gap-3 p-4 text-left" onClick={onToggle}>
        <div className="flex items-start gap-3">
          <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5',
            isGraded && submission.passed ? 'bg-emerald-800/50 text-emerald-400' :
            isGraded                      ? 'bg-red-800/50 text-red-400' :
            isSubmitted                   ? 'bg-amber-800/50 text-amber-400' :
                                            'bg-stone-700 text-stone-400')}>
            {isGraded && submission.passed  ? <CheckCircle className="w-4 h-4" /> :
             isGraded && !submission.passed ? <XCircle className="w-4 h-4" /> :
             isSubmitted                    ? <Clock className="w-4 h-4" /> :
                                              <FileText className="w-4 h-4" />}
          </div>

          <div>
            <p className="text-white font-semibold text-sm">{assignment.title}</p>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className={clsx('text-[10px] font-bold px-2 py-0.5 rounded-full', statusBadge.cls)}>
                {statusBadge.label}
              </span>
              <span className="text-[10px] text-stone-500">{assignment.maxScore} pts</span>
              {assignment.dueDate && (
                <span className={clsx('text-[10px]', isPastDue ? 'text-red-400' : 'text-stone-500')}>
                  Due: {formatDate(assignment.dueDate)}
                </span>
              )}
            </div>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-stone-500 flex-shrink-0 mt-1" /> : <ChevronDown className="w-4 h-4 text-stone-500 flex-shrink-0 mt-1" />}
      </button>

      {/* Expanded body */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-stone-700/50 pt-4">
          {/* Description */}
          <div>
            <p className="text-stone-300 text-sm leading-relaxed">{assignment.description}</p>
            {assignment.instructions && (
              <div className="mt-3 p-3 bg-stone-900/50 rounded-lg border border-stone-700">
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1">Instructions</p>
                <p className="text-stone-300 text-xs leading-relaxed whitespace-pre-line">{assignment.instructions}</p>
              </div>
            )}
          </div>

          {/* ── INSTANT RESULT (shown right after auto-graded submit) ── */}
          {result && (
            <InstantResult result={result} maxScore={assignment.maxScore} />
          )}

          {/* ── EXISTING GRADE (from previous submission) ── */}
          {isGraded && !result && (
            <GradeDisplay submission={submission} maxScore={assignment.maxScore} />
          )}

          {/* ── PREVIOUS SUBMISSION (not yet graded) ── */}
          {isSubmitted && !isGraded && !result && (
            <div className="p-3 bg-amber-900/20 border border-amber-800/40 rounded-xl">
              <p className="text-amber-400 text-xs font-semibold mb-1">✓ Submitted — waiting for instructor review</p>
              {submission.textContent && (
                <p className="text-stone-400 text-xs line-clamp-2">"{submission.textContent}"</p>
              )}
              {submission.submissionUrl && (
                <a href={submission.submissionUrl} target="_blank" rel="noreferrer"
                  className="text-brand-400 text-xs hover:underline">
                  View submission link →
                </a>
              )}
            </div>
          )}

          {/* ── SUBMIT FORM ── show if not submitted, or re-attempt */}
          {(!isSubmitted || (isSubmitted && !result)) && !isGraded && (
            <SubmitForm
              assignment={assignment}
              form={form}
              setForm={setForm}
              fileUrl={fileUrl}
              fileUploading={fileUploading}
              onFileUpload={handleFileUpload}
              onSubmit={handleSubmit}
              loading={submitMutation.isPending}
              isPastDue={isPastDue}
              isResubmit={isSubmitted}
            />
          )}

          {/* Re-attempt button if graded and not passed */}
          {isGraded && !submission.passed && (
            <button onClick={() => setResult(null)}
              className="flex items-center gap-2 text-xs text-stone-400 hover:text-white transition-colors">
              <RefreshCw className="w-3.5 h-3.5" /> Try again
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Instant result display (auto-graded) ───────────────── */
function InstantResult({ result, maxScore }) {
  const passed = result?.passed;
  return (
    <div className={clsx(
      'rounded-xl border p-4 text-center',
      passed ? 'bg-emerald-900/30 border-emerald-700' : 'bg-red-900/30 border-red-700'
    )}>
      {/* Score circle */}
      <div className={clsx(
        'w-20 h-20 rounded-full flex flex-col items-center justify-center mx-auto mb-3 border-4',
        passed ? 'border-emerald-500 bg-emerald-900/40' : 'border-red-500 bg-red-900/40'
      )}>
        <span className={clsx('text-2xl font-extrabold', passed ? 'text-emerald-400' : 'text-red-400')}>
          {result?.percentage ?? 0}%
        </span>
        <span className="text-[10px] text-stone-400">{result?.score}/{maxScore}</span>
      </div>

      <div className="flex items-center justify-center gap-2 mb-2">
        {passed
          ? <CheckCircle className="w-5 h-5 text-emerald-400" />
          : <XCircle className="w-5 h-5 text-red-400" />}
        <span className={clsx('font-bold text-base', passed ? 'text-emerald-300' : 'text-red-300')}>
          {passed ? 'Passed!' : 'Not Passed'}
        </span>
      </div>

      {result?.feedback && (
        <p className="text-stone-300 text-xs leading-relaxed max-w-sm mx-auto">{result.feedback}</p>
      )}

      <div className={clsx('mt-3 inline-flex items-center gap-1.5 text-[10px] font-semibold px-3 py-1 rounded-full',
        passed ? 'bg-emerald-800/50 text-emerald-400' : 'bg-red-800/50 text-red-400')}>
        <Award className="w-3 h-3" />
        Auto-graded instantly
      </div>
    </div>
  );
}

/* ── Graded result from instructor ─────────────────────── */
function GradeDisplay({ submission, maxScore }) {
  const passed = submission.passed;
  return (
    <div className={clsx(
      'rounded-xl border p-4',
      passed ? 'bg-emerald-900/20 border-emerald-700/50' : 'bg-red-900/20 border-red-700/50'
    )}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Your Result</span>
        <div className={clsx('flex items-center gap-1.5 text-sm font-bold',
          passed ? 'text-emerald-400' : 'text-red-400')}>
          {passed ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          {submission.score}/{maxScore} ({submission.percentage}%)
        </div>
      </div>

      {/* Score bar */}
      <div className="h-2 bg-stone-700 rounded-full overflow-hidden mb-3">
        <div className={clsx('h-full rounded-full transition-all', passed ? 'bg-emerald-500' : 'bg-red-500')}
          style={{ width: `${submission.percentage}%` }} />
      </div>

      {submission.feedback && (
        <div className="bg-stone-900/50 rounded-lg p-3 border border-stone-700">
          <p className="text-xs font-semibold text-stone-400 mb-1">Instructor Feedback</p>
          <p className="text-stone-300 text-sm leading-relaxed">{submission.feedback}</p>
        </div>
      )}
    </div>
  );
}

/* ── Submit form ────────────────────────────────────────── */
function SubmitForm({ assignment, form, setForm, fileUrl, fileUploading, onFileUpload, onSubmit, loading, isPastDue, isResubmit }) {
  const type = assignment.submissionType;
  const showText = type === 'text' || type === 'any';
  const showUrl  = type === 'url'  || type === 'any';
  const showFile = type === 'file' || type === 'any';

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
        {isResubmit ? 'Re-submit your answer' : 'Your Submission'}
      </p>

      {isPastDue && assignment.allowLateSubmission && (
        <div className="flex items-center gap-2 text-amber-400 text-xs bg-amber-900/20 px-3 py-2 rounded-lg border border-amber-800/40">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          This is a late submission
        </div>
      )}

      {showText && (
        <div>
          <label className="text-xs text-stone-400 mb-1 block">
            {type === 'text' ? 'Your Answer' : 'Text Answer (optional)'}
          </label>
          <textarea
            value={form.textContent}
            onChange={e => setForm(p => ({ ...p, textContent: e.target.value }))}
            rows={4}
            placeholder="Type your answer here…"
            className="w-full bg-stone-900 border border-stone-700 text-stone-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder-stone-600"
          />
        </div>
      )}

      {showUrl && (
        <div>
          <label className="text-xs text-stone-400 mb-1 block">
            {type === 'url' ? 'Submission URL *' : 'URL (optional)'}
          </label>
          <div className="relative">
            <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
            <input type="url"
              value={form.submissionUrl}
              onChange={e => setForm(p => ({ ...p, submissionUrl: e.target.value }))}
              placeholder="https://github.com/your-project"
              className="w-full bg-stone-900 border border-stone-700 text-stone-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder-stone-600"
            />
          </div>
        </div>
      )}

      {showFile && (
        <div>
          <label className="text-xs text-stone-400 mb-1 block">
            {type === 'file' ? 'Upload File *' : 'File (optional)'}
          </label>
          <label className={clsx(
            'flex items-center gap-3 px-4 py-3 border-2 border-dashed rounded-xl cursor-pointer transition-colors',
            fileUrl
              ? 'border-emerald-600 bg-emerald-900/20 text-emerald-400'
              : 'border-stone-600 hover:border-stone-500 text-stone-400'
          )}>
            {fileUploading ? <Loader size="sm" white /> : <Upload className="w-4 h-4" />}
            <span className="text-sm">
              {fileUploading ? 'Uploading…' : fileUrl ? '✓ File uploaded' : 'Click to upload file'}
            </span>
            <input type="file" className="hidden" onChange={onFileUpload} />
          </label>
        </div>
      )}

      <button
        onClick={onSubmit}
        disabled={loading || (isPastDue && !assignment.allowLateSubmission)}
        className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-40"
      >
        {loading ? <Loader size="sm" white /> : <Send className="w-4 h-4" />}
        {loading ? 'Submitting…' : isResubmit ? 'Resubmit' : 'Submit Assignment'}
      </button>

      {isPastDue && !assignment.allowLateSubmission && (
        <p className="text-red-400 text-xs text-center">Submission deadline has passed.</p>
      )}
    </div>
  );
}
