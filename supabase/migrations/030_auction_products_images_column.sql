-- auction_products 增加多图字段 images（与 image_url 并存，前台优先用 images[1]）
ALTER TABLE public.auction_products
  ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT NULL;

COMMENT ON COLUMN public.auction_products.images IS '多图 URL 列表，首张可与 image_url 并存；前台优先用 images[0]';
