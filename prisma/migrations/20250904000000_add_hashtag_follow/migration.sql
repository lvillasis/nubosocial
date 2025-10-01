-- migration: add_hashtag_follow
CREATE TABLE IF NOT EXISTS "HashtagFollow" (
  "id" text NOT NULL PRIMARY KEY,
  "userId" text NOT NULL,
  "tag" text NOT NULL,
  "createdAt" timestamp(3) without time zone NOT NULL DEFAULT now(),
  CONSTRAINT "HashtagFollow_user_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "HashtagFollow_user_tag_unique" ON "HashtagFollow" ("userId", "tag");
CREATE INDEX IF NOT EXISTS "HashtagFollow_tag_idx" ON "HashtagFollow" ("tag");
