SET check_function_bodies = false;
CREATE FUNCTION public.alert_increment_notified_count() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE "alert"
    SET "notified_count" = "notified_count" + 1
    WHERE "id" = NEW."alert_id";
    RETURN NEW;
END;
$$;
CREATE FUNCTION public.alert_update_propagate_to_alerting() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE "alerting"
    SET "updated_at" = NOW()
    WHERE "alert_id" = NEW.id;
    RETURN NEW;
END;
$$;
CREATE FUNCTION public.alerting__updated_seq__increment_sequence() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_seq := nextval('global_alerting_updated_seq');
    RETURN NEW;
END;
$$;
CREATE FUNCTION public.archive_alert(p_id integer) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_archived_alert_id INTEGER;
BEGIN
    -- Insert the selected rows into the archive table
    INSERT INTO archived_alert (
      "alert_id",
      "user_id",
      "phone_number_id",
      "device_id",
      "location",
      "alert_tag",
      "created_at",
      "call_emergency",
      "notify_around",
      "notify_relatives",
      "level",
      "subject",
      "accuracy",
      "altitude",
      "altitude_accuracy",
      "heading",
      "speed",
      "radius",
      "address",
      "what3words",
      "nearest_place",
      "uuid",
      "code",
      "notified_count",
      "closed_at",
      "keep_open_at",
      "updated_at",
      "suggest_close_sent",
      "suggest_keep_open_sent",
      "closed_by"
    )
    SELECT 
      "id", 
      "user_id",
      "phone_number_id",
      "device_id",
      "location",
      "alert_tag",
      "created_at",
      "call_emergency",
      "notify_around",
      "notify_relatives",
      "level",
      "subject",
      "accuracy",
      "altitude",
      "altitude_accuracy",
      "heading",
      "speed",
      "radius",
      "address",
      "what3words",
      "nearest_place",
      "uuid",
      "code",
      "notified_count",
      "closed_at",
      "keep_open_at",
      "updated_at",
      "suggest_close_sent",
      "suggest_keep_open_sent",
      "closed_by"
    FROM "alert"
    WHERE "id" = p_id
    RETURNING "id" INTO v_archived_alert_id;
    INSERT INTO
        "alerted" (
            "archived_alert_id",
            "user_id",
            "opened_once",
            "created_at",
            "near_location",
            "opened",
            "device_id",
            "initial_location",
            "notification_sent",
            "notification_sent_at",
            "initial_distance",
            "geomatch_method",
            "reason",
            "updated_at",
            "coming_help",
            "relative_user_id"
        )
    SELECT
        v_archived_alert_id,
        "user_id",
        "opened_once",
        "created_at",
        "near_location",
        "opened",
        "device_id",
        "initial_location",
        "notification_sent",
        "notification_sent_at",
        "initial_distance",
        "geomatch_method",
        "reason",
        "updated_at",
        "coming_help",
        "relative_user_id"
    FROM "alerting"
    WHERE "alert_id" = p_id;
    DELETE FROM "alert"
    WHERE id = p_id;
END;
$$;
CREATE TABLE public.alert (
    id integer NOT NULL,
    user_id integer NOT NULL,
    level text NOT NULL,
    phone_number_id integer,
    device_id integer,
    state text DEFAULT 'open'::text NOT NULL,
    location public.geography,
    alert_tag text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    call_emergency boolean,
    notify_around boolean,
    notify_relatives boolean,
    subject text,
    accuracy numeric,
    altitude numeric,
    altitude_accuracy numeric,
    heading numeric,
    speed numeric,
    radius numeric,
    address text,
    what3words text,
    nearest_place text,
    uuid uuid DEFAULT public.gen_random_uuid() NOT NULL,
    code text,
    notified_count integer DEFAULT 0 NOT NULL,
    access_code text,
    closed_at timestamp with time zone,
    keep_open_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now(),
    suggest_close_sent boolean,
    suggest_keep_open_sent boolean,
    closed_by text,
    emergency_calling_notification_sent boolean
);
CREATE FUNCTION public.computed_alert__username(alert_row public.alert) RETURNS text
    LANGUAGE sql STABLE
    AS $$
  SELECT COALESCE("username",'') FROM "user" WHERE "id" = alert_row.user_id
$$;
CREATE TABLE public.archived_alert (
    id integer NOT NULL,
    user_id integer,
    phone_number_id integer,
    device_id integer,
    location public.geography,
    alert_tag text,
    created_at timestamp with time zone NOT NULL,
    call_emergency boolean,
    notify_around boolean,
    notify_relatives boolean,
    level text NOT NULL,
    subject text,
    accuracy numeric,
    altitude numeric,
    altitude_accuracy numeric,
    heading numeric,
    speed numeric,
    radius numeric,
    address text,
    what3words text,
    nearest_place text,
    uuid uuid NOT NULL,
    code text,
    notified_count integer DEFAULT 0,
    closed_at timestamp with time zone,
    keep_open_at timestamp with time zone,
    updated_at timestamp with time zone,
    suggest_close_sent boolean,
    suggest_keep_open_sent boolean,
    closed_by text,
    alert_id integer,
    archive_created_at timestamp with time zone DEFAULT now()
);
CREATE FUNCTION public.computed_archived_alert__username(alert_row public.archived_alert) RETURNS text
    LANGUAGE sql STABLE
    AS $$
  SELECT COALESCE("username",'') FROM "user" WHERE "id" = alert_row.user_id
