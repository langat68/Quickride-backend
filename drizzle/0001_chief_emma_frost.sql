CREATE TYPE "public"."user_role" AS ENUM('customer', 'admin', 'manager');--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "name" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_hash" text NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" "user_role" DEFAULT 'customer' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "password";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "updated_at";