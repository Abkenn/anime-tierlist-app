import { Suspense } from 'react';
import { PreviewModal } from '@/app/_components/sharing/preview-modal';
import { SharedTierlist } from '@/app/_components/sharing/shared-tierlist';
import { TerminalText } from '@/app/_components/shell/terminal-text';

const PreviewContent = async ({ params }: PageProps<'/[shareId]'>) => {
  const { shareId } = await params;

  return <SharedTierlist id={shareId} />;
};

const InterceptedPreview = (props: PageProps<'/[shareId]'>) => (
  <PreviewModal>
    <Suspense
      fallback={
        <p className="text-xs text-muted-foreground">
          <TerminalText text="Loading tierlist..." />
        </p>
      }
    >
      <PreviewContent {...props} />
    </Suspense>
  </PreviewModal>
);

export default InterceptedPreview;
