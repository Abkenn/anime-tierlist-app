export const transferBoardScroll = (
  workspace: HTMLElement,
  board: HTMLElement,
) => {
  const remaining =
    workspace.scrollHeight - workspace.clientHeight - workspace.scrollTop;

  // Fractional device pixels can leave an unconsumable gap at the scroll limit.
  if (remaining <= 1 || board.scrollTop <= 0) {
    return;
  }

  const before = workspace.scrollTop;
  workspace.scrollTop += Math.min(remaining, board.scrollTop);
  const consumed = workspace.scrollTop - before;

  if (consumed > 0) {
    board.scrollTop = Math.max(0, board.scrollTop - consumed);
  }
};

export const getTouchScrollState = (
  viewport: HTMLElement,
  workspace = viewport.matches('[data-tier-viewport]')
    ? viewport.closest<HTMLElement>('[data-tier-workspace-scroll]')
    : null,
) => {
  const revealHeight = workspace
    ? Math.max(0, workspace.scrollHeight - workspace.clientHeight)
    : 0;
  const max =
    revealHeight + Math.max(0, viewport.scrollHeight - viewport.clientHeight);

  return {
    position: (workspace?.scrollTop ?? 0) + viewport.scrollTop,
    max,
    moveTo: (position: number) => {
      const next = Math.max(0, Math.min(max, position));
      if (workspace) {
        workspace.scrollTop = Math.min(revealHeight, next);
      }
      viewport.scrollTop = Math.max(0, next - revealHeight);
    },
  };
};
