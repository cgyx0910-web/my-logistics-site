-- 淘货商品：已登录用户需能读取商品信息（兑换/出价接口使用 authenticated 客户端）
-- 原策略仅 "TO anon" 可读，带 Bearer 的请求以 authenticated 身份查询会得到 0 行，导致「商品不存在」
CREATE POLICY "允许已登录用户读取 auction_products"
  ON public.auction_products FOR SELECT
  TO authenticated
  USING (true);
