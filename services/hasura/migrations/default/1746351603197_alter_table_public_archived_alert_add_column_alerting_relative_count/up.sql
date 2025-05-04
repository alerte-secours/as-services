alter table "public"."archived_alert" add column "alerting_relative_count" integer
 not null default '0';
