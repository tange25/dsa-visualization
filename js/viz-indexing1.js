/* ============================================================
   viz-indexing1.js —— 索引结构章节（5 个有状态数据结构）
   二叉搜索树 / AVL 树 / 红黑树 / 伸展树 / 跳表
   全部为「有状态」结构：run 返回 { steps, state }
   ============================================================ */
(function () {
  'use strict';
  var DSV = window.DSV, S = DSV.svg;

  /* ============================================================
     0. 通用小工具
     ============================================================ */
  function push(steps, code, desc, snap) { steps.push({ code: code, desc: desc, snap: snap }); }
  function one(id, cls) { var o = {}; if (id != null) { o[id] = cls; } return o; }
  function copyHL(hl) { var o = {}; for (var k in hl) { o[k] = hl[k]; } return o; }
  function pathHL(path, curId, curCls) {
    var hl = {}, i;
    for (i = 0; i < path.length; i++) { hl[path[i].id] = 'path'; }
    if (curId != null) { hl[curId] = curCls || 'compare'; }
    return hl;
  }

  /* ---------- 树状态：{root, next} ---------- */
  function newState() { return { root: null, next: 1 }; }

  /** 新建结点，id 用递增计数器保证稳定唯一 */
  function mkNode(v, st, ext) {
    var n = { id: 'n' + st.next, v: v, left: null, right: null };
    st.next++;
    if (ext) { for (var k in ext) { n[k] = ext[k]; } }
    return n;
  }

  /** 深拷贝整棵树，避免历史步骤被后续修改污染 */
  function mkSnap(st, hl, title, sub, hlE) {
    return { root: DSV.clone(st.root), hl: hl || {}, hlE: hlE || {}, title: title || '', sub: sub || '' };
  }

  /* ---------- 高度 / 平衡因子 ---------- */
  function hOf(n) { return n ? (n.h || 1) : 0; }
  function updH(n) { n.h = Math.max(hOf(n.left), hOf(n.right)) + 1; return n.h; }
  function bfOf(n) { return n ? hOf(n.left) - hOf(n.right) : 0; }

  /* ---------- 结构操作 ---------- */
  /** 把父结点 par 指向 oldC 的指针改成 newC（par 为 null 表示改根） */
  function link(st, par, oldC, newC) {
    if (!par) { st.root = newC; return; }
    if (par.left && oldC && par.left.id === oldC.id) { par.left = newC; }
    else if (par.right && oldC && par.right.id === oldC.id) { par.right = newC; }
  }

  /** 在全树中查找 target 的父结点（返回 null 表示 target 是根或不存在） */
  function findParent(root, target) {
    if (!root || !target || root.id === target.id) { return null; }
    var found = null;
    (function walk(n) {
      if (!n || found) { return; }
      if ((n.left && n.left.id === target.id) || (n.right && n.right.id === target.id)) { found = n; return; }
      walk(n.left); walk(n.right);
    })(root);
    return found;
  }

  /**
   * 通用单旋：把 y 的 side 孩子旋上来
   * side === 'left'  → 右旋（LL 修正用）
   * side === 'right' → 左旋（RR 修正用）
   */
  function rotate(st, y, par, side) {
    var x = y[side];
    if (!x) { return y; }
    if (side === 'left') { y.left = x.right; x.right = y; }
    else { y.right = x.left; x.left = y; }
    updH(y); updH(x);
    if (!par) { st.root = x; }
    else if (par.left && par.left.id === y.id) { par.left = x; }
    else if (par.right && par.right.id === y.id) { par.right = x; }
    return x;
  }
  function rotName(side) { return side === 'left' ? '右旋' : '左旋'; }
  function sideName(side) { return side === 'left' ? '左' : '右'; }

  /* ---------- 通用 BST 插入（BST / AVL / 红黑树 / 伸展树复用） ---------- */
  /** L = {e:[…], loop:n, left:n, right:n, dup:n, attach:n} */
  function insCore(st, steps, x, tag, L, ext) {
    if (!st.root) {
      st.root = mkNode(x, st, ext);
      push(steps, L.e, '树当前为空，直接创建根结点 ' + x, mkSnap(st, one(st.root.id, 'active'), tag, '新根结点 ' + x));
      return { node: st.root, path: [st.root], dup: false };
    }
    var p = st.root, path = [], i;
    while (p) {
      var hl = {}, hl2;
      for (i = 0; i < path.length; i++) { hl[path[i].id] = 'path'; }
      hl[p.id] = 'compare';
      if (x < p.v) {
        push(steps, [L.loop, L.left], '比较 ' + x + ' < ' + p.v + '，往左子树走', mkSnap(st, hl, tag, '当前结点 ' + p.v));
        path.push(p);
        if (!p.left) {
          p.left = mkNode(x, st, ext);
          hl2 = copyHL(hl); hl2[p.id] = 'path'; hl2[p.left.id] = 'active';
          push(steps, [L.attach], p.v + ' 的左孩子为空，把 ' + x + ' 作为它的左孩子插入', mkSnap(st, hl2, tag, '插入 ' + x));
          return { node: p.left, path: path.concat([p.left]), dup: false };
        }
        p = p.left;
      } else if (x > p.v) {
        push(steps, [L.loop, L.right], '比较 ' + x + ' > ' + p.v + '，往右子树走', mkSnap(st, hl, tag, '当前结点 ' + p.v));
        path.push(p);
        if (!p.right) {
          p.right = mkNode(x, st, ext);
          hl2 = copyHL(hl); hl2[p.id] = 'path'; hl2[p.right.id] = 'active';
          push(steps, [L.attach], p.v + ' 的右孩子为空，把 ' + x + ' 作为它的右孩子插入', mkSnap(st, hl2, tag, '插入 ' + x));
          return { node: p.right, path: path.concat([p.right]), dup: false };
        }
        p = p.right;
      } else {
        hl2 = copyHL(hl); hl2[p.id] = 'active';
        push(steps, [L.dup], '比较 ' + x + ' == ' + p.v + '，该值已存在，不重复插入', mkSnap(st, hl2, tag, '值 ' + x + ' 已存在'));
        return { node: p, path: path.concat([p]), dup: true };
      }
    }
    return { node: null, path: path, dup: false };
  }

  /* ---------- 通用 BST 查找（BST / 红黑树复用） ---------- */
  function findCore(st, steps, x, tag, L) {
    if (!st.root) {
      push(steps, [L.f[0]], '树为空，查找 ' + x + ' 失败', mkSnap(st, {}, tag, '空树'));
      return null;
    }
    var p = st.root, path = [], i;
    while (p) {
      var hl = {};
      for (i = 0; i < path.length; i++) { hl[path[i].id] = 'path'; }
      hl[p.id] = 'compare';
      if (p.v === x) {
        push(steps, [L.feq], '比较 ' + x + ' == ' + p.v + '：命中！找到目标结点', mkSnap(st, one(p.id, 'active'), tag, '命中 ' + x));
        return p;
      }
      var less = x < p.v;
      push(steps, [L.fleft], '比较 ' + x + (less ? ' < ' : ' > ') + p.v + '，往' + (less ? '左' : '右') + '子树走', mkSnap(st, hl, tag, '当前结点 ' + p.v));
      path.push(p);
      p = less ? p.left : p.right;
    }
    var hl2 = {};
    for (i = 0; i < path.length; i++) { hl2[path[i].id] = 'path'; }
    push(steps, [L.fnull], '走到空指针：树中不存在 ' + x + '，查找结束', mkSnap(st, hl2, tag, '未找到 ' + x));
    return null;
  }

  /* ---------- 通用 BST 删除（BST / AVL 复用），返回 {ok, path} ---------- */
  function removeBST(st, steps, x, tag, L) {
    var k, hl, i;
    if (!st.root) {
      push(steps, [L.dfind], '树为空，无法删除 ' + x, mkSnap(st, {}, tag, '空树'));
      return { ok: false, path: [] };
    }
    var p = st.root, par = null, path = [];
    while (p) {
      hl = {};
      for (i = 0; i < path.length; i++) { hl[path[i].id] = 'path'; }
      hl[p.id] = 'compare';
      if (x === p.v) { break; }
      if (x < p.v) {
        push(steps, [L.dfind], '比较 ' + x + ' < ' + p.v + '，往左子树继续查找待删结点', mkSnap(st, hl, tag, '查找 ' + x));
        path.push(p); par = p; p = p.left;
      } else {
        push(steps, [L.dfind], '比较 ' + x + ' > ' + p.v + '，往右子树继续查找待删结点', mkSnap(st, hl, tag, '查找 ' + x));
        path.push(p); par = p; p = p.right;
      }
    }
    if (!p) {
      hl = {};
      for (i = 0; i < path.length; i++) { hl[path[i].id] = 'path'; }
      push(steps, [L.dfind], '走到空指针：树中不存在 ' + x + '，删除结束', mkSnap(st, hl, tag, '未找到 ' + x));
      return { ok: false, path: path };
    }
    hl = {};
    for (i = 0; i < path.length; i++) { hl[path[i].id] = 'path'; }
    hl[p.id] = 'active';
    push(steps, [L.dfind], '找到待删结点 ' + p.v, mkSnap(st, hl, tag, '命中 ' + p.v));

    /* 情况三：两个孩子 —— 用中序后继顶替 */
    if (p.left && p.right) {
      push(steps, [L.dtwo], '结点 ' + p.v + ' 左右孩子都在（情况三）：要用它的中序后继（右子树最小结点）顶替', mkSnap(st, hl, tag, '情况三：两个孩子'));
      var sp = p, s = p.right, sPath = [p], h4;
      while (s.left) {
        h4 = copyHL(hl);
        for (k = 1; k < sPath.length; k++) { h4[sPath[k].id] = 'path'; }
        h4[s.id] = 'compare';
        push(steps, [L.dsucc], '进入右子树后一直往左走：' + s.v + ' 有左孩子，继续向左', mkSnap(st, h4, tag, '寻找中序后继'));
        sPath.push(s); sp = s; s = s.left;
      }
      var h5 = copyHL(hl);
      for (k = 1; k < sPath.length; k++) { h5[sPath[k].id] = 'path'; }
      h5[s.id] = 'active';
      push(steps, [L.dsucc], '中序后继 s = ' + s.v + '（右子树中的最小值，所以它至多只有一个右孩子）', mkSnap(st, h5, tag, '后继 = ' + s.v));
      var oldv = p.v, child = s.right;
      p.v = s.v;
      var h6 = copyHL(h5); h6[p.id] = 'swap'; h6[s.id] = 'dead';
      push(steps, [L.dcopy], '用后继的值 ' + s.v + ' 覆盖待删结点（原值 ' + oldv + '），问题转化为删除后继结点', mkSnap(st, h6, tag, '用后继顶替'));
      if (sp.left && sp.left.id === s.id) { sp.left = child; } else { sp.right = child; }
      if (child) { h6[child.id] = 'path'; }
      push(steps, [L.dcopy], '摘掉后继结点 ' + s.v + (child ? '，用它的右孩子 ' + child.v + ' 顶替该位置' : '，它是叶子，直接置空'), mkSnap(st, h6, tag, '删除后继'));
      return { ok: true, path: path.concat(sPath) };
    }
    /* 情况二：只有一个孩子 */
    if (p.left || p.right) {
      var c = p.left || p.right;
      var h7 = copyHL(hl); h7[p.id] = 'dead'; h7[c.id] = 'path';
      push(steps, [L.done], '结点 ' + p.v + ' 只有一个' + (p.left ? '左' : '右') + '孩子 ' + c.v + '（情况二）：让这个孩子顶替它的位置', mkSnap(st, h7, tag, '情况二：单个孩子'));
      link(st, par, p, c);
      push(steps, [L.done], '删除完成：' + c.v + ' 已接到原来 ' + p.v + ' 所在的位置', mkSnap(st, one(c.id, 'active'), tag, '删除 ' + x + ' 完成'));
      return { ok: true, path: path };
    }
    /* 情况一：叶子 */
    var h9 = copyHL(hl); h9[p.id] = 'dead';
    push(steps, [L.dleaf], '结点 ' + p.v + ' 是叶子（情况一）：直接把父结点的对应指针置空', mkSnap(st, h9, tag, '情况一：叶子'));
    link(st, par, p, null);
    push(steps, [L.dleaf], '删除完成：结点 ' + x + ' 已从树中移除', mkSnap(st, {}, tag, '删除 ' + x + ' 完成'));
    return { ok: true, path: path };
  }

  /* ============================================================
     1. 二叉搜索树 BST
     ============================================================ */
  var BST_CODE = [
    '// 二叉搜索树：任一结点的左子树所有值 < 它 < 右子树所有值',
    'insert(x):',
    '  if root == null:',
    '    root = new Node(x); return',
    '  p = root',
    '  while p != null:',
    '    if x < p.val:  parent = p; p = p.left',
    '    else if x > p.val: parent = p; p = p.right',
    '    else: return                    // 值已存在，不重复插入',
    '  把 x 挂到 parent 对应的空孩子位置',
    '',
    'find(x):',
    '  p = root',
    '  while p != null:',
    '    if x == p.val: return p         // 命中',
    '    else if x < p.val: p = p.left',
    '    else: p = p.right',
    '  return null                       // 走到空指针，未找到',
    '',
    'delete(x):',
    '  先按 find 的方式定位待删结点 t（并记住它的父结点）',
    '  if t 是叶子:        直接把父结点对应指针置空',
    '  if t 只有一个孩子:  用这个孩子顶替 t 的位置',
    '  if t 有两个孩子:',
    '    s = t 右子树中的最小结点（中序后继）',
    '    t.val = s.val;  再按「至多一个孩子」的规则删掉 s'
  ];
  var BL = {
    e: [2, 3], loop: 5, left: 6, right: 7, dup: 8, attach: 9,
    f: [12, 13], feq: 14, fleft: 15, fright: 16, fnull: 17,
    dfind: 20, dleaf: 21, done: 22, dtwo: 23, dsucc: 24, dcopy: 25
  };

  DSV.register({
    id: 'bst', name: '二叉搜索树', category: '索引结构',
    desc: '二叉搜索树：任一结点的左子树所有值小于它、右子树所有值大于它，因此查找/插入/删除都只需沿一条路径向下走。树平衡时三种操作都是 O(log n)，最坏（退化成链）为 O(n)，中序遍历可得到有序序列。',
    code: BST_CODE,
    inputs: [{ key: 'init', label: '初始序列', def: '50,30,70,20,40,60,80', hint: '逗号分隔的整数' }],
    actions: [
      { key: 'build', label: '建树', primary: true },
      { key: 'insert', label: '插入', arg: { label: '值', def: '25' } },
      { key: 'find', label: '查找', arg: { label: '值', def: '40' } },
      { key: 'delete', label: '删除', arg: { label: '值', def: '30' } }
    ],
    samples: [
      { label: '示例：较平衡的满二叉树', values: { init: '50,30,70,20,40,60,80' } },
      { label: '示例：删除有两个孩子的结点（用中序后继）', values: { init: '50,30,70,20,40,60,80' } },
      { label: '示例：有序插入会退化成一条链', values: { init: '10,20,30,40,50,60' } }
    ],
    random: function () { return { init: DSV.uniq(DSV.randArr(DSV.ri(7, 9), 1, 99)).join(',') }; },
    run: function (v, action, state) {
      var st = state || newState(), steps = [];
      var key = (action && action.key) || 'build';
      var arg = action && action.arg != null ? String(action.arg).trim() : '';
      var x;

      if (key === 'build') {
        var a = DSV.nums(v.init, 10);
        st = newState();
        push(steps, [0], '开始建树：依次插入 ' + (a.length ? a.join(' → ') : '（空序列）'), mkSnap(st, {}, '二叉搜索树 · 建树', '初始序列：' + (a.join(', ') || '空')));
        if (!a.length) {
          push(steps, [0], '初始序列为空，得到一棵空树', mkSnap(st, {}, '二叉搜索树', '空树'));
          return { steps: steps, state: st };
        }
        for (var i = 0; i < a.length; i++) {
          insCore(st, steps, a[i], '建树：插入 ' + a[i], BL);
        }
        push(steps, [0], '建树完成，共 ' + a.length + ' 个结点（中序遍历即为升序序列）', mkSnap(st, {}, '二叉搜索树 · 建树完成', '结点数 ' + a.length));
        return { steps: steps, state: st };
      }
      if (key === 'insert') {
        x = parseInt(arg, 10);
        if (!isFinite(x)) {
          push(steps, [0], '插入失败：请在「值」输入框中填写一个整数。', mkSnap(st, {}, '二叉搜索树', '输入非法'));
          return { steps: steps, state: st };
        }
        insCore(st, steps, x, '插入 ' + x, BL);
        return { steps: steps, state: st };
      }
      if (key === 'find' || key === 'search') {
        x = parseInt(arg, 10);
        if (!isFinite(x)) {
          push(steps, [11], '查找失败：请在「值」输入框中填写一个整数。', mkSnap(st, {}, '二叉搜索树', '输入非法'));
          return { steps: steps, state: st };
        }
        findCore(st, steps, x, '查找 ' + x, BL);
        return { steps: steps, state: st };
      }
      if (key === 'delete') {
        x = parseInt(arg, 10);
        if (!isFinite(x)) {
          push(steps, [19], '删除失败：请在「值」输入框中填写一个整数。', mkSnap(st, {}, '二叉搜索树', '输入非法'));
          return { steps: steps, state: st };
        }
        removeBST(st, steps, x, '删除 ' + x, BL);
        return { steps: steps, state: st };
      }
      /* 未知动作：按建树处理 */
      var b = DSV.nums(v.init, 10);
      st = newState();
      push(steps, [0], '开始建树：依次插入 ' + b.join(' → '), mkSnap(st, {}, '二叉搜索树 · 建树', '初始序列：' + b.join(', ')));
      for (var j = 0; j < b.length; j++) { insCore(st, steps, b[j], '建树：插入 ' + b[j], BL); }
      push(steps, [0], '建树完成', mkSnap(st, {}, '二叉搜索树 · 建树完成', '结点数 ' + b.length));
      return { steps: steps, state: st };
    },
    render: function (kr, s) {
      if (!s) {
        kr.html('__empty', S.text(500, 250, '尚未开始：点击「建树」或「插入」开始演示。', 'vs'));
        kr.end();
        return;
      }
      drawTreeSnap(kr, s, {
        node: function (n) {
          return { inner: S.circle(0, 0, 24) + S.text(0, 0, n.v), cls: s.hl[n.id] || '' };
        }
      });
      kr.end();
    }
  });

  /** 通用树绘制（标题 + 副标题 + drawTree） */
  function drawTreeSnap(kr, s, opt) {
    opt = opt || {};
    kr.html('__t', S.text(500, 24, s.title || '', 'vt'));
    if (s.sub) { kr.html('__sub', S.text(500, 45, s.sub, 'vs')); }
    if (!s.root) {
      kr.html('__empty', S.text(500, 250, '（当前为空树：请点击「建树」或用「插入」添加结点）', 'vs'));
      return;
    }
    DSV.drawTree(kr, s.root, {
      top: opt.top || 86, dy: opt.dy || 74, dx: opt.dx || 46,
      node: opt.node,
      edge: function (pa, ch) { return (s.hlE && s.hlE[ch.id]) || 'tree'; }
    });
  }

  /* ============================================================
     2. AVL 树
     ============================================================ */
  var AVL_CODE = [
    '// AVL 树：任一结点的平衡因子 bf = h(左子树) - h(右子树) ∈ {-1, 0, 1}',
    'insert(x):',
    '  按二叉搜索树的规则插入 x，新结点高度 h = 1',
    '  for 从插入点沿路径向上回溯到根:',
    '    更新高度 h = max(h(左), h(右)) + 1',
    '    bf = h(左子树) - h(右子树)',
    '    if |bf| <= 1: continue                       // 仍然平衡',
    '    if bf > 1 and bf(左孩子) >= 0:  以当前结点为轴右旋          // LL',
    '    if bf < -1 and bf(右孩子) <= 0: 以当前结点为轴左旋          // RR',
    '    if bf > 1 and bf(左孩子) < 0:   先左旋左孩子，再右旋当前结点 // LR',
    '    if bf < -1 and bf(右孩子) > 0:  先右旋右孩子，再左旋当前结点 // RL',
    '',
    'delete(x):',
    '  按二叉搜索树规则删除（叶子 / 单孩子 / 双孩子用中序后继顶替）',
    '  再从删除位置向上回溯，重复上面的高度更新与四种旋转修正',
    '',
    'find(x):',
    '  p = root',
    '  while p != null:',
    '    if x == p.val: return p                       // 命中',
    '    else if x < p.val: p = p.left',
    '    else: p = p.right',
    '  return null                                     // 未找到'
  ];
  var AL = {
    e: [2], loop: 2, left: 2, right: 2, dup: 2, attach: 2,
    upd: 4, bf: 5, ok: 6, ll: 7, rr: 8, lr: 9, rl: 10,
    dfind: 13, dleaf: 13, done: 13, dtwo: 13, dsucc: 13, dcopy: 13, dre: 14,
    f: [17], feq: 19, fleft: 20, fright: 21, fnull: 22
  };

  /** 沿 path 自底向上更新高度并修正失衡 */
  function avlRebalance(st, steps, path, tag, L) {
    var i, y, par, bf, hl;
    for (i = path.length - 1; i >= 0; i--) {
      y = path[i];
      par = i > 0 ? path[i - 1] : null;
      updH(y);
      bf = bfOf(y);
      hl = pathHL(path.slice(0, i + 1), y.id, 'compare');
      push(steps, [L.upd, L.bf], '回溯到结点 ' + y.v + '：更新高度 h = ' + y.h + '，平衡因子 bf = ' + hOf(y.left) + ' - ' + hOf(y.right) + ' = ' + bf +
        (Math.abs(bf) > 1 ? '，|bf| > 1，发生失衡，需要旋转修正' : '，|bf| ≤ 1，仍然平衡'),
        mkSnap(st, hl, tag, '回溯 ' + y.v + '：bf = ' + bf));
      if (Math.abs(bf) <= 1) { continue; }

      var yv = y.v;
      if (bf > 1 && bfOf(y.left) >= 0) {
        var xv = y.left.v;
        push(steps, [L.ll], 'LL 型失衡（' + yv + ' 的左子树过高，且左孩子 ' + xv + ' 的左子树不低于其右子树）：以 ' + yv + ' 为轴右旋',
          mkSnap(st, pathHL(path.slice(0, i + 1), y.id, 'compare'), tag, 'LL 型 → 以 ' + yv + ' 为轴右旋'));
        rotate(st, y, par, 'left');
        push(steps, [L.ll], '以 ' + yv + ' 为轴右旋完成：' + xv + ' 上升一层成为子树根，' + yv + ' 变成它的右孩子，子树恢复平衡',
          mkSnap(st, {}, tag, 'LL 修正完成'));
      } else if (bf < -1 && bfOf(y.right) <= 0) {
        var xr = y.right.v;
        push(steps, [L.rr], 'RR 型失衡（' + yv + ' 的右子树过高，且右孩子 ' + xr + ' 的右子树不低于其左子树）：以 ' + yv + ' 为轴左旋',
          mkSnap(st, pathHL(path.slice(0, i + 1), y.id, 'compare'), tag, 'RR 型 → 以 ' + yv + ' 为轴左旋'));
        rotate(st, y, par, 'right');
        push(steps, [L.rr], '以 ' + yv + ' 为轴左旋完成：' + xr + ' 上升一层成为子树根，' + yv + ' 变成它的左孩子，子树恢复平衡',
          mkSnap(st, {}, tag, 'RR 修正完成'));
      } else if (bf > 1) {
        var lch = y.left.v;
        push(steps, [L.lr], 'LR 型失衡（' + yv + ' 的左子树过高，但左孩子 ' + lch + ' 的右子树更高）：先以左孩子 ' + lch + ' 为轴左旋，再以 ' + yv + ' 为轴右旋',
          mkSnap(st, pathHL(path.slice(0, i + 1), y.id, 'compare'), tag, 'LR 型 → 先左旋再右旋'));
        rotate(st, y.left, y, 'right');
        push(steps, [L.lr], '第一次旋转（以 ' + lch + ' 为轴左旋）完成：较高的一侧被转到外侧，已转化为 LL 型', mkSnap(st, {}, tag, 'LR：第一次旋转完成'));
        rotate(st, y, par, 'left');
        push(steps, [L.lr], '第二次旋转（以 ' + yv + ' 为轴右旋）完成：子树恢复平衡', mkSnap(st, {}, tag, 'LR 修正完成'));
      } else {
        var rch = y.right.v;
        push(steps, [L.rl], 'RL 型失衡（' + yv + ' 的右子树过高，但右孩子 ' + rch + ' 的左子树更高）：先以右孩子 ' + rch + ' 为轴右旋，再以 ' + yv + ' 为轴左旋',
          mkSnap(st, pathHL(path.slice(0, i + 1), y.id, 'compare'), tag, 'RL 型 → 先右旋再左旋'));
        rotate(st, y.right, y, 'left');
        push(steps, [L.rl], '第一次旋转（以 ' + rch + ' 为轴右旋）完成：较高的一侧被转到外侧，已转化为 RR 型', mkSnap(st, {}, tag, 'RL：第一次旋转完成'));
        rotate(st, y, par, 'right');
        push(steps, [L.rl], '第二次旋转（以 ' + yv + ' 为轴左旋）完成：子树恢复平衡', mkSnap(st, {}, tag, 'RL 修正完成'));
      }
    }
    if (st.root) { updH(st.root); }
  }

  function avlInsert(st, steps, x, tag) {
    var r = insCore(st, steps, x, tag, AL, { h: 1 });
    if (!r.node || r.dup) { return; }
    avlRebalance(st, steps, r.path, tag, AL);
  }

  function avlDelete(st, steps, x, tag) {
    var r = removeBST(st, steps, x, tag, AL);
    if (!r.ok) { return; }
    push(steps, [AL.dre], '删除完成，现在从删除位置向上回溯，检查每层是否失衡', mkSnap(st, {}, tag, '删除后回溯修正'));
    avlRebalance(st, steps, r.path, tag, AL);
  }

  DSV.register({
    id: 'avl', name: 'AVL 树', category: '索引结构',
    desc: 'AVL 树是最早的自平衡二叉搜索树：每个结点维护高度，平衡因子 bf = 左子树高 − 右子树高必须落在 {−1,0,1}。插入/删除后沿路径回溯更新高度，一旦失衡就用 LL 右旋、RR 左旋、LR（先左旋后右旋）、RL（先右旋后左旋）四种旋转修正。查找/插入/删除均为 O(log n)。',
    viewBox: '0 0 1000 560',
    code: AVL_CODE,
    inputs: [{ key: 'init', label: '初始序列', def: '10,20,30', hint: '逗号分隔的整数' }],
    actions: [
      { key: 'build', label: '建树', primary: true },
      { key: 'insert', label: '插入', arg: { label: '值', def: '40' } },
      { key: 'find', label: '查找', arg: { label: '值', def: '20' } },
      { key: 'delete', label: '删除', arg: { label: '值', def: '20' } }
    ],
    samples: [
      { label: '示例：触发 RR 左旋（插入 10,20,30）', values: { init: '10,20,30' } },
      { label: '示例：触发 LL 右旋（插入 30,20,10）', values: { init: '30,20,10' } },
      { label: '示例：触发 LR（先左旋后右旋，10,20,15）', values: { init: '10,20,15' } },
      { label: '示例：触发 RL（先右旋后左旋，30,10,20）', values: { init: '30,10,20' } },
      { label: '示例：综合序列（多次旋转）', values: { init: '50,25,70,10,35,60,80,5,15,30' } }
    ],
    random: function () { return { init: DSV.uniq(DSV.randArr(DSV.ri(7, 9), 1, 99)).join(',') }; },
    run: function (v, action, state) {
      var st = state || newState(), steps = [];
      var key = (action && action.key) || 'build';
      var arg = action && action.arg != null ? String(action.arg).trim() : '';
      var x, i, a;

      if (key === 'build') {
        a = DSV.nums(v.init, 10);
        st = newState();
        push(steps, [0], '开始建立 AVL 树：依次插入 ' + (a.length ? a.join(' → ') : '（空序列）'), mkSnap(st, {}, 'AVL 树 · 建树', '初始序列：' + (a.join(', ') || '空')));
        if (!a.length) {
          push(steps, [0], '初始序列为空，得到一棵空树', mkSnap(st, {}, 'AVL 树', '空树'));
          return { steps: steps, state: st };
        }
        for (i = 0; i < a.length; i++) { avlInsert(st, steps, a[i], '建树：插入 ' + a[i]); }
        push(steps, [0], '建树完成：所有结点的平衡因子都在 {-1,0,1} 内', mkSnap(st, {}, 'AVL 树 · 建树完成', '结点数 ' + a.length));
        return { steps: steps, state: st };
      }
      if (key === 'insert') {
        x = parseInt(arg, 10);
        if (!isFinite(x)) {
          push(steps, [1], '插入失败：请在「值」输入框中填写一个整数。', mkSnap(st, {}, 'AVL 树', '输入非法'));
          return { steps: steps, state: st };
        }
        avlInsert(st, steps, x, '插入 ' + x);
        return { steps: steps, state: st };
      }
      if (key === 'find' || key === 'search') {
        x = parseInt(arg, 10);
        if (!isFinite(x)) {
          push(steps, [16], '查找失败：请在「值」输入框中填写一个整数。', mkSnap(st, {}, 'AVL 树', '输入非法'));
          return { steps: steps, state: st };
        }
        findCore(st, steps, x, '查找 ' + x, AL);
        return { steps: steps, state: st };
      }
      if (key === 'delete') {
        x = parseInt(arg, 10);
        if (!isFinite(x)) {
          push(steps, [12], '删除失败：请在「值」输入框中填写一个整数。', mkSnap(st, {}, 'AVL 树', '输入非法'));
          return { steps: steps, state: st };
        }
        avlDelete(st, steps, x, '删除 ' + x);
        return { steps: steps, state: st };
      }
      a = DSV.nums(v.init, 10);
      st = newState();
      push(steps, [0], '开始建立 AVL 树：依次插入 ' + a.join(' → '), mkSnap(st, {}, 'AVL 树 · 建树', '初始序列：' + a.join(', ')));
      for (i = 0; i < a.length; i++) { avlInsert(st, steps, a[i], '建树：插入 ' + a[i]); }
      push(steps, [0], '建树完成', mkSnap(st, {}, 'AVL 树 · 建树完成', '结点数 ' + a.length));
      return { steps: steps, state: st };
    },
    render: function (kr, s) {
      if (!s) {
        kr.html('__empty', S.text(500, 250, '尚未开始：点击「建树」或「插入」开始演示。', 'vs'));
        kr.end();
        return;
      }
      drawTreeSnap(kr, s, {
        top: 100, dy: 76, dx: 48,
        node: function (n) {
          var bf = bfOf(n);
          var bfs = (bf > 0 ? '+' : '') + bf;
          var inner = S.circle(0, 0, 24) + S.text(0, 0, n.v) +
            S.rect(12, -49, 28, 19, 'cell' + (Math.abs(bf) > 1 ? ' swap' : '')) +
            S.text(26, -39, bfs, 'nd-label');
          return { inner: inner, cls: s.hl[n.id] || '' };
        }
      });
      if (s.root) {
        kr.html('__lg', S.text(500, 500, '右上角小框为平衡因子 bf（|bf| > 1 时标红，随即触发旋转修正）', 'vs'));
      }
      kr.end();
    }
  });

  /* ============================================================
     3. 红黑树
     ============================================================ */
  var RB_CODE = [
    '// 红黑树：①根结点必黑 ②红结点的孩子必黑 ③任一结点到后代叶子的黑高相同',
    'insert(x):',
    '  按二叉搜索树的规则插入 x，并把新结点染成红色',
    '  while x != root and x 的父结点是红色:            // 出现双红冲突',
    '    g = x 的祖父; u = x 的叔叔（g 的另一个孩子）',
    '    if u != null and u 是红色:                     // 情况一：叔叔为红',
    '      父结点变黑; 叔叔变黑; 祖父变红; x = 祖父       // 变色后继续上溯',
    '    else:                                          // 情况二：叔叔为黑',
    '      if x 与父结点同为左孩子 或 同为右孩子:         // LL / RR',
    '        父结点变黑; 祖父变红; 以祖父为轴单旋',
    '      else:                                        // LR / RL',
    '        先以父结点为轴单旋，转化成 LL / RR 后再按上面处理',
    '  最后把根结点强制染成黑色',
    '',
    'find(x):',
    '  p = root',
    '  while p != null:',
    '    if x == p.val: return p                        // 命中',
    '    else if x < p.val: p = p.left',
    '    else: p = p.right',
    '  return null                                      // 未找到'
  ];
  var RL = {
    e: [2], loop: 2, left: 2, right: 2, dup: 2, attach: 2,
    red: 2, wh: 3, gu: 4, ured: 5, recol: 6, rot: 9, rot0: 11, root: 12,
    f: [15, 16], feq: 17, fleft: 18, fright: 19, fnull: 20
  };

  /** 红黑树插入后的双红修正 */
  function rbFixup(st, steps, z, tag) {
    var cur = z, par, g, u, parG, parSide, curSide, hl, tmp;

    while (true) {
      par = findParent(st.root, cur);
      if (!par) { break; }
      if (par.c !== 'red') {
        hl = one(cur.id, 'active'); hl[par.id] = 'done';
        push(steps, [RL.wh], '父结点 ' + par.v + ' 是黑色，没有出现双红冲突，修正结束', mkSnap(st, hl, tag, '父结点为黑，无需修正'));
        break;
      }
      g = findParent(st.root, par);
      if (!g) { break; }
      u = (g.left && g.left.id === par.id) ? g.right : g.left;
      parG = findParent(st.root, g);
      hl = one(cur.id, 'active'); hl[par.id] = 'swap'; hl[g.id] = 'compare';
      if (u) { hl[u.id] = 'compare'; }
      push(steps, [RL.wh, RL.gu], '当前结点 ' + cur.v + '（红）与父结点 ' + par.v + '（红）构成双红冲突；祖父是 ' + g.v + '，叔叔是 ' +
        (u ? u.v + '（' + (u.c === 'red' ? '红' : '黑') + '）' : '空（按黑色处理）'), mkSnap(st, hl, tag, '双红冲突'));

      if (u && u.c === 'red') {
        par.c = 'black'; u.c = 'black'; g.c = 'red';
        hl = one(cur.id, 'swap'); hl[par.id] = 'done'; hl[u.id] = 'done'; hl[g.id] = 'swap';
        push(steps, [RL.ured, RL.recol], '叔叔 ' + u.v + ' 是红色：把父结点 ' + par.v + ' 与叔叔 ' + u.v + ' 都变黑、祖父 ' + g.v +
          ' 变红（黑高不变），然后把当前结点上移到祖父 ' + g.v + ' 继续检查', mkSnap(st, hl, tag, '叔叔为红 → 变色上溯'));
        cur = g;
        continue;
      }

      parSide = (g.left && g.left.id === par.id) ? 'left' : 'right';
      curSide = (par.left && par.left.id === cur.id) ? 'left' : 'right';
      if (parSide !== curSide) {
        var kind1 = parSide === 'left' ? 'LR' : 'RL';
        push(steps, [RL.rot0], '叔叔为黑，且当前是 ' + kind1 + ' 型（父结点是祖父的' + sideName(parSide) + '孩子，而当前结点是父结点的' +
          sideName(curSide) + '孩子，方向相反）：先以父结点 ' + par.v + ' 为轴' + rotName(curSide) + '，把它转化成 LL / RR 型',
          mkSnap(st, one(cur.id, 'active'), tag, kind1 + ' 型 → 先以 ' + par.v + ' 为轴' + rotName(curSide)));
        rotate(st, par, g, curSide);
        push(steps, [RL.rot0], rotName(curSide) + '完成：' + cur.v + ' 上升一层，现在它和父结点在同一侧，已转化为 ' +
          (parSide === 'left' ? 'LL' : 'RR') + ' 型', mkSnap(st, {}, tag, '转化为单旋型'));
        tmp = par; par = cur; cur = tmp;
        parSide = (g.left && g.left.id === par.id) ? 'left' : 'right';
      }
      var kind2 = parSide === 'left' ? 'LL' : 'RR';
      push(steps, [RL.rot], '叔叔为黑，当前是 ' + kind2 + ' 型：把父结点 ' + par.v + ' 变黑、祖父 ' + g.v + ' 变红，再以祖父 ' + g.v +
        ' 为轴' + rotName(parSide), mkSnap(st, one(cur.id, 'active'), tag, kind2 + ' 型 → 变色 + 以 ' + g.v + ' 为轴' + rotName(parSide)));
      par.c = 'black'; g.c = 'red';
      rotate(st, g, parG, parSide);
      push(steps, [RL.rot], rotName(parSide) + '完成：' + par.v + ' 成为子树根（黑色），双红冲突解除', mkSnap(st, {}, tag, kind2 + ' 修正完成'));
      break;
    }

    if (st.root && st.root.c !== 'black') {
      st.root.c = 'black';
      push(steps, [RL.root], '根结点必须保持黑色，把根 ' + st.root.v + ' 染黑', mkSnap(st, one(st.root.id, 'active'), tag, '根结点置黑'));
    } else if (st.root) {
      push(steps, [RL.root], '根结点 ' + st.root.v + ' 已是黑色，满足红黑树性质', mkSnap(st, one(st.root.id, 'active'), tag, '根结点为黑'));
    }
  }

  function rbInsert(st, steps, x, tag) {
    var r = insCore(st, steps, x, tag, RL, { c: 'red' });
    if (!r.node || r.dup) { return; }
    push(steps, [RL.red], '新插入的结点 ' + x + ' 染成红色：红色不改变任何路径上的黑高，只可能违反「红结点的孩子必黑」',
      mkSnap(st, one(r.node.id, 'active'), tag, '新结点为红'));
    rbFixup(st, steps, r.node, tag);
  }

  DSV.register({
    id: 'redblack', name: '红黑树', category: '索引结构',
    desc: '红黑树用「结点颜色 + 黑高」维持近似平衡：根必黑、红结点的孩子必黑、任一结点到后代叶子的黑高相同。插入的新结点先染红，出现双红冲突时，叔叔为红就变色并把冲突上移，叔叔为黑就用 LL/RR/LR/RL 旋转加变色解决，最后根强制置黑。查找/插入/删除均为 O(log n)，旋转次数比 AVL 树更少。',
    code: RB_CODE,
    inputs: [{ key: 'init', label: '初始序列', def: '10,20,30', hint: '逗号分隔的整数' }],
    actions: [
      { key: 'build', label: '建树', primary: true },
      { key: 'insert', label: '插入', arg: { label: '值', def: '15' } },
      { key: 'find', label: '查找', arg: { label: '值', def: '20' } }
    ],
    samples: [
      { label: '示例：触发 RR 左旋变色（叔叔为黑，10,20,30）', values: { init: '10,20,30' } },
      { label: '示例：叔叔为红 → 变色上溯（10,20,30,15）', values: { init: '10,20,30,15' } },
      { label: '示例：触发 LR（先左旋后右旋，30,10,20）', values: { init: '30,10,20' } },
      { label: '示例：综合建树（多次变色与旋转）', values: { init: '10,20,30,15,25,5,1,40' } }
    ],
    random: function () { return { init: DSV.uniq(DSV.randArr(DSV.ri(7, 9), 1, 99)).join(',') }; },
    run: function (v, action, state) {
      var st = state || newState(), steps = [];
      var key = (action && action.key) || 'build';
      var arg = action && action.arg != null ? String(action.arg).trim() : '';
      var x, i, a;

      if (key === 'build') {
        a = DSV.nums(v.init, 10);
        st = newState();
        push(steps, [0], '开始建立红黑树：依次插入 ' + (a.length ? a.join(' → ') : '（空序列）'), mkSnap(st, {}, '红黑树 · 建树', '初始序列：' + (a.join(', ') || '空')));
        if (!a.length) {
          push(steps, [0], '初始序列为空，得到一棵空树', mkSnap(st, {}, '红黑树', '空树'));
          return { steps: steps, state: st };
        }
        for (i = 0; i < a.length; i++) { rbInsert(st, steps, a[i], '建树：插入 ' + a[i]); }
        push(steps, [0], '建树完成：满足根黑、红结点孩子必黑、各路径黑高相同', mkSnap(st, {}, '红黑树 · 建树完成', '结点数 ' + a.length));
        return { steps: steps, state: st };
      }
      if (key === 'insert') {
        x = parseInt(arg, 10);
        if (!isFinite(x)) {
          push(steps, [1], '插入失败：请在「值」输入框中填写一个整数。', mkSnap(st, {}, '红黑树', '输入非法'));
          return { steps: steps, state: st };
        }
        rbInsert(st, steps, x, '插入 ' + x);
        return { steps: steps, state: st };
      }
      if (key === 'find' || key === 'search') {
        x = parseInt(arg, 10);
        if (!isFinite(x)) {
          push(steps, [14], '查找失败：请在「值」输入框中填写一个整数。', mkSnap(st, {}, '红黑树', '输入非法'));
          return { steps: steps, state: st };
        }
        findCore(st, steps, x, '查找 ' + x, RL);
        return { steps: steps, state: st };
      }
      a = DSV.nums(v.init, 10);
      st = newState();
      push(steps, [0], '开始建立红黑树：依次插入 ' + a.join(' → '), mkSnap(st, {}, '红黑树 · 建树', '初始序列：' + a.join(', ')));
      for (i = 0; i < a.length; i++) { rbInsert(st, steps, a[i], '建树：插入 ' + a[i]); }
      push(steps, [0], '建树完成', mkSnap(st, {}, '红黑树 · 建树完成', '结点数 ' + a.length));
      return { steps: steps, state: st };
    },
    render: function (kr, s) {
      if (!s) {
        kr.html('__empty', S.text(500, 250, '尚未开始：点击「建树」或「插入」开始演示。', 'vs'));
        kr.end();
        return;
      }
      drawTreeSnap(kr, s, {
        node: function (n) {
          var cls = n.c === 'red' ? 'red' : 'black';
          var st2 = s.hl[n.id] || '';
          var inner = ringOf(st2) + S.circle(0, 0, 24) + S.text(0, 0, n.v);
          return { inner: inner, cls: cls + (st2 === 'dead' ? ' dim' : '') };
        }
      });
      kr.html('__lg', S.circle(386, 486, 8, '', ' style="fill:#e6675f;stroke:#8e2b2b"') +
        S.text(402, 486, '红结点', 'vs', ' style="text-anchor:start"') +
        S.circle(556, 486, 8, '', ' style="fill:#2b2b2b;stroke:#000"') +
        S.text(572, 486, '黑结点（外圈表示当前操作状态）', 'vs', ' style="text-anchor:start"'));
      kr.end();
    }
  });

  /** 状态高亮圈：红黑树结点底色被颜色占用，用外圈额外标示当前状态 */
  var RING = { active: '#e6ad10', compare: '#1565a8', swap: '#a8402f', path: '#8d4fa0', done: '#2f6b3f', dead: '#8e8e8e' };
  function ringOf(cls) {
    if (!cls || !RING[cls]) { return ''; }
    return S.circle(0, 0, 31, '', ' style="fill:none;stroke:' + RING[cls] + ';stroke-width:3"');
  }

  /* ============================================================
     4. 伸展树 Splay
     ============================================================ */
  var SP_CODE = [
    '// 伸展树：每次访问（插入 / 查找 / 删除）后，把被访问的结点旋转到根',
    'splay(x):                                       // 把结点 x 旋转到根',
    '  while x 不是根:',
    '    p = x 的父结点; g = p 的父结点（可能不存在）',
    '    if g == null:                    zig    —— 以 p 为轴做一次单旋',
    '    else if x 与 p 同为左孩子 或 同为右孩子:',
    '      zig-zig —— 先以 g 为轴单旋，再以 p 为轴同方向单旋',
    '    else:',
    '      zig-zag —— 先以 p 为轴单旋，再以 g 为轴反方向单旋',
    '',
    'insert(x):  先按二叉搜索树规则插入 x，然后 splay(x)',
    'find(x):    先按二叉搜索树规则查找 x，然后 splay(最后访问的结点)',
    'delete(x):  先 splay(x) 把 x 旋到根，摘掉根结点；',
    '            再把左子树的最大值 splay 到左子树的根，并把原右子树接到它的右边'
  ];
  var SL = {
    e: [10], loop: 10, left: 10, right: 10, dup: 10, attach: 10,
    sp: [1, 2], zig: 4, zz: 6, zg: 8,
    ins: 10, find: 11, del: 12, del2: 13, del3: 13
  };

  /** 把 path 末尾的结点一路伸展到根（zig / zig-zig / zig-zag） */
  function splayUp(st, steps, path, tag, L) {
    var guard = 0, i, hl;
    while (path.length > 1 && guard++ < 60) {
      var t = path[path.length - 1];
      var p = path[path.length - 2];
      var g = path.length >= 3 ? path[path.length - 3] : null;
      var parG = path.length >= 4 ? path[path.length - 4] : null;
      hl = {};
      for (i = 0; i < path.length - 1; i++) { hl[path[i].id] = 'path'; }
      hl[t.id] = 'active';

      if (!g) {
        var s1 = (p.left && p.left.id === t.id) ? 'left' : 'right';
        push(steps, [L.sp[0], L.zig], 'zig 情况：' + t.v + ' 的父结点 ' + p.v + ' 就是根，只需以 ' + p.v + ' 为轴做一次' + rotName(s1) + '，把 ' + t.v + ' 旋上去',
          mkSnap(st, hl, tag, 'zig：以 ' + p.v + ' 为轴' + rotName(s1)));
        rotate(st, p, null, s1);
        path.splice(path.length - 2, 1);
        push(steps, [L.zig], rotName(s1) + '完成：' + t.v + ' 上升一层', mkSnap(st, one(t.id, 'active'), tag, 'zig 完成'));
      } else {
        var sp2 = (g.left && g.left.id === p.id) ? 'left' : 'right';
        var st2 = (p.left && p.left.id === t.id) ? 'left' : 'right';
        if (sp2 === st2) {
          push(steps, [L.sp[0], L.zz], 'zig-zig 情况：' + t.v + ' 与父结点 ' + p.v + ' 同为' + sideName(sp2) + '孩子（同向），先以祖父 ' + g.v +
            ' 为轴' + rotName(sp2) + '，再以父结点 ' + p.v + ' 为轴' + rotName(sp2) + '（两次同向旋转）',
            mkSnap(st, hl, tag, 'zig-zig：同向双旋'));
          rotate(st, g, parG, sp2);
          rotate(st, p, parG, sp2);
          path.splice(path.length - 3, 2);
          push(steps, [L.zz], '两次' + rotName(sp2) + '完成：' + t.v + ' 上升两层', mkSnap(st, one(t.id, 'active'), tag, 'zig-zig 完成'));
        } else {
          push(steps, [L.sp[0], L.zg], 'zig-zag 情况：' + t.v + ' 是父结点的' + sideName(st2) + '孩子，而父结点 ' + p.v + ' 是祖父 ' + g.v +
            ' 的' + sideName(sp2) + '孩子（方向相反），先以父结点 ' + p.v + ' 为轴' + rotName(st2) + '，再以祖父 ' + g.v + ' 为轴' + rotName(sp2),
            mkSnap(st, hl, tag, 'zig-zag：反向双旋'));
          rotate(st, p, g, st2);
          rotate(st, g, parG, sp2);
          path.splice(path.length - 3, 2);
          push(steps, [L.zg], '两次反向旋转完成：' + t.v + ' 上升两层', mkSnap(st, one(t.id, 'active'), tag, 'zig-zag 完成'));
        }
      }
    }
    push(steps, [L.sp[0]], '伸展结束：' + (st.root ? st.root.v : '空') + ' 已成为根结点（刚访问过的结点被推到根，下次再访问它会很快）',
      mkSnap(st, st.root ? one(st.root.id, 'active') : {}, tag, '伸展完成'));
  }

  function splayInsert(st, steps, x, tag) {
    var r = insCore(st, steps, x, tag, SL);
    if (!r.node || r.dup) { return; }
    push(steps, [SL.ins], '插入完成，现在把新结点 ' + x + ' 伸展到根', mkSnap(st, one(r.node.id, 'active'), tag, '准备伸展 ' + x));
    splayUp(st, steps, r.path, tag, SL);
  }

  function splayFind(st, steps, x, tag) {
    if (!st.root) {
      push(steps, [SL.find], '树为空，查找 ' + x + ' 失败', mkSnap(st, {}, tag, '空树'));
      return;
    }
    var p = st.root, path = [p], i, hl;
    while (p) {
      hl = {};
      for (i = 0; i < path.length - 1; i++) { hl[path[i].id] = 'path'; }
      if (p.v === x) {
        push(steps, [SL.find], '比较 ' + x + ' == ' + p.v + '：命中！找到目标结点', mkSnap(st, one(p.id, 'active'), tag, '命中 ' + x));
        splayUp(st, steps, path, tag, SL);
        return;
      }
      hl[p.id] = 'compare';
      var less = x < p.v;
      push(steps, [SL.find], '比较 ' + x + (less ? ' < ' : ' > ') + p.v + '，往' + (less ? '左' : '右') + '子树走', mkSnap(st, hl, tag, '当前结点 ' + p.v));
      p = less ? p.left : p.right;
      if (p) { path.push(p); }
    }
    push(steps, [SL.find], '走到空指针：树中不存在 ' + x + '；按伸展树规则，仍把最后访问的结点 ' + path[path.length - 1].v + ' 伸展到根',
      mkSnap(st, pathHL(path, path[path.length - 1].id, 'active'), tag, '未找到 ' + x));
    splayUp(st, steps, path, tag, SL);
  }

  function splayDelete(st, steps, x, tag) {
    if (!st.root) {
      push(steps, [SL.del], '树为空，无法删除 ' + x, mkSnap(st, {}, tag, '空树'));
      return;
    }
    var p = st.root, path = [p], i, hl;
    while (p && p.v !== x) {
      hl = {};
      for (i = 0; i < path.length - 1; i++) { hl[path[i].id] = 'path'; }
      hl[p.id] = 'compare';
      var less = x < p.v;
      push(steps, [SL.del], '比较 ' + x + (less ? ' < ' : ' > ') + p.v + '，往' + (less ? '左' : '右') + '子树查找待删结点', mkSnap(st, hl, tag, '查找 ' + x));
      p = less ? p.left : p.right;
      if (p) { path.push(p); }
    }
    if (!p) {
      push(steps, [SL.del], '未找到 ' + x + '；按伸展树规则，仍把最后访问的结点 ' + path[path.length - 1].v + ' 伸展到根',
        mkSnap(st, pathHL(path, path[path.length - 1].id, 'active'), tag, '未找到 ' + x));
      splayUp(st, steps, path, tag, SL);
      push(steps, [SL.del], '删除结束：树中不存在 ' + x, mkSnap(st, {}, tag, '删除失败'));
      return;
    }
    push(steps, [SL.del], '找到 ' + x + '，先把它伸展到根', mkSnap(st, one(p.id, 'active'), tag, '命中 ' + x));
    splayUp(st, steps, path, tag, SL);

    var leftSub = st.root.left, rightSub = st.root.right;
    push(steps, [SL.del2], '根结点 ' + x + ' 就是待删结点，直接摘掉：剩下左子树（全部小于 ' + x + '）和右子树（全部大于 ' + x + '）',
      mkSnap(st, {}, tag, '摘掉根结点'));
    if (!leftSub) {
      st.root = rightSub;
      push(steps, [SL.del2], '左子树为空，直接用右子树作为新的根', mkSnap(st, {}, tag, '删除 ' + x + ' 完成'));
      return;
    }
    st.root = leftSub;
    push(steps, [SL.del3], '左子树不为空：暂时以左子树为整棵树，找出其中的最大值（一直往右走），把它伸展到根',
      mkSnap(st, {}, tag, '在左子树中找最大值'));
    var m = leftSub, mpath = [m];
    while (m.right) {
      push(steps, [SL.del3], '当前结点 ' + m.v + ' 还有右孩子，继续往右走', mkSnap(st, pathHL(mpath, m.id, 'compare'), tag, '寻找最大值'));
      m = m.right; mpath.push(m);
    }
    push(steps, [SL.del3], '左子树的最大值是 ' + m.v + '，把它伸展到根', mkSnap(st, one(m.id, 'active'), tag, '最大值 = ' + m.v));
    splayUp(st, steps, mpath, tag, SL);
    st.root.right = rightSub;
    push(steps, [SL.del3], '把原来的右子树接到新根 ' + st.root.v + ' 的右边（它原来没有右孩子，且右子树所有值都大于它）',
      mkSnap(st, one(st.root.id, 'active'), tag, '删除 ' + x + ' 完成'));
  }

  DSV.register({
    id: 'splay', name: '伸展树', category: '索引结构',
    desc: '伸展树不维护任何平衡信息，而是利用局部性：每次访问（插入/查找/删除）后都把被访问的结点用 zig（单旋）、zig-zig（同向双旋）、zig-zag（反向双旋）旋转到根。单次的摊还代价为 O(log n)，频繁访问的结点会靠近根部。',
    code: SP_CODE,
    inputs: [{ key: 'init', label: '初始序列', def: '10,20,30', hint: '逗号分隔的整数' }],
    actions: [
      { key: 'build', label: '建树', primary: true },
      { key: 'insert', label: '插入', arg: { label: '值', def: '40' } },
      { key: 'find', label: '查找', arg: { label: '值', def: '20' } },
      { key: 'delete', label: '删除', arg: { label: '值', def: '30' } }
    ],
    samples: [
      { label: '示例：触发 zig-zig（同向双旋，50,20,80,10）', values: { init: '50,20,80,10' } },
      { label: '示例：触发 zig-zag（反向双旋，10,30,20）', values: { init: '10,30,20' } },
      { label: '示例：触发 zig（单旋，50,30,20）', values: { init: '50,30,20' } },
      { label: '示例：综合序列（多种伸展）', values: { init: '50,30,70,20,40,60,10' } }
    ],
    random: function () { return { init: DSV.uniq(DSV.randArr(DSV.ri(7, 9), 1, 99)).join(',') }; },
    run: function (v, action, state) {
      var st = state || newState(), steps = [];
      var key = (action && action.key) || 'build';
      var arg = action && action.arg != null ? String(action.arg).trim() : '';
      var x, i, a;

      if (key === 'build') {
        a = DSV.nums(v.init, 10);
        st = newState();
        push(steps, [0], '开始建立伸展树：依次插入 ' + (a.length ? a.join(' → ') : '（空序列）'), mkSnap(st, {}, '伸展树 · 建树', '初始序列：' + (a.join(', ') || '空')));
        if (!a.length) {
          push(steps, [0], '初始序列为空，得到一棵空树', mkSnap(st, {}, '伸展树', '空树'));
          return { steps: steps, state: st };
        }
        for (i = 0; i < a.length; i++) { splayInsert(st, steps, a[i], '建树：插入 ' + a[i]); }
        push(steps, [0], '建树完成：最后插入的 ' + a[a.length - 1] + ' 已经在根上', mkSnap(st, {}, '伸展树 · 建树完成', '结点数 ' + a.length));
        return { steps: steps, state: st };
      }
      if (key === 'insert') {
        x = parseInt(arg, 10);
        if (!isFinite(x)) {
          push(steps, [10], '插入失败：请在「值」输入框中填写一个整数。', mkSnap(st, {}, '伸展树', '输入非法'));
          return { steps: steps, state: st };
        }
        splayInsert(st, steps, x, '插入 ' + x);
        return { steps: steps, state: st };
      }
      if (key === 'find' || key === 'search') {
        x = parseInt(arg, 10);
        if (!isFinite(x)) {
          push(steps, [11], '查找失败：请在「值」输入框中填写一个整数。', mkSnap(st, {}, '伸展树', '输入非法'));
          return { steps: steps, state: st };
        }
        splayFind(st, steps, x, '查找 ' + x);
        return { steps: steps, state: st };
      }
      if (key === 'delete') {
        x = parseInt(arg, 10);
        if (!isFinite(x)) {
          push(steps, [12], '删除失败：请在「值」输入框中填写一个整数。', mkSnap(st, {}, '伸展树', '输入非法'));
          return { steps: steps, state: st };
        }
        splayDelete(st, steps, x, '删除 ' + x);
        return { steps: steps, state: st };
      }
      a = DSV.nums(v.init, 10);
      st = newState();
      push(steps, [0], '开始建立伸展树：依次插入 ' + a.join(' → '), mkSnap(st, {}, '伸展树 · 建树', '初始序列：' + a.join(', ')));
      for (i = 0; i < a.length; i++) { splayInsert(st, steps, a[i], '建树：插入 ' + a[i]); }
      push(steps, [0], '建树完成', mkSnap(st, {}, '伸展树 · 建树完成', '结点数 ' + a.length));
      return { steps: steps, state: st };
    },
    render: function (kr, s) {
      if (!s) {
        kr.html('__empty', S.text(500, 250, '尚未开始：点击「建树」或「插入」开始演示。', 'vs'));
        kr.end();
        return;
      }
      drawTreeSnap(kr, s, {
        node: function (n) {
          return { inner: S.circle(0, 0, 24) + S.text(0, 0, n.v), cls: s.hl[n.id] || '' };
        }
      });
      kr.end();
    }
  });

  /* ============================================================
     5. 跳表 SkipList
     ============================================================ */
  var MAXL = 4;                 // 最多 4 层：第 0 层 … 第 3 层
  var SK_CODE = [
    '// 跳表：第 0 层是完整有序链表，上面各层是按 1/2 概率提升出来的索引层',
    'search(x):',
    '  cur = head                               // 从头结点的最高层出发',
    '  for lvl = 最高层 downto 0:',
    '    while cur 在本层的下一个结点存在 and 其值 < x:',
    '      cur = cur.next[lvl]                  // 在当前层向右前进',
    '    记录本层最后一个 < x 的结点 update[lvl]; 下降一层',
    '  t = cur.next[0]',
    '  return t != null and t.val == x          // 在第 0 层判断是否命中',
    '',
    'insert(x):',
    '  先按 search 的方式走一遍，记录每层最后经过的结点 update[]',
    '  lvl = 投币结果（连续正面则层数 +1，最多 MAXL 层）',
    '  把 x 插到 update 之后，并接入第 0 … lvl-1 层',
    '',
    'delete(x):',
    '  同样先记录 update[]',
    '  若第 0 层下一个结点的值 == x，就在它出现的每一层断开链接'
  ];
  var KL = { loop: 3, cmp: 4, right: 5, down: 6, chk: 8, ins: [11], coin: 12, link: 13, del: [16], unlink: 17 };

  function slState() { return { keys: [], next: 1 }; }

  /** 投币决定层数：用 key 的哈希做伪随机，保证同一个 key 的层数稳定 */
  function lvOf(v) {
    var s = Math.imul((v | 0) ^ 0x9e3779b9, 0x85ebca6b) >>> 0;
    s ^= s >>> 15; s = Math.imul(s, 0x2545f491) >>> 0; s ^= s >>> 13;
    var lv = 1;
    while (lv < MAXL && (s & 1) === 1) { lv++; s = s >>> 1; }
    return lv;
  }
  function slSnap(st, hl, cur, title, sub, hlE) {
    return { keys: DSV.clone(st.keys), hl: hl || {}, hlE: hlE || {}, cur: cur || null, title: title || '', sub: sub || '' };
  }
  function slHL(keys, cur, lv, cmp, cmpCls) {
    var hl = {}, i;
    for (i = 0; i < keys.length; i++) {
      if (i < cur && keys[i].lv > lv) { hl[keys[i].id] = 'path'; }
    }
    if (cur >= 0 && keys[cur]) { hl[keys[cur].id] = 'active'; }
    if (cmp) { hl[cmp.id] = cmpCls || 'compare'; }
    return hl;
  }
  function nodeName(keys, i) { return i < 0 ? '头结点' : (keys[i] ? keys[i].v : '空'); }

  /** 跳表查找：返回 {hit: 命中的下标|-1, upd: 每层最后经过的结点下标} */
  function slSearch(st, steps, x, tag, L, needUpd) {
    var keys = st.keys, cur = -1, lv, j, upd = [];
    for (lv = MAXL - 1; lv >= 0; lv--) {
      /* 本层右侧没有任何结点时直接跳过，不必产生无意义的步骤 */
      var scan = false;
      for (j = cur + 1; j < keys.length; j++) { if (keys[j].lv > lv) { scan = true; break; } }
      if (scan) {
        push(steps, [L.loop], '进入第 ' + lv + ' 层，从 ' + nodeName(keys, cur) + ' 开始向右扫描（本层只含层数 > ' + lv + ' 的结点）',
          slSnap(st, slHL(keys, cur, lv, null), { i: cur, lv: lv }, tag, '第 ' + lv + ' 层'));
      }
      j = cur + 1;
      while (j < keys.length) {
        if (keys[j].lv <= lv) { j++; continue; }        // 该结点不在本层，指针直接跨过
        var less = keys[j].v < x;
        push(steps, [L.cmp, L.right], '第 ' + lv + ' 层：比较下一个结点 ' + keys[j].v + ' 与目标 ' + x + '：' +
          (less ? keys[j].v + ' < ' + x + '，继续向右前进' : keys[j].v + ' ≥ ' + x + '，本层不能再向右（停止）'),
          slSnap(st, slHL(keys, cur, lv, keys[j]), { i: cur, lv: lv }, tag, '第 ' + lv + ' 层', less ? one('e' + lv + '_' + cur, 'hl') : {}));
        if (less) { cur = j; j++; } else { break; }
      }
      upd[lv] = cur;
      if (scan) {
        push(steps, [L.down], '第 ' + lv + ' 层扫描结束，最后一个小于 ' + x + ' 的结点是 ' + nodeName(keys, cur) +
          (lv > 0 ? '，下降到第 ' + (lv - 1) + ' 层' : '，已到最底层'),
          slSnap(st, slHL(keys, cur, lv, null), { i: cur, lv: lv }, tag, lv > 0 ? '下降到第 ' + (lv - 1) + ' 层' : '到达第 0 层'));
      }
    }
    var hit = -1;
    j = cur + 1;
    while (j < keys.length && keys[j].v < x) { j++; }
    if (j < keys.length && keys[j].v === x) { hit = j; }
    var hlf = slHL(keys, cur, 0, hit >= 0 ? keys[hit] : null, hit >= 0 ? 'active' : 'dead');
    push(steps, [L.chk], '在第 0 层检查下一个结点：' +
      (hit >= 0 ? '它的值等于 ' + x + '，查找命中！' : (j < keys.length ? '它的值是 ' + keys[j].v + ' ≠ ' + x + '，查找失败' : '已经到表尾，查找失败')),
      slSnap(st, hlf, { i: cur, lv: 0 }, tag, hit >= 0 ? '命中 ' + x : '未找到 ' + x));
    return { hit: hit, upd: needUpd ? upd : [] };
  }

  function slInsert(st, steps, x, tag, L) {
    var r = slSearch(st, steps, x, tag, L, true);
    if (r.hit >= 0) {
      push(steps, [L.ins[0]], '值 ' + x + ' 已经存在于跳表中，不重复插入', slSnap(st, one(st.keys[r.hit].id, 'active'), { i: r.hit, lv: 0 }, tag, '值 ' + x + ' 已存在'));
      return;
    }
    var lv = lvOf(x);
    push(steps, [L.coin], '投币决定层数：' + x + ' 一共 ' + lv + ' 层（出现在第 0 … ' + (lv - 1) + ' 层，每次提升的概率是 1/2）',
      slSnap(st, {}, { i: -1, lv: MAXL - 1 }, tag, '层数 = ' + lv));
    var node = { id: 'k' + st.next, v: x, lv: lv };
    st.next++;
    var pos = (r.upd[0] == null ? -1 : r.upd[0]) + 1;
    st.keys.splice(pos, 0, node);
    var hl = one(node.id, 'active');
    push(steps, [L.link], '把 ' + x + ' 插入到第 0 层的 ' + nodeName(st.keys, pos - 1) + ' 之后，并把它接入第 0 … ' + (lv - 1) + ' 层的链表',
      slSnap(st, hl, { i: pos, lv: 0 }, tag, '插入 ' + x + ' 完成'));
  }

  function slDelete(st, steps, x, tag, L) {
    var r = slSearch(st, steps, x, tag, L, true);
    if (r.hit < 0) {
      push(steps, [L.del[0]], '跳表中不存在 ' + x + '，删除结束', slSnap(st, {}, { i: -1, lv: 0 }, tag, '未找到 ' + x));
      return;
    }
    var hl = one(st.keys[r.hit].id, 'dead');
    push(steps, [L.unlink], '找到 ' + x + '：把它所在的每一层（第 0 … ' + (st.keys[r.hit].lv - 1) + ' 层）的链接断开，前驱直接指向它的后继',
      slSnap(st, hl, { i: r.hit, lv: 0 }, tag, '断开 ' + x + ' 的链接'));
    st.keys.splice(r.hit, 1);
    push(steps, [L.unlink], '删除完成：' + x + ' 已从跳表中移除', slSnap(st, {}, { i: -1, lv: 0 }, tag, '删除 ' + x + ' 完成'));
  }

  DSV.register({
    id: 'skiplist', name: '跳表', category: '索引结构',
    desc: '跳表在有序链表之上叠加多层稀疏索引：第 0 层保存所有元素，每个结点以 1/2 的概率逐层提升。查找时从最高层出发，在当前层向右比较、太大就下降一层，用「以空间换时间」把 O(n) 的链表查找变成平均 O(log n)，插入/删除同样平均 O(log n)，实现比平衡树简单。',
    code: SK_CODE,
    inputs: [{ key: 'init', label: '初始序列', def: '3,6,9,12,18,21,25', hint: '逗号分隔的整数' }],
    actions: [
      { key: 'build', label: '建表', primary: true },
      { key: 'insert', label: '插入', arg: { label: '值', def: '15' } },
      { key: 'find', label: '查找', arg: { label: '值', def: '12' } },
      { key: 'delete', label: '删除', arg: { label: '值', def: '12' } }
    ],
    samples: [
      { label: '示例：基础数据（6 个元素）', values: { init: '3,6,9,12,18,21' } },
      { label: '示例：较多元素（看索引层分布）', values: { init: '5,10,15,20,25,30,35,40' } },
      { label: '示例：查找不存在的元素', values: { init: '3,6,9,12,18,21' } }
    ],
    random: function () { return { init: DSV.uniq(DSV.randArr(DSV.ri(6, 9), 1, 99)).sort(function (a, b) { return a - b; }).join(',') }; },
    run: function (v, action, state) {
      var st = state || slState(), steps = [];
      var key = (action && action.key) || 'build';
      var arg = action && action.arg != null ? String(action.arg).trim() : '';
      var x, i, a;

      if (key === 'build') {
        a = DSV.nums(v.init, 10).sort(function (p, q) { return p - q; });
        a = DSV.uniq(a);
        st = slState();
        push(steps, [0], '开始建表：依次插入 ' + (a.length ? a.join(' → ') : '（空序列）'), slSnap(st, {}, { i: -1, lv: MAXL - 1 }, '跳表 · 建表', '初始序列：' + (a.join(', ') || '空')));
        if (!a.length) {
          push(steps, [0], '初始序列为空，跳表为空', slSnap(st, {}, null, '跳表', '空表'));
          return { steps: steps, state: st };
        }
        for (i = 0; i < a.length; i++) { slInsert(st, steps, a[i], '建表：插入 ' + a[i], KL); }
        push(steps, [0], '建表完成：第 0 层有全部 ' + a.length + ' 个元素，上面各层是稀疏索引',
          slSnap(st, {}, { i: -1, lv: MAXL - 1 }, '跳表 · 建表完成', '元素数 ' + a.length));
        return { steps: steps, state: st };
      }
      if (key === 'insert') {
        x = parseInt(arg, 10);
        if (!isFinite(x)) {
          push(steps, [10], '插入失败：请在「值」输入框中填写一个整数。', slSnap(st, {}, null, '跳表', '输入非法'));
          return { steps: steps, state: st };
        }
        slInsert(st, steps, x, '插入 ' + x, KL);
        return { steps: steps, state: st };
      }
      if (key === 'find' || key === 'search') {
        x = parseInt(arg, 10);
        if (!isFinite(x)) {
          push(steps, [1], '查找失败：请在「值」输入框中填写一个整数。', slSnap(st, {}, null, '跳表', '输入非法'));
          return { steps: steps, state: st };
        }
        slSearch(st, steps, x, '查找 ' + x, KL, false);
        return { steps: steps, state: st };
      }
      if (key === 'delete') {
        x = parseInt(arg, 10);
        if (!isFinite(x)) {
          push(steps, [15], '删除失败：请在「值」输入框中填写一个整数。', slSnap(st, {}, null, '跳表', '输入非法'));
          return { steps: steps, state: st };
        }
        slDelete(st, steps, x, '删除 ' + x, KL);
        return { steps: steps, state: st };
      }
      a = DSV.nums(v.init, 10).sort(function (p, q) { return p - q; });
      a = DSV.uniq(a);
      st = slState();
      push(steps, [0], '开始建表：依次插入 ' + a.join(' → '), slSnap(st, {}, { i: -1, lv: MAXL - 1 }, '跳表 · 建表', '初始序列：' + a.join(', ')));
      for (i = 0; i < a.length; i++) { slInsert(st, steps, a[i], '建表：插入 ' + a[i], KL); }
      push(steps, [0], '建表完成', slSnap(st, {}, { i: -1, lv: MAXL - 1 }, '跳表 · 建表完成', '元素数 ' + a.length));
      return { steps: steps, state: st };
    },
    render: function (kr, s) {
      if (!s) {
        kr.html('__empty', S.text(500, 250, '尚未开始：点击「建表」或「插入」开始演示。', 'vs'));
        kr.end();
        return;
      }
      var keys = s.keys || [], n = keys.length, i, lv;
      kr.html('__t', S.text(500, 24, s.title || '跳表', 'vt'));
      if (s.sub) { kr.html('__sub', S.text(500, 45, s.sub, 'vs')); }
      if (!n) {
        kr.html('__empty', S.text(500, 250, '（跳表为空：请点击「建表」或用「插入」添加元素）', 'vs'));
        kr.end();
        return;
      }
      var cols = n + 1;
      var cw = Math.min(64, Math.floor((1000 - 150) / cols));
      var x0 = 112, bw = cw - 16, bh = 30;
      function cx(ci) { return x0 + ci * cw + cw / 2; }
      function cy(l) { return 424 - l * 74; }

      for (lv = 0; lv < MAXL; lv++) { kr.html('__ln' + lv, S.textL(44, cy(lv), '第 ' + lv + ' 层', 'vs')); }

      /* 头结点塔（每一层都有一个格子）；「头结点」标签移到塔底下方，避免与搜索指针重叠 */
      var hIn = S.textL(-bw / 2, cy(0) + 26, '头结点', 'tag');
      for (lv = 0; lv < MAXL; lv++) {
        hIn += S.rect(-bw / 2, cy(lv) - bh / 2, bw, bh, 'cell') + S.text(0, cy(lv), '－∞', 'cell-txt');
        if (lv < MAXL - 1) { hIn += S.line(0, cy(lv) - bh / 2, 0, cy(lv + 1) + bh / 2, 'edge tree'); }
      }
      kr.g('__H', 'translate(' + cx(0) + ',0)', 'k', hIn);

      /* 每个元素的塔：第 0 … lv-1 层各一个格子，竖线相连 */
      for (i = 0; i < n; i++) {
        var k = keys[i], inner = '', cls = s.hl[k.id] || '';
        for (lv = 0; lv < k.lv; lv++) {
          inner += S.rect(-bw / 2, cy(lv) - bh / 2, bw, bh, 'cell ' + cls) + S.text(0, cy(lv), k.v, 'cell-txt');
          if (lv < k.lv - 1) { inner += S.line(0, cy(lv) - bh / 2, 0, cy(lv + 1) + bh / 2, 'edge tree'); }
        }
        kr.g('k_' + k.id, 'translate(' + cx(i + 1) + ',0)', 'k', inner);
      }

      /* 同层的水平指针：只连接该层实际存在的结点 */
      for (lv = 0; lv < MAXL; lv++) {
        var prevCol = 0, prevKey = -1, edges = '';
        for (i = 0; i < n; i++) {
          if (keys[i].lv <= lv) { continue; }
          var ecls = (s.hlE && s.hlE['e' + lv + '_' + prevKey]) || 'tree';
          edges += S.line(cx(prevCol) + bw / 2, cy(lv), cx(i + 1) - bw / 2, cy(lv), 'edge ' + ecls);
          prevCol = i + 1; prevKey = i;
        }
        kr.html('__se' + lv, edges);
      }

      /* 当前位置指针 */
      if (s.cur) {
        var ci = s.cur.i == null ? -1 : s.cur.i;
        var lvv = s.cur.lv == null ? 0 : s.cur.lv;
        kr.g('__cur', 'translate(' + cx(ci + 1) + ',' + (cy(lvv) - 26) + ')', 'k',
          S.text(0, 0, '▼', 'ptr') + S.text(0, -20, '当前', 'ptr'));
      }
      kr.html('__lg', S.text(500, 478, '查找 / 插入时从第 ' + (MAXL - 1) + ' 层开始：在本层向右比较，下一个结点 ≥ 目标就下降一层', 'vs'));
      kr.end();
    }
  });

  /* ============================================================
     7. 折半查找（二分查找）
     ============================================================ */
  DSV.register({
    id: 'idx-binary', name: '折半查找（二分查找）', category: '索引结构',
    desc: '在有序数组上每次取中间元素与目标比较：相等即命中；目标更小舍去右半段，更大舍去左半段，把范围每次缩小一半。时间 O(log n)，空间 O(1)，是有序顺序表的标准查找算法。',
    code: [
      'binarySearch(a, x):',
      '  lo = 0; hi = a.length - 1',
      '  while lo <= hi:',
      '    mid = floor((lo + hi) / 2)',
      '    if a[mid] == x: return mid         // 命中',
      '    else if a[mid] < x: lo = mid + 1   // 目标在右半段',
      '    else: hi = mid - 1                  // 目标在左半段',
      '  return -1                             // 区间空，未找到'
    ],
    viewBox: '0 0 1000 460',
    inputs: [
      { key: 'arr', label: '有序数组', def: '3,12,24,35,47,58,69,88,99', hint: '必须升序，逗号分隔' },
      { key: 'target', label: '目标值', def: '47', hint: '整数' }
    ],
    actions: [{ key: 'search', label: '开始查找', primary: true }],
    samples: [
      { label: '示例：命中中间偏右', values: { arr: '3,12,24,35,47,58,69,88,99', target: '47' } },
      { label: '示例：查找失败', values: { arr: '3,12,24,35,47,58,69,88,99', target: '50' } }
    ],
    random: function () {
      var n = DSV.ri(7, 10), a = [], cur = DSV.ri(1, 9);
      for (var i = 0; i < n; i++) { cur += DSV.ri(3, 12); a.push(cur); }
      var t = Math.random() < 0.6 ? a[DSV.ri(0, a.length - 1)] : cur + DSV.ri(5, 20);
      return { arr: a.join(','), target: String(t) };
    },
    run: function (v) {
      var a = DSV.nums(v.arr, 12), x = parseInt(v.target, 10), steps = [];
      if (!a.length || !isFinite(x)) {
        return [{ code: [1], desc: '输入无效：请先填写一个升序数组（如 3,12,24,35）与整数目标值。',
          snap: { empty: true, msg: '请输入非空升序数组与目标值' } }];
      }
      var n = a.length, lo = 0, hi = n - 1, mid = -1, found = -1;
      function mkCls() {
        var c = [];
        for (var i = 0; i < n; i++) {
          if (found >= 0 && i === found) { c.push('done'); }
          else if (i < lo || i > hi) { c.push('dead'); }
          else if (i === mid) { c.push('compare'); }
          else { c.push(''); }
        }
        return c;
      }
      function snap(o) {
        o = o || {};
        return { arr: a.slice(), n: n, lo: lo, hi: hi, mid: mid, found: found, cls: mkCls(), msg: o.msg || '' };
      }
      push(steps, [1, 2], '初始：lo = 0（左端），hi = ' + (n - 1) + '（右端），在整个数组 [' + a.join(', ') + '] 中查找目标 ' + x + '。',
        snap({ msg: '查找范围：全部 ' + n + ' 个元素' }));
      var guard = 0;
      while (lo <= hi && guard++ < 40) {
        mid = Math.floor((lo + hi) / 2);
        push(steps, [3, 4], '取中点 mid = (' + lo + '+' + hi + ')/2 = ' + mid + '，比较 a[' + mid + '] = ' + a[mid] + ' 与目标 ' + x + '。',
          snap({ msg: '比较 a[' + mid + ']=' + a[mid] + ' 与 ' + x }));
        if (a[mid] === x) {
          found = mid;
          push(steps, [5], 'a[' + mid + '] = ' + a[mid] + ' == 目标 ' + x + '：命中！共经过 ' + guard + ' 次比较，长度 ' + n + ' 的表只需 O(log₂' + n + ') 次左右。',
            snap({ msg: '查找成功：a[' + found + '] = ' + x }));
          break;
        } else if (a[mid] < x) {
          push(steps, [6], 'a[' + mid + '] = ' + a[mid] + ' < ' + x + '：目标在右半段，舍去左半段，令 lo = mid + 1 = ' + (mid + 1) + '。',
            snap({ msg: 'lo ← ' + (mid + 1) }));
          lo = mid + 1;
        } else {
          push(steps, [7], 'a[' + mid + '] = ' + a[mid] + ' > ' + x + '：目标在左半段，舍去右半段，令 hi = mid - 1 = ' + (mid - 1) + '。',
            snap({ msg: 'hi ← ' + (mid - 1) }));
          hi = mid - 1;
        }
      }
      if (found < 0) {
        mid = -1;
        push(steps, [8], 'lo = ' + lo + ' > hi = ' + hi + '：查找区间为空，数组中不存在 ' + x + '，查找失败。',
          snap({ msg: '数组中不存在 ' + x }));
      }
      return steps;
    },
    render: function (kr, s) {
      if (!s || s.empty) {
        kr.html('__e', S.text(500, 280, (s && s.msg) || '折半查找：输入升序数组与目标值后点击「开始查找」', 'vs'));
        kr.end(); return;
      }
      kr.html('__t', S.text(500, 30, '折半查找（二分查找）', 'vt'));
      kr.html('__s', S.text(500, 56, s.msg || '', 'vs'));
      var n = s.n, cw = Math.min(64, Math.floor((1000 - 160) / n)), gap = 10;
      var total = n * cw + (n - 1) * gap, x0 = (1000 - total) / 2, y = 230;
      function cx(i) { return x0 + i * (cw + gap) + cw / 2; }
      for (var i = 0; i < n; i++) {
        kr.g('c' + i, 'translate(' + cx(i) + ',' + y + ')', 'k',
          '<rect class="cell ' + (s.cls[i] || '') + '" x="' + (-cw / 2) + '" y="-26" width="' + cw + '" height="52" rx="4"/>' +
          S.text(0, 0, s.arr[i], 'cell-txt') + S.text(0, 44, i, 'idx-txt'));
      }
      var marks = [[s.lo, 'lo', false], [s.mid, 'mid', true], [s.hi, 'hi', false]];
      for (var m = 0; m < marks.length; m++) {
        var mi = marks[m][0];
        if (mi < 0 || mi >= n) { continue; }
        kr.g('p_' + marks[m][1], 'translate(' + cx(mi) + ',' + (y - 56 - m * 24) + ')', 'k',
          S.text(0, 0, '▼ ' + marks[m][1], 'ptr' + (marks[m][2] ? ' ptr-t' : '')));
      }
      kr.end();
    }
  });

  /* ============================================================
     8. 二叉树遍历（前 / 中 / 后 / 层序，非递归栈与队列模拟）
     ============================================================ */
  /** 按 BST 规则把 x 静默插入树中（不产生步骤），返回新结点 */
  function toInsert(st, x) {
    if (!st.root) { st.root = mkNode(x, st); return st.root; }
    var p = st.root;
    while (true) {
      if (x < p.v) { if (!p.left) { p.left = mkNode(x, st); return p.left; } p = p.left; }
      else if (x > p.v) { if (!p.right) { p.right = mkNode(x, st); return p.right; } p = p.right; }
      else { return p; }
    }
  }
  /** 遍历快照：root 克隆 + 结点高亮 + 栈/队列/输出内容 */
  function toSnap(st, o) {
    o = o || {};
    return {
      root: DSV.clone(st.root),
      hl: o.hl || {},
      stack: (o.stack || []).slice(),
      queue: (o.queue || []).slice(),
      out: (o.out || []).slice(),
      mode: o.mode || 'pre',
      msg: o.msg || ''
    };
  }
  /** 已访问结点 done，当前结点 active */
  function hlVisited(outIds, curId) {
    var h = {};
    for (var k = 0; k < outIds.length; k++) { h[outIds[k]] = 'done'; }
    if (curId) { h[curId] = 'active'; }
    return h;
  }

  DSV.register({
    id: 'idx-tree-order', name: '二叉树遍历（前/中/后/层序）', category: '索引结构',
    desc: '用显式栈/队列模拟四种遍历：前序根左右、中序左根右、后序左右根用栈，层序用队列，避免递归。每种遍历都访问 n 个结点，时间 O(n)，栈/队列最坏 O(n)；BST 的中序即升序序列。',
    code: [
      '// 前序（非递归）：栈里先压右孩子再压左孩子',
      'preOrder(root):',
      '  if root == null: return',
      '  stack = [root]',
      '  while stack 非空:',
      '    n = 栈.pop();  访问 n',
      '    if n.right: 栈.push(n.right)',
      '    if n.left:  栈.push(n.left)',
      '',
      '// 中序：一路向左入栈，弹出访问后转向右子树',
      'inOrder(root):',
      '  cur = root; stack = []',
      '  while cur 或 stack 非空:',
      '    while cur: 栈.push(cur); cur = cur.left',
      '    cur = 栈.pop(); 访问 cur; cur = cur.right',
      '',
      '// 层序：队列先进先出，一层一层扩展',
      'levelOrder(root):',
      '  队列 = [root]',
      '  while 队列 非空:',
      '    n = 队列.shift(); 访问 n',
      '    if n.left: 队列.push(n.left)',
      '    if n.right: 队列.push(n.right)'
    ],
    inputs: [{ key: 'init', label: '建树序列', def: '50,30,70,20,40,60,80', hint: '按 BST 规则建树，逗号分隔' }],
    actions: [
      { key: 'pre', label: '前序遍历', primary: true },
      { key: 'in', label: '中序遍历' },
      { key: 'post', label: '后序遍历' },
      { key: 'level', label: '层序遍历' }
    ],
    samples: [
      { label: '示例：满二叉树', values: { init: '50,30,70,20,40,60,80' } },
      { label: '示例：左斜树', values: { init: '5,4,3,2,1' } }
    ],
    random: function () { return { init: DSV.shuffle(DSV.randArr(DSV.ri(6, 8), 10, 99)).join(',') }; },
    run: function (v, action, state) {
      var st = state || { root: null, next: 1 };
      var steps = [];
      var key = (action && action.key) || 'pre';
      var i;
      /* 首次运行（state 为空）时先按输入建树 */
      if (!st.root) {
        var a = DSV.nums(v.init, 12);
        push(steps, [1], '建树：按输入序列依次插入 ' + (a.length ? a.join(' → ') : '（空）') + ' 个结点（BST 规则）。',
          toSnap(st, { mode: key, msg: '初始化空树' }));
        for (i = 0; i < a.length; i++) { toInsert(st, a[i]); }
        if (!st.root) {
          push(steps, [1], '输入序列为空，得到一棵空树，无法遍历。', toSnap(st, { mode: key, msg: '请在输入框中填写结点序列' }));
          return { steps: steps, state: st };
        }
        push(steps, [1], '建树完成，下面用显式栈 / 队列进行非递归遍历。', toSnap(st, { mode: key, msg: '树已就绪' }));
      }

      /* ---------- 前序 ---------- */
      if (key === 'pre') {
        var stack = [st.root], outIds = [], outVals = [];
        push(steps, [3, 4], '前序开始：根 ' + st.root.v + ' 入栈（栈底在左，栈顶在右）。',
          toSnap(st, { stack: [st.root.v], mode: 'pre', msg: '栈初始化' }));
        var g1 = 0;
        while (stack.length && g1++ < 100) {
          var n = stack.pop();
          outIds.push(n.id); outVals.push(n.v);
          push(steps, [5, 6], '弹出栈顶结点 ' + n.v + ' → 访问（前序：根最先访问），当前输出序列：' + outVals.join(' ') + '。',
            toSnap(st, { hl: hlVisited(outIds, n.id), stack: stack.map(function (x) { return x.v; }), out: outVals, mode: 'pre', msg: '访问 ' + n.v }));
          var pushed = [];
          if (n.right) { stack.push(n.right); pushed.push(n.right.v); }
          if (n.left) { stack.push(n.left); pushed.push(n.left.v); }
          if (pushed.length) {
            push(steps, [7, 8], n.v + ' 的孩子入栈：先压右孩子 ' + (n.right ? n.right.v : '无') + '，再压左孩子 ' + (n.left ? n.left.v : '无') + '（这样弹出时左先右后，正好符合根→左→右）。',
              toSnap(st, { hl: hlVisited(outIds, n.id), stack: stack.map(function (x) { return x.v; }), out: outVals, mode: 'pre', msg: '孩子入栈' }));
          }
        }
        push(steps, [5], '前序遍历完成，输出序列：' + outVals.join(' ') + '（根 → 左子树 → 右子树）。',
          toSnap(st, { hl: hlVisited(outIds), stack: [], out: outVals, mode: 'pre', msg: '前序：' + outVals.join(' ') }));
      }

      /* ---------- 中序 ---------- */
      if (key === 'in') {
        var cur = st.root, stk = [], inIds = [], inVals = [];
        push(steps, [10, 11], '中序开始：cur 指向根 ' + st.root.v + '，栈为空。',
          toSnap(st, { mode: 'in', stack: [], msg: '初始化' }));
        var g2 = 0;
        while ((cur || stk.length) && g2++ < 100) {
          while (cur) {
            stk.push(cur);
            push(steps, [13], 'cur = ' + cur.v + ' 不为空：压入栈并向左走（先把整棵左子树依次入栈）。',
              toSnap(st, { hl: hlVisited(inIds, cur.id), stack: stk.map(function (x) { return x.v; }), out: inVals, mode: 'in', msg: cur.v + ' 入栈' }));
            cur = cur.left;
          }
          if (!stk.length) { break; }
          cur = stk.pop();
          inIds.push(cur.id); inVals.push(cur.v);
          push(steps, [14], '栈顶弹出 ' + cur.v + ' → 访问（中序：左子树走完后才访问根），输出：' + inVals.join(' ') + '。',
            toSnap(st, { hl: hlVisited(inIds, cur.id), stack: stk.map(function (x) { return x.v; }), out: inVals, mode: 'in', msg: '访问 ' + cur.v }));
          cur = cur.right;
        }
        push(steps, [14], '中序遍历完成，输出序列：' + inVals.join(' ') + '（左子树 → 根 → 右子树；BST 的中序即升序）。',
          toSnap(st, { hl: hlVisited(inIds), stack: [], out: inVals, mode: 'in', msg: '中序：' + inVals.join(' ') }));
      }

      /* ---------- 后序（带已处理标记的栈） ---------- */
      if (key === 'post') {
        var sp = [{ n: st.root, done: false }], postIds = [], postVals = [];
        push(steps, [1], '后序开始：把（根 ' + st.root.v + '，未处理标记 false）压入栈。',
          toSnap(st, { mode: 'post', stack: [{ v: st.root.v, done: false }], msg: '栈初始化' }));
        var g3 = 0;
        while (sp.length && g3++ < 150) {
          var it = sp.pop();
          if (it.done) {
            postIds.push(it.n.id); postVals.push(it.n.v);
            push(steps, [6], '弹出标记为「已处理」的 ' + it.n.v + ' → 真正访问（后序：左右子树都走完才访问根），输出：' + postVals.join(' ') + '。',
              toSnap(st, { hl: hlVisited(postIds, it.n.id), stack: sp.map(function (x) { return { v: x.n.v, done: x.done }; }), out: postVals, mode: 'post', msg: '访问 ' + it.n.v }));
          } else {
            sp.push({ n: it.n, done: true });
            if (it.n.right) { sp.push({ n: it.n.right, done: false }); }
            if (it.n.left) { sp.push({ n: it.n.left, done: false }); }
            push(steps, [6, 7], '弹出（' + it.n.v + ', false）：它还没处理过。按「根最后访问」的要求，把它改成 true 标记重新压栈，再依次压右、左孩子。',
              toSnap(st, { hl: hlVisited(postIds, it.n.id), stack: sp.map(function (x) { return { v: x.n.v, done: x.done }; }), out: postVals, mode: 'post', msg: it.n.v + ' 标记置 true 后重入栈' }));
          }
        }
        push(steps, [6], '后序遍历完成，输出序列：' + postVals.join(' ') + '（左子树 → 右子树 → 根）。',
          toSnap(st, { hl: hlVisited(postIds), stack: [], out: postVals, mode: 'post', msg: '后序：' + postVals.join(' ') }));
      }

      /* ---------- 层序 ---------- */
      if (key === 'level') {
        var q = [st.root], lvlIds = [], lvlVals = [];
        push(steps, [17, 18], '层序开始：根 ' + st.root.v + ' 入队。',
          toSnap(st, { mode: 'level', queue: [st.root.v], msg: '队列初始化' }));
        var g4 = 0;
        while (q.length && g4++ < 100) {
          var qn = q.shift();
          lvlIds.push(qn.id); lvlVals.push(qn.v);
          push(steps, [19, 20], '队首出队 ' + qn.v + ' → 访问（一层一层从左到右），输出：' + lvlVals.join(' ') + '。',
            toSnap(st, { hl: hlVisited(lvlIds, qn.id), queue: q.map(function (x) { return x.v; }), out: lvlVals, mode: 'level', msg: '访问 ' + qn.v }));
          if (qn.left) { q.push(qn.left); }
          if (qn.right) { q.push(qn.right); }
          if (qn.left || qn.right) {
            push(steps, [21, 22], qn.v + ' 的左孩子 ' + (qn.left ? qn.left.v : '无') + '、右孩子 ' + (qn.right ? qn.right.v : '无') + ' 依次入队尾。',
              toSnap(st, { hl: hlVisited(lvlIds, qn.id), queue: q.map(function (x) { return x.v; }), out: lvlVals, mode: 'level', msg: '孩子入队' }));
          }
        }
        push(steps, [19], '层序遍历完成，输出序列：' + lvlVals.join(' ') + '（按层从上到下、同层从左到右）。',
          toSnap(st, { hl: hlVisited(lvlIds), queue: [], out: lvlVals, mode: 'level', msg: '层序：' + lvlVals.join(' ') }));
      }
      return { steps: steps, state: st };
    },
    render: function (kr, s) {
      if (!s || !s.root) {
        kr.html('__e', S.text(500, 280, '二叉树遍历：先输入建树序列，再点击前/中/后/层序按钮。', 'vs'));
        kr.end(); return;
      }
      kr.html('__t', S.text(500, 26, '二叉树非递归遍历', 'vt'));
      kr.html('__s', S.text(500, 50, s.msg || '', 'vs'));
      DSV.drawTree(kr, s.root, {
        top: 86, dy: 62,
        node: function (n) { return { inner: S.circle(0, 0, 22) + S.text(0, 0, n.v), cls: s.hl[n.id] || '' }; }
      });
      function row(key, y, label, items) {
        if (!items || !items.length) { kr.html(key + '_l', S.textL(120, y, label, 'vs')); return; }
        var cw = 46, gap = 8, m = items.length;
        var total = m * cw + (m - 1) * gap, x0 = (1000 - total) / 2;
        kr.html(key + '_l', S.textL(120, y, label, 'vs'));
        for (var i = 0; i < m; i++) {
          var it = items[i];
          var isObj = (typeof it === 'object' && it !== null);
          var v = isObj ? it.v : it;
          var mark = (isObj && it.done) ? ' ✓' : '';
          kr.g(key + '_' + i, 'translate(' + (x0 + i * (cw + gap) + cw / 2) + ',' + y + ')', 'k',
            '<rect class="cell" x="' + (-cw / 2) + '" y="-16" width="' + cw + '" height="32" rx="4"/>' +
            S.text(0, 0, v + mark, 'cell-txt'));
        }
      }
      if (s.mode === 'level') { row('q', 440, '队列（队首→左）', s.queue); }
      else { row('stk', 440, '栈（栈顶→右）', s.stack); }
      row('out', 486, '输出序列', s.out);
      kr.end();
    }
  });

  /* ============================================================
     9. 分块查找（索引顺序查找）
     ============================================================ */
  DSV.register({
    id: 'idx-block-search', name: '分块查找（索引顺序查找）', category: '索引结构',
    desc: '把有序表按块划分，另建一张「块最大关键码」索引表：先查索引表确定目标所在块，再在块内顺序查找。块间有序、块内可不完全有序，是顺序查找与折半查找的折中，平均性能约 O(√n)。',
    code: [
      '// 索引表每一项记录对应块的最大关键码与起止下标',
      'blockSearch(a, idx, x):',
      '  // 第一步：查索引表，确定 x 落在哪一块',
      '  b = 0',
      '  while b < idx.length and idx[b].max < x: b++',
      '  if b == idx.length: return -1          // 超过最后一块',
      '  // 第二步：在第 b 块内部顺序查找',
      '  i = idx[b].lo; j = idx[b].hi',
      '  while i <= j:',
      '    if a[i] == x: return i               // 命中',
      '    i++',
      '  return -1'
    ],
    inputs: [
      { key: 'arr', label: '有序表', def: '10,20,30,40,50,60,70,80,90,100,110,120', hint: '建议升序，逗号分隔' },
      { key: 'target', label: '目标值', def: '70', hint: '整数' }
    ],
    actions: [{ key: 'run', label: '开始查找', primary: true }],
    samples: [
      { label: '示例：命中第 2 块', values: { arr: '10,20,30,40,50,60,70,80,90,100,110,120', target: '70' } },
      { label: '示例：块内查找失败', values: { arr: '10,20,30,40,50,60,70,80,90,100,110,120', target: '85' } }
    ],
    random: function () {
      var nb = DSV.ri(2, 3), bs = DSV.ri(3, 4), a = [], cur = DSV.ri(5, 15);
      for (var i = 0; i < nb * bs; i++) { cur += DSV.ri(5, 15); a.push(cur); }
      var t = Math.random() < 0.6 ? a[DSV.ri(0, a.length - 1)] : cur + DSV.ri(5, 30);
      return { arr: a.join(','), target: String(t) };
    },
    run: function (v) {
      var a = DSV.nums(v.arr, 18), x = parseInt(v.target, 10), steps = [];
      if (!a.length || !isFinite(x)) {
        return [{ code: [1], desc: '输入无效：请填写非空有序表与整数目标值。',
          snap: { empty: true, msg: '请输入有序表（逗号分隔）与目标值' } }];
      }
      var n = a.length, bs = 4, nb = Math.ceil(n / bs), idx = [], b, i;
      for (b = 0; b < nb; b++) {
        var lo = b * bs, hi = Math.min(n - 1, (b + 1) * bs - 1), mx = a[lo];
        for (i = lo; i <= hi; i++) { if (a[i] > mx) { mx = a[i]; } }
        idx.push({ lo: lo, hi: hi, max: mx });
      }
      var blockIdx = -1, scanI = -1, found = -1;
      function mkCls() {
        var c = [], k;
        for (k = 0; k < n; k++) {
          c[k] = '';
          if (blockIdx >= 0 && blockIdx < nb && k >= idx[blockIdx].lo && k <= idx[blockIdx].hi) { c[k] = 'path'; }
          if (k === scanI && scanI >= 0) { c[k] = 'compare'; }
          if (found >= 0 && k === found) { c[k] = 'done'; }
        }
        return c;
      }
      function snap(o) {
        o = o || {};
        return { arr: a.slice(), n: n, idx: DSV.clone(idx), target: x, blockIdx: blockIdx, scanI: scanI, found: found, cls: mkCls(), msg: o.msg || '' };
      }
      var idxTxt = '';
      for (b = 0; b < nb; b++) { idxTxt += (b ? '，' : '') + '块' + b + '≤' + idx[b].max; }
      push(steps, [1, 2], '把长 ' + n + ' 的有序表按每块 ' + bs + ' 个元素划成 ' + nb + ' 块，建立索引表（每块记录块内最大值与起止下标）：' + idxTxt + '。',
        snap({ msg: '索引表：' + idxTxt }));
      /* 第一步：查索引表 */
      for (b = 0; b < nb; b++) {
        blockIdx = b;
        if (x > idx[b].max) {
          push(steps, [4, 5], '比较目标 ' + x + ' 与索引项「块' + b + ' 最大 = ' + idx[b].max + '」：' + x + ' > ' + idx[b].max + '，本块不可能包含目标，跳到下一块。',
            snap({ msg: x + ' > ' + idx[b].max + '，跳过块' + b }));
        } else {
          push(steps, [5], '比较目标 ' + x + ' 与索引项「块' + b + ' 最大 = ' + idx[b].max + '」：' + x + ' ≤ ' + idx[b].max + '，目标若存在必在第 ' + b + ' 块（下标 ' + idx[b].lo + '…' + idx[b].hi + '）。',
            snap({ msg: '进入块' + b + '（下标 ' + idx[b].lo + '…' + idx[b].hi + '）' }));
          break;
        }
      }
      /* 第二步：块内顺序查找 */
      if (blockIdx < nb && x <= idx[blockIdx].max) {
        var L = idx[blockIdx].lo, R = idx[blockIdx].hi;
        for (i = L; i <= R; i++) {
          scanI = i;
          if (a[i] === x) {
            found = i;
            push(steps, [8, 9], '块内顺序比较：a[' + i + '] = ' + a[i] + ' == 目标 ' + x + ' → 命中！共查了索引表 ' + (blockIdx + 1) + ' 项、块内 ' + (i - L + 1) + ' 个元素。',
              snap({ msg: '查找成功：a[' + found + '] = ' + x }));
            break;
          } else {
            push(steps, [9], '块内顺序比较：a[' + i + '] = ' + a[i] + ' ≠ ' + x + '，继续同块下一个。',
              snap({ msg: 'a[' + i + ']=' + a[i] + ' ≠ ' + x }));
          }
        }
        if (found < 0) {
          scanI = -1;
          push(steps, [10], '第 ' + blockIdx + ' 块内 [' + a.slice(L, R + 1).join(', ') + '] 都比较完仍不等于 ' + x + '：按分块查找约定，目标不存在。',
            snap({ msg: '块内无 ' + x }));
        }
      } else {
        blockIdx = nb;
        push(steps, [5], '目标 ' + x + ' 比所有块的最大值都大（最大块值 = ' + idx[nb - 1].max + '），不可能存在于表中。',
          snap({ msg: '目标超出最后一块范围' }));
      }
      return steps;
    },
    render: function (kr, s) {
      if (!s || s.empty) {
        kr.html('__e', S.text(500, 280, (s && s.msg) || '分块查找：输入有序表与目标值后点击「开始查找」', 'vs'));
        kr.end(); return;
      }
      kr.html('__t', S.text(500, 26, '分块查找（索引顺序查找）', 'vt'));
      kr.html('__s', S.text(500, 50, s.msg || '', 'vs'));
      var nb = s.idx.length, i;
      var bw = 150, bg = 20, btot = nb * bw + (nb - 1) * bg, bx0 = (1000 - btot) / 2;
      kr.html('__il', S.textL(60, 120, '索引表', 'vs'));
      for (i = 0; i < nb; i++) {
        var e = s.idx[i];
        var active = (i === s.blockIdx) ? ' active' : '';
        kr.g('ib' + i, 'translate(' + (bx0 + i * (bw + bg) + bw / 2) + ',120)', 'k',
          '<rect class="cell' + active + '" x="' + (-bw / 2) + '" y="-18" width="' + bw + '" height="36" rx="4"/>' +
          S.text(0, -5, '块' + i + ' ≤ ' + e.max, 'cell-txt') + S.text(0, 12, '下标 ' + e.lo + '…' + e.hi, 'idx-txt'));
      }
      var n = s.n, cw = Math.min(56, Math.floor((1000 - 120) / n)), gap = 8;
      var tot = n * cw + (n - 1) * gap, x0 = (1000 - tot) / 2, y = 270;
      for (i = 0; i < n; i++) {
        kr.g('d' + i, 'translate(' + (x0 + i * (cw + gap) + cw / 2) + ',' + y + ')', 'k',
          '<rect class="cell ' + (s.cls[i] || '') + '" x="' + (-cw / 2) + '" y="-24" width="' + cw + '" height="48" rx="4"/>' +
          S.text(0, 0, s.arr[i], 'cell-txt') + S.text(0, 40, i, 'idx-txt'));
      }
      kr.end();
    }
  });

  /* ============================================================
     10. 线索二叉树（中序线索化 + 按线索遍历）
     ============================================================ */
  /** 线索树快照：扁平结点表（线索是跨结点引用，直接克隆会成环，故只存 id） */
  function thSnap(st, o, msg) {
    o = o || {};
    var nodes = [];
    thWalk(st.root, function (n) {
      nodes.push({
        id: n.id, v: n.v,
        ltag: n.ltag || 0, rtag: n.rtag || 0,
        leftId: n.left ? n.left.id : null,
        rightId: n.right ? n.right.id : null
      });
    });
    return { nodes: nodes, hl: o.hl || {}, msg: msg || '' };
  }
  /** 沿真孩子遍历（线索化后 left/right 可能是线索，不能盲走） */
  function thWalk(n, fn) {
    if (!n) { return; }
    fn(n);
    thWalk(n.ltag === 1 ? null : n.left, fn);
    thWalk(n.rtag === 1 ? null : n.right, fn);
  }

  DSV.register({
    id: 'idx-threaded', name: '线索二叉树', category: '索引结构',
    desc: '把二叉树中的空左/右指针改作线索：左空指针指中序前驱、右空指针指中序后继，遍历就不再需要栈或递归。线索化一次性 O(n)，之后沿右线索逐个访问仍是 O(n)，空间上省去栈。',
    code: [
      '// 中序线索化：ltag=1 表示左指针是前驱线索',
      'thread(root):',
      '  seq = 中序遍历得到的结点序列',
      '  for i = 0 to seq.length-1:',
      '    if seq[i].left == null:',
      '      seq[i].ltag = 1;  seq[i].left = seq[i-1]   // 前驱',
      '    if seq[i].right == null:',
      '      seq[i].rtag = 1;  seq[i].right = seq[i+1]  // 后继',
      '',
      '// 按中序线索遍历（不写栈）',
      'walk(root):',
      '  p = root; while p.ltag == 0: p = p.left       // 走到最左下',
      '  while p != null:',
      '    访问 p',
      '    if p.rtag == 1: p = p.right                 // 右线索 → 直接跳后继',
      '    else: p = 右子树中的最左下结点'
    ],
    inputs: [{ key: 'init', label: '建树序列', def: '50,30,70,20,40,60,80', hint: 'BST 规则建树，逗号分隔' }],
    actions: [
      { key: 'build', label: '建树并线索化', primary: true },
      { key: 'walk', label: '按线索中序遍历' }
    ],
    samples: [
      { label: '示例：满二叉树', values: { init: '50,30,70,20,40,60,80' } },
      { label: '示例：单链', values: { init: '50,40,30,20' } }
    ],
    random: function () { return { init: DSV.shuffle(DSV.randArr(DSV.ri(5, 7), 10, 99)).join(',') }; },
    run: function (v, action, state) {
      var st = state || { root: null, next: 1, threaded: false };
      var steps = [];
      var key = (action && action.key) || 'build';
      var i;
      if (!st.root) {
        var a = DSV.nums(v.init, 12);
        push(steps, [1], '建树：按输入序列 ' + (a.length ? a.join(' → ') : '（空）') + ' 建立二叉搜索树。',
          thSnap(st, {}, '初始化'));
        for (i = 0; i < a.length; i++) { toInsert(st, a[i]); }
        if (!st.root) {
          push(steps, [1], '输入为空，空树无法线索化。', thSnap(st, {}, '请填写结点序列'));
          return { steps: steps, state: st };
        }
        push(steps, [1], '树建好，共 ' + (st.next - 1) + ' 个结点。空指针既浪费又能省去遍历用的栈，下面做中序线索化。',
          thSnap(st, {}, '建树完成，准备线索化'));
      }
      if (key === 'build') {
        if (!st.threaded) {
          var seq = [];
          (function inw(n) { if (!n) { return; } inw(n.left); seq.push(n); inw(n.right); })(st.root);
          var seqTxt = '';
          for (i = 0; i < seq.length; i++) { seqTxt += (i ? ' → ' : '') + seq[i].v; }
          push(steps, [1, 2], '先做一次中序遍历，得到序列：' + seqTxt + '。线索化就是给每个空指针配上它在这条序列里的前驱/后继。',
            thSnap(st, {}, '中序序列：' + seqTxt));
          for (i = 0; i < seq.length; i++) {
            var n = seq[i], pred = i > 0 ? seq[i - 1] : null, succ = i < seq.length - 1 ? seq[i + 1] : null;
            if (!n.left) {
              n.ltag = 1; n.left = pred;
              (function (nn, pr) {
                var h = {}; h[nn.id] = 'active'; if (pr) { h[pr.id] = 'compare'; }
                push(steps, [3, 4], '结点 ' + nn.v + ' 的左孩子为空：令左线索（ltag=1）指向前驱 ' + (pr ? pr.v : 'null（序列头）') + '。',
                  thSnap(st, { hl: h }, nn.v + ' 的左空指针 → 前驱' + (pr ? ' ' + pr.v : ' null')));
              })(n, pred);
            }
            if (!n.right) {
              n.rtag = 1; n.right = succ;
              (function (nn, sc) {
                var h = {}; h[nn.id] = 'active'; if (sc) { h[sc.id] = 'compare'; }
                push(steps, [5, 6], '结点 ' + nn.v + ' 的右孩子为空：令右线索（rtag=1）指向后继 ' + (sc ? sc.v : 'null（序列尾）') + '。',
                  thSnap(st, { hl: h }, nn.v + ' 的右空指针 → 后继' + (sc ? ' ' + sc.v : ' null')));
              })(n, succ);
            }
          }
          st.threaded = true;
          push(steps, [1], '线索化完成：图中虚线即为线索（左虚线=前驱，右虚线=后继）。接下来可以点「按线索中序遍历」，全程不写栈。',
            thSnap(st, {}, '虚线 = 线索，准备遍历'));
        } else {
          push(steps, [1], '树已经线索化过（状态保留）。直接点「按线索中序遍历」演示无栈遍历。', thSnap(st, {}, '请点「按线索中序遍历」'));
        }
        return { steps: steps, state: st };
      }
      /* walk：按线索中序遍历 */
      if (!st.threaded) {
        push(steps, [9], '请先点「建树并线索化」。', thSnap(st, {}, '请先建树'));
        return { steps: steps, state: st };
      }
      var p = st.root;
      while (!p.ltag && p.left) { p = p.left; }
      push(steps, [10, 11], '按线索遍历开始：从根出发，沿左指针一直走到最左下结点 ' + p.v + '（它就是中序第一个结点）。',
        thSnap(st, { hl: (function () { var h = {}; h[p.id] = 'active'; return h; })() }, '起点 = ' + p.v));
      var outVals = [], outIds = [], guard = 0;
      while (p && guard++ < 100) {
        outVals.push(p.v); outIds.push(p.id);
        (function (cur) {
          var h = {};
          for (var k = 0; k < outIds.length; k++) { h[outIds[k]] = 'done'; }
          h[cur.id] = 'active';
          push(steps, [12, 13], '访问 ' + cur.v + '，当前输出：' + outVals.join(' → ') + '。',
            thSnap(st, { hl: h }, '已访问：' + outVals.join(' ')));
        })(p);
        if (p.rtag === 1) {
          var nx = p.right;
          (function (cur, nxt) {
            var h = {};
            for (var k = 0; k < outIds.length; k++) { h[outIds[k]] = 'done'; }
            if (nxt) { h[nxt.id] = 'active'; }
            push(steps, [14], cur.v + ' 的右指针是右线索 → 直接跳到后继 ' + (nxt ? nxt.v : 'null（遍历结束）') + '，不需要栈帮忙回退。',
              thSnap(st, { hl: h }, cur.v + ' → 右线索 → ' + (nxt ? nxt.v : '结束')));
          })(p, nx);
          p = nx;
        } else {
          p = p.right;
          while (p && !p.ltag && p.left) { p = p.left; }
          (function (cur) {
            var h = {};
            for (var k = 0; k < outIds.length; k++) { h[outIds[k]] = 'done'; }
            if (cur) { h[cur.id] = 'active'; }
            push(steps, [15], cur ? (cur.v + ' 的右指针是真孩子 → 进入右子树，再沿左指针走到最左下 ' + cur.v + '（下一个中序结点）。') : '右子树为空，遍历结束。',
              thSnap(st, { hl: h }, cur ? '下一个 = ' + cur.v : '遍历结束'));
          })(p);
        }
      }
      push(steps, [12], '按线索中序遍历完成：' + outVals.join(' → ') + '，全程只用了两条局部指针，没有任何栈。',
        thSnap(st, {}, '中序序列：' + outVals.join(' ')));
      return { steps: steps, state: st };
    },
    render: function (kr, s) {
      if (!s || !s.nodes || !s.nodes.length) {
        kr.html('__e', S.text(500, 280, '线索二叉树：输入结点序列后点击「建树并线索化」。', 'vs'));
        kr.end(); return;
      }
      kr.html('__t', S.text(500, 26, '线索二叉树（虚线 = 前驱 / 后继线索）', 'vt'));
      kr.html('__s', S.text(500, 50, s.msg || '', 'vs'));
      /* 由扁平结点表重建布局树（真孩子构成的普通树，无线索环） */
      var byId = {};
      s.nodes.forEach(function (n) { byId[n.id] = n; });
      function build(id) {
        var n = byId[id];
        return { id: id, v: n.v,
          left: n.ltag === 1 || !n.leftId ? null : build(n.leftId),
          right: n.rtag === 1 || !n.rightId ? null : build(n.rightId) };
      }
      var lay = DSV.treeLayout(build(s.nodes[0].id), { top: 96, dy: 64 });
      var pos = lay.pos;
      var ge = kr.g('__te', 'translate(0,0)', 'k');
      /* 真边 */
      var ed = '';
      s.nodes.forEach(function (n) {
        var p = pos[n.id];
        if (n.leftId && n.ltag !== 1 && pos[n.leftId]) { ed += S.line(p.x, p.y, pos[n.leftId].x, pos[n.leftId].y, 'edge tree'); }
        if (n.rightId && n.rtag !== 1 && pos[n.rightId]) { ed += S.line(p.x, p.y, pos[n.rightId].x, pos[n.rightId].y, 'edge tree'); }
      });
      kr.html('__realedges', ed, ge);
      /* 线索（虚线曲线） */
      var td = '';
      s.nodes.forEach(function (n) {
        var p = pos[n.id];
        if (n.ltag === 1 && n.leftId && pos[n.leftId]) {
          var q = pos[n.leftId];
          td += S.path('M ' + p.x + ' ' + (p.y + 18) + ' C ' + p.x + ' ' + (p.y + 78) + ', ' + q.x + ' ' + (q.y + 78) + ', ' + q.x + ' ' + (q.y + 18), 'edge path', 'stroke-dasharray="5 4"');
        }
        if (n.rtag === 1 && n.rightId && pos[n.rightId]) {
          var q2 = pos[n.rightId];
          td += S.path('M ' + p.x + ' ' + (p.y + 18) + ' C ' + p.x + ' ' + (p.y + 78) + ', ' + q2.x + ' ' + (q2.y + 78) + ', ' + q2.x + ' ' + (q2.y + 18), 'edge path', 'stroke-dasharray="5 4"');
        }
      });
      kr.html('__threads', td, ge);
      /* 结点 */
      var gn = kr.g('__tn', 'translate(0,0)', 'k');
      s.nodes.forEach(function (n) {
        var p = pos[n.id];
        kr.g('tn_' + n.id, 'translate(' + p.x + ',' + p.y + ')', 'k nd ' + (s.hl[n.id] || ''),
          S.circle(0, 0, 20) + S.text(0, 0, n.v) +
          S.text(-13, -13, n.ltag === 1 ? '⇐' : '', 'tag') + S.text(13, -13, n.rtag === 1 ? '⇒' : '', 'tag'), gn);
      });
      kr.end();
    }
  });

  /* ============================================================
     11. 树、森林与二叉树转换（左孩子右兄弟法）
     ============================================================ */
  DSV.register({
    id: 'idx-tree-convert', name: '树、森林与二叉树转换', category: '索引结构',
    desc: '左孩子右兄弟法：原树中结点的第一个孩子作二叉树的左孩子，下一个兄弟作右孩子，森林中后一棵树的根作前一棵树根的右孩子。转换一一对应且可逆，过程 O(n)，把无序树问题转化为熟悉的二叉树问题。',
    code: [
      '// 原树 → 二叉树（左孩子右兄弟）',
      'convert(森林):',
      '  for 每个原结点 u:',
      '    if u 有第一个孩子 c0:',
      '      c0 成为 u 在二叉树中的左孩子',
      '    for u 的兄弟链 c1, c2, ...:',
      '      c(i+1) 成为 c(i) 的右孩子      // 兄弟连成右链',
      '  if 有多棵树:',
      '    第 i+1 棵树的根成为第 i 棵树根的右孩子'
    ],
    inputs: [{ key: 'edges', label: '边表（每行：父结点 孩子结点）', def: 'A B\nA C\nA D\nB E\nB F\nD G', hint: '每行一对，空格分隔', multiline: true }],
    actions: [{ key: 'run', label: '开始转换', primary: true }],
    samples: [
      { label: '示例：普通树', values: { edges: 'A B\nA C\nA D\nB E\nB F\nD G' } },
      { label: '示例：森林（两棵树）', values: { edges: 'A B\nA C\nD E\nD F' } }
    ],
    random: function () {
      var names = 'ABCDEFG';
      var lines = [], used = 1, i;
      var nkids = DSV.ri(2, 3);
      for (i = 0; i < nkids && used < 7; i++) {
        var k = names.charAt(used++);
        lines.push('A ' + k);
        if (Math.random() < 0.6 && used < 7) { lines.push(k + ' ' + names.charAt(used++)); }
      }
      return { edges: lines.join('\n') };
    },
    run: function (v) {
      var lines = String(v.edges == null ? '' : v.edges).split(/\r?\n/);
      var reg = {}, children = [], steps = [], i, nm;
      for (i = 0; i < lines.length; i++) {
        var t = lines[i].split(/[\s,，]+/).filter(function (x) { return x !== ''; });
        if (t.length < 2) { continue; }
        var p = t[0].slice(0, 6), c = t[1].slice(0, 6);
        if (!reg[p]) { reg[p] = { id: p, name: p, kids: [] }; }
        if (!reg[c]) { reg[c] = { id: c, name: c, kids: [] }; }
        reg[p].kids.push(reg[c]);
        children.push(c);
      }
      var roots = [];
      for (nm in reg) {
        if (!reg.hasOwnProperty(nm)) { continue; }
        if (children.indexOf(nm) < 0) { roots.push(reg[nm]); }
      }
      if (!roots.length) {
        return [{ code: [1], desc: '输入无效：请填写边表（每行「父 子」一对）。', snap: { empty: true, msg: '示例：A B / A C / B E（每行一对）' } }];
      }
      var bin = {};
      for (nm in reg) { if (reg.hasOwnProperty(nm)) { bin[nm] = { id: 'b_' + nm, v: nm, left: null, right: null }; } }
      function csnap(hl, msg) {
        return {
          wrap: { id: 'WRAP', kids: roots.map(function (r) { return { id: r.id, name: r.name, kids: r.kids }; }) },
          binRoot: DSV.clone(bin[roots[0].name]),
          hl: hl || {}, msg: msg || ''
        };
      }
      var namesTxt = '';
      for (nm in reg) { if (reg.hasOwnProperty(nm)) { namesTxt += (namesTxt ? '、' : '') + nm; } }
      push(steps, [1], '原结构：共 ' + roots.length + ' 棵树（森林），结点 ' + namesTxt + '。下面用「左孩子右兄弟」法逐结点转换为二叉树。',
        csnap({}, '原结构就绪'));
      var queue = roots.slice();
      while (queue.length) {
        var u = queue.shift();
        var kids = u.kids;
        var h = {}; h[u.name] = 'active';
        if (kids.length) {
          bin[u.name].left = bin[kids[0].name];
          var chain = '';
          for (i = 0; i < kids.length - 1; i++) {
            bin[kids[i].name].right = bin[kids[i + 1].name];
            chain += (chain ? '、' : '') + kids[i].name + ' 的右孩子 = ' + kids[i + 1].name;
          }
          push(steps, [2, 3], '处理结点 ' + u.name + '：第一个孩子 ' + kids[0].name + ' 成为它在二叉树中的左孩子' +
            (kids.length > 1 ? '；其余兄弟连成右链：' + chain + '。' : '；它没有其他兄弟。'),
            csnap(h, u.name + ' 的第一个孩子 ' + kids[0].name + ' 作左孩子'));
          for (i = 0; i < kids.length; i++) { queue.push(kids[i]); }
        } else {
          push(steps, [2], '处理叶子结点 ' + u.name + '：它没有孩子，左孩子位置留空。',
            csnap(h, u.name + ' 是叶子'));
        }
      }
      if (roots.length > 1) {
        for (i = 0; i < roots.length - 1; i++) { bin[roots[i].name].right = bin[roots[i + 1].name]; }
        var rt = roots.map(function (r) { return r.name; }).join(' → ');
        push(steps, [6, 7], '这是一片森林：把第 2…' + roots.length + ' 棵树的根依次作为前一棵树根的右孩子（' + rt + '），整片森林就对应一棵二叉树。',
          csnap({}, '森林根之间连成右链'));
      }
      push(steps, [1], '转换完成：左图是原树/森林，右图是等价二叉树（右链=兄弟）。反之，把右图左孩子的左子孙全作孩子、右子孙全作兄弟即可还原原树。',
        csnap({}, '转换完成'));
      return steps;
    },
    render: function (kr, s) {
      if (!s || s.empty) {
        kr.html('__e', S.text(500, 280, (s && s.msg) || '树/森林转二叉树：在边表里每行填一对「父 子」。', 'vs'));
        kr.end(); return;
      }
      kr.html('__t', S.text(500, 26, '树、森林 → 二叉树（左孩子右兄弟法）', 'vt'));
      kr.html('__s', S.text(500, 50, s.msg || '', 'vs'));
      kr.html('__ol', S.text(240, 84, '原树 / 森林', 'vt'));
      kr.html('__bl', S.text(760, 84, '对应二叉树', 'vt'));
      function layN(root) {
        var slot = {}, dep = {}, cursor = 0;
        (function w(nn, d) {
          dep[nn.id] = d;
          var ks = nn.kids || [];
          if (!ks.length) { slot[nn.id] = cursor++; return; }
          for (var i = 0; i < ks.length; i++) { w(ks[i], d + 1); }
          slot[nn.id] = (slot[ks[0].id] + slot[ks[ks.length - 1].id]) / 2;
        })(root, 0);
        var span = Math.max(1, cursor - 1), pos = {};
        for (var id in slot) {
          if (!slot.hasOwnProperty(id)) { continue; }
          pos[id] = { x: 240 + (slot[id] - (span - 1) / 2) * (360 / span), y: 130 + dep[id] * 72 };
        }
        return pos;
      }
      var opos = layN(s.wrap);
      var oge = kr.g('__oe', 'translate(0,0)', 'k'), ogn = kr.g('__on', 'translate(0,0)', 'k');
      (function ow(nn) {
        var p = opos[nn.id], ks = nn.kids || [];
        for (var i = 0; i < ks.length; i++) {
          var cp = opos[ks[i].id];
          kr.html('oe_' + nn.id + '_' + ks[i].id, S.line(p.x, p.y, cp.x, cp.y, 'edge tree'), oge);
          ow(ks[i]);
        }
        if (nn.id === 'WRAP') { return; }
        kr.g('on_' + nn.id, 'translate(' + p.x + ',' + p.y + ')', 'k nd ' + (s.hl[nn.name] || ''),
          S.circle(0, 0, 18) + S.text(0, 0, nn.name), ogn);
      })(s.wrap);
      var blay = DSV.treeLayout(s.binRoot, { w: 440, top: 130, dy: 72, nodeSize: 44 });
      var bpos = blay.pos;
      var bge = kr.g('__be', 'translate(520,0)', 'k'), bgn = kr.g('__bn', 'translate(520,0)', 'k');
      (function bw(nn) {
        if (!nn) { return; }
        var p = bpos[nn.id];
        if (!p) { return; }
        if (nn.left && bpos[nn.left.id]) { kr.html('be_' + nn.id + '_l', S.line(p.x, p.y, bpos[nn.left.id].x, bpos[nn.left.id].y, 'edge tree'), bge); }
        if (nn.right && bpos[nn.right.id]) { kr.html('be_' + nn.id + '_r', S.line(p.x, p.y, bpos[nn.right.id].x, bpos[nn.right.id].y, 'edge path'), bge); }
        kr.g('bn_' + nn.id, 'translate(' + p.x + ',' + p.y + ')', 'k nd ' + (s.hl[nn.v] || ''),
          S.circle(0, 0, 18) + S.text(0, 0, nn.v), bgn);
        bw(nn.left); bw(nn.right);
      })(s.binRoot);
      kr.end();
    }
  });

  /* ============================================================
     12. Treap 树堆（BST + 小根堆）
     ============================================================ */
  DSV.register({
    id: 'idx-treap', name: 'Treap 树堆', category: '索引结构',
    desc: '每个结点同时存键值 k 与随机优先级 pr：按 k 满足二叉搜索树、按 pr 满足小根堆。插入后沿路径向上旋转维持堆性质，删除时把结点旋转成叶子再摘掉；随机 pr 使树期望平衡，三种操作期望均为 O(log n)，比 AVL 实现更简单。',
    code: [
      '// 结点 = 键值 k（BST 序）+ 随机优先级 pr（小根堆）',
      'insert(x, pr):',
      '  先按 BST 规则把 x 插到叶子位置',
      '  while 父结点.pr > 当前结点.pr:',
      '    把当前结点向上旋转（左旋 / 右旋）',
      '',
      'delete(x):',
      '  while x 不是叶子:',
      '    把孩子中 pr 较小的那个旋转上来',
      '  删除叶子 x'
    ],
    inputs: [
      { key: 'init', label: '键值序列', def: '20,50,30,80,10,60', hint: '逗号分隔' },
      { key: 'prs', label: '优先级序列（可空）', def: '5,2,8,1,9,3', hint: '与键值一一对应，留空则随机生成' }
    ],
    actions: [
      { key: 'build', label: '建堆插入', primary: true },
      { key: 'insert', label: '插入', arg: { label: '键值', def: '40' } },
      { key: 'delete', label: '删除', arg: { label: '键值', def: '30' } }
    ],
    samples: [
      { label: '示例：插入即旋转', values: { init: '20,50,30,80,10,60', prs: '5,2,8,1,9,3' } },
      { label: '示例：优先级随机', values: { init: '10,20,30,40', prs: '' } }
    ],
    random: function () {
      var n = DSV.ri(5, 7);
      return { init: DSV.uniq(DSV.randArr(n, 10, 99)).join(','), prs: DSV.shuffle(DSV.randArr(n, 1, 99)).join(',') };
    },
    run: function (v, action, state) {
      var st = state || { root: null, next: 1 };
      var steps = [];
      var key = (action && action.key) || 'build';
      var arg = (action && action.arg != null) ? String(action.arg).trim() : '';
      var i;
      function snap(hl, msg) { return { root: DSV.clone(st.root), hl: hl || {}, msg: msg || '' }; }
      /** BST 插入，返回新结点（重复返回 null） */
      function tIns(x, pr) {
        if (!st.root) { st.root = mkNode(x, st, { pr: pr }); return st.root; }
        var cur = st.root;
        while (true) {
          if (x < cur.v) { if (!cur.left) { cur.left = mkNode(x, st, { pr: pr }); return cur.left; } cur = cur.left; }
          else if (x > cur.v) { if (!cur.right) { cur.right = mkNode(x, st, { pr: pr }); return cur.right; } cur = cur.right; }
          else { return null; }
        }
      }
      /** 从 node 向上旋转直到堆性质满足 */
      function rebalanceUp(node) {
        var guard = 0;
        while (node !== st.root && guard++ < 20) {
          var par = findParent(st.root, node);
          if (!par || par.pr <= node.pr) { break; }
          var side = (par.left && par.left.id === node.id) ? 'left' : 'right';
          var gp = findParent(st.root, par);
          var parV = par.v;
          var up = rotate(st, par, gp, side);
          push(steps, [3, 4], '父结点 ' + parV + ' 的 pr=' + par.pr + ' 大于孩子 ' + up.v + ' 的 pr=' + up.pr + '（小根堆被破坏）→ 做' + rotName(side) + '，把 ' + up.v + ' 升到父位置。',
            snap(one(up.id, 'swap'), up.v + ' 向上' + rotName(side)));
          node = up;
        }
      }
      /** BST 定位路径提示 */
      function locate(x) {
        var path = [], cur = st.root;
        while (cur) {
          path.push(cur);
          if (x === cur.v) { break; }
          cur = x < cur.v ? cur.left : cur.right;
        }
        return { path: path, found: cur };
      }

      if (key === 'build') {
        var ks = DSV.nums(v.init, 10), ps = DSV.nums(v.prs, 10);
        if (!ks.length) {
          push(steps, [1], '键值序列为空，无法建树。', snap({}, '请填写键值序列'));
          return { steps: steps, state: st };
        }
        push(steps, [1], '开始按序列插入 ' + ks.join(' → ') + '，每个结点带优先级 pr' + (ps.length ? '：' + ps.join(', ') : '（未指定，自动随机生成）') + '。',
          snap({}, '初始化'));
        for (i = 0; i < ks.length; i++) {
          (function (x, p) {
            var loc = locate(x);
            if (st.root) {
              var h = {};
              loc.path.forEach(function (nd) { h[nd.id] = 'path'; });
              push(steps, [2], '插入 ' + x + '（pr=' + p + '）：按 BST 规则从根向下寻找空位置。',
                snap(h, 'BST 定位 ' + x));
            }
            var node = tIns(x, p);
            if (!node) {
              push(steps, [2], x + ' 已在树中，跳过。', snap(loc.found ? one(loc.found.id, 'compare') : {}, x + ' 已存在'));
              return;
            }
            push(steps, [2], x + '（pr=' + p + '）已作为叶子接入。',
              snap(one(node.id, 'active'), '新叶子 ' + x + '（pr=' + p + '）'));
            rebalanceUp(node);
          })(ks[i], ps.length ? ps[i] : DSV.ri(1, 99));
        }
        push(steps, [1], '建堆插入完成：这棵树既满足按键值的 BST，又满足按 pr 的小根堆。',
          snap({}, '建堆完成'));
        return { steps: steps, state: st };
      }

      if (key === 'insert') {
        var xv = parseInt(arg, 10);
        if (!isFinite(xv)) {
          push(steps, [2], '插入失败：请在「键值」框中填写一个整数。', snap({}, '输入非法'));
          return { steps: steps, state: st };
        }
        var loc2 = locate(xv);
        if (st.root) {
          var h2 = {};
          loc2.path.forEach(function (nd) { h2[nd.id] = 'path'; });
          push(steps, [2], '插入 ' + xv + '：按 BST 规则从根向下寻找空位置。', snap(h2, 'BST 定位 ' + xv));
        }
        var node2 = tIns(xv, DSV.ri(1, 99));
        if (!node2) {
          push(steps, [2], xv + ' 已在树中，跳过。', snap(loc2.found ? one(loc2.found.id, 'compare') : {}, xv + ' 已存在'));
        } else {
          push(steps, [2], xv + ' 已作为叶子接入，随后检查堆性质。', snap(one(node2.id, 'active'), '新叶子 ' + xv));
          rebalanceUp(node2);
        }
        return { steps: steps, state: st };
      }

      if (key === 'delete') {
        var dv = parseInt(arg, 10);
        if (!st.root) {
          push(steps, [6], '树为空，无法删除。', snap({}, '空树'));
          return { steps: steps, state: st };
        }
        var loc3 = locate(dv);
        if (!loc3.found) {
          push(steps, [6], '树中没有键值 ' + dv + '。', snap({}, '未找到 ' + dv));
          return { steps: steps, state: st };
        }
        var cur = loc3.found;
        push(steps, [6], '找到待删结点 ' + dv + '（pr=' + cur.pr + '）：不断把它孩子中 pr 较小者旋转上来，直到它变成叶子。',
          snap(one(cur.id, 'active'), '旋转成叶子'));
        var guard = 0;
        while ((cur.left || cur.right) && guard++ < 20) {
          var lpr = cur.left ? cur.left.pr : Infinity, rpr = cur.right ? cur.right.pr : Infinity;
          var side = lpr <= rpr ? 'left' : 'right';
          var gp = findParent(st.root, cur);
          var up = rotate(st, cur, gp, side);
          push(steps, [7], cur.v + ' 还有孩子：把 pr 较小的' + (side === 'left' ? '左' : '右') + '孩子旋转上来，' + cur.v + ' 又下沉一层。',
            snap(one(up.id, 'swap'), up.v + ' 旋上来，' + cur.v + ' 下沉'));
        }
        var par = findParent(st.root, cur);
        if (!par) { st.root = null; }
        else if (par.left && par.left.id === cur.id) { par.left = null; }
        else { par.right = null; }
        push(steps, [8], cur.v + ' 已是叶子，直接摘掉。Treap 删除完成。', snap({}, '已删除 ' + dv));
        return { steps: steps, state: st };
      }
      return { steps: steps, state: st };
    },
    render: function (kr, s) {
      if (!s || !s.root) {
        kr.html('__e', S.text(500, 280, 'Treap：输入键值（与可选优先级）后点击「建堆插入」。', 'vs'));
        kr.end(); return;
      }
      kr.html('__t', S.text(500, 26, 'Treap 树堆（圆内=键值，下方小字=优先级 pr）', 'vt'));
      kr.html('__s', S.text(500, 50, s.msg || '', 'vs'));
      DSV.drawTree(kr, s.root, {
        top: 92, dy: 72,
        node: function (n) { return { inner: S.circle(0, 0, 24) + S.text(0, 0, n.v) + S.text(0, 36, 'pr=' + n.pr, 'tag'), cls: s.hl[n.id] || '' }; }
      });
      kr.end();
    }
  });

})();
