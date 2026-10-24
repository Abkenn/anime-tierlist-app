import 'server-only';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { findGoogleAccount } from '@/app/_data/queries/google-account';
import { openAuthValue } from '@/app/_lib/auth-envelope';

export const googleAccountCookie = 'tierlist-google-account';
const accountSchema = z.object({ subject: z.string(), expiresAt: z.number() });

export const getGoogleIdentity = async () => {
  const encrypted = (await cookies()).get(googleAccountCookie)?.value;
  if (!encrypted) {
    return null;
  }

  let account: z.infer<typeof accountSchema>;
  try {
    account = accountSchema.parse(
      JSON.parse(
        openAuthValue(
          encrypted,
          googleAccountCookie,
          process.env.AUTH_SECRET ?? '',
        ),
      ),
    );
  } catch {
    return null;
  }

  return account.expiresAt > Date.now()
    ? findGoogleAccount(account.subject)
    : null;
};
