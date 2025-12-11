import { db, knownTracks } from '@avine/core';
import { sql } from 'drizzle-orm';

async function check() {
  const count = await db.select({ count: sql<number>`count(*)` }).from(knownTracks);
  console.log('Known Tracks Count:', count[0].count);
  
  const sample = await db.select().from(knownTracks).limit(1);
  if (sample.length > 0) {
    console.log('Sample fingerprint length:', sample[0].fingerprint.length);
    console.log('Sample embedding:', sample[0].embedding);
  }
}

check().then(() => process.exit(0)).catch(e => console.error(e));
