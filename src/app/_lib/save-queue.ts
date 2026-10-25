type SaveQueueOptions = {
  onSaving: () => void;
  onSettled: (pending: number) => void;
  onError: (error: unknown) => void;
};

export const createSaveQueue = ({
  onSaving,
  onSettled,
  onError,
}: SaveQueueOptions) => {
  let tail = Promise.resolve();
  let pending = 0;
  let failed = false;

  const enqueue = (operation: () => Promise<void>, saving = true) => {
    if (failed) {
      return Promise.reject(
        new Error('Local saving is paused. Reload before editing further.'),
      );
    }

    pending += 1;
    if (saving) {
      onSaving();
    }
    const previous = tail;
    const run = async () => {
      await previous;
      if (failed) {
        throw new Error(
          'Local saving is paused. Reload before editing further.',
        );
      }

      await operation();
    };
    const task = run();
    const settle = async () => {
      try {
        await task;
        pending -= 1;
        onSettled(pending);
      } catch (error) {
        if (!failed) {
          failed = true;
          onError(error);
        }
      }
    };
    tail = settle();

    return task;
  };

  return {
    enqueue,
    get failed() {
      return failed;
    },
    flush: async () => {
      await tail;
      if (failed) {
        throw new Error(
          'Local saving is paused. Reload before switching tierlists.',
        );
      }
    },
  };
};
