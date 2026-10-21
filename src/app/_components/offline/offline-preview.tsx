'use client';

import {
  startTransition,
  useEffect,
  useRef,
  useState,
  ViewTransition,
} from 'react';
import { TierPreview } from '@/app/_components/home/tier-preview';
import { Button } from '@/app/_components/ui/button';
import { OFFLINE_RECONNECT_EVENT } from '@/app/_services/offline-mode';
import {
  readPreviewExpanded,
  savePreviewExpanded,
} from '@/app/_services/offline-storage';

export const OfflinePreview = () => {
  const [expanded, setExpanded] = useState(false);
  const interacted = useRef(false);
  useEffect(() => {
    let active = true;
    void readPreviewExpanded()
      .then((saved) => {
        if (active && !interacted.current)
          startTransition(() => setExpanded(saved));
      })
      .catch((error: unknown) =>
        console.warn('Local preview could not be restored.', error),
      );
    return () => {
      active = false;
    };
  }, []);
  const togglePreview = () => {
    interacted.current = true;
    const next = !expanded;
    startTransition(() => setExpanded(next));
    void savePreviewExpanded(next).catch((error: unknown) =>
      console.warn('Local preview could not be saved.', error),
    );
  };
  return (
    <div>
      <p role="status" className="mb-4 text-xs text-muted-foreground">
        Local homepage · offline mode
      </p>
      <Button
        variant="link"
        className="h-10 rounded-none px-0 font-normal underline-offset-8"
        aria-expanded={expanded}
        aria-controls="tier-preview"
        onClick={togglePreview}
      >
        <span aria-hidden="true" className="mr-2 text-muted-foreground">
          &gt;
        </span>
        {expanded ? 'close preview' : 'explore tiers'}
      </Button>
      <div id="tier-preview">
        {expanded && (
          <ViewTransition
            default="none"
            enter="preview-change"
            exit="preview-change"
          >
            <TierPreview />
          </ViewTransition>
        )}
      </div>
      <Button
        variant="link"
        className="mt-5 block h-auto rounded-none px-0 text-xs font-normal text-muted-foreground underline underline-offset-4"
        onClick={() => window.dispatchEvent(new Event(OFFLINE_RECONNECT_EVENT))}
      >
        Retry connection
      </Button>
    </div>
  );
};
