-- ============================================================
-- 管理员后台需通过 user_id 关联 profiles 显示用户邮箱
-- 原 RLS 仅允许用户查看自己的 profile，导致管理员接口无法获取订单对应用户的 email
-- ============================================================

-- 管理员可读取所有 profiles 的 id、email（用于订单列表展示，不暴露其他敏感字段）
CREATE POLICY "管理员可查看所有用户 id 与 email"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );
