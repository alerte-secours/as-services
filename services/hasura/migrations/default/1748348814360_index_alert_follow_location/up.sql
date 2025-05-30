CREATE INDEX ON alert(device_id)
  WHERE state = 'open'
    AND follow_location = TRUE;
