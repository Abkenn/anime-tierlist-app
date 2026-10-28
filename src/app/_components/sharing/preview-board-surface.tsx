import { posterCrossOrigin } from '@/app/_lib/poster-cross-origin';
import { rankTextColor } from '@/app/_lib/rank-text-color';
import {
  type ExportRow,
  exportImageFrame,
  exportPosterSize,
  exportTextLines,
  exportTitle,
} from '@/app/_lib/tierlist-export-layout';
import type { TierImageMode } from '@/app/_types/tierlist.types';

type PreviewBoardSurfaceProps = {
  rows: ExportRow[];
  width: number;
  height: number;
  mode: TierImageMode;
  visibleIds?: ReadonlySet<string>;
  frame?: { x: number; y: number; width: number; height: number };
  clipPrefix?: string;
};

export const PreviewBoardSurface = ({
  rows,
  width,
  height,
  mode,
  visibleIds,
  frame,
  clipPrefix = '',
}: PreviewBoardSurfaceProps) => {
  const board = { rows, width, height };

  return (
    <svg
      aria-label={visibleIds ? 'Tierlist board' : 'Shared anime tierlist'}
      role="img"
      viewBox={
        frame
          ? `${frame.x} ${frame.y} ${frame.width} ${frame.height}`
          : `0 0 ${width} ${height}`
      }
      width={frame?.width ?? width}
      height={frame?.height ?? height}
      className="block h-auto w-full"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>Shared anime tierlist</title>
      <rect width={board.width} height={board.height} fill="#1c1c1c" />
      {board.rows.map((row, rowIndex) => (
        <g key={row.rank}>
          <rect
            x={0}
            y={row.y}
            width={exportPosterSize}
            height={exportPosterSize}
            fill={row.color}
          />
          <path d={`M0 ${row.y}H${board.width}`} stroke="#111111" />
          <text
            fill={row.textColor}
            textAnchor="middle"
            fontSize={20}
            fontFamily="monospace"
          >
            {exportTextLines(row.label, exportPosterSize - 16, 20).map(
              (line, index, lines) => (
                <tspan
                  key={`${row.label.slice(0, index)}:${line}`}
                  x={exportPosterSize / 2}
                  y={
                    row.y +
                    exportPosterSize / 2 +
                    (index - (lines.length - 1) / 2) * 25 +
                    7
                  }
                >
                  {line}
                </tspan>
              ),
            )}
          </text>
          {row.posters
            .filter((box) => !visibleIds || visibleIds.has(box.item.id))
            .map((box, index) => {
              const frame = exportImageFrame(box, mode);
              const title = exportTitle(box, mode);
              const clip = `${clipPrefix}poster-${rowIndex}-${index}`;

              return (
                <g key={box.item.id}>
                  <title>{box.item.label}</title>
                  <defs>
                    <clipPath id={clip}>
                      <rect
                        x={box.x}
                        y={box.y}
                        width={box.width}
                        height={box.height}
                      />
                    </clipPath>
                  </defs>
                  <g clipPath={`url(#${clip})`}>
                    {frame && box.item.image?.src ? (
                      <svg
                        x={frame.x}
                        y={frame.y}
                        width={frame.width}
                        height={frame.height}
                        viewBox={`${frame.source.x} ${frame.source.y} ${frame.source.width} ${frame.source.height}`}
                      >
                        <title>{box.item.label || box.item.image.alt}</title>
                        <image
                          href={box.item.image.src}
                          crossOrigin={posterCrossOrigin(box.item.image.src)}
                          width={box.item.image.width}
                          height={box.item.image.height}
                        />
                      </svg>
                    ) : (
                      <text
                        x={box.x + 4}
                        y={box.y + 20}
                        fill="#ededeb"
                        fontSize={14}
                      >
                        {box.item.label}
                      </text>
                    )}
                    {title && (
                      <text
                        x={title.x}
                        fill={title.color}
                        textAnchor="middle"
                        fontFamily="sans-serif"
                        fontWeight={600}
                        fontSize={title.fontSize}
                        stroke={rankTextColor(title.color)}
                        strokeWidth={1.5}
                        paintOrder="stroke"
                      >
                        {title.lines.map((line, lineIndex) => (
                          <tspan
                            key={`${box.item.title?.text.slice(0, lineIndex)}:${line}`}
                            x={title.x}
                            y={
                              title.y +
                              title.fontSize +
                              lineIndex * title.fontSize * 1.25
                            }
                          >
                            {line}
                          </tspan>
                        ))}
                      </text>
                    )}
                  </g>
                </g>
              );
            })}
        </g>
      ))}
    </svg>
  );
};
