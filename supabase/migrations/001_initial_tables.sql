-- ============================================================
-- 物流站点数据库表结构
-- 在 Supabase Dashboard -> SQL Editor 中执行此脚本
-- ============================================================

-- 1. site_settings：站点配置（体积重系数、各国运费、签到积分等）
CREATE TABLE IF NOT EXISTS public.site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.site_settings IS '站点配置表，key-value 形式存储';
COMMENT ON COLUMN public.site_settings.key IS '配置键名，如 volume_weight_divisor, freight_tw';
COMMENT ON COLUMN public.site_settings.value IS '配置值，存为字符串，应用层解析';

-- 2. auction_products：积分淘货商品
CREATE TABLE IF NOT EXISTS public.auction_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  points_required INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  stock INTEGER NOT NULL DEFAULT 0,
  tag TEXT,
  button_text TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.auction_products IS '积分淘货商品表';
COMMENT ON COLUMN public.auction_products.tag IS '展示标签，如 0元领、积分竞拍';
COMMENT ON COLUMN public.auction_products.button_text IS '按钮文案，如 立即兑换、立即出价';

-- 3. logistics_stories：物流故事
CREATE TABLE IF NOT EXISTS public.logistics_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  likes INTEGER NOT NULL DEFAULT 0,
  reads_display TEXT,
  image_url TEXT,
  placeholder_icon TEXT,
  placeholder_bg TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.logistics_stories IS '客户物流故事内容表';
COMMENT ON COLUMN public.logistics_stories.reads_display IS '阅读量展示文案，如 1.2k、890';

-- 启用 RLS（按需可再细化策略）
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logistics_stories ENABLE ROW LEVEL SECURITY;

-- 允许匿名读取（anon key 可读）
CREATE POLICY "允许匿名读取 site_settings"
  ON public.site_settings FOR SELECT TO anon USING (true);

CREATE POLICY "允许匿名读取 auction_products"
  ON public.auction_products FOR SELECT TO anon USING (true);

CREATE POLICY "允许匿名读取 logistics_stories"
  ON public.logistics_stories FOR SELECT TO anon USING (true);

-- updated_at 自动更新（可选）
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER site_settings_updated_at
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER auction_products_updated_at
  BEFORE UPDATE ON public.auction_products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER logistics_stories_updated_at
  BEFORE UPDATE ON public.logistics_stories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 初始数据（可选，执行完建表后运行下面 INSERT）
-- ============================================================

-- 站点配置：体积重系数 6000、各国运费(元/kg)、签到积分
INSERT INTO public.site_settings (key, value) VALUES
  ('volume_weight_divisor', '6000'),
  ('freight_tw', '15'),
  ('freight_th', '18'),
  ('freight_my', '20'),
  ('freight_kh', '25'),
  ('freight_id', '25'),
  ('freight_default', '25'),
  ('sign_in_points', '10')
ON CONFLICT (key) DO NOTHING;

-- 积分淘货商品（仅首次初始化时执行，重复执行会多出重复数据）
INSERT INTO public.auction_products (name, description, points_required, image_url, stock, tag, button_text, sort_order) VALUES
  ('小米手环 8', '0元领，仅需支付跨境运费', 100, NULL, 50, '0元领', '立即兑换', 1),
  ('便携式充电宝', '积分竞拍', 50, NULL, 30, '积分竞拍', '立即出价', 2),
  ('国货零食大礼包', '0元领', 80, NULL, 100, '0元领', '立即兑换', 3),
  ('无线蓝牙耳机', '积分竞拍', 120, NULL, 20, '积分竞拍', '立即出价', 4);

-- 物流故事（仅首次初始化时执行）
INSERT INTO public.logistics_stories (title, description, tags, likes, reads_display, placeholder_icon, placeholder_bg, sort_order) VALUES
  ('3天达！马来西亚宝妈的急救奶粉', '包裹从仓库直飞吉隆坡，全程可追踪，解了宝妈燃眉之急。客户反馈：「没想到这么快，宝宝口粮没断档，太感谢了！」', ARRAY['#大马专线', '#极致时效'], 328, '1.2k', '✈️', 'bg-sky-50', 1),
  ('整套红木家具，毫发无损抵达印尼', '大件、易碎品我们采用专业加固与海运方案，从打包到清关全程把关，红木家具完好送达印尼客户家中。', ARRAY['#印尼海运', '#专业加固'], 256, '890', '🪑', 'bg-emerald-50', 2),
  ('集运帮我省下 50% 运费', '留学生通过合箱打包，把家乡零食、调料一次寄到泰国，比单件直邮省下一半运费，还能吃到家的味道。', ARRAY['#泰国集运', '#省钱攻略'], 412, '2.1k', '📦', 'bg-amber-50', 3);
