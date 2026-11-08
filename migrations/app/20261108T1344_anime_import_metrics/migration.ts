#!/usr/bin/env -S node
import {
  col,
  Migration,
  MigrationCLI,
  primaryKey,
} from '@prisma/orm-postgres/migration';
import type { Contract as Start } from '../../snapshots/0c9de45e96f86f3536cbd992205257dd05c181ea9ac929bb77b344041f53b546/contract';
import startContract from '../../snapshots/0c9de45e96f86f3536cbd992205257dd05c181ea9ac929bb77b344041f53b546/contract.json' with {
  type: 'json',
};
import type { Contract as End } from '../../snapshots/746c37810dfa1fd1e5bb738fb6f38dcfc5c63b7baaab8ee1a21b43e8207e5ede/contract';
import endContract from '../../snapshots/746c37810dfa1fd1e5bb738fb6f38dcfc5c63b7baaab8ee1a21b43e8207e5ede/contract.json' with {
  type: 'json',
};

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'AnimeImportAttempt',
        columns: [
          col('admittedAt', 'int8', { codecRef: { codecId: 'pg/int8@1' } }),
          col('appliedAt', 'int8', { codecRef: { codecId: 'pg/int8@1' } }),
          col('endedAt', 'int8', { codecRef: { codecId: 'pg/int8@1' } }),
          col('generatedAt', 'int8', { codecRef: { codecId: 'pg/int8@1' } }),
          col('id', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('lastSeenAt', 'int8', {
            notNull: true,
            codecRef: { codecId: 'pg/int8@1' },
          }),
          col('maxQueueDepth', 'int4', {
            notNull: true,
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('outcome', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('ownerKey', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('provider', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('releasedAt', 'int8', { codecRef: { codecId: 'pg/int8@1' } }),
          col('startedAt', 'int8', {
            notNull: true,
            codecRef: { codecId: 'pg/int8@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'AnimeImportQueueSample',
        columns: [
          col('depth', 'int4', {
            notNull: true,
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('id', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('observedAt', 'int8', {
            notNull: true,
            codecRef: { codecId: 'pg/int8@1' },
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
        table: 'AnimeImportAttempt',
        index: 'AnimeImportAttempt_provider_startedAt_idx_a990f843',
        columns: ['provider', 'startedAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'AnimeImportQueueSample',
        index: 'AnimeImportQueueSample_provider_observedAt_idx_1d92b588',
        columns: ['provider', 'observedAt'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
