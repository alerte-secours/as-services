alter table "public"."archived_alert" add column "acknowledged_relative_count" integer
 not null default '0';
