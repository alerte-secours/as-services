alter table "public"."archived_alert" add column "acknowledged_connect_count" integer
 not null default '0';
