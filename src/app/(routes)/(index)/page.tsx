import { Suspense } from 'react';
import { HomeMode } from '@/app/_components/home/home-mode';
import { HomePreview } from '@/app/_components/home/home-preview';
import { HomeShell } from '@/app/_components/home/home-shell';
import { PreviewLink } from '@/app/_components/home/preview-link';

const Home = ({ searchParams }: PageProps<'/'>) => (
  <HomeShell>
    <Suspense
      fallback={
        <div>
          <PreviewLink expanded={false} />
          <div id="tier-preview" />
        </div>
      }
    >
      <HomeMode>
        <HomePreview searchParams={searchParams} />
      </HomeMode>
    </Suspense>
  </HomeShell>
);

export default Home;
