'use client';

import { MotionConfig, motion } from 'motion/react';

const tiers = [
  { rank: 'S', label: 'All-time favorites' },
  { rank: 'A', label: 'Worth the rewatch' },
  { rank: 'B', label: 'A good time' },
];

export const TierPreview = () => (
  <MotionConfig reducedMotion="user">
    <ul className="mt-5 border-t terminal-rule">
      {tiers.map(({ rank, label }) => (
        <motion.li
          key={rank}
          className="flex items-baseline gap-8 border-b terminal-rule py-5 sm:gap-12"
          whileHover={{ x: 4 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          <span className="w-5 font-mono text-sm">{rank}</span>
          <span className="text-sm text-muted-foreground">{label}</span>
        </motion.li>
      ))}
    </ul>
  </MotionConfig>
);
