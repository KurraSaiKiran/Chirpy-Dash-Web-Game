-- Create scores table
CREATE TABLE scores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nickname TEXT NOT NULL,
    score INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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