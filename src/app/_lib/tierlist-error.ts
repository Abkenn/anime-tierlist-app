export const tierlistErrorMessage = (error: unknown, fallback: string) => {
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
