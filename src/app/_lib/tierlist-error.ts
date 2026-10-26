export const tierlistUpdateMessage = 'Online saving needs to reconnect.';

export const isOutdatedTierlistClient = (error: unknown) =>
  error instanceof Error &&
  /server action.+(?:was not found|not found)|failed to find server action|failed-to-find-server-action/iu.test(
    error.message,
  );

export const tierlistErrorMessage = (error: unknown, fallback: string) => {
  if (isOutdatedTierlistClient(error)) {
    return tierlistUpdateMessage;
  }

  if (
    !(error instanceof Error) ||
    error instanceof TypeError ||
    /fetch|network|load failed|server components render|unexpected response/iu.test(
      error.message,
    )
  ) {
    return fallback;
  }

  return error.message;
};
