// Keep accepting previously shared hash URLs as aliases for the latest publication.
export const tierlistShareIdPattern =
  /^[A-Za-z0-9_-]{16}(?:\.(?:[a-f0-9]{16}|v\d+\.\d+))?$/u;

export const tierlistShareVersion = (fingerprint: string) =>
  fingerprint.includes(':')
    ? fingerprint.split(':')[0]
    : fingerprint.slice(0, 16);

export const previewDragEndedEvent = 'tierlist-preview-drag-ended';

export const previewLeaveEvent = 'tierlist-preview-leave';

export const previewReturnEvent = 'tierlist-preview-return';
