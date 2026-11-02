import { isError } from './is-error';

export const tierlistUpdateMessage = 'Online saving needs to reconnect.';

export const isOutdatedTierlistClient = (error: unknown) =>
  isError(error) &&
  /server action.+(?:was not found|not found)|failed to find server action|failed-to-find-server-action/iu.test(
    error.message,
  );

export const tierlistErrorMessage = (error: unknown, fallback: string) => {
  if (isOutdatedTierlistClient(error)) {
    return tierlistUpdateMessage;
  }

  if (
    !isError(error) ||
    error instanceof TypeError ||
    /fetch|network|load failed|server components render|unexpected response/iu.test(
      error.message,
    )
  ) {
    return fallback;
  }

  return error.message;
};
