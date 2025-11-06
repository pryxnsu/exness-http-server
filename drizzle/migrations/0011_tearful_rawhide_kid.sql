CREATE TABLE "instrument" (
	"id" text PRIMARY KEY NOT NULL,
	"symbol" text NOT NULL,
	"type" varchar NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "instrument_symbol_unique" UNIQUE("symbol")
);
--> statement-breakpoint
ALTER TABLE "favorite_instrument" ADD COLUMN "instrument_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "favorite_instrument" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "favorite_instrument" ADD CONSTRAINT "favorite_instrument_instrument_id_instrument_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instrument"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorite_instrument" DROP COLUMN "symbol";--> statement-breakpoint
ALTER TABLE "favorite_instrument" DROP COLUMN "type";--> statement-breakpoint
ALTER TABLE "favorite_instrument" ADD CONSTRAINT "unique_user_instrument" UNIQUE("user_id","instrument_id");