CREATE TABLE "bookings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"car_id" integer NOT NULL,
	"pickup_date" timestamp NOT NULL,
	"return_date" timestamp NOT NULL,
	"pickup_location" varchar(100) NOT NULL,
	"total_amount" numeric(10, 2) NOT NULL,
	"status" varchar(20) DEFAULT 'pending',
	"booking_reference" varchar(50) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "bookings_booking_reference_unique" UNIQUE("booking_reference")
);
--> statement-breakpoint
CREATE TABLE "cars" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"category" varchar(50) NOT NULL,
	"price_per_day" numeric(8, 2) NOT NULL,
	"seats" integer NOT NULL,
	"fuel_type" varchar(20) NOT NULL,
	"transmission" varchar(20) NOT NULL,
	"description" text,
	"image_url" varchar(500) NOT NULL,
	"location" varchar(100) NOT NULL,
	"is_available" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"booking_id" integer NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"payment_method" varchar(50) NOT NULL,
	"payment_status" varchar(20) DEFAULT 'pending',
	"transaction_id" varchar(100),
	"payment_date" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_car_id_cars_id_fk" FOREIGN KEY ("car_id") REFERENCES "public"."cars"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;