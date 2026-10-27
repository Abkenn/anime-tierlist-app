import type { TierItemTitle } from '@/app/_types/tierlist.types';

const characterWidth = (character: string) => {
  if (/[ilI.,'!\s]/u.test(character)) {
    return 0.35;
  }
  if (/[MW@mw]/u.test(character)) {
    return 1.1;
  }
  return (character.codePointAt(0) ?? 0) > 255 ? 1 : 0.65;
};

export const getTierTitleLayout = (
  title: TierItemTitle,
  width: number,
  height: number,
) => {
  const availableWidth = Math.max(1, width - 8);
  const source = title.text.split('\n').slice(0, 4);
  const widths = source.map((line) =>
    Array.from(line).reduce(
      (sum, character) => sum + characterWidth(character),
      0,
    ),
  );
  let fontSize = Math.max(
    1,
    Math.min(
      16,
      height * 0.1,
      width * 0.16,
      (height - 8) / (Math.max(1, source.length) * 1.25),
    ),
  );
  if (!title.wrap) {
    fontSize = Math.min(fontSize, availableWidth / Math.max(1, ...widths));
    return { fontSize, lines: source };
  }
  const wrap = () =>
    source.flatMap((line) => {
      const lines: string[] = [];
      let current = '';
      let used = 0;
      Array.from(line).forEach((character) => {
        const next = characterWidth(character) * fontSize;
        if (current && used + next > availableWidth) {
          lines.push(current.trimEnd());
          current = '';
          used = 0;
        }
        current += character;
        used += next;
      });
      lines.push(current);
      return lines;
    });
  let lines = wrap();
  while (lines.length > 4 && fontSize > 1) {
    fontSize = Math.max(1, fontSize * 0.9);
    lines = wrap();
  }

  return { fontSize, lines: lines.slice(0, 4) };
};
