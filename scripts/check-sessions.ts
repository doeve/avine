import { db, sessions } from '@avine/core';
import { desc } from 'drizzle-orm';

async function check() {
  const recent = await db.select().from(sessions).orderBy(desc(sessions.createdAt)).limit(5);
  console.log('Recent Sessions:');
  recent.forEach(s => {
    console.log(`ID: ${s.id}, Status: ${s.status}, CreatedAt: ${s.createdAt}`);
  });
}

check().then(() => process.exit(0)).catch(e => console.error(e));
