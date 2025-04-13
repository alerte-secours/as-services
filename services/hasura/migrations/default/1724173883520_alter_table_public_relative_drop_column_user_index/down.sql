alter table "public"."relative" add constraint "relative_phone_number_user_id_user_index_key" unique (user_id, user_index);
alter table "public"."relative" alter column "user_index" drop not null;
alter table "public"."relative" add column "user_index" int4;
