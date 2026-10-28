import { atom } from 'jotai/vanilla';

export type PosterPreview = {
  src: string;
  width: number;
  height: number;
  viewBox: string;
};
export const posterPreviewsAtom = atom<ReadonlyMap<string, PosterPreview>>(
  new Map(),
);
