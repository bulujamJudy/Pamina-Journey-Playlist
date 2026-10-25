export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const value = Math.floor(seconds); const s = String(value % 60).padStart(2, '0'); const m = Math.floor(value / 60) % 60;
  return value >= 3600 ? `${Math.floor(value / 3600)}:${String(m).padStart(2, '0')}:${s}` : `${Math.floor(value / 60)}:${s}`;
}
