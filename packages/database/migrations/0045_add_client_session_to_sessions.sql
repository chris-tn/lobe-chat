ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "client_session" text;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sessions_client_session_user_id_idx" ON "sessions"("client_session","user_id");


