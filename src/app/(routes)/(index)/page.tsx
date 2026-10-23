import { AnimeSearch } from '@/app/_components/anime-search/anime-search';
import { HomeShell } from '@/app/_components/home/home-shell';
import { TierBoard } from '@/app/_components/tierlist';
import { TierBoardProvider } from '@/app/_providers/tier-board-provider';

const Home = () => (
  <HomeShell>
    <TierBoardProvider>
      <div className="grid items-start gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <AnimeSearch />

        <div className="min-w-0">
          <TierBoard initialItemCount={0} />
        </div>
      </div>
    </TierBoardProvider>
  </HomeShell>
);

export default Home;
