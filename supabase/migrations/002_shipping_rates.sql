-- ============================================================
-- 智能运费：按国家 + 运输方式定价
-- 1. 新建 shipping_rates 表
-- 2. 停用 site_settings 中旧的单一运费键（freight_tw / freight_th / freight_my 等）
-- ============================================================

-- 1. 运费单价表：国家 + 运输方式 -> 单价
CREATE TABLE IF NOT EXISTS public.shipping_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country TEXT NOT NULL,
  shipping_method TEXT NOT NULL,
  unit_price NUMERIC(12, 2) NOT NULL,
  min_weight NUMERIC(10, 3) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'CNY',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (country, shipping_method)
);

COMMENT ON TABLE public.shipping_rates IS '按国家与运输方式维度的运费单价';
COMMENT ON COLUMN public.shipping_rates.country IS '国家代码，如 my, th, tw, kh, id';
COMMENT ON COLUMN public.shipping_rates.shipping_method IS '运输方式：空运特快、海运普货、海运小包';
COMMENT ON COLUMN public.shipping_rates.unit_price IS '单价（元/kg）';
COMMENT ON COLUMN public.shipping_rates.min_weight IS '起运重（kg）';
COMMENT ON COLUMN public.shipping_rates.currency IS '币种，如 CNY';

ALTER TABLE public.shipping_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "允许匿名读取 shipping_rates"
  ON public.shipping_rates FOR SELECT TO anon USING (true);

CREATE TRIGGER shipping_rates_updated_at
  BEFORE UPDATE ON public.shipping_rates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. 停用 site_settings 中旧的各国单一运费键（不再用于运费计算器）
DELETE FROM public.site_settings
WHERE key IN (
  'freight_tw', 'freight_th', 'freight_my', 'freight_kh', 'freight_id', 'freight_default'
);

-- 3. 初始测试数据
INSERT INTO public.shipping_rates (country, shipping_method, unit_price, min_weight, currency) VALUES
  ('my', '海运小包', 10, 0, 'CNY'),
  ('my', '空运特快', 25, 0, 'CNY'),
  ('th', '海运普货', 8, 0, 'CNY'),
  ('th', '空运特快', 22, 0, 'CNY')
ON CONFLICT (country, shipping_method) DO UPDATE SET
  unit_price = EXCLUDED.unit_price,
  min_weight = EXCLUDED.min_weight,
  currency = EXCLUDED.currency,
  updated_at = now();
