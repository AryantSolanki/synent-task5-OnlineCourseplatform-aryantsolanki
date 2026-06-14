import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Camera, Edit2, Save, X, BookOpen, CheckCircle, Award, Calendar } from 'lucide-react';
import { studentApi } from '../../api/studentApi';
import { instructorApi } from '../../api/instructorApi';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../../components/common/Avatar';
import Loader from '../../components/common/Loader';
import StatCard from '../../components/ui/StatCard';
import PageHeader from '../../components/ui/PageHeader';
import { formatDate, resolveUrl } from '../../utils/formatters';
import { resolveUrl as resolveURL } from '../../api/axios';
import toast from 'react-hot-toast';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', bio: '' });
  const [uploading, setUploading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['student-profile'],
    queryFn: studentApi.getProfile,
  });

  const updateMutation = useMutation({
    mutationFn: studentApi.updateProfile,
    onSuccess: (res) => {
      updateUser(res.user);
      qc.invalidateQueries(['student-profile']);
      toast.success('Profile updated!');
      setEditing(false);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Update failed'),
  });

  const handleEdit = () => {
    setForm({ name: user.name || '', bio: user.bio || '' });
    setEditing(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    updateMutation.mutate(form);
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return; }
    setUploading(true);
    try {
      const result = await instructorApi.uploadFile(file);
      await studentApi.updateProfile({ profilePicture: result.url });
      updateUser({ profilePicture: result.url });
      qc.invalidateQueries(['student-profile']);
      toast.success('Photo updated!');
    } catch { toast.error('Upload failed'); }
    finally { setUploading(false); }
  };

  if (isLoading) return <div className="flex justify-center py-20"><Loader size="lg" /></div>;

  const profile = data?.profile ?? user;
  const stats   = data?.stats   ?? {};

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <PageHeader
        title="My Profile"
        breadcrumbs={[{ label: 'Dashboard', href: '/student/dashboard' }, { label: 'Profile' }]}
        actions={
          !editing
            ? <button onClick={handleEdit} className="btn-secondary flex items-center gap-2"><Edit2 className="w-4 h-4" /> Edit Profile</button>
            : <div className="flex gap-2">
                <button onClick={() => setEditing(false)} className="btn-ghost flex items-center gap-2"><X className="w-4 h-4" /> Cancel</button>
                <button onClick={handleSave} disabled={updateMutation.isPending} className="btn-primary flex items-center gap-2">
                  {updateMutation.isPending ? <Loader size="sm" white /> : <Save className="w-4 h-4" />} Save
                </button>
              </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatCard label="Enrolled"     value={stats.totalEnrolled  ?? 0} icon={<BookOpen    className="w-5 h-5" />} color="brand" />
        <StatCard label="Completed"    value={stats.totalCompleted ?? 0} icon={<CheckCircle className="w-5 h-5" />} color="emerald" />
        <StatCard label="Certificates" value={stats.certificatesEarned ?? 0} icon={<Award  className="w-5 h-5" />} color="violet" />
        <StatCard label="Member Since" value={formatDate(profile?.createdAt, { year: undefined, month: 'short', day: 'numeric' })} icon={<Calendar className="w-5 h-5" />} color="sky" />
      </div>

      {/* Profile card */}
      <div className="card p-8">
        <div className="flex flex-col sm:flex-row gap-8">
          {/* Avatar */}
          <div className="flex-shrink-0 flex flex-col items-center gap-3">
            <div className="relative">
              <Avatar src={profile?.profilePicture} name={profile?.name} size="xl" />
              {uploading && (
                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                  <Loader size="sm" white />
                </div>
              )}
              <label className="absolute bottom-0 right-0 w-8 h-8 bg-brand-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-brand-700 transition-colors shadow-md">
                <Camera className="w-4 h-4 text-white" />
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </label>
            </div>
            <div className="text-center">
              <span className="badge bg-brand-100 text-brand-700 capitalize text-xs">{profile?.role}</span>
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 space-y-5">
            {/* Name */}
            <div>
              <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Full Name</label>
              {editing ? (
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  className="input-field mt-1.5" placeholder="Your full name" />
              ) : (
                <p className="text-lg font-bold text-stone-900 mt-1">{profile?.name}</p>
              )}
            </div>

            {/* Email (read-only) */}
            <div>
              <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Email</label>
              <p className="text-stone-700 mt-1">{profile?.email}</p>
            </div>

            {/* Bio */}
            <div>
              <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Bio</label>
              {editing ? (
                <textarea value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))}
                  rows={3} maxLength={500} placeholder="Tell us a little about yourself…"
                  className="input-field mt-1.5 resize-none" />
              ) : (
                <p className="text-stone-600 mt-1 text-sm leading-relaxed">
                  {profile?.bio || <span className="text-stone-400 italic">No bio yet. Click Edit to add one.</span>}
                </p>
              )}
            </div>

            {/* Last login */}
            <div className="pt-2 border-t border-stone-100">
              <p className="text-xs text-stone-400">
                Last login: {profile?.lastLogin ? formatDate(profile.lastLogin) : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
