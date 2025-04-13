alter table "public"."notification" add column "acknowledged" boolean
 not null default 'false';
