CREATE TRIGGER reconcile_on_user_phone_number_relative_change
AFTER INSERT OR UPDATE ON user_phone_number_relative
FOR EACH ROW
EXECUTE FUNCTION reconcile_relative_by_phone_number();
