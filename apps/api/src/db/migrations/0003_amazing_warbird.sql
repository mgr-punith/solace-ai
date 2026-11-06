CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"request_id" text NOT NULL,
	"title" text DEFAULT 'Conversation with Sol' NOT NULL,
	"next_sequence" integer DEFAULT 1 NOT NULL,
	"active_lease_id" uuid,
	"active_request_id" text,
	"active_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"request_id" text NOT NULL,
	"sequence" integer NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"status" text NOT NULL,
	"kind" text DEFAULT 'normal' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "message_role_check" CHECK ("messages"."role" in ('user', 'assistant')),
	CONSTRAINT "message_status_check" CHECK ("messages"."status" in ('pending', 'complete', 'failed')),
	CONSTRAINT "message_kind_check" CHECK ("messages"."kind" in ('normal', 'crisis', 'fallback')),
	CONSTRAINT "message_content_check" CHECK (char_length("messages"."content") <= 8000)
);
--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_user_request_idx" ON "conversations" USING btree ("user_id","request_id");--> statement-breakpoint
CREATE INDEX "conversation_user_created_idx" ON "conversations" USING btree ("user_id","created_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "message_turn_role_idx" ON "messages" USING btree ("conversation_id","request_id","role");--> statement-breakpoint
CREATE UNIQUE INDEX "message_conversation_sequence_idx" ON "messages" USING btree ("conversation_id","sequence");