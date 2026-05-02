-- ============================================================
-- XP System for TalentPool - Gamification
-- ============================================================
-- Adds XP points, levels, badges, challenges, and rewards system
-- to gamify recruiter activities and increase engagement

-- ============================================================
-- TABLES
-- ============================================================

-- User XP Stats
CREATE TABLE IF NOT EXISTS user_xp_stats (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_xp INTEGER NOT NULL DEFAULT 0,
  total_xp_earned INTEGER NOT NULL DEFAULT 0,
  total_xp_spent INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  xp_to_next_level INTEGER NOT NULL DEFAULT 1000,
  streak_days INTEGER NOT NULL DEFAULT 0,
  last_activity TIMESTAMPTZ,
  last_login DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- XP Activities Log
CREATE TABLE IF NOT EXISTS xp_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  xp_earned INTEGER NOT NULL DEFAULT 0,
  description TEXT NOT NULL,
  reference_id UUID, -- candidate_id, interview_id, etc
  reference_type TEXT, -- 'candidate', 'interview', 'hiring'
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Badges
CREATE TABLE IF NOT EXISTS xp_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  badge_name TEXT NOT NULL UNIQUE,
  badge_icon TEXT NOT NULL,
  badge_color TEXT NOT NULL DEFAULT '#228B22',
  xp_requirement INTEGER NOT NULL DEFAULT 0,
  criteria JSONB NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general', -- 'recruiter', 'interviewer', 'closer'
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- User Badges (Unlocked)
CREATE TABLE IF NOT EXISTS user_badges (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES xp_badges(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, badge_id)
);

-- Weekly/Monthly Challenges
CREATE TABLE IF NOT EXISTS xp_challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenge_name TEXT NOT NULL,
  challenge_type TEXT NOT NULL CHECK (challenge_type IN ('daily', 'weekly', 'monthly', 'one-time')),
  activity_type TEXT NOT NULL,
  target_count INTEGER NOT NULL,
  xp_reward INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User Challenge Progress
CREATE TABLE IF NOT EXISTS user_challenge_progress (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES xp_challenges(id) ON DELETE CASCADE,
  current_progress INTEGER NOT NULL DEFAULT 0,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  xp_claimed BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (user_id, challenge_id)
);

-- Rewards Store
CREATE TABLE IF NOT EXISTS xp_rewards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reward_name TEXT NOT NULL,
  reward_description TEXT,
  xp_cost INTEGER NOT NULL,
  reward_type TEXT NOT NULL CHECK (reward_type IN ('voucher', 'perk', 'badge', 'custom')),
  reward_data JSONB, -- voucher code, perk details, etc
  stock INTEGER,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Redemptions
CREATE TABLE IF NOT EXISTS xp_redemptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_id UUID NOT NULL REFERENCES xp_rewards(id) ON DELETE CASCADE,
  xp_spent INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'fulfilled', 'cancelled')),
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fulfilled_at TIMESTAMPTZ,
  notes TEXT
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_xp_activities_user ON xp_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_activities_created ON xp_activities(created_at);
CREATE INDEX IF NOT EXISTS idx_xp_activities_type ON xp_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_challenge_progress_user ON user_challenge_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_challenge_progress_challenge ON user_challenge_progress(challenge_id);
CREATE INDEX IF NOT EXISTS idx_xp_redemptions_user ON xp_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-update user_xp_stats.updated_at
CREATE OR REPLACE FUNCTION update_xp_stats_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_xp_stats_timestamp
  BEFORE UPDATE ON user_xp_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_xp_stats_timestamp();

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Function: Add XP to user with auto level calculation
CREATE OR REPLACE FUNCTION add_xp_to_user(
  p_user_id UUID,
  p_xp_amount INTEGER,
  p_activity_type TEXT,
  p_description TEXT,
  p_reference_id UUID DEFAULT NULL,
  p_reference_type TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS TABLE(new_xp INTEGER, new_level INTEGER, level_up BOOLEAN) AS $$
DECLARE
  v_old_level INTEGER;
  v_new_xp INTEGER;
  v_new_level INTEGER;
  v_xp_to_next INTEGER;
  v_level_up BOOLEAN := false;
BEGIN
  -- Get old level
  SELECT level INTO v_old_level FROM user_xp_stats WHERE user_id = p_user_id;
  
  -- Insert activity log
  INSERT INTO xp_activities (user_id, activity_type, xp_earned, description, reference_id, reference_type, metadata)
  VALUES (p_user_id, p_activity_type, p_xp_amount, p_description, p_reference_id, p_reference_type, p_metadata);
  
  -- Update user stats
  UPDATE user_xp_stats
  SET 
    current_xp = current_xp + p_xp_amount,
    total_xp_earned = total_xp_earned + p_xp_amount,
    last_activity = NOW()
  WHERE user_id = p_user_id
  RETURNING current_xp INTO v_new_xp;
  
  -- Calculate new level using formula: level = floor(sqrt(total_xp / 1000)) + 1
  v_new_level := FLOOR(SQRT(v_new_xp / 1000.0)) + 1;
  v_xp_to_next := FLOOR(1000 * POWER(1.25, v_new_level));
  
  -- Check if level up
  IF v_new_level > v_old_level THEN
    v_level_up := true;
  END IF;
  
  -- Update level if changed
  UPDATE user_xp_stats
  SET 
    level = v_new_level,
    xp_to_next_level = v_xp_to_next
  WHERE user_id = p_user_id AND level != v_new_level;
  
  -- Update challenge progress
  UPDATE user_challenge_progress ucp
  SET current_progress = ucp.current_progress + 1
  FROM xp_challenges xc
  WHERE ucp.challenge_id = xc.id
    AND ucp.user_id = p_user_id
    AND xc.activity_type = p_activity_type
    AND xc.is_active = true
    AND ucp.is_completed = false;
  
  RETURN QUERY SELECT v_new_xp, v_new_level, v_level_up;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check and return badges to unlock
CREATE OR REPLACE FUNCTION check_badge_unlocks(p_user_id UUID)
RETURNS TABLE(badge_id UUID, badge_name TEXT, badge_icon TEXT, badge_color TEXT, description TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT b.id, b.badge_name, b.badge_icon, b.badge_color, b.description
  FROM xp_badges b
  LEFT JOIN user_badges ub ON b.id = ub.badge_id AND ub.user_id = p_user_id
  WHERE ub.user_id IS NULL  -- Not yet unlocked
    AND b.is_active = true
    AND (
      -- Check total XP requirement
      (SELECT total_xp_earned FROM user_xp_stats WHERE user_id = p_user_id) >= b.xp_requirement
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Unlock badge for user
CREATE OR REPLACE FUNCTION unlock_badge(p_user_id UUID, p_badge_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO user_badges (user_id, badge_id)
  VALUES (p_user_id, p_badge_id)
  ON CONFLICT (user_id, badge_id) DO NOTHING;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Claim challenge reward
CREATE OR REPLACE FUNCTION claim_challenge_reward(p_user_id UUID, p_challenge_id UUID)
RETURNS TABLE(success BOOLEAN, xp_awarded INTEGER, message TEXT) AS $$
DECLARE
  v_challenge xp_challenges%ROWTYPE;
  v_progress user_challenge_progress%ROWTYPE;
BEGIN
  -- Get challenge and progress
  SELECT * INTO v_challenge FROM xp_challenges WHERE id = p_challenge_id;
  SELECT * INTO v_progress FROM user_challenge_progress 
    WHERE user_id = p_user_id AND challenge_id = p_challenge_id;
  
  -- Validate
  IF v_challenge.id IS NULL THEN
    RETURN QUERY SELECT false, 0, 'Challenge not found';
    RETURN;
  END IF;
  
  IF v_progress.current_progress < v_challenge.target_count THEN
    RETURN QUERY SELECT false, 0, 'Challenge not completed yet';
    RETURN;
  END IF;
  
  IF v_progress.xp_claimed THEN
    RETURN QUERY SELECT false, 0, 'Reward already claimed';
    RETURN;
  END IF;
  
  -- Award XP
  UPDATE user_xp_stats
  SET current_xp = current_xp + v_challenge.xp_reward,
      total_xp_earned = total_xp_earned + v_challenge.xp_reward
  WHERE user_id = p_user_id;
  
  -- Mark as claimed
  UPDATE user_challenge_progress
  SET xp_claimed = true,
      completed_at = NOW()
  WHERE user_id = p_user_id AND challenge_id = p_challenge_id;
  
  -- Log activity
  INSERT INTO xp_activities (user_id, activity_type, xp_earned, description, reference_id, reference_type)
  VALUES (p_user_id, 'challenge_completed', v_challenge.xp_reward, 
          CONCAT('Challenge completed: ', v_challenge.challenge_name), 
          p_challenge_id, 'challenge');
  
  RETURN QUERY SELECT true, v_challenge.xp_reward, 'Reward claimed successfully';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Redeem reward
CREATE OR REPLACE FUNCTION redeem_reward(p_user_id UUID, p_reward_id UUID)
RETURNS TABLE(success BOOLEAN, redemption_id UUID, message TEXT) AS $$
DECLARE
  v_reward xp_rewards%ROWTYPE;
  v_user_stats user_xp_stats%ROWTYPE;
  v_redemption_id UUID;
BEGIN
  -- Get reward and user stats
  SELECT * INTO v_reward FROM xp_rewards WHERE id = p_reward_id AND is_active = true;
  SELECT * INTO v_user_stats FROM user_xp_stats WHERE user_id = p_user_id;
  
  -- Validate
  IF v_reward.id IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Reward not found or inactive';
    RETURN;
  END IF;
  
  IF v_user_stats.current_xp < v_reward.xp_cost THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Insufficient XP';
    RETURN;
  END IF;
  
  IF v_reward.stock IS NOT NULL AND v_reward.stock <= 0 THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Reward out of stock';
    RETURN;
  END IF;
  
  -- Deduct XP
  UPDATE user_xp_stats
  SET current_xp = current_xp - v_reward.xp_cost,
      total_xp_spent = total_xp_spent + v_reward.xp_cost
  WHERE user_id = p_user_id;
  
  -- Decrease stock
  IF v_reward.stock IS NOT NULL THEN
    UPDATE xp_rewards SET stock = stock - 1 WHERE id = p_reward_id;
  END IF;
  
  -- Create redemption
  INSERT INTO xp_redemptions (user_id, reward_id, xp_spent, status)
  VALUES (p_user_id, p_reward_id, v_reward.xp_cost, 'pending')
  RETURNING id INTO v_redemption_id;
  
  -- Log activity
  INSERT INTO xp_activities (user_id, activity_type, xp_earned, description, reference_id, reference_type)
  VALUES (p_user_id, 'reward_redeemed', -v_reward.xp_cost, 
          CONCAT('Redeemed: ', v_reward.reward_name), 
          p_reward_id, 'redemption');
  
  RETURN QUERY SELECT true, v_redemption_id, 'Redemption successful';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Initialize XP stats for new user
CREATE OR REPLACE FUNCTION initialize_user_xp(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO user_xp_stats (user_id, current_xp, level, xp_to_next_level)
  VALUES (p_user_id, 0, 1, 1000)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- SEED DATA
-- ============================================================

-- Default Badges
INSERT INTO xp_badges (badge_name, badge_icon, badge_color, xp_requirement, criteria, description, category) VALUES
  ('First Blood', '🎯', '#228B22', 0, '{"activity_type": "candidate_added"}', 'Candidate pertama ditambahkan', 'recruiter'),
  ('Candidate Hunter', '🎯', '#228B22', 500, '{"activity_type": "candidate_added"}', 'Total 500 XP dari adding candidates', 'recruiter'),
  ('Talent Scout', '🔍', '#FFD700', 1000, '{"activity_type": "candidate_added"}', 'Total 1000 XP dari adding candidates', 'recruiter'),
  ('Interview Pro', '🎤', '#87CEEB', 500, '{"activity_type": "interview_completed"}', 'Total 500 XP dari interviews', 'interviewer'),
  ('Closing Master', '🏆', '#FFD700', 1000, '{"activity_type": "candidate_hired"}', 'Total 1000 XP dari hirings', 'closer'),
  ('Speed Demon', '⚡', '#FF4500', 200, '{"activity_type": "fast_response"}', 'Total 200 XP dari fast responses', 'engagement'),
  ('Week Warrior', '💪', '#228B22', 200, '{"activity_type": "weekly_streak"}', 'Total 200 XP dari streaks', 'engagement'),
  ('Level 5', '⭐', '#228B22', 5000, '{}', 'Mencapai Level 5', 'general'),
  ('Level 10', '⭐⭐', '#FFD700', 15000, '{}', 'Mencapai Level 10', 'general'),
  ('Level 20', '⭐⭐⭐', '#FF4500', 50000, '{}', 'Mencapai Level 20', 'general');

-- Weekly Challenges (will be regenerated weekly by cron/function)
INSERT INTO xp_challenges (challenge_name, challenge_type, activity_type, target_count, xp_reward, start_date, end_date) VALUES
  ('Add 10 Candidates This Week', 'weekly', 'candidate_added', 10, 200, DATE_TRUNC('week', NOW()), DATE_TRUNC('week', NOW()) + INTERVAL '6 days'),
  ('Complete 5 Interviews', 'weekly', 'interview_completed', 5, 300, DATE_TRUNC('week', NOW()), DATE_TRUNC('week', NOW()) + INTERVAL '6 days'),
  ('Hire 2 Candidates', 'weekly', 'candidate_hired', 2, 500, DATE_TRUNC('week', NOW()), DATE_TRUNC('week', NOW()) + INTERVAL '6 days'),
  ('Daily Login (5 days)', 'weekly', 'daily_login', 5, 150, DATE_TRUNC('week', NOW()), DATE_TRUNC('week', NOW()) + INTERVAL '6 days');

-- Rewards Store
INSERT INTO xp_rewards (reward_name, reward_description, xp_cost, reward_type, reward_data, stock, image_url) VALUES
  ('Coffee Voucher Rp 50K', 'Voucher kopi di coffee shop partner', 2000, 'voucher', '{"code": "COFFEE50", "vendor": "Kopi Kenangan"}', 50, '/rewards/coffee.png'),
  ('Lunch Voucher Rp 100K', 'Voucher makan siang', 4000, 'voucher', '{"code": "LUNCH100", "vendor": "Multiple"}', 30, '/rewards/lunch.png'),
  ('Online Course Access', 'Akses course LinkedIn Learning 1 bulan', 8000, 'perk', '{"platform": "LinkedIn Learning", "duration": "1 month"}', 10, '/rewards/course.png'),
  ('Extra Day Off', '1 hari cuti tambahan', 15000, 'perk', '{"type": "paid_leave", "days": 1}', 5, '/rewards/off.png'),
  ('Gift Card Rp 500K', 'Gift card general', 20000, 'voucher', '{"code": "GIFT500", "vendor": "Multiple"}', 3, '/rewards/gift.png');

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE user_xp_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_challenge_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_redemptions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own data
CREATE POLICY "Users can view own xp stats" ON user_xp_stats
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own activities" ON xp_activities
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own badges" ON user_badges
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own challenge progress" ON user_challenge_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own redemptions" ON xp_redemptions
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: HRD/Admin/Direksi can view all xp stats (for leaderboard)
CREATE POLICY "HRD can view all xp stats" ON user_xp_stats
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role IN ('hrd', 'direksi')
    )
  );

-- Policy: Everyone can view active challenges and rewards
CREATE POLICY "Everyone can view challenges" ON xp_challenges
  FOR SELECT USING (is_active = true);

CREATE POLICY "Everyone can view rewards" ON xp_rewards
  FOR SELECT USING (is_active = true);

-- Policy: Users can create redemptions
CREATE POLICY "Users can create redemptions" ON xp_redemptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- Initialize XP stats for existing users
-- ============================================================

-- This will create XP stats for all existing users
INSERT INTO user_xp_stats (user_id, current_xp, level, xp_to_next_level)
SELECT id, 0, 1, 1000
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================
-- Comments
-- ============================================================

COMMENT ON TABLE user_xp_stats IS 'User XP points, levels, and streaks';
COMMENT ON TABLE xp_activities IS 'Log of all XP-earning activities';
COMMENT ON TABLE xp_badges IS 'Available badges/achievements';
COMMENT ON TABLE user_badges IS 'Badges unlocked by users';
COMMENT ON TABLE xp_challenges IS 'Active challenges/quests';
COMMENT ON TABLE user_challenge_progress IS 'User progress on challenges';
COMMENT ON TABLE xp_rewards IS 'Rewards store items';
COMMENT ON TABLE xp_redemptions IS 'Reward redemption history';

COMMENT ON FUNCTION add_xp_to_user IS 'Add XP to user with auto level calculation and challenge progress update';
COMMENT ON FUNCTION check_badge_unlocks IS 'Check which badges user can unlock';
COMMENT ON FUNCTION unlock_badge IS 'Unlock a badge for user';
COMMENT ON FUNCTION claim_challenge_reward IS 'Claim XP reward for completed challenge';
COMMENT ON FUNCTION redeem_reward IS 'Redeem reward from store with XP';
COMMENT ON FUNCTION initialize_user_xp IS 'Initialize XP stats for new user';
