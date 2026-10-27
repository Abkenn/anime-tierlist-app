'use client';

import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { toast } from '@/app/_components/ui/toast';
import {
  clearProjectSession,
  type ProjectSession,
  pendingProjectKey,
  pendingProjectSeed,
  projectDropEvent,
  readProjectSession,
  saveProjectSession,
} from '@/app/_lib/project-session';
import type { RemoteTierlist } from '@/app/_lib/tierlist-sync';
import { withTierlistSyncLock } from '@/app/_lib/tierlist-tabs';
import { readLocalTierlist } from '@/app/_services/local-tierlist';
import { connectTierlist } from '@/app/_services/tierlist.actions';
import type { useLocalTierlist } from './use-local-tierlist';

type ProjectImportInput = {
  storage: ReturnType<typeof useLocalTierlist>;
  ready: boolean;
  accountProfileKey: string;
};

export const useProjectImport = ({
  storage,
  ready,
  accountProfileKey,
}: ProjectImportInput) => {
  const [project, setProject] = useState<ProjectSession | null>(null);
  const [request, setRequest] = useState(0);
  const [opening, setOpening] = useState(false);
  const attempted = useRef(0);

  useEffect(() => {
    const receive = () => {
      setProject(readProjectSession());
      setRequest((value) => value + 1);
    };
    receive();
    window.addEventListener(projectDropEvent, receive);

    return () => window.removeEventListener(projectDropEvent, receive);
  }, []);

  const open = useEffectEvent(async () => {
    const pending = pendingProjectSeed();
    const previous = readProjectSession();
    const seed = pending ?? previous?.seed;
    if (!seed) {
      return;
    }
    if (seed === storage.seed) {
      sessionStorage.removeItem(pendingProjectKey);

      return;
    }
    setOpening(true);
    try {
      await storage.flush();
      await withTierlistSyncLock(async () => {
        let cached = false;
        try {
          cached = !(await readLocalTierlist(seed)).accountOwnerId;
        } catch {
          /* New project seeds do not have a cached profile yet. */
        }
        let remote: RemoteTierlist | undefined;
        if (!cached) {
          const result = await connectTierlist({ seed });
          if (!result.ok) {
            throw new Error(result.message);
          }
          remote = result.value;
        }
        const next = {
          seed,
          returnSeed: previous?.returnSeed ?? storage.seed,
          returnAccount:
            previous?.returnAccount ??
            (storage.seed === accountProfileKey ||
              Boolean(storage.snapshot?.accountOwnerId)),
        };
        saveProjectSession(next);
        try {
          if (remote) {
            await storage.importProfile(seed, remote, true);
          } else {
            await storage.selectProfile(seed);
          }
        } catch (error) {
          if (previous) {
            saveProjectSession(previous);
          } else {
            clearProjectSession();
          }
          throw error;
        }
        setProject(next);
      });
    } catch (error) {
      toast.add({
        title:
          error instanceof Error
            ? error.message
            : 'Unable to open this project. Your tierlist is unchanged.',
      });
    } finally {
      if (sessionStorage.getItem(pendingProjectKey) === pending) {
        sessionStorage.removeItem(pendingProjectKey);
      }
      setOpening(false);
    }
  });

  useEffect(() => {
    if (ready && storage.seed && request > attempted.current && !opening) {
      attempted.current = request;
      void open();
    }
  }, [ready, storage.seed, request, opening]);

  const clear = () => {
    clearProjectSession();
    sessionStorage.removeItem(pendingProjectKey);
    setProject(null);
  };

  return { project, opening, clear };
};
