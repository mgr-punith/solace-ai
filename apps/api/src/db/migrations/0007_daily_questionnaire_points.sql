CREATE TABLE "questionnaire_completions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"day" date NOT NULL,
	"timezone" text NOT NULL,
	"version" text NOT NULL,
	"points" integer NOT NULL,
	"completed_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "questionnaire_points_check" CHECK ("questionnaire_completions"."points" = 40)
);
--> statement-breakpoint
ALTER TABLE "questionnaire_completions" ADD CONSTRAINT "questionnaire_completions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "questionnaire_user_day_idx" ON "questionnaire_completions" USING btree ("user_id","day");