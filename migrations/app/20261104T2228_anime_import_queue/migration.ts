#!/usr/bin/env -S node
import {
  col,
  Migration,
  MigrationCLI,
  primaryKey,
} from '@prisma/orm-postgres/migration';
import type { Contract as End } from '../../snapshots/0c9de45e96f86f3536cbd992205257dd05c181ea9ac929bb77b344041f53b546/contract';
import endContract from '../../snapshots/0c9de45e96f86f3536cbd992205257dd05c181ea9ac929bb77b344041f53b546/contract.json' with {
  type: 'json',
};
import type { Contract as Start } from '../../snapshots/0929f5da40c39f06c189aa3d3d83155c4281cd24cef8ddcf9631fb8f4e1fff18/contract';
import startContract from '../../snapshots/0929f5da40c39f06c189aa3d3d83155c4281cd24cef8ddcf9631fb8f4e1fff18/contract.json' with {
  type: 'json',
};

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'AnimeImportQueue',
        columns: [
          col('createdAt', 'int8', {
            notNull: true,
            codecRef: { codecId: 'pg/int8@1' },
          }),
          col('expiresAt', 'int8', {
            notNull: true,
            codecRef: { codecId: 'pg/int8@1' },
          }),
          col('id', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('ownerKey', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('provider', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createIndex({
        schema: 'public',
        table: 'AnimeImportQueue',
        index: 'AnimeImportQueue_expiresAt_idx_6b6b8c10',
        columns: ['expiresAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'AnimeImportQueue',
        index: 'AnimeImportQueue_provider_createdAt_idx_fd3b9fd1',
        columns: ['provider', 'createdAt'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