$$;
CREATE TABLE public.message (
    id integer NOT NULL,
    alert_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    user_id integer,
    device_id integer,
    location public.geography,
    content_type text DEFAULT 'text'::text NOT NULL,
    text character varying(4096),
    audio_file_uuid uuid
);
CREATE FUNCTION public.computed_message__avatar_image_file_uuid(message_row public.message) RETURNS uuid
    LANGUAGE sql STABLE
    AS $$
  SELECT "image_file_uuid" FROM "user_avatar" WHERE "user_id" = message_row.user_id
$$;
CREATE FUNCTION public.computed_message__username(message_row public.message) RETURNS text
    LANGUAGE sql STABLE
    AS $$
  SELECT COALESCE("username",'') FROM "user" WHERE "id" = message_row.user_id
$$;
CREATE TABLE public.phone_number (
    id integer NOT NULL,
    user_id integer NOT NULL,
    device_id integer,
    number text NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    country text NOT NULL,
    is_private boolean DEFAULT false NOT NULL
);
CREATE FUNCTION public.computed_phone_number__phone_number_key(phone_number_row public.phone_number) RETURNS text
    LANGUAGE sql STABLE
    AS $$
  SELECT phone_number_row.country || ' ' || phone_number_row.number
$$;
CREATE FUNCTION public.device_update_fcm_token() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Update fcm_token to NULL for other rows with the same fcm_token
    UPDATE device
    SET fcm_token = NULL
    WHERE fcm_token = NEW.fcm_token
      AND id <> NEW.id;
    -- Return the new record
    RETURN NEW;
END;
$$;
CREATE FUNCTION public.insert_one_relative_by_phone_number_id(user_id integer, phone_number_id integer) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    to_user_id INT;
BEGIN
    -- Fetch the user_id associated with the provided phone_number_id
    SELECT user_id INTO to_user_id FROM phone_number WHERE phone_number_id = phone_number_id;
    -- Check if user_id was found
    IF to_user_id IS NULL THEN
        RAISE EXCEPTION 'No user found with the provided phone_number_id: %', phone_number_id;
    END IF;
    -- Insert into the relative table
    INSERT INTO relative (to_user_id, user_id)
    VALUES (to_user_id, user_id);
END;
$$;
CREATE FUNCTION public.phone_number__number__trim_leading_zero() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    new."number" := LTRIM(new."number", '0');
    RETURN new;
END;
$$;
CREATE FUNCTION public.random_between(low integer, high integer) RETURNS integer
    LANGUAGE plpgsql STRICT
    AS $$
BEGIN
   RETURN floor(random()* (high-low + 1) + low);
END;
$$;
CREATE FUNCTION public.set_current_timestamp_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  _new record;
BEGIN
  _new := NEW;
  _new."updated_at" = NOW();
  RETURN _new;
END;
$$;
CREATE FUNCTION public.set_current_timestamp_updated_at_for_alert() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Check if the specified columns are unchanged
    IF NEW.suggest_close_sent = OLD.suggest_close_sent AND
       NEW.suggest_keep_open_sent = OLD.suggest_keep_open_sent AND
       NEW.notified_count = OLD.notified_count AND
       NEW.state = OLD.state THEN
        -- None of the specified columns have changed, update updated_at
        NEW.updated_at := NOW();
    END IF;
    -- Return the modified NEW record
    RETURN NEW;
END;
$$;
CREATE TABLE public.relative (
    id integer NOT NULL,
    user_id integer NOT NULL,
    user_index integer NOT NULL,
    to_user_id integer NOT NULL
);
CREATE FUNCTION public.upsert_many_relative_by_phone_number_id(json_input json, hasura_session json) RETURNS SETOF public.relative
    LANGUAGE plpgsql
    AS $$
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
$$;
CREATE FUNCTION public.upsert_one_relative_by_invitation_id(input_relative_invitation_id integer, input_user_index integer, hasura_session json) RETURNS SETOF public.relative
    LANGUAGE plpgsql
    AS $$
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
    INSERT INTO relative ("user_id", "to_user_id", "user_index")
    VALUES (v_user_id, v_to_user_id, input_user_index)
    ON CONFLICT ("user_id", "to_user_id") DO UPDATE
    SET to_user_id = EXCLUDED.to_user_id
    RETURNING * INTO new_relative;
    INSERT INTO relative_allow (relative_id, allowed)
    VALUES (new_relative.id, true)
    ON CONFLICT (relative_id) DO UPDATE
    SET allowed = EXCLUDED.allowed;
    DELETE FROM relative_invitation
    WHERE id = input_relative_invitation_id;
    RETURN NEXT new_relative;
END;
$$;
CREATE FUNCTION public.upsert_one_relative_by_phone_number_id(input_phone_number_id integer, input_user_index integer, hasura_session json) RETURNS SETOF public.relative
    LANGUAGE plpgsql
    AS $$
DECLARE
    fetched_to_user_id INT;
    new_relative RECORD;
BEGIN
    IF NOT (input_user_index BETWEEN 1 AND 5) THEN
        RAISE EXCEPTION 'Invalid user_index: %, must be between 1 and 5', user_index;
    END IF;
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
    INSERT INTO relative ("to_user_id", "user_id", "user_index")
    VALUES (fetched_to_user_id, (hasura_session ->> 'x-hasura-user-id')::int, input_user_index)
    ON CONFLICT ("user_id", "user_index") DO UPDATE
    SET to_user_id = EXCLUDED.to_user_id
    RETURNING * INTO new_relative;
    -- Attempt to insert into the subtable
    INSERT INTO relative_allow (relative_id)
    VALUES (new_relative.id)
    ON CONFLICT (relative_id) DO NOTHING;
    -- Return the result of the main operation
    RETURN NEXT new_relative;
