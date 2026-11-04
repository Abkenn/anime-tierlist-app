/* eslint-disable */
/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> =
  | T
  | {
      [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never;
    };
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
/** The format the media was released in */
export type MediaFormat =
  /** Professionally published manga with more than one chapter */
  | 'MANGA'
  /** Anime movies with a theatrical release */
  | 'MOVIE'
  /** Short anime released as a music video */
  | 'MUSIC'
  /** Written books released as a series of light novels */
  | 'NOVEL'
  /** (Original Net Animation) Anime that have been originally released online or are only available through streaming services. */
  | 'ONA'
  /** Manga with just one chapter */
  | 'ONE_SHOT'
  /** (Original Video Animation) Anime that have been released directly on DVD/Blu-ray without originally going through a theatrical release or television broadcast */
  | 'OVA'
  /** Special episodes that have been included in DVD/Blu-ray releases, picture dramas, pilots, etc */
  | 'SPECIAL'
  /** Anime broadcast on television */
  | 'TV'
  /** Anime which are under 15 minutes in length and broadcast on television */
  | 'TV_SHORT';

/** Media list watching/reading status enum. */
export type MediaListStatus =
  /** Finished watching/reading */
  | 'COMPLETED'
  /** Currently watching/reading */
  | 'CURRENT'
  /** Stopped watching/reading before completing */
  | 'DROPPED'
  /** Paused watching/reading */
  | 'PAUSED'
  /** Planning to watch/read */
  | 'PLANNING'
  /** Re-watching/reading */
  | 'REPEATING';

/** Type of relation media has to its parent. */
export type MediaRelation =
  /** An adaption of this media into a different format */
  | 'ADAPTATION'
  /** An alternative version of the same media */
  | 'ALTERNATIVE'
  /** Shares at least 1 character */
  | 'CHARACTER'
  /** Version 2 only. */
  | 'COMPILATION'
  /** Version 2 only. */
  | 'CONTAINS'
  /** Other */
  | 'OTHER'
  /** The media a side story is from */
  | 'PARENT'
  /** Released before the relation */
  | 'PREQUEL'
  /** Version 3 only. The media is set in the same universe as another media */
  | 'SAME_UNIVERSE'
  /** Released after the relation */
  | 'SEQUEL'
  /** A side story of the parent media */
  | 'SIDE_STORY'
  /** Version 2 only. The source material the media was adapted from */
  | 'SOURCE'
  /** An alternative version of the media with a different primary focus */
  | 'SPIN_OFF'
  /** A shortened and summarized version */
  | 'SUMMARY';

/** Media type enum, anime or manga. */
export type MediaType =
  /** Japanese Anime */
  | 'ANIME'
  /** Asian comic */
  | 'MANGA';

export type ImportAnimeFieldsFragment = {
  id: number;
  idMal: number | null;
  type: MediaType | null;
  format: MediaFormat | null;
  episodes: number | null;
  title: {
    romaji: string | null;
    english: string | null;
    native: string | null;
  } | null;
  coverImage: { extraLarge: string | null; large: string | null } | null;
  relations: {
    edges: Array<{
      relationType: MediaRelation | null;
      node: { id: number; type: MediaType | null } | null;
    } | null> | null;
  } | null;
};

export type AnilistCompletedListQueryVariables = Exact<{
  username: string;
  page: number;
}>;

export type AnilistCompletedListQuery = {
  Page: {
    pageInfo: { hasNextPage: boolean | null } | null;
    mediaList: Array<{
      status: MediaListStatus | null;
      score: number | null;
      progress: number | null;
      media: {
        id: number;
        idMal: number | null;
        type: MediaType | null;
        format: MediaFormat | null;
        episodes: number | null;
        title: {
          romaji: string | null;
          english: string | null;
          native: string | null;
        } | null;
        coverImage: { extraLarge: string | null; large: string | null } | null;
        relations: {
          edges: Array<{
            relationType: MediaRelation | null;
            node: { id: number; type: MediaType | null } | null;
          } | null> | null;
        } | null;
      } | null;
    } | null> | null;
  } | null;
};

export type AnilistAnimeBatchQueryVariables = Exact<{
  ids: Array<number> | number;
}>;

export type AnilistAnimeBatchQuery = {
  Page: {
    media: Array<{
      id: number;
      idMal: number | null;
      type: MediaType | null;
      format: MediaFormat | null;
      episodes: number | null;
      title: {
        romaji: string | null;
        english: string | null;
        native: string | null;
      } | null;
      coverImage: { extraLarge: string | null; large: string | null } | null;
      relations: {
        edges: Array<{
          relationType: MediaRelation | null;
          node: { id: number; type: MediaType | null } | null;
        } | null> | null;
      } | null;
    } | null> | null;
  } | null;
};

export const ImportAnimeFieldsFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'ImportAnimeFields' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'Media' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'idMal' } },
          { kind: 'Field', name: { kind: 'Name', value: 'type' } },
          { kind: 'Field', name: { kind: 'Name', value: 'format' } },
          { kind: 'Field', name: { kind: 'Name', value: 'episodes' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'title' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'romaji' } },
                { kind: 'Field', name: { kind: 'Name', value: 'english' } },
                { kind: 'Field', name: { kind: 'Name', value: 'native' } },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'coverImage' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'extraLarge' } },
                { kind: 'Field', name: { kind: 'Name', value: 'large' } },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'relations' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'edges' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'relationType' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'node' },
                        selectionSet: {
                          kind: 'SelectionSet',
                          selections: [
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'id' },
                            },
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'type' },
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<ImportAnimeFieldsFragment, unknown>;
export const AnilistCompletedListDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'AnilistCompletedList' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'username' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'String' },
            },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'page' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'Int' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'Page' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'page' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'page' },
                },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'perPage' },
                value: { kind: 'IntValue', value: '50' },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'pageInfo' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'hasNextPage' },
                      },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'mediaList' },
                  arguments: [
                    {
                      kind: 'Argument',
                      name: { kind: 'Name', value: 'userName' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'username' },
                      },
                    },
                    {
                      kind: 'Argument',
                      name: { kind: 'Name', value: 'type' },
                      value: { kind: 'EnumValue', value: 'ANIME' },
                    },
                    {
                      kind: 'Argument',
                      name: { kind: 'Name', value: 'status' },
                      value: { kind: 'EnumValue', value: 'COMPLETED' },
                    },
                    {
                      kind: 'Argument',
                      name: { kind: 'Name', value: 'sort' },
                      value: { kind: 'EnumValue', value: 'MEDIA_ID' },
                    },
                  ],
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'status' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'score' },
                        arguments: [
                          {
                            kind: 'Argument',
                            name: { kind: 'Name', value: 'format' },
                            value: {
                              kind: 'EnumValue',
                              value: 'POINT_10_DECIMAL',
                            },
                          },
                        ],
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'progress' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'media' },
                        selectionSet: {
                          kind: 'SelectionSet',
                          selections: [
                            {
                              kind: 'FragmentSpread',
                              name: {
                                kind: 'Name',
                                value: 'ImportAnimeFields',
                              },
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'ImportAnimeFields' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'Media' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'idMal' } },
          { kind: 'Field', name: { kind: 'Name', value: 'type' } },
          { kind: 'Field', name: { kind: 'Name', value: 'format' } },
          { kind: 'Field', name: { kind: 'Name', value: 'episodes' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'title' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'romaji' } },
                { kind: 'Field', name: { kind: 'Name', value: 'english' } },
                { kind: 'Field', name: { kind: 'Name', value: 'native' } },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'coverImage' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'extraLarge' } },
                { kind: 'Field', name: { kind: 'Name', value: 'large' } },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'relations' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'edges' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'relationType' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'node' },
                        selectionSet: {
                          kind: 'SelectionSet',
                          selections: [
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'id' },
                            },
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'type' },
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  AnilistCompletedListQuery,
  AnilistCompletedListQueryVariables
