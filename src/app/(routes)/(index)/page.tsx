import { AnimeSearch } from '@/app/_components/anime-search/anime-search';
import { HomeShell } from '@/app/_components/home/home-shell';
import { HomeWorkspace } from '@/app/_components/home/home-workspace';
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
          <HomeWorkspace search={<AnimeSearch />}>
            <TierBoard initialItemCount={0} />
          </HomeWorkspace>
        </LocalTierlist>
      </TierBoardProvider>
    </HomeShell>
  );
};

export default Home;
