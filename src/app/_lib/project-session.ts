import { z } from 'zod';
import { userSeedSchema } from './tierlist-sync';

export const projectDropEvent = 'anime-project-drop';
export const pendingProjectKey = 'anime-project-pending';
const projectKey = 'anime-project-session';
const projectSessionSchema = z.object({
  seed: userSeedSchema,
  returnSeed: userSeedSchema,
  returnAccount: z.boolean(),
});
export type ProjectSession = z.infer<typeof projectSessionSchema>;

export const readProjectSession = () => {
  try {
    const parsed = projectSessionSchema.safeParse(
      JSON.parse(sessionStorage.getItem(projectKey) ?? 'null'),
    );

    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
};

export const saveProjectSession = (project: ProjectSession) => {
  sessionStorage.setItem(
    projectKey,
    JSON.stringify(projectSessionSchema.parse(project)),
  );
};

export const clearProjectSession = (storage: Storage = sessionStorage) =>
  storage.removeItem(projectKey);

export const pendingProjectSeed = () => {
  try {
    const parsed = userSeedSchema.safeParse(
      sessionStorage.getItem(pendingProjectKey),
    );

    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
};