>;
export const AnilistAnimeBatchDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'AnilistAnimeBatch' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'ids' } },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'ListType',
              type: {
                kind: 'NonNullType',
                type: {
                  kind: 'NamedType',
                  name: { kind: 'Name', value: 'Int' },
                },
              },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'Page' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'page' },
                value: { kind: 'IntValue', value: '1' },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'perPage' },
                value: { kind: 'IntValue', value: '50' },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'media' },
                  arguments: [
                    {
                      kind: 'Argument',
                      name: { kind: 'Name', value: 'id_in' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'ids' },
                      },
                    },
                    {
                      kind: 'Argument',
                      name: { kind: 'Name', value: 'type' },
                      value: { kind: 'EnumValue', value: 'ANIME' },
                    },
                  ],
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'FragmentSpread',
                        name: { kind: 'Name', value: 'ImportAnimeFields' },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'ImportAnimeFields' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'Media' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'idMal' } },
          { kind: 'Field', name: { kind: 'Name', value: 'type' } },
          { kind: 'Field', name: { kind: 'Name', value: 'format' } },
          { kind: 'Field', name: { kind: 'Name', value: 'episodes' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'title' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'romaji' } },
                { kind: 'Field', name: { kind: 'Name', value: 'english' } },
                { kind: 'Field', name: { kind: 'Name', value: 'native' } },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'coverImage' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'extraLarge' } },
                { kind: 'Field', name: { kind: 'Name', value: 'large' } },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'relations' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'edges' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'relationType' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'node' },
                        selectionSet: {
                          kind: 'SelectionSet',
                          selections: [
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'id' },
                            },
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'type' },
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  AnilistAnimeBatchQuery,
  AnilistAnimeBatchQueryVariables
>;
