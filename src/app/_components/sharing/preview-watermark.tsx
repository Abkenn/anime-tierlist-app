import { previewWatermark as mark } from '@/app/_lib/preview-watermark';

export const PreviewWatermark = ({ height }: { height: number }) => (
  <g pointerEvents="none">
    <rect
      x={mark.x}
      y={height - mark.bottom - mark.height}
      width={mark.width}
      height={mark.height}
      rx={2}
      fill={mark.background}
      opacity={mark.backgroundOpacity}
    />

    <text
      x={mark.x + mark.width / 2}
      y={height - mark.bottom - 8}
      textAnchor="middle"
      fontFamily={mark.fontFamily}
      fontSize={mark.fontSize}
      fontWeight={mark.fontWeight}
      fill={mark.color}
      opacity={mark.opacity}
    >
      {mark.text}
    </text>
  </g>
);
