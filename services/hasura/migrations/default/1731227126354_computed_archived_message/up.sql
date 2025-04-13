CREATE FUNCTION public.computed_archived_message__avatar_image_file_uuid(message_row public.archived_message) RETURNS uuid
    LANGUAGE sql STABLE
    AS $$
  SELECT "image_file_uuid" FROM "user_avatar" WHERE "user_id" = message_row.user_id
$$;
CREATE FUNCTION public.computed_archived_message__username(message_row public.archived_message) RETURNS text
    LANGUAGE sql STABLE
    AS $$
  SELECT COALESCE("username",'') FROM "user" WHERE "id" = message_row.user_id
$$;
