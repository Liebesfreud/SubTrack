# LifeLedger

LifeLedger 是一个使用 **Expo + React Native** 构建的 Android 优先本地应用。它采用本地优先架构，核心功能是订阅管理与物品管理，并逐步扩展为长期主义生活管理工具。

## 当前移动端能力

- 订阅管理：新增、编辑、删除、状态/付款方式、周期支出统计、一键续费、续费历史和提醒状态。
- 物品管理：新增、编辑、删除、照片、保修/序列号、记录使用、完整使用历史、闲置天数、单次使用成本。
- 仪表盘：长期主义指数、预算进度、产品化洞察、月度订阅、年度支出、物品总值、需关注事项，并可点击跳转处理。
- 设置：基础币种、主题模式、月度预算、闲置提醒天数、通知权限、JSON 导入导出。
- 数据：使用 `expo-sqlite` 保存在设备本地。

## 技术栈

| 模块 | 技术 |
| --- | --- |
| 移动端 | Expo + React Native + TypeScript |
| 路由 | Expo Router |
| UI | NativeWind + React Native Reusables 官方组件源码 |
| 状态 | Zustand |
| 数据库 | expo-sqlite |
| 通知 | expo-notifications |
| 导入导出 | expo-file-system + expo-document-picker |
| 品牌资产 | Expo icon / adaptive icon / splash |

## 开发启动

```bash
npm install
npm run start
```

> 根目录脚本会自动转发到 `front/`。如果只想安装移动端依赖，也可以运行 `cd front && npm install`。

运行 Android：

```bash
npm run android
```

类型检查：

```bash
npm run typecheck
```

完整移动端校验：

```bash
npm run validate
npm run export:android
```

GitHub 发布前检查清单见 [`docs/RELEASE_CHECKLIST.md`](docs/RELEASE_CHECKLIST.md)。

生成 Android 预览 APK：

```bash
npm run build:android:preview
```

## 目录

```text
front/
  app/              Expo Router 页面
  components/       通用 UI 与业务组件
  lib/              SQLite 与工具函数
  store/            Zustand 应用状态
  types/            领域类型
docs/
  ANDROID_QA.md     Android 交付验证记录
  QUALITY_AUDIT.md  性能、UI、数据结构全盘审计
```

> 旧 Go 后端、Vite Web 前端、Docker 部署和 OpenAPI 契约已在移动端重构中移除；当前项目以 `front/` Expo App 为唯一交付物。
