alter table "public"."notification"
  add constraint "notification_type_fkey"
  foreign key ("type")
  references "public"."enum_notification_type"
  ("value") on update restrict on delete restrict;
