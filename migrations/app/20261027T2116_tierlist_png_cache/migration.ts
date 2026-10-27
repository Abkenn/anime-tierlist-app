#!/usr/bin/env -S node
import {
  col,
  Migration,
  MigrationCLI,
  primaryKey,
} from '@prisma/orm-postgres/migration';
import type { Contract as Start } from '../../snapshots/5bc0b4e495c64da653b42ec0d32a9c3f4a5aea1dc6fb5689571fb9083558df10/contract';
import startContract from '../../snapshots/5bc0b4e495c64da653b42ec0d32a9c3f4a5aea1dc6fb5689571fb9083558df10/contract.json' with {
  type: 'json',
};
import type { Contract as End } from '../../snapshots/0929f5da40c39f06c189aa3d3d83155c4281cd24cef8ddcf9631fb8f4e1fff18/contract';
import endContract from '../../snapshots/0929f5da40c39f06c189aa3d3d83155c4281cd24cef8ddcf9631fb8f4e1fff18/contract.json' with {
  type: 'json',
};

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'TierlistPng',
        columns: [
          col('fingerprint', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('lastUsedAt', 'int8', {
            notNull: true,
            codecRef: { codecId: 'pg/int8@1' },
          }),
          col('leaseToken', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('leaseUntil', 'int8', { codecRef: { codecId: 'pg/int8@1' } }),
          col('shareId', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('url', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['shareId'])],
      }),
      this.createIndex({
        schema: 'public',
        table: 'TierlistPng',
        index: 'TierlistPng_lastUsedAt_idx_fee97fdf',
        columns: ['lastUsedAt'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'TierlistPng',
        foreignKey: {
          name: 'TierlistPng_shareId_fkey',
          columns: ['shareId'],
          references: {
            schema: 'public',
            table: 'TierlistShare',
            columns: ['id'],
          },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
