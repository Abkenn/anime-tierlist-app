import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: 'src/app/_lib/graphql/anilist/schema.graphql',
  documents: 'src/app/_lib/graphql/anilist/operations.graphql',
  generates: {
    'src/app/_lib/graphql/anilist/generated/': {
      preset: 'client',
      presetConfig: { fragmentMasking: false, skipIndexFile: true },
      config: {
        useTypeImports: true,
        enumsAsTypes: true,
        onlyOperationTypes: true,
        strictScalars: true,
        scalars: {
          Json: 'unknown',
          FuzzyDateInt: 'number',
          CountryCode: 'string',
        },
      },
    },
  },
};
export default config;
