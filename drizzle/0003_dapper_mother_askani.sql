ALTER TABLE "test_case" ADD COLUMN "display_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "test_suite" ADD COLUMN "display_order" integer DEFAULT 0 NOT NULL;