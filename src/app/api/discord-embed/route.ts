import { discordEmbedJson } from '@/app/_lib/discord-embed';

export const GET = () =>
  new Response(discordEmbedJson, {
    headers: {
      'Content-Type':
        'application/vnd.discord.component-embed+json; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=3600',
      'X-Content-Type-Options': 'nosniff',
    },
  });
