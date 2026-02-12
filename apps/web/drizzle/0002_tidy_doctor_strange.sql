ALTER TABLE "test_case" ALTER COLUMN "type" SET DEFAULT 'functional';--> statement-breakpoint
ALTER TABLE "test_case" ADD COLUMN "severity" text DEFAULT 'normal' NOT NULL;--> statement-breakpoint
ALTER TABLE "test_case" ADD COLUMN "automation_status" text DEFAULT 'not_automated' NOT NULL;--> statement-breakpoint
ALTER TABLE "test_case" ADD COLUMN "behavior" text DEFAULT 'not_set' NOT NULL;--> statement-breakpoint
ALTER TABLE "test_case" ADD COLUMN "layer" text DEFAULT 'not_set' NOT NULL;--> statement-breakpoint
ALTER TABLE "test_case" ADD COLUMN "is_flaky" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "test_case" ADD COLUMN "postconditions" text;--> statement-breakpoint
ALTER TABLE "test_case" ADD COLUMN "assignee_id" text;--> statement-breakpoint
ALTER TABLE "test_case" ADD CONSTRAINT "test_case_assignee_id_user_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;