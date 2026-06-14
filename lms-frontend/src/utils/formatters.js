/** Format price in INR; returns "Free" for 0 */
export const formatPrice = (price) => {
  if (price === 0 || price == null) return 'Free';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(price);
};

/** Seconds → "2h 15m" or "45m 30s" */
export const formatDuration = (seconds) => {
  if (!seconds) return '0m';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
};

/** 1234567 → "1.2M"; 12345 → "12.3K" */
export const formatCount = (n) => {
  if (n == null) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
};

/** Date → "2 days ago", "Today", etc. */
export const formatRelativeTime = (date) => {
  if (!date) return '';
  const diff = Date.now() - new Date(date).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7)  return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
};

/** Date → "15 Jan 2025" */
export const formatDate = (date, opts = {}) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-IN', {
    year: 'numeric', month: 'short', day: 'numeric', ...opts,
  });
};

/** Get two-letter initials from a name */
export const getInitials = (name) => {
  if (!name) return '?';
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
};

/** Truncate text with ellipsis */
export const truncate = (text, len = 100) => {
  if (!text || text.length <= len) return text ?? '';
  return text.slice(0, len).trimEnd() + '…';
};

/** Re-export resolveUrl for components that import from utils */
export { resolveUrl } from '../api/axios';
