-- Temporary access codes for SMS-based login
-- Admin generates a 6-digit code, sends via SMS, user enters it on login page

CREATE TABLE temp_access_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast code lookup
CREATE INDEX idx_temp_access_codes_code ON temp_access_codes(code);
CREATE INDEX idx_temp_access_codes_user_id ON temp_access_codes(user_id);

-- Enable RLS (admin client bypasses RLS, so no policies needed for now)
ALTER TABLE temp_access_codes ENABLE ROW LEVEL SECURITY;
