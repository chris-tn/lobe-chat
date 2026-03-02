CREATE TABLE IF NOT EXISTS "knowledge_base_shares" (
	"id" text PRIMARY KEY NOT NULL,
	"knowledge_base_id" text NOT NULL,
	"shared_by_user_id" text NOT NULL,
	"shared_with_user_id" text,
	"is_global" boolean DEFAULT false NOT NULL,
	"permissions" text DEFAULT 'view_only',
	"accessed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "knowledge_base_shares" ADD CONSTRAINT "knowledge_base_shares_knowledge_base_id_knowledge_bases_id_fk" FOREIGN KEY ("knowledge_base_id") REFERENCES "public"."knowledge_bases"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "knowledge_base_shares" ADD CONSTRAINT "knowledge_base_shares_shared_by_user_id_users_id_fk" FOREIGN KEY ("shared_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "knowledge_base_shares" ADD CONSTRAINT "knowledge_base_shares_shared_with_user_id_users_id_fk" FOREIGN KEY ("shared_with_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

