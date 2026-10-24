#!/usr/bin/env -S node
import { col, Migration, MigrationCLI } from '@prisma/orm-postgres/migration';
import type { Contract as End } from '../../snapshots/c928ed679c2695cc6c691a1f6acd85d94c761eeb2cdde0e50b3a3392c51996c0/contract';
import endContract from '../../snapshots/c928ed679c2695cc6c691a1f6acd85d94c761eeb2cdde0e50b3a3392c51996c0/contract.json' with {
  type: 'json',
};
import type { Contract as Start } from '../../snapshots/f4e6ff8d5d44081d4a192560336851f4d2cdecae2d8a658bed1144bbb977358b/contract';
import startContract from '../../snapshots/f4e6ff8d5d44081d4a192560336851f4d2cdecae2d8a658bed1144bbb977358b/contract.json' with {
  type: 'json',
};

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'TierlistGoogleAccount',
        column: col('displayName', 'text', {
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
