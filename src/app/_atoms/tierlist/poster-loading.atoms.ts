import { atom } from 'jotai/vanilla';

export const settledPosterSourcesAtom = atom<ReadonlySet<string>>(
  new Set<string>(),
);

export const markPosterSettledAtom = atom(null, (get, set, source: string) => {
  const settled = get(settledPosterSourcesAtom);
  if (!settled.has(source)) {
    set(settledPosterSourcesAtom, new Set([...settled, source]));
  }
});
