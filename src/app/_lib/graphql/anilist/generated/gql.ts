/* eslint-disable */
import * as types from './graphql';
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
  'fragment ImportAnimeFields on Media {\n  id\n  idMal\n  type\n  format\n  episodes\n  title {\n    romaji\n    english\n    native\n  }\n  coverImage {\n    extraLarge\n    large\n  }\n  relations {\n    edges {\n      relationType\n      node {\n        id\n        type\n      }\n    }\n  }\n}\n\nquery AnilistImportList($username: String!, $page: Int!) {\n  Page(page: $page, perPage: 50) {\n    pageInfo {\n      hasNextPage\n    }\n    mediaList(\n      userName: $username\n      type: ANIME\n      status_in: [COMPLETED, CURRENT, DROPPED, REPEATING]\n      sort: MEDIA_ID\n    ) {\n      status\n      score(format: POINT_10_DECIMAL)\n      progress\n      media {\n        ...ImportAnimeFields\n      }\n    }\n  }\n}\n\nquery AnilistAnimeBatch($ids: [Int!]!) {\n  Page(page: 1, perPage: 50) {\n    media(id_in: $ids, type: ANIME) {\n      ...ImportAnimeFields\n    }\n  }\n}': typeof types.ImportAnimeFieldsFragmentDoc;
};
const documents: Documents = {
  'fragment ImportAnimeFields on Media {\n  id\n  idMal\n  type\n  format\n  episodes\n  title {\n    romaji\n    english\n    native\n  }\n  coverImage {\n    extraLarge\n    large\n  }\n  relations {\n    edges {\n      relationType\n      node {\n        id\n        type\n      }\n    }\n  }\n}\n\nquery AnilistImportList($username: String!, $page: Int!) {\n  Page(page: $page, perPage: 50) {\n    pageInfo {\n      hasNextPage\n    }\n    mediaList(\n      userName: $username\n      type: ANIME\n      status_in: [COMPLETED, CURRENT, DROPPED, REPEATING]\n      sort: MEDIA_ID\n    ) {\n      status\n      score(format: POINT_10_DECIMAL)\n      progress\n      media {\n        ...ImportAnimeFields\n      }\n    }\n  }\n}\n\nquery AnilistAnimeBatch($ids: [Int!]!) {\n  Page(page: 1, perPage: 50) {\n    media(id_in: $ids, type: ANIME) {\n      ...ImportAnimeFields\n    }\n  }\n}':
    types.ImportAnimeFieldsFragmentDoc,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = graphql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function graphql(source: string): unknown;

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: 'fragment ImportAnimeFields on Media {\n  id\n  idMal\n  type\n  format\n  episodes\n  title {\n    romaji\n    english\n    native\n  }\n  coverImage {\n    extraLarge\n    large\n  }\n  relations {\n    edges {\n      relationType\n      node {\n        id\n        type\n      }\n    }\n  }\n}\n\nquery AnilistImportList($username: String!, $page: Int!) {\n  Page(page: $page, perPage: 50) {\n    pageInfo {\n      hasNextPage\n    }\n    mediaList(\n      userName: $username\n      type: ANIME\n      status_in: [COMPLETED, CURRENT, DROPPED, REPEATING]\n      sort: MEDIA_ID\n    ) {\n      status\n      score(format: POINT_10_DECIMAL)\n      progress\n      media {\n        ...ImportAnimeFields\n      }\n    }\n  }\n}\n\nquery AnilistAnimeBatch($ids: [Int!]!) {\n  Page(page: 1, perPage: 50) {\n    media(id_in: $ids, type: ANIME) {\n      ...ImportAnimeFields\n    }\n  }\n}',
): (typeof documents)['fragment ImportAnimeFields on Media {\n  id\n  idMal\n  type\n  format\n  episodes\n  title {\n    romaji\n    english\n    native\n  }\n  coverImage {\n    extraLarge\n    large\n  }\n  relations {\n    edges {\n      relationType\n      node {\n        id\n        type\n      }\n    }\n  }\n}\n\nquery AnilistImportList($username: String!, $page: Int!) {\n  Page(page: $page, perPage: 50) {\n    pageInfo {\n      hasNextPage\n    }\n    mediaList(\n      userName: $username\n      type: ANIME\n      status_in: [COMPLETED, CURRENT, DROPPED, REPEATING]\n      sort: MEDIA_ID\n    ) {\n      status\n      score(format: POINT_10_DECIMAL)\n      progress\n      media {\n        ...ImportAnimeFields\n      }\n    }\n  }\n}\n\nquery AnilistAnimeBatch($ids: [Int!]!) {\n  Page(page: 1, perPage: 50) {\n    media(id_in: $ids, type: ANIME) {\n      ...ImportAnimeFields\n    }\n  }\n}'];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> =
  TDocumentNode extends DocumentNode<infer TType, any> ? TType : never;
