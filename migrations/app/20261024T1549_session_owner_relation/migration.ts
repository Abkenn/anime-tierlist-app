#!/usr/bin/env -S node
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';
import type { Contract as Start } from '../../snapshots/8e2bd4c1e2043603de8c686d27d95e7945de923e9ba19163f2adb13be0655939/contract';
import startContract from '../../snapshots/8e2bd4c1e2043603de8c686d27d95e7945de923e9ba19163f2adb13be0655939/contract.json' with {
  type: 'json',
};
import type { Contract as End } from '../../snapshots/78329cc74a7e47617eaaf4001e91dd7d5b5cf206a599f722b13ba6837dc58579/contract';
import endContract from '../../snapshots/78329cc74a7e47617eaaf4001e91dd7d5b5cf206a599f722b13ba6837dc58579/contract.json' with {
  type: 'json',
};

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addForeignKey({
        schema: 'public',
        table: 'TierlistSession',
        foreignKey: {
          name: 'TierlistSession_ownerId_fkey',
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
