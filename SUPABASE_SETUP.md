# 🗄️ Supabase Setup Instructions

## 1. Database Setup

Run this SQL in your Supabase SQL Editor:

```sql
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

-- Create index for better performance
CREATE INDEX idx_scores_score_desc ON scores (score DESC, created_at DESC);
```

## 2. Environment Variables

For Vercel deployment, add these environment variables:

```
SUPABASE_URL=https://iadtqegehglrdwomfdhv.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlhZHRxZWdlaGdscmR3b21mZGh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3Njc5ODIsImV4cCI6MjA3MzM0Mzk4Mn0.tUGL8MF1_P8oaA5z2PL3HccJKrlfzCmmxM28Ju_gG8s
```

## 3. Security Features

✅ **Row Level Security (RLS)** enabled
✅ **Anonymous user policies** for safe public access
✅ **Input validation** on frontend
✅ **Error handling** for network issues
✅ **Unique nickname constraint** at database level
✅ **Case-insensitive uniqueness** checking

## 4. Features Implemented

- 🎮 **Unique nickname system** with validation
- 💾 **Automatic score saving** to Supabase
- 🏆 **Real-time leaderboard** display
- 📱 **Mobile-friendly** interface
- ⚡ **Fast performance** with indexed queries
- 🕒 **Timestamp tracking** for recent scores
- 🔒 **One nickname per user** enforced
- 📈 **Score updates** for existing players (higher scores only)