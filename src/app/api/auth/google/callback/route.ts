import { auth } from '@/app/_lib/auth';
// Preserve the callback already registered in Google Cloud.
export const GET = (request: Request) => {
  const url = new URL(request.url);
  url.pathname = '/api/auth/callback/google';

  return auth.handler(new Request(url, request));
};
