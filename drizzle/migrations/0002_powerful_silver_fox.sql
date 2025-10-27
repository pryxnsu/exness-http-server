CREATE TABLE "favorite_instrument" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"user_id" text NOT NULL
);
--> statement-breakpoint
DROP TABLE "favorite_instruments" CASCADE;--> statement-breakpoint
ALTER TABLE "favorite_instrument" ADD CONSTRAINT "favorite_instrument_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "favorite_instruments_user_id_idx" ON "favorite_instrument" USING btree ("user_id");