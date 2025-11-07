CREATE TABLE "deal" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"position_id" text NOT NULL,
	"type" integer NOT NULL,
	"price" numeric(14, 5) NOT NULL,
	"time" timestamp NOT NULL,
	"volume" numeric(14, 5) NOT NULL,
	"volume_closed" numeric(14, 5) DEFAULT 0,
	"instrument" text NOT NULL,
	"profit" numeric(14, 5) NOT NULL,
	"sl" numeric(14, 5),
	"tp" numeric(14, 5),
	"commission" numeric(14, 5) DEFAULT 0,
	"fee" numeric(14, 5) DEFAULT 0,
	"swap" numeric(14, 5) DEFAULT 0
);
--> statement-breakpoint
CREATE INDEX "deal_order_id_idx" ON "deal" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "deal_position_id_idx" ON "deal" USING btree ("position_id");