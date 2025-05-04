CREATE OR REPLACE FUNCTION public.archive_alert(p_id integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_archived_alert_id INTEGER;
BEGIN
    -- Insert the selected alert into the archived_alert table
    INSERT INTO archived_alert (
      "alert_id",
      "user_id",
      "phone_number_id",
      "device_id",
      "location",
      "alert_tag",
      "created_at",
      "call_emergency",
      "notify_around",
      "notify_relatives",
      "level",
      "subject",
      "accuracy",
      "altitude",
      "altitude_accuracy",
      "heading",
      "speed",
      "radius",
      "address",
      "what3words",
      "nearest_place",
      "uuid",
      "code",
      "notified_count",
      "closed_at",
      "keep_open_at",
      "updated_at",
      "suggest_close_sent",
      "suggest_keep_open_sent",
      "closed_by",
      "alerting_relative_count",
      "alerting_around_count",
      "alerting_connect_count",
      "acknowledged_relative_count",
      "acknowledged_around_count",
      "acknowledged_connect_count",
      "emergency_calling_notification_sent"

    )
    SELECT 
      "id", 
      "user_id",
      "phone_number_id",
      "device_id",
      "location",
      "alert_tag",
      "created_at",
      "call_emergency",
      "notify_around",
      "notify_relatives",
      "level",
      "subject",
      "accuracy",
      "altitude",
      "altitude_accuracy",
      "heading",
      "speed",
      "radius",
      "address",
      "what3words",
      "nearest_place",
      "uuid",
      "code",
      "notified_count",
      "closed_at",
      "keep_open_at",
      "updated_at",
      "suggest_close_sent",
      "suggest_keep_open_sent",
      "closed_by",
      "alerting_relative_count",
      "alerting_around_count",
      "alerting_connect_count",
      "acknowledged_relative_count",
      "acknowledged_around_count",
      "acknowledged_connect_count",
      "emergency_calling_notification_sent"
    FROM "alert"
    WHERE "id" = p_id
    RETURNING "id" INTO v_archived_alert_id;

    -- Insert related alerted records into the archived_alerted table
    INSERT INTO
        "alerted" (
            "archived_alert_id",
            "user_id",
            "opened_once",
            "created_at",
            "near_location",
            "opened",
            "device_id",
            "initial_location",
            "notification_sent",
            "notification_sent_at",
            "initial_distance",
            "geomatch_method",
            "reason",
            "updated_at",
            "coming_help",
            "relative_user_id"
        )
    SELECT
        v_archived_alert_id,
        "user_id",
        "opened_once",
        "created_at",
        "near_location",
        "opened",
        "device_id",
        "initial_location",
        "notification_sent",
        "notification_sent_at",
        "initial_distance",
        "geomatch_method",
        "reason",
        "updated_at",
        "coming_help",
        "relative_user_id"
    FROM "alerting"
    WHERE "alert_id" = p_id;
    
    -- Insert related messages into the archived_message table
    INSERT INTO archived_message (
        "archived_alert_id",
        "user_id",
        "device_id",
        "content_type",
        "text",
        "audio_file_uuid",
        "location",
        "created_at"
    )
    SELECT
        v_archived_alert_id,
        "user_id",
        "device_id",
        "content_type",
        "text",
        "audio_file_uuid",
        "location",
        "created_at"
    FROM "message"
    WHERE "alert_id" = p_id;

    -- Delete the messages from the message table
    DELETE FROM "message"
    WHERE "alert_id" = p_id;
    
    -- Delete the alert from the alert table
    DELETE FROM "alert"
    WHERE id = p_id;

END;
$function$;
