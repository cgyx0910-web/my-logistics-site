-- 淘货商品：上架/下架开关
ALTER TABLE public.auction_products
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.auction_products.is_active IS '是否上架展示；false=已下架，前台不展示';

-- 管理员可增删改淘货商品
CREATE POLICY "仅管理员可插改删 auction_products"
  ON public.auction_products FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
