'use client';

import {
  type AnimationPlaybackControls,
  animate,
  useMotionValue,
  useReducedMotion,
} from 'motion/react';
import { useContext, useLayoutEffect, useRef } from 'react';
import { TerminalSequenceContext } from '@/app/_components/shell/terminal-sequence';

type TerminalTypingInput = { text: string; replaceTail: boolean; line: number };

const durationFor = (text: string) =>
  Math.min(0.55, Array.from(text).length * 0.025);

export const useTerminalTyping = ({
  text,
  replaceTail,
  line,
}: TerminalTypingInput) => {
  const sequence = useContext(TerminalSequenceContext);
  const reducedMotion = useReducedMotion();
  const progress = useMotionValue(0);
  const typed = useMotionValue('');
  const previousText = useRef<string | undefined>(undefined);
  const history = useRef(new Map<string, number>());

  useLayoutEffect(() => {
    const characters = Array.from(text);
    const old = Array.from(typed.get());
    if (!replaceTail && previousText.current) {
      const previous = Array.from(previousText.current);
      let length = 0;
      while (length < old.length && old[length] === previous[length]) {
        length += 1;
      }

      history.current.set(previousText.current, length);
    }

    previousText.current = text;
    let shared = 0;
    let typing: AnimationPlaybackControls | undefined;
    let delay = 0;
    let scale = 1;

    if (typed.get() === text) {
      history.current.set(text, characters.length);

      return;
    }

    if (reducedMotion) {
      typed.set(text);

      return;
    }

    if (sequence) {
      sequence.startedAt ??= performance.now();
      const durations = sequence.lines.map(durationFor);
      scale = Math.min(
        1,
        0.85 /
          Math.max(
            0.001,
            durations.reduce((sum, duration) => sum + duration, 0),
          ),
      );
      const offset =
        durations.slice(0, line).reduce((sum, duration) => sum + duration, 0) *
        scale;
      delay = Math.max(
        0,
        offset - (performance.now() - sequence.startedAt) / 1000,
      );
    }

    if (!replaceTail) {
      while (shared < old.length && old[shared] === characters[shared]) {
        shared += 1;
      }

      shared = Math.max(shared, history.current.get(text) ?? 0);

      if (shared > 0) {
        delay = 0;
      }
    } else if (replaceTail) {
      while (shared < old.length && old[shared] === characters[shared]) {
        shared += 1;
      }
    }

    const type = () => {
      progress.set(shared);
      typing = animate(progress, characters.length, {
        duration: Math.min(
          replaceTail ? 0.18 : durationFor(text) * scale,
          (characters.length - shared) * 0.025,
        ),
        delay,
        ease: 'linear',
        onUpdate: (value) => {
          typed.set(characters.slice(0, Math.floor(value)).join(''));
          if (!replaceTail) {
            history.current.set(text, Math.floor(value));
          }
        },
        onComplete: () => {
          typed.set(text);
          if (!replaceTail) {
            history.current.set(text, characters.length);
          }
        },
      });
    };

    if (!replaceTail || old.length === 0) {
      typed.set(characters.slice(0, shared).join(''));
      if (shared === characters.length) {
        return;
      }

      if (history.current.size > 32) {
        const oldest = history.current.keys().next().value;
        if (oldest !== undefined) {
          history.current.delete(oldest);
        }
      }

      type();

      return () => typing?.stop();
    }

    progress.set(old.length);
    const erasing = animate(progress, shared, {
      duration: Math.min(0.12, (old.length - shared) * 0.015),
      ease: 'linear',
      onUpdate: (value) => typed.set(old.slice(0, Math.ceil(value)).join('')),
      onComplete: type,
    });

    return () => {
      erasing.stop();
      typing?.stop();
    };
  }, [text, replaceTail, line, sequence, progress, typed, reducedMotion]);

  return { typed, reducedMotion };
};
