alter table "public"."alert" add column "acknowledged_other" integer
 not null default '0';
