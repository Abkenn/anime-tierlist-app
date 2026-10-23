'use client';

import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from 'motion/react';
import { useEffect } from 'react';

type TerminalTextProps = { text: string; pending?: boolean };

export const TerminalText = ({
  text,
  pending = /(?:\.{3}|…)$/u.test(text),
}: TerminalTextProps) => {
  const reducedMotion = useReducedMotion();
  const progress = useMotionValue(0);
  const characters = Array.from(text);
  const duration = Math.min(0.55, characters.length * 0.025);
  const typed = useTransform(progress, (value) =>
    characters.slice(0, Math.floor(value)).join(''),
  );

  useEffect(() => {
    const count = Array.from(text).length;

    if (reducedMotion) {
      progress.set(count);
      return;
    }
    progress.set(0);
    const animation = animate(progress, count, {
      duration,
      ease: 'linear',
    });

    return () => animation.stop();
  }, [text, duration, progress, reducedMotion]);

  return (
    <span className="inline-grid max-w-full align-baseline font-mono">
      <span className="sr-only">{text}</span>

      <span
        aria-hidden="true"
        data-text={text}
        className="invisible col-start-1 row-start-1 whitespace-pre-wrap after:content-[attr(data-text)]"
      >
        {pending && <span className="inline-block w-[1ch]">▍</span>}
      </span>

      <span
        aria-hidden="true"
        className="col-start-1 row-start-1 whitespace-pre-wrap"
      >
        <motion.span>{typed}</motion.span>

        {pending && (
          <motion.span
            key={text}
            className="inline-block w-[1ch]"
            initial={{ opacity: 0 }}
            animate={{ opacity: reducedMotion ? 1 : [1, 1, 0, 0] }}
            transition={
              reducedMotion
                ? { duration: 0 }
                : {
                    delay: duration,
                    duration: 0.9,
                    repeat: Infinity,
                    times: [0, 0.49, 0.5, 1],
                  }
            }
          >
            ▍
          </motion.span>
        )}
      </span>
    </span>
  );
};
