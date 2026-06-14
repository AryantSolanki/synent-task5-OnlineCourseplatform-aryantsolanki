import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Edit2, Trash2, Eye, CheckCircle, Clock,
  FileText, Link, Type, Package, X, Save, Users
} from 'lucide-react';
import { assignmentApi } from '../../api/assignmentApi';
import Modal from '../ui/Modal';
import ConfirmDialog from '../ui/ConfirmDialog';
import Loader from '../common/Loader';
import { formatDate } from '../../utils/formatters';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const SUBMISSION_TYPES = [
  { value: 'text',  label: 'Text Answer',  icon: <Type  className="w-4 h-4" /> },
  { value: 'url',   label: 'URL / Link',   icon: <Link  className="w-4 h-4" /> },
  { value: 'file',  label: 'File Upload',  icon: <FileText className="w-4 h-4" /> },
  { value: 'any',   label: 'Any Format',   icon: <Package  className="w-4 h-4" /> },
];

const EMPTY_FORM = {
  title: '', description: '', instructions: '', dueDate: '',
  maxScore: 100, submissionType: 'text', allowLateSubmission: false,
  isPublished: true, expectedAnswer: '',
};

export default function AssignmentManager({ courseId }) {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen]     = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editTarget, setEditTarget]   = useState(null);
  const [form, setForm]               = useState(EMPTY_FORM);

  const { data, isLoading } = useQuery({
    queryKey: ['instructor-assignments', courseId],
    queryFn: () => assignmentApi.getCourseAssignments(courseId),
    enabled: !!courseId,
  });

  const assignments = data?.assignments ?? [];

  const invalidate = () => qc.invalidateQueries(['instructor-assignments', courseId]);

  const createMutation = useMutation({
    mutationFn: (data) => assignmentApi.createAssignment(courseId, data),
    onSuccess: () => { toast.success('Assignment created!'); invalidate(); closeModal(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Create failed'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => assignmentApi.updateAssignment(id, data),
    onSuccess: () => { toast.success('Assignment updated!'); invalidate(); closeModal(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Update failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: assignmentApi.deleteAssignment,
    onSuccess: () => { toast.success('Assignment deleted'); invalidate(); setDeleteTarget(null); },
    onError: (e) => toast.error(e.response?.data?.message || 'Delete failed'),
  });

  const openCreate = () => { setEditTarget(null); setForm(EMPTY_FORM); setModalOpen(true); };
  const openEdit   = (a) => {
    setEditTarget(a);
    setForm({
      title: a.title, description: a.description, instructions: a.instructions || '',
      dueDate: a.dueDate ? a.dueDate.split('T')[0] : '',
      maxScore: a.maxScore, submissionType: a.submissionType,
      allowLateSubmission: a.allowLateSubmission, isPublished: a.isPublished,
      expectedAnswer: a.expectedAnswer || '',
    });
    setModalOpen(true);
  };
  const closeModal = () => { setModalOpen(false); setEditTarget(null); };

  const handleSave = () => {
    if (!form.title.trim())       { toast.error('Title is required'); return; }
    if (!form.description.trim()) { toast.error('Description is required'); return; }
    const payload = {
      ...form,
      dueDate:  form.dueDate || null,
      maxScore: parseInt(form.maxScore) || 100,
    };
    if (editTarget) updateMutation.mutate({ id: editTarget._id, data: payload });
    else            createMutation.mutate(payload);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (!courseId) {
    return (
      <div className="text-center py-12 border-2 border-dashed border-stone-200 rounded-xl">
        <FileText className="w-10 h-10 text-stone-300 mx-auto mb-3" />
        <p className="text-stone-500 text-sm">Save the course first to manage assignments.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-stone-500">
            {assignments.length} assignment{assignments.length !== 1 ? 's' : ''} created
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Add Assignment
        </button>
      </div>

      {/* How auto-grade works — info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <p className="font-semibold mb-1">💡 Auto-grading</p>
        <p>If you fill in the <strong>Expected Answer</strong> field, student submissions will be auto-graded instantly when they submit. Leave it blank for manual grading by you.</p>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-10"><Loader /></div>
      ) : assignments.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-stone-200 rounded-xl">
          <FileText className="w-10 h-10 text-stone-300 mx-auto mb-3" />
          <p className="text-stone-500 text-sm font-medium">No assignments yet</p>
          <p className="text-stone-400 text-xs mt-1">Click "Add Assignment" to create one for students.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {assignments.map((a) => (
            <div key={a._id} className={clsx(
              'flex items-center gap-4 p-4 rounded-xl border transition-all',
              a.isPublished ? 'bg-white border-stone-200' : 'bg-stone-50 border-dashed border-stone-300 opacity-70'
            )}>
              {/* Type icon */}
              <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0 text-brand-600">
                {SUBMISSION_TYPES.find(t => t.value === a.submissionType)?.icon ?? <FileText className="w-4 h-4" />}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-semibold text-stone-800 text-sm">{a.title}</h4>
                  {!a.isPublished && (
                    <span className="badge bg-stone-200 text-stone-500 text-[10px]">Draft</span>
                  )}
                  {a.expectedAnswer && (
                    <span className="badge bg-emerald-100 text-emerald-700 text-[10px]">Auto-graded</span>
                  )}
                </div>
                <p className="text-xs text-stone-500 mt-0.5 line-clamp-1">{a.description}</p>
                <div className="flex items-center gap-3 mt-1.5 flex-wrap text-xs text-stone-400">
                  <span>{a.maxScore} pts</span>
                  <span className="capitalize">{a.submissionType} submission</span>
                  {a.dueDate && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDate(a.dueDate)}</span>}
                  {a.totalSubmissions > 0 && (
                    <span className="flex items-center gap-1 text-brand-600 font-medium">
                      <Users className="w-3 h-3" />{a.gradedSubmissions}/{a.totalSubmissions} graded
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => openEdit(a)}
                  className="p-2 rounded-lg text-stone-400 hover:text-brand-600 hover:bg-brand-50 transition-colors" title="Edit">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => setDeleteTarget(a)}
                  className="p-2 rounded-lg text-stone-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Delete">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editTarget ? 'Edit Assignment' : 'New Assignment'}
        size="lg"
        footer={
          <>
            <button onClick={closeModal} className="btn-secondary">Cancel</button>
            <button onClick={handleSave} disabled={isPending} className="btn-primary flex items-center gap-2">
              {isPending ? <Loader size="sm" white /> : <Save className="w-4 h-4" />}
              {editTarget ? 'Save Changes' : 'Create Assignment'}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          {/* Title */}
          <div>
            <label className="text-sm font-semibold text-stone-700 mb-1.5 block">Title *</label>
            <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="e.g. Build a Landing Page" className="input-field" />
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-semibold text-stone-700 mb-1.5 block">Description *</label>
            <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              rows={3} placeholder="What should students do?" className="input-field resize-none" />
          </div>

          {/* Instructions */}
          <div>
            <label className="text-sm font-semibold text-stone-700 mb-1.5 block">Detailed Instructions</label>
            <textarea value={form.instructions} onChange={e => setForm(p => ({ ...p, instructions: e.target.value }))}
              rows={3} placeholder="Step-by-step instructions, hints, resources…" className="input-field resize-none" />
          </div>

          {/* Submission type */}
          <div>
            <label className="text-sm font-semibold text-stone-700 mb-2 block">Submission Type</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {SUBMISSION_TYPES.map((t) => (
                <button key={t.value} type="button"
                  onClick={() => setForm(p => ({ ...p, submissionType: t.value }))}
                  className={clsx(
                    'flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-xs font-medium transition-all',
                    form.submissionType === t.value
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-stone-200 text-stone-500 hover:border-stone-300'
                  )}>
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Expected answer (auto-grade) */}
          {(form.submissionType === 'text' || form.submissionType === 'url' || form.submissionType === 'any') && (
            <div>
              <label className="text-sm font-semibold text-stone-700 mb-1 block">
                Expected Answer <span className="text-brand-500">(enables auto-grading)</span>
              </label>
              <textarea
                value={form.expectedAnswer}
                onChange={e => setForm(p => ({ ...p, expectedAnswer: e.target.value }))}
                rows={2}
                placeholder="Enter the correct answer. Students who match this will be auto-graded instantly."
                className="input-field resize-none"
              />
              <p className="text-xs text-stone-400 mt-1">Leave blank if you want to grade manually.</p>
            </div>
          )}

          {/* Max score + Due date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-stone-700 mb-1.5 block">Max Score</label>
              <input type="number" value={form.maxScore} min={1} max={1000}
                onChange={e => setForm(p => ({ ...p, maxScore: e.target.value }))}
                className="input-field" />
            </div>
            <div>
              <label className="text-sm font-semibold text-stone-700 mb-1.5 block">Due Date</label>
              <input type="date" value={form.dueDate}
                onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))}
                min={new Date().toISOString().split('T')[0]}
                className="input-field" />
            </div>
          </div>

          {/* Toggles */}
          <div className="flex flex-col gap-3 pt-1">
            {[
              { key: 'allowLateSubmission', label: 'Allow late submissions' },
              { key: 'isPublished', label: 'Publish immediately (visible to enrolled students)' },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => setForm(p => ({ ...p, [key]: !p[key] }))}
                  className={clsx(
                    'w-10 h-5 rounded-full relative transition-colors',
                    form[key] ? 'bg-brand-600' : 'bg-stone-200'
                  )}>
                  <div className={clsx(
                    'absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform',
                    form[key] ? 'translate-x-5' : 'translate-x-0.5'
                  )} />
                </div>
                <span className="text-sm text-stone-700">{label}</span>
              </label>
            ))}
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget._id)}
        loading={deleteMutation.isPending}
        title="Delete assignment?"
        message={`"${deleteTarget?.title}" and all student submissions will be permanently deleted.`}
        confirmLabel="Delete Assignment"
      />
    </div>
  );
}
