import { connection } from 'next/server';

export const GET = async () => {
  await connection();

  return Response.json(
    { status: 'online' },
    {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'X-Tierlist-Connection': 'online',
      },
    },
  );
};
