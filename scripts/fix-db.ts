import { db } from '@avine/core';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('Creating track_segments table...');
  
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS track_segments (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      track_id uuid NOT NULL REFERENCES known_tracks(id) ON DELETE CASCADE,
      start_time integer NOT NULL,
      duration integer NOT NULL,
      embedding vector(1536),
      created_at timestamp DEFAULT now() NOT NULL
    );
  `);

  console.log('Table created successfully.');
  
  // Verify
  const result = await db.execute(sql`SELECT count(*) FROM track_segments`);
  console.log('Current rows:', result[0].count);
}

main().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});
