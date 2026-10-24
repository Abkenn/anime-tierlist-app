'use client';
import { useState } from 'react';
import { HomeShell } from '@/app/_components/home/home-shell';
import { LocalTierlist } from '@/app/_components/home/local-tierlist';
import { OfflineFallback } from '@/app/_components/offline/offline-fallback';
import { TerminalSequence } from '@/app/_components/shell/terminal-sequence';
import { TerminalText } from '@/app/_components/shell/terminal-text';
import { Button } from '@/app/_components/ui/button';
import { TierBoardProvider } from '@/app/_providers/tier-board-provider';

type RouteErrorProps = { error: unknown; retry: () => void };

const RouteError = ({ retry }: RouteErrorProps) => {
  const [offline, setOffline] = useState(false);

  if (offline) {
    return (
      <HomeShell>
        <TierBoardProvider>
          <LocalTierlist>
            <OfflineFallback />
          </LocalTierlist>
        </TierBoardProvider>
      </HomeShell>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-24 sm:px-12">
      <TerminalSequence
        lines={[
          'Unable to load this page',
          'Continue with the offline tierlist, or try again.',
          'Continue offline',
          'Try again',
        ]}
      >
        <h1 className="text-2xl">
          <TerminalText text="Unable to load this page" />
        </h1>

        <p className="mt-4 text-sm text-muted-foreground">
          <TerminalText
            text="Continue with the offline tierlist, or try again."
            line={1}
          />
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-6">
          <Button
            variant="link"
            className="px-0"
            onClick={() => setOffline(true)}
          >
            <TerminalText text="Continue offline" line={2} />
          </Button>

          <Button variant="link" className="px-0" onClick={() => retry()}>
            <TerminalText text="Try again" line={3} />
          </Button>
        </div>
      </TerminalSequence>
    </main>
  );
};

export default RouteError;
