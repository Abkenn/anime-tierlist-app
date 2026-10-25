import type { RemoteTierlist } from '@/app/_lib/tierlist-sync';

export type GoogleTierlistSnapshot = {
  profileKey: string;
  displayName: string;
  remote: RemoteTierlist;
};
export type AccountSnapshot =
  | {
      status: 'ready';
      userId: string | null;
      account: GoogleTierlistSnapshot | null;
    }
  | { status: 'unavailable' };
