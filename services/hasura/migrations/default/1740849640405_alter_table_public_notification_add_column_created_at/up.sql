alter table "public"."notification" add column "created_at" timestamptz
 null default now();
