import { navigation } from 'next/cache';
import { notFound, redirect } from 'next/navigation';
import { connection } from 'next/server';
import { Suspense, ViewTransition } from 'react';
import { touchTierlistPng } from '@/app/_data/mutations/tierlist-png';
import { findOwnerById } from '@/app/_data/queries/tierlist';
import { findTierlistShare } from '@/app/_data/queries/tierlist-share';
import { layoutExportBoard } from '@/app/_lib/tierlist-export-layout';
import { tierlistDocumentSchema } from '@/app/_lib/tierlist-sync';
import { getGoogleIdentity } from '@/app/_services/google-session';
import {
  hashTierlistSecret,
  readAnonymousTierlistOwner,
} from '@/app/_services/tierlist-identity';
import { readPublicTierlist } from '@/app/_services/tierlist-share';
import { PreviewControls } from './preview-controls';
import { PreviewImage } from './preview-image';

const OwnerControls = async ({ id }: { id: string }) => {
  await navigation();
  await connection();
  await touchTierlistPng(id.split('.')[0]);
  const [share, google, anonymous] = await Promise.all([
    findTierlistShare(id),
    getGoogleIdentity(),
    readAnonymousTierlistOwner(),
  ]);
  const publicShare = await readPublicTierlist(id);
  if (!publicShare) {
    return null;
  }
  const accountOwner = google ? await findOwnerById(google.ownerId) : null;
  const isOwner = Boolean(
    share && (google?.ownerId ?? anonymous?.id) === share.ownerId,
  );

  return (
    <PreviewControls
      id={id}
      document={publicShare.document}
      isOwner={isOwner}
      account={
        accountOwner
          ? {
              profileKey: hashTierlistSecret(
                `google-profile:${accountOwner.id}`,
              ),
              ownerId: accountOwner.id,
              revision: accountOwner.revision,
              hasItems:
                tierlistDocumentSchema.parse(accountOwner.document).items
                  .length > 0,
            }
          : undefined
      }
    />
  );
};

export const SharedTierlist = async ({ id }: { id: string }) => {
  const share = await readPublicTierlist(id);
  if (!share) {
    notFound();
  }

  const canonicalId = `${share.id}.${share.version}`;
  if (id !== canonicalId) {
    redirect(`/${canonicalId}`);
  }
  const board = layoutExportBoard(share.document);

  return (
    <>
      <Suspense
        fallback={
          <div className="mb-3 flex min-h-17.5 items-center py-2 text-xs text-muted-foreground">
            You’re in preview mode.
          </div>
        }
      >
        <OwnerControls id={id} />
      </Suspense>

      <ViewTransition
        name={`tierlist-preview-${share.id}`}
        default="none"
        share="preview-expand"
      >
        <div className="overflow-x-auto">
          <PreviewImage
            key={`${share.id}.${share.version}`}
            id={`${share.id}.${share.version}`}
            width={board.width}
            height={board.height}
            rows={board.rows}
          />
        </div>
      </ViewTransition>
    </>
  );
};
