CREATE TYPE "public"."employee_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."level" AS ENUM('L1', 'L2', 'L3', 'L4', 'L5', 'L6');--> statement-breakpoint
CREATE TABLE "departments" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "departments_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_code" text NOT NULL,
	"full_name" text NOT NULL,
	"email" text NOT NULL,
	"country_code" varchar(2) NOT NULL,
	"department_id" integer NOT NULL,
	"job_title" text NOT NULL,
	"level" "level" NOT NULL,
	"status" "employee_status" NOT NULL,
	"hire_date" timestamp NOT NULL,
	"salary_minor" bigint NOT NULL,
	"currency" varchar(3) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "employees_employee_code_unique" UNIQUE("employee_code"),
	CONSTRAINT "employees_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "exchange_rates" (
	"currency" varchar(3) PRIMARY KEY NOT NULL,
	"rate_to_usd" numeric(12, 6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pay_bands" (
	"level" "level" NOT NULL,
	"country_code" varchar(2) NOT NULL,
	"min_minor" bigint NOT NULL,
	"max_minor" bigint NOT NULL,
	CONSTRAINT "pay_bands_level_country_code_pk" PRIMARY KEY("level","country_code")
);
--> statement-breakpoint
CREATE TABLE "salary_changes" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"previous_amount_minor" bigint,
	"new_amount_minor" bigint NOT NULL,
	"currency" varchar(3) NOT NULL,
	"effective_date" timestamp NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_changes" ADD CONSTRAINT "salary_changes_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_employees_country_code" ON "employees" USING btree ("country_code");--> statement-breakpoint
CREATE INDEX "idx_employees_department_id" ON "employees" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "idx_employees_level" ON "employees" USING btree ("level");--> statement-breakpoint
CREATE INDEX "idx_employees_status" ON "employees" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_salary_changes_employee_effective" ON "salary_changes" USING btree ("employee_id","effective_date");