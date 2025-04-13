CREATE OR REPLACE FUNCTION public.upsert_many_relative_by_phone_number_id(json_input json, hasura_session json)
 RETURNS SETOF relative
 LANGUAGE plpgsql
AS $function$
DECLARE
    element JSON; -- Declare a variable to hold each JSON element
BEGIN
    -- Loop through each element of the JSON array
    FOR element IN SELECT * FROM json_array_elements(json_input) 
    LOOP
        -- Call the upsert function for each JSON object, extracting and casting each needed value
        RETURN QUERY SELECT * FROM upsert_one_relative_by_phone_number_id(
            (element->>'phone_number_id')::INT,
            (element->>'user_index')::INT,
            hasura_session
        );
    END LOOP;
    RETURN;
END;
$function$;
