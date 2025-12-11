import { db, knownTracks } from '@avine/core';
import { sql } from 'drizzle-orm';

async function check() {
  const count = await db.select({ count: sql<number>`count(*)` }).from(knownTracks);
  console.log('Known Tracks Count:', count[0].count);
}

check().then(() => process.exit(0)).catch(e => console.error(e));
