import { fromPayload, toComponentEmbedJson } from 'discord-component-embed';
import { describe, expect, it } from 'vitest';
import { GET as getOembed } from '@/app/api/oembed/route';
import { discordEmbedJson } from './discord-embed';
import { homepageMetadata, siteUrl } from './site-metadata';

describe('homepage link preview', () => {
  it('ships a valid, compact Discord payload with working homepage destinations and compatible fallbacks', () => {
    const payload = JSON.parse(discordEmbedJson);

    expect(() => toComponentEmbedJson(fromPayload(payload))).not.toThrow();
    expect(
      new TextEncoder().encode(discordEmbedJson).length,
    ).toBeLessThanOrEqual(3000);
    expect(discordEmbedJson).not.toContain('\u2014');
    expect(payload.component.accent_color).toBe(0xe68e96);
    expect(payload.component.components[0].accessory).toMatchObject({
      label: 'Create a tierlist',
      url: siteUrl.href,
    });
    expect(discordEmbedJson).not.toContain('/#');
    expect(homepageMetadata.openGraph).toMatchObject({
      type: 'website',
      url: siteUrl.href,
    });
    expect(homepageMetadata.twitter).toMatchObject({ card: 'summary' });
  });
  it('returns oEmbed metadata only for supported homepage URLs and JSON format', async () => {
    const response = getOembed(
      new Request(
        `https://preview.test/api/oembed?${new URLSearchParams({ url: siteUrl.href, format: 'json' })}`,
      ),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      version: '1.0',
      type: 'link',
      provider_url: siteUrl.href,
    });
    expect(
      getOembed(new Request('https://preview.test/api/oembed')).status,
    ).toBe(400);
    expect(
      getOembed(
        new Request(
          'https://preview.test/api/oembed?url=https://unrelated.example/',
        ),
      ).status,
    ).toBe(404);
    expect(
      getOembed(new Request('https://preview.test/api/oembed?format=xml'))
        .status,
    ).toBe(501);
  });
});
