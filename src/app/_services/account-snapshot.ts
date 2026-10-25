import 'server-only';
import { connection } from 'next/server';
import { findGoogleAccount } from '@/app/_data/queries/google-account';
import { findOwnerById } from '@/app/_data/queries/tierlist';
import { tierlistDocumentSchema } from '@/app/_lib/tierlist-sync';
import type { AccountSnapshot } from '@/app/_types/account-snapshot';
import { getGooglePrincipal } from './google-session';
import { hashTierlistSecret } from './tierlist-identity';

export const readAccountSnapshot = async (): Promise<AccountSnapshot> => {
  const principal = await getGooglePrincipal();
  if (!principal) {
    return { status: 'ready', userId: null, account: null };
  }

  const identity = await findGoogleAccount(principal.subject);
  const owner = identity && (await findOwnerById(identity.ownerId));

  return {
    status: 'ready',
    userId: principal.userId,
    account: owner
      ? {
          profileKey: hashTierlistSecret(`google-profile:${owner.id}`),
          displayName: principal.displayName,
          remote: {
            ownerId: owner.id,
            revision: owner.revision,
            document: tierlistDocumentSchema.parse(owner.document),
          },
        }
      : null,
  };
};

export const getInitialAccountSnapshot = async (): Promise<AccountSnapshot> => {
  await connection();

  try {
    return await readAccountSnapshot();
  } catch {
    return { status: 'unavailable' };
  }
};
