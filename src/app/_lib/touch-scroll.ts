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
