import { sql } from 'drizzle-orm';
import type { ReminderSettings } from '@solace/shared';
import {
  check,
  date,
  index,
  integer,
  jsonb,
  uniqueIndex,
  pgTable,
  text,
  timestamp,
  uuid,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  googleSub: text('google_sub').notNull().unique(),
  email: text('email').notNull(),
  name: text('name').notNull(),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const reminderPreferences = pgTable('reminder_preferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  settings: jsonb('settings').$type<ReminderSettings>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const authSessions = pgTable(
  'auth_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('auth_sessions_user_idx').on(table.userId)],
);

export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => authSessions.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    replacedBy: uuid('replaced_by').references((): AnyPgColumn => refreshTokens.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('refresh_tokens_session_idx').on(table.sessionId),
    index('refresh_tokens_user_idx').on(table.userId),
  ],
);

export const profiles = pgTable('profiles', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  timezone: text('timezone').notNull().default('UTC'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
export const moodCheckins = pgTable(
  'mood_checkins',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    requestId: text('request_id').notNull(),
    mood: integer('mood').notNull(),
    tags: text('tags').array().notNull(),
    note: text('note').notNull(),
    timezone: text('timezone').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('mood_user_request_idx').on(table.userId, table.requestId),
    index('mood_user_created_idx').on(table.userId, table.createdAt, table.id),
    check('mood_score_check', sql`${table.mood} between 1 and 5`),
    check('mood_note_length_check', sql`char_length(${table.note}) <= 500`),
  ],
);

export const conversations = pgTable(
  'conversations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    requestId: text('request_id').notNull(),
    title: text('title').notNull().default('Conversation with Sol'),
    nextSequence: integer('next_sequence').notNull().default(1),
    activeLeaseId: uuid('active_lease_id'),
    activeRequestId: text('active_request_id'),
    activeUntil: timestamp('active_until', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('conversation_user_request_idx').on(t.userId, t.requestId),
    index('conversation_user_created_idx').on(t.userId, t.createdAt, t.id),
  ],
);

export const messages = pgTable(
  'messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    requestId: text('request_id').notNull(),
    sequence: integer('sequence').notNull(),
    role: text('role').notNull(),
    content: text('content').notNull(),
    status: text('status').notNull(),
    kind: text('kind').notNull().default('normal'),
    activity: text('activity'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('message_turn_role_idx').on(t.conversationId, t.requestId, t.role),
    uniqueIndex('message_conversation_sequence_idx').on(t.conversationId, t.sequence),
    check('message_role_check', sql`${t.role} in ('user', 'assistant')`),
    check('message_status_check', sql`${t.status} in ('pending', 'complete', 'failed')`),
    check('message_kind_check', sql`${t.kind} in ('normal', 'crisis', 'fallback')`),
    check('message_content_check', sql`char_length(${t.content}) <= 8000`),
    check(
      'message_activity_check',
      sql`${t.activity} is null or (${t.role} = 'assistant' and ${t.status} = 'complete' and ${t.kind} = 'normal' and ${t.activity} in ('breathing', 'affirmation'))`,
    ),
  ],
);

export const activityLogs = pgTable(
  'activity_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    requestId: text('request_id').notNull(),
    type: text('type').notNull(),
    pattern: text('pattern'),
    durationSeconds: integer('duration_seconds').notNull().default(0),
    affirmationId: text('affirmation_id'),
    beforeMood: integer('before_mood'),
    afterMood: integer('after_mood'),
    timezone: text('timezone').notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('activity_user_request_idx').on(t.userId, t.requestId),
    index('activity_user_completed_idx').on(t.userId, t.completedAt),
    check(
      'activity_kind_check',
      sql`(${t.type} = 'breathing' and ${t.pattern} in ('box','478','coherent') and ${t.durationSeconds} in (60,180,300) and ${t.affirmationId} is null) or (${t.type} = 'affirmation' and ${t.affirmationId} is not null and ${t.pattern} is null and ${t.durationSeconds} = 0 and ${t.beforeMood} is null and ${t.afterMood} is null)`,
    ),
    check(
      'activity_moods_check',
      sql`(${t.beforeMood} is null or ${t.beforeMood} between 1 and 5) and (${t.afterMood} is null or ${t.afterMood} between 1 and 5)`,
    ),
  ],
);
export const affirmationFavorites = pgTable(
  'affirmation_favorites',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    affirmationId: text('affirmation_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('favorite_user_affirmation_idx').on(t.userId, t.affirmationId)],
);

// Participation ledger only. Questionnaire answers are never persisted.
export const questionnaireCompletions = pgTable(
  'questionnaire_completions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    day: date('day', { mode: 'string' }).notNull(),
    timezone: text('timezone').notNull(),
    version: text('version').notNull(),
    points: integer('points').notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('questionnaire_user_day_idx').on(table.userId, table.day),
    check('questionnaire_points_check', sql`${table.points} = 40`),
  ],
);
