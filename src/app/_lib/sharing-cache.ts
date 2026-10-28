type SharingInput = {
  revision: number;
  onPublish: () => Promise<string>;
};

export const createSharingCache = () => {
  let current: { revision: number; preview?: Promise<string> } | undefined;
  const preview = (input: SharingInput) => {
    if (current?.revision !== input.revision) {
      current = { revision: input.revision };
    }
    const entry = current;
    const run = async () => {
      try {
        return await input.onPublish();
      } catch (error) {
        entry.preview = undefined;
        throw error;
      }
    };
    entry.preview ??= run();

    return entry.preview;
  };

  return { preview };
};
