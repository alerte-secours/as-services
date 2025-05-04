alter table "public"."archived_alert" add column "acknowledged_around_count" integer
 not null default '0';
