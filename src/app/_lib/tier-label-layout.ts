type TierLabelInput = {
  text: string;
  width: number;
  height: number;
  fontSize: number;
  measure?: (word: string) => number;
};

export const getTierLabelLayout = ({
  text,
  width,
  height,
  fontSize: maximum,
  measure = (word) =>
    Array.from(word).reduce(
      (sum, character) =>
        sum + ((character.codePointAt(0) ?? 0) > 255 ? 1 : 0.62),
      0,
    ),
}: TierLabelInput) => {
  const words = text.trim().split(/\s+/u);
  let fontSize = Math.max(
    1,
    Math.min(maximum, width / Math.max(1, ...words.map(measure))),
  );
  const wrap = () => {
    const lines: string[] = [];
    let line = '';
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && measure(candidate) * fontSize > width) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) {
      lines.push(line);
    }
    return lines;
  };
  let lines = wrap();
  while (lines.length * fontSize * 1.25 > height && fontSize > 1) {
    fontSize = Math.max(1, fontSize * 0.9);
    lines = wrap();
  }
  return { fontSize, lines };
};
