# GitHub 发布清单

## 发布前检查

- 确认 `git status --short` 只包含本次准备发布的变更。
- 确认没有提交 `.env`、密钥、证书、构建产物、数据库文件或本地缓存。
- 在 `front/` 运行 `npm run validate`，确保类型检查和 Expo doctor 均通过。
- 在 `front/` 运行 `npm run export:android`，确保 Android 静态导出成功。
- 如需生成预览 APK，在 `front/` 运行 `npm run build:android:preview`。

## GitHub 首次发布

```bash
git add .
git commit -m "Prepare GitHub release"
git push origin main
```

## Release 建议

- 当前版本：`0.1.0`。
- Release 标题建议：`LifeLedger 0.1.0`。
- Release 说明建议包含：移动端能力、Android 优先、本地数据存储、验证命令和已知限制。

## 已知限制

- 当前项目以 `front/` Expo App 为唯一交付物。
- 数据保存在设备本地，暂不包含云端同步。
- Android 安装包构建依赖 EAS，需要登录 Expo 账号并具备可用构建额度。
