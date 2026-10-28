import { z } from 'zod';
import { tierRanks } from './tier-ranks';

const rank = z.union([
  z.enum(tierRanks),
  z.templateLiteral(['custom-', z.string().min(1).max(93)]),
]);
const fraction = z.number().min(0).max(1);
const item = z.object({
  malId: z.number().int().positive().optional(),
  id: z.string().min(1),
  label: z.string(),
  rank,
  image: z
    .object({
      src: z.string(),
      width: z.number().positive(),
      height: z.number().positive(),
      alt: z.string(),
    })
    .optional(),
  crop: z.object({ x: fraction, y: fraction }).optional(),
  trim: z
    .object({
      left: fraction,
      top: fraction,
      right: fraction,
      bottom: fraction,
    })
    .optional(),
  rowHeightExpansion: fraction.optional(),
  title: z
    .object({
      text: z.string(),
      wrap: z.boolean(),
      position: z.enum(['top', 'middle', 'bottom']),
      color: z.templateLiteral(['#', z.string()]),
    })
    .optional(),
});

export const localTierlistSchema = z.object({
  version: z.literal(1),
  seed: z.string().regex(/^[a-f0-9]{64}$/u),
  revision: z.number().int().nonnegative(),
  updatedAt: z
    .number()
    .int()
    .nonnegative()
    .max(8_640_000_000_000_000)
    .optional(),
  accountOwnerId: z.string().uuid().optional(),
  items: z.array(item),
  ranks: z.array(rank).min(1).max(200),
  rankDetails: z
    .record(
      z.string(),
      z.object({
        label: z.string().min(1).max(100),
        color: z
          .templateLiteral(['#', z.string()])
          .refine((value) => /^#[0-9a-f]{6}$/iu.test(value))
          .optional(),
      }),
    )
    .optional(),
  posterSize: z.enum(['dynamic', 'small', 'medium', 'large']).optional(),
  imageMode: z.enum(['natural', 'cover', 'contain']),
  sync: z
    .object({
      ownerId: z.string(),
      serverRevision: z.number().int().nonnegative(),
      syncedLocalRevision: z.number().int().nonnegative(),
    })
    .optional(),
});

export type LocalTierlist = z.infer<typeof localTierlistSchema>;

export const createUserSeed = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
