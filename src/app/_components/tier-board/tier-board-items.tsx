'use client';

import { useAtomValue } from 'jotai';
import { motion } from 'motion/react';
import { useDeferredValue, useState } from 'react';
import {
  renamingItemIdAtom,
  tierFindQueryAtom,
} from '@/app/_atoms/tierlist/find.atoms';
import {
  editingItemIdAtom,
  menuItemIdAtom,
} from '@/app/_atoms/tierlist/interaction.atoms';
import {
  draggedRankAtom,
  rankOffsetsAtom,
} from '@/app/_atoms/tierlist/layout.atoms';
import { TierItemInteractionHost } from '@/app/_components/tier-item/tier-item-interaction-host';
import { TierItemPassive } from '@/app/_components/tier-item/tier-item-passive';
import { TierItemSizing } from '@/app/_components/tier-item/tier-item-sizing';
import { useTierItemActions } from '@/app/_hooks/use-tier-item-actions';
import type { useTierItems } from '@/app/_hooks/use-tier-items';
import { useViewportWindow } from '@/app/_hooks/use-viewport-window';
import { getTrimmedImage } from '@/app/_lib/tier-image-trim';
import { TierItemActionsContext } from '@/app/_lib/tier-item-actions-context';
import {
  getTierItemLabel,
  matchesTierItemLabel,
} from '@/app/_lib/tier-item-label';
import { getRankOffset } from '@/app/_lib/tier-rank-drag';
import type { TierRank } from '@/app/_types/tierlist.types';

type TierBoardItemsProps = {
  interaction: Pick<
    ReturnType<typeof useTierItems>,
    | 'items'
    | 'posterLayout'
    | 'draggingId'
    | 'boardRef'
    | 'dropPosition'
    | 'position'
    | 'visibleRank'
    | 'updateItem'
    | 'start'
    | 'move'
    | 'drop'
    | 'cancel'
    | 'keyboardMove'
    | 'announcement'
  >;
};

