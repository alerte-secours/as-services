INSERT INTO "public"."enum_notification_type"("value") VALUES (E'alert');
INSERT INTO "public"."enum_notification_type"("value") VALUES (E'alert_emergency_info');
INSERT INTO "public"."enum_notification_type"("value") VALUES (E'suggest_close');
INSERT INTO "public"."enum_notification_type"("value") VALUES (E'suggest_keep_open');
INSERT INTO "public"."enum_notification_type"("value") VALUES (E'relative_invitation');
INSERT INTO "public"."enum_notification_type"("value") VALUES (E'relative_allow_ask');

DELETE FROM "public"."enum_notification_type" WHERE "value" = 'alerting';
