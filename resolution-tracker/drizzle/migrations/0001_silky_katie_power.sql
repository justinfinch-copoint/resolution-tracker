CREATE TYPE "public"."goal_status" AS ENUM('active', 'completed', 'paused', 'abandoned');--> statement-breakpoint
CREATE TYPE "public"."integration_type" AS ENUM('notion', 'zapier');--> statement-breakpoint
ALTER TABLE "goals" ALTER COLUMN "status" SET DEFAULT 'active'::"public"."goal_status";--> statement-breakpoint
ALTER TABLE "goals" ALTER COLUMN "status" SET DATA TYPE "public"."goal_status" USING "status"::"public"."goal_status";--> statement-breakpoint
ALTER TABLE "integrations" ALTER COLUMN "type" SET DATA TYPE "public"."integration_type" USING "type"::"public"."integration_type";--> statement-breakpoint
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "check_ins_user_id_idx" ON "check_ins" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "check_ins_goal_id_idx" ON "check_ins" USING btree ("goal_id");--> statement-breakpoint
CREATE INDEX "goals_user_id_idx" ON "goals" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "goals_status_idx" ON "goals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "integrations_user_id_idx" ON "integrations" USING btree ("user_id");