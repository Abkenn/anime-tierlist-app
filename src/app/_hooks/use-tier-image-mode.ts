'use client';

import { useAtomValue, useSetAtom } from 'jotai';
import { useHydrateAtoms } from 'jotai/utils';
import { useLayoutEffect } from 'react';
import {
  changeImageModeAtom,
  imageModeAtom,
} from '@/app/_atoms/tierlist/settings.atoms';
import type { TierImageMode } from '@/app/_types/tierlist.types';

type TierImageModeInput = {
  value?: TierImageMode;
  onChange?: (mode: TierImageMode) => void;
};

export const useTierImageMode = ({ value, onChange }: TierImageModeInput) => {
  useHydrateAtoms(
    new Map<typeof imageModeAtom, TierImageMode>(
      value === undefined ? [] : [[imageModeAtom, value]],
    ),
  );

  const imageMode = useAtomValue(imageModeAtom);
  const writeImageMode = useSetAtom(changeImageModeAtom);

  const changeImageMode = (mode: TierImageMode) => {
    if (value === undefined) {
      writeImageMode(mode);
    }

    onChange?.(mode);
  };

  useLayoutEffect(() => {
    if (value !== undefined && value !== imageMode) {
      writeImageMode(value);
    }
  }, [value, imageMode, writeImageMode]);

  return { imageMode, changeImageMode };
};
