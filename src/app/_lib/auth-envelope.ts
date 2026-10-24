import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const keyFromSecret = (secret: string) => {
  if (!/^[a-f0-9]{64}$/u.test(secret)) {
    throw new Error('AUTH_SECRET must contain 64 hexadecimal characters.');
  }

  return Buffer.from(secret, 'hex');
};

export const sealAuthValue = (
  value: string,
  purpose: string,
  secret: string,
) => {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keyFromSecret(secret), iv);
  cipher.setAAD(Buffer.from(purpose));
  const encrypted = Buffer.concat([
    cipher.update(value, 'utf8'),
    cipher.final(),
  ]);

  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString(
    'base64url',
  );
};

export const openAuthValue = (
  value: string,
  purpose: string,
  secret: string,
) => {
  const envelope = Buffer.from(value, 'base64url');
  const decipher = createDecipheriv(
    'aes-256-gcm',
    keyFromSecret(secret),
    envelope.subarray(0, 12),
  );
  decipher.setAAD(Buffer.from(purpose));
  decipher.setAuthTag(envelope.subarray(12, 28));

  return Buffer.concat([
    decipher.update(envelope.subarray(28)),
    decipher.final(),
  ]).toString('utf8');
};
