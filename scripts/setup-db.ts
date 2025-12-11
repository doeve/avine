import { db } from '@avine/core';
import { sql } from 'drizzle-orm';

async function setupDb() {
  try {
    console.log('Checking vector extension...');
    const result = await db.execute(sql`SELECT * FROM pg_extension WHERE extname = 'vector';`);
    console.log('Extension found:', result.length > 0);

    if (result.length === 0) {
      console.log('Enabling vector extension...');
      await db.execute(sql`CREATE EXTENSION IF NOT EXISTS vector;`);
    }

    console.log('Creating known_tracks table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS known_tracks (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        title text NOT NULL,
        artist text NOT NULL,
        album text,
        duration integer NOT NULL,
        fingerprint text NOT NULL,
        embedding vector(1536),
        created_at timestamp NOT NULL DEFAULT now()
      );
    `);
    console.log('Table created.');
    process.exit(0);
  } catch (error) {
    console.error('Failed to setup DB:', error);
    process.exit(1);
  }
}

setupDb();
