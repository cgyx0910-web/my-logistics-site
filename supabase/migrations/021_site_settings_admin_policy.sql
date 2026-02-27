-- 管理员可写 site_settings（首页装修遥控器等）
CREATE POLICY "仅管理员可插改 site_settings"
  ON public.site_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
