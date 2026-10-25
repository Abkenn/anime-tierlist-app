const relativeTime = new Intl.RelativeTimeFormat('en', { numeric: 'always' });

export const formatRelativeTime = (
  timestamp: number | undefined,
  now: number,
) => {
  if (timestamp === undefined) {
    return 'time unavailable';
  }

  const minutes = Math.floor(Math.max(0, now - timestamp) / 60_000);
  if (minutes === 0) {
    return 'just now';
  }

  if (minutes < 60) {
    return relativeTime.format(-minutes, 'minute');
  }

  const hours = Math.floor(minutes / 60);

  return hours < 24
    ? relativeTime.format(-hours, 'hour')
    : relativeTime.format(-Math.floor(hours / 24), 'day');
};
