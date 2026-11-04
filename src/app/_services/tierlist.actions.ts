'use server';

import { z } from 'zod';
import { safely } from '@/app/_lib/safely';
import {
  type SyncResult,
  tierlistDocumentSchema,
  userSeedSchema,
} from '@/app/_lib/tierlist-sync';
import {
  connectAccountTierlist,
  connectSeedTierlist,
  replaceAccountTierlist,
  saveSeedTierlist,
  shareAccountTierlist,
} from './tierlist';
import { endTierlistSession, TierlistAccessError } from './tierlist-identity';

const handleTierlistError = (
  error: unknown,
): Extract<SyncResult<never>, { ok: false }> => {
  if (error instanceof z.ZodError) {
    return {
      ok: false,
      code: 'invalid',
      message: 'The seed or tierlist data is invalid or too large.',
    };
  }

  if (error instanceof TierlistAccessError) {
    return { ok: false, code: error.code, message: error.message };
  }

  console.error('Tierlist operation failed', {
    code:
      typeof error === 'object' && error && 'code' in error
        ? error.code
        : 'unknown',
  });

  return {
    ok: false,
    code: 'unavailable',
    message:
      'Online saving is unavailable. Your local tierlist is kept on this device.',
  };
};

export const connectTierlist = async (input: unknown) =>
  safely({
    operation: async () => {
      const parsed = z
        .union([
          z.object({ account: z.literal(true) }),
          z.object({
            seed: userSeedSchema,
            document: tierlistDocumentSchema.optional(),
          }),
        ])
        .parse(input);

      return 'account' in parsed
        ? connectAccountTierlist()
        : connectSeedTierlist(parsed.seed, parsed.document);
    },
    onError: handleTierlistError,
  });

export const createShareSeed = async () =>
  safely({ operation: shareAccountTierlist, onError: handleTierlistError });

export const replaceAccountFromSeed = async (input: unknown) =>
  safely({
    operation: () => {
      const parsed = z
        .object({
          seed: userSeedSchema,
          ownerId: z.string().uuid(),
          revision: z.number().int().nonnegative(),
        })
        .parse(input);

      return replaceAccountTierlist(parsed);
    },
    onError: handleTierlistError,
  });

export const syncTierlist = async (input: unknown) =>
  safely({
    operation: () => {
      const parsed = z
        .object({
          ownerId: z.string().uuid(),
          revision: z.number().int().nonnegative(),
          document: tierlistDocumentSchema,
        })
        .parse(input);

      return saveSeedTierlist(parsed);
    },
    onError: handleTierlistError,
  });

export const disconnectTierlist = async () =>
  safely({ operation: endTierlistSession, onError: handleTierlistError });
