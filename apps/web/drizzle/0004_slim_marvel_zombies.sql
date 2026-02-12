ALTER TABLE "test_run" ADD COLUMN "run_key" text;--> statement-breakpoint
CREATE INDEX "test_run_run_key_idx" ON "test_run" USING btree ("run_key");