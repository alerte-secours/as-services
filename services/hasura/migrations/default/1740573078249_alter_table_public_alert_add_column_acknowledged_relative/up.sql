alter table "public"."alert" add column "acknowledged_relative" integer
 not null default '0';
