# 测试与兼容性

## 检查入口

```bash
corepack pnpm verify
corepack pnpm package:extension:check
corepack pnpm font:check
```

verify 顺序执行 Core 构建、三包类型检查、Lint、单元测试和生产构建。插件检查包含 Manifest 与压缩包结构，字体检查覆盖静态资源与源码字符。

## 检查记录

2026-10-08，Node.js 24.16.0 / pnpm 11.5.2：178 项测试通过（Core 121、Web 16、Extension 41），类型检查、构建、打包和字体检查通过。Web 冒烟覆盖文本转换、历史记录和主页面导航；模板导入与即时预览在截图流程中运行。

Lint 存在 80 条既有警告；构建存在 Vite CJS API 弃用与大 chunk 提示。

## 测试范围

外部服务适配测试使用模拟响应，真实 AI / 翻译 / OCR 集成不在自动验证范围内。插件安装后的权限、剪贴板及完整服务流程未完成手动验收，自定义规则编辑流程未逐项覆盖。实际服务可用性取决于用户配置、上游权限和网络条件。
