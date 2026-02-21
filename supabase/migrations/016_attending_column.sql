-- Migration 016: Add attending column to profiles
-- Tracks whether a user is attending the Wednesday meeting
-- null = not yet answered, true = attending, false = not attending

ALTER TABLE profiles ADD COLUMN attending BOOLEAN;
