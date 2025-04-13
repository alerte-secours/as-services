CREATE TABLE "public"."archived_message" ("id" serial NOT NULL, "archived_alert_id" integer NOT NULL, "created_at" timestamptz NOT NULL, "user_id" integer, "device_id" integer, "location" geography, "content_type" text NOT NULL, "text" text NOT NULL, "audio_file_uuid" uuid, PRIMARY KEY ("id") , FOREIGN KEY ("archived_alert_id") REFERENCES "public"."archived_alert"("id") ON UPDATE cascade ON DELETE cascade, FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON UPDATE no action ON DELETE no action, FOREIGN KEY ("device_id") REFERENCES "public"."device"("id") ON UPDATE no action ON DELETE no action, FOREIGN KEY ("content_type") REFERENCES "public"."enum_content_type"("value") ON UPDATE restrict ON DELETE restrict);
