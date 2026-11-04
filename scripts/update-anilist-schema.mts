import { writeFile } from 'node:fs/promises';
import { createClient, fetchExchange } from '@urql/core';
import {
  buildClientSchema,
  getIntrospectionQuery,
  type IntrospectionQuery,
  printSchema,
} from 'graphql';
import ky from 'ky';

const client = createClient({
  url: 'https://graphql.anilist.co/',
  exchanges: [fetchExchange],
  requestPolicy: 'network-only',
  preferGetMethod: false,
  fetch: (input, init) =>
    ky(input, {
      ...init,
      signal: init?.signal ?? undefined,
      timeout: 30_000,
      retry: 0,
    }),
});

const result = await client
  .query<IntrospectionQuery>(getIntrospectionQuery(), {})
  .toPromise();
if (result.error || !result.data) {
  throw new Error(
    `Unable to refresh AniList schema: ${result.error?.message ?? 'empty response'}`,
  );
}

const schema = printSchema(buildClientSchema(result.data));
await writeFile(
  new URL('../src/app/_lib/graphql/anilist/schema.graphql', import.meta.url),
  `${schema}\n`,
);
console.log(
  'Updated the public AniList schema. Run pnpm gql:codegen to regenerate operation types.',
);
