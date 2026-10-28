'use server';

import { z } from 'zod';
import { resolveMalTitle } from './mal-anime';

export const resolveMalLink = async (input: unknown) => {
  const queries = z
    .array(z.string().trim().min(2).max(300))
    .max(2)
    .safeParse(input);
  if (!queries.success) {
    return null;
  }
  try {
    for (const query of queries.data) {
      const id = await resolveMalTitle(query);
      if (id) {
        return id;
      }
    }
    return null;
  } catch {
    // A lookup outage must never prevent viewing or dragging the preview.
    return null;
  }
};
