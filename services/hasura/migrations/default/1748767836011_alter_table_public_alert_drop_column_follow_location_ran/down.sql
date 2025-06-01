alter table "public"."alert" alter column "follow_location_ran" set default false;
alter table "public"."alert" alter column "follow_location_ran" drop not null;
alter table "public"."alert" add column "follow_location_ran" bool;
