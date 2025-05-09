DROP FUNCTION public.upsert_one_relative_by_phone_number_id;
CREATE OR REPLACE FUNCTION public.upsert_one_relative_by_phone_number_id(input_phone_number_id integer, hasura_session json)
 RETURNS SETOF relative
 LANGUAGE plpgsql
AS $function$
DECLARE
    fetched_to_user_id INT;
    new_relative RECORD;
BEGIN
    
    -- Check if is registered as relative
    IF NOT EXISTS (SELECT 1 FROM user_phone_number_relative WHERE phone_number_id = input_phone_number_id) THEN
        RAISE EXCEPTION 'phone_number_id % not found in user_phone_number_relative', input_phone_number_id;
    END IF;

    -- Fetch the user_id associated with the provided phone_number_id
    SELECT phone_number.user_id INTO fetched_to_user_id FROM phone_number WHERE phone_number.id = input_phone_number_id;

    -- Check if user_id was found
    IF fetched_to_user_id IS NULL THEN
        RAISE EXCEPTION 'No user found with the provided phone_number_id: %', phone_number_id;
    END IF;

    -- Perform an upsert into the relative table
    INSERT INTO relative ("to_user_id", "user_id")
    VALUES (fetched_to_user_id, (hasura_session ->> 'x-hasura-user-id')::int)
    RETURNING * INTO new_relative;
    
    -- Attempt to insert into the subtable
    INSERT INTO relative_allow (relative_id)
    VALUES (new_relative.id)
    ON CONFLICT (relative_id) DO NOTHING;

    -- Return the result of the main operation
    RETURN NEXT new_relative;

END;
$function$;
