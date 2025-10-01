// scripts/create_notifications_table.js
const { Client } = require('pg');
require('dotenv').config();

const SQL = `
CREATE TABLE IF NOT EXISTS "notifications" (
  "id" text NOT NULL PRIMARY KEY,
  "userId" text NOT NULL,
  "actorId" text NOT NULL,
  "type" text NOT NULL,
  "postId" text,
  "commentId" text,
  "data" jsonb,
  "read" boolean NOT NULL DEFAULT false,
  "createdAt" timestamp(3) without time zone NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notifications_userid_fkey') THEN
    ALTER TABLE "notifications" ADD CONSTRAINT notifications_userid_fkey FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notifications_actorid_fkey') THEN
    ALTER TABLE "notifications" ADD CONSTRAINT notifications_actorid_fkey FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END$$;

CREATE INDEX IF NOT EXISTS "notifications_userid_read_createdat_idx" ON "notifications" ("userId", "read", "createdAt");
`;
(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    console.log('Connected, creating notifications table...');
    await client.query(SQL);
    console.log('Table created (or already existed).');
  } catch (err) {
    console.error('Error creating table:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
