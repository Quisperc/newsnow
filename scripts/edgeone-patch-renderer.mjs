import process from "node:process"
import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

// EdgeOne 云函数仅承载 /api/*，SPA 由 Makers 静态托管 + fallback rewrite 提供。
// nitro-go 将 SPA 渲染器写成硬编码绝对路径的动态 import（Windows 带 file:// 前缀，
// Linux 为纯绝对路径），函数打包器无法解析该路径而报错。渲染器对应的 /** 路由在本部署
// 中永不命中（函数只收到 /api 请求），故将其替换为已有的相对模块以消除绝对路径 import。
const file = join(process.cwd(), "dist/output/server/chunks/_/nitro.mjs")
const code = readFileSync(file, "utf8")
const patched = code
  .replace(/import\((['"])file:\/\/[^'"]*runtime\/renderer\.mjs\1\)/g, "import('../routes/api/latest.mjs')")
  .replace(/import\((['"])\/[^'"]*runtime\/renderer\.mjs\1\)/g, "import('../routes/api/latest.mjs')")

if (patched === code) {
  console.warn("[edgeone-patch] renderer dynamic import not found; nothing patched")
} else {
  writeFileSync(file, patched)
  console.log("[edgeone-patch] neutralized SPA renderer absolute-path dynamic import")
}
