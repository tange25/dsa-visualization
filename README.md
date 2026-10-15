# 数据结构与算法可视化

> 中文版数据结构与算法可视化教学网页：**零依赖、纯原生 JavaScript + SVG**，覆盖 10 个章节、**95 个可视化主题**，全部支持分步动画、单步执行与伪代码同步高亮。

- 在线演示：[GitHub Pages](https://tange25.github.io/dsa-visualization/)（如启用 Pages 后地址不同，以实际为准）
- 仓库地址：<https://github.com/tange25/dsa-visualization>
- 本地使用：直接双击 `index.html` 即可，无需构建、无需安装依赖

---

## 功能特性

- **分步动画**：每个主题按算法执行过程拆分为若干步骤，逐步推进，可随时暂停、回退
- **伪代码同步高亮**：右侧伪代码面板随动画实时高亮当前执行行，并有图例说明当前操作状态（当前操作 / 比较 / 交换移动 / 已完成 / 路径边 / 删除无效）
- **自定义数据**：每个主题支持手动输入数据、随机生成、一键套用典型示例
- **自动播放**：支持播放 / 暂停、上一步 / 下一步、重置 / 末尾，速度 1–10 档可调，带进度条
- **全文搜索**：顶部搜索框可按算法名称 / 章节 / 描述 / id 即时过滤导航
- **中文说明条**：每一步都配有中文解释文字，附带 O 记号时间复杂度说明
- **零外部依赖**：算法与渲染全部为原生 JS + SVG 实现，无需任何框架与构建工具；仅展示字体经 jsDelivr CDN 加载（离线时自动回退系统字体）

---

## 主题清单（95 个）

### 基础结构（9）

| 主题 | id |
| --- | --- |
| 栈（数组实现） | `stack-array` |
| 栈（链表实现） | `stack-ll` |
| 队列（循环数组） | `queue-array` |
| 队列（链表实现） | `queue-ll` |
| 单链表 | `bas-sll` |
| 双向链表 | `bas-dll` |
| 中缀转后缀（栈） | `bas-infix-post` |
| 单调栈（下一个更大元素） | `bas-mono-stack` |
| 滑动窗口最大值（单调队列） | `bas-slip-max` |

### 递归（5）

| 主题 | id |
| --- | --- |
| 阶乘（递归） | `rec-fact` |
| 字符串反转（递归） | `rec-reverse` |
| N 皇后问题 | `rec-queens` |
| 汉诺塔 | `rec-hanoi` |
| 斐波那契（递归） | `rec-fib` |

### 索引结构（16）

| 主题 | id |
| --- | --- |
| 二叉搜索树 | `bst` |
| AVL 树 | `avl` |
| 红黑树 | `redblack` |
| 伸展树 | `splay` |
| 跳表 | `skiplist` |
| 折半查找（二分查找） | `idx-binary` |
| 二叉树遍历（前/中/后/层序） | `idx-tree-order` |
| 分块查找（索引顺序查找） | `idx-block-search` |
| 线索二叉树 | `idx-threaded` |
| 树、森林与二叉树转换 | `idx-tree-convert` |
| Treap 树堆 | `idx-treap` |
| 开放寻址哈希表 | `openhash` |
| 链地址哈希表 | `closedhash` |
| 桶式哈希表 | `closedhash-bucket` |
| B 树 | `btree` |
| B+ 树 | `bplustree` |

### 排序（13）

| 主题 | id |
| --- | --- |
| 冒泡排序 | `bubble` |
| 选择排序 | `selection` |
| 插入排序 | `insertion` |
| 希尔排序 | `shell` |
| 归并排序 | `merge` |
| 快速排序 | `quick` |
| 桶排序 | `bucket` |
| 计数排序 | `counting` |
| 基数排序 | `radix` |
| 堆排序 | `heapsort` |
| 外部排序（多路归并） | `srt-external` |
| 鸡尾酒排序 | `srt-cocktail` |
| 梳排序 | `srt-comb` |

### 动态规划（8）

| 主题 | id |
| --- | --- |
| 二项式系数 | `dp-binomial` |
| 找零问题 | `dp-change` |
| 0-1 背包 | `dp-knapsack` |
| 最长公共子序列 | `dp-lcs` |
| 编辑距离 | `dp-edit` |
| 矩阵连乘（区间 DP） | `dp-matrix-chain` |
| 最长递增子序列 | `dp-lis` |
| 石子合并（区间 DP） | `dp-stone` |

### 字符串算法（9）

| 主题 | id |
| --- | --- |
| Boyer-Moore 字符串匹配 | `boyer-moore` |
| KMP 字符串匹配 | `kmp` |
| 字典树（Trie） | `trie` |
| 压缩字典树（Radix Tree） | `compressed-trie` |
| 哈夫曼编码 | `huffman` |
| Rabin-Karp 滚动哈希 | `str-rabin-karp` |
| Manacher 最长回文子串 | `str-manacher` |
| 后缀数组（倍增法） | `str-suffix-array` |
| AC 自动机 | `str-ac` |

### 堆结构（6）

| 主题 | id |
| --- | --- |
| 二叉堆（最小堆） | `heap` |
| 左倾堆 | `leftist` |
| 斜堆 | `skew` |
| 二项队列 | `binomial` |
| 斐波那契堆 | `fibonacci` |
| 配对堆 | `pairing-heap` |

### 图算法（16）

| 主题 | id |
| --- | --- |
| 广度优先搜索 | `bfs` |
| 深度优先搜索 | `dfs` |
| 连通分量 | `connected` |
| Dijkstra 最短路径 | `dijkstra` |
| Bellman-Ford 最短路 | `grp-bellman-ford` |
| Floyd-Warshall 全源最短路 | `floyd` |
| A* 启发式搜索 | `astar` |
| Prim 最小生成树 | `prim` |
| Kruskal 最小生成树 | `kruskal` |
| 拓扑排序（入度数组法） | `topo-indegree` |
| 拓扑排序（DFS 法） | `topo-dfs` |
| 关键路径（AOE 网） | `grp-aoe` |
| 最大流（Edmonds-Karp） | `grp-maxflow` |
| Tarjan 强连通分量 | `grp-tarjan` |
| 欧拉回路（Hierholzer） | `grp-euler` |
| 匈牙利算法（二分匹配） | `grp-hungarian` |

### 几何算法（7）

| 主题 | id |
| --- | --- |
| 2D 旋转与缩放矩阵 | `rotate-scale-2d` |
| 2D 旋转与平移矩阵 | `rotate-translate-2d` |
| 2D 坐标系变换 | `changing-coords-2d` |
| 3D 旋转与缩放矩阵 | `rotate-scale-3d` |
| 3D 坐标系变换 | `changing-coords-3d` |
| 凸包（Andrew 单调链） | `geo-convex-hull` |
| 最近点对（分治） | `geo-closest-pair` |

### 其他（6）

| 主题 | id |
| --- | --- |
| 并查集（Union-Find） | `disjoint` |
| 线段树（区间查询/更新） | `oth-segtree` |
| 树状数组（Fenwick） | `oth-fenwick` |
| 稀疏表 RMQ | `oth-sparse-table` |
| 布隆过滤器 | `oth-bloom` |
| LRU 缓存 | `oth-lru` |

---

## 快速开始

项目是纯静态网页，无任何构建步骤：

```bash
# 方式一：直接双击 index.html 用浏览器打开

# 方式二：本地静态服务器（推荐，避免个别浏览器对 file:// 的限制）
python -m http.server 8000
# 然后访问 http://localhost:8000
```

## 使用指南

### 界面布局

| 区域 | 作用 |
| --- | --- |
| 左侧导航 | 按章节列出全部主题，支持顶部搜索框即时过滤 |
| 中间画布 | SVG 逐步动画演示区 |
| 数据输入区 | 自定义数据、随机生成、典型示例、应用数据、清空结构 |
| 操作按钮区 | 重置 / 上一步 / 自动播放 / 下一步 / 末尾 |
| 右侧面板 | 伪代码（随动画高亮当前行）+ 状态图例 + 复制伪代码 |

### 快捷键

| 按键 | 功能 |
| --- | --- |
| `空格` | 播放 / 暂停 |
| `←` / `→` | 上一步 / 下一步 |
| `R` | 重置到开头 |
| `Esc` | 关闭移动端抽屉导航 |
| `Enter` | 应用数据 / 执行当前操作 |
| `Ctrl + Enter` | 多行输入框应用数据 |

### 动画控制

- 速度滑块 1–10 档，随时调整播放节奏
- 进度条显示当前步骤 / 总步数
- 图例说明节点颜色含义：当前操作 / 正在比较 / 交换移动 / 已完成 / 路径结果边 / 已删除无效

---

## 如何新增一个可视化主题

站点采用注册制，新增主题只需在对应章节的 `js/viz-*.js` 末尾追加一个 `DSV.register({...})`，导航与搜索会自动生效，无需改动 `app.js` 与样式。

```js
DSV.register({
  id: 'demo-id',            // 全局唯一
  name: '示例主题',          // 导航显示名
  category: '基础结构',      // 沿用现有章节名
  desc: '算法原理说明，含 O 记号复杂度。',
  code: [                   // 伪代码，前导空格表示缩进，按行号与步骤联动高亮
    '示例算法(x):',
    '  if x <= 1: return 1',
    '  return x * 示例算法(x - 1)'
  ],
  inputs: [{ key: 'n', label: 'n', def: '5', hint: '0-8 的整数' }],
  actions: [{ key: 'run', label: '开始演示', primary: true }],
  samples: [{ label: '示例：n = 5', values: { n: '5' } }],
  random: function () { return { n: String(DSV.ri(2, 8)) }; },
  run: function (values, action, state) {
    // 返回步骤数组（无状态算法）或 { steps, state }（有状态算法）
    return steps;   // 每步 = { code: [行号], desc: '中文说明', snap: { 任意状态 } }
  },
  render: function (kr, snap, ctx) {
    // 用 KRender 绘制当前 snap 状态（节点 class 对应图例：active/compare/swap/done/path/dead）
  }
});
```

> 参考实现模板：无状态算法见 `js/viz-recursion.js` 的 `rec-fact`；有状态算法见 `js/viz-graph.js`。修改过的 JS 文件记得同步更新 `index.html` 中对应的 `?v=` 版本参数，以便浏览器刷新缓存。

---

## 项目结构

```
├── index.html             # 入口页面：导航、画布、伪代码面板、动画控制
├── css/
│   └── style.css          # 全站样式
├── js/
│   ├── core.js            # 可视化引擎：DSV.register 注册表、KRender 渲染器、工具函数
│   ├── viz-basics.js      # 基础结构：栈 / 队列 / 链表 / 栈应用
│   ├── viz-recursion.js   # 递归：阶乘 / 反转 / 皇后 / 汉诺塔 / 斐波那契
│   ├── viz-indexing1.js   # 索引结构一：BST / AVL / 红黑 / 伸展 / 跳表 / 查找 / 遍历 / Treap
│   ├── viz-indexing2.js   # 索引结构二：哈希表 / B 树 / B+ 树
│   ├── viz-sorting.js     # 排序：经典 10 种 + 外部排序 / 鸡尾酒 / 梳排序
│   ├── viz-dp.js          # 动态规划：背包 / LCS / 编辑距离 / 矩阵连乘 / LIS / 石子合并
│   ├── viz-strings.js     # 字符串算法：BM / KMP / Trie / 哈夫曼 / Rabin-Karp / Manacher / SA / AC
│   ├── viz-heaps.js       # 堆结构：二叉堆 / 左倾堆 / 斜堆 / 二项队列 / 斐波那契堆 / 配对堆
│   ├── viz-graph.js       # 图算法：BFS / DFS / 最短路 / 最小生成树 / 拓扑 / 关键路径 / 最大流等
│   ├── viz-geo.js         # 几何算法：2D/3D 矩阵变换 / 凸包 / 最近点对
│   └── viz-other.js       # 其他：并查集 / 线段树 / 树状数组 / 稀疏表 / 布隆过滤器 / LRU
└── .gitignore
```

脚本加载顺序（`index.html` 中固定）：`core` → `viz-basics` → `viz-recursion` → `viz-indexing1` → `viz-indexing2` → `viz-sorting` → `viz-dp` → `viz-strings` → `viz-heaps` → `viz-graph` → `viz-geo` → `viz-other` → `app`。

---

## 部署

项目为纯静态站点，可部署到任意静态托管（GitHub Pages / Vercel / Netlify / 对象存储等）。

### GitHub Pages

1. 将 `index.html`、`css/`、`js/` 推送到仓库（如 `main` 分支根目录）
2. 仓库 `Settings → Pages` → Source 选择 `Deploy from a branch` → 分支选 `main`，目录选 `/ (root)`
3. 保存后访问 `https://<用户名>.github.io/<仓库名>/` 即可

本地 `deploy/` 目录中为一次性部署辅助脚本（Git Data API 上传），已通过 `.gitignore` 排除，不入库。

---

## 技术说明

- **零依赖**：算法逻辑与 SVG 渲染全部原生实现，无 jQuery / 无框架 / 无构建工具
- **渲染引擎**：`core.js` 内置 KRender，节点与连线支持过渡动画；状态颜色与右侧图例一一对应
- **字体**：标题 / 正文 / 代码字体经 jsDelivr CDN 按需加载，网络不可用时回退系统字体
- **缓存控制**：`index.html` 中每个脚本带 `?v=` 版本参数，修改 JS 后改位即可强制刷新

---

## 致谢与维护

本项目为个人学习项目，用于数据结构与算法课程的辅助教学。欢迎提交 Issue 反馈问题或建议，也欢迎以「新增一个 `DSV.register` 主题」的方式贡献新的可视化算法。
