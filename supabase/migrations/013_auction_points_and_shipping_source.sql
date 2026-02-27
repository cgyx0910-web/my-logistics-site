-- ============================================================
-- 淘货功能增强：is_auction/end_time、物流订单来源、积分历史、扣减/发放 RPC
-- ============================================================

-- 1. auction_products：是否竞拍、竞拍结束时间、结拍信息
ALTER TABLE public.auction_products
  ADD COLUMN IF NOT EXISTS is_auction BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS end_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS winning_bid_id UUID REFERENCES public.auction_bids(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS settled_at TIMESTAMPTZ;

COMMENT ON COLUMN public.auction_products.is_auction IS '是否积分竞拍（否则为 0 元领/直拍）';
COMMENT ON COLUMN public.auction_products.end_time IS '竞拍结束时间（仅竞拍商品使用）';
COMMENT ON COLUMN public.auction_products.winning_bid_id IS '结拍后中标出价记录 ID';
COMMENT ON COLUMN public.auction_products.settled_at IS '结拍时间';

-- 根据现有 tag 回填 is_auction
UPDATE public.auction_products
SET is_auction = (tag = '积分竞拍')
WHERE tag IS NOT NULL AND is_auction = false;

-- 2. shipping_orders：来源类型与淘货关联
ALTER TABLE public.shipping_orders
  ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'logistics',
  ADD COLUMN IF NOT EXISTS auction_product_id UUID REFERENCES public.auction_products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS auction_bid_id UUID REFERENCES public.auction_bids(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.shipping_orders.source_type IS '订单来源：logistics=普通物流, auction_exchange=积分兑换, auction_win=竞拍中标';
COMMENT ON COLUMN public.shipping_orders.auction_product_id IS '来源为淘货时关联的商品 ID';
COMMENT ON COLUMN public.shipping_orders.auction_bid_id IS '来源为竞拍中标时关联的出价 ID';

-- 3. 积分历史表
CREATE TABLE IF NOT EXISTS public.point_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL,
  ref_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.point_history IS '积分变动历史：amount 正为增加、负为扣减';
COMMENT ON COLUMN public.point_history.type IS '类型：sign_in, order_settle, auction_bid, auction_exchange, auction_refund';
COMMENT ON COLUMN public.point_history.ref_id IS '关联 ID（如 order_id, bid_id）';

CREATE INDEX IF NOT EXISTS idx_point_history_user_id ON public.point_history(user_id);
CREATE INDEX IF NOT EXISTS idx_point_history_created_at ON public.point_history(created_at DESC);

ALTER TABLE public.point_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "用户只能查看自己的积分历史"
  ON public.point_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 用户仅能为自己插入（扣积分 RPC）；管理员可为任意用户插入（发放积分等）
CREATE POLICY "用户或管理员可插入积分历史"
  ON public.point_history FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- 4. 原子扣积分并写入历史（扣减）
CREATE OR REPLACE FUNCTION public.deduct_user_points(
  p_user_id UUID,
  p_points INTEGER,
  p_type TEXT,
  p_ref_id TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  IF p_points IS NULL OR p_points <= 0 THEN
    RAISE EXCEPTION 'invalid points';
  END IF;
  UPDATE public.profiles
  SET points = points - p_points
  WHERE id = p_user_id AND points >= p_points;
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RAISE EXCEPTION 'insufficient points';
  END IF;
  INSERT INTO public.point_history (user_id, amount, type, ref_id)
  VALUES (p_user_id, -p_points, p_type, p_ref_id);
END;
$$;

COMMENT ON FUNCTION public.deduct_user_points(UUID, INTEGER, TEXT, TEXT) IS '原子扣减用户积分并写入积分历史';

GRANT EXECUTE ON FUNCTION public.deduct_user_points(UUID, INTEGER, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_user_points(UUID, INTEGER, TEXT, TEXT) TO service_role;

-- 5. 原子加积分并写入历史（发放）
CREATE OR REPLACE FUNCTION public.add_user_points_with_history(
  p_user_id UUID,
  p_points INTEGER,
  p_type TEXT,
  p_ref_id TEXT DEFAULT NULL
)
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
  INSERT INTO public.point_history (user_id, amount, type, ref_id)
  VALUES (p_user_id, p_points, p_type, p_ref_id);
END;
$$;

COMMENT ON FUNCTION public.add_user_points_with_history(UUID, INTEGER, TEXT, TEXT) IS '原子增加用户积分并写入积分历史';

GRANT EXECUTE ON FUNCTION public.add_user_points_with_history(UUID, INTEGER, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_user_points_with_history(UUID, INTEGER, TEXT, TEXT) TO service_role;
