import { siteName, siteTitle, siteUrl } from '@/app/_lib/site-metadata';

export const GET = (request: Request) => {
  const params = new URL(request.url).searchParams;

  if (params.has('format') && params.get('format') !== 'json') {
    return Response.json({ error: 'Only JSON is supported.' }, { status: 501 });
  }

  try {
    const target = new URL(params.get('url') ?? '');

    if (
      target.origin !== siteUrl.origin ||
      target.pathname !== '/' ||
      target.username ||
      target.password
    ) {
      return Response.json(
        { error: 'No preview is available for this URL.' },
        { status: 404 },
      );
    }
  } catch {
    return Response.json(
      { error: 'A valid homepage URL is required.' },
      { status: 400 },
    );
  }

  return Response.json(
    {
      version: '1.0',
      type: 'link',
      title: siteTitle,
      provider_name: siteName,
      provider_url: siteUrl.href,
      cache_age: 3600,
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=300, s-maxage=3600',
        'X-Content-Type-Options': 'nosniff',
      },
    },
  );
};