END;
$$;
CREATE TABLE public.relative_invitation (
    id integer NOT NULL,
    user_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    to_user_id integer NOT NULL
);
CREATE FUNCTION public.upsert_one_relative_invitation_by_phone_number_id(input_phone_number_id integer, hasura_session json) RETURNS SETOF public.relative_invitation
    LANGUAGE plpgsql
    AS $$
DECLARE
	fetched_to_user_id INT;
BEGIN
   -- Check if is registered as relative
    IF NOT EXISTS (SELECT 1 FROM user_phone_number_relative WHERE phone_number_id = input_phone_number_id) THEN
        RAISE EXCEPTION 'phone_number_id % not found in user_phone_number_relative', input_phone_number_id;
    END IF;
	-- Fetch the user_id associated with the provided phone_number_id
	SELECT phone_number.user_id INTO fetched_to_user_id
	FROM phone_number
	WHERE
	    phone_number.id = input_phone_number_id;
	-- Check if user_id was found
	IF fetched_to_user_id IS NULL THEN RAISE EXCEPTION 'No user found with the provided phone_number_id: %',
	phone_number_id;
END
	IF;
	-- Perform an upsert into the relative_invitation table
	RETURN QUERY
	INSERT INTO
	    relative_invitation (to_user_id, user_id)
	VALUES (fetched_to_user_id, (hasura_session ->> 'x-hasura-user-id')::int) ON CONFLICT (to_user_id, user_id) DO
	UPDATE
	SET
	    to_user_id = EXCLUDED.to_user_id RETURNING *;
	-- Return the newly inserted or updated row
