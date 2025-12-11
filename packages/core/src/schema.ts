import { pgTable, serial, text, timestamp, integer, uuid, boolean, jsonb, customType, bigint } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  displayName: text('display_name').notNull(),
  avatarUrl: text('avatar_url'),
  tier: text('tier').default('FREE').notNull(), // FREE, PRO, UNLIMITED
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const sessions = pgTable('sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  sourceType: text('source_type').notNull(), // BROWSER_TAB, FILE_UPLOAD, URL
  sourceUrl: text('source_url'),
  status: text('status').default('PENDING').notNull(), // PENDING, PROCESSING, COMPLETED, FAILED
  duration: integer('duration').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const tracks = pgTable('tracks', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionId: uuid('session_id').references(() => sessions.id).notNull(),
  title: text('title').notNull(),
  artist: text('artist').notNull(),
  album: text('album'),
  duration: integer('duration').notNull(),
  isrc: text('isrc'),
  releaseYear: integer('release_year'),
  confidence: integer('confidence').notNull(),
  startTime: integer('start_time').notNull(),
  endTime: integer('end_time').notNull(),
});

// Define vector type manually if not available in current drizzle version
const vector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return 'vector(1536)';
  },
  toDriver(value: number[]) {
    return JSON.stringify(value);
  },
  fromDriver(value: string) {
    return JSON.parse(value);
  },
});

export const knownTracks = pgTable('known_tracks', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  artist: text('artist').notNull(),
  album: text('album'),
  duration: integer('duration').notNull(),
  fingerprint: text('fingerprint').notNull(), 
  embedding: vector('embedding'), 
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const trackSegments = pgTable('track_segments', {
  id: uuid('id').defaultRandom().primaryKey(),
  trackId: uuid('track_id').references(() => knownTracks.id).notNull(),
  startTime: integer('start_time').notNull(), // Offset in seconds
  duration: integer('duration').notNull(), // Duration of segment (e.g., 10s)
  embedding: vector('embedding'),
});

export const fingerprints = pgTable('fingerprints', {
  id: uuid('id').defaultRandom().primaryKey(),
  hash: text('hash').notNull(), 
  metadata: jsonb('metadata').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// New subfingerprint-based recognition (replaces MinHash embeddings)
// Each row is a single hash value from Chromaprint's raw fingerprint array
// with its time offset, enabling position-independent matching
export const subfingerprints = pgTable('subfingerprints', {
  id: serial('id').primaryKey(),
  hash: bigint('hash', { mode: 'number' }).notNull(),
  trackId: uuid('track_id').references(() => knownTracks.id).notNull(),
  offsetMs: integer('offset_ms').notNull(), // time offset in milliseconds
});

