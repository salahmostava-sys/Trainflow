// Daily session policy: Expiration cutoff at 5:00 PM Saudi Time (Asia/Riyadh, UTC+3)
export function getSaudiSessionDeadline(): number {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const saudiTime = new Date(utc + 3 * 3600000);

  const cutoff = new Date(saudiTime);
  cutoff.setHours(17, 0, 0, 0);

  if (saudiTime.getTime() >= cutoff.getTime()) {
    return now.getTime(); // Already expired for today
  }

  const diffMs = cutoff.getTime() - saudiTime.getTime();
  return now.getTime() + diffMs;
}

export function isSessionExpired(deadline: number): boolean {
  if (!deadline) return false;
  return Date.now() >= deadline;
}

export function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((v) => String(v).padStart(2, '0')).join(':');
}

export function getTodayStr(): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Riyadh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date());
}

