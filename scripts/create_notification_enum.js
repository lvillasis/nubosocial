// scripts/create_notification_enum.js
const { Client } = require('pg');
require('dotenv').config();

const SQL = `
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NotificationType') THEN
    CREATE TYPE "NotificationType" AS ENUM ('LIKE','COMMENT','FOLLOW','MENTION','REPLY');
  END IF;
END$$;

-- Cambiar columna "type" a ese enum (si existe como text)
ALTER TABLE IF EXISTS "notifications"
  ALTER COLUMN "type" TYPE "NotificationType" USING ("type"::text::"NotificationType");
`;

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await c.connect();
    console.log('Creating enum and altering column (if needed)...');
    await c.query(SQL);
    console.log('Done.');
  } catch (err) {
    console.error('Error:', err.message || err);
    process.exit(1);
  } finally {
    await c.end();
  }
})();
