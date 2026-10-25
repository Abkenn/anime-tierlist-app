import 'server-only';
import { randomBytes, randomUUID } from 'node:crypto';
import { createGoogleAccount } from '@/app/_data/mutations/google-account';
import { findGoogleAccount } from '@/app/_data/queries/google-account';
import { defaultTierRanks } from '@/app/_lib/tier-ranks';
import { tierlistDocumentSchema } from '@/app/_lib/tierlist-sync';
import { getGooglePrincipal } from './google-session';
import { connectAccountTierlist } from './tierlist';
import {
  hashTierlistSecret,
  readAnonymousTierlistOwner,
} from './tierlist-identity';

export const getGoogleTierlist = async () => {
  const principal = await getGooglePrincipal();
  if (!principal) {
    return null;
  }
  let identity = await findGoogleAccount(principal.subject);
  if (!identity) {
    const source = await readAnonymousTierlistOwner();
    identity = await createGoogleAccount({
      subject: principal.subject,
      ownerId: randomUUID(),
      seedHash: randomBytes(32).toString('hex'),
      displayName: principal.displayName,
      document: tierlistDocumentSchema.parse(
        source?.document ?? {
          version: 1,
          items: [],
          ranks: defaultTierRanks,
          imageMode: 'natural',
        },
      ),
    });
  }
  const remote = await connectAccountTierlist();
  return {
    profileKey: hashTierlistSecret(`google-profile:${identity.ownerId}`),
    displayName: principal.displayName,
    remote,
  };
};
