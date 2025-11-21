CREATE TABLE IF NOT EXISTS "integrations" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"knowledge_base_id" text NOT NULL,
	"type" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"config" jsonb NOT NULL,
	"sync_enabled" boolean DEFAULT true NOT NULL,
	"sync_interval" integer DEFAULT 3600,
	"status" text DEFAULT 'active' NOT NULL,
	"last_sync_at" timestamp with time zone,
	"last_sync_status" text,
	"error_message" text,
	"accessed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "integrations_user_id_idx" ON "integrations"("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "integrations_knowledge_base_id_idx" ON "integrations"("knowledge_base_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "integrations_type_idx" ON "integrations"("type");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "integrations" ADD CONSTRAINT "integrations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "integrations" ADD CONSTRAINT "integrations_knowledge_base_id_knowledge_bases_id_fk" FOREIGN KEY ("knowledge_base_id") REFERENCES "public"."knowledge_bases"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "integration_syncs" (
	"id" text PRIMARY KEY NOT NULL,
	"integration_id" text NOT NULL,
	"status" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"duration" integer,
	"files_added" integer DEFAULT 0,
	"files_updated" integer DEFAULT 0,
	"files_deleted" integer DEFAULT 0,
	"files_skipped" integer DEFAULT 0,
	"error_message" text,
	"logs" jsonb,
	"accessed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "integration_syncs_integration_id_idx" ON "integration_syncs"("integration_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "integration_syncs_status_idx" ON "integration_syncs"("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "integration_syncs_started_at_idx" ON "integration_syncs"("started_at");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "integration_syncs" ADD CONSTRAINT "integration_syncs_integration_id_integrations_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."integrations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "integration_file_mappings" (
	"integration_id" text NOT NULL,
	"file_id" text NOT NULL,
	"remote_path" text NOT NULL,
	"remote_size" integer,
	"remote_modified_at" timestamp with time zone,
	"remote_etag" text,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_synced_at" timestamp with time zone,
	"accessed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "integration_file_mappings_integration_id_file_id_pk" PRIMARY KEY("integration_id","file_id")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "integration_file_mappings_integration_id_idx" ON "integration_file_mappings"("integration_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "integration_file_mappings_file_id_idx" ON "integration_file_mappings"("file_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "integration_file_mappings_remote_path_idx" ON "integration_file_mappings"("remote_path");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "integration_file_mappings" ADD CONSTRAINT "integration_file_mappings_integration_id_integrations_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."integrations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "integration_file_mappings" ADD CONSTRAINT "integration_file_mappings_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

