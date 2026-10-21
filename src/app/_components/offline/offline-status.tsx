'use client';

import { useId } from 'react';

import { Button } from '@/app/_components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/app/_components/ui/tooltip';
import { useOfflineReconnect } from '@/app/_hooks/use-offline-reconnect';

export const OfflineStatus = () => {
  const { mode, checking, reconnect } = useOfflineReconnect();
  const tooltipId = useId();
  if (mode === null) return null;
  const descriptions = {
    offline:
      'You are in offline mode. Checking the server every 30 seconds. Click to retry now.',
    dev: 'Offline preview. Automatic reconnection is disabled. Click to exit when the server is reachable.',
    'dev-temporary':
      'Temporary offline preview. Checking the server every 30 seconds. Click to retry now.',
  };
  const description = descriptions[mode];

  return (
    <TooltipProvider delay={200}>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              className="rounded-none px-2 text-xs font-normal text-muted-foreground hover:bg-transparent hover:text-foreground"
            />
          }
          aria-label="Offline mode — retry connection"
          aria-describedby={tooltipId}
          onClick={() => {
            void reconnect();
          }}
          disabled={checking}
        >
          <span role="status" aria-live="polite">
            {checking ? 'reconnecting…' : 'offline'}
          </span>
        </TooltipTrigger>
        <TooltipContent
          id={tooltipId}
          role="tooltip"
          side="bottom"
          align="end"
          className="rounded-sm border border-border bg-popover text-popover-foreground leading-relaxed"
        >
          {description}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
