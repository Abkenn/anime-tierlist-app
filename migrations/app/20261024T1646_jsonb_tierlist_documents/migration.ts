#!/usr/bin/env -S node
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';
import type { Contract as Start } from '../../snapshots/78329cc74a7e47617eaaf4001e91dd7d5b5cf206a599f722b13ba6837dc58579/contract';
import startContract from '../../snapshots/78329cc74a7e47617eaaf4001e91dd7d5b5cf206a599f722b13ba6837dc58579/contract.json' with {
  type: 'json',
};
import type { Contract as End } from '../../snapshots/ec39c1289fe74d3942f3ced1bda0f76a9dd142ec12aba578dc1a8ab5b9e1fc0c/contract';
import endContract from '../../snapshots/ec39c1289fe74d3942f3ced1bda0f76a9dd142ec12aba578dc1a8ab5b9e1fc0c/contract.json' with {
  type: 'json',
};

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.alterColumnType({
        schema: 'public',
        table: 'TierlistOwner',
        column: 'document',
        type: 'jsonb',
        using: '"document"::jsonb',
      }),
      this.createIndex({
        schema: 'public',
        table: 'TierlistOwner',
        index: 'TierlistOwner_document_idx_c5235d32',
        columns: ['document'],
        extras: { type: 'gin' },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
