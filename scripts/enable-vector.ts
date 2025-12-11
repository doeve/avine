import { db } from '@avine/core';
import { sql } from 'drizzle-orm';

async function enableVector() {
  try {
    console.log('Enabling vector extension...');
    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS vector;`);
    console.log('Vector extension enabled.');
    process.exit(0);
  } catch (error) {
    console.error('Failed to enable vector extension:', error);
    process.exit(1);
  }
}

enableVector();
