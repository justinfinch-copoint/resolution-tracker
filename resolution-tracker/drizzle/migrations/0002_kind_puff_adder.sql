CREATE TYPE "public"."active_agent" AS ENUM('coach', 'goalArchitect', 'patternAnalyst', 'motivator', 'accountabilityPartner');--> statement-breakpoint
CREATE TABLE "conversation_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"active_agent" "active_agent" DEFAULT 'coach' NOT NULL,
	"messages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"agent_transitions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "conversation_sessions" ADD CONSTRAINT "conversation_sessions_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "conversation_sessions_user_id_idx" ON "conversation_sessions" USING btree ("user_id");