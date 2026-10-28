import { layoutExportBoard } from '@/app/_lib/tierlist-export-layout';
import type { TierlistDocument } from '@/app/_lib/tierlist-sync';
import { PreviewBoardSurface } from './preview-board-surface';

export const TierlistPreviewBoard = ({
  document,
}: {
  document: TierlistDocument;
}) => (
  <PreviewBoardSurface
    {...layoutExportBoard(document)}
    mode={document.imageMode}
  />
);