END;
$$;
CREATE TABLE public.alert_group (
    id integer NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE SEQUENCE public.alert_group_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.alert_group_id_seq OWNED BY public.alert_group.id;
CREATE TABLE public.alert_group_link (
    id integer NOT NULL,
    alert_group_id integer NOT NULL,
    alert_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE SEQUENCE public.alert_group_link_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.alert_group_link_id_seq OWNED BY public.alert_group_link.id;
CREATE SEQUENCE public.alert_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.alert_id_seq OWNED BY public.alert.id;
CREATE TABLE public.alert_link (
    id integer NOT NULL,
    alert1_id integer NOT NULL,
    alert2_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE SEQUENCE public.alert_link_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.alert_link_id_seq OWNED BY public.alert_link.id;
CREATE TABLE public.alert_tag (
    value text NOT NULL
);
CREATE TABLE public.alerted (
    id bigint NOT NULL,
    user_id integer NOT NULL,
    archived_alert_id integer NOT NULL,
    opened_once boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone,
    near_location boolean DEFAULT true NOT NULL,
    opened boolean DEFAULT false NOT NULL,
    device_id integer,
    initial_location public.geography,
    notification_sent boolean,
    notification_sent_at timestamp with time zone,
    initial_distance numeric,
    geomatch_method text,
    reason text,
    updated_at timestamp with time zone DEFAULT now(),
    coming_help boolean,
    relative_user_id integer
);
CREATE SEQUENCE public.alerted_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.alerted_id_seq OWNED BY public.alerted.id;
CREATE TABLE public.alerting (
    id integer NOT NULL,
    user_id integer NOT NULL,
    alert_id integer NOT NULL,
    opened boolean DEFAULT false NOT NULL,
    near_location boolean DEFAULT true NOT NULL,
    opened_once boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    device_id integer,
    initial_location public.geography,
    notification_sent boolean,
    notification_sent_at timestamp with time zone,
    initial_distance numeric,
    geomatch_method text,
    reason text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_seq bigint NOT NULL,
    coming_help boolean,
    relative_user_id integer
);
CREATE SEQUENCE public.alerting_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.alerting_id_seq OWNED BY public.alerting.id;
CREATE SEQUENCE public.archived_alert_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.archived_alert_id_seq OWNED BY public.archived_alert.id;
CREATE TABLE public.auth_connect_email (
    id integer NOT NULL,
    email_id integer NOT NULL,
    user_id integer NOT NULL,
    connection_code text,
    connection_email_sent_time timestamp with time zone
);
CREATE SEQUENCE public.auth_connect_email_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.auth_connect_email_id_seq OWNED BY public.auth_connect_email.id;
CREATE TABLE public.auth_sign_key (
    id integer NOT NULL,
    user_id integer NOT NULL,
    key text NOT NULL
);
CREATE SEQUENCE public.auth_sign_key_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.auth_sign_key_id_seq OWNED BY public.auth_sign_key.id;
CREATE TABLE public.auth_token (
    id integer NOT NULL,
    user_id integer,
    auth_token text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    device_id integer
);
CREATE SEQUENCE public.auth_token_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.auth_token_id_seq OWNED BY public.auth_token.id;
CREATE TABLE public.device (
    id integer NOT NULL,
    user_id integer NOT NULL,
    phone_model text,
    location public.geography,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    altitude numeric,
    heading numeric,
    speed numeric,
    accuracy numeric,
    altitude_accuracy numeric,
    radius_all numeric,
    radius_reach numeric,
    fcm_token text,
    uuid uuid DEFAULT public.gen_random_uuid(),
    notification_alert_level text,
    preferred_emergency_call text
);
CREATE SEQUENCE public.device_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.device_id_seq OWNED BY public.device.id;
CREATE TABLE public.email (
    id integer NOT NULL,
    user_id integer NOT NULL,
    email text NOT NULL,
    verified boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    verification_code uuid DEFAULT public.gen_random_uuid() NOT NULL,
    verification_email_sent boolean DEFAULT false NOT NULL,
    verification_email_sent_time timestamp with time zone
);
CREATE SEQUENCE public.email_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.email_id_seq OWNED BY public.email.id;
CREATE SEQUENCE public.emergency_contact_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.emergency_contact_id_seq OWNED BY public.relative.id;
CREATE TABLE public.enum_alert_closed_by (
    value text NOT NULL
);
CREATE TABLE public.enum_alert_level (
    value text NOT NULL
);
CREATE TABLE public.enum_alert_state (
    value text NOT NULL
);
CREATE TABLE public.enum_alerting_reason (
    value text NOT NULL
);
CREATE TABLE public.enum_content_type (
    value text NOT NULL
);
CREATE TABLE public.enum_emergency_call (
    value text NOT NULL
);
CREATE TABLE public.enum_user_login_request_type (
    value text NOT NULL
);
CREATE TABLE public.enum_user_role (
    value text NOT NULL
);
CREATE TABLE public.external_public_config (
    key text NOT NULL,
    value text NOT NULL
);
CREATE SEQUENCE public.global_alerting_updated_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
CREATE SEQUENCE public.message_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.message_id_seq OWNED BY public.message.id;
CREATE SEQUENCE public.phone_number_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.phone_number_id_seq OWNED BY public.phone_number.id;
CREATE TABLE public.relative_allow (
    id integer NOT NULL,
    allowed boolean,
    relative_id integer NOT NULL,
    ask_notification_sent boolean
);
CREATE SEQUENCE public.relative_allow_in_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.relative_allow_in_id_seq OWNED BY public.relative_allow.id;
CREATE SEQUENCE public.relative_invitation_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.relative_invitation_id_seq OWNED BY public.relative_invitation.id;
CREATE TABLE public."user" (
    id integer NOT NULL,
    username text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    deleted boolean DEFAULT false NOT NULL
);
CREATE TABLE public.user_avatar (
    id integer NOT NULL,
    user_id integer NOT NULL,
    image_file_uuid uuid
);
CREATE SEQUENCE public.user_avatar_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.user_avatar_id_seq OWNED BY public.user_avatar.id;
CREATE TABLE public.user_login_request (
    id integer NOT NULL,
    type text NOT NULL,
    user_id integer NOT NULL,
    phone_number_id integer,
    email_id integer,
    updated_at timestamp with time zone DEFAULT now()
);
CREATE SEQUENCE public.user_connect_request_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.user_connect_request_id_seq OWNED BY public.user_login_request.id;
CREATE TABLE public.user_group (
    id integer NOT NULL,
    name text NOT NULL
);
CREATE SEQUENCE public.user_group_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.user_group_id_seq OWNED BY public.user_group.id;
CREATE TABLE public.user_group_member (
    id integer NOT NULL,
    user_id integer NOT NULL,
    user_group_id integer NOT NULL
);
CREATE SEQUENCE public.user_group_member_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.user_group_member_id_seq OWNED BY public.user_group_member.id;
CREATE SEQUENCE public.user_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.user_id_seq OWNED BY public."user".id;
CREATE TABLE public.user_phone_number_relative (
    id integer NOT NULL,
    user_id integer NOT NULL,
    phone_number_id integer NOT NULL
);
CREATE SEQUENCE public.user_relative_phone_number_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.user_relative_phone_number_id_seq OWNED BY public.user_phone_number_relative.id;
CREATE TABLE public.user_role (
    id integer NOT NULL,
    user_id integer NOT NULL,
    role text NOT NULL
);
CREATE SEQUENCE public.user_role_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.user_role_id_seq OWNED BY public.user_role.id;
CREATE VIEW public.view_relative_invitation_phone_number AS
 SELECT user_phone_number_relative.phone_number_id,
    relative_invitation.id AS relative_invitation_id,
    upnri_to.phone_number_id AS to_phone_number_id
   FROM ((public.relative_invitation
     JOIN public.user_phone_number_relative ON ((relative_invitation.user_id = user_phone_number_relative.user_id)))
     JOIN public.user_phone_number_relative upnri_to ON ((relative_invitation.to_user_id = upnri_to.user_id)));
CREATE VIEW public.view_relative_phone_number AS
 SELECT user_phone_number_relative.phone_number_id,
    relative.id AS relative_id,
    upnr_to.phone_number_id AS to_phone_number_id
   FROM ((public.relative
     JOIN public.user_phone_number_relative ON ((relative.user_id = user_phone_number_relative.user_id)))
     JOIN public.user_phone_number_relative upnr_to ON ((relative.to_user_id = upnr_to.user_id)));
ALTER TABLE ONLY public.alert ALTER COLUMN id SET DEFAULT nextval('public.alert_id_seq'::regclass);
ALTER TABLE ONLY public.alert_group ALTER COLUMN id SET DEFAULT nextval('public.alert_group_id_seq'::regclass);
ALTER TABLE ONLY public.alert_group_link ALTER COLUMN id SET DEFAULT nextval('public.alert_group_link_id_seq'::regclass);
ALTER TABLE ONLY public.alert_link ALTER COLUMN id SET DEFAULT nextval('public.alert_link_id_seq'::regclass);
ALTER TABLE ONLY public.alerted ALTER COLUMN id SET DEFAULT nextval('public.alerted_id_seq'::regclass);
ALTER TABLE ONLY public.alerting ALTER COLUMN id SET DEFAULT nextval('public.alerting_id_seq'::regclass);
ALTER TABLE ONLY public.archived_alert ALTER COLUMN id SET DEFAULT nextval('public.archived_alert_id_seq'::regclass);
ALTER TABLE ONLY public.auth_connect_email ALTER COLUMN id SET DEFAULT nextval('public.auth_connect_email_id_seq'::regclass);
ALTER TABLE ONLY public.auth_sign_key ALTER COLUMN id SET DEFAULT nextval('public.auth_sign_key_id_seq'::regclass);
ALTER TABLE ONLY public.auth_token ALTER COLUMN id SET DEFAULT nextval('public.auth_token_id_seq'::regclass);
ALTER TABLE ONLY public.device ALTER COLUMN id SET DEFAULT nextval('public.device_id_seq'::regclass);
ALTER TABLE ONLY public.email ALTER COLUMN id SET DEFAULT nextval('public.email_id_seq'::regclass);
ALTER TABLE ONLY public.message ALTER COLUMN id SET DEFAULT nextval('public.message_id_seq'::regclass);
ALTER TABLE ONLY public.phone_number ALTER COLUMN id SET DEFAULT nextval('public.phone_number_id_seq'::regclass);
ALTER TABLE ONLY public.relative ALTER COLUMN id SET DEFAULT nextval('public.emergency_contact_id_seq'::regclass);
ALTER TABLE ONLY public.relative_allow ALTER COLUMN id SET DEFAULT nextval('public.relative_allow_in_id_seq'::regclass);
ALTER TABLE ONLY public.relative_invitation ALTER COLUMN id SET DEFAULT nextval('public.relative_invitation_id_seq'::regclass);
ALTER TABLE ONLY public."user" ALTER COLUMN id SET DEFAULT nextval('public.user_id_seq'::regclass);
ALTER TABLE ONLY public.user_avatar ALTER COLUMN id SET DEFAULT nextval('public.user_avatar_id_seq'::regclass);
ALTER TABLE ONLY public.user_group ALTER COLUMN id SET DEFAULT nextval('public.user_group_id_seq'::regclass);
ALTER TABLE ONLY public.user_group_member ALTER COLUMN id SET DEFAULT nextval('public.user_group_member_id_seq'::regclass);
ALTER TABLE ONLY public.user_login_request ALTER COLUMN id SET DEFAULT nextval('public.user_connect_request_id_seq'::regclass);
ALTER TABLE ONLY public.user_phone_number_relative ALTER COLUMN id SET DEFAULT nextval('public.user_relative_phone_number_id_seq'::regclass);
ALTER TABLE ONLY public.user_role ALTER COLUMN id SET DEFAULT nextval('public.user_role_id_seq'::regclass);
ALTER TABLE ONLY public.alert_group_link
    ADD CONSTRAINT alert_group_link_alert_group_id_alert_id_key UNIQUE (alert_group_id, alert_id);
ALTER TABLE ONLY public.alert_group_link
    ADD CONSTRAINT alert_group_link_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.alert_group
    ADD CONSTRAINT alert_group_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.enum_alert_level
    ADD CONSTRAINT alert_level_pkey PRIMARY KEY (value);
ALTER TABLE ONLY public.alert_link
    ADD CONSTRAINT alert_link_alert1_id_alert2_id_key UNIQUE (alert1_id, alert2_id);
ALTER TABLE ONLY public.alert_link
    ADD CONSTRAINT alert_link_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.alert
    ADD CONSTRAINT alert_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.enum_alert_state
    ADD CONSTRAINT alert_state_pkey PRIMARY KEY (value);
ALTER TABLE ONLY public.alert_tag
    ADD CONSTRAINT alert_tag_pkey PRIMARY KEY (value);
ALTER TABLE ONLY public.alert
    ADD CONSTRAINT alert_uuid_key UNIQUE (uuid);
ALTER TABLE ONLY public.alerted
    ADD CONSTRAINT alerted_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.alerted
    ADD CONSTRAINT alerted_user_id_archived_alert_id_key UNIQUE (user_id, archived_alert_id);
ALTER TABLE ONLY public.alerting
    ADD CONSTRAINT alerting_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.enum_alerting_reason
    ADD CONSTRAINT alerting_reason_pkey PRIMARY KEY (value);
ALTER TABLE ONLY public.alerting
    ADD CONSTRAINT alerting_user_id_alert_id_key UNIQUE (user_id, alert_id);
ALTER TABLE ONLY public.archived_alert
    ADD CONSTRAINT archived_alert_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.auth_connect_email
    ADD CONSTRAINT auth_connect_email_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.auth_connect_email
    ADD CONSTRAINT auth_connect_email_user_id_key UNIQUE (user_id);
ALTER TABLE ONLY public.auth_sign_key
    ADD CONSTRAINT auth_sign_key_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.auth_sign_key
    ADD CONSTRAINT auth_sign_key_user_id_key UNIQUE (user_id);
ALTER TABLE ONLY public.auth_token
    ADD CONSTRAINT auth_token_device_id_key UNIQUE (device_id);
ALTER TABLE ONLY public.auth_token
    ADD CONSTRAINT auth_token_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.enum_content_type
    ADD CONSTRAINT content_type_enum_pkey PRIMARY KEY (value);
ALTER TABLE ONLY public.device
    ADD CONSTRAINT device_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.email
    ADD CONSTRAINT email_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.email
    ADD CONSTRAINT email_user_id_key UNIQUE (user_id);
ALTER TABLE ONLY public.enum_alert_closed_by
    ADD CONSTRAINT enum_alert_closed_by_pkey PRIMARY KEY (value);
ALTER TABLE ONLY public.enum_emergency_call
    ADD CONSTRAINT enum_emergency_call_pkey PRIMARY KEY (value);
ALTER TABLE ONLY public.enum_user_login_request_type
    ADD CONSTRAINT enum_user_login_request_type_pkey PRIMARY KEY (value);
ALTER TABLE ONLY public.external_public_config
    ADD CONSTRAINT external_public_config_pkey PRIMARY KEY (key);
ALTER TABLE ONLY public.message
    ADD CONSTRAINT message_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.phone_number
    ADD CONSTRAINT phone_number_number_country_key UNIQUE (number, country);
ALTER TABLE ONLY public.phone_number
    ADD CONSTRAINT phone_number_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.relative_allow
    ADD CONSTRAINT relative_allow_in_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.relative_invitation
    ADD CONSTRAINT relative_invitation_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.relative_invitation
    ADD CONSTRAINT relative_invitation_user_id_to_user_id_key UNIQUE (user_id, to_user_id);
ALTER TABLE ONLY public.relative_allow
    ADD CONSTRAINT relative_phone_number_allow_relative_phone_number_id_key UNIQUE (relative_id);
ALTER TABLE ONLY public.relative
    ADD CONSTRAINT relative_phone_number_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.relative
    ADD CONSTRAINT relative_phone_number_user_id_user_index_key UNIQUE (user_id, user_index);
ALTER TABLE ONLY public.relative
    ADD CONSTRAINT relative_user_id_to_user_id_key UNIQUE (user_id, to_user_id);
ALTER TABLE ONLY public.enum_user_role
    ADD CONSTRAINT role_pkey PRIMARY KEY (value);
ALTER TABLE ONLY public.user_avatar
    ADD CONSTRAINT user_avatar_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.user_avatar
    ADD CONSTRAINT user_avatar_user_id_key UNIQUE (user_id);
ALTER TABLE ONLY public.user_login_request
    ADD CONSTRAINT user_connect_request_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.user_group_member
    ADD CONSTRAINT user_group_member_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.user_group
    ADD CONSTRAINT user_group_name_key UNIQUE (name);
ALTER TABLE ONLY public.user_group
    ADD CONSTRAINT user_group_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_login_key UNIQUE (username);
ALTER TABLE ONLY public.user_login_request
    ADD CONSTRAINT user_login_request_user_id_key UNIQUE (user_id);
ALTER TABLE ONLY public.user_phone_number_relative
    ADD CONSTRAINT user_phone_number_relative_user_id_key UNIQUE (user_id);
ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.user_phone_number_relative
    ADD CONSTRAINT user_relative_phone_number_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.user_role
    ADD CONSTRAINT user_role_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.user_role
    ADD CONSTRAINT user_role_user_id_role_key UNIQUE (user_id, role);
CREATE INDEX alert_state ON public.alert USING hash (state);
CREATE INDEX device_fcm ON public.device USING hash (fcm_token);
CREATE INDEX device_location_geography ON public.device USING gist (location);
CREATE UNIQUE INDEX email_email_where_verified_true_key ON public.email USING btree (email) WHERE verified;
CREATE TRIGGER set_public_alert_updated_at BEFORE UPDATE ON public.alert FOR EACH ROW EXECUTE PROCEDURE public.set_current_timestamp_updated_at_for_alert();
CREATE TRIGGER set_public_alerting_updated_at BEFORE UPDATE ON public.alerting FOR EACH ROW EXECUTE PROCEDURE public.set_current_timestamp_updated_at();
COMMENT ON TRIGGER set_public_alerting_updated_at ON public.alerting IS 'trigger to set value of column "updated_at" to current timestamp on row update';
CREATE TRIGGER set_public_device_updated_at BEFORE UPDATE ON public.device FOR EACH ROW EXECUTE PROCEDURE public.set_current_timestamp_updated_at();
COMMENT ON TRIGGER set_public_device_updated_at ON public.device IS 'trigger to set value of column "updated_at" to current timestamp on row update';
CREATE TRIGGER set_public_phone_number_updated_at BEFORE UPDATE ON public.phone_number FOR EACH ROW EXECUTE PROCEDURE public.set_current_timestamp_updated_at();
COMMENT ON TRIGGER set_public_phone_number_updated_at ON public.phone_number IS 'trigger to set value of column "updated_at" to current timestamp on row update';
CREATE TRIGGER set_public_relative_invitation_updated_at BEFORE UPDATE ON public.relative_invitation FOR EACH ROW EXECUTE PROCEDURE public.set_current_timestamp_updated_at();
COMMENT ON TRIGGER set_public_relative_invitation_updated_at ON public.relative_invitation IS 'trigger to set value of column "updated_at" to current timestamp on row update';
CREATE TRIGGER set_public_user_login_request_updated_at BEFORE UPDATE ON public.user_login_request FOR EACH ROW EXECUTE PROCEDURE public.set_current_timestamp_updated_at();
COMMENT ON TRIGGER set_public_user_login_request_updated_at ON public.user_login_request IS 'trigger to set value of column "updated_at" to current timestamp on row update';
CREATE TRIGGER set_public_user_updated_at BEFORE UPDATE ON public."user" FOR EACH ROW EXECUTE PROCEDURE public.set_current_timestamp_updated_at();
COMMENT ON TRIGGER set_public_user_updated_at ON public."user" IS 'trigger to set value of column "updated_at" to current timestamp on row update';
CREATE TRIGGER trigger_alert_increment_notified_count_after_alerting_insert AFTER INSERT ON public.alerting FOR EACH ROW EXECUTE PROCEDURE public.alert_increment_notified_count();
CREATE TRIGGER trigger_alert_update_propagate_to_alerting_after_update AFTER UPDATE ON public.alert FOR EACH ROW EXECUTE PROCEDURE public.alert_update_propagate_to_alerting();
CREATE TRIGGER trigger_alerting__updated_seq__increment_sequence_before_insert BEFORE INSERT ON public.alerting FOR EACH ROW EXECUTE PROCEDURE public.alerting__updated_seq__increment_sequence();
CREATE TRIGGER trigger_alerting__updated_seq__increment_sequence_before_update BEFORE UPDATE ON public.alerting FOR EACH ROW EXECUTE PROCEDURE public.alerting__updated_seq__increment_sequence();
CREATE TRIGGER trigger_device__device_update_fcm_token AFTER UPDATE ON public.device FOR EACH ROW WHEN ((old.fcm_token IS DISTINCT FROM new.fcm_token)) EXECUTE PROCEDURE public.device_update_fcm_token();
CREATE TRIGGER trigger_phone_number__number__trim_leading_zero BEFORE INSERT OR UPDATE ON public.phone_number FOR EACH ROW EXECUTE PROCEDURE public.phone_number__number__trim_leading_zero();
ALTER TABLE ONLY public.alert
    ADD CONSTRAINT alert_alert_tag_fkey FOREIGN KEY (alert_tag) REFERENCES public.alert_tag(value) ON UPDATE SET NULL ON DELETE SET NULL;
ALTER TABLE ONLY public.alert
    ADD CONSTRAINT alert_closed_by_fkey FOREIGN KEY (closed_by) REFERENCES public.enum_alert_closed_by(value) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE ONLY public.alert
    ADD CONSTRAINT alert_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.device(id) ON UPDATE SET NULL ON DELETE SET NULL;
ALTER TABLE ONLY public.alert_group_link
    ADD CONSTRAINT alert_group_link_alert_group_id_fkey FOREIGN KEY (alert_group_id) REFERENCES public.alert_group(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.alert_group_link
    ADD CONSTRAINT alert_group_link_alert_id_fkey FOREIGN KEY (alert_id) REFERENCES public.alert(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.alert
    ADD CONSTRAINT alert_level_fkey FOREIGN KEY (level) REFERENCES public.enum_alert_level(value) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE ONLY public.alert_link
    ADD CONSTRAINT alert_link_alert1_id_fkey FOREIGN KEY (alert1_id) REFERENCES public.alert(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.alert_link
    ADD CONSTRAINT alert_link_alert2_id_fkey FOREIGN KEY (alert2_id) REFERENCES public.alert(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.alert
    ADD CONSTRAINT alert_phone_number_id_fkey FOREIGN KEY (phone_number_id) REFERENCES public.phone_number(id) ON UPDATE SET NULL ON DELETE SET NULL;
ALTER TABLE ONLY public.alert
    ADD CONSTRAINT alert_state_fkey FOREIGN KEY (state) REFERENCES public.enum_alert_state(value) ON UPDATE SET NULL ON DELETE SET NULL;
ALTER TABLE ONLY public.alert
    ADD CONSTRAINT alert_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.alerted
    ADD CONSTRAINT alerted_archived_alert_id_fkey FOREIGN KEY (archived_alert_id) REFERENCES public.archived_alert(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.alerted
    ADD CONSTRAINT alerted_reason_fkey FOREIGN KEY (reason) REFERENCES public.enum_alerting_reason(value);
ALTER TABLE ONLY public.alerted
    ADD CONSTRAINT alerted_relative_user_id_fkey FOREIGN KEY (relative_user_id) REFERENCES public."user"(id);
ALTER TABLE ONLY public.alerted
    ADD CONSTRAINT alerted_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.alerting
    ADD CONSTRAINT alerting_alert_id_fkey FOREIGN KEY (alert_id) REFERENCES public.alert(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.alerting
    ADD CONSTRAINT alerting_reason_fkey FOREIGN KEY (reason) REFERENCES public.enum_alerting_reason(value) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE ONLY public.alerting
    ADD CONSTRAINT alerting_relative_user_id_fkey FOREIGN KEY (relative_user_id) REFERENCES public."user"(id) ON UPDATE SET NULL ON DELETE SET NULL;
ALTER TABLE ONLY public.alerting
    ADD CONSTRAINT alerting_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.archived_alert
    ADD CONSTRAINT archived_alert_alert_tag_fkey FOREIGN KEY (alert_tag) REFERENCES public.alert_tag(value);
ALTER TABLE ONLY public.archived_alert
    ADD CONSTRAINT archived_alert_closed_by_fkey FOREIGN KEY (closed_by) REFERENCES public.enum_alert_closed_by(value);
ALTER TABLE ONLY public.archived_alert
    ADD CONSTRAINT archived_alert_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.device(id);
ALTER TABLE ONLY public.archived_alert
    ADD CONSTRAINT archived_alert_level_fkey FOREIGN KEY (level) REFERENCES public.enum_alert_level(value);
ALTER TABLE ONLY public.archived_alert
    ADD CONSTRAINT archived_alert_phone_number_id_fkey FOREIGN KEY (phone_number_id) REFERENCES public.phone_number(id);
ALTER TABLE ONLY public.archived_alert
    ADD CONSTRAINT archived_alert_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id);
ALTER TABLE ONLY public.auth_connect_email
    ADD CONSTRAINT auth_connect_email_email_id_fkey FOREIGN KEY (email_id) REFERENCES public.email(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.auth_connect_email
    ADD CONSTRAINT auth_connect_email_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.auth_sign_key
    ADD CONSTRAINT auth_sign_key_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.auth_token
    ADD CONSTRAINT auth_token_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.device(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.auth_token
    ADD CONSTRAINT auth_token_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.device
    ADD CONSTRAINT device_notification_alert_level_fkey FOREIGN KEY (notification_alert_level) REFERENCES public.enum_alert_level(value) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE ONLY public.device
    ADD CONSTRAINT device_preferred_emergency_call_fkey FOREIGN KEY (preferred_emergency_call) REFERENCES public.enum_emergency_call(value) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE ONLY public.device
    ADD CONSTRAINT device_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.email
    ADD CONSTRAINT email_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.message
    ADD CONSTRAINT message_alert_id_fkey FOREIGN KEY (alert_id) REFERENCES public.alert(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.message
    ADD CONSTRAINT message_content_type_fkey FOREIGN KEY (content_type) REFERENCES public.enum_content_type(value) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE ONLY public.message
    ADD CONSTRAINT message_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.device(id) ON UPDATE SET NULL ON DELETE SET NULL;
ALTER TABLE ONLY public.message
    ADD CONSTRAINT message_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON UPDATE SET NULL ON DELETE SET NULL;
ALTER TABLE ONLY public.phone_number
    ADD CONSTRAINT phone_number_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.device(id) ON UPDATE SET NULL ON DELETE SET NULL;
ALTER TABLE ONLY public.phone_number
    ADD CONSTRAINT phone_number_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.relative_invitation
    ADD CONSTRAINT relative_invitation_to_user_id_fkey FOREIGN KEY (to_user_id) REFERENCES public."user"(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.relative_invitation
    ADD CONSTRAINT relative_invitation_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.relative_allow
    ADD CONSTRAINT relative_phone_number_allow_relative_phone_number_id_fkey FOREIGN KEY (relative_id) REFERENCES public.relative(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.relative
    ADD CONSTRAINT relative_phone_number_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.user_avatar
    ADD CONSTRAINT user_avatar_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.user_login_request
    ADD CONSTRAINT user_connect_request_email_id_fkey FOREIGN KEY (email_id) REFERENCES public.email(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.user_login_request
    ADD CONSTRAINT user_connect_request_phone_number_id_fkey FOREIGN KEY (phone_number_id) REFERENCES public.phone_number(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.user_login_request
    ADD CONSTRAINT user_connect_request_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.user_group_member
    ADD CONSTRAINT user_group_member_user_group_id_fkey FOREIGN KEY (user_group_id) REFERENCES public.user_group(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.user_group_member
    ADD CONSTRAINT user_group_member_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.user_login_request
    ADD CONSTRAINT user_login_request_type_fkey FOREIGN KEY (type) REFERENCES public.enum_user_login_request_type(value) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE ONLY public.user_phone_number_relative
    ADD CONSTRAINT user_relative_phone_number_phone_number_id_fkey FOREIGN KEY (phone_number_id) REFERENCES public.phone_number(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE ONLY public.user_phone_number_relative
    ADD CONSTRAINT user_relative_phone_number_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.user_role
    ADD CONSTRAINT user_role_role_fkey FOREIGN KEY (role) REFERENCES public.enum_user_role(value) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE ONLY public.user_role
    ADD CONSTRAINT user_role_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON UPDATE CASCADE ON DELETE CASCADE;
INSERT INTO public.enum_alert_closed_by VALUES ('user');
INSERT INTO public.enum_alert_closed_by VALUES ('auto');
INSERT INTO public.enum_alert_level VALUES ('red');
INSERT INTO public.enum_alert_level VALUES ('yellow');
INSERT INTO public.enum_alert_level VALUES ('green');
INSERT INTO public.enum_alert_state VALUES ('open');
INSERT INTO public.enum_alert_state VALUES ('closed');
INSERT INTO public.enum_alerting_reason VALUES ('around');
INSERT INTO public.enum_alerting_reason VALUES ('relative');
INSERT INTO public.enum_alerting_reason VALUES ('agent');
INSERT INTO public.enum_alerting_reason VALUES ('self');
INSERT INTO public.enum_alerting_reason VALUES ('connect');
INSERT INTO public.enum_content_type VALUES ('text');
INSERT INTO public.enum_content_type VALUES ('audio');
INSERT INTO public.enum_emergency_call VALUES ('voice');
INSERT INTO public.enum_emergency_call VALUES ('sms');
INSERT INTO public.enum_user_login_request_type VALUES ('phone_number');
INSERT INTO public.enum_user_login_request_type VALUES ('email');
INSERT INTO public.enum_user_role VALUES ('admin');
INSERT INTO public.enum_user_role VALUES ('user');
INSERT INTO public.enum_user_role VALUES ('dev');
