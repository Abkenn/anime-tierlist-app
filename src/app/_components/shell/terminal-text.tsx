'use client';

import { type MotionValue, motion, useTransform } from 'motion/react';
import type { ReactNode } from 'react';
import { useTerminalTyping } from '@/app/_hooks/use-terminal-typing';

type TerminalSegment = {
  id: string;
  text: string;
  render?: (content: ReactNode) => ReactNode;
};
type TerminalTextProps = {
  pending?: boolean;
  replaceTail?: boolean;
  line?: number;
} & (
  | { text: string; segments?: never }
  | { text?: never; segments: readonly TerminalSegment[] }
);

export const TerminalText = ({
  text: plainText,
  segments,
  pending: pendingProp,
  replaceTail = false,
  line = 0,
}: TerminalTextProps) => {
  const parts = segments ?? [{ id: 'text', text: plainText ?? '' }];
  const text = parts.map((part) => part.text).join('');
  const pending = pendingProp ?? /(?:\.{3}|…)$/u.test(text);

  return (
    <TypedTerminalText
      text={text}
      parts={parts}
      pending={pending}
      replaceTail={replaceTail}
      line={line}
    />
  );
};

type TypedTerminalTextProps = {
  text: string;
  parts: readonly TerminalSegment[];
  pending: boolean;
  replaceTail: boolean;
  line: number;
};

const TypedTerminalText = ({
  text,
  parts,
  pending,
  replaceTail,
  line,
}: TypedTerminalTextProps) => {
  const { typed, reducedMotion } = useTerminalTyping({
    text,
    replaceTail,
    line,
  });
  const cursor = useTransform(typed, (value): string =>
    value.length > 0 ? '▍' : '',
  );
  let offset = 0;

  return (
    <span className="max-w-full whitespace-pre-wrap align-baseline font-mono [text-decoration:inherit]">
      {parts.map((part) => {
        const start = offset;
        offset += Array.from(part.text).length;

        return (
          <TypedSegment key={part.id} part={part} start={start} typed={typed} />
        );
      })}

      {pending && (
        <motion.span
          aria-hidden="true"
          className="inline-block w-[1ch]"
          initial={{ opacity: 0 }}
          animate={{ opacity: reducedMotion ? 1 : [1, 1, 0, 0] }}
          transition={
            reducedMotion
              ? { duration: 0 }
              : { duration: 0.9, repeat: Infinity, times: [0, 0.49, 0.5, 1] }
          }
        >
          {cursor}
        </motion.span>
      )}
    </span>
  );
};

type TypedSegmentProps = {
  part: TerminalSegment;
  start: number;
  typed: MotionValue<string>;
};

const TypedSegment = ({ part, start, typed }: TypedSegmentProps) => {
  const count = Array.from(part.text).length;
  const visible = useTransform(typed, (value) =>
    Array.from(value)
      .slice(start, start + count)
      .join(''),
  );
  const content = (
    <span className="inline-grid max-w-full align-baseline [text-decoration:inherit]">
      <span className="col-start-1 row-start-1 whitespace-pre-wrap opacity-0">
        {part.text}
      </span>

      <motion.span
        aria-hidden="true"
        className="col-start-1 row-start-1 [text-decoration:inherit]"
      >
        {visible}
      </motion.span>
    </span>
  );

  return part.render ? part.render(content) : content;
};
