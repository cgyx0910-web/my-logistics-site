-- ============================================================
-- 修复 profiles 的「管理员可查看所有用户」策略导致的无限递归
-- 原因：USING 子句中 SELECT role FROM profiles 会再次触发同一策略
-- 解决：用独立表 admin_user_ids 存管理员 id，策略只查该表
-- ============================================================

-- 1. 存管理员 user_id 的表（策略中只查此表，不查 profiles，避免递归）
CREATE TABLE IF NOT EXISTS public.admin_user_ids (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
);

COMMENT ON TABLE public.admin_user_ids IS '管理员 user_id 列表，供 RLS 策略判断用，避免在 profiles 策略中查 profiles';

ALTER TABLE public.admin_user_ids ENABLE ROW LEVEL SECURITY;

-- 允许已登录用户读取（仅用于策略判断「当前用户是否在列表中」，不在此表内再查本表，避免递归）
CREATE POLICY "已登录可读 admin_user_ids"
  ON public.admin_user_ids FOR SELECT
  TO authenticated
  USING (true);

-- 2. 从 profiles 同步当前 role='admin' 的用户到 admin_user_ids（一次性）
INSERT INTO public.admin_user_ids (user_id)
  SELECT id FROM public.profiles WHERE role = 'admin'
  ON CONFLICT (user_id) DO NOTHING;

-- 3. 删除会递归的旧策略
DROP POLICY IF EXISTS "管理员可查看所有用户 id 与 email" ON public.profiles;

-- 4. 新策略：仅当 auth.uid() 在 admin_user_ids 中时，可查看所有 profiles 行
CREATE POLICY "管理员可查看所有用户 id 与 email"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.admin_user_ids WHERE user_id = auth.uid())
  );

-- 5. 保持 admin_user_ids 与 profiles.role 同步：profile 被设为 admin 时加入，取消时移除
CREATE OR REPLACE FUNCTION public.sync_admin_user_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'admin' THEN
    INSERT INTO public.admin_user_ids (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
  ELSIF (OLD.role = 'admin' AND (NEW.role IS NULL OR NEW.role <> 'admin')) THEN
    DELETE FROM public.admin_user_ids WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS sync_admin_user_id_trigger ON public.profiles;
CREATE TRIGGER sync_admin_user_id_trigger
  AFTER INSERT OR UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_admin_user_id();
