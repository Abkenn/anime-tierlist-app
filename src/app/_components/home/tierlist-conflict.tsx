type ConflictProps = {
  onlineItemCount: number;
  localItemCount: number;
  busy: boolean;
  error: string;
  onKeepDevice: () => Promise<unknown>;
  onAcceptOnline: () => Promise<unknown>;
};

export const TierlistConflict = ({
  onlineItemCount,
  localItemCount,
  busy,
  error,
  onKeepDevice,
  onAcceptOnline,
}: ConflictProps) => (
  <>
    <section
      aria-label="Choose tierlist version"
      className="mb-3 border border-divider p-3 text-xs"
    >
      <p>
        This device has {localItemCount} items. Latest saved online has{' '}
        {onlineItemCount} items. Keep the version you want; a local copy of
        replaced edits is retained.
      </p>

      <div className="mt-2 flex gap-5">
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            void onKeepDevice();
          }}
          className="cursor-pointer underline underline-offset-4 disabled:opacity-50"
        >
          This device
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={() => {
            void onAcceptOnline();
          }}
          className="cursor-pointer underline underline-offset-4 disabled:opacity-50"
        >
          Latest saved online
        </button>
      </div>

      {error && (
        <p role="status" className="mt-2">
          {error}
        </p>
      )}
    </section>
  </>
);
