DROP INDEX "conversation_sessions_user_id_idx";--> statement-breakpoint
ALTER TABLE "conversation_sessions" ADD CONSTRAINT "conversation_sessions_user_id_unique" UNIQUE("user_id");