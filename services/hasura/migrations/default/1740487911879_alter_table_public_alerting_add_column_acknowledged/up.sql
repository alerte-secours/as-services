alter table "public"."alerting" add column "acknowledged" boolean
 not null default 'false';
