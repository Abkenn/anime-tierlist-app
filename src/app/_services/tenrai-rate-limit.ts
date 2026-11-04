// Observed Tenrai public limits: 4 requests/second AND 120 requests/minute.
// Leave some minute-level headroom for other instances sharing the same IP.
export const createTenraiPacer = () => {
  let nextStart = 0;
  let cooldownUntil = 0;
  let tail = Promise.resolve();
  const starts: number[] = [];
  return {
    wait: () => {
      // Serialize start reservations, not the network requests themselves.
      const task = tail.then(async () => {
        while (true) {
          const now = Date.now();
          while (starts.length && starts[0] <= now - 60_000) {
            starts.shift();
          }
          const minuteSlot = starts.length >= 110 ? starts[0] + 60_000 : now;
          const start = Math.max(now, nextStart, minuteSlot, cooldownUntil);
          if (start > now) {
            await new Promise((resolve) => setTimeout(resolve, start - now));
            continue;
          }
          starts.push(now);
          nextStart = now + 300;
          return;
        }
      });
      tail = task.catch(() => {});
      return task;
    },
    defer: (retryAfter: string | null) => {
      const seconds = Number(retryAfter);
      const parsedDate = retryAfter ? Date.parse(retryAfter) : NaN;
      const until =
        Number.isFinite(seconds) && seconds > 0
          ? Date.now() + seconds * 1000
          : parsedDate;
      cooldownUntil = Math.max(
        cooldownUntil,
        Number.isFinite(until) ? until : Date.now() + 60_000,
      );
    },
  };
};
