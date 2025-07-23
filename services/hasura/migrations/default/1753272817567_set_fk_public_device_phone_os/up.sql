alter table "public"."device"
  add constraint "device_phone_os_fkey"
  foreign key ("phone_os")
  references "public"."enum_phone_os"
  ("value") on update restrict on delete restrict;
