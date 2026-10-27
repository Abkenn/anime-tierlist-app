import { navigation } from 'next/cache';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { findTierlistShare } from '@/app/_data/queries/tierlist-share';
import { getGoogleIdentity } from '@/app/_services/google-session';
import { readAnonymousTierlistOwner } from '@/app/_services/tierlist-identity';
import { readPublicTierlist } from '@/app/_services/tierlist-share';
import { PreviewControls } from './preview-controls';
import { TierlistPreviewBoard } from './tierlist-preview-board';

const OwnerControls = async ({ id }: { id: string }) => {
  await navigation();
  await connection();
  const [share, google, anonymous] = await Promise.all([
    findTierlistShare(id),
    getGoogleIdentity(),
    readAnonymousTierlistOwner(),
  ]);
  const publicShare = await readPublicTierlist(id);
  if (!publicShare) {
    return null;
  }
  const isOwner = Boolean(
    share && (google?.ownerId ?? anonymous?.id) === share.ownerId,
  );

  return (
    <PreviewControls
      id={id}
      document={publicShare.document}
      isOwner={isOwner}
    />
  );
};

export const SharedTierlist = async ({ id }: { id: string }) => {
  const share = await readPublicTierlist(id);
  if (!share) {
    notFound();
  }

  return (
    <>
      <Suspense
        fallback={
          <p className="mb-3 text-xs text-muted-foreground">
            You’re in preview mode.
          </p>
        }
      >
        <OwnerControls id={id} />
      </Suspense>

      <div className="overflow-x-auto">
        <TierlistPreviewBoard document={share.document} />
      </div>
    </>
  );
};
