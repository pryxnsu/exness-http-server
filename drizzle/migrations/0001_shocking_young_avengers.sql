CREATE TABLE "favorite_instruments" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wallet" (
	"id" text PRIMARY KEY NOT NULL,
	"type" varchar DEFAULT 'demo' NOT NULL,
	"balance" numeric(14, 2) DEFAULT '0.00',
	"equity" numeric(14, 2) DEFAULT '0.00',
	"margin" numeric(14, 2) DEFAULT '0.00',
	"free_margin" numeric(14, 2) DEFAULT '0.00',
	"currency" text DEFAULT 'USD' NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "favorite_instruments" ADD CONSTRAINT "favorite_instruments_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet" ADD CONSTRAINT "wallet_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "favorite_instruments_user_id_idx" ON "favorite_instruments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "wallet_user_id_idx" ON "wallet" USING btree ("user_id");