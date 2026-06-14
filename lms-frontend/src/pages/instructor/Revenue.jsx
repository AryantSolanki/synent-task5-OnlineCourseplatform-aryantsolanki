import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DollarSign, TrendingUp, ArrowDownToLine, Clock, CheckCircle, XCircle } from 'lucide-react';
import { instructorApi } from '../../api/instructorApi';
import { formatPrice, formatDate, formatCount } from '../../utils/formatters';
import { resolveUrl } from '../../api/axios';
import PageHeader from '../../components/ui/PageHeader';
import StatCard from '../../components/ui/StatCard';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/ui/EmptyState';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const STATUS_CONFIG = {
  pending:    { label: 'Pending',    cls: 'bg-amber-100 text-amber-700' },
  processing: { label: 'Processing', cls: 'bg-sky-100 text-sky-700' },
  completed:  { label: 'Completed',  cls: 'bg-emerald-100 text-emerald-700' },
  rejected:   { label: 'Rejected',   cls: 'bg-red-100 text-red-600' },
};

export default function Revenue() {
  const qc = useQueryClient();
  const [payoutModal, setPayoutModal] = useState(false);
  const [payoutForm, setPayoutForm] = useState({ amount: '', method: 'bank_transfer' });

  const { data, isLoading } = useQuery({
    queryKey: ['instructor-revenue'],
    queryFn: instructorApi.getRevenue,
  });

  const payoutMutation = useMutation({
    mutationFn: instructorApi.requestPayout,
    onSuccess: () => {
      toast.success('Payout request submitted!');
      qc.invalidateQueries(['instructor-revenue']);
      setPayoutModal(false);
      setPayoutForm({ amount: '', method: 'bank_transfer' });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Payout request failed'),
  });

  const summary     = data?.summary      ?? {};
  const chartData   = data?.chartData    ?? [];
  const payouts     = data?.payouts      ?? [];
  const byCourse    = data?.revenueByCourse ?? [];

  const maxRevenue = Math.max(...chartData.map(d => d.revenue), 1);

  const payoutColumns = [
    { key: 'amount',   header: 'Amount',  render: (v) => <span className="font-bold text-stone-900">{formatPrice(v)}</span> },
    { key: 'method',   header: 'Method',  render: (v) => <span className="text-sm capitalize">{v?.replace('_', ' ')}</span> },
    {
      key: 'status', header: 'Status',
      render: (v) => {
        const cfg = STATUS_CONFIG[v] ?? { label: v, cls: 'bg-stone-100 text-stone-600' };
        return <span className={clsx('badge text-xs', cfg.cls)}>{cfg.label}</span>;
      },
    },
    { key: 'createdAt', header: 'Requested', render: (v) => <span className="text-xs text-stone-500">{formatDate(v)}</span> },
    {
      key: 'processedAt', header: 'Processed',
      render: (v) => <span className="text-xs text-stone-500">{v ? formatDate(v) : '—'}</span>,
    },
  ];

  if (isLoading) return <div className="flex justify-center py-20"><Loader size="lg" /></div>;

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <PageHeader
        title="Revenue & Payouts"
        subtitle="Track your earnings and request withdrawals"
        actions={
          <button onClick={() => setPayoutModal(true)} disabled={(summary.available ?? 0) < 100}
            className="btn-primary flex items-center gap-2 disabled:opacity-50">
            <ArrowDownToLine className="w-4 h-4" /> Request Payout
          </button>
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Earned"     value={formatPrice(summary.totalEarned   ?? 0)} icon={<DollarSign  className="w-5 h-5" />} color="emerald" />
        <StatCard label="Available"        value={formatPrice(summary.available     ?? 0)} icon={<TrendingUp  className="w-5 h-5" />} color="brand" />
        <StatCard label="Total Paid Out"   value={formatPrice(summary.totalPaidOut  ?? 0)} icon={<CheckCircle className="w-5 h-5" />} color="violet" />
        <StatCard label="Pending Payout"   value={formatPrice(summary.pendingPayout ?? 0)} icon={<Clock       className="w-5 h-5" />} color="amber" />
      </div>

      {/* Revenue chart */}
      {chartData.length > 0 && (
        <div className="card p-6">
          <h2 className="font-bold text-stone-900 mb-6">Monthly Revenue</h2>
          <div className="flex items-end gap-3 h-40">
            {chartData.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                <span className="text-[10px] font-bold text-stone-600 whitespace-nowrap">{d.revenue > 0 ? formatPrice(d.revenue).replace('₹','') : ''}</span>
                <div className="w-full relative group">
                  <div className="w-full bg-gradient-to-t from-brand-700 to-brand-500 rounded-t-md hover:opacity-90 transition-opacity"
                    style={{ height: `${Math.max(4, (d.revenue / maxRevenue) * 120)}px` }} />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-stone-900 text-white text-xs rounded-lg px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                    {formatPrice(d.revenue)} · {d.sales} sales
                  </div>
                </div>
                <span className="text-[10px] text-stone-400 truncate w-full text-center">{d.month?.split(' ')[0]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Revenue by course */}
      {byCourse.length > 0 && (
        <div className="card p-6">
          <h2 className="font-bold text-stone-900 mb-4">Revenue by Course</h2>
          <div className="space-y-3">
            {byCourse.map((item, i) => {
              const pct = Math.round((item.total / (summary.totalEarned || 1)) * 100);
              return (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-lg overflow-hidden bg-stone-100 flex-shrink-0">
                    {item.courseInfo?.thumbnail
                      ? <img src={resolveUrl(item.courseInfo.thumbnail)} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-sm">📚</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-stone-700 truncate">{item.courseInfo?.title}</span>
                      <span className="font-bold text-stone-900 flex-shrink-0 ml-2">{formatPrice(item.total)}</span>
                    </div>
                    <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <span className="text-xs text-stone-400 flex-shrink-0 w-8 text-right">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Payout history */}
      <div className="card">
        <div className="px-6 py-4 border-b border-stone-100">
          <h2 className="font-bold text-stone-900">Payout History</h2>
        </div>
        {payouts.length === 0 ? (
          <EmptyState compact icon="💸" title="No payouts yet"
            description="Request your first payout once you have available balance." />
        ) : (
          <DataTable columns={payoutColumns} data={payouts} rowKey="_id" />
        )}
      </div>

      {/* Payout request modal */}
      <Modal open={payoutModal} onClose={() => setPayoutModal(false)} title="Request Payout" size="sm"
        footer={
          <>
            <button onClick={() => setPayoutModal(false)} className="btn-secondary">Cancel</button>
            <button
              onClick={() => payoutMutation.mutate({ amount: parseFloat(payoutForm.amount), method: payoutForm.method })}
              disabled={payoutMutation.isPending || !payoutForm.amount || parseFloat(payoutForm.amount) < 100}
              className="btn-primary flex items-center gap-2">
              {payoutMutation.isPending && <Loader size="sm" white />}
              Request Payout
            </button>
          </>
        }>
        <div className="space-y-4">
          <div className="p-4 bg-brand-50 rounded-xl">
            <p className="text-xs text-brand-600 font-semibold">Available Balance</p>
            <p className="text-2xl font-extrabold text-brand-700">{formatPrice(summary.available ?? 0)}</p>
          </div>
          <div>
            <label className="text-sm font-semibold text-stone-700 mb-1.5 block">Amount (₹)</label>
            <input type="number" value={payoutForm.amount}
              onChange={e => setPayoutForm(p => ({ ...p, amount: e.target.value }))}
              placeholder="Minimum ₹100" min="100" max={summary.available}
              className="input-field" />
          </div>
          <div>
            <label className="text-sm font-semibold text-stone-700 mb-1.5 block">Payment Method</label>
            <select value={payoutForm.method}
              onChange={e => setPayoutForm(p => ({ ...p, method: e.target.value }))}
              className="input-field">
              <option value="bank_transfer">Bank Transfer</option>
              <option value="upi">UPI</option>
              <option value="paypal">PayPal</option>
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
