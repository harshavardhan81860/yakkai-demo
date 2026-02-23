-- backend/app/db_creation/12_notifications_settings.sql

CREATE TABLE IF NOT EXISTS data.user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES data.users(id) ON DELETE CASCADE,
    notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    in_app_alerts_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    theme VARCHAR NOT NULL DEFAULT 'dark',
    currency VARCHAR NOT NULL DEFAULT 'USD',
    UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS data.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES data.users(id) ON DELETE CASCADE,
    title VARCHAR NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON data.user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON data.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON data.notifications(is_read);

-- Ensure existing users have settings (Optional but safe initialization)
INSERT INTO data.user_settings (user_id)
SELECT id FROM data.users
ON CONFLICT (user_id) DO NOTHING;
