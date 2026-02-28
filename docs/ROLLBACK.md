# 回滚与部署说明

## 快速回滚（Git）

当前主线分支为 `main`，Vercel 部署跟随该分支。

### 回滚到上一版（撤销最近一次提交）

```bash
git revert HEAD --no-edit
git push origin main
```

会生成一次新的“反向”提交，保留历史，适合已推送到远程的情况。

### 回滚到指定提交（硬回退，慎用）

若确定要丢弃之后的所有提交（仅限未推送或团队协商后）：

```bash
# 查看最近提交
git log --oneline -10

# 回退到指定 commit（替换 <commit> 为 hash，如 a7acd74）
git reset --hard <commit>
git push origin main --force
```

**注意**：`--force` 会改写远程历史，多人协作时需谨慎。

### 近期可回滚点参考

| 提交 | 说明 |
|------|------|
| `4df3ce4` | 全球运费管理：文案与体验优化，CSV 去重防 ON CONFLICT 报错 |
| `a7acd74` | ShippingRatesAdmin: price table hint and switch to list after CSV upload |
| `63f9416` | 功能说明，例如：后台客服渠道、浮窗链接等 |
| `34e7580` | revert: 恢复 Supabase 直连，移除 /api/supabase 代理及健康检查 |

## Vercel 控制台回滚

1. 打开 [Vercel Dashboard](https://vercel.com/dashboard) → 选择本项目。
2. 进入 **Deployments**，找到要恢复的部署。
3. 点击该部署右侧 **⋯** → **Promote to Production**，即可将当前生产环境切回该版本（无需改 Git）。

## 部署优化

- 构建命令：`npm run build`（Vercel 默认根据 `package.json` 识别）。
- 若需自定义：在项目根目录添加 `vercel.json`，或于 Vercel 项目设置中配置 Build Command / Output Directory。
- 环境变量：在 Vercel 项目 **Settings → Environment Variables** 中配置（如 Supabase URL/Key），并勾选 Production/Preview。
