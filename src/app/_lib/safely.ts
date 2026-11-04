type SafelyInput<T, Failure> = {
  operation: () => T | Promise<T>;
  onError: (error: unknown) => Failure;
};

export const safely = async <T, Failure>({
  operation,
  onError,
}: SafelyInput<T, Failure>): Promise<{ ok: true; value: T } | Failure> => {
  try {
    return { ok: true, value: await operation() };
  } catch (error) {
    return onError(error);
  }
};
