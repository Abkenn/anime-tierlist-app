import Image from 'next/image';
import { posterDisplaySource } from '@/app/_lib/poster-display-source';
import type { TierItemPosition } from '@/app/_lib/tier-board-geometry';
import type {
  TierCrop,
  TierImage,
  TierImageMode,
  TierImageTrim,
} from '@/app/_types/tierlist.types';
import { TierItemImage } from './tier-item-image';

type TierItemOverviewProps = {
  id: string;
  label: string;
  image?: TierImage;
  trim?: TierImageTrim;
  crop?: TierCrop;
  mode: TierImageMode;
  position: TierItemPosition;
  priority: boolean;
  dimmed?: boolean;
};

export const TierItemOverview = ({
  id,
  label,
  image,
  trim,
  crop,
  mode,
  position,
  priority,
  dimmed,
}: TierItemOverviewProps) => {
  const trimmed =
    mode === 'natural' &&
    trim &&
    (trim.left !== 0 || trim.top !== 0 || trim.right !== 1 || trim.bottom !== 1);

  return (
    <div
      data-tier-item-id={id}
      className={`pointer-events-auto absolute overflow-hidden${dimmed ? ' opacity-20' : ''}`}
      style={{ left: position.x, top: position.y, width: position.width, height: position.height }}
    >
      {image && trimmed ? (
        <TierItemImage
          image={image}
          trim={trim}
          mode="natural"
          crop={{ x: 0.5, y: 0.5 }}
          priority={priority}
        />
      ) : null}

      {image && !trimmed ? (
        <Image
          src={posterDisplaySource(image.src, 'compact')}
          alt={label}
          fill
          unoptimized
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : undefined}
          draggable={false}
          className={mode === 'cover' ? 'object-cover' : 'object-contain'}
          style={{
            objectPosition:
              mode === 'cover'
                ? `${(crop?.x ?? 0.5) * 100}% ${(crop?.y ?? 0.5) * 100}%`
                : '50% 50%',
          }}
        />
      ) : null}

      {!image && <span className="text-xs">{label}</span>}
    </div>
  );
};
