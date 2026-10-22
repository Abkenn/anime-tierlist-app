import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { TierBoardProvider } from '@/app/_providers/tier-board-provider';
import type { TierImageMode } from '@/app/_types/tierlist.types';
import { useTierImageMode } from './use-tier-image-mode';

type ModePreviewProps = { mode?: TierImageMode };

const ModePreview = ({ mode }: ModePreviewProps) => {
  const { imageMode } = useTierImageMode({ value: mode });

  return <output>{imageMode}</output>;
};

describe('image mode SSR', () => {
  it('renders the supplied mode immediately without leaking into the next board', () => {
    const controlled = renderToString(
      <TierBoardProvider>
        <ModePreview mode="cover" />
      </TierBoardProvider>,
    );
    const independent = renderToString(
      <TierBoardProvider>
        <ModePreview />
      </TierBoardProvider>,
    );

    expect(controlled).toContain('<output>cover</output>');
    expect(independent).toContain('<output>natural</output>');
  });
});
