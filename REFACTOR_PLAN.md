# LifeLedger → LongTermism App 重构计划

## 1. 产品定位重构

### 原定位
个人订阅服务管理工具

### 新定位
**长期主义生活操作系统 / Long-Term Life OS**

围绕「长期主义」构建的个人数据系统，帮助用户追踪和管理所有需要时间沉淀的事物：
- 订阅服务（持续付费）
- 物品资产（购入/使用/折旧）
- 习惯养成（每日/每周重复行为）
- 目标进度（中长期目标拆解与追踪）
- 知识积累（书籍/课程/笔记）

核心理念：**记录时间价值，对抗短期冲动，培养长期复利。**

---

## 2. 技术栈选择

### 移动端
```
Expo (React Native)
TypeScript
Expo Router (文件路由)
expo-sqlite (本地数据库)
expo-notifications (本地通知)
expo-file-system + expo-document-picker (导入导出)
Zustand (状态管理)
date-fns (日期处理)
NativeWind (Tailwind for RN, 可选)
react-native-svg + victory-native (图表)
```

### 为什么选 Expo
- 你已有 Expo 经验，开发效率高
- 比 Capacitor 更接近原生体验
- 本地 SQLite + 通知能力满足需求
- 未来可扩展到 iOS

### 不保留后端
- 完全本地化，不依赖服务器
- 删除现有 Go 后端 (`server/`)
- 数据全部存储在设备本地 SQLite

---

## 3. 核心功能模块

### 模块 A：订阅管理（现有功能迁移）
```
功能：
- 订阅 CRUD（名称、价格、币种、周期、下次付款日）
- 分类管理
- 到期提醒（本地通知）
- 月度/年度费用统计
- 多币种支持（手动维护汇率）
- 数据导入导出（JSON）
```

### 模块 B：物品收纳（新增）
```
功能：
- 物品录入（名称、购入价、购入日期、分类、存放位置、照片）
- 使用频率记录（每日/每周/每月使用次数）
- 单次使用成本计算 = 购入价 / 使用次数
- 闲置预警（超过 N 天未使用提醒）
- 物品生命周期追踪（何时该替换/丢弃）
- 物品统计（总价值、分类分布、使用率排行）

核心价值：
- 让用户看到「买了不用」的真实成本
- 培养「买前思考」的习惯
- 减少冲动消费
```

### 模块 C：习惯养成（新增）
```
功能：
- 习惯定义（名称、频率、目标天数）
- 每日打卡记录
- 连续天数统计
- 断签提醒
- 习惯热力图（类似 GitHub Contribution Graph）
- 习惯关联（如：阅读习惯 ↔ 书籍进度）

核心价值：
- 可视化长期积累
- 用数据证明坚持的力量
```

### 模块 D：目标追踪（新增）
```
功能：
- 目标设定（名称、截止日期、类型：学习/健康/财务/职业）
- 里程碑拆解（子任务 + 完成百分比）
- 进度可视化（甘特图或进度条）
- 定期回顾提醒（每周/每月 Review）
- 目标关联（如：存钱目标 ↔ 订阅削减）

核心价值：
- 把抽象的「长期主义」变成可执行的路径
- 避免目标遗忘
```

### 模块 E：知识库（新增，轻量版）
```
功能：
- 书籍/课程记录（名称、开始日期、完成日期、评分、笔记）
- 阅读进度追踪
- 知识点摘录（标签分类）
- 学习时间统计

核心价值：
- 记录认知复利
- 避免「读了就忘」
```

### 模块 F：仪表盘（整合）
```
功能：
- 今日概览（待办习惯、即将到期订阅、今日目标）
- 长期主义指数（自定义算法，综合各模块数据）
- 趋势图表（月度支出 vs 物品使用率 vs 习惯完成率）
- 成就系统（连续打卡 N 天、节省 N 元等）
```

---

## 4. 数据模型设计

### 核心实体关系
```
UserSettings (单例，本地存储)
  ├── Subscription[] (订阅)
  │   └── NotificationLog[] (通知日志)
  ├── Category[] (分类，跨模块复用)
  ├── Item[] (物品)
  │   └── ItemUsageLog[] (使用记录)
  ├── Habit[] (习惯)
  │   └── HabitCheckIn[] (打卡记录)
  ├── Goal[] (目标)
  │   └── Milestone[] (里程碑)
  └── KnowledgeEntry[] (知识条目)
      └── KnowledgeNote[] (笔记)
```

### 主要表结构（SQLite）

