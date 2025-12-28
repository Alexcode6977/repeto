-- Migration: Add subscription system to profiles and troupes
-- Run this in Supabase SQL Editor

-- =============================================
-- 1. ADD SUBSCRIPTION FIELDS TO PROFILES
-- =============================================

-- Add new subscription columns
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free' 
    CHECK (subscription_tier IN ('free', 'solo_pro', 'troupe')),
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive' 
    CHECK (subscription_status IN ('active', 'past_due', 'canceled', 'inactive', 'trialing')),
ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS personal_script_count INTEGER DEFAULT 0;

-- Migrate existing premium users to solo_pro
UPDATE profiles 
SET subscription_tier = 'solo_pro', 
    subscription_status = 'active' 
WHERE is_premium = true;

-- Create index for Stripe customer lookup
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id 
ON profiles(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

-- =============================================
-- 2. ADD SUBSCRIPTION FIELDS TO TROUPES
-- =============================================

ALTER TABLE troupes
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'troupe'
    CHECK (subscription_tier IN ('troupe', 'troupe_xl')),
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive'
    CHECK (subscription_status IN ('active', 'past_due', 'canceled', 'inactive', 'trialing')),
ADD COLUMN IF NOT EXISTS max_members INTEGER; -- NULL = unlimited

-- Create index for Stripe lookup on troupes
CREATE INDEX IF NOT EXISTS idx_troupes_stripe_customer_id 
ON troupes(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

-- =============================================
-- 3. CREATE SUBSCRIPTION HISTORY TABLE (for auditing)
-- =============================================

CREATE TABLE IF NOT EXISTS subscription_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    troupe_id UUID REFERENCES troupes(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- 'created', 'updated', 'canceled', 'renewed', 'payment_failed'
    stripe_event_id TEXT,
    previous_tier TEXT,
    new_tier TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for user subscription history lookup
CREATE INDEX IF NOT EXISTS idx_subscription_events_user_id 
ON subscription_events(user_id);

-- RLS for subscription_events (only the user can see their history)
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription events"
ON subscription_events FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Service role can insert (from webhooks)
CREATE POLICY "Service role can insert subscription events"
ON subscription_events FOR INSERT
TO service_role
WITH CHECK (true);

-- =============================================
-- 4. HELPER FUNCTION: Check if user has active subscription
-- =============================================

CREATE OR REPLACE FUNCTION has_active_subscription(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_tier TEXT;
    user_status TEXT;
BEGIN
    SELECT subscription_tier, subscription_status 
    INTO user_tier, user_status
    FROM profiles 
    WHERE id = user_uuid;
    
    -- User has direct subscription
    IF user_tier IN ('solo_pro', 'troupe') AND user_status = 'active' THEN
        RETURN true;
    END IF;
    
    -- Check if user is member of a troupe with active subscription
    IF EXISTS (
        SELECT 1 
        FROM troupe_members tm
        JOIN troupes t ON tm.troupe_id = t.id
        WHERE tm.user_id = user_uuid 
        AND t.subscription_status = 'active'
    ) THEN
        RETURN true;
    END IF;
    
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 5. HELPER FUNCTION: Get effective tier for a user (considering troupe membership)
-- =============================================

CREATE OR REPLACE FUNCTION get_effective_tier(user_uuid UUID, troupe_uuid UUID DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
    user_tier TEXT;
    user_status TEXT;
    troupe_status TEXT;
BEGIN
    -- Get user's own tier
    SELECT subscription_tier, subscription_status 
    INTO user_tier, user_status
    FROM profiles 
    WHERE id = user_uuid;
    
    -- If user has active solo_pro or troupe, return it
    IF user_tier IN ('solo_pro', 'troupe') AND user_status = 'active' THEN
        RETURN user_tier;
    END IF;
    
    -- If troupe_uuid is provided, check that specific troupe
    IF troupe_uuid IS NOT NULL THEN
        SELECT subscription_status INTO troupe_status
        FROM troupes WHERE id = troupe_uuid;
        
        IF troupe_status = 'active' THEN
            RETURN 'troupe';
        END IF;
    ELSE
        -- Check any troupe the user belongs to
        IF EXISTS (
            SELECT 1 
            FROM troupe_members tm
            JOIN troupes t ON tm.troupe_id = t.id
            WHERE tm.user_id = user_uuid 
            AND t.subscription_status = 'active'
        ) THEN
            RETURN 'troupe';
        END IF;
    END IF;
    
    RETURN 'free';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- DONE! 
-- Run this migration, then verify with:
-- SELECT * FROM profiles LIMIT 5;
-- SELECT * FROM troupes LIMIT 5;
-- =============================================
