'use client';

import { useActionState, useRef } from 'react';
import {
  pendingProjectKey,
  projectDropEvent,
} from '@/app/_lib/project-session';

export const ProjectFileImport = ({
  busy,
  onOpened,
}: {
  busy: boolean;
  onOpened: () => void;
}) => {
  const projectInput = useRef<HTMLInputElement>(null);
  const [fileError, openProject, openingProject] = useActionState(
    async (_previous: string, form: FormData) => {
      try {
        const file = form.get('project');
        if (
          !(file instanceof File) ||
          !file.name.toLowerCase().endsWith('.anime')
        ) {
          return 'Choose an .anime project file.';
        }
        const { readTierlistProject } = await import(
          '@/app/_services/tierlist-download'
        );
        const seed = await readTierlistProject(file);
        sessionStorage.setItem(pendingProjectKey, seed);
        window.dispatchEvent(new Event(projectDropEvent));
        onOpened();
        return '';
      } catch {
        return 'Unable to open this project. Choose a valid .anime file.';
      }
    },
    '',
  );

  return (
    <form action={openProject} className="mt-3 border-t border-divider pt-3">
      <input
        ref={projectInput}
        type="file"
        name="project"
        accept=".anime"
        className="hidden"
        disabled={busy || openingProject}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
      />
      <button
        type="button"
        disabled={busy || openingProject}
        onClick={() => {
          if (projectInput.current) {
            projectInput.current.value = '';
            projectInput.current.click();
          }
        }}
        className="min-h-9 cursor-pointer border border-divider px-3 hover:bg-accent disabled:opacity-50"
      >
        {openingProject ? 'Opening project...' : 'Open project file'}
      </button>
      <p className="mt-2 text-muted-foreground">
        Or drop an .anime file anywhere.
      </p>
      {fileError && (
        <p role="status" className="mt-2">
          {fileError}
        </p>
      )}
    </form>
  );
};
