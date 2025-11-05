CREATE TABLE "position" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"instrument" text NOT NULL,
	"side" varchar NOT NULL,
	"volume" numeric(14, 2) NOT NULL,
	"open_price" numeric(14, 5) NOT NULL,
	"close_price" numeric(14, 5),
	"sl" numeric(14, 5),
	"tk" numeric(14, 5),
	"status" varchar DEFAULT 'open',
	"opened_at" timestamp DEFAULT now() NOT NULL,
	"closed_at" timestamp,
	"pnl" numeric(14, 2)
);
--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN "side" varchar NOT NULL;--> statement-breakpoint
ALTER TABLE "position" ADD CONSTRAINT "position_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "position_user_id_idx" ON "position" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "position_instrument_idx" ON "position" USING btree ("instrument");--> statement-breakpoint
CREATE INDEX "position_user_side_idx" ON "position" USING btree ("user_id","side");--> statement-breakpoint
ALTER TABLE "order" DROP COLUMN "type";