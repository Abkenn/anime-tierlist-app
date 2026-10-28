'use client';

import type { LocalTierlist } from '@/app/_lib/local-tierlist';
import { savePreviewHandoff } from '@/app/_lib/preview-handoff';
import {
  getTierlistDocument,
  type TierlistDocument,
} from '@/app/_lib/tierlist-sync';
import {
  activateAccountTierlist,
  adoptPublicTierlist,
  backupLocalTierlist,
  readLocalTierlist,
  saveLocalTierlist,
} from './local-tierlist';
import { replaceAccountFromSeed } from './tierlist.actions';
import { copyShareSeed } from './tierlist-share.actions';

export type PreviewAccount = {
  profileKey: string;
  ownerId: string;
  revision: number;
  hasItems: boolean;
};

type TemplateInput = {
  id: string;
  document: TierlistDocument;
  local: LocalTierlist;
  active?: LocalTierlist;
  account?: PreviewAccount;
};

export const adoptPreviewTemplate = async ({
  id,
  document,
  local,
  active,
  account,
}: TemplateInput) => {
  const selected = document;
  if (account) {
    const previous =
      active?.accountOwnerId === account.ownerId ? active : undefined;
    if (
      previous?.sync &&
      previous.sync.syncedLocalRevision !== previous.revision
    ) {
      throw new Error(
        'Save your latest changes before replacing your tierlist.',
      );
    }
    if (previous) {
      await backupLocalTierlist(previous);
    }
    const copy = await copyShareSeed(id);
    if (!copy.ok) {
      throw new Error(copy.message);
    }
    const result = await replaceAccountFromSeed({
      seed: copy.value,
      ownerId: account.ownerId,
      revision: previous?.sync?.serverRevision ?? account.revision,
    });
    if (!result.ok) {
      throw new Error(result.message);
    }
    if (previous) {
      await saveLocalTierlist(
        {
          ...previous,
          ...getTierlistDocument(result.value.document),
          revision: previous.revision + 1,
          sync: {
            ownerId: result.value.ownerId,
            serverRevision: result.value.revision,
            syncedLocalRevision: previous.revision + 1,
          },
        },
        previous.revision,
      );
    }
    await activateAccountTierlist(account.profileKey, result.value);
    const profile = await readLocalTierlist(account.profileKey);
    void savePreviewHandoff(selected, profile.seed, profile.revision, id);

    return '/';
  }
  await adoptPublicTierlist(selected, local);
  void savePreviewHandoff(selected, local.seed, local.revision + 1, id);

  return '/?profile=local';
};
