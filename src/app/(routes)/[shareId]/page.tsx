import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SharedTierlist } from '@/app/_components/sharing/shared-tierlist';
import { siteUrl } from '@/app/_lib/site-metadata';
import { readPublicTierlist } from '@/app/_services/tierlist-share';

export const generateMetadata = async ({
  params,
}: PageProps<'/[shareId]'>): Promise<Metadata> => {
  const { shareId } = await params;
  const share = await readPublicTierlist(shareId);
  if (!share) {
    return {
      title: 'Tierlist not found',
      robots: { index: false, follow: false },
    };
  }
  const url = new URL(`/${share.id}.${share.version}`, siteUrl);
  const image = new URL(
    `/api/tierlist-preview/${shareId}/image?v=${share.version}`,
    siteUrl,
  );

  return {
    title: 'Shared Anime Tierlist',
    description: 'View this anime tierlist.',
    robots: { index: false, follow: false },
    openGraph: {
      type: 'website',
      title: 'Anime Tierlist',
      description: 'View this anime tierlist.',
      url,
      images: [{ url: image, type: 'image/png', alt: 'Shared anime tierlist' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Anime Tierlist',
      images: [image.href],
    },
  };
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
