# 创建 payment-proofs 存储桶

用户上传支付凭证时，需要存在名为 **payment-proofs** 的 Storage 桶。若出现「存储服务未就绪，请联系管理员创建 payment-proofs 桶」，请按下列任一方式创建。

## 方式一：执行迁移（推荐）

若已使用 Supabase CLI 并 link 了项目，在项目根目录执行：

```bash
npx supabase db push
```

迁移 `028_storage_payment_proofs_bucket.sql` 会尝试创建该桶。若执行成功，无需再做其他操作。

## 方式二：在 Supabase 控制台手动创建

若迁移报错或未使用 CLI，请在 Supabase 控制台创建桶：

1. 打开 [Supabase Dashboard](https://supabase.com/dashboard)，进入你的项目。
2. 左侧菜单点击 **Storage**。
3. 点击 **New bucket**（新建桶）。
4. 填写：
   - **Name**：`payment-proofs`（必须一致）
   - **Public bucket**：勾选（公开，便于展示支付凭证图片）
5. 点击 **Create bucket**（创建桶）。

创建完成后，上传支付凭证即可正常使用。
