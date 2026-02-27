-- ============================================================
-- 运费审计日志 + 多阶梯计费支持
-- 1. shipping_rate_logs：每次批量更新/调价后记录
-- 2. shipping_rates：增加 max_weight，支持多阶梯（0-20kg / 21-100kg）
-- ============================================================

-- 1. 审计日志表
CREATE TABLE IF NOT EXISTS public.shipping_rate_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  operated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  action TEXT NOT NULL CHECK (action IN ('bulk_upload', 'percent_adjust')),
  countries TEXT[],
  file_backup TEXT,
  summary JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.shipping_rate_logs IS '运费批量更新/调价审计：操作人、时间、涉及国家、文件备份';
COMMENT ON COLUMN public.shipping_rate_logs.action IS 'bulk_upload=CSV批量上传, percent_adjust=全路线涨跌幅调价';
COMMENT ON COLUMN public.shipping_rate_logs.file_backup IS '上传的 CSV 原始内容（用于追溯）';
COMMENT ON COLUMN public.shipping_rate_logs.summary IS '本次操作摘要，如 { "added": 5, "updated": 3, "countries": ["tw","th"] }';

ALTER TABLE public.shipping_rate_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "仅管理员可读 shipping_rate_logs"
  ON public.shipping_rate_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "仅管理员可插 shipping_rate_logs"
  ON public.shipping_rate_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 2. shipping_rates 多阶梯：增加 max_weight，唯一约束改为 (country, shipping_method, min_weight)
ALTER TABLE public.shipping_rates
  ADD COLUMN IF NOT EXISTS max_weight NUMERIC(10, 3);

COMMENT ON COLUMN public.shipping_rates.max_weight IS '重量上限(kg)，NULL 表示不设上限；与 min_weight 构成阶梯区间';

ALTER TABLE public.shipping_rates
  DROP CONSTRAINT IF EXISTS shipping_rates_country_shipping_method_key;

CREATE UNIQUE INDEX IF NOT EXISTS shipping_rates_country_method_min_weight_key
  ON public.shipping_rates (country, shipping_method, min_weight);

-- 管理员可写 shipping_rates（批量上传 / 调价）
CREATE POLICY "仅管理员可插改 shipping_rates"
  ON public.shipping_rates FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
