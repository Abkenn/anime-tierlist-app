'use client';

import { Popover } from '@base-ui/react/popover';
import { cn } from 'cn';
import { type PropsWithChildren, type ReactNode, useState } from 'react';
import { SaveShare } from '@/app/_components/sharing/save-share';
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
    project,
    accountUnavailable,
    status,
    actions,
  } = useTierlistAccount(initialAccount);
  const [accountHandle] = useState(() => Popover.createHandle());
  const projectTarget = project?.returnAccount ? 'account' : 'device';

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
        <div className="mb-2 flex min-h-9 items-start justify-between gap-x-4 text-xs text-muted-foreground max-lg:pr-10">
          <div className="flex min-w-0 flex-1 flex-col items-start gap-1 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-4">
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
                            <span
                              className={cn(
                                'max-w-full wrap-break-word text-left align-baseline font-medium text-foreground',
                                !status.backedUp &&
                                  !status.restoringAccount &&
                                  'sm:hidden',
                              )}
                            >
                              {content}
                            </span>
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
              onOpenChange={setAccountOpen}
              imported={storage.imported}
              projectReturn={project ? projectTarget : undefined}
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
              onBackup={actions.backupSeed}
            />
          </div>

          <div className="flex items-center gap-4">
            <SaveShare
              key={storage.seed}
              document={storage.snapshot}
              revision={storage.snapshot?.revision ?? 0}
              disabled={status.controlsBusy}
              onPublish={actions.publishSharing}
            />
          </div>
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
