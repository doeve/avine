import type { Config } from 'drizzle-kit';

export default {
  schema: './src/schema.ts',
  out: './drizzle',
  driver: 'pg',
  dbCredentials: {
    connectionString: 'postgres://avine:avine_password@localhost:5432/avine_db',
  },
} satisfies Config;
