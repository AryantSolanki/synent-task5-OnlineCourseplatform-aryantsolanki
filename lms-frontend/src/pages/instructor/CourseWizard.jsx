import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronRight, Upload, X, Plus, GripVertical } from 'lucide-react';
import { instructorApi } from '../../api/instructorApi';
import AssignmentManager from '../../components/instructor/AssignmentManager';
import { courseApi } from '../../api/courseApi';
import Loader from '../../components/common/Loader';
import { resolveUrl } from '../../api/axios';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const STEPS = [
  { id: 'basics',      label: 'Basics',      desc: 'Title, category, level' },
  { id: 'details',     label: 'Details',     desc: 'Description & objectives' },
  { id: 'media',       label: 'Media',       desc: 'Thumbnail & preview video' },
  { id: 'pricing',     label: 'Pricing',     desc: 'Price & discounts' },
  { id: 'curriculum',  label: 'Curriculum',  desc: 'Sections & lectures' },
  { id: 'assignments', label: 'Assignments', desc: 'Student assignments' },
];

const LEVELS = ['beginner','intermediate','advanced','all-levels'];

export default function CourseWizard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isEdit = !!id;

  const [step, setStep] = useState(0);
  const [courseId, setCourseId] = useState(id || null);
  const [uploading, setUploading] = useState({});

  const [form, setForm] = useState({
    title: '', subtitle: '', categoryName: '', level: 'beginner', language: 'English',
    description: '', whatYouWillLearn: [''], requirements: [''], targetAudience: [''],
    thumbnail: '', previewVideo: '', price: '', discountPrice: '', isFree: false,
    tags: '', curriculum: [],
  });

  // Load existing course for edit
  const { data: editData } = useQuery({
    queryKey: ['instructor-course-edit', id],
    queryFn: () => instructorApi.getCourse(id),
    enabled: isEdit,
  });

  const { data: catData } = useQuery({
    queryKey: ['categories'],
    queryFn: courseApi.getCategories,
  });

  useEffect(() => {
    if (editData?.course) {
      const c = editData.course;
      setForm({
        title: c.title || '', subtitle: c.subtitle || '', categoryName: c.categoryName || '',
        level: c.level || 'beginner', language: c.language || 'English',
        description: c.description || '',
        whatYouWillLearn: c.whatYouWillLearn?.length ? c.whatYouWillLearn : [''],
        requirements:     c.requirements?.length     ? c.requirements     : [''],
        targetAudience:   c.targetAudience?.length   ? c.targetAudience   : [''],
        thumbnail: c.thumbnail || '', previewVideo: c.previewVideo || '',
        price: c.price || '', discountPrice: c.discountPrice || '', isFree: c.isFree || false,
        tags: c.tags?.join(', ') || '',
        curriculum: c.curriculum || [],
      });
    }
  }, [editData]);

  const categories = catData?.categories ?? [];

  // Auto-save mutation
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (courseId) return instructorApi.updateCourse(courseId, data);
      const res = await instructorApi.createCourse(data);
      setCourseId(res.course._id);
      return res;
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Save failed'),
  });

  const publishMutation = useMutation({
    mutationFn: () => instructorApi.publishCourse(courseId),
    onSuccess: () => {
      toast.success('Course published! 🎉');
      qc.invalidateQueries(['instructor-courses']);
      navigate('/instructor/courses');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Publish failed'),
  });

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));

  const setListItem = (key, idx, val) =>
    setForm(p => ({ ...p, [key]: p[key].map((v, i) => i === idx ? val : v) }));

  const addListItem  = (key) => setForm(p => ({ ...p, [key]: [...p[key], ''] }));
  const removeListItem = (key, idx) =>
    setForm(p => ({ ...p, [key]: p[key].filter((_, i) => i !== idx) }));

  const handleUpload = async (field, file) => {
    if (!file) return;
    setUploading(p => ({ ...p, [field]: true }));
    try {
      const res = await instructorApi.uploadFile(file);
      set(field, res.url);
      toast.success('Uploaded!');
    } catch { toast.error('Upload failed'); }
    finally { setUploading(p => ({ ...p, [field]: false })); }
  };

  const handleSaveStep = async () => {
    const payload = {
      ...form,
      price: form.isFree ? 0 : (parseFloat(form.price) || 0),
      discountPrice: form.isFree ? 0 : (parseFloat(form.discountPrice) || 0),
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      whatYouWillLearn: form.whatYouWillLearn.filter(Boolean),
      requirements: form.requirements.filter(Boolean),
      targetAudience: form.targetAudience.filter(Boolean),
    };
    await saveMutation.mutateAsync(payload);
    if (step < STEPS.length - 1) setStep(p => p + 1);
    else toast.success('Changes saved!');
  };

  /* ── Curriculum helpers ── */
  const addSection = () => setForm(p => ({
    ...p, curriculum: [...p.curriculum, { title: 'New Section', lectures: [], order: p.curriculum.length }]
  }));

  const updateSection = (si, key, val) => setForm(p => ({
    ...p, curriculum: p.curriculum.map((s, i) => i === si ? { ...s, [key]: val } : s)
  }));

  const addLecture = (si) => setForm(p => ({
    ...p, curriculum: p.curriculum.map((s, i) => i === si
      ? { ...s, lectures: [...s.lectures, { title: 'New Lecture', videoUrl: '', duration: 0, isPreview: false, order: s.lectures.length }] }
      : s)
  }));

  const updateLecture = (si, li, key, val) => setForm(p => ({
    ...p, curriculum: p.curriculum.map((s, i) => i !== si ? s : {
      ...s, lectures: s.lectures.map((l, j) => j === li ? { ...l, [key]: val } : l)
    })
  }));

  const removeSection = (si) => setForm(p => ({ ...p, curriculum: p.curriculum.filter((_, i) => i !== si) }));
  const removeLecture = (si, li) => setForm(p => ({
    ...p, curriculum: p.curriculum.map((s, i) => i !== si ? s : { ...s, lectures: s.lectures.filter((_, j) => j !== li) })
  }));

  /* ── Step panels ── */
  const stepContent = [
    // Step 0 — Basics
    <div key="basics" className="space-y-5">
      <Field label="Course Title *">
        <input value={form.title} onChange={e => set('title', e.target.value)}
          placeholder="e.g. Complete Web Development Bootcamp" className="input-field" maxLength={120} />
        <p className="text-xs text-stone-400 mt-1">{form.title.length}/120</p>
      </Field>
      <Field label="Subtitle">
        <input value={form.subtitle} onChange={e => set('subtitle', e.target.value)}
          placeholder="A brief, compelling subtitle" className="input-field" maxLength={200} />
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Category">
          <select value={form.categoryName} onChange={e => set('categoryName', e.target.value)} className="input-field">
            <option value="">Select category…</option>
            {categories.map(c => <option key={c._id} value={c.name}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Level">
          <select value={form.level} onChange={e => set('level', e.target.value)} className="input-field">
            {LEVELS.map(l => <option key={l} value={l} className="capitalize">{l}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Language">
        <input value={form.language} onChange={e => set('language', e.target.value)} className="input-field" placeholder="English" />
      </Field>
      <Field label="Tags (comma-separated)">
        <input value={form.tags} onChange={e => set('tags', e.target.value)}
          placeholder="react, javascript, frontend" className="input-field" />
      </Field>
    </div>,

    // Step 1 — Details
    <div key="details" className="space-y-6">
      <Field label="Course Description *">
        <textarea value={form.description} onChange={e => set('description', e.target.value)}
          rows={5} placeholder="Describe your course in detail…" className="input-field resize-none" maxLength={5000} />
      </Field>

      <ListField label="What Students Will Learn"
        items={form.whatYouWillLearn} onAdd={() => addListItem('whatYouWillLearn')}
        onChange={(i, v) => setListItem('whatYouWillLearn', i, v)}
        onRemove={(i) => removeListItem('whatYouWillLearn', i)}
        placeholder="e.g. Build responsive websites" />

      <ListField label="Requirements"
        items={form.requirements} onAdd={() => addListItem('requirements')}
        onChange={(i, v) => setListItem('requirements', i, v)}
        onRemove={(i) => removeListItem('requirements', i)}
        placeholder="e.g. Basic computer knowledge" />

      <ListField label="Target Audience"
        items={form.targetAudience} onAdd={() => addListItem('targetAudience')}
        onChange={(i, v) => setListItem('targetAudience', i, v)}
        onRemove={(i) => removeListItem('targetAudience', i)}
        placeholder="e.g. Beginner developers" />
    </div>,

    // Step 2 — Media
    <div key="media" className="space-y-6">
      <Field label="Course Thumbnail *">
        <UploadField
          value={form.thumbnail} field="thumbnail"
          accept="image/*" label="Upload thumbnail (16:9 recommended)"
          uploading={uploading.thumbnail}
          onUpload={(f) => handleUpload('thumbnail', f)}
          onClear={() => set('thumbnail', '')}
          preview={form.thumbnail ? resolveUrl(form.thumbnail) : null}
          isImage
        />
      </Field>
      <Field label="Preview Video URL">
        <input value={form.previewVideo} onChange={e => set('previewVideo', e.target.value)}
          placeholder="https://youtube.com/watch?v=... or upload below" className="input-field" />
        <p className="text-xs text-stone-400 mt-1">YouTube, Vimeo URLs work. Or upload a video file.</p>
        <UploadField
          field="previewVideoFile" accept="video/*" label="Upload preview video"
          uploading={uploading.previewVideoFile}
          onUpload={(f) => handleUpload('previewVideo', f)}
          onClear={() => {}}
        />
      </Field>
    </div>,

    // Step 3 — Pricing
    <div key="pricing" className="space-y-5">
      <div className="flex items-center gap-3 p-4 bg-stone-50 rounded-xl border border-stone-200">
        <input type="checkbox" id="isFree" checked={form.isFree}
          onChange={e => set('isFree', e.target.checked)}
          className="w-4 h-4 accent-brand-600" />
        <label htmlFor="isFree" className="font-medium text-stone-800 cursor-pointer">Make this course free</label>
      </div>
      {!form.isFree && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Price (₹) *">
            <input type="number" value={form.price} onChange={e => set('price', e.target.value)}
              placeholder="999" min="0" className="input-field" />
          </Field>
          <Field label="Discount Price (₹)">
            <input type="number" value={form.discountPrice} onChange={e => set('discountPrice', e.target.value)}
              placeholder="499" min="0" className="input-field" />
            <p className="text-xs text-stone-400 mt-1">Leave blank for no discount</p>
          </Field>
        </div>
      )}
      {!form.isFree && form.price && form.discountPrice && (
        <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
          <p className="text-sm text-emerald-700 font-semibold">
            Discount: {Math.round((1 - form.discountPrice / form.price) * 100)}% off
          </p>
        </div>
      )}
    </div>,

    // Step 4 — Curriculum
    <div key="curriculum" className="space-y-4">
      {form.curriculum.length === 0 && (
        <div className="text-center py-10 border-2 border-dashed border-stone-200 rounded-xl">
          <p className="text-stone-500 mb-3">No sections yet. Add your first section to get started.</p>
        </div>
      )}
      {form.curriculum.map((section, si) => (
        <div key={si} className="border border-stone-200 rounded-xl overflow-hidden">
          {/* Section header */}
          <div className="flex items-center gap-3 p-3 bg-stone-50 border-b border-stone-200">
            <GripVertical className="w-4 h-4 text-stone-300 flex-shrink-0" />
            <input value={section.title} onChange={e => updateSection(si, 'title', e.target.value)}
              className="flex-1 bg-transparent font-semibold text-stone-800 text-sm focus:outline-none focus:ring-0 border-0 p-0" />
            <button onClick={() => addLecture(si)} className="text-xs text-brand-600 hover:text-brand-700 font-medium flex-shrink-0">
              + Lecture
            </button>
            <button onClick={() => removeSection(si)} className="text-stone-400 hover:text-red-500">
              <X className="w-4 h-4" />
            </button>
          </div>
          {/* Lectures */}
          <ul className="divide-y divide-stone-50">
            {section.lectures.map((lec, li) => (
              <li key={li} className="flex items-center gap-3 p-3">
                <GripVertical className="w-3.5 h-3.5 text-stone-300 flex-shrink-0" />
                <input value={lec.title} onChange={e => updateLecture(si, li, 'title', e.target.value)}
                  placeholder="Lecture title" className="flex-1 text-sm input-field py-1.5" />
                <input value={lec.videoUrl} onChange={e => updateLecture(si, li, 'videoUrl', e.target.value)}
                  placeholder="Video URL" className="w-40 text-xs input-field py-1.5 hidden sm:block" />
                <input type="number" value={lec.duration || ''} onChange={e => updateLecture(si, li, 'duration', parseInt(e.target.value) || 0)}
                  placeholder="Secs" className="w-16 text-xs input-field py-1.5" />
                <label className="flex items-center gap-1 text-xs text-stone-500 cursor-pointer flex-shrink-0" title="Free preview">
                  <input type="checkbox" checked={lec.isPreview}
                    onChange={e => updateLecture(si, li, 'isPreview', e.target.checked)}
                    className="accent-brand-600" />
                  Preview
                </label>
                <button onClick={() => removeLecture(si, li)} className="text-stone-400 hover:text-red-500 flex-shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
            {section.lectures.length === 0 && (
              <li className="py-3 px-4 text-xs text-stone-400 italic">No lectures — click "+ Lecture" above</li>
            )}
          </ul>
        </div>
      ))}
      <button onClick={addSection}
        className="w-full py-3 border-2 border-dashed border-brand-200 rounded-xl text-brand-600 font-semibold text-sm hover:bg-brand-50 transition-colors flex items-center justify-center gap-2">
        <Plus className="w-4 h-4" /> Add Section
      </button>
    </div>,

    // Step 5 — Assignments
    <div key="assignments">
      <AssignmentManager courseId={courseId} />
    </div>,
  ];

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-stone-900">{isEdit ? 'Edit Course' : 'Create New Course'}</h1>
        <p className="text-stone-500 text-sm mt-0.5">Complete all steps to publish your course.</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-0 mb-10 overflow-x-auto pb-2">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center flex-shrink-0">
            <button onClick={() => setStep(i)}
              className={clsx('flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all', i === step ? 'bg-brand-600 text-white' : i < step ? 'bg-brand-50 text-brand-700' : 'text-stone-400 hover:text-stone-600')}>
              <div className={clsx('w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                i < step ? 'bg-brand-600 text-white' : i === step ? 'bg-white text-brand-600' : 'bg-stone-200 text-stone-500')}>
                {i < step ? <Check className="w-3 h-3" /> : i + 1}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-semibold leading-none">{s.label}</p>
                <p className={clsx('text-[10px] mt-0.5', i === step ? 'text-brand-200' : 'text-stone-400')}>{s.desc}</p>
              </div>
            </button>
            {i < STEPS.length - 1 && <ChevronRight className="w-4 h-4 text-stone-300 mx-1 flex-shrink-0" />}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="card p-6 mb-6">
        <h2 className="text-lg font-bold text-stone-900 mb-5">{STEPS[step].label}</h2>
        {stepContent[step]}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button onClick={() => setStep(p => Math.max(0, p - 1))} disabled={step === 0} className="btn-secondary disabled:opacity-40">
          ← Back
        </button>
        <div className="flex gap-3">
          <button onClick={handleSaveStep} disabled={saveMutation.isPending}
            className="btn-secondary flex items-center gap-2">
            {saveMutation.isPending ? <Loader size="sm" /> : null}
            Save Draft
          </button>
          {step < STEPS.length - 1 ? (
            <button onClick={handleSaveStep} disabled={saveMutation.isPending}
              className="btn-primary flex items-center gap-2">
              {saveMutation.isPending ? <Loader size="sm" white /> : null}
              Next →
            </button>
          ) : courseId ? (
            <button onClick={() => publishMutation.mutate()} disabled={publishMutation.isPending}
              className="btn-primary bg-emerald-600 hover:bg-emerald-700 flex items-center gap-2">
              {publishMutation.isPending ? <Loader size="sm" white /> : null}
              🚀 Publish Course
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* ── Helper components ── */
function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-semibold text-stone-700">{label}</label>
      {children}
    </div>
  );
}

function ListField({ label, items, onAdd, onChange, onRemove, placeholder }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-semibold text-stone-700">{label}</label>
        <button onClick={onAdd} className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1">
          <Plus className="w-3.5 h-3.5" /> Add
        </button>
      </div>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <input value={item} onChange={e => onChange(i, e.target.value)}
              placeholder={placeholder} className="input-field flex-1 text-sm" />
            {items.length > 1 && (
              <button onClick={() => onRemove(i)} className="text-stone-400 hover:text-red-500 flex-shrink-0">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function UploadField({ value, field, accept, label, uploading, onUpload, onClear, preview, isImage }) {
  return (
    <div>
      {preview && isImage && (
        <div className="relative w-48 mb-3">
          <img src={preview} alt="preview" className="w-full aspect-video rounded-lg object-cover border border-stone-200" />
          <button onClick={onClear} className="absolute top-1 right-1 w-6 h-6 bg-white/90 rounded-full flex items-center justify-center hover:bg-red-50 shadow-sm">
            <X className="w-3.5 h-3.5 text-stone-600" />
          </button>
        </div>
      )}
      <label className="flex items-center gap-3 px-4 py-3 border-2 border-dashed border-stone-200 rounded-xl cursor-pointer hover:border-brand-400 hover:bg-brand-50/30 transition-colors">
        {uploading ? <Loader size="sm" /> : <Upload className="w-4 h-4 text-stone-400" />}
        <span className="text-sm text-stone-500">{uploading ? 'Uploading…' : label}</span>
        <input type="file" accept={accept} className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ''; }} />
      </label>
    </div>
  );
}
