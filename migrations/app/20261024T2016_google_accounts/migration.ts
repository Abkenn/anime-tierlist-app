#!/usr/bin/env -S node
import {
  col,
  Migration,
  MigrationCLI,
  primaryKey,
} from '@prisma/orm-postgres/migration';
import type { Contract as Start } from '../../snapshots/ec39c1289fe74d3942f3ced1bda0f76a9dd142ec12aba578dc1a8ab5b9e1fc0c/contract';
import startContract from '../../snapshots/ec39c1289fe74d3942f3ced1bda0f76a9dd142ec12aba578dc1a8ab5b9e1fc0c/contract.json' with {
  type: 'json',
};
import type { Contract as End } from '../../snapshots/f4e6ff8d5d44081d4a192560336851f4d2cdecae2d8a658bed1144bbb977358b/contract';
import endContract from '../../snapshots/f4e6ff8d5d44081d4a192560336851f4d2cdecae2d8a658bed1144bbb977358b/contract.json' with {
  type: 'json',
};

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'TierlistGoogleAccount',
        columns: [
          col('encryptedSeed', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('ownerId', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('subject', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
        ],
        constraints: [primaryKey(['subject'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'TierlistGoogleAccount',
        constraint: 'TierlistGoogleAccount_ownerId_key',
        columns: ['ownerId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'TierlistGoogleAccount',
        foreignKey: {
          name: 'TierlistGoogleAccount_ownerId_fkey',
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
