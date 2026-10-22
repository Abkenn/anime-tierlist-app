'use client';

import { Slider } from '@/app/_components/ui/slider';
import type { TierImage } from '@/app/_types/tierlist.types';

const expansionLabel = (value: number) => {
  if (value === 0) {
    return 'Custom ratio';
  }

  if (value === 100) {
    return 'Full row height';
  }

  return `${value}%`;
};

type TierItemSizingProps = {
  image?: TierImage;
  expansion: number;
  onChange: (expansion: number) => void;
};

export const TierItemSizing = ({
  image,
  expansion,
  onChange,
}: TierItemSizingProps) => {
  const hasImage = Boolean(image);
  const fullHeightByDefault = Boolean(
    image && image.width > 0 && image.height >= image.width,
  );

  return (
    <div className="w-60 max-w-full px-3">
      <Slider
        thumbProps={{
          getAriaLabel: () => 'Row height expansion',
          getAriaValueText: (_formatted, value) => expansionLabel(value),
        }}
        thumbLabel={expansionLabel}
        min={0}
        max={100}
        step={1}
        value={[fullHeightByDefault ? 100 : Math.round(expansion * 100)]}
        disabled={!hasImage || fullHeightByDefault}
        onValueChange={(values) =>
          onChange((Array.isArray(values) ? values[0] : values) / 100)
        }
        onKeyDown={(event) => {
          if (event.code !== 'Escape' && event.code !== 'Tab') {
            event.stopPropagation();
          }
        }}
      />
    </div>
  );
};
