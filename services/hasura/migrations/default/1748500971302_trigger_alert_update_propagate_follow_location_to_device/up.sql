CREATE FUNCTION trigger_alert_update_propagate_follow_location_to_device() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  should_follow  boolean;
  affected_device int := COALESCE(NEW.device_id, OLD.device_id);
BEGIN
  IF affected_device IS NULL THEN
    RETURN NEW;
  END IF;

  -- compute once
  SELECT EXISTS(
    SELECT 1
      FROM alert a
     WHERE a.device_id        = affected_device
       AND a.state            = 'open'
       AND a.follow_location  = TRUE
  ) INTO should_follow;

  -- only update when it actually changes
  UPDATE device d
     SET follow_location = should_follow
   WHERE d.id = affected_device
     AND d.follow_location IS DISTINCT FROM should_follow;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_alert_update_propagate_follow_location_to_device_after_update
  AFTER INSERT OR UPDATE OR DELETE
  ON alert
  FOR EACH ROW
  EXECUTE FUNCTION trigger_alert_update_propagate_follow_location_to_device();
