alter table "public"."relative_unregistered" add column "reconciliation_checked" boolean
 not null default 'false';
