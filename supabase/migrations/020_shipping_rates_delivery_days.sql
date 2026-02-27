-- 运费表增加「时效」字段，用于行内编辑与展示
ALTER TABLE public.shipping_rates
  ADD COLUMN IF NOT EXISTS delivery_days TEXT;

COMMENT ON COLUMN public.shipping_rates.delivery_days IS '时效描述，如 3-5天、12-15天';
