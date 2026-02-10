CREATE TABLE "environment" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"url" text,
	"description" text,
	"type" text DEFAULT 'custom' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"project_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text NOT NULL,
	"deleted_at" timestamp with time zone,
	"deleted_by" text
);
--> statement-breakpoint
ALTER TABLE "test_run" ADD COLUMN "environment_id" text;--> statement-breakpoint
ALTER TABLE "environment" ADD CONSTRAINT "environment_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "environment_project_name_active_unique" ON "environment" USING btree ("project_id","name") WHERE "environment"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "environment_project_id_idx" ON "environment" USING btree ("project_id");--> statement-breakpoint
ALTER TABLE "test_run" ADD CONSTRAINT "test_run_environment_id_environment_id_fk" FOREIGN KEY ("environment_id") REFERENCES "public"."environment"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "test_run_environment_id_idx" ON "test_run" USING btree ("environment_id");