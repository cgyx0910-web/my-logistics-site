-- 兑换时扣减库存：RLS 仅允许管理员 UPDATE auction_products，普通用户扣库存被拒导致「库存扣减失败」
-- 用 SECURITY DEFINER 的 RPC 在库内原子扣减/回滚库存，绕过 RLS

CREATE OR REPLACE FUNCTION public.decrement_auction_product_stock(p_product_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  UPDATE public.auction_products
  SET stock = stock - 1
  WHERE id = p_product_id AND stock >= 1
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

COMMENT ON FUNCTION public.decrement_auction_product_stock(uuid) IS '兑换时扣减库存，仅当 stock>=1 时扣 1；供 API 调用，绕过 RLS';

-- 回滚库存（创建订单失败时用）
CREATE OR REPLACE FUNCTION public.increment_auction_product_stock(p_product_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  UPDATE public.auction_products
  SET stock = stock + 1
  WHERE id = p_product_id
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

COMMENT ON FUNCTION public.increment_auction_product_stock(uuid) IS '回滚库存（兑换流程失败时）；供 API 调用，绕过 RLS';
