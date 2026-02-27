This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Supabase 数据库

站点配置、积分淘货、物流故事等数据从 Supabase 读取。

### 环境变量

在 `.env.local` 中配置（可参考 `.env.example`）：

- `NEXT_PUBLIC_SUPABASE_URL`：Supabase 项目 URL  
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`：Supabase 匿名公钥  

**更换 Supabase 项目后**：更新上述两项为新项目的值，并删除本地 `.next` 后重新执行 `npm run dev`，避免请求仍发往旧项目。完整检查项见 [docs/SUPABASE_SWITCH_CHECKLIST.md](docs/SUPABASE_SWITCH_CHECKLIST.md)。

### 初始化表与数据

1. 打开 [Supabase Dashboard](https://supabase.com/dashboard) → 选择项目 → **SQL Editor**  
2. 复制并执行 `supabase/migrations/001_initial_tables.sql` 中的全部 SQL  

将创建三张表并插入初始数据：

- **site_settings**：配置项（体积重系数、各国运费单价、签到积分等）  
- **auction_products**：积分淘货商品（名称、描述、所需积分、图片、库存等）  
- **logistics_stories**：物流故事内容  

### 读取数据的 API

| 接口 | 说明 |
|------|------|
| `GET /api/site-settings` | 返回所有配置，格式 `{ key: value }` |
| `GET /api/auction-products` | 返回积分淘货商品列表 |
| `GET /api/logistics-stories` | 返回物流故事列表 |

服务端组件可直接使用 `lib/data.ts` 中的 `getSiteSettings()`、`getAuctionProducts()`、`getLogisticsStories()` 获取数据，无需走 HTTP。

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
