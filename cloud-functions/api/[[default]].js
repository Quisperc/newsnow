import express from "express"
// eslint-disable-next-line antfu/no-import-dist -- 部署包装器需加载构建产物中的 nitro 监听器
import { handler } from "../../dist/output/server/index.mjs"

const app = express()
app.disable("x-powered-by")

// 函数挂载于 /api，EdgeOne 可能剥离该前缀；nitro 路由需要完整 /api 路径，两种情况都兼容。
app.use((req, res, next) => {
  if (!req.url.startsWith("/api")) {
    req.url = `/api${req.url.startsWith("/") ? "" : "/"}${req.url}`
  }
  handler(req, res, next)
})

export default app
