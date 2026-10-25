import 'server-only';
import { headers } from 'next/headers';
import {
  findAuthGoogleAccount,
  findGoogleAccount,
} from '@/app/_data/queries/google-account';
import { auth } from '@/app/_lib/auth';
export const getGooglePrincipal = async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return null;
  }
  const account = await findAuthGoogleAccount(session.user.id);
  return account
    ? { subject: account.accountId, displayName: session.user.name }
    : null;
};
export const getGoogleIdentity = async () => {
  const principal = await getGooglePrincipal();
  const identity = principal && (await findGoogleAccount(principal.subject));
  return identity ? { ...identity, displayName: principal.displayName } : null;
};
