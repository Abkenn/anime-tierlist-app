#!/usr/bin/env -S node
import {
  col,
  Migration,
  MigrationCLI,
  primaryKey,
} from '@prisma/orm-postgres/migration';
import type { Contract as End } from '../../snapshots/5bc0b4e495c64da653b42ec0d32a9c3f4a5aea1dc6fb5689571fb9083558df10/contract';
import endContract from '../../snapshots/5bc0b4e495c64da653b42ec0d32a9c3f4a5aea1dc6fb5689571fb9083558df10/contract.json' with {
  type: 'json',
};
import type { Contract as Start } from '../../snapshots/eda1d7384f147b892a213e7ed7c98991ad1c95906f8eed0db797afd54d33a153/contract';
import startContract from '../../snapshots/eda1d7384f147b892a213e7ed7c98991ad1c95906f8eed0db797afd54d33a153/contract.json' with {
  type: 'json',
};

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'TierlistShare',
        columns: [
          col('document', 'jsonb', {
            notNull: true,
            codecRef: { codecId: 'pg/jsonb@1' },
          }),
          col('fingerprint', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('id', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('ownerId', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'TierlistShare',
        constraint: 'TierlistShare_ownerId_fingerprint_key',
        columns: ['ownerId', 'fingerprint'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'TierlistShare',
        index: 'TierlistShare_ownerId_idx_e2d0c1ef',
        columns: ['ownerId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'TierlistShare',
        foreignKey: {
          name: 'TierlistShare_ownerId_fkey',
          columns: ['ownerId'],
          references: {
            schema: 'public',
            table: 'TierlistOwner',
            columns: ['id'],
          },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
