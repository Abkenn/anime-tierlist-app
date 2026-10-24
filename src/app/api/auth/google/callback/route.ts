import { NextResponse } from 'next/server';
import {
  finishGoogleSignIn,
  googleCallbackUrl,
} from '@/app/_services/google-auth';

export const GET = async (request: Request) => {
  const destination = new URL('/', googleCallbackUrl());

  try {
    const callback = new URL(googleCallbackUrl());
    callback.search = new URL(request.url).search;
    await finishGoogleSignIn(callback);
    destination.searchParams.set('google', 'connected');
  } catch {
    destination.searchParams.set('google', 'failed');
  }

  const response = NextResponse.redirect(destination);
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('Referrer-Policy', 'no-referrer');

  return response;
};
