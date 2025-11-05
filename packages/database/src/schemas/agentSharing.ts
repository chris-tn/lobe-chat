/* eslint-disable sort-keys-fix/sort-keys-fix  */
import { boolean, jsonb, pgTable, primaryKey, text } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';

import { timestamps } from './_helpers';
import { agents } from './agent';
import { chatGroups } from './chatGroup';
import { users } from './user';

export interface SharePermissions {
  canEdit?: boolean;
  canUse?: boolean;
  canView?: boolean;
}

/**
 * Agent sharing table for admin-controlled assistant sharing
 * Allows admins to share agents with specific users or globally (all users)
 */
export const agentShares = pgTable(
  'agent_shares',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => `share_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`)
      .notNull(),

    agentId: text('agent_id')
      .references(() => agents.id, { onDelete: 'cascade' })
      .notNull(),

    // User who shared the agent (admin)
    sharedByUserId: text('shared_by_user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),

    // User with whom the agent is shared (null = all users)
    sharedWithUserId: text('shared_with_user_id').references(() => users.id, {
      onDelete: 'cascade',
    }),

    // If true, shared with all users (sharedWithUserId should be null)
    isGlobal: boolean('is_global').default(false).notNull(),

    // Permissions: view, use, edit (default: view and use only)
    permissions: jsonb('permissions')
      .$type<SharePermissions>()
      .default({ canEdit: false, canUse: true, canView: true }),

    ...timestamps,
  },
  (t) => ({
    pk: primaryKey({ columns: [t.id] }),
  }),
);

export const insertAgentShareSchema = createInsertSchema(agentShares);

export type NewAgentShare = typeof agentShares.$inferInsert;
export type AgentShareItem = typeof agentShares.$inferSelect;

/**
 * Chat group sharing table for admin-controlled team assistant sharing
 * Same structure as agent shares but for chat groups
 */
export const chatGroupShares = pgTable(
  'chat_group_shares',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => `share_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`)
      .notNull(),

    chatGroupId: text('chat_group_id')
      .references(() => chatGroups.id, { onDelete: 'cascade' })
      .notNull(),

    // User who shared the chat group (admin)
    sharedByUserId: text('shared_by_user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),

    // User with whom the chat group is shared (null = all users)
    sharedWithUserId: text('shared_with_user_id').references(() => users.id, {
      onDelete: 'cascade',
    }),

    // If true, shared with all users (sharedWithUserId should be null)
    isGlobal: boolean('is_global').default(false).notNull(),

    // Permissions: view, use, edit (default: view and use only)
    permissions: jsonb('permissions')
      .$type<SharePermissions>()
      .default({ canEdit: false, canUse: true, canView: true }),

    ...timestamps,
  },
  (t) => ({
    pk: primaryKey({ columns: [t.id] }),
  }),
);

export const insertChatGroupShareSchema = createInsertSchema(chatGroupShares);

export type NewChatGroupShare = typeof chatGroupShares.$inferInsert;
export type ChatGroupShareItem = typeof chatGroupShares.$inferSelect;
