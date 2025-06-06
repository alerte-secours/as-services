CREATE OR REPLACE FUNCTION public.increment_alerting_count()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    IF NEW.reason = 'relative' THEN
        UPDATE alert
        SET alerting_relative_count = alerting_relative_count + 1
        WHERE id = NEW.alert_id;
    ELSIF NEW.reason IN ('agent', 'connect') THEN
        UPDATE alert
        SET alerting_connect_count = alerting_connect_count + 1
        WHERE id = NEW.alert_id;
    ELSIF NEW.reason = 'around' THEN
        UPDATE alert
        SET alerting_around_count = alerting_around_count + 1
        WHERE id = NEW.alert_id;
    ELSIF NEW.reason = 'self' THEN
        -- Do nothing for 'self'
        NULL;
    END IF;
    RETURN NEW;
END;
$function$;

CREATE TRIGGER update_alerting_counts
AFTER INSERT ON alerting
FOR EACH ROW
EXECUTE FUNCTION public.increment_alerting_count();
