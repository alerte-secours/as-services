DROP FUNCTION public.upsert_one_relative_by_invitation_id;
CREATE OR REPLACE FUNCTION public.upsert_one_relative_by_invitation_id(input_relative_invitation_id integer, hasura_session json)
 RETURNS SETOF relative
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_user_id INT;
    v_to_user_id INT;
    new_relative RECORD;
BEGIN
    
    v_user_id := (hasura_session ->> 'x-hasura-user-id')::INT;

    SELECT user_id INTO v_to_user_id
    FROM relative_invitation
    WHERE id = input_relative_invitation_id AND to_user_id = v_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Unauthorized operation for user %', v_user_id;
    END IF;

    INSERT INTO relative ("user_id", "to_user_id")
    VALUES (v_user_id, v_to_user_id)
    RETURNING * INTO new_relative;
    
    INSERT INTO relative_allow (relative_id, allowed)
    VALUES (new_relative.id, true)
    ON CONFLICT (relative_id) DO UPDATE
    SET allowed = EXCLUDED.allowed;
    
    DELETE FROM relative_invitation
    WHERE id = input_relative_invitation_id;

    RETURN NEXT new_relative;

END;
$function$;
