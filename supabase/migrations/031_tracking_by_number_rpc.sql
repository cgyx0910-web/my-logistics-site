-- 按物流单号公开查询订单与轨迹（仅返回该单号对应订单的 minimal 信息 + 轨迹，供首页/物流查询页使用）
CREATE OR REPLACE FUNCTION public.get_tracking_by_number(p_tracking_number text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id uuid;
  v_tracking_number text;
  v_status text;
  v_logs json;
BEGIN
  IF p_tracking_number IS NULL OR trim(p_tracking_number) = '' THEN
    RETURN json_build_object('found', false);
  END IF;

  SELECT id, tracking_number, status
  INTO v_order_id, v_tracking_number, v_status
  FROM public.shipping_orders
  WHERE tracking_number IS NOT NULL
    AND trim(upper(tracking_number)) = trim(upper(p_tracking_number))
  LIMIT 1;

  IF v_order_id IS NULL THEN
    RETURN json_build_object('found', false);
  END IF;

  SELECT coalesce(
    json_agg(json_build_object(
      'id', id,
      'status_title', status_title,
      'location', location,
      'description', description,
      'created_at', created_at
    ) ORDER BY created_at DESC),
    '[]'::json
  ) INTO v_logs
  FROM public.order_tracking_logs
  WHERE order_id = v_order_id;

  RETURN json_build_object(
    'found', true,
    'order', json_build_object(
      'id', v_order_id,
      'tracking_number', v_tracking_number,
      'status', v_status
    ),
    'logs', v_logs
  );
END;
$$;

COMMENT ON FUNCTION public.get_tracking_by_number(text) IS '按物流单号查询订单与轨迹（公开，仅返回该单号对应一条订单的 minimal 信息）';

GRANT EXECUTE ON FUNCTION public.get_tracking_by_number(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_tracking_by_number(text) TO authenticated;
