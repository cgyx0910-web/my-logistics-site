-- ============================================================
-- 用户中心、订单系统与积分逻辑
-- 表：profiles, shipping_orders, sign_ins, auction_bids
-- 含 RLS：用户仅能访问自己的数据
-- ============================================================

-- 1. profiles：用户扩展表，与 Auth 关联（id = auth.users.id）
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  points INTEGER NOT NULL DEFAULT 0,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.profiles IS '用户扩展信息，与 Supabase Auth 一对一关联';
COMMENT ON COLUMN public.profiles.points IS '用户积分，签到与订单完成后增加';

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 用户只能查看、更新自己的 profile
CREATE POLICY "用户只能查看自己的 profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "用户只能更新自己的 profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 仅允许插入自己的 profile（id 必须为当前用户），用于注册时创建
CREATE POLICY "用户只能插入自己的 profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- 新用户注册时自动创建 profile（从 auth.users 同步 email）
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 需在 Supabase Dashboard 的 Database -> Extensions 确认 pg_net 等；触发器在 auth  schema
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. shipping_orders：物流订单表
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shipping_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tracking_number TEXT,
  status TEXT NOT NULL DEFAULT '待付款'
    CHECK (status IN ('待付款', '已入库', '运输中', '已完成')),
  shipping_fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
  points_awarded INTEGER NOT NULL DEFAULT 0,
  payment_proof_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.shipping_orders IS '物流订单表';
COMMENT ON COLUMN public.shipping_orders.status IS '待付款、已入库、运输中、已完成';
COMMENT ON COLUMN public.shipping_orders.points_awarded IS '订单完成后可获得的积分';

CREATE INDEX IF NOT EXISTS idx_shipping_orders_user_id ON public.shipping_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_shipping_orders_tracking ON public.shipping_orders(tracking_number);
CREATE INDEX IF NOT EXISTS idx_shipping_orders_status ON public.shipping_orders(status);

ALTER TABLE public.shipping_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "用户只能查看自己的订单"
  ON public.shipping_orders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "用户只能插入自己的订单"
  ON public.shipping_orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户只能更新自己的订单"
  ON public.shipping_orders FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER shipping_orders_updated_at
  BEFORE UPDATE ON public.shipping_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. sign_ins：签到表（每用户每天仅可签到一次）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sign_ins (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sign_in_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, sign_in_date)
);

COMMENT ON TABLE public.sign_ins IS '用户签到记录，唯一索引保证每用户每天仅可签到一次';

ALTER TABLE public.sign_ins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "用户只能查看自己的签到记录"
  ON public.sign_ins FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "用户只能插入自己的签到记录"
  ON public.sign_ins FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 4. auction_bids：积分竞拍出价记录
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.auction_bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.auction_products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  bid_points INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.auction_bids IS '积分淘货竞拍出价记录';

CREATE INDEX IF NOT EXISTS idx_auction_bids_product_id ON public.auction_bids(product_id);
CREATE INDEX IF NOT EXISTS idx_auction_bids_user_id ON public.auction_bids(user_id);
CREATE INDEX IF NOT EXISTS idx_auction_bids_created_at ON public.auction_bids(created_at DESC);

ALTER TABLE public.auction_bids ENABLE ROW LEVEL SECURITY;

CREATE POLICY "用户只能查看自己的出价记录"
  ON public.auction_bids FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "用户只能插入自己的出价记录"
  ON public.auction_bids FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 可选：允许用户查看某商品的所有出价（用于展示竞拍动态），此处仅限制为“仅自己的”
-- 若需公开某商品的出价列表，可另加一条 SELECT 策略。
