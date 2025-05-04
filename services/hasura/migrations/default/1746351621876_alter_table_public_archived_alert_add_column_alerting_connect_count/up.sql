alter table "public"."archived_alert" add column "alerting_connect_count" integer
 not null default '0';
