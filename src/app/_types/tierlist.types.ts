type TierLetter = 'S' | 'A' | 'B' | 'C' | 'D' | 'F';

export type TierRank =
  | TierLetter
  | `${TierLetter}${'+' | '−'}`
  | 'Dropped'
  | 'Watching';

export type TierColor =
  | 'orchid'
  | 'rose'
  | 'salmon'
  | 'apricot'
  | 'gold'
  | 'yellow'
  | 'citron'
  | 'chartreuse'
  | 'lime'
  | 'leaf'
  | 'mint'
  | 'jade'
  | 'seafoam'
  | 'aqua'
  | 'sky'
  | 'azure'
  | 'periwinkle'
  | 'lavender'
  | 'wisteria'
  | 'stone';

export type TierKeyboardMove = {
  axis: 'row' | 'column';
  direction: -1 | 1;
};
