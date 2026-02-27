# Storage 手动创建指引

更换 Supabase 项目后，若 Storage 桶未随迁移自动创建，可按本文操作。  
项目需要 3 个 Storage 桶，每个桶要求：
- **Policies**：每桶 2 条（上传策略 + 公开读）
- **File size limit**：2MB
- **Allowed MIME types**：image/jpeg, image/png, image/webp

若 Dashboard 点「New bucket」报错（如 `Failed to create bucket: {}`），请用 **SQL Editor 一键执行** 下面的脚本。

---

## 一、推荐：SQL Editor 一键创建（桶 + 策略）

1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)，进入你的项目。
2. 左侧 **SQL Editor** → **New query**。
3. 打开项目中的 **`supabase/migrations/029_storage_buckets_with_limits.sql`**，复制全部内容粘贴到 SQL Editor。
4. 点击 **Run**。

执行后会：
- 创建 3 个桶：**id/名称** 为 `payment-proofs`、`product-images`、`site-assets`（与代码中 `storage.from('...')` 一致）
- 设置 **公开**、**2MB 限制**、**仅允许 image/jpeg, image/png, image/webp**
- 为 **storage.objects** 创建每桶 2 条策略（共 6 条）

若报错「column … does not exist」：可能是当前项目 `storage.buckets` 没有 `name` / `file_size_limit` / `allowed_mime_types`。在 SQL Editor 执行：

```sql
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'storage' AND table_name = 'buckets' ORDER BY ordinal_position;
```

把结果发出来后可据此改一版 SQL。

---

## 二、备选：在 Dashboard 里手动建桶（仅当 Dashboard 可用时）

| 桶 id/名称       | 公开 | File size limit | Allowed MIME types        |
|------------------|------|-----------------|---------------------------|
| `payment-proofs` | 是   | 2 MB            | image/jpeg, image/png, image/webp |
| `product-images`  | 是   | 2 MB            | image/jpeg, image/png, image/webp |
| `site-assets`    | 是   | 2 MB            | image/jpeg, image/png, image/webp |

**注意**：创建时 **Name** 必须填上表中的 id（如 `payment-proofs`），这样代码里 `storage.from('payment-proofs')` 才能对应到该桶。建完桶后仍需在 SQL Editor 中执行下面「三、仅创建策略」里的策略 SQL。

---

## 三、仅创建策略（已用 029 脚本则无需执行）

桶创建后，还需为 **storage.objects** 表添加策略，否则上传/读取会因 RLS 报错。  
若你已成功执行过迁移 `011`、`024`、`025`，策略可能已存在，可先到 **Storage → 对应桶 → Policies** 查看；若没有或不全，在 **SQL Editor** 中执行下面整段 SQL。

1. 左侧菜单点击 **SQL Editor**。
2. 新建查询，粘贴下面整段 SQL。
3. 点击 **Run** 执行。

```sql
-- ============================================================
-- payment-proofs：用户只能上传到本人路径，所有人可读
-- ============================================================
CREATE POLICY "用户可上传本人订单的支付凭证"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'payment-proofs'
    AND (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')
  );

CREATE POLICY "支付凭证公开读"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'payment-proofs');

-- ============================================================
-- product-images：已登录用户只能上传到自己的 products/{user_id}/ 下，所有人可读
-- ============================================================
CREATE POLICY "已登录用户可上传 product-images 至本人目录"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[2] = (auth.jwt() ->> 'sub')
  );

CREATE POLICY "product-images 公开读"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'product-images');

-- ============================================================
-- site-assets：已登录用户可上传（实际由后端 API 限制为仅 admin），所有人可读
-- ============================================================
CREATE POLICY "已登录用户可上传 site-assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'site-assets');

CREATE POLICY "site-assets 公开读"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'site-assets');
```

若执行时报「policy already exists」，说明迁移已创建过，可忽略或先删再建（见下节）。

---

## 四、若策略已存在导致冲突

若上面 SQL 报错提示策略已存在，可先删除再创建。在 SQL Editor 中执行：

```sql
-- 删除旧策略（若存在）
DROP POLICY IF EXISTS "用户可上传本人订单的支付凭证" ON storage.objects;
DROP POLICY IF EXISTS "支付凭证公开读" ON storage.objects;
DROP POLICY IF EXISTS "已登录用户可上传 product-images 至本人目录" ON storage.objects;
DROP POLICY IF EXISTS "product-images 公开读" ON storage.objects;
DROP POLICY IF EXISTS "已登录用户可上传 site-assets" ON storage.objects;
DROP POLICY IF EXISTS "site-assets 公开读" ON storage.objects;
```

执行完后，再执行第三节中的「创建策略」SQL。

---

## 五、核对清单

| 步骤 | 位置 | 核对项 |
|------|------|--------|
| 1 | Storage → Buckets | 存在 `payment-proofs`、`product-images`、`site-assets`，且均为 Public |
| 2 | Storage → 任选一桶 → Policies | 该桶对应策略已列出（或到 Database → Tables → storage.objects → Policies 查看） |
| 3 | 应用内 | 用户上传支付凭证、商品图、管理端上传站点资源均能成功并正常显示 |

---

## 六、路径约定（供排查用）

- **payment-proofs**：`{user_id}/{order_id}/{filename}`，例如 `abc-123/order-456/receipt.png`。
- **product-images**：`products/{user_id}/{filename}`，例如 `products/abc-123/image.jpg`。
- **site-assets**：`stories/{filename}` 等，由管理端上传时决定。

代码引用见：`app/api/orders/[id]/payment-proof/route.ts`（payment-proofs）、`app/api/admin/upload-site-asset/route.ts`（site-assets），以及商品图片上传相关 API（product-images）。
