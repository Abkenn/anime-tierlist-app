import { HomeShell } from '@/app/_components/home/home-shell';
import { LocalTierlist } from '@/app/_components/home/local-tierlist';
import { OfflineFallback } from '@/app/_components/offline/offline-fallback';
import { TierBoardProvider } from '@/app/_providers/tier-board-provider';

export const ensureStatic = 'navigation';

const OfflineHome = () => (
  <HomeShell>
    <TierBoardProvider>
      <LocalTierlist>
        <OfflineFallback />
      </LocalTierlist>
    </TierBoardProvider>
  </HomeShell>
);

export default OfflineHome;
