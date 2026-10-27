'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { toast } from '@/app/_components/ui/toast';
import {
  clearProjectSession,
  pendingProjectKey,
  projectDropEvent,
} from '@/app/_lib/project-session';

export const useProjectDrop = () => {
  const router = useRouter();
  const reading = useRef(false);
  const [draggingFile, setDraggingFile] = useState(false);
  const drop = useEffectEvent(async (event: DragEvent) => {
    if (!event.dataTransfer?.types.includes('Files')) {
      return;
    }
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files);
    if (files.length !== 1 || !files[0].name.toLowerCase().endsWith('.anime')) {
      toast.add({ title: 'Drop one .anime project file.' });

      return;
    }
    if (reading.current) {
      return;
    }
    reading.current = true;
    const home = ['/', '/offline'].includes(window.location.pathname);
    const tab = home ? null : window.open('about:blank', '_blank');
    if (tab) {
      tab.opener = null;
    }

    try {
      const { readTierlistProject } = await import(
        '@/app/_services/tierlist-download'
      );
      const seed = await readTierlistProject(files[0]);
      if (tab) {
        clearProjectSession(tab.sessionStorage);
        tab.sessionStorage.setItem(pendingProjectKey, seed);
        tab.location.replace(new URL('/', window.location.origin).href);
      } else {
        sessionStorage.setItem(pendingProjectKey, seed);
        if (home) {
          window.dispatchEvent(new Event(projectDropEvent));
        } else {
          router.push('/');
        }
      }
    } catch {
      tab?.close();
      toast.add({
        title: 'Unable to open this project. Choose a valid .anime file.',
      });
    } finally {
      reading.current = false;
    }
  });

  useEffect(() => {
    let depth = 0;
    const reset = () => {
      depth = 0;
      setDraggingFile(false);
    };
    const enter = (event: DragEvent) => {
      if (event.dataTransfer?.types.includes('Files')) {
        depth += 1;
        setDraggingFile(true);
      }
    };
    const leave = () => {
      depth = Math.max(0, depth - 1);
      if (depth === 0) {
        setDraggingFile(false);
      }
    };
    const over = (event: DragEvent) => {
      if (event.dataTransfer?.types.includes('Files')) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
        setDraggingFile(true);
      }
    };
    const receive = (event: DragEvent) => {
      reset();
      void drop(event);
    };
    window.addEventListener('dragenter', enter);
    window.addEventListener('dragleave', leave);
    window.addEventListener('dragend', reset);
    window.addEventListener('blur', reset);
    window.addEventListener('dragover', over);
    window.addEventListener('drop', receive);

    return () => {
      window.removeEventListener('dragenter', enter);
      window.removeEventListener('dragleave', leave);
      window.removeEventListener('dragend', reset);
      window.removeEventListener('blur', reset);
      window.removeEventListener('dragover', over);
      window.removeEventListener('drop', receive);
    };
  }, []);

  return draggingFile;
};
