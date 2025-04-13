CREATE OR REPLACE FUNCTION relative_unregistered_reconciliation_loop()
RETURNS void AS $$
DECLARE
    rel_unreg RECORD;
    matched_phone RECORD;
    new_relative_id INTEGER;
BEGIN
    -- Start transaction
    BEGIN
        FOR rel_unreg IN
            SELECT * FROM relative_unregistered WHERE reconciliation_checked = false
        LOOP
            -- Check for a match in the phone_number table
            SELECT * INTO matched_phone
            FROM phone_number
            WHERE number = rel_unreg.phone_number
              AND country = rel_unreg.phone_country
            LIMIT 1;

            IF FOUND THEN
                -- Insert into relative table
                INSERT INTO relative (user_id, to_user_id)
                VALUES (rel_unreg.user_id, matched_phone.user_id)
                RETURNING id INTO new_relative_id;

                -- Insert into relative_allow table
                INSERT INTO relative_allow (relative_id)
                VALUES (new_relative_id);

                -- Delete from relative_unregistered table
                DELETE FROM relative_unregistered WHERE id = rel_unreg.id;
            ELSE
                -- If no match, set reconciliation_checked to true
                UPDATE relative_unregistered
                SET reconciliation_checked = true
                WHERE id = rel_unreg.id;
            END IF;
        END LOOP;
    EXCEPTION
        WHEN OTHERS THEN
            -- Rollback if any error occurs
            RAISE NOTICE 'Error occurred, transaction will be rolled back';
            ROLLBACK;
            RETURN;
    END;
END;
$$ LANGUAGE plpgsql;
