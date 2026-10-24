#!/usr/bin/env -S node
import {
  col,
  Migration,
  MigrationCLI,
  primaryKey,
} from '@prisma/orm-postgres/migration';
import type { Contract as End } from '../../snapshots/8e2bd4c1e2043603de8c686d27d95e7945de923e9ba19163f2adb13be0655939/contract';
import endContract from '../../snapshots/8e2bd4c1e2043603de8c686d27d95e7945de923e9ba19163f2adb13be0655939/contract.json' with {
  type: 'json',
};

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: 'public' }),
      this.createTable({
        schema: 'public',
        table: 'TierlistOwner',
        columns: [
          col('document', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('id', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('revision', 'int4', {
            notNull: true,
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('seedHash', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'TierlistRateLimit',
        columns: [
          col('attempts', 'int4', {
            notNull: true,
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('expiresAt', 'int8', {
            notNull: true,
            codecRef: { codecId: 'pg/int8@1' },
          }),
          col('id', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'TierlistSession',
        columns: [
          col('expiresAt', 'int8', {
            notNull: true,
            codecRef: { codecId: 'pg/int8@1' },
          }),
          col('ownerId', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('tokenHash', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
        ],
        constraints: [primaryKey(['tokenHash'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'TierlistOwner',
        constraint: 'TierlistOwner_seedHash_key',
        columns: ['seedHash'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'TierlistRateLimit',
        index: 'TierlistRateLimit_expiresAt_idx_6b6b8c10',
        columns: ['expiresAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'TierlistSession',
        index: 'TierlistSession_expiresAt_idx_6b6b8c10',
        columns: ['expiresAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'TierlistSession',
        index: 'TierlistSession_ownerId_idx_e2d0c1ef',
        columns: ['ownerId'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
