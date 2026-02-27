-- 物流故事：正文字段 + 管理员写权限
ALTER TABLE public.logistics_stories
  ADD COLUMN IF NOT EXISTS content TEXT;

COMMENT ON COLUMN public.logistics_stories.content IS '正文（支持简单 Markdown）；列表展示用 description 作为摘要';

-- 管理员可增删改物流故事
CREATE POLICY "仅管理员可插改删 logistics_stories"
  ON public.logistics_stories FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
