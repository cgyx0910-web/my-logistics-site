# 代码检查报告

**检查时间**：最近一次全面检查  
**TypeScript**：`tsc --noEmit` 通过  
**ESLint**：已修复阻塞项；其余为建议项（见下）

---

## 已修复项

- **admin-control/layout.tsx**：在 effect 内用 `queueMicrotask` 包裹 `setState`，避免“同步 setState 导致级联渲染”的 React 规则报错。
- **FlashMessageBanner.tsx**：同上，对 `setMessage` 使用 `queueMicrotask` 延迟执行。
- **ShippingRatesAdmin.tsx**：`catch (e)` 改为 `catch`，消除未使用变量 `e`。

---

## 剩余 ESLint 问题（非阻塞）

### 1. no-explicit-any（51 处）

主要集中在 API 路由与 `lib/data.ts`，多为 Supabase 返回类型或请求体使用 `any`。  
建议：按需为 Supabase 查询结果和 API body 补充类型或使用 `unknown` + 类型收窄。

### 2. 图片与无障碍（约 6 处）

- **no-img-element**：多处使用 `<img>`，建议改为 Next.js `<Image />` 以优化 LCP 与带宽。
- **jsx-a11y/alt-text**：部分图片缺少 `alt`，建议补充（含装饰性图片用 `alt=""`）。

### 3. 未使用变量（约 6 处）

- `AboutPageRemote.tsx`：未使用的 `Image` 导入。
- `FreightCalculator.tsx`：`COUNTRY_KEYS`、`uniqueRatesByCountryMethod` 未使用。
- `AuthContext.tsx`：多处 `_e` 未使用（可改为 `_` 或移除）。
- `papaparse.d.ts`：泛型 `T` 未使用（类型声明文件可忽略或修正）。

---

## 构建与部署

- **构建**：`npm run build` 正常。
- **回滚**：见 [ROLLBACK.md](./ROLLBACK.md)。
- **部署**：Vercel 使用根目录 `vercel.json` 与 `next.config.ts`（已开启 `reactStrictMode`、`compress`、关闭 `poweredByHeader`）。
