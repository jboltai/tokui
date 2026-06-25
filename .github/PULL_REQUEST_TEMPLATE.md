## 变更说明

<!-- 这个 PR 做了什么？为什么？关联 Issue（如 Closes #123）。 -->

## 变更类型

- [ ] 🐛 Bug 修复（不破坏现有行为）
- [ ] ✨ 新功能 / 新组件
- [ ] 💥 破坏性变更（有迁移说明）
- [ ] ♻️ 重构 / 性能
- [ ] 📝 文档
- [ ] ✅ 测试
- [ ] 🔧 构建 / CI / 打包

## 影响范围

<!-- 涉及的模块：parser / renderer / components/* / builder / 适配器 / 主题 / 文档 -->

## 提交前自检

- [ ] `npm run typecheck` 通过
- [ ] `npm run test:all` 通过（新增组件请附带 `tests/test-*.js`）
- [ ] `npm run build` 无错
- [ ] 新组件：已加 `CONTAINERS`（若容器）/ `VARIANTS`（若变体）/ 样式 / Builder 方法
- [ ] 安全：未引入 `innerHTML` 注入面（非 md/code 组件用 `textContent`）；事件处理器为命名引用
- [ ] 零运行时依赖（未引入 npm 运行时包）
- [ ] 提交信息遵循 Conventional Commits（见 CONTRIBUTING.md）

## 截图 / 演示（如适用）

<!-- 渲染效果截图或 DSL 片段 -->
