'use client';

import { Popover } from '@base-ui/react/popover';
import { cn } from 'cn';
import {
  type PropsWithChildren,
  type ReactNode,
  useRef,
  useState,
} from 'react';
import { TerminalSequence } from '@/app/_components/shell/terminal-sequence';
import { TerminalText } from '@/app/_components/shell/terminal-text';
import { useTierlistAccount } from '@/app/_hooks/use-tierlist-account';
import type { AccountSnapshot } from '@/app/_types/account-snapshot';
import { PosterOfflineCache } from './poster-offline-cache';
import { TierlistConflict } from './tierlist-conflict';
import { TierlistSyncFeedback } from './tierlist-sync-feedback';
import { UserSeed } from './user-seed';

export const LocalTierlist = ({
  children,
  initialAccount,
}: PropsWithChildren<{ initialAccount?: Promise<AccountSnapshot> }>) => {
  const {
    storage,
    sync,
    busy,
    error,
    accountOpen,
    setAccountOpen,
    googleConnected,
    accountUnavailable,
    status,
    actions,
  } = useTierlistAccount(initialAccount);
  const statusAnchor = useRef<HTMLButtonElement>(null);
  const [accountHandle] = useState(() => Popover.createHandle());

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <TerminalSequence
        identity={`${status.statusText}:${sync.status === 'offline' ? status.backupMessage : ''}`}
        lines={[
          status.statusText,
          '',
          status.needsReconnect ? status.backupMessage : '',
          sync.status === 'offline' ? 'Retrying in 30 seconds...' : '',
          status.needsReconnect ? status.reconnectLabel : '',
        ]}
      >
        <div className="mb-2 flex min-h-9 flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground max-lg:pr-10">
          <p role="status" className="min-w-0 max-w-full">
            <TerminalText
              segments={[
                { id: 'status', text: status.message },
                ...(status.showIdentity
                  ? [
                      {
                        id: 'separator',
                        text: status.identitySeparator,
                        render: (content: ReactNode) => (
                          <span
                            className={cn(
                              !status.backedUp &&
                                !status.restoringAccount &&
                                'sm:hidden',
                            )}
                          >
                            {content}
                          </span>
                        ),
                      },
                      {
                        id: 'account',
                        text: status.identityLabel,
                        render: (content: ReactNode) => (
                          <Popover.Trigger
                            ref={statusAnchor}
                            handle={accountHandle}
                            className={cn(
                              'max-w-full cursor-pointer wrap-break-word text-left align-baseline font-medium text-foreground underline decoration-current/70 underline-offset-4 transition-[color,text-decoration-color,opacity] hover:decoration-current active:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-4 max-sm:py-1 data-popup-open:decoration-current',
                              !status.backedUp &&
                                !status.restoringAccount &&
                                'sm:hidden',
                            )}
                          >
                            {content}
                          </Popover.Trigger>
                        ),
                      },
                    ]
                  : []),
              ]}
            />
          </p>

          <UserSeed
            seed={
              googleConnected || storage.snapshot?.accountOwnerId
                ? ''
                : storage.seed
            }
            open={accountOpen}
            handle={accountHandle}
            statusAnchor={statusAnchor}
            onOpenChange={setAccountOpen}
            imported={storage.imported}
            busy={status.controlsBusy}
            error={status.visibleError}
            onImport={actions.importSeed}
            onUseDevice={actions.restoreDevice}
            onReplaceDevice={actions.replaceDevice}
            resolvingIdentity={status.verifyingIdentity}
            googleConnected={
              googleConnected || Boolean(status.restoringAccount)
            }
            canSignIn={status.backedUp || sync.status === 'unauthorized'}
            onGoogleSignIn={actions.signIn}
            onGoogleSignOut={actions.restoreDevice}
            onShare={actions.shareSeed}
          />
        </div>

        <TierlistSyncFeedback
          sync={sync}
          busy={busy}
          onReload={actions.reloadApp}
        />
      </TerminalSequence>

      <PosterOfflineCache />

      {sync.status === 'conflict' && (
        <TierlistConflict
          onlineItemCount={sync.conflict.document.items.length}
          localItemCount={storage.snapshot?.items.length ?? 0}
          localUpdatedAt={storage.snapshot?.updatedAt}
          onlineUpdatedAt={sync.conflict.document.updatedAt}
          busy={busy}
          error={error}
          onKeepDevice={actions.keepDeviceChanges}
          onAcceptOnline={actions.acceptOnlineChanges}
        />
      )}

      <div
        className={cn(
          'flex min-h-0 flex-1 flex-col',
          accountUnavailable && 'invisible',
        )}
        inert={storage.status === 'loading' || busy || accountUnavailable}
        aria-busy={storage.status === 'loading' || busy || accountUnavailable}
      >
        {children}
      </div>
    </div>
  );
};
