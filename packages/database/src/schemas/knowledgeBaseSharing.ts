import { boolean, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';

import { knowledgeBases } from './file';
import { users } from './user';

export const knowledgeBaseShares = pgTable('knowledge_base_shares', {
  // Track last access
accessedAt: timestamp('accessed_at', { mode: 'date', withTimezone: true }),

  

createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).defaultNow().notNull(),

  
  


id: text('id')
    .$defaultFn(() => `kbshare_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`)
    .primaryKey(),

  
  


// If true, shared with all users
isGlobal: boolean('is_global').default(false).notNull(),

  
  


knowledgeBaseId: text('knowledge_base_id')
    .references(() => knowledgeBases.id, { onDelete: 'cascade' })
    .notNull(),

  
  


// Permissions (view_only for now, can extend later)
permissions: text('permissions').default('view_only'),

  
  


// User who shared the knowledge base (admin)
sharedByUserId: text('shared_by_user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),

  
// User who receives the share (null for global share)
sharedWithUserId: text('shared_with_user_id').references(() => users.id, {
    onDelete: 'cascade',
  }),
  updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true }).defaultNow().notNull(),
});

export const insertKnowledgeBaseSharesSchema = createInsertSchema(knowledgeBaseShares);

export type KnowledgeBaseShareItem = typeof knowledgeBaseShares.$inferSelect;
export type NewKnowledgeBaseShare = typeof knowledgeBaseShares.$inferInsert;
