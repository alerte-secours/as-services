CREATE OR REPLACE FUNCTION public.aknowledge_alerting(input_alerting_id integer, hasura_session json)
 RETURNS SETOF alerting
 LANGUAGE plpgsql
AS $function$
DECLARE 
  v_user_id INT;
  v_alerting alerting%ROWTYPE;
BEGIN
  -- Extract user ID from Hasura session
  v_user_id := (hasura_session ->> 'x-hasura-user-id')::INT;
  
  -- Validate that the alerting row belongs to the user
  SELECT *
  INTO v_alerting
  FROM alerting
  WHERE id = input_alerting_id
    AND user_id = v_user_id;
    
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unauthorized operation for user %', v_user_id;
  END IF;
  
  -- If already acknowledged, simply return the row
  IF v_alerting.acknowledged THEN
    RETURN NEXT v_alerting;
    RETURN;
  END IF;
  
  -- Update alert table counters based on the reason:
  -- 'relative' increments acknowledged_relative,
  -- 'around' increments acknowledged_around,
  -- 'agent' or 'connect' increments acknowledged_link,
  -- 'self' is skipped.
  IF v_alerting.reason = 'relative' THEN
    UPDATE alert
    SET acknowledged_relative = acknowledged_relative + 1
    WHERE id = v_alerting.alert_id;
  ELSIF v_alerting.reason = 'agent' OR v_alerting.reason = 'connect' THEN
    UPDATE alert
    SET acknowledged_link = acknowledged_link + 1
    WHERE id = v_alerting.alert_id;
  ELSIF v_alerting.reason = 'around' THEN
    UPDATE alert
    SET acknowledged_around = acknowledged_around + 1
    WHERE id = v_alerting.alert_id;
  ELSIF v_alerting.reason = 'self' THEN
    -- Skip updating counters if the reason is 'self'
    NULL;
  ELSE
    RAISE EXCEPTION 'Unexpected reason "%" for alerting id %', v_alerting.reason, v_alerting.id;
  END IF;
  
  -- Mark the alerting as acknowledged
  UPDATE alerting
  SET acknowledged = true
  WHERE id = input_alerting_id;
  
  -- Retrieve and return the updated alerting row
  SELECT *
  INTO v_alerting
  FROM alerting
  WHERE id = input_alerting_id;
  
  RETURN NEXT v_alerting;
END;
$function$;
