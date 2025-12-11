import { db, tracks } from '@avine/core';
import { eq } from 'drizzle-orm';

const sessionId = '034d4271-c7e2-4700-84fa-7750ce38e8a2';

async function check() {
  const results = await db.select().from(tracks).where(eq(tracks.sessionId, sessionId));
  console.log(`Tracks for ${sessionId}: ${results.length}`);
  results.forEach(t => {
      console.log(`- ${t.title} (${t.artist}) [${t.startTime}-${t.endTime}] Conf: ${t.confidence}`);
  });
}

check().then(() => process.exit(0)).catch(e => console.error(e));
