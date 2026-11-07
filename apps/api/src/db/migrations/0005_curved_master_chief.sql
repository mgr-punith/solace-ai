CREATE TABLE "activity_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"request_id" text NOT NULL,
	"type" text NOT NULL,
	"pattern" text,
	"duration_seconds" integer DEFAULT 0 NOT NULL,
	"affirmation_id" text,
	"before_mood" integer,
	"after_mood" integer,
	"timezone" text NOT NULL,
	"completed_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "activity_kind_check" CHECK (("activity_logs"."type" = 'breathing' and "activity_logs"."pattern" in ('box','478','coherent') and "activity_logs"."duration_seconds" in (60,180,300) and "activity_logs"."affirmation_id" is null) or ("activity_logs"."type" = 'affirmation' and "activity_logs"."affirmation_id" is not null and "activity_logs"."pattern" is null and "activity_logs"."duration_seconds" = 0 and "activity_logs"."before_mood" is null and "activity_logs"."after_mood" is null)),
	CONSTRAINT "activity_moods_check" CHECK (("activity_logs"."before_mood" is null or "activity_logs"."before_mood" between 1 and 5) and ("activity_logs"."after_mood" is null or "activity_logs"."after_mood" between 1 and 5))
);
--> statement-breakpoint
CREATE TABLE "affirmation_favorites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"affirmation_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affirmation_favorites" ADD CONSTRAINT "affirmation_favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "activity_user_request_idx" ON "activity_logs" USING btree ("user_id","request_id");--> statement-breakpoint
CREATE INDEX "activity_user_completed_idx" ON "activity_logs" USING btree ("user_id","completed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "favorite_user_affirmation_idx" ON "affirmation_favorites" USING btree ("user_id","affirmation_id");