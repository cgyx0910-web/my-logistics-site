# 更换 Supabase 项目后检查清单

更换为新 Supabase 账号/项目后，按本清单逐项核对，避免功能异常。

---

## 1. 环境变量

| 项目 | 说明 |
|------|------|
| **本地** | 在 `.env.local` 中更新 `NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY` 为新项目的值（Dashboard → Project Settings → API）。 |
| **部署** | 若已部署到 Vercel/Netlify 等，在对应平台的环境变量中同样更新上述两项。 |
| **校验** | 未设置或写错时，运行/构建会抛错并提示「缺少 Supabase 环境变量」。 |

---

## 2. 构建缓存（重要）

更换 URL/Key 后，Next 可能仍使用旧的编译结果。

- **操作**：删除 `.next` 后重新启动。
  ```bash
  rm -rf .next
  npm run dev
  ```
  Windows PowerShell：`Remove-Item -Recurse -Force .next`
- **原因**：`.next` 中可能缓存了旧的 Supabase URL，导致请求仍发往旧项目。

---

## 3. 数据库（表结构 + RPC）

| 项目 | 说明 |
|------|------|
| **迁移** | 新项目需执行全部迁移：`npx supabase link --project-ref 新项目ID` 后执行 `npx supabase db push`，或在 Dashboard → SQL Editor 中按顺序执行 `supabase/migrations/*.sql`。 |
| **核对** | Dashboard → Database → **Tables** 应有 profiles、shipping_orders、auction_products、order_tracking_logs、shipping_rates、site_settings、logistics_stories 等；**Functions** 应有 deduct_user_points、add_user_points_with_history、decrement_auction_product_stock、increment_auction_product_stock、settle_auction_product 等。 |
| **影响** | 未执行迁移会导致接口报错（表/函数不存在）。 |

---

## 4. Storage 桶与策略

| 项目 | 说明 |
|------|------|
| **桶** | 需存在且 **id** 与代码一致：`payment-proofs`、`product-images`、`site-assets`（参见 [STORAGE_SETUP.md](./STORAGE_SETUP.md)）。 |
| **策略** | 每桶 2 条 RLS 策略（上传 + 公开读），可通过执行 `supabase/migrations/029_storage_buckets_with_limits.sql` 一次性创建/更新桶与策略。 |
| **影响** | 桶不存在或策略缺失会导致上传/读取支付凭证、商品图、站点资源失败。 |

---

## 5. Auth（用户与登录）

| 项目 | 说明 |
|------|------|
| **新项目无旧用户** | 新项目的 Auth 用户表为空，旧账号下的用户需在新项目中重新注册；无法「迁移登录状态」。 |
| **Site URL / Redirect** | 若使用邮件确认或 OAuth，在 Dashboard → Authentication → URL Configuration 中配置正确的 Site URL 和 Redirect URLs。 |
| **“Email not confirmed”** | 默认开启「邮箱确认」时，注册后需点击邮件中的确认链接才能登录。若希望**注册后直接登录**，在 Dashboard → **Authentication** → **Providers** → **Email** 中关闭 **Confirm email**。 |
| **影响** | 未重新注册则无法登录；Redirect 错误会导致登录回调失败。 |

---

## 6. 本地 CLI 关联（可选）

若使用 Supabase CLI 做迁移或本地开发：

```bash
npx supabase link --project-ref 新项目ID
```

`supabase/.temp/project-ref` 会更新为新项目 ID，后续 `db push` 等命令会作用到新项目。

---

## 7. 功能自测建议

更换后建议至少验证：

- 登录/注册、登出
- 积分商城：商品列表、兑换/竞拍、下单
- 订单列表、订单详情、上传支付凭证、查看物流
- 管理端：订单管理、确认支付、出库、结拍、运费/站点设置、物流故事、商品图片与站点资源上传

---

## 8. 可能受影响的功能汇总

| 功能 | 依赖 | 更换后注意点 |
|------|------|--------------|
| 登录/注册/登出 | Auth + profiles | 新项目需重新注册；Site URL/Redirect 需正确 |
| 积分、订单、竞拍 | DB 表 + RPC | 必须在新项目执行全部迁移 |
| 支付凭证上传/展示 | Storage `payment-proofs` + 策略 | 需建桶 + 2 条策略 |
| 商品图上传/展示 | Storage `product-images` + 策略 | 同上 |
| 站点资源（故事封面等） | Storage `site-assets` + 策略 | 同上 |
| 前台展示（站点设置、故事、运费） | DB 只读 | 迁移后需在新项目重新配置或录入数据 |

---

## 9. 参考文件

- 环境变量示例：`.env.example`
- Storage 建桶与策略：`docs/STORAGE_SETUP.md`、`supabase/migrations/029_storage_buckets_with_limits.sql`
- 迁移目录：`supabase/migrations/`