```sql
-- 用户设置（单行 JSON 存储）
CREATE TABLE settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);

-- 订阅
CREATE TABLE subscriptions (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  price REAL NOT NULL,
  currency TEXT NOT NULL,
  billingCycle TEXT NOT NULL,
  nextPaymentDate TEXT NOT NULL,
  categoryId TEXT,
  icon TEXT,
  description TEXT,
  notifyDaysBefore INTEGER NOT NULL,
  autoRenew INTEGER NOT NULL,
  createdAt TEXT NOT NULL
);

-- 分类（跨模块复用）
CREATE TABLE categories (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  module TEXT NOT NULL, -- 'subscription' | 'item' | 'habit' | 'goal'
  createdAt TEXT NOT NULL
);

-- 物品
CREATE TABLE items (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  purchasePrice REAL NOT NULL,
  purchaseDate TEXT NOT NULL,
  categoryId TEXT,
  location TEXT, -- 存放位置
  photoUri TEXT,
  description TEXT,
  expectedLifespanMonths INTEGER, -- 预期使用寿命（月）
  status TEXT NOT NULL, -- 'active' | 'archived' | 'discarded'
  createdAt TEXT NOT NULL
);

-- 物品使用记录
CREATE TABLE item_usage_logs (
  id TEXT PRIMARY KEY NOT NULL,
  itemId TEXT NOT NULL,
  usedAt TEXT NOT NULL,
  durationMinutes INTEGER, -- 可选：使用时长
  FOREIGN KEY (itemId) REFERENCES items(id)
);

-- 习惯
CREATE TABLE habits (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  frequency TEXT NOT NULL, -- 'daily' | 'weekly' | 'monthly'
  targetCount INTEGER NOT NULL, -- 每周/每月目标次数
  categoryId TEXT,
  icon TEXT,
  color TEXT,
  reminderTime TEXT, -- 提醒时间（HH:mm）
  startDate TEXT NOT NULL,
  isActive INTEGER NOT NULL,
  createdAt TEXT NOT NULL
);

-- 习惯打卡记录
CREATE TABLE habit_checkins (
  id TEXT PRIMARY KEY NOT NULL,
  habitId TEXT NOT NULL,
  checkinDate TEXT NOT NULL,
  note TEXT,
  FOREIGN KEY (habitId) REFERENCES habits(id)
);

-- 目标
CREATE TABLE goals (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL, -- 'learning' | 'health' | 'finance' | 'career'
  description TEXT,
  startDate TEXT NOT NULL,
  dueDate TEXT,
  progress REAL NOT NULL, -- 0.0 ~ 1.0
  status TEXT NOT NULL, -- 'active' | 'completed' | 'paused'
  categoryId TEXT,
  createdAt TEXT NOT NULL
);

-- 里程碑
CREATE TABLE milestones (
  id TEXT PRIMARY KEY NOT NULL,
  goalId TEXT NOT NULL,
  title TEXT NOT NULL,
  isCompleted INTEGER NOT NULL,
  completedAt TEXT,
  orderIndex INTEGER NOT NULL,
  FOREIGN KEY (goalId) REFERENCES goals(id)
);

-- 知识条目
CREATE TABLE knowledge_entries (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL, -- 'book' | 'course' | 'article' | 'video'
  author TEXT,
  startDate TEXT,
  completedDate TEXT,
  rating INTEGER, -- 1~5
  tags TEXT, -- JSON array
  createdAt TEXT NOT NULL
);

-- 知识笔记
CREATE TABLE knowledge_notes (
  id TEXT PRIMARY KEY NOT NULL,
  entryId TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT, -- JSON array
  createdAt TEXT NOT NULL,
  FOREIGN KEY (entryId) REFERENCES knowledge_entries(id)
);

-- 通知日志（跨模块复用）
CREATE TABLE notification_logs (
  id TEXT PRIMARY KEY NOT NULL,
  entityType TEXT NOT NULL, -- 'subscription' | 'habit' | 'goal'
  entityId TEXT NOT NULL,
  entityName TEXT NOT NULL,
  sentAt TEXT NOT NULL,
  status TEXT NOT NULL,
  channel TEXT NOT NULL -- 'local'
);
```

---

## 5. 项目结构（Expo）

