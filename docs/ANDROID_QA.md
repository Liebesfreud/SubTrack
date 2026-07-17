# Android 交付 QA

本文记录 LifeLedger Mobile 的 Android 交付验证范围、已通过证据和真机/模拟器复验步骤。

## 已验证

在 `front/` 目录执行：

```bash
npm run validate
npm run export:android
```

当前验证覆盖：

- TypeScript 类型检查：`tsc --noEmit`
- Expo 配置与依赖检查：`npx expo-doctor`，17/17 checks passed
- Android 平台 JS/Hermes bundle 导出：`expo export --platform android --output-dir dist/android`

## 本机限制

当前执行环境未安装 Android SDK：

- `ANDROID_HOME` 未设置
- `ANDROID_SDK_ROOT` 未设置
- `adb` 不存在

因此本机无法执行 `npm run android` 的真机/模拟器安装运行验证。

## 真机/模拟器复验

在安装 Android Studio、Android SDK、平台工具并启动模拟器后执行：

```bash
cd front
npm install
npm run validate
npm run android
```

若要生成内部测试 APK，使用 EAS：

```bash
cd front
npm run build:android:preview
```

## 核心验收清单

- 进入应用后可打开四个 Tab：概览、订阅、物品、设置。
- 订阅模块可新增、编辑、删除、筛选、搜索、标记已续费。
- 订阅数据包含状态、付款方式、自动/手动续费、续费历史。
- 物品模块可新增、编辑、删除、筛选、搜索、记录使用、展开详情。
- 物品数据包含照片、保修日期、序列号、闲置提醒、完整使用历史。
- 设置模块可切换主题、基础币种、预算、通知、分类，并可导入导出 JSON。
- 概览页展示预算进度、长期主义指数、洞察卡，并可跳转到对应模块。
