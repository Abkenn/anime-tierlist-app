import 'server-only';
import { findGoogleAccount } from '@/app/_data/queries/google-account';
import { findOwnerById } from '@/app/_data/queries/tierlist';
import { tierlistDocumentSchema } from '@/app/_lib/tierlist-sync';
import type { AccountInitialization } from '@/app/_types/account-initialization';
import { getGooglePrincipal } from './google-session';
import { hashTierlistSecret } from './tierlist-identity';

export const readAccountInitialization =
  async (): Promise<AccountInitialization> => {
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
