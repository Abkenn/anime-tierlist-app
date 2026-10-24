'use server';

import {
  clearGoogleSignIn,
  GoogleAuthConfigurationError,
  getGoogleTierlist,
  startGoogleSignIn,
} from './google-auth';

export const beginGoogleSignIn = async (seed: string) => {
  try {
    return { ok: true as const, url: await startGoogleSignIn(seed) };
  } catch (error) {
    return {
      ok: false as const,
      message:
        error instanceof GoogleAuthConfigurationError
          ? error.message
          : 'Unable to start Google sign-in. Check your connection and try again.',
    };
  }
};

export const readGoogleTierlist = async () => getGoogleTierlist();

export const signOutGoogle = async () => clearGoogleSignIn();
