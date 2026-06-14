import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Globe, DollarSign, Shield, Mail, Zap, AlertTriangle } from 'lucide-react';
import { adminApi } from '../../api/adminApi';
import PageHeader from '../../components/ui/PageHeader';
import Loader from '../../components/common/Loader';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const TABS = [
  { id: 'general',  label: 'General',  icon: Globe },
  { id: 'finance',  label: 'Finance',  icon: DollarSign },
  { id: 'access',   label: 'Access',   icon: Shield },
  { id: 'smtp',     label: 'Email',    icon: Mail },
  { id: 'features', label: 'Features', icon: Zap },
];

export default function PlatformSettings() {
  const qc = useQueryClient();
  const [tab, setTab] = useState('general');
  const [form, setForm] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: adminApi.getSettings,
  });

  useEffect(() => {
    const s = data?.settings ?? data?.data?.settings;
    if (s) setForm(s);
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: adminApi.updateSettings,
    onSuccess: () => { toast.success('Settings saved!'); qc.invalidateQueries(['admin-settings']); },
    onError: err => toast.error(err.response?.data?.message || 'Save failed'),
  });

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));
  const setNested = (parent, key, val) => setForm(p => ({ ...p, [parent]: { ...(p[parent] ?? {}), [key]: val } }));

  if (isLoading || !form) return <div className="flex justify-center py-20"><Loader size="lg" /></div>;

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title="Platform Settings"
        subtitle="Configure global platform behaviour"
        breadcrumbs={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Settings' }]}
        actions={
          <button onClick={() => saveMutation.mutate(form)}
            disabled={saveMutation.isPending}
            className="btn-primary flex items-center gap-2">
            {saveMutation.isPending ? <Loader size="sm" white /> : <Save className="w-4 h-4" />}
            Save Settings
          </button>
        }
      />

      {/* Maintenance mode banner */}
      {form.maintenanceMode && (
        <div className="mb-6 bg-amber-50 border border-amber-300 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div>
            <p className="font-semibold text-amber-800 text-sm">Maintenance mode is ON</p>
            <p className="text-xs text-amber-600 mt-0.5">The platform is currently inaccessible to users.</p>
          </div>
        </div>
      )}

      <div className="flex gap-6">
        {/* Tab list */}
        <div className="hidden md:flex flex-col gap-1 w-40 flex-shrink-0">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={clsx('flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left',
                tab === id ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900')}>
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </button>
          ))}
        </div>

        {/* Mobile tab bar */}
        <div className="md:hidden w-full mb-4">
          <div className="flex gap-1 overflow-x-auto p-1 bg-zinc-100 rounded-xl">
            {TABS.map(({ id, label }) => (
              <button key={id} onClick={() => setTab(id)}
                className={clsx('flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  tab === id ? 'bg-white shadow text-zinc-900' : 'text-zinc-500')}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Panel */}
        <div className="flex-1 card p-6 space-y-6">
          {tab === 'general' && (
            <>
              <SectionTitle>Platform Identity</SectionTitle>
              <Field label="Platform Name">
                <input value={form.platformName ?? ''} onChange={e => set('platformName', e.target.value)} className="input-field" />
              </Field>
              <Field label="Tagline">
                <input value={form.platformTagline ?? ''} onChange={e => set('platformTagline', e.target.value)} className="input-field" />
              </Field>
              <Field label="Support Email">
                <input type="email" value={form.supportEmail ?? ''} onChange={e => set('supportEmail', e.target.value)} className="input-field" />
              </Field>
              <Field label="Currency">
                <select value={form.currency ?? 'INR'} onChange={e => set('currency', e.target.value)} className="input-field max-w-xs">
                  <option value="INR">INR — Indian Rupee</option>
                  <option value="USD">USD — US Dollar</option>
                  <option value="EUR">EUR — Euro</option>
                  <option value="GBP">GBP — British Pound</option>
                </select>
              </Field>
              <Field label="Logo URL">
                <input value={form.logoUrl ?? ''} onChange={e => set('logoUrl', e.target.value)} placeholder="https://…" className="input-field" />
              </Field>

              <SectionTitle className="mt-2">Maintenance</SectionTitle>
              <Toggle label="Maintenance Mode" desc="Disable platform access for all non-admin users"
                checked={form.maintenanceMode ?? false} onChange={v => set('maintenanceMode', v)} />
              {form.maintenanceMode && (
                <Field label="Maintenance Message">
                  <textarea value={form.maintenanceMessage ?? ''} onChange={e => set('maintenanceMessage', e.target.value)}
                    rows={2} className="input-field resize-none" />
                </Field>
              )}
            </>
          )}

          {tab === 'finance' && (
            <>
              <SectionTitle>Revenue Settings</SectionTitle>
              <Field label="Platform Commission (%)"
                desc="Percentage of each sale kept by the platform (instructors receive the rest)">
                <div className="flex items-center gap-3 max-w-xs">
                  <input type="number" value={form.platformFeePercent ?? 30}
                    onChange={e => set('platformFeePercent', parseFloat(e.target.value) || 0)}
                    min="0" max="100" className="input-field" />
                  <span className="text-zinc-500 font-semibold text-sm">%</span>
                </div>
                {form.platformFeePercent != null && (
                  <p className="text-xs text-zinc-400 mt-1">
                    Instructors receive {100 - form.platformFeePercent}% of each sale
                  </p>
                )}
              </Field>
              <Field label="Minimum Payout Amount (₹)"
                desc="Minimum balance required before instructors can request a payout">
                <input type="number" value={form.minPayoutAmount ?? 500}
                  onChange={e => set('minPayoutAmount', parseFloat(e.target.value) || 0)}
                  min="0" className="input-field max-w-xs" />
              </Field>
              <Field label="Maximum Course Price (₹)">
                <input type="number" value={form.maxCoursePrice ?? 10000}
                  onChange={e => set('maxCoursePrice', parseFloat(e.target.value) || 0)}
                  min="0" className="input-field max-w-xs" />
              </Field>
            </>
          )}

          {tab === 'access' && (
            <>
              <SectionTitle>Registration & Access</SectionTitle>
              <Toggle label="Allow New Registrations" desc="Let new users sign up on the platform"
                checked={form.allowRegistrations ?? true} onChange={v => set('allowRegistrations', v)} />
              <Toggle label="Require Email Verification" desc="Users must verify their email before accessing the platform"
                checked={form.requireEmailVerification ?? true} onChange={v => set('requireEmailVerification', v)} />
              <Toggle label="Allow Instructor Signup" desc="Let users register directly as instructors"
                checked={form.allowInstructorSignup ?? true} onChange={v => set('allowInstructorSignup', v)} />

              <SectionTitle>Legal</SectionTitle>
              <Field label="Terms of Service URL">
                <input value={form.termsUrl ?? ''} onChange={e => set('termsUrl', e.target.value)} placeholder="https://…" className="input-field" />
              </Field>
              <Field label="Privacy Policy URL">
                <input value={form.privacyUrl ?? ''} onChange={e => set('privacyUrl', e.target.value)} placeholder="https://…" className="input-field" />
              </Field>
            </>
          )}

          {tab === 'smtp' && (
            <>
              <SectionTitle>SMTP Configuration</SectionTitle>
              <p className="text-xs text-zinc-400 -mt-4">Configure the email server used for transactional emails.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="SMTP Host">
                  <input value={form.smtp?.host ?? ''} onChange={e => setNested('smtp', 'host', e.target.value)}
                    placeholder="smtp.sendgrid.net" className="input-field" />
                </Field>
                <Field label="SMTP Port">
                  <input type="number" value={form.smtp?.port ?? 587} onChange={e => setNested('smtp', 'port', parseInt(e.target.value) || 587)}
                    className="input-field" />
                </Field>
              </div>
              <Field label="SMTP Username / API Key">
                <input value={form.smtp?.user ?? ''} onChange={e => setNested('smtp', 'user', e.target.value)}
                  placeholder="apikey or username" className="input-field" />
              </Field>
              <Field label="From Email Address">
                <input type="email" value={form.smtp?.from ?? ''} onChange={e => setNested('smtp', 'from', e.target.value)}
                  placeholder="noreply@learnhub.com" className="input-field" />
              </Field>
            </>
          )}

          {tab === 'features' && (
            <>
              <SectionTitle>Feature Flags</SectionTitle>
              <p className="text-xs text-zinc-400 -mt-4">Toggle individual platform features on or off.</p>
              <div className="space-y-3">
                {[
                  ['Certificates',  'Enable certificate generation upon course completion'],
                  ['Quizzes',       'Allow instructors to create quizzes'],
                  ['Assignments',   'Allow instructors to create assignments'],
                  ['Discussions',   'Enable Q&A discussions within courses'],
                  ['Reviews',       'Allow students to rate and review courses'],
                ].map(([feat, desc]) => (
                  <Toggle key={feat} label={feat} desc={desc}
                    checked={form.features?.[feat.toLowerCase()] ?? true}
                    onChange={v => setNested('features', feat.toLowerCase(), v)} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ children, className = '' }) {
  return <h3 className={clsx('font-bold text-zinc-900 text-base border-b border-zinc-100 pb-2', className)}>{children}</h3>;
}

function Field({ label, desc, children }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-semibold text-zinc-700">{label}</label>
      {desc && <p className="text-xs text-zinc-400">{desc}</p>}
      {children}
    </div>
  );
}

function Toggle({ label, desc, checked, onChange }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-zinc-50 last:border-0">
      <div>
        <p className="text-sm font-semibold text-zinc-800">{label}</p>
        {desc && <p className="text-xs text-zinc-400 mt-0.5">{desc}</p>}
      </div>
      <button onClick={() => onChange(!checked)}
        className={clsx('relative inline-flex w-11 h-6 rounded-full transition-colors flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2',
          checked ? 'bg-brand-600' : 'bg-zinc-200')}>
        <span className={clsx('inline-block w-5 h-5 rounded-full bg-white shadow-sm transition-transform mt-0.5',
          checked ? 'translate-x-5' : 'translate-x-0.5')} />
      </button>
    </div>
  );
}
