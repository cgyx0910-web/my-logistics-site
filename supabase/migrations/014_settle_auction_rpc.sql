-- ============================================================
-- 竞拍结拍：确定最高出价者、退还未中标者积分、生成物流订单
-- ============================================================

CREATE OR REPLACE FUNCTION public.settle_auction_product(p_product_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product RECORD;
  v_winner RECORD;
  v_bid RECORD;
  v_order_id UUID;
BEGIN
  SELECT id, name, is_auction, shipping_fee, settled_at
  INTO v_product
  FROM public.auction_products
  WHERE id = p_product_id
  FOR UPDATE;

  IF v_product.id IS NULL THEN
    RAISE EXCEPTION 'product not found';
  END IF;
  IF NOT v_product.is_auction THEN
    RAISE EXCEPTION 'not an auction product';
  END IF;
  IF v_product.settled_at IS NOT NULL THEN
    RAISE EXCEPTION 'already settled';
  END IF;

  -- 最高出价者（同分先出价者优先）
  SELECT id, user_id, bid_points
  INTO v_winner
  FROM public.auction_bids
  WHERE product_id = p_product_id
  ORDER BY bid_points DESC, created_at ASC
  LIMIT 1;

  IF v_winner.id IS NULL THEN
    RAISE EXCEPTION 'no bids';
  END IF;

  -- 退还未中标者积分
  FOR v_bid IN
    SELECT id, user_id, bid_points
    FROM public.auction_bids
    WHERE product_id = p_product_id AND id <> v_winner.id
  LOOP
    PERFORM add_user_points_with_history(
      v_bid.user_id,
      v_bid.bid_points,
      'auction_refund',
      v_bid.id::TEXT
    );
  END LOOP;

  -- 为中标者生成物流订单
  INSERT INTO public.shipping_orders (
    user_id, status, shipping_fee, points_awarded,
    source_type, auction_product_id, auction_bid_id, cargo_details
  )
  VALUES (
    v_winner.user_id,
    '待付款',
    COALESCE(v_product.shipping_fee::NUMERIC(12,2), 0),
    0,
    'auction_win',
    p_product_id,
    v_winner.id,
    '竞拍中标：' || v_product.name
  )
  RETURNING id INTO v_order_id;

  -- 标记商品已结拍
  UPDATE public.auction_products
  SET winning_bid_id = v_winner.id, settled_at = now()
  WHERE id = p_product_id;

  RETURN v_order_id;
END;
$$;

COMMENT ON FUNCTION public.settle_auction_product(UUID) IS '竞拍结拍：退还未中标者积分、为最高出价者生成物流订单';

GRANT EXECUTE ON FUNCTION public.settle_auction_product(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.settle_auction_product(UUID) TO service_role;