export const TierBoardItems = ({ interaction }: TierBoardItemsProps) => {
  const window = useViewportWindow(interaction.boardRef);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const offsets = useAtomValue(rankOffsetsAtom);
  const draggedRank = useAtomValue(draggedRankAtom);
  const geometry = new Map(
    interaction.posterLayout.map((poster) => [poster.id, poster]),
  );
  const menuItemId = useAtomValue(menuItemIdAtom);
  const renamingItemId = useAtomValue(renamingItemIdAtom);
  const editingItemId = useAtomValue(editingItemIdAtom);
  const query = useDeferredValue(useAtomValue(tierFindQueryAtom));
  const actions = useTierItemActions(interaction);
  const virtualized = interaction.items.length > 200;
  const visiblePosters = interaction.items.filter((item) => {
    const poster = geometry.get(item.id);

    return (
      item.image &&
      poster &&
      poster.x + poster.width >= window.left &&
      poster.x <= window.right &&
      poster.y + poster.height >= window.top &&
      poster.y <= window.bottom
    );
  });
  const priorityItems = visiblePosters.map((item) => {
    const poster = geometry.get(item.id);
    if (!poster) {
      return { id: item.id, area: 0 };
    }
    const area =
      Math.max(
        0,
        Math.min(poster.x + poster.width, window.visible.right) -
          Math.max(poster.x, window.visible.left),
      ) *
      Math.max(
        0,
        Math.min(poster.y + poster.height, window.visible.bottom) -
          Math.max(poster.y, window.visible.top),
      );

    return { id: item.id, area };
  });
  const priorityIds = new Set(
    (window.visible.right > window.visible.left && geometry.size > 0
      ? priorityItems
          .filter((item) => item.area > 0)
          .sort((a, b) => b.area - a.area)
      : interaction.items.filter((item) => item.image)
    )
      .slice(0, 3)
      .map((item) => item.id),
  );

  const mountedItems = interaction.items.filter((item) => {
    if (
      !virtualized ||
      item.id === interaction.draggingId ||
      item.id === editingItemId ||
      item.id === menuItemId ||
      item.id === renamingItemId ||
      item.id === focusedId
    ) {
      return true;
    }

    const rect = geometry.get(item.id);
    const offset = getRankOffset(offsets, interaction.visibleRank(item)).get();

    return (
      rect &&
      rect.x + rect.width >= window.left &&
      rect.x <= window.right &&
      rect.y + offset + rect.height >= window.top &&
      rect.y + offset <= window.bottom
    );
  });
  const mountedIds = new Set(mountedItems.map((item) => item.id));
  const placeholderPaths = new Map<TierRank, string[]>();
  interaction.items.forEach((item) => {
    if (mountedIds.has(item.id)) {
      return;
    }
    const rect = geometry.get(item.id);
    const rank = interaction.visibleRank(item);
    if (!rect || !rank) {
      return;
    }
    const paths = placeholderPaths.get(rank) ?? [];
    paths.push(
      `M${rect.x},${rect.y}h${rect.width}v${rect.height}h${-rect.width}Z`,
    );
    placeholderPaths.set(rank, paths);
  });

  return (
    <TierItemActionsContext value={actions}>
      <TierItemInteractionHost>
        <p role="status" className="sr-only">
          {interaction.announcement}
        </p>

        <div
          inert={draggedRank !== null}
          className="pointer-events-none absolute inset-0"
          onFocusCapture={(event) =>
            setFocusedId(
              (event.target as HTMLElement).closest<HTMLElement>(
                '[data-tier-item-id]',
              )?.dataset.tierItemId ?? null,
            )
          }
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) {
              setFocusedId(null);
            }
          }}
        >
          <svg
            aria-hidden="true"
            focusable="false"
            data-tier-placeholders=""
            className="pointer-events-none absolute inset-0 size-full overflow-visible fill-muted"
          >
            {Array.from(placeholderPaths, ([rank, paths]) => (
              <motion.path
                key={rank}
                data-placeholder-rank={rank}
                d={paths.join('')}
                style={{ y: getRankOffset(offsets, rank) }}
              />
            ))}
          </svg>

          {interaction.dropPosition && (
            <motion.div
              aria-hidden="true"
              data-drop-slot=""
              initial={false}
              animate={interaction.dropPosition}
              transition={{ duration: 0.12 }}
              className="absolute left-0 top-0 z-1 border border-dashed border-white/80 bg-white/15"
            />
          )}

          {mountedItems.map((item) => {
            const position = interaction.position(item);
            const rank = interaction.visibleRank(item);

            return position && rank ? (
              <motion.div
                key={item.id}
                data-rank-posters={rank}
                className="pointer-events-none absolute inset-0"
                style={{
                  y: getRankOffset(offsets, rank),
                  zIndex:
                    draggedRank === rank ||
                    interaction.draggingId === item.id ||
                    editingItemId === item.id
                      ? 40
                      : 10,
                }}
              >
                <TierItemPassive
                  key={item.id}
                  id={item.id}
                  label={getTierItemLabel(item)}
                  dimmed={
                    Boolean(query.trim()) && !matchesTierItemLabel(item, query)
                  }
                  rank={rank}
                  editing={editingItemId === item.id}
                  image={item.image}
                  priority={priorityIds.has(item.id)}
                  title={item.title}
                  crop={item.crop}
                  trim={item.trim}
                  sizingControl={
                    <TierItemSizing
                      image={
                        item.image && getTrimmedImage(item.image, item.trim)
                      }
                      expansion={item.rowHeightExpansion ?? 1}
                      onChange={(rowHeightExpansion) =>
                        interaction.updateItem(item.id, {
                          rowHeightExpansion,
                        })
                      }
                    />
                  }
                  position={position}
                />
              </motion.div>
            ) : null;
          })}
        </div>
      </TierItemInteractionHost>
    </TierItemActionsContext>
  );
};
