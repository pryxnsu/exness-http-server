CREATE TABLE "order" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"instrument" text NOT NULL,
	"type" varchar NOT NULL,
	"volume" numeric(14, 2) NOT NULL,
	"order_kind" varchar DEFAULT 'market' NOT NULL,
	"requested_price" numeric(14, 2) NOT NULL,
	"executed_price" numeric(14, 2),
	"one_click" boolean DEFAULT false NOT NULL,
	"requested_at" timestamp DEFAULT now() NOT NULL,
	"executed_at" timestamp,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"position_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_user_id_idx" ON "order" USING btree ("user_id");