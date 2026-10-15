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

})();
