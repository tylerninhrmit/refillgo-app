export function formatVnd(n: number): string {
  return `${Math.round(n).toLocaleString('en-US')} đ`;
}

export function formatInt(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

export function formatSigned(n: number): string {
  return n > 0 ? `+${formatInt(n)}` : formatInt(n);
}

const DAY = 24 * 60 * 60 * 1000;

export function formatWhen(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const diff = startToday - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  if (diff <= 0) return `Today ${time}`;
  if (diff <= DAY) return `Yesterday ${time}`;
  if (diff < 7 * DAY) return `${d.toLocaleDateString('en-GB', { weekday: 'short' })} ${time}`;
  return `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} ${time}`;
}

export function formatDay(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const diff = startToday - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  if (diff <= 0) return 'Today';
  if (diff <= DAY) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .join('');
}

export function firstName(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts[0] ?? name;
}

export function normalizePhone(raw: string): string {
  let d = raw.replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('84')) d = '0' + d.slice(2);
  return d;
}

export function maskPhone(phone: string): string {
  if (phone.length < 7) return phone;
  return `${phone.slice(0, 3)} *** ${phone.slice(-3)}`;
}
