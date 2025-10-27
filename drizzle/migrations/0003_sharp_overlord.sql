ALTER TABLE "favorite_instrument" ADD COLUMN "symbol" text;--> statement-breakpoint
ALTER TABLE "favorite_instrument" ADD COLUMN "sort_order" integer;--> statement-breakpoint
ALTER TABLE "favorite_instrument" DROP COLUMN "name";