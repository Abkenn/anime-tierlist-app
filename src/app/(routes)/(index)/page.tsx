import { HomeShell } from '@/app/_components/home/home-shell';
import { TierBoard } from '@/app/_components/tierlist';
import { TierBoardProvider } from '@/app/_providers/tier-board-provider';

const Home = () => (
  <HomeShell>
    <TierBoardProvider>
      <TierBoard />
    </TierBoardProvider>
  </HomeShell>
);

export default Home;
