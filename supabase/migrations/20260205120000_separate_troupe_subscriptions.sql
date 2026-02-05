-- Downgrade profiles that were incorrectly upgraded to 'troupe' tier
-- This separates the Personal vs Troupe subscription logic
-- The 'troupe' tier should only exist on the 'troupes' table, not 'profiles'
UPDATE profiles 
SET subscription_tier = 'free', 
    subscription_status = 'inactive', 
    stripe_subscription_id = NULL 
WHERE subscription_tier = 'troupe';
