import { atom } from 'jotai';

export type PosterLayout = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
};
export const posterLayoutAtom = atom<PosterLayout[]>([]);
