import { HomeShell } from '@/app/_components/home/home-shell';
import { OfflineFallback } from '@/app/_components/offline/offline-fallback';

export const ensureStatic = 'navigation';

const OfflineHome = () => (
  <HomeShell>
    <OfflineFallback />
  </HomeShell>
);

export default OfflineHome;
