type SharingInput = {
  revision: number;
  onPublish: () => Promise<string>;
  onFindPreview?: () => Promise<string | null>;
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

  const find = async (input: SharingInput) => {
    if (current?.revision !== input.revision) {
      current = { revision: input.revision };
    }
    const entry = current;
    if (entry.preview) {
      return entry.preview;
    }
    const url = await input.onFindPreview?.();
    if (url && current === entry && !entry.preview) {
      entry.preview = Promise.resolve(url);
    }

    return url ?? null;
  };

  return { preview, find };
};
