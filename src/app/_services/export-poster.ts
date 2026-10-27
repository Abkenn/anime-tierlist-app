import 'server-only';
import { lookup } from 'node:dns/promises';
import { readFile } from 'node:fs/promises';
import { get } from 'node:https';
import { BlockList } from 'node:net';
import { resolve, sep } from 'node:path';
import sharp from 'sharp';

const blocked = new BlockList();
for (const [address, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
] as const) {
  blocked.addSubnet(address, prefix, 'ipv4');
}

const maxPosterBytes = 5 * 1024 * 1024;

const readPublicPoster = async (source: string) => {
  if (source.startsWith('/curated/') || source.startsWith('/tier-samples/')) {
    const root = resolve('public');
    const path = resolve(root, `.${decodeURIComponent(source)}`);
    if (!path.startsWith(`${root}${sep}`)) {
      throw new Error('Invalid local poster path.');
    }

    return readFile(path);
  }

  const url = new URL(source);
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    (url.port && url.port !== '443')
  ) {
    throw new Error('A public HTTPS poster is required.');
  }
  const { address } = await lookup(url.hostname, { family: 4 });
  if (blocked.check(address, 'ipv4')) {
    throw new Error('Private poster addresses are not allowed.');
  }

  return new Promise<Buffer>((resolveBody, reject) => {
    // Pin the validated DNS result; never follow redirects to an unvalidated host.
    const request = get(
      url,
      {
        family: 4,
        lookup: (_hostname, _options, callback) => callback(null, address, 4),
      },
      (response) => {
        if (response.statusCode !== 200) {
          response.resume();
          reject(new Error('Poster unavailable.'));
          return;
        }
        const chunks: Buffer[] = [];
        let bytes = 0;
        response.on('data', (chunk: Buffer) => {
          bytes += chunk.length;
          if (bytes > maxPosterBytes) {
            request.destroy(new Error('Poster exceeds the image limit.'));
            return;
          }
          chunks.push(chunk);
        });
        response.on('end', () => resolveBody(Buffer.concat(chunks)));
        response.on('error', reject);
      },
    );
    const deadline = setTimeout(
      () => request.destroy(new Error('Poster timed out.')),
      8000,
    );
    request.on('close', () => clearTimeout(deadline));
    request.on('error', reject);
  });
};

export const embedExportPoster = async (source: string) => {
  const input = await readPublicPoster(source);
  // Decode before embedding so external SVG references cannot reach the renderer.
  const png = await sharp(input, { limitInputPixels: 40_000_000 })
    .resize({
      width: 640,
      height: 640,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .png()
    .toBuffer();

  return `data:image/png;base64,${png.toString('base64')}`;
};
