CREATE OR REPLACE FUNCTION public.upsert_one_relative_by_invitation_id(
    input_relative_invitation_id integer,
    hasura_session json)
RETURNS SETOF relative
LANGUAGE plpgsql
AS $function$
DECLARE
    v_user_id INT;
    v_to_user_id INT;
    new_relative RECORD;
BEGIN
    -- Extract user ID from session
    v_user_id := (hasura_session ->> 'x-hasura-user-id')::INT;

    -- Validate that the invitation belongs to the user
    SELECT user_id INTO v_to_user_id
    FROM relative_invitation
    WHERE id = input_relative_invitation_id AND to_user_id = v_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Unauthorized operation for user %', v_user_id;
    END IF;

    -- Try inserting into the `relative` table and handle conflict
    INSERT INTO relative ("user_id", "to_user_id")
    VALUES (v_user_id, v_to_user_id)
    ON CONFLICT ON CONSTRAINT relative_user_id_to_user_id_key DO NOTHING
    RETURNING * INTO new_relative;

    -- If the insert did not occur due to a uniqueness conflict
    IF NOT FOUND THEN
        -- Retrieve the existing relative
        SELECT * INTO new_relative
        FROM relative
        WHERE "user_id" = v_user_id AND "to_user_id" = v_to_user_id;
    ELSE
        -- If a new relative was inserted, insert into `relative_allow`
        INSERT INTO relative_allow (relative_id, allowed)
        VALUES (new_relative.id, true)
        ON CONFLICT (relative_id) DO UPDATE
        SET allowed = EXCLUDED.allowed;
    END IF;

    -- Always delete the relative invitation
    DELETE FROM relative_invitation
    WHERE id = input_relative_invitation_id;

    -- Return the relative
    RETURN NEXT new_relative;

END;
$function$;
