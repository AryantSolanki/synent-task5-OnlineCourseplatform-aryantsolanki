import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Mail, Edit2, Eye, Save, X } from 'lucide-react';
import { adminApi } from '../../api/adminApi';
import PageHeader from '../../components/ui/PageHeader';
import Modal from '../../components/ui/Modal';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/ui/EmptyState';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export default function EmailTemplates() {
  const qc = useQueryClient();
  const [editTarget, setEditTarget]   = useState(null);
  const [previewTarget, setPreview]   = useState(null);
  const [editForm, setEditForm]       = useState({});
  const [activeVar, setActiveVar]     = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-email-templates'],
    queryFn: adminApi.getEmailTemplates,
  });

  const templates = data?.templates ?? data?.data?.templates ?? [];

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => adminApi.updateEmailTemplate(id, data),
    onSuccess: () => {
      toast.success('Template saved!');
      qc.invalidateQueries(['admin-email-templates']);
      setEditTarget(null);
    },
    onError: err => toast.error(err.response?.data?.message || 'Save failed'),
  });

  const openEdit = (t) => {
    setEditTarget(t);
    setEditForm({ subject: t.subject, htmlBody: t.htmlBody, textBody: t.textBody ?? '', isActive: t.isActive });
  };

  const insertVar = (v) => {
    setEditForm(p => ({ ...p, htmlBody: p.htmlBody + `{{${v}}}` }));
  };

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title="Email Templates"
        subtitle="Customise transactional emails sent to users"
        breadcrumbs={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Email Templates' }]}
      />

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader size="lg" /></div>
      ) : templates.length === 0 ? (
        <div className="card"><EmptyState icon="✉️" title="No templates found" description="Templates will appear here after initial setup." /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t) => (
            <div key={t._id} className="card p-5 hover:shadow-card-hover transition-all group">
              <div className="flex items-start justify-between mb-3">
                <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                  t.isActive ? 'bg-brand-100 text-brand-600' : 'bg-zinc-100 text-zinc-400')}>
                  <Mail className="w-5 h-5" />
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setPreview(t)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-brand-600 hover:bg-brand-50 transition-colors" title="Preview">
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => openEdit(t)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-brand-600 hover:bg-brand-50 transition-colors" title="Edit">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <h3 className="font-bold text-zinc-900 text-sm mb-0.5">{t.displayName}</h3>
              <p className="text-xs text-zinc-400 mb-3 line-clamp-2">{t.description}</p>

              <div className="space-y-1.5">
                <p className="text-xs text-zinc-600 line-clamp-1">
                  <span className="font-semibold">Subject: </span>{t.subject}
                </p>
                {t.variables?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {t.variables.slice(0, 4).map((v) => (
                      <code key={v} className="text-[10px] bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded font-mono">
                        {`{{${v}}}`}
                      </code>
                    ))}
                    {t.variables.length > 4 && (
                      <span className="text-[10px] text-zinc-400">+{t.variables.length - 4} more</span>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-3 pt-3 border-t border-zinc-100 flex items-center justify-between">
                <span className={clsx('badge text-[10px] font-bold', t.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-500')}>
                  {t.isActive ? 'Active' : 'Disabled'}
                </span>
                <span className="text-[10px] text-zinc-300">{t.name}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit modal */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title={`Edit: ${editTarget?.displayName}`} size="xl"
        footer={
          <>
            <button onClick={() => setEditTarget(null)} className="btn-secondary">Cancel</button>
            <button onClick={() => updateMutation.mutate({ id: editTarget._id, data: editForm })}
              disabled={updateMutation.isPending} className="btn-primary flex items-center gap-2">
              {updateMutation.isPending && <Loader size="sm" white />}
              <Save className="w-4 h-4" /> Save Template
            </button>
          </>
        }>
        {editTarget && (
          <div className="space-y-5">
            {/* Active toggle */}
            <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl">
              <span className="text-sm font-semibold text-zinc-700">Template Active</span>
              <button onClick={() => setEditForm(p => ({ ...p, isActive: !p.isActive }))}
                className={clsx('relative inline-flex w-11 h-6 rounded-full transition-colors',
                  editForm.isActive ? 'bg-brand-600' : 'bg-zinc-300')}>
                <span className={clsx('inline-block w-5 h-5 rounded-full bg-white shadow-sm transition-transform mt-0.5',
                  editForm.isActive ? 'translate-x-5' : 'translate-x-0.5')} />
              </button>
            </div>

            <div>
              <label className="text-sm font-semibold text-zinc-700 mb-1.5 block">Subject Line</label>
              <input value={editForm.subject ?? ''} onChange={e => setEditForm(p => ({ ...p, subject: e.target.value }))}
                className="input-field" />
            </div>

            {/* Variable chips */}
            {editTarget.variables?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-zinc-500 mb-2">Click to insert variable into HTML body:</p>
                <div className="flex flex-wrap gap-1.5">
                  {editTarget.variables.map((v) => (
                    <button key={v} onClick={() => insertVar(v)}
                      className="text-xs bg-brand-50 text-brand-700 border border-brand-200 px-2 py-1 rounded-lg font-mono hover:bg-brand-100 transition-colors">
                      {`{{${v}}}`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-semibold text-zinc-700 mb-1.5 block">HTML Body</label>
              <textarea value={editForm.htmlBody ?? ''} onChange={e => setEditForm(p => ({ ...p, htmlBody: e.target.value }))}
                rows={12} className="input-field resize-y font-mono text-xs" />
            </div>
          </div>
        )}
      </Modal>

      {/* Preview modal */}
      <Modal open={!!previewTarget} onClose={() => setPreview(null)} title={`Preview: ${previewTarget?.displayName}`} size="lg">
        {previewTarget && (
          <div>
            <div className="p-3 bg-zinc-50 rounded-lg mb-4 text-xs">
              <span className="font-semibold text-zinc-600">Subject: </span>
              <span className="text-zinc-700">{previewTarget.subject}</span>
            </div>
            <div className="border border-zinc-200 rounded-xl overflow-hidden">
              <iframe
                srcDoc={previewTarget.htmlBody}
                title="Email preview"
                className="w-full h-80 bg-white"
                sandbox="allow-same-origin"
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
