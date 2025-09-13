-- Create scores table with unique nicknames
CREATE TABLE scores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nickname TEXT NOT NULL UNIQUE,
    score INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique index for case-insensitive nickname checking
CREATE UNIQUE INDEX idx_nickname_unique ON scores (LOWER(nickname));

-- Policy to allow anonymous users to update scores
CREATE POLICY "Allow anonymous updates" ON scores
    FOR UPDATE TO anon
    USING (true)
    WITH CHECK (true);

-- Enable Row Level Security
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;

-- Policy to allow anonymous users to insert scores
CREATE POLICY "Allow anonymous inserts" ON scores
    FOR INSERT TO anon
    WITH CHECK (true);

-- Policy to allow anonymous users to read scores
CREATE POLICY "Allow anonymous reads" ON scores
    FOR SELECT TO anon
    USING (true);

-- Create index for better performance on leaderboard queries
CREATE INDEX idx_scores_score_desc ON scores (score DESC, created_at DESC);

-- Add unique constraint and update policy if table already exists
-- ALTER TABLE scores ADD CONSTRAINT unique_nickname UNIQUE (nickname);
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_nickname_unique ON scores (LOWER(nickname));
-- CREATE POLICY IF NOT EXISTS "Allow anonymous updates" ON scores FOR UPDATE TO anon USING (true) WITH CHECK (true);