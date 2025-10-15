-- Create site_content table for editable content
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS site_content (
    id BIGSERIAL PRIMARY KEY,
    page TEXT UNIQUE NOT NULL,
    content TEXT NOT NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (safe - only removes policies, not data)
DROP POLICY IF EXISTS "Allow everyone to read site content" ON site_content;
DROP POLICY IF EXISTS "Allow admins to manage site content" ON site_content;

-- Allow everyone to read site content
CREATE POLICY "Allow everyone to read site content" ON site_content
FOR SELECT TO authenticated
USING (true);

-- Allow only admins to insert/update site content
CREATE POLICY "Allow admins to manage site content" ON site_content
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM admins
        WHERE admins.user_id = auth.uid()
    )
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS site_content_page_idx ON site_content(page);

-- Insert initial empty guidelines entry (optional)
INSERT INTO site_content (page, content, updated_at)
VALUES ('guidelines', '<p>Guidelines will be added soon by the admin team.</p>', NOW())
ON CONFLICT (page) DO NOTHING;
