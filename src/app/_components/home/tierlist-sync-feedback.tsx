import { RetryCountdown } from '@/app/_components/shell/retry-countdown';
import { TerminalText } from '@/app/_components/shell/terminal-text';
import type { useTierlistSync } from '@/app/_hooks/use-tierlist-sync';
import { tierlistUpdateMessage } from '@/app/_lib/tierlist-error';

type Sync = ReturnType<typeof useTierlistSync>;
type SyncFeedbackProps = {
  sync: Sync;
  busy: boolean;
  onReload: () => Promise<unknown>;
};

export const TierlistSyncFeedback = ({
  sync,
  busy,
  onReload,
}: SyncFeedbackProps) => (
  <>
    {sync.status === 'offline' && (
      <div className="mb-3 space-y-1 text-xs text-muted-foreground">
        <p role="status">
          <TerminalText
            text={sync.message ?? 'Couldn’t reach your saved tierlist.'}
            line={2}
          />
        </p>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {sync.retryAt && <RetryCountdown retryAt={sync.retryAt} line={3} />}

          <button
            type="button"
            onClick={sync.retry}
            className="min-h-9 cursor-pointer underline underline-offset-4 hover:text-foreground"
          >
            <TerminalText text="Try saving again" line={4} />
          </button>
        </div>
      </div>
    )}

    {sync.status === 'outdated' && (
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <p role="status">
          <TerminalText text={tierlistUpdateMessage} line={2} />
        </p>

        <button
          type="button"
          disabled={busy}
          onClick={() => void onReload()}
          className="min-h-9 cursor-pointer underline underline-offset-4 hover:text-foreground disabled:opacity-50"
        >
          <TerminalText text="Reload app" line={4} />
        </button>
      </div>
    )}
  </>
);
