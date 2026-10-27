import { Suspense } from 'react';
import { SharedTierlist } from '@/app/_components/sharing/shared-tierlist';

export const metadata = {
  title: 'Shared Anime Tierlist',
  robots: { index: false, follow: false },
};

const ShareContent = async ({ params }: PageProps<'/[shareId]'>) => {
  const { shareId } = await params;

  return <SharedTierlist id={shareId} />;
};

const SharedPage = (props: PageProps<'/[shareId]'>) => (
  <main className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 sm:px-8 lg:px-6">
    <h1 className="sr-only">Shared Anime Tierlist</h1>

    <Suspense
      fallback={
        <p className="text-xs text-muted-foreground">Loading tierlist...</p>
      }
    >
      <ShareContent {...props} />
    </Suspense>
  </main>
);

export default SharedPage;
