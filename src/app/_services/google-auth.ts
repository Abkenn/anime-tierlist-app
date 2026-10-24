import 'server-only';
import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import * as oidc from 'openid-client';
import { z } from 'zod';
import {
  createGoogleAccount,
  updateGoogleAccountName,
} from '@/app/_data/mutations/google-account';
import { findGoogleAccount } from '@/app/_data/queries/google-account';
import { findOwnerBySeedHash } from '@/app/_data/queries/tierlist';
import { openAuthValue, sealAuthValue } from '@/app/_lib/auth-envelope';
import {
  tierlistDocumentSchema,
  userSeedSchema,
} from '@/app/_lib/tierlist-sync';
import { connectSeedTierlist } from './tierlist';
import { hashTierlistSecret } from './tierlist-identity';

const flowCookie = 'tierlist-google-flow';
const accountCookie = 'tierlist-google-account';
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
} as const;
const flowSchema = z.object({
  seed: userSeedSchema,
  state: z.string(),
  nonce: z.string(),
  verifier: z.string(),
  expiresAt: z.number(),
});
const accountSchema = z.object({ subject: z.string(), expiresAt: z.number() });
const displayNameSchema = z.string().trim().min(1).max(160);

const secret = () => {
  const value = process.env.AUTH_SECRET;

  if (!value) {
    throw new Error('Google sign-in is not configured yet.');
  }

  return value;
};

export const googleCallbackUrl = () =>
  new URL(
    '/api/auth/google/callback',
    process.env.NODE_ENV === 'production'
      ? (process.env.SITE_URL ?? 'https://anime-tierlist-app.vercel.app')
      : 'http://localhost:3000',
  );

const configuration = async () => {
  const id = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!id || !clientSecret) {
    throw new Error('Google sign-in is not configured yet.');
  }

  return oidc.discovery(
    new URL('https://accounts.google.com'),
    id,
    clientSecret,
  );
};

export const startGoogleSignIn = async (input: unknown) => {
  const seed = userSeedSchema.parse(input);
  // Prove ownership before carrying a seed through OAuth. Never put it in a URL.
  await connectSeedTierlist(seed);
  const config = await configuration();
  const verifier = oidc.randomPKCECodeVerifier();
  const state = oidc.randomState();
  const nonce = oidc.randomNonce();
  const flow = {
    seed,
    verifier,
    state,
    nonce,
    expiresAt: Date.now() + 600_000,
  };
  const jar = await cookies();
  jar.set(
    flowCookie,
    sealAuthValue(JSON.stringify(flow), flowCookie, secret()),
    {
      ...cookieOptions,
      maxAge: 600,
    },
  );

  return oidc.buildAuthorizationUrl(config, {
    redirect_uri: googleCallbackUrl().href,
    scope: 'openid profile',
    prompt: 'select_account',
    state,
    nonce,
    code_challenge: await oidc.calculatePKCECodeChallenge(verifier),
    code_challenge_method: 'S256',
  }).href;
};

export const finishGoogleSignIn = async (url: URL) => {
  const jar = await cookies();
  const encrypted = jar.get(flowCookie)?.value;
  jar.delete(flowCookie);

  if (!encrypted) {
    throw new Error('Sign-in expired. Please try again.');
  }

  const flow = flowSchema.parse(
    JSON.parse(openAuthValue(encrypted, flowCookie, secret())),
  );

  if (flow.expiresAt <= Date.now()) {
    throw new Error('Sign-in expired. Please try again.');
  }

  const config = await configuration();
  const tokens = await oidc.authorizationCodeGrant(config, url, {
    expectedState: flow.state,
    expectedNonce: flow.nonce,
    pkceCodeVerifier: flow.verifier,
    idTokenExpected: true,
  });
  const subject = tokens.claims()?.sub;

  if (!subject) {
    throw new Error('Google did not confirm your account.');
  }

  const claimedName = displayNameSchema.safeParse(tokens.claims()?.name);
  let displayName = claimedName.success ? claimedName.data : null;

  if (!displayName) {
    try {
      const profile = await oidc.fetchUserInfo(
        config,
        tokens.access_token,
        subject,
      );
      const name = displayNameSchema.safeParse(profile.name);
      displayName = name.success ? name.data : null;
    } catch {
      // Optional profile metadata must not prevent a verified account signing in.
    }
  }

  const existing = await findGoogleAccount(subject);

  if (!existing) {
    const source = await connectSeedTierlist(flow.seed);
    const seed = randomBytes(32).toString('hex');
    // Fork instead of linking the device profile: signing out restores its
    // pre-login list, including when this is the first Google account used.
    const remote = await connectSeedTierlist(seed, source.document);

    await createGoogleAccount({
      subject,
      ownerId: remote.ownerId,
      encryptedSeed: sealAuthValue(seed, `google-seed:${subject}`, secret()),
      displayName,
    });
  } else if (displayName && displayName !== existing.displayName) {
    await updateGoogleAccountName({ subject, displayName });
  }

  jar.set(
    accountCookie,
    sealAuthValue(
      JSON.stringify({ subject, expiresAt: Date.now() + 30 * 86_400_000 }),
      accountCookie,
      secret(),
    ),
    { ...cookieOptions, maxAge: 30 * 86_400 },
  );
};

export const getGoogleTierlist = async () => {
  const encrypted = (await cookies()).get(accountCookie)?.value;

  if (!encrypted) {
    return null;
  }

  let account: z.infer<typeof accountSchema>;

  try {
    account = accountSchema.parse(
      JSON.parse(openAuthValue(encrypted, accountCookie, secret())),
    );
  } catch {
    return null;
  }

  if (account.expiresAt <= Date.now()) {
    return null;
  }

  const identity = await findGoogleAccount(account.subject);

  if (!identity) {
    return null;
  }

  const seed = userSeedSchema.parse(
    openAuthValue(
      identity.encryptedSeed,
      `google-seed:${account.subject}`,
      secret(),
    ),
  );
  const owner = await findOwnerBySeedHash(hashTierlistSecret(seed));

  if (owner?.id !== identity.ownerId) {
    throw new Error('Unable to open your linked tierlist.');
  }

  return {
    seed,
    displayName: identity.displayName,
    remote: {
      ownerId: owner.id,
      revision: owner.revision,
      document: tierlistDocumentSchema.parse(owner.document),
    },
  };
};

export const clearGoogleSignIn = async () => {
  const jar = await cookies();
  jar.delete(accountCookie);
  jar.delete(flowCookie);
};