```
lifeledger/
├── app/                          # Expo Router 页面
│   ├── _layout.tsx               # 根布局（Tab 导航）
│   ├── index.tsx                 # 首页仪表盘
│   ├── dashboard.tsx             # 仪表盘详情
│   ├── subscriptions/
│   │   ├── index.tsx             # 订阅列表
│   │   └── [id].tsx              # 订阅编辑
│   ├── items/
│   │   ├── index.tsx             # 物品列表
│   │   └── [id].tsx              # 物品详情/编辑
│   ├── habits/
│   │   ├── index.tsx             # 习惯列表
│   │   └── [id].tsx              # 习惯详情/打卡
│   ├── goals/
│   │   ├── index.tsx             # 目标列表
│   │   └── [id].tsx              # 目标详情/里程碑
│   ├── knowledge/
│   │   ├── index.tsx             # 知识库列表
│   │   └── [id].tsx              # 知识条目详情
│   └── settings.tsx              # 设置页
├── src/
│   ├── db/                       # 数据库层
│   │   ├── database.ts           # SQLite 初始化
│   │   ├── migrations.ts         # 数据库迁移
│   │   ├── repositories/
│   │   │   ├── subscriptionRepo.ts
│   │   │   ├── categoryRepo.ts
│   │   │   ├── itemRepo.ts
│   │   │   ├── habitRepo.ts
│   │   │   ├── goalRepo.ts
│   │   │   └── knowledgeRepo.ts
│   │   └── types.ts              # 数据库实体类型
│   ├── domain/                   # 业务逻辑层
│   │   ├── models.ts             # 领域模型
│   │   ├── subscription.ts       # 订阅相关逻辑
│   │   ├── item.ts               # 物品相关逻辑
│   │   ├── habit.ts              # 习惯相关逻辑
│   │   ├── goal.ts               # 目标相关逻辑
│   │   ├── currency.ts           # 汇率/金额计算
│   │   └── date.ts               # 日期工具
│   ├── store/                    # Zustand 状态管理
│   │   ├── useSubscriptionStore.ts
│   │   ├── useItemStore.ts
│   │   ├── useHabitStore.ts
│   │   ├── useGoalStore.ts
│   │   └── useSettingsStore.ts
│   ├── services/                 # 服务层
│   │   ├── notificationService.ts # 本地通知调度
│   │   ├── backupService.ts      # 导入导出
│   │   └── reminderService.ts    # 提醒规则引擎
│   ├── components/               # UI 组件
│   │   ├── common/
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   └── Modal.tsx
│   │   ├── charts/
│   │   │   ├── PieChart.tsx
│   │   │   ├── BarChart.tsx
│   │   │   └── Heatmap.tsx
│   │   └── modules/
│   │       ├── SubscriptionCard.tsx
│   │       ├── ItemCard.tsx
│   │       ├── HabitCheckIn.tsx
│   │       └── GoalProgress.tsx
│   ├── constants/                # 常量
│   │   ├── i18n.ts               # 中英文翻译
│   │   ├── theme.ts              # 主题配置
│   │   └── defaults.ts           # 默认值
│   └── utils/                    # 工具函数
│       ├── format.ts             # 格式化
│       └── validation.ts         # 校验
├── assets/                       # 静态资源
│   ├── icons/
│   └── images/
├── app.json                      # Expo 配置
├── package.json
├── tsconfig.json
└── README.md
```

---

## 6. 重构步骤（分阶段执行）

### Phase 1：基础架构搭建（1-2 周）
```
任务：
1. 初始化 Expo 项目（expo init）
2. 配置 TypeScript + Expo Router
3. 搭建 SQLite 数据库层（database.ts + migrations.ts）
4. 实现基础 Repository 模式（以 Subscription 为例）
5. 配置 Zustand 状态管理
6. 搭建基础 UI 组件库（Button, Card, Input）
7. 实现深色模式 + 中英文切换

交付物：
- 可运行的空壳 App
- 数据库初始化成功
- 基础组件可用
```

### Phase 2：订阅模块迁移（1 周）
```
任务：
1. 迁移 Subscription 数据模型
2. 实现订阅 CRUD 页面
3. 实现分类管理
4. 实现本地通知提醒
5. 实现费用统计图表
6. 实现数据导入导出

交付物：
- 订阅功能完整可用
- 通知正常工作
```

### Phase 3：物品收纳模块（1-2 周）
```
任务：
1. 设计 Item 数据模型
2. 实现物品录入/编辑页面
3. 实现使用频率记录功能
4. 实现单次使用成本计算
5. 实现闲置预警提醒
6. 实现物品统计视图

交付物：
- 物品管理功能完整
- 使用成本可视化
```

### Phase 4：习惯养成模块（1 周）
```
任务：
1. 设计 Habit 数据模型
2. 实现习惯创建/编辑页面
3. 实现每日打卡交互
4. 实现连续天数统计
5. 实现习惯热力图
6. 实现断签提醒

交付物：
- 习惯打卡功能完整
- 热力图可视化
```

