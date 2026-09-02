CREATE TABLE "attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"work_order_id" uuid NOT NULL,
	"log_entry_id" uuid,
	"storage_path" text NOT NULL,
	"filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"uploaded_by" uuid NOT NULL,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"table_name" text NOT NULL,
	"record_id" uuid NOT NULL,
	"action" text NOT NULL,
	"changed_by" uuid NOT NULL,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"old_values" jsonb,
	"new_values" jsonb,
	CONSTRAINT "audit_log_action_check" CHECK ("audit_log"."action" in ('insert', 'update', 'delete'))
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name_th" text NOT NULL,
	"group_id" uuid,
	"is_special" boolean DEFAULT false NOT NULL,
	"colour" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "categories_name_th_unique" UNIQUE("name_th")
);
--> statement-breakpoint
CREATE TABLE "category_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name_th" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "category_groups_name_th_unique" UNIQUE("name_th")
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"type" text NOT NULL,
	"floor" integer,
	"display_name" text,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "locations_code_unique" UNIQUE("code"),
	CONSTRAINT "locations_type_check" CHECK ("locations"."type" in ('room', 'common', 'external'))
);
--> statement-breakpoint
CREATE TABLE "log_entry_workers" (
	"log_entry_id" uuid NOT NULL,
	"worker_id" uuid NOT NULL,
	CONSTRAINT "log_entry_workers_log_entry_id_worker_id_pk" PRIMARY KEY("log_entry_id","worker_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"display_name" text NOT NULL,
	"role" text NOT NULL,
	"worker_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_role_check" CHECK ("users"."role" in ('admin', 'office', 'worker'))
);
--> statement-breakpoint
CREATE TABLE "wo_assignments" (
	"work_order_id" uuid NOT NULL,
	"worker_id" uuid NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wo_assignments_work_order_id_worker_id_pk" PRIMARY KEY("work_order_id","worker_id")
);
--> statement-breakpoint
CREATE TABLE "wo_log_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"work_order_id" uuid NOT NULL,
	"log_date" date NOT NULL,
	"note" text,
	"status_after" text NOT NULL,
	"entered_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wo_log_entries_status_after_check" CHECK ("wo_log_entries"."status_after" in ('pending', 'done'))
);
--> statement-breakpoint
CREATE TABLE "work_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wo_no" text NOT NULL,
	"legacy_wo_no" text,
	"opened_date" date NOT NULL,
	"category_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"description" text NOT NULL,
	"status" text NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_date" date,
	"closed_by" uuid,
	"notes" text,
	CONSTRAINT "work_orders_wo_no_unique" UNIQUE("wo_no"),
	CONSTRAINT "work_orders_status_check" CHECK ("work_orders"."status" in ('pending', 'done', 'cancelled'))
);
--> statement-breakpoint
CREATE TABLE "workers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"full_name" text,
	"type" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "workers_type_check" CHECK ("workers"."type" in ('staff', 'contractor', 'other'))
);
--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_work_order_id_work_orders_id_fk" FOREIGN KEY ("work_order_id") REFERENCES "public"."work_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_log_entry_id_wo_log_entries_id_fk" FOREIGN KEY ("log_entry_id") REFERENCES "public"."wo_log_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_group_id_category_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."category_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "log_entry_workers" ADD CONSTRAINT "log_entry_workers_log_entry_id_wo_log_entries_id_fk" FOREIGN KEY ("log_entry_id") REFERENCES "public"."wo_log_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "log_entry_workers" ADD CONSTRAINT "log_entry_workers_worker_id_workers_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."workers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_worker_id_workers_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."workers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wo_assignments" ADD CONSTRAINT "wo_assignments_work_order_id_work_orders_id_fk" FOREIGN KEY ("work_order_id") REFERENCES "public"."work_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wo_assignments" ADD CONSTRAINT "wo_assignments_worker_id_workers_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."workers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wo_log_entries" ADD CONSTRAINT "wo_log_entries_work_order_id_work_orders_id_fk" FOREIGN KEY ("work_order_id") REFERENCES "public"."work_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wo_log_entries" ADD CONSTRAINT "wo_log_entries_entered_by_users_id_fk" FOREIGN KEY ("entered_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_closed_by_users_id_fk" FOREIGN KEY ("closed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_audit_log_record" ON "audit_log" USING btree ("table_name","record_id");--> statement-breakpoint
CREATE INDEX "idx_wo_log_entries_wo_date" ON "wo_log_entries" USING btree ("work_order_id","log_date");--> statement-breakpoint
CREATE INDEX "idx_wo_log_entries_log_date" ON "wo_log_entries" USING btree ("log_date");--> statement-breakpoint
CREATE INDEX "idx_work_orders_status" ON "work_orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_work_orders_location_opened" ON "work_orders" USING btree ("location_id","opened_date");--> statement-breakpoint
CREATE INDEX "idx_work_orders_category" ON "work_orders" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "idx_work_orders_opened_date" ON "work_orders" USING btree ("opened_date");--> statement-breakpoint
CREATE INDEX "idx_work_orders_legacy_wo_no" ON "work_orders" USING btree ("legacy_wo_no");