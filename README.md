# 生态进化论 - 完美数值版

一个基于深海生态系统的策略放置游戏，玩家需要构建平衡的生态链来产生能量。

## 文件结构

```
bio-game/
├── index.html              # 主HTML文件
├── css/
│   └── styles.css          # 样式文件
├── js/
│   ├── config.js           # 游戏配置数据
│   ├── sound-system.js     # 音效系统
│   ├── game-core.js        # 核心游戏逻辑
│   ├── ui-renderer.js      # UI渲染功能
│   └── encyclopedia.js      # 百科全书功能
└── README.md               # 说明文档
```

## 文件说明

### HTML文件
- `index.html` - 主页面，包含游戏界面结构和基础布局

### CSS文件
- `css/styles.css` - 包含所有自定义样式、动画效果和响应式设计

### JavaScript文件

#### `js/config.js`
- 游戏配置数据
- 生物定义（CREATURES）
- 生物分类（CATEGORIES）
- 关卡配置（STAGE_CONFIG）
- 肉鸽道具池（ROGUE_ITEMS_POOL）
- 基础游戏配置（CONFIG）

#### `js/sound-system.js`
- 音效系统
- 支持各种游戏音效（放置、移除、升级、错误等）
- 音量控制功能

#### `js/game-core.js`
- 核心游戏逻辑
- 游戏状态管理
- 生态影响计算
- 游戏主循环
- 生物操作（放置、移除、选择）
- 关卡系统
- 肉鸽道具系统

#### `js/ui-renderer.js`
- UI渲染相关功能
- 网格渲染
- 详情面板渲染
- 肉鸽道具渲染
- 关卡面板渲染
- 单元格视觉效果更新

#### `js/encyclopedia.js`
- 百科全书功能
- 生物关系网络可视化
- 生物详情展示
- 连接线绘制

## 游戏特性

1. **生态系统模拟** - 深海食物链的完整模拟
2. **肉鸽玩法** - 每关随机增益道具
3. **关卡系统** - 递增难度的挑战
4. **生物百科** - 完整的生物关系网络图谱
5. **音效系统** - 动态生成的游戏音效
6. **响应式设计** - 适配不同屏幕尺寸

## 开发说明

这个项目采用了模块化的文件结构，将原本的单个HTML文件拆分为多个专门的文件：

- **配置分离** - 所有游戏数据集中在config.js中，便于平衡性调整
- **功能模块化** - 不同功能分别独立成文件，便于维护和扩展
- **样式分离** - CSS样式独立成文件，便于主题定制
- **清晰的依赖关系** - JavaScript文件按依赖顺序加载

## 运行方法

直接在浏览器中打开 `index.html` 文件即可运行游戏。游戏使用了CDN资源（Tailwind CSS和Lucide图标），需要网络连接。

## 技术栈

- HTML5
- Tailwind CSS
- Vanilla JavaScript
- Web Audio API
- SVG绘图