import { setTimeout } from 'node:timers/promises';
import 'server-only';
import { randomUUID } from 'node:crypto';
import { consumeTierlistRateLimit } from '@/app/_data/mutations/tierlist';
import {
  claimTierlistPng,
  releaseTierlistPng,
  storeTierlistPng,
} from '@/app/_data/mutations/tierlist-png';
import { findTierlistShare } from '@/app/_data/queries/tierlist-share';
import { tierlistDocumentSchema } from '@/app/_lib/tierlist-sync';
import { renderTierlistPng } from './tierlist-png';

export const getTierlistPng = async (slug: string) => {
  if (!/^[A-Za-z0-9_-]{16}(?:\.[a-f0-9]{16})?$/u.test(slug)) {
    return null;
  }
  const id = slug.split('.')[0];
  if (!/^[A-Za-z0-9_-]{16}$/u.test(id)) {
    return null;
  }
  const share = await findTierlistShare(id);
  if (!share) {
    return null;
  }
  const generate = async () => {
    const allowed = await consumeTierlistRateLimit({
      id: `tierlist-png:${id}`,
      limit: 12,
      windowMs: 3_600_000,
    });
    if (!allowed) {
      throw new Error('Image generation is temporarily limited.');
    }

    return renderTierlistPng(tierlistDocumentSchema.parse(share.document));
  };
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return { status: 'generated' as const, png: await generate() };
  }
  const identity = {
    shareId: id,
    fingerprint: share.fingerprint,
    token: randomUUID(),
  };
  let claim = await claimTierlistPng(identity);
  const deadline = Date.now() + 120_000;
  while (claim.status === 'busy' && Date.now() < deadline) {
    await setTimeout(1000);
    claim = await claimTierlistPng(identity);
  }
  if (claim.status === 'ready') {
    return {
      status: 'ready' as const,
      url: claim.url,
      fingerprint: share.fingerprint,
    };
  }
  if (claim.status === 'busy') {
    return { status: 'pending' as const };
  }

  try {
    const png = await generate();
    const url = await storeTierlistPng({ ...identity, png });
    return { status: 'ready' as const, url, fingerprint: share.fingerprint };
  } finally {
    await releaseTierlistPng(identity);
  }
};
