import { HomeShell } from '@/app/_components/home/home-shell';
import { homeTierItems } from '@/app/_components/home/home-tier-items';
import { TierBoard } from '@/app/_components/tierlist';
import { TierBoardProvider } from '@/app/_providers/tier-board-provider';

const Home = () => (
  <HomeShell>
    <TierBoardProvider>
      <TierBoard initialItems={homeTierItems} />
    </TierBoardProvider>
  </HomeShell>
);

export default Home;
