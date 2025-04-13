alter table "public"."alert" add column "acknowledged_around" integer
 not null default '0';
