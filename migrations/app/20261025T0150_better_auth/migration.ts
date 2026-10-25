#!/usr/bin/env -S node
import {
  col,
  Migration,
  MigrationCLI,
  primaryKey,
} from '@prisma/orm-postgres/migration';
import type { Contract as Start } from '../../snapshots/c928ed679c2695cc6c691a1f6acd85d94c761eeb2cdde0e50b3a3392c51996c0/contract';
import startContract from '../../snapshots/c928ed679c2695cc6c691a1f6acd85d94c761eeb2cdde0e50b3a3392c51996c0/contract.json' with {
  type: 'json',
};
import type { Contract as End } from '../../snapshots/eda1d7384f147b892a213e7ed7c98991ad1c95906f8eed0db797afd54d33a153/contract';
import endContract from '../../snapshots/eda1d7384f147b892a213e7ed7c98991ad1c95906f8eed0db797afd54d33a153/contract.json' with {
  type: 'json',
};

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'AuthAccount',
        columns: [
          col('accessToken', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('accessTokenExpiresAt', 'timestamp(3)', {
            codecRef: {
              codecId: 'pg/timestamp-string@1',
              typeParams: { precision: 3 },
            },
          }),
          col('accountId', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            codecRef: {
              codecId: 'pg/timestamp-string@1',
              typeParams: { precision: 3 },
            },
          }),
          col('id', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('idToken', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('password', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('providerId', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('refreshToken', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('refreshTokenExpiresAt', 'timestamp(3)', {
            codecRef: {
              codecId: 'pg/timestamp-string@1',
              typeParams: { precision: 3 },
            },
          }),
          col('scope', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            codecRef: {
              codecId: 'pg/timestamp-string@1',
              typeParams: { precision: 3 },
            },
          }),
          col('userId', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'AuthRateLimit',
        columns: [
          col('count', 'int4', {
            notNull: true,
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('id', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('key', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('lastRequest', 'int8', {
            notNull: true,
            codecRef: { codecId: 'pg/int8@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'AuthSession',
        columns: [
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            codecRef: {
              codecId: 'pg/timestamp-string@1',
              typeParams: { precision: 3 },
            },
          }),
          col('expiresAt', 'timestamp(3)', {
            notNull: true,
            codecRef: {
              codecId: 'pg/timestamp-string@1',
              typeParams: { precision: 3 },
            },
          }),
          col('id', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('ipAddress', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('token', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            codecRef: {
              codecId: 'pg/timestamp-string@1',
              typeParams: { precision: 3 },
            },
          }),
          col('userAgent', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('userId', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'AuthUser',
        columns: [
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            codecRef: {
              codecId: 'pg/timestamp-string@1',
              typeParams: { precision: 3 },
            },
          }),
          col('email', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('emailVerified', 'bool', {
            notNull: true,
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('id', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('image', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            codecRef: {
              codecId: 'pg/timestamp-string@1',
              typeParams: { precision: 3 },
            },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'AuthVerification',
        columns: [
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            codecRef: {
              codecId: 'pg/timestamp-string@1',
              typeParams: { precision: 3 },
            },
          }),
          col('expiresAt', 'timestamp(3)', {
            notNull: true,
            codecRef: {
              codecId: 'pg/timestamp-string@1',
              typeParams: { precision: 3 },
            },
          }),
          col('id', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('identifier', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            codecRef: {
              codecId: 'pg/timestamp-string@1',
              typeParams: { precision: 3 },
            },
          }),
          col('value', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.dropNotNull({
        schema: 'public',
        table: 'TierlistGoogleAccount',
        column: 'encryptedSeed',
      }),
      this.addUnique({
        schema: 'public',
        table: 'AuthAccount',
        constraint: 'AuthAccount_providerId_accountId_key',
        columns: ['providerId', 'accountId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'AuthRateLimit',
        constraint: 'AuthRateLimit_key_key',
        columns: ['key'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'AuthSession',
        constraint: 'AuthSession_token_key',
        columns: ['token'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'AuthUser',
        constraint: 'AuthUser_email_key',
        columns: ['email'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'AuthAccount',
        index: 'AuthAccount_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'AuthSession',
        index: 'AuthSession_expiresAt_idx_6b6b8c10',
        columns: ['expiresAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'AuthSession',
        index: 'AuthSession_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'AuthVerification',
        index: 'AuthVerification_expiresAt_idx_6b6b8c10',
        columns: ['expiresAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'AuthVerification',
        index: 'AuthVerification_identifier_idx_79a0dbb3',
        columns: ['identifier'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'AuthAccount',
        foreignKey: {
          name: 'AuthAccount_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'AuthUser', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'AuthSession',
        foreignKey: {
          name: 'AuthSession_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'AuthUser', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
