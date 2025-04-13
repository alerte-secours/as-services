CREATE OR REPLACE FUNCTION reconcile_relative_by_phone_number(phone_number_id INTEGER)
RETURNS void AS $$
DECLARE
    matched_phone RECORD;
    rel_unreg RECORD;
    new_relative_id INTEGER;
BEGIN
    -- Fetch the phone number and associated user_id
    SELECT pn.user_id, pn.number, pn.country INTO matched_phone
    FROM phone_number pn
    WHERE pn.id = phone_number_id;

    IF FOUND THEN
        -- Iterate over all rows in relative_unregistered that match the phone number and country
        FOR rel_unreg IN
            SELECT ru.id, ru.user_id
            FROM relative_unregistered ru
            WHERE ru.phone_number = matched_phone.number
              AND ru.phone_country = matched_phone.country
        LOOP
            -- Insert into relative table
            INSERT INTO relative (user_id, to_user_id)
            VALUES (rel_unreg.user_id, matched_phone.user_id)
            RETURNING id INTO new_relative_id;

            -- Insert into relative_allow table
            INSERT INTO relative_allow (relative_id)
            VALUES (new_relative_id);

            -- Delete from relative_unregistered table
            DELETE FROM relative_unregistered WHERE id = rel_unreg.id;
        END LOOP;
    END IF;
END;
$$ LANGUAGE plpgsql;
