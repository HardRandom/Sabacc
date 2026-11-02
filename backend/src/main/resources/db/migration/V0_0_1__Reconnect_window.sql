ALTER TABLE session_rooms
    ADD COLUMN player_first_left_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN player_second_left_at TIMESTAMP WITH TIME ZONE;
