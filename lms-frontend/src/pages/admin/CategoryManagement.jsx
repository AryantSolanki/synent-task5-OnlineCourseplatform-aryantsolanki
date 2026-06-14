import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, Star, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../api/adminApi';
import PageHeader from '../../components/ui/PageHeader';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import EmptyState from '../../components/ui/EmptyState';
import Loader from '../../components/common/Loader';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const EMOJI_OPTIONS = ['💻','📊','📱','🎨','📈','🤖','📷','📣','🎵','🏋️','✍️','🔬','🌍','💡','🎓','📚','🎯','⚙️','🧠','🎭'];

const emptyForm = { name: '', description: '', icon: '📚', featured: false, order: 0 };

export default function CategoryManagement() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen]   = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: adminApi.getCategories,
  });

  const categories = data?.categories ?? data?.data?.categories ?? [];
  const invalidate = () => qc.invalidateQueries(['admin-categories']);

  const createMutation = useMutation({
    mutationFn: adminApi.createCategory,
    onSuccess: () => { toast.success('Category created!'); invalidate(); closeModal(); },
    onError: err => toast.error(err.response?.data?.message || 'Create failed'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => adminApi.updateCategory(id, data),
    onSuccess: () => { toast.success('Category updated!'); invalidate(); closeModal(); },
    onError: err => toast.error(err.response?.data?.message || 'Update failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: adminApi.deleteCategory,
    onSuccess: () => { toast.success('Category deleted'); invalidate(); setDeleteTarget(null); },
    onError: err => toast.error(err.response?.data?.message || 'Delete failed'),
  });

  const openCreate = () => { setEditTarget(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit   = (cat) => { setEditTarget(cat); setForm({ name: cat.name, description: cat.description ?? '', icon: cat.icon ?? '📚', featured: cat.featured ?? false, order: cat.order ?? 0 }); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditTarget(null); };

  const handleSubmit = () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    if (editTarget) updateMutation.mutate({ id: editTarget._id, data: form });
    else createMutation.mutate(form);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title="Categories"
        subtitle={`${categories.length} categories`}
        breadcrumbs={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Categories' }]}
        actions={
          <button onClick={openCreate} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Category
          </button>
        }
      />

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader size="lg" /></div>
      ) : categories.length === 0 ? (
        <div className="card">
          <EmptyState icon="📁" title="No categories yet"
            description="Create categories to organise courses."
            action={<button onClick={openCreate} className="btn-primary">Create Category</button>} />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {categories.map((cat) => (
            <div key={cat._id} className="card p-5 hover:shadow-card-hover transition-all group">
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-50 to-brand-100 flex items-center justify-center text-2xl flex-shrink-0">
                  {cat.icon ?? '📚'}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(cat)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-brand-600 hover:bg-brand-50 transition-colors">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setDeleteTarget(cat)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <h3 className="font-bold text-zinc-900 text-sm">{cat.name}</h3>
              {cat.description && <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{cat.description}</p>}

              <div className="flex items-center gap-2 mt-3">
                {cat.courseCount > 0 ? (
                  <Link
                    to={`/admin/courses?category=${cat._id}`}
                    className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium transition-colors"
                    title={`View ${cat.courseCount} courses in this category`}
                  >
                    <BookOpen className="w-3 h-3" />
                    {cat.courseCount} course{cat.courseCount !== 1 ? 's' : ''}
                  </Link>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-zinc-400">
                    <BookOpen className="w-3 h-3" />
                    0 courses
                  </span>
                )}
                {cat.featured && (
                  <span className="badge bg-amber-100 text-amber-700 text-[10px] flex items-center gap-0.5">
                    <Star className="w-2.5 h-2.5" /> Featured
                  </span>
                )}
                <span className="text-xs text-zinc-300 ml-auto">Order: {cat.order ?? 0}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit modal */}
      <Modal open={modalOpen} onClose={closeModal}
        title={editTarget ? 'Edit Category' : 'New Category'} size="md"
        footer={
          <>
            <button onClick={closeModal} className="btn-secondary">Cancel</button>
            <button onClick={handleSubmit} disabled={isPending} className="btn-primary flex items-center gap-2">
              {isPending && <Loader size="sm" white />}
              {editTarget ? 'Save Changes' : 'Create Category'}
            </button>
          </>
        }>
        <div className="space-y-5">
          {/* Icon picker */}
          <div>
            <label className="text-sm font-semibold text-zinc-700 mb-2 block">Icon</label>
            <div className="flex flex-wrap gap-2">
              {EMOJI_OPTIONS.map((emoji) => (
                <button key={emoji} onClick={() => setForm(p => ({ ...p, icon: emoji }))}
                  className={clsx('w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all border-2',
                    form.icon === emoji ? 'border-brand-500 bg-brand-50 scale-110' : 'border-transparent bg-zinc-50 hover:bg-zinc-100')}>
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-zinc-700 mb-1.5 block">Name *</label>
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Web Development" className="input-field" />
          </div>

          <div>
            <label className="text-sm font-semibold text-zinc-700 mb-1.5 block">Description</label>
            <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              rows={2} placeholder="Brief description of this category" className="input-field resize-none" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-zinc-700 mb-1.5 block">Display Order</label>
              <input type="number" value={form.order} onChange={e => setForm(p => ({ ...p, order: parseInt(e.target.value) || 0 }))}
                min="0" className="input-field" />
            </div>
            <div className="flex items-center gap-3 pt-6">
              <input type="checkbox" id="featured" checked={form.featured}
                onChange={e => setForm(p => ({ ...p, featured: e.target.checked }))}
                className="w-4 h-4 accent-brand-600" />
              <label htmlFor="featured" className="text-sm font-medium text-zinc-700 cursor-pointer">
                Featured category
              </label>
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget} onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget._id)}
        loading={deleteMutation.isPending}
        title="Delete category?"
        message={`"${deleteTarget?.name}" will be deleted. Courses in this category won't be deleted but may become uncategorised.`}
        confirmLabel="Delete Category"
      />
    </div>
  );
}
