ALTER TABLE "deal" ALTER COLUMN "profit" SET DATA TYPE numeric(14, 2);--> statement-breakpoint
ALTER TABLE "deal" ADD COLUMN "direction" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "deal" ADD COLUMN "reason" integer DEFAULT 2 NOT NULL;