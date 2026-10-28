import { tierlistShareVersion } from '@/app/_lib/tierlist-share-id';
import { getTierlistPng } from '@/app/_services/tierlist-png-cache';

export const maxDuration = 300;

export const GET = async (
  request: Request,
  { params }: { params: Promise<{ shareId: string }> },
) => {
  try {
    const { shareId } = await params;
    const image = await getTierlistPng(shareId);
    if (!image) {
      return new Response('Tierlist not found.', { status: 404 });
    }
    if (image.status === 'generated') {
      return new Response(new Uint8Array(image.png), {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=60',
          'Content-Disposition': new URL(request.url).searchParams.has(
            'download',
          )
            ? 'attachment; filename="tierlist.png"'
            : 'inline',
        },
      });
    }
    if (image.status === 'pending') {
      return new Response('Image is being prepared.', {
        status: 503,
        headers: { 'Retry-After': '3', 'Cache-Control': 'no-store' },
      });
    }
    const url = new URL(image.url);
    url.searchParams.set('v', tierlistShareVersion(image.fingerprint));
    if (new URL(request.url).searchParams.has('download')) {
      url.searchParams.set('download', '1');
    }

    return new Response(null, {
      status: 302,
      headers: { Location: url.href, 'Cache-Control': 'no-store' },
    });
  } catch {
    return new Response('Image is temporarily unavailable.', {
      status: 503,
      headers: { 'Retry-After': '10', 'Cache-Control': 'no-store' },
    });
  }
};
