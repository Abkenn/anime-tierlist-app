export const isError = (value: unknown): value is Error =>
  typeof Error.isError === 'function'
    ? Error.isError(value)
    : value instanceof Error;
