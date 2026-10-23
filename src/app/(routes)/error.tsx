'use client';
import { useState } from 'react';
import { HomeShell } from '@/app/_components/home/home-shell';
import { LocalTierlist } from '@/app/_components/home/local-tierlist';
import { OfflineFallback } from '@/app/_components/offline/offline-fallback';
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
      <h1 className="text-2xl">
        <TerminalText text="Unable to load this page" />
      </h1>

      <p className="mt-4 text-sm text-muted-foreground">
        <TerminalText text="Continue with the offline tierlist, or try again." />
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-6">
        <Button
          variant="link"
          className="px-0"
          onClick={() => setOffline(true)}
        >
          Continue offline
        </Button>

        <Button variant="link" className="px-0" onClick={() => retry()}>
          Try again
        </Button>
      </div>
    </main>
  );
};

export default RouteError;
