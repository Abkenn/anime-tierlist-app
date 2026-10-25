import { atom } from 'jotai';
import type { AccountInitialization } from '@/app/_types/account-initialization';

export const accountInitializationAtom = atom<AccountInitialization | null>(
  null,
);