### Phase 5：目标追踪模块（1 周）
```
任务：
1. 设计 Goal + Milestone 数据模型
2. 实现目标创建/编辑页面
3. 实现里程碑管理
4. 实现进度可视化
5. 实现定期回顾提醒

交付物：
- 目标追踪功能完整
```

### Phase 6：知识库模块（1 周）
```
任务：
1. 设计 KnowledgeEntry 数据模型
2. 实现书籍/课程录入
3. 实现阅读进度追踪
4. 实现笔记摘录功能
5. 实现学习时间统计

交付物：
- 知识库功能完整
```

### Phase 7：仪表盘整合（1 周）
```
任务：
1. 设计「长期主义指数」算法
2. 实现首页仪表盘
3. 实现跨模块趋势图表
4. 实现成就系统
5. 优化整体 UX

交付物：
- 完整的长期主义操作系统
```

### Phase 8：打磨与发布（1 周）
```
任务：
1. 性能优化
2. Bug 修复
3. 用户体验测试
4. 准备上架材料（截图、描述）
5. 打包 APK/AAB
6. （可选）提交 Google Play

交付物：
- 可发布的正式版本
```

---

## 7. 关键设计决策

### 7.1 数据同步策略
```
当前决策：纯本地，无云同步
理由：
- 用户明确要求不借助服务器
- 简化架构，降低维护成本
- 通过 JSON 导入导出实现手动备份

未来扩展：
- 如需多设备同步，可考虑：
  - iCloud CloudKit（iOS）
  - Google Drive API（Android）
  - 自建同步服务器（WebDAV 风格）
```

### 7.2 通知策略
```
订阅提醒：预约式通知（提前 N 天预约）
习惯提醒：每日固定时间提醒
闲置预警：每周扫描一次物品使用记录
目标回顾：每周/每月固定时间提醒

实现方式：
- 使用 expo-notifications 的 scheduleNotificationAsync
- App 启动时重新扫描并更新所有预约通知
```

### 7.3 长期主义指数算法（草案）
```
指数 = w1 * 习惯完成率 
     + w2 * 目标进度均值 
     + w3 * 物品使用率 
     + w4 * 订阅合理性评分 
     + w5 * 知识积累速率

权重建议：
w1 = 0.3 (习惯最重要)
w2 = 0.25 (目标次之)
w3 = 0.15 (物品使用)
w4 = 0.15 (订阅合理)
w5 = 0.15 (知识积累)

满分 100，实时计算并展示趋势
```

### 7.4 UI/UX 原则
```
- 极简设计，减少视觉噪音
- 深色模式优先（长时间使用护眼）
- 手势操作为主（滑动删除、长按编辑）
- 数据可视化优先（图表 > 文字）
- 渐进式披露（首页简洁，详情页丰富）
```

---

## 8. 风险与应对

| 风险 | 影响 | 应对措施 |
|------|------|----------|
| Expo SQLite 性能瓶颈 | 数据量大时卡顿 | 分页加载、索引优化、必要时迁移到 WatermelonDB |
| 本地通知被系统杀死 | 提醒失效 | App 启动时重排通知、引导用户关闭电池优化 |
| 用户数据丢失 | 严重后果 | 强调备份重要性、自动提示导出、加密备份选项 |
| 功能过于复杂 | 用户难上手 | MVP 先行、渐进式功能开放、新手引导 |
| 开发周期过长 | 失去动力 | 严格按 Phase 交付、每阶段可用 |

---

## 9. 成功指标

### 功能完整性
- [ ] 订阅管理 100% 迁移
- [ ] 物品收纳功能可用
- [ ] 习惯打卡功能可用
- [ ] 目标追踪功能可用
- [ ] 知识库功能可用
- [ ] 仪表盘整合完成

### 技术指标
- [ ] 冷启动 < 2 秒
- [ ] 页面切换 < 300ms
- [ ] 数据库查询 < 100ms（千条数据）
- [ ] 包体大小 < 30MB
- [ ] 内存占用 < 150MB

### 用户体验
- [ ] 核心流程 3 步内完成
- [ ] 通知准时可靠
- [ ] 数据导入导出无丢失
- [ ] 深色模式完美适配

---

## 10. 下一步行动

### 立即可做
1. 确认本计划是否符合你的预期
2. 决定是否调整模块优先级（如先做物品还是先做习惯）
3. 确认是否需要我协助初始化 Expo 项目

### 我可以帮你做的
- 生成 Expo 项目脚手架
- 编写数据库初始化代码
- 实现第一个模块（订阅或物品）的完整示例
- 设计具体的 UI 原型草图

---

**文档版本**: v1.0  
**创建日期**: 2026-05-26  
**最后更新**: 2026-05-26
