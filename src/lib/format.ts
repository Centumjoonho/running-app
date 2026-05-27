export function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function formatPaceSeconds(paceSecondsPerKm: number | null): string {
  if (paceSecondsPerKm == null || paceSecondsPerKm <= 0) {
    return '--';
  }

  const minutes = Math.floor(paceSecondsPerKm / 60);
  const seconds = Math.floor(paceSecondsPerKm % 60);

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function formatRunDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });
}

export function formatDistanceKm(distanceM: number): string {
  return (distanceM / 1000).toFixed(2);
}

export function formatRunTitle(startedAt: string): string {
  const started = new Date(startedAt);
  const today = new Date();

  if (started.toDateString() === today.toDateString()) {
    return '오늘의 러닝';
  }

  return `${started.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })} 러닝`;
}
