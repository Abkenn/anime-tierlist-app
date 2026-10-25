import { AnimeSearch } from '@/app/_components/anime-search/anime-search';
import { HomeShell } from '@/app/_components/home/home-shell';
import { LocalTierlist } from '@/app/_components/home/local-tierlist';
import { TierBoard } from '@/app/_components/tierlist';
import { discordEmbedUrl, homepageMetadata } from '@/app/_lib/site-metadata';
import { TierBoardProvider } from '@/app/_providers/tier-board-provider';
import { getInitialAccountSnapshot } from '@/app/_services/account-snapshot';

export const metadata = homepageMetadata;

const Home = () => {
  const initialAccount = getInitialAccountSnapshot();

  return (
    <HomeShell>
      <link
        rel="discord:component-embed"
        type="application/vnd.discord.component-embed+json"
        href={discordEmbedUrl}
      />

      <TierBoardProvider>
        <LocalTierlist initialAccount={initialAccount}>
          <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] gap-4 lg:grid-cols-[16rem_minmax(0,1fr)] lg:grid-rows-1">
            <AnimeSearch />

            <div className="flex min-h-0 min-w-0 flex-col">
              <TierBoard initialItemCount={0} />
            </div>
          </div>
        </LocalTierlist>
      </TierBoardProvider>
    </HomeShell>
  );
};

export default Home;
