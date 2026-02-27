-- ============================================================
-- 订单结算：原子加积分 RPC，防重复结算
-- 积分公式：发放积分 = floor(订单实付金额 shipping_fee * 1)，即 1:1 向下取整
-- ============================================================

-- 原子加积分：在 profiles 上累加 points，避免读后写竞态
CREATE OR REPLACE FUNCTION public.add_user_points(p_user_id UUID, p_points INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_points IS NULL OR p_points < 0 THEN
    RETURN;
  END IF;
  UPDATE public.profiles
  SET points = points + p_points
  WHERE id = p_user_id;
END;
$$;

COMMENT ON FUNCTION public.add_user_points(UUID, INTEGER) IS '原子增加用户积分，供管理员结算订单时调用';

-- 仅允许已认证用户调用（实际由 API 用管理员 JWT 调用，RLS 不约束 function 内部）
GRANT EXECUTE ON FUNCTION public.add_user_points(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_user_points(UUID, INTEGER) TO service_role;
