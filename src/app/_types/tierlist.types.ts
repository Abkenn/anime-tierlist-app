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

export type TierImageMode = 'contain' | 'cover' | 'natural';

export type TierCrop = { x: number; y: number };

export type TierImageTrim = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

export type TierImage = {
  src: string;
  width: number;
  height: number;
  alt: string;
};

export type TierItemData = {
  id: string;
  label: string;
  rank: TierRank;
  image?: TierImage;
  crop?: TierCrop;
  trim?: TierImageTrim;
  rowHeightExpansion?: number;
};
