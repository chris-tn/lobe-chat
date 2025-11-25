/* eslint-disable sort-keys-fix/sort-keys-fix  */
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';

import { idGenerator } from '../utils/idGenerator';
import { timestamps } from './_helpers';
import { files, knowledgeBases } from './file';
import { users } from './user';

/**
 * Integration types
 */
export type IntegrationType = 'nextcloud';

/**
 * Integration status
 */
export type IntegrationStatus = 'active' | 'inactive' | 'error';

/**
 * Sync status
 */
export type SyncStatus = 'pending' | 'running' | 'completed' | 'failed';

/**
 * Nextcloud integration configuration
 */
export interface NextcloudConfig {
  folderPath: string;
  password: string;
  url: string;
  username: string; // Path to the shared folder in Nextcloud
}

/**
 * Integration table - stores integration configurations
 */
export const integrations = pgTable(
  'integrations',
  {
    id: text('id')
      .$defaultFn(() => idGenerator('integrations'))
      .primaryKey(),

    userId: text('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),

    knowledgeBaseId: text('knowledge_base_id')
      .references(() => knowledgeBases.id, { onDelete: 'cascade' })
      .notNull(),

    type: text('type').$type<IntegrationType>().notNull(),

    name: text('name').notNull(),

    description: text('description'),

    // Integration-specific configuration (e.g., Nextcloud credentials)
    config: jsonb('config').$type<NextcloudConfig>().notNull(),

    // Sync settings
    syncEnabled: boolean('sync_enabled').default(true).notNull(),
    syncInterval: integer('sync_interval').default(3600), // seconds, default 1 hour

    status: text('status').$type<IntegrationStatus>().default('active').notNull(),

    lastSyncAt: timestamp('last_sync_at', { withTimezone: true }),
    lastSyncStatus: text('last_sync_status').$type<SyncStatus>(),

    errorMessage: text('error_message'),

    ...timestamps,
  },
  (table) => ({
    userIdIdx: index('integrations_user_id_idx').on(table.userId),
    knowledgeBaseIdIdx: index('integrations_knowledge_base_id_idx').on(table.knowledgeBaseId),
    typeIdx: index('integrations_type_idx').on(table.type),
  }),
);

export const insertIntegrationsSchema = createInsertSchema(integrations);
export type NewIntegration = typeof integrations.$inferInsert;
export type IntegrationItem = typeof integrations.$inferSelect;

/**
 * Integration syncs table - tracks sync job history
 */
export const integrationSyncs = pgTable(
  'integration_syncs',
  {
    id: text('id')
      .$defaultFn(() => idGenerator('syncs'))
      .primaryKey(),

    integrationId: text('integration_id')
      .references(() => integrations.id, { onDelete: 'cascade' })
      .notNull(),

    status: text('status').$type<SyncStatus>().notNull(),

    startedAt: timestamp('started_at', { withTimezone: true }).notNull(),

    completedAt: timestamp('completed_at', { withTimezone: true }),

    duration: integer('duration'), // milliseconds

    filesAdded: integer('files_added').default(0),
    filesUpdated: integer('files_updated').default(0),
    filesDeleted: integer('files_deleted').default(0),
    filesSkipped: integer('files_skipped').default(0),

    errorMessage: text('error_message'),

    logs: jsonb('logs').$type<Array<{ level: string; message: string; timestamp: string }>>(),

    ...timestamps,
  },
  (table) => ({
    integrationIdIdx: index('integration_syncs_integration_id_idx').on(table.integrationId),
    statusIdx: index('integration_syncs_status_idx').on(table.status),
    startedAtIdx: index('integration_syncs_started_at_idx').on(table.startedAt),
  }),
);

export const insertIntegrationSyncsSchema = createInsertSchema(integrationSyncs);
export type NewIntegrationSync = typeof integrationSyncs.$inferInsert;
export type IntegrationSyncItem = typeof integrationSyncs.$inferSelect;

/**
 * Integration file mappings table - maps Nextcloud files to KB files
 * Used to track which files came from which integration and detect changes
 */
export const integrationFileMappings = pgTable(
  'integration_file_mappings',
  {
    integrationId: text('integration_id')
      .references(() => integrations.id, { onDelete: 'cascade' })
      .notNull(),

    fileId: text('file_id')
      .references(() => files.id, { onDelete: 'cascade' })
      .notNull(),

    // Nextcloud file path
    remotePath: text('remote_path').notNull(),

    // File metadata from Nextcloud
    remoteSize: integer('remote_size'),
    remoteModifiedAt: timestamp('remote_modified_at', { withTimezone: true }),
    remoteETag: text('remote_etag'),

    // When this file was first synced
    syncedAt: timestamp('synced_at', { withTimezone: true }).notNull().defaultNow(),

    // Last time this file was updated from Nextcloud
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),

    ...timestamps,
  },
  (table) => ({
    pk: primaryKey({
      columns: [table.integrationId, table.fileId],
    }),
    integrationIdIdx: index('integration_file_mappings_integration_id_idx').on(table.integrationId),
    fileIdIdx: index('integration_file_mappings_file_id_idx').on(table.fileId),
    remotePathIdx: index('integration_file_mappings_remote_path_idx').on(table.remotePath),
  }),
);

export const insertIntegrationFileMappingsSchema = createInsertSchema(integrationFileMappings);
export type NewIntegrationFileMapping = typeof integrationFileMappings.$inferInsert;
export type IntegrationFileMappingItem = typeof integrationFileMappings.$inferSelect;
