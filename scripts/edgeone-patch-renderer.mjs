import process from "node:process"
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"

// EdgeOne 云函数仅承载 /api/*，SPA 由 Makers 静态托管 + fallback rewrite 提供。
// nitro-go 把 SPA 渲染器写成硬编码绝对路径的动态 import（Windows 带 file:// 前缀，
// Linux 为纯绝对路径），函数打包器无法解析该路径。渲染器对应的 /** 路由在本部署中
// 不会命中有效请求，故替换为自包含的 404 响应以消除绝对路径 import。
// 不同 Node 版本/nitro 产物布局下 chunk 路径不一致，递归扫描而非硬编码路径。
const serverDir = join(process.cwd(), "dist/output/server")
const replacement = "Promise.resolve({default:()=>new Response(\"Not Found\",{status:404})})"
const patterns = [
  /import\((['"])file:\/\/[^'"]*runtime\/renderer\.mjs\1\)/g,
  /import\((['"])\/[^'"]*runtime\/renderer\.mjs\1\)/g,
]

function collectMjs(dir) {
  const files = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) files.push(...collectMjs(full))
    else if (entry.isFile() && full.endsWith(".mjs")) files.push(full)
  }
  return files
}

let patchedImports = 0
let patchedFiles = 0
if (existsSync(serverDir)) {
  for (const file of collectMjs(serverDir)) {
    const code = readFileSync(file, "utf8")
    if (!code.includes("runtime/renderer.mjs")) continue
    let count = 0
    let patched = code
    for (const re of patterns) {
      patched = patched.replace(re, () => {
        count += 1
        return replacement
      })
    }
    if (count > 0) {
      writeFileSync(file, patched)
      patchedImports += count
      patchedFiles += 1
      console.log(`[edgeone-patch] neutralized ${count} renderer import(s): ${file}`)
    }
  }
}
if (patchedImports === 0) console.warn("[edgeone-patch] no renderer absolute-path import found; nothing patched")
else console.log(`[edgeone-patch] done: ${patchedImports} import(s) in ${patchedFiles} file(s)`)
