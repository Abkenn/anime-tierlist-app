'use client';

import { useSetAtom } from 'jotai';
import { useEffect } from 'react';
import { accountInitializationAtom } from '@/app/_atoms/tierlist/account.atoms';
import type { AccountInitialization } from '@/app/_types/account-initialization';

export const AccountInitializationBridge = ({
  initial,
}: {
  initial: AccountInitialization;
}) => {
  const initialize = useSetAtom(accountInitializationAtom);
  useEffect(() => {
    initialize(initial);
  }, [initial, initialize]);
  return null;
};
