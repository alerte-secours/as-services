CREATE OR REPLACE FUNCTION public.computed_alert__avatar_image_file_uuid(alert_row alert)
 RETURNS uuid
 LANGUAGE sql
 STABLE
AS $function$
  SELECT "image_file_uuid" FROM "user_avatar" WHERE "user_id" = alert_row.user_id
$function$;
