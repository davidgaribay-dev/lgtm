CREATE TABLE "defect" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"defect_number" integer,
	"defect_key" text,
	"severity" text DEFAULT 'normal' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"defect_type" text DEFAULT 'functional' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"resolution" text,
	"assignee_id" text,
	"steps_to_reproduce" text,
	"expected_result" text,
	"actual_result" text,
	"test_result_id" text,
	"test_run_id" text,
	"test_case_id" text,
	"external_url" text,
	"project_id" text NOT NULL,
	"environment_id" text,
	"cycle_id" text,
	"workspace_cycle_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text NOT NULL,
	"deleted_at" timestamp with time zone,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "test_plan_case" (
	"id" text PRIMARY KEY NOT NULL,
	"test_plan_id" text NOT NULL,
	"test_case_id" text NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "test_run_log" (
	"id" text PRIMARY KEY NOT NULL,
	"test_run_id" text NOT NULL,
	"test_result_id" text,
	"step_name" text,
	"chunk_index" integer NOT NULL,
	"content" text NOT NULL,
	"line_offset" integer NOT NULL,
	"line_count" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "next_run_number" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "next_defect_number" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "test_case" ADD COLUMN "suite_id" text;--> statement-breakpoint
ALTER TABLE "test_result" ADD COLUMN "source" text DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "test_run" ADD COLUMN "run_number" integer;--> statement-breakpoint
ALTER TABLE "defect" ADD CONSTRAINT "defect_assignee_id_user_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "defect" ADD CONSTRAINT "defect_test_result_id_test_result_id_fk" FOREIGN KEY ("test_result_id") REFERENCES "public"."test_result"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "defect" ADD CONSTRAINT "defect_test_run_id_test_run_id_fk" FOREIGN KEY ("test_run_id") REFERENCES "public"."test_run"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "defect" ADD CONSTRAINT "defect_test_case_id_test_case_id_fk" FOREIGN KEY ("test_case_id") REFERENCES "public"."test_case"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "defect" ADD CONSTRAINT "defect_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "defect" ADD CONSTRAINT "defect_environment_id_environment_id_fk" FOREIGN KEY ("environment_id") REFERENCES "public"."environment"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "defect" ADD CONSTRAINT "defect_cycle_id_cycle_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."cycle"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "defect" ADD CONSTRAINT "defect_workspace_cycle_id_workspace_cycle_id_fk" FOREIGN KEY ("workspace_cycle_id") REFERENCES "public"."workspace_cycle"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_plan_case" ADD CONSTRAINT "test_plan_case_test_plan_id_test_plan_id_fk" FOREIGN KEY ("test_plan_id") REFERENCES "public"."test_plan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_plan_case" ADD CONSTRAINT "test_plan_case_test_case_id_test_case_id_fk" FOREIGN KEY ("test_case_id") REFERENCES "public"."test_case"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_run_log" ADD CONSTRAINT "test_run_log_test_run_id_test_run_id_fk" FOREIGN KEY ("test_run_id") REFERENCES "public"."test_run"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_run_log" ADD CONSTRAINT "test_run_log_test_result_id_test_result_id_fk" FOREIGN KEY ("test_result_id") REFERENCES "public"."test_result"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "defect_project_id_idx" ON "defect" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "defect_status_idx" ON "defect" USING btree ("status");--> statement-breakpoint
CREATE INDEX "defect_severity_idx" ON "defect" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "defect_assignee_id_idx" ON "defect" USING btree ("assignee_id");--> statement-breakpoint
CREATE INDEX "defect_test_result_id_idx" ON "defect" USING btree ("test_result_id");--> statement-breakpoint
CREATE INDEX "defect_test_run_id_idx" ON "defect" USING btree ("test_run_id");--> statement-breakpoint
CREATE INDEX "defect_test_case_id_idx" ON "defect" USING btree ("test_case_id");--> statement-breakpoint
CREATE INDEX "defect_environment_id_idx" ON "defect" USING btree ("environment_id");--> statement-breakpoint
CREATE INDEX "defect_cycle_id_idx" ON "defect" USING btree ("cycle_id");--> statement-breakpoint
CREATE INDEX "defect_workspace_cycle_id_idx" ON "defect" USING btree ("workspace_cycle_id");--> statement-breakpoint
CREATE UNIQUE INDEX "defect_project_number_unique" ON "defect" USING btree ("project_id","defect_number") WHERE "defect"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "defect_defect_key_idx" ON "defect" USING btree ("defect_key");--> statement-breakpoint
CREATE INDEX "test_plan_case_plan_id_idx" ON "test_plan_case" USING btree ("test_plan_id");--> statement-breakpoint
CREATE INDEX "test_plan_case_case_id_idx" ON "test_plan_case" USING btree ("test_case_id");--> statement-breakpoint
CREATE UNIQUE INDEX "test_plan_case_unique" ON "test_plan_case" USING btree ("test_plan_id","test_case_id");--> statement-breakpoint
CREATE INDEX "test_run_log_run_id_idx" ON "test_run_log" USING btree ("test_run_id");--> statement-breakpoint
CREATE INDEX "test_run_log_result_id_idx" ON "test_run_log" USING btree ("test_result_id");--> statement-breakpoint
CREATE UNIQUE INDEX "test_run_log_scope_chunk_idx" ON "test_run_log" USING btree ("test_run_id","test_result_id","chunk_index");--> statement-breakpoint
ALTER TABLE "test_case" ADD CONSTRAINT "test_case_suite_id_test_suite_id_fk" FOREIGN KEY ("suite_id") REFERENCES "public"."test_suite"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "test_case_suite_id_idx" ON "test_case" USING btree ("suite_id");