/* ============================================================
   viz-other.js —— 其他章节（1 个有状态数据结构）
   并查集（Disjoint Sets / Union-Find）：森林 + 按秩合并 + 路径压缩
   ============================================================ */
(function () {
  'use strict';
  var DSV = window.DSV, S = DSV.svg;

  function push(steps, code, desc, snap) { steps.push({ code: code, desc: desc, snap: snap }); }

  /** 一行小格子（parent / rank 数组） */
  function drawRow(kr, key, label, items, y, opt) {
    opt = opt || {};
    var cw = opt.cw || 48, gap = opt.gap || 5, n = items.length;
    var total = n * cw + (n - 1) * gap;
    var x0 = (1000 - total) / 2, inner = '', i;
    if (label) { inner += S.text(500, y - 26, label, 'vs'); }
    for (i = 0; i < n; i++) {
      var it = items[i] || {}, x = x0 + i * (cw + gap);
      inner += '<rect class="cell ' + (it.cls || '') + '" x="' + x + '" y="' + (y - 15) +
        '" width="' + cw + '" height="30" rx="4"/>' +
        S.text(x + cw / 2, y, it.v, 'cell-txt') +
        S.text(x + cw / 2, y + 25, it.m, 'idx-txt');
    }
    kr.html(key, inner);
  }

  /**
   * 由 parent 数组驱动的森林布局：根在上，孩子挂在下面，同一集合画成一棵树
   * 返回 { pos:{ k:{x,y} }, children:{...}, roots:[...] }
   */
  function forestLayout(nodes, parent, opt) {
    var children = {}, i, k;
    for (i = 0; i < nodes.length; i++) { children[nodes[i]] = []; }
    for (i = 0; i < nodes.length; i++) {
      var p = parent[nodes[i]];
      if (p !== nodes[i] && children[p]) { children[p].push(nodes[i]); }
    }
    var roots = [];
    for (i = 0; i < nodes.length; i++) { if (parent[nodes[i]] === nodes[i]) { roots.push(nodes[i]); } }

    var width = {};
    (function calc(k) {
      var c = children[k] || [], t = 0, j;
      if (!c.length) { width[k] = 1; return 1; }
      for (j = 0; j < c.length; j++) { t += calc(c[j]); }
      width[k] = Math.max(1, t);
      return width[k];
    });
    function wOf(k) {
      var c = children[k] || [], t = 0, j;
      if (!c.length) { return 1; }
      for (j = 0; j < c.length; j++) { t += wOf(c[j]); }
      return Math.max(1, t);
    }
    roots.forEach(function (r) { wOf(r); });

    var cw = opt.cw || 54, gap = 26, total = 0;
    for (i = 0; i < roots.length; i++) { total += wOf(roots[i]) * cw; }
    total += (roots.length - 1) * gap;
    var x0 = Math.max(50, (1000 - total) / 2);
    var pos = {};
    function place(k, x, depth) {
      var c = children[k] || [], cur = x, j, xs, mn, mx;
      if (!c.length) {
        pos[k] = { x: x + cw / 2, y: opt.top + depth * opt.dy };
        return x + cw;
      }
      for (j = 0; j < c.length; j++) { cur = place(c[j], cur, depth + 1); }
      xs = [];
      for (j = 0; j < c.length; j++) { xs.push(pos[c[j]].x); }
      mn = Math.min.apply(null, xs); mx = Math.max.apply(null, xs);
      pos[k] = { x: (mn + mx) / 2, y: opt.top + depth * opt.dy };
      return cur;
    }
    var cursor = x0;
    for (i = 0; i < roots.length; i++) {
      if (i) { cursor += gap; }
      cursor = place(roots[i], cursor, 0);
    }
    return { pos: pos, children: children, roots: roots };
  }

  /* ============================================================
     并查集（Disjoint Sets / Union-Find）
     ============================================================ */
  DSV.register({
    id: 'disjoint', name: '并查集（Union-Find）', category: '其他',
    desc: '并查集用一片森林维护若干不相交集合：parent[x] 指向父结点，根结点的 parent 指向自己，根就是集合的代表元。查找 find(x) 沿父指针一直走到根，并用「路径压缩」把沿途每个结点直接改挂到根下；合并 union(x, y) 采用「按秩合并」：比较两个根的 rank（树高上界），把矮树挂到高树下面，只有秩相等时才把新根的秩加 1。两项优化同时使用时的摊还复杂度为 O(α(n))，α 是反阿克曼函数，对任何实际规模都有 α(n) ≤ 4，可视为常数时间；单独使用按秩合并或路径压缩则为 O(log n)。',
    viewBox: '0 0 1000 640',
    code: [
      'makeSet(x):',
      '  parent[x] = x              // 自己是自己的父结点，即根',
      '  rank[x] = 0                // 秩（树高上界）初始化为 0',
      'find(x):',
      '  path = []; cur = x',
      '  while parent[cur] != cur:  // 沿父指针上行，直到根',
      '    path.push(cur)',
      '    cur = parent[cur]',
      '  root = cur                 // 找到集合代表元',
      '  for v in path:',
      '    parent[v] = root         // 路径压缩：直接挂到根下',
      '  return root',
      'union(x, y):',
      '  rx = find(x); ry = find(y)',
      '  if rx == ry: return        // 已在同一集合，无需合并',
      '  if rank[rx] < rank[ry]: parent[rx] = ry',
      '  else if rank[rx] > rank[ry]: parent[ry] = rx',
      '  else: parent[ry] = rx; rank[rx] = rank[rx] + 1'
    ],
    inputs: [
      { key: 'init', label: '初始元素', def: '1,2,3,4,5,6,7', hint: '逗号分隔，例如 1,2,3,4,5,6,7' }
    ],
    actions: [
      { key: 'build', label: '建集合', primary: true },
      { key: 'union', label: '合并 union', arg: { label: '两个元素', def: '1,2' } },
      { key: 'find', label: '查找 find', arg: { label: '元素', def: '3' } }
    ],
    samples: [
      { label: '示例：7 个元素逐个建集合', values: { init: '1,2,3,4,5,6,7' } },
      { label: '示例：长链 + 路径压缩（8 个元素）', values: { init: '1,2,3,4,5,6,7,8' } },
      { label: '示例：字母元素 a-f', values: { init: 'a,b,c,d,e,f' } }
    ],
    random: function () {
      var n = DSV.ri(6, 9), a = [], i;
      for (i = 1; i <= n; i++) { a.push(i); }
      return { init: DSV.shuffle(a).join(',') };
    },
    run: function (v, action, state) {
      var st = [];
      var ds = (state && state.parent && state.order)
        ? { parent: DSV.clone(state.parent), rank: DSV.clone(state.rank), order: state.order.slice() }
        : { parent: {}, rank: {}, order: [] };
      var key = (action && action.key) || 'build';

      /* ---------- 辅助 ---------- */
      function childrenMap() {
        var ch = {}, i;
        for (i = 0; i < ds.order.length; i++) { ch[ds.order[i]] = []; }
        for (i = 0; i < ds.order.length; i++) {
          var p = ds.parent[ds.order[i]];
          if (p !== ds.order[i] && ch[p]) { ch[p].push(ds.order[i]); }
        }
        return ch;
      }
      function heightOf(root) {
        var ch = childrenMap();
        function d(k) {
          var c = ch[k] || [], m = 0, i;
          if (!c.length) { return 1; }
          for (i = 0; i < c.length; i++) { m = Math.max(m, d(c[i])); }
          return 1 + m;
        }
        return d(root);
      }
      function setCount() {
        var c = 0, i;
        for (i = 0; i < ds.order.length; i++) { if (ds.parent[ds.order[i]] === ds.order[i]) { c++; } }
        return c;
      }
      function snapOf(o) {
        o = o || {};
        return {
          title: '并查集：按秩合并 + 路径压缩',
          sub: o.sub || '',
          info: o.info || '',
          phase: o.phase || '',
          nodes: ds.order.slice(),
          parent: DSV.clone(ds.parent),
          rank: DSV.clone(ds.rank),
          hl: DSV.clone(o.hl || {}),
          path: (o.path || []).slice(),
          sets: setCount()
        };
      }
      function P(code, desc, o) { push(st, code, desc, snapOf(o)); }
      function hlOf(list, cls) {
        var h = {}, i;
        for (i = 0; i < list.length; i++) { h[list[i]] = cls; }
        return h;
      }

      /* ---------- makeSet ---------- */
      function ensure(x) {
        if (ds.parent[x] !== undefined) { return; }
        ds.order.push(x);
        P([0], 'makeSet(' + x + ')：结构里还没有元素 ' + x + '，为它新建一个只含自身的集合',
          { phase: 'build', sub: 'makeSet(' + x + ')', info: '新建单元素集合 {' + x + '}' });
        ds.parent[x] = x;
        P([1], 'parent[' + x + '] = ' + x + '：自己指向自己，说明 ' + x + ' 是这棵树的根（集合代表元）',
          { phase: 'build', hl: hlOf([x], 'swap'), sub: 'makeSet(' + x + ')' });
        ds.rank[x] = 0;
        P([2], 'rank[' + x + '] = 0：单结点树的高度上界为 0',
          { phase: 'build', hl: hlOf([x], 'active'), sub: 'makeSet(' + x + ')' });
      }

      /* ---------- find（带路径压缩） ---------- */
      function doFind(x, tag) {
        var path = [], cur = x, guard = 0, root, i, h;
        tag = tag || '';
        P([3, 4], tag + 'find(' + x + ')：沿 parent 指针一路向上找根，同时用 path 记录经过的每个结点（压缩时要用到）',
          { phase: 'find', hl: hlOf([x], 'active'), path: [], sub: tag + 'find(' + x + ')', info: 'path = []' });
        while (ds.parent[cur] !== cur && guard++ < 300) {
          var p = ds.parent[cur];
          path.push(cur);
          h = hlOf(path, 'compare');
          h[p] = 'active';
          P([5, 6], tag + 'parent[' + cur + '] = ' + p + ' ≠ ' + cur + '，说明 ' + cur + ' 不是根：把它加入 path，指针上移到 ' + p,
            { phase: 'find', hl: h, path: path.slice(), sub: tag + 'find(' + x + ')', info: 'path = [' + path.join(', ') + ']' });
          cur = p;
        }
        root = cur;
        h = hlOf(path, 'compare');
        h[root] = 'active';
        P([5, 7], tag + 'parent[' + cur + '] = ' + cur + '，' + cur + ' 指向自己，它就是根（代表元 root）。' +
          (path.length ? '本次查找经历了 ' + path.length + ' 条边。' : '　' + x + ' 本身就是根，路径长度为 0。'),
          { phase: 'find', hl: h, path: path.slice(), sub: tag + 'find(' + x + ')', info: 'root = ' + root });

        var hBefore = heightOf(root), changed = 0;
        for (i = 0; i < path.length; i++) {
          var node = path[i];
          if (ds.parent[node] === root) { continue; }
          ds.parent[node] = root;
          changed++;
          h = hlOf(path, 'compare');
          h[node] = 'swap';
          h[root] = 'active';
          P([8, 9], tag + '路径压缩：parent[' + node + '] = ' + root + '，把 ' + node + ' 从原来的父结点上摘下来、直接挂到根 ' +
            root + ' 下面，它到根的距离变成 1',
            { phase: 'find', hl: h, path: path.slice(), sub: tag + '路径压缩', info: '压缩 ' + node + ' → ' + root });
        }
        h = {}; h[root] = 'active';
        if (changed) {
          var hAfter = heightOf(root);
          P([8, 9], tag + '压缩结束：本次把 ' + changed + ' 个结点直接挂到根上，这棵树的最大高度由 ' + hBefore +
            ' 降为 ' + hAfter + '。路径压缩用一点点本次的代价，换来了以后 find 这些结点的极大加速。',
            { phase: 'find', hl: h, path: [], sub: tag + '路径压缩效果', info: '树高 ' + hBefore + ' → ' + hAfter });
        } else {
          P([8, 9], tag + '路径上的结点（若有）已经直接挂在根下，本次无需压缩。',
            { phase: 'find', hl: h, path: [], sub: tag + '路径压缩', info: '无需压缩' });
        }
        P([10], tag + 'find(' + x + ') 返回代表元 ' + root + '：' + x + ' 属于以 ' + root + ' 为根的集合。',
          { phase: 'find', hl: h, path: [], sub: tag + 'find(' + x + ')', info: '返回 ' + root });
        return root;
      }

      /* ---------- union（按秩合并） ---------- */
      function doUnion(a, b) {
        var h = {}, ra, rb, old;
        h[a] = 'active'; h[b] = 'compare';
        P([11], 'union(' + a + ', ' + b + ')：先分别找出两个元素所在集合的根（各做一次带路径压缩的 find）',
          { phase: 'union', hl: h, sub: 'union(' + a + ', ' + b + ')' });
        ra = doFind(a, 'union① ');
        rb = doFind(b, 'union② ');
        if (ra === rb) {
          h = {}; h[ra] = 'active';
          P([13], '两个根相同（root = ' + ra + '），说明 ' + a + ' 与 ' + b + ' 已经在同一个集合里，直接返回，不做任何合并（并查集天然去重）',
            { phase: 'union', hl: h, sub: 'union(' + a + ', ' + b + ') 结束', info: '已在同一集合' });
          return;
        }
        h = {}; h[ra] = 'compare'; h[rb] = 'compare';
        P([14], '比较两个根的秩：rank[' + ra + '] = ' + ds.rank[ra] + '，rank[' + rb + '] = ' + ds.rank[rb] +
          '。按秩合并的原则是让「矮树挂到高树下」，这样树高不会白白增长。',
          { phase: 'union', hl: h, sub: '比较 rank', info: 'rank[' + ra + '] = ' + ds.rank[ra] + '，rank[' + rb + '] = ' + ds.rank[rb] });
        if (ds.rank[ra] < ds.rank[rb]) {
          ds.parent[ra] = rb;
          h = {}; h[ra] = 'swap'; h[rb] = 'active';
          P([14], 'rank[' + ra + '] < rank[' + rb + ']：把较矮的树 ' + ra + ' 挂到较高的树 ' + rb + ' 下面，两棵树的秩都不变（因为 ' + rb + ' 的高度没变）',
            { phase: 'union', hl: h, sub: '按秩合并', info: 'parent[' + ra + '] = ' + rb });
        } else if (ds.rank[ra] > ds.rank[rb]) {
          ds.parent[rb] = ra;
          h = {}; h[rb] = 'swap'; h[ra] = 'active';
          P([15], 'rank[' + ra + '] > rank[' + rb + ']：把较矮的树 ' + rb + ' 挂到较高的树 ' + ra + ' 下面，秩都不变',
            { phase: 'union', hl: h, sub: '按秩合并', info: 'parent[' + rb + '] = ' + ra });
        } else {
          old = ds.rank[ra];
          ds.parent[rb] = ra;
          ds.rank[ra] = old + 1;
          h = {}; h[rb] = 'swap'; h[ra] = 'active';
          P([16], '两者秩相等（都等于 ' + old + '）：任选一个方向 —— 把 ' + rb + ' 挂到 ' + ra + ' 下面，' +
            '此时树高确实增加了 1，所以把新根 ' + ra + ' 的秩加 1：rank[' + ra + '] = ' + (old + 1),
            { phase: 'union', hl: h, sub: '按秩合并（秩相等）', info: 'rank[' + ra + '] = ' + (old + 1) });
        }
        P([11], 'union(' + a + ', ' + b + ') 完成：两个集合合并成一个，当前共有 ' + setCount() + ' 个集合。' +
          '按秩合并保证任意树高不超过 O(log n)，再配合路径压缩，m 次操作的摊还代价为 O(m·α(n))。',
          { phase: 'union', sub: 'union(' + a + ', ' + b + ') 完成', info: '集合个数 = ' + setCount() });
      }

      /* ---------- 分派 ---------- */
      if (key === 'find') {
        var t = DSV.toks(action && action.arg);
        if (!t.length) {
          P([3], '请在「元素」输入框里填写要查找的元素，例如 3', { phase: 'find', info: '输入为空' });
          return { steps: st, state: DSV.clone(ds) };
        }
        ensure(t[0]);
        doFind(t[0], '');
      } else if (key === 'union') {
        var u = DSV.toks(action && action.arg);
        if (u.length < 2) {
          P([11], '请在「两个元素」输入框里填写要合并的两个元素，用逗号分隔，例如 1,2', { phase: 'union', info: '输入不足两个元素' });
          return { steps: st, state: DSV.clone(ds) };
        }
        ensure(u[0]);
        ensure(u[1]);
        doUnion(u[0], u[1]);
      } else {
        ds = { parent: {}, rank: {}, order: [] };
        var init = DSV.uniq(DSV.toks(v.init));
        if (!init.length) {
          P([0], '初始元素为空：请在「初始元素」输入框里填一些元素（逗号分隔），例如 1,2,3,4,5,6,7',
            { phase: 'build', info: '输入为空' });
          return { steps: st, state: DSV.clone(ds) };
        }
        P([0], '开始建集合：依次为 ' + init.join('、') + ' 调用 makeSet。初始时每个元素各自构成一个单元素集合，' +
          '共 ' + init.length + ' 个集合。',
          { phase: 'build', sub: 'makeSet 阶段', info: '共 ' + init.length + ' 个元素' });
        for (var i = 0; i < init.length; i++) { ensure(init[i]); }
        P([2], '建集合完成：' + ds.order.length + ' 个元素、' + setCount() + ' 个互不相交的集合，' +
          '每个元素的 parent 都指向自己、rank 都是 0。接下来可以用 union 合并、用 find 查找（会自动路径压缩）。',
          { phase: 'build', sub: 'makeSet 完成', info: '集合个数 = ' + setCount() });
      }
      return { steps: st, state: DSV.clone(ds) };
    },
    render: function (kr, s) {
      kr.html('__t', S.text(500, 26, s ? s.title : '并查集（Union-Find）', 'vt'));
      if (!s || !s.nodes || !s.nodes.length) {
        kr.html('__e', S.text(500, 300, '点击「建集合」按初始元素逐个 makeSet，再用 union / find 演示按秩合并与路径压缩', 'vs'));
        kr.end();
        return;
      }
      kr.html('__st', S.text(500, 48, '元素 ' + s.nodes.length + ' 个　·　集合 ' + s.sets + ' 个　·　' + s.sub, 'vs'));

      var lay = forestLayout(s.nodes, s.parent, { top: 104, dy: 74, cw: 54 });
      var ge = kr.g('__edges', 'translate(0,0)', 'k');
      var gn = kr.g('__nodes', 'translate(0,0)', 'k');
      var i, k, p, cls, inner, P;

      for (i = 0; i < s.nodes.length; i++) {
        k = s.nodes[i];
        p = s.parent[k];
        if (p === k || !lay.pos[p]) { continue; }
        cls = 'tree';
        if (s.hl[k] === 'swap') { cls = 'hl'; }
        else if (s.path.indexOf(k) >= 0) { cls = 'path'; }
        kr.html('e_' + k, S.line(lay.pos[p].x, lay.pos[p].y, lay.pos[k].x, lay.pos[k].y, 'edge ' + cls), ge);
      }
      for (i = 0; i < s.nodes.length; i++) {
        k = s.nodes[i];
        P = lay.pos[k];
        if (!P) { continue; }
        inner = S.circle(0, 0, 22) + S.text(0, 0, k);
        if (s.parent[k] === k) { inner += S.text(0, -38, '根', 'ptr'); }
        inner += S.rect(-26, 32, 52, 16, 'cell') + S.text(0, 40, 'rank ' + s.rank[k], 'idx-txt');
        kr.g('n_' + k, 'translate(' + P.x + ',' + P.y + ')', 'k nd ' + (s.hl[k] || ''), inner, gn);
      }

      var prow = [], rrow = [];
      for (i = 0; i < s.nodes.length; i++) {
        k = s.nodes[i];
        prow.push({ v: s.parent[k], m: k, cls: s.hl[k] || '' });
        rrow.push({ v: s.rank[k], m: k, cls: (s.hl[k] === 'compare' || s.hl[k] === 'swap' || s.hl[k] === 'active') ? s.hl[k] : '' });
      }
      drawRow(kr, '__par', 'parent 数组（格子内是父结点，格子下方是元素；parent[x] = x 表示 x 是根）', prow, 470, { cw: 48 });
      drawRow(kr, '__rk', 'rank 数组（树高上界；按秩合并时只有根结点的 rank 有意义）', rrow, 566, { cw: 48 });
      if (s.info) { kr.html('__info', S.text(500, 614, s.info, 'vs')); }
      kr.end();
    }
  });

  /* ============================================================
     线段树（区间查询 / 点更新）
     ============================================================ */
  DSV.register({
    id: 'oth-segtree', name: '线段树（区间查询/更新）', category: '其他',
    desc: '把数组 a[0..n-1] 组织成一棵完全二叉树：每个结点代表一个区间 [lo,hi]，叶子存 a[i]，内部结点存区间和。建树 O(n)；区间查询时把目标区间拆成 O(log n) 个结点的并；点更新时沿根到叶子改一条链、沿途向上修正。单次查询/更新都是 O(log n)。',
    viewBox: '0 0 1000 700',
    code: [
      'build(lo, hi):',
      '  if lo == hi: 结点值 = a[lo]（叶子）',
      '  else:',
      '    mid = (lo+hi)/2',
      '    左孩子 = build(lo, mid)；右孩子 = build(mid+1, hi)',
      '    结点值 = 左孩子值 + 右孩子值',
      'query(lo, hi, l, r):',
      '  if [lo,hi] ⊆ [l,r]: 返回结点值',
      '  if 无交集: 返回 0',
      '  return query(左) + query(右)'
    ],
    inputs: [
      { key: 'vals', label: '数组 a', def: '1,3,5,7,9,11', hint: '逗号分隔，例如 1,3,5,7,9,11（最多 12 个）' }
    ],
    actions: [
      { key: 'build', label: '建树', primary: true },
      { key: 'query', label: '区间查询', arg: { label: '[l, r]', def: '2,5' } },
      { key: 'update', label: '点更新', arg: { label: '位置, 新值', def: '3,10' } }
    ],
    samples: [
      { label: '示例：6 元素', values: { vals: '1,3,5,7,9,11' } },
      { label: '示例：8 元素', values: { vals: '2,4,6,8,10,12,14,16' } },
      { label: '示例：奇数个', values: { vals: '5,2,7,1,9' } }
    ],
    random: function () {
      var n = DSV.ri(5, 9);
      return { vals: DSV.randArr(n, 1, 20).join(',') };
    },
    run: function (v, action, state) {
      var st = [];
      var key = (action && action.key) || 'build';
      var a = DSV.nums(v.vals, 12);
      if (a.length < 1) { a = [1, 3, 5, 7, 9, 11]; }

      /* ---------- 建树（每次都按当前输入重建） ---------- */
      var seq = 0;
      function buildNode(lo, hi) {
        var node = { id: 'sg' + (seq++), lo: lo, hi: hi, v: 0, left: null, right: null, hl: '' };
        if (lo === hi) {
          node.v = a[lo];
          push(st, [1], '建叶子结点 [' + lo + ',' + hi + ']：直接存 a[' + lo + '] = ' + a[lo],
            snapIt(node, '建树：叶子'));
          return node;
        }
        var mid = Math.floor((lo + hi) / 2);
        node.left = buildNode(lo, mid);
        node.right = buildNode(mid + 1, hi);
        node.v = node.left.v + node.right.v;
        push(st, [2, 3, 4, 5], '建内部结点 [' + lo + ',' + hi + ']：区间和 = 左孩子 [' + lo + ',' + mid + '] 的 ' +
          node.left.v + ' + 右孩子 [' + (mid + 1) + ',' + hi + '] 的 ' + node.right.v + ' = ' + node.v,
          snapIt(node, '建树：合并'));
        return node;
      }
      function snapIt(active, info) {
        return {
          title: '线段树（区间和）',
          sub: info || '',
          root: DSV.clone(state.root),
          activeId: active ? active.id : '',
          info: info || ''
        };
      }

      /* ---------- 分派 ---------- */
      if (key === 'build') {
        state = { a: a.slice(), root: null };
        push(st, [0], '开始建树：数组 a = [' + a.join(', ') + ']，共 ' + a.length + ' 个元素。' +
          '每个叶子对应一个数组位置，内部结点 = 左右孩子之和', snapIt(null, '建树开始'));
        state.root = buildNode(0, a.length - 1);
        push(st, [0], '建树完成：根结点 [' + state.root.lo + ',' + state.root.hi + '] 的值 = ' +
          state.root.v + '（= 整个数组的和）。时间 O(n)。接下来可「区间查询」或「点更新」',
          snapIt(state.root, '建树完成'));
        return { steps: st, state: DSV.clone(state) };
      }

      if (!state || !state.root) {
        push(st, [0], '还没有树：请先点「建树」', snapIt(null, '请先建树'));
        return { steps: st, state: state || null };
      }
      state = { a: DSV.clone(state.a), root: DSV.clone(state.root) };

      /* ---------- 区间查询 ---------- */
      if (key === 'query') {
        var lr = DSV.nums(action && action.arg, 2);
        if (lr.length < 2) {
          push(st, [6], '请在参数框里填查询区间 [l, r]，例如 2,5', snapIt(null, '参数不足'));
          return { steps: st, state: state };
        }
        var L = lr[0], R = lr[1];
        var ans = 0;
        push(st, [6], '开始区间查询 [l,r] = [' + L + ',' + R + ']：从根出发，把目标区间拆成若干个完整覆盖的结点',
          snapIt(null, '查询 [' + L + ',' + R + ']'));
        (function qry(node) {
          if (!node) { return; }
          node.hl = '';
          if (node.hi < L || node.lo > R) {
            node.hl = 'dead';
            push(st, [8], '结点 [' + node.lo + ',' + node.hi + '] 与查询区间 [' + L + ',' + R + '] 完全不相交，贡献 0，跳过',
              snapIt(node, '无交集'));
            return;
          }
          if (node.lo >= L && node.hi <= R) {
            ans += node.v;
            node.hl = 'done';
            push(st, [7], '结点 [' + node.lo + ',' + node.hi + '] 被查询区间 [' + L + ',' + R + '] 完整包含：直接取它的值 ' +
              node.v + '，当前累加和 = ' + ans, snapIt(node, '完整覆盖：+' + node.v));
            return;
          }
          node.hl = 'active';
          push(st, [9], '结点 [' + node.lo + ',' + node.hi + '] 与查询区间 [' + L + ',' + R + '] 部分相交：不能直接取，继续下钻左右孩子',
            snapIt(node, '部分相交，继续下钻'));
          qry(node.left);
          qry(node.right);
        })(state.root);
        push(st, [9], '查询完成：区间和 [' + L + ',' + R + '] = ' + ans +
          '。共访问 O(log n) 个结点，查询时间 O(log n)', snapIt(null, '查询结果 = ' + ans));
        return { steps: st, state: state };
      }

      /* ---------- 点更新 ---------- */
      var uv = DSV.nums(action && action.arg, 2);
      if (uv.length < 2) {
        push(st, [1], '请在参数框里填「位置, 新值」，例如 3,10', snapIt(null, '参数不足'));
        return { steps: st, state: state };
      }
      var pos = uv[0], newVal = uv[1];
      push(st, [1], '点更新：把 a[' + pos + '] 改为 ' + newVal + '。从根出发找到对应叶子',
        snapIt(null, '更新 a[' + pos + '] = ' + newVal));
      (function upd(node) {
        if (!node) { return; }
        if (node.lo === node.hi) {
          var old = node.v;
          node.v = newVal;
          state.a[pos] = newVal;
          push(st, [1], '到达叶子 [' + node.lo + ',' + node.hi + ']：值由 ' + old + ' 改为 ' + newVal,
            snapIt(node, '叶子更新：' + old + ' → ' + newVal));
          return;
        }
        node.hl = 'active';
        var mid = Math.floor((node.lo + node.hi) / 2);
        push(st, [2], '结点 [' + node.lo + ',' + node.hi + '] 区间包含位置 ' + pos + '，继续下钻（mid=' + mid + '）',
          snapIt(node, '路径上：[' + node.lo + ',' + node.hi + ']'));
        if (pos <= mid) { upd(node.left); } else { upd(node.right); }
        var old2 = node.v;
        node.v = node.left.v + node.right.v;
        node.hl = 'swap';
        push(st, [5], '回到结点 [' + node.lo + ',' + node.hi + ']：和由 ' + old2 + ' 修正为 左' +
          node.left.v + ' + 右' + node.right.v + ' = ' + node.v, snapIt(node, '向上修正：' + old2 + ' → ' + node.v));
      })(state.root);
      push(st, [5], '更新完成：叶子修改后，沿途 O(log n) 个祖先结点的和都已修正', snapIt(state.root, '更新完成'));
      return { steps: st, state: state };
    },
    render: function (kr, s) {
      kr.html('__t', S.text(500, 26, s ? s.title : '线段树（区间查询/更新）', 'vt'));
      if (!s || !s.root) {
        kr.html('__e', S.text(500, 300, '点击「建树」按数组 a 建立线段树，再做区间查询 / 点更新', 'vs'));
        kr.end();
        return;
      }
      kr.html('__st', S.text(500, 48, s.sub + '　·　结点圆圈内=区间和，下方=区间范围', 'vs'));
      DSV.drawTree(kr, s.root, {
        top: 90, dy: 92, node: function (n) {
          return {
            inner: S.circle(0, 0, 20) + S.text(0, 0, n.v) + S.text(0, 15, '[' + n.lo + ',' + n.hi + ']', 'tag'),
            cls: n.hl || ''
          };
        }
      });
      if (s.info) { kr.html('__info', S.text(500, 660, s.info, 'vs')); }
      kr.end();
    }
  });

  /* ============================================================
     树状数组（Fenwick / BIT）
     ============================================================ */
  DSV.register({
    id: 'oth-fenwick', name: '树状数组（Fenwick）', category: '其他',
    desc: '用长度 n+1 的数组 tree[] 维护前缀和：位置 i 管辖的长度为 lowbit(i)=i&(-i) 个元素。前缀和查询沿 i -= lowbit(i) 上跳累加；点更新沿 i += lowbit(i) 一路更新。两个操作都只跳 O(log n) 步，空间 O(n)。',
    viewBox: '0 0 1000 600',
    code: [
      'lowbit(i) = i & (-i)',
      'prefixSum(k):',
      '  s = 0; i = k',
      '  while i > 0:',
      '    s += tree[i]; i -= lowbit(i)',
      '  return s',
      'add(pos, delta):',
      '  i = pos',
      '  while i <= n:',
      '    tree[i] += delta; i += lowbit(i)'
    ],
    inputs: [
      { key: 'vals', label: '数组 a', def: '1,7,3,9,4,2,8,5', hint: '逗号分隔，例如 1,7,3,9,4,2,8,5（最多 12 个）' }
    ],
    actions: [
      { key: 'build', label: '建树', primary: true },
      { key: 'query', label: '前缀和查询', arg: { label: 'k', def: '5' } },
      { key: 'update', label: '点更新', arg: { label: '位置, 增量', def: '3,4' } }
    ],
    samples: [
      { label: '示例：8 元素', values: { vals: '1,7,3,9,4,2,8,5' } },
      { label: '示例：6 元素', values: { vals: '2,4,6,8,10,12' } },
      { label: '示例：5 元素', values: { vals: '5,2,7,1,9' } }
    ],
    random: function () {
      var n = DSV.ri(6, 10);
      return { vals: DSV.randArr(n, 1, 15).join(',') };
    },
    run: function (v, action, state) {
      var st = [];
      var key = (action && action.key) || 'build';
      var a = DSV.nums(v.vals, 12);
      if (a.length < 1) { a = [1, 7, 3, 9, 4, 2, 8, 5]; }
      var n = a.length;
      function lowbit(i) { return i & (-i); }
      function snapIt(path, info, warn) {
        var cells = [];
        for (var i = 1; i <= state.n; i++) {
          cells.push({ v: String(state.tree[i]), m: String(i), cls: path.indexOf(i) >= 0 ? path[path.length - 1] === i ? 'active' : 'compare' : '' });
        }
        return {
          title: '树状数组 Fenwick（前缀和）',
          sub: info || '', warn: warn || '',
          n: state.n, tree: state.tree.slice(), path: path.slice(),
          a: state.a.slice(), cells: cells
        };
      }

      /* ---------- 建树 ---------- */
      if (key === 'build') {
        state = { n: n, a: a.slice(), tree: [] };
        for (var i = 0; i <= n; i++) { state.tree.push(0); }
        push(st, [0], '开始建树：数组 a = [' + a.join(', ') + ']，共 ' + n + ' 个元素。先把 tree[1..' + n + '] 全部置 0',
          snapIt([], '初始化 tree 全 0'));
        for (i = 1; i <= n; i++) { state.tree[i] = state.a[i - 1]; }
        push(st, [7], '先把 tree[i] 初始化为 a[i-1]（第 i 个元素）', snapIt([], 'tree[i] = a[i-1]'));
        for (i = 1; i <= n; i++) {
          var j = i + lowbit(i);
          if (j <= n) {
            state.tree[j] += state.tree[i];
            push(st, [7, 8], 'i = ' + i + '：lowbit(' + i + ') = ' + lowbit(i) +
              '，于是 tree[' + i + '] += 兄弟链上的下一格 tree[' + j + ']，tree[' + j + '] = ' + state.tree[j],
              snapIt([i, j], '线性建树：传播到 tree[' + j + ']'));
          }
        }
        push(st, [8], '建树完成。tree[i] 管辖的区间长度 = lowbit(i)。查询与更新都沿 lowbit 跳跃，O(log n)',
          snapIt([], '建树完成'));
        return { steps: st, state: DSV.clone(state) };
      }

      if (!state || !state.tree) {
        push(st, [0], '还没有树：请先点「建树」', snapIt([], '请先建树'));
        return { steps: st, state: state || null };
      }
      state = { n: state.n, a: state.a.slice(), tree: state.tree.slice() };

      /* ---------- 前缀和查询 ---------- */
      if (key === 'query') {
        var k = Number((action && action.arg) || '');
        if (!isFinite(k) || k < 1) {
          push(st, [2], '请在参数框里填要查询的前缀长度 k（1~' + state.n + '）', snapIt([], '参数不足'));
          return { steps: st, state: state };
        }
        k = Math.min(k, state.n);
        var s = 0;
        push(st, [2, 3], '求前缀和 a[1..' + k + ']：从 i = ' + k + ' 出发，沿 i -= lowbit(i) 跳跃累加',
          snapIt([], '前缀和查询 k=' + k));
        var i2 = k;
        while (i2 > 0) {
          s += state.tree[i2];
          push(st, [4, 5], 'i = ' + i2 + '：累加 tree[' + i2 + '] = ' + state.tree[i2] +
            '，当前和 = ' + s + '；再 i -= lowbit(' + i2 + ') = -' + lowbit(i2) + '，跳到 ' + (i2 - lowbit(i2)),
            snapIt([i2], 'i -= lowbit(' + i2 + ')'));
          i2 -= lowbit(i2);
        }
        push(st, [5], 'i 跳到 0，累加结束：a[1..' + k + '] 的前缀和 = ' + s + '。共跳 ' +
          k.toString(2).length + ' 步，O(log n)', snapIt([], '前缀和 = ' + s));
        return { steps: st, state: state };
      }

      /* ---------- 点更新 ---------- */
      var uv = DSV.nums(action && action.arg, 2);
      if (uv.length < 2) {
        push(st, [6], '请在参数框里填「位置, 增量」，例如 3,4', snapIt([], '参数不足'));
        return { steps: st, state: state };
      }
      var pos = uv[0], delta = uv[1];
      if (pos < 1 || pos > state.n) {
        push(st, [6], '位置 ' + pos + ' 超出范围 1~' + state.n, snapIt([], '位置越界'));
        return { steps: st, state: state };
      }
      state.a[pos - 1] += delta;
      push(st, [6, 7], '点更新：a[' + pos + '] += ' + delta + '。从 i = ' + pos +
        ' 出发，沿 i += lowbit(i) 把增量传递到所有管辖它的格子', snapIt([], 'add(' + pos + ', ' + delta + ')'));
      var i3 = pos;
      while (i3 <= state.n) {
        state.tree[i3] += delta;
        push(st, [8, 9], 'i = ' + i3 + '：tree[' + i3 + '] += ' + delta + '，变为 ' + state.tree[i3] +
          '；再 i += lowbit(' + i3 + ') = +' + lowbit(i3) + '，跳到 ' + (i3 + lowbit(i3)),
          snapIt([i3], 'tree[' + i3 + '] += ' + delta));
        i3 += lowbit(i3);
      }
      push(st, [9], '更新结束：所有包含位置 ' + pos + ' 的 tree 格子都已加上 ' + delta + '。共 O(log n) 步',
        snapIt([], '更新完成'));
      return { steps: st, state: state };
    },
    render: function (kr, s) {
      kr.html('__t', S.text(500, 26, s ? s.title : '树状数组（Fenwick）', 'vt'));
      if (!s || !s.tree) {
        kr.html('__e', S.text(500, 300, '点击「建树」按数组 a 建立树状数组，再做前缀和查询 / 点更新', 'vs'));
        kr.end();
        return;
      }
      kr.html('__st', S.text(500, 48, s.sub + '　·　格子内=tree[i]，下方=下标 i', 'vs'));
      drawRow(kr, '__tr', 'tree 数组（1 下标）', s.cells, 220, { cw: 52 });
      var ac = [];
      for (var i = 0; i < s.n; i++) { ac.push({ v: String(s.a[i]), m: String(i + 1), cls: '' }); }
      drawRow(kr, '__aa', '原始数组 a', ac, 360, { cw: 52 });
      kr.html('__note', S.text(500, 470, '蓝色格 = 当前 lowbit 跳跃路径（查询 i -= lowbit(i)；更新 i += lowbit(i)）', 'vs'));
      kr.end();
    }
  });

  /* ============================================================
     稀疏表 RMQ（区间最小值查询，O(1)）
     ============================================================ */
  DSV.register({
    id: 'oth-sparse-table', name: '稀疏表 RMQ', category: '其他',
    desc: '预处理：st[k][i] = 区间 a[i .. i+2ᵏ-1] 的最小值，用 st[k][i] = min(st[k-1][i], st[k-1][i+2ᵏ⁻¹]) 自底向上建表。查询 [l,r] 时取 k=floor(log2(长度))，用两个重叠块 min(st[k][l], st[k][r-2ᵏ+1]) 覆盖整个区间。建表 O(n log n)，查询 O(1)，空间 O(n log n)。',
    viewBox: '0 0 1000 700',
    code: [
      'build:',
      '  st[0][i] = a[i]',
      '  for k=1..floor(log n):',
      '    st[k][i] = min(st[k-1][i], st[k-1][i + 2^(k-1)])',
      'query(l, r):',
      '  k = floor(log2(r-l+1))',
      '  return min(st[k][l], st[k][r - 2^k + 1])'
    ],
    inputs: [
      { key: 'vals', label: '数组 a', def: '5,3,8,1,9,2,7,4', hint: '逗号分隔，例如 5,3,8,1,9,2,7,4（最多 10 个）' }
    ],
    actions: [
      { key: 'build', label: '建表', primary: true },
      { key: 'query', label: '区间查询 [l,r]', arg: { label: '[l, r]', def: '2,6' } }
    ],
    samples: [
      { label: '示例：8 元素', values: { vals: '5,3,8,1,9,2,7,4' } },
      { label: '示例：6 元素', values: { vals: '4,9,2,6,1,5' } },
      { label: '示例：5 元素', values: { vals: '10,3,6,2,8' } }
    ],
    random: function () {
      var n = DSV.ri(6, 10);
      return { vals: DSV.randArr(n, 1, 20).join(',') };
    },
    run: function (v, action, state) {
      var st = [];
      var key = (action && action.key) || 'build';
      var a = DSV.nums(v.vals, 10);
      if (a.length < 2) { a = [5, 3, 8, 1, 9, 2, 7, 4]; }
      function snapIt(hlCells, sub, ans) {
        var rows = [];
        for (var k = 0; k < state.rows.length; k++) {
          rows.push(state.rows[k].slice());
        }
        return {
          title: '稀疏表 RMQ（区间最小值）',
          sub: sub || '', warn: '',
          n: state.n, K: state.K, rows: rows,
          hl: hlCells || [], ans: ans == null ? '' : String(ans)
        };
      }

      /* ---------- 建表 ---------- */
      if (key === 'build') {
        state = { n: a.length, rows: [a.slice()] };
        state.K = Math.floor(Math.log(state.n) / Math.LN2);
        push(st, [1], '第 0 行（k=0）：长度 2⁰=1 的区间，st[0][i] = a[i] = [' + a.join(', ') + ']',
          snapIt([], '初始化第 0 行'));
        for (var k = 1; k <= state.K; k++) {
          var row = [], half = 1 << (k - 1), len = 1 << k;
          for (var i = 0; i + len <= state.n; i++) {
            row.push(Math.min(state.rows[k - 1][i], state.rows[k - 1][i + half]));
          }
          state.rows.push(row);
          push(st, [2, 3], '第 ' + k + ' 行（k=' + k + '）：区间长度 2^' + k + '=' + len +
            '，st[' + k + '][i] = min(st[' + (k - 1) + '][i], st[' + (k - 1) + '][i+' + half + ']) = [' +
            row.join(', ') + ']', snapIt([], '建第 ' + k + ' 行'));
        }
        push(st, [3], '建表完成：共 ' + (state.K + 1) + ' 行（k=0..' + state.K + '）。建表代价 O(n log n)。' +
          '之后任意区间查询都只需 O(1)', snapIt([], '建表完成'));
        return { steps: st, state: DSV.clone(state) };
      }

      if (!state || !state.rows) {
        push(st, [1], '还没有表：请先点「建表」', snapIt([], '请先建表'));
        return { steps: st, state: state || null };
      }
      state = { n: state.n, K: state.K, rows: state.rows.map(function (r) { return r.slice(); }) };

      /* ---------- 查询 ---------- */
      var lr = DSV.nums(action && action.arg, 2);
      if (lr.length < 2) {
        push(st, [5], '请在参数框里填查询区间 [l, r]，例如 2,6（0 下标）', snapIt([], '参数不足'));
        return { steps: st, state: state };
      }
      var L = lr[0], R = lr[1];
      if (L < 0) { L = 0; }
      if (R > state.n - 1) { R = state.n - 1; }
      if (L > R) { var tt = L; L = R; R = tt; }
      var len = R - L + 1;
      var k2 = Math.floor(Math.log(len) / Math.LN2);
      var block1 = state.rows[k2][L];
      var start2 = R - (1 << k2) + 1;
      var block2 = state.rows[k2][start2];
      var ans = Math.min(block1, block2);
      var hl = [];
      for (var c = L; c <= L + (1 << k2) - 1; c++) { hl.push([k2, c]); }
      push(st, [5], '查询区间 [l,r] = [' + L + ',' + R + ']，长度 = ' + len + '。k = floor(log2(' + len + ')) = ' + k2 +
        '，2^k = ' + (1 << k2), snapIt([], '计算 k = ' + k2));
      push(st, [6], '第一块：st[' + k2 + '][' + L + '] 覆盖 [' + L + ',' + (L + (1 << k2) - 1) + ']，最小值 = ' + block1,
        snapIt(hl, '第一块覆盖 [' + L + ',' + (L + (1 << k2) - 1) + '] = ' + block1));
      var hl2 = [];
      for (var c2 = start2; c2 <= start2 + (1 << k2) - 1; c2++) { hl2.push([k2, c2]); }
      push(st, [6], '第二块：st[' + k2 + '][' + start2 + '] 覆盖 [' + start2 + ',' + R + ']，最小值 = ' + block2 +
        '。两块首尾重叠但合起来正好覆盖 [' + L + ',' + R + ']，重叠不影响最小值',
        snapIt(hl.concat(hl2), '两块合并'));
      push(st, [6], '查询完成：min = (' + block1 + ', ' + block2 + ') = ' + ans +
        '。整个查询只查两行两格，O(1)', snapIt(hl.concat(hl2), '区间最小值 = ' + ans, ans));
      return { steps: st, state: state };
    },
    render: function (kr, s) {
      kr.html('__t', S.text(500, 26, s ? s.title : '稀疏表 RMQ', 'vt'));
      if (!s || !s.rows) {
        kr.html('__e', S.text(500, 300, '点击「建表」按数组 a 建立稀疏表，再做区间最小值查询', 'vs'));
        kr.end();
        return;
      }
      kr.html('__st', S.text(500, 48, s.sub + (s.ans !== '' ? '　·　答案 = ' + s.ans : ''), 'vs'));
      var cw = 64, ch = 36, x0 = 500 - (s.n * cw) / 2, y0 = 110, i, j;
      kr.html('__rl', S.textL(30, y0 + ch / 2, 'k 行', 'vs'));
      for (j = 0; j < s.n; j++) {
        kr.g('hc' + j, 'translate(' + (x0 + j * cw + cw / 2) + ',' + (y0 - 14) + ')', 'k',
          S.text(0, 0, 'i=' + j, 'vs'));
      }
      for (i = 0; i < s.rows.length; i++) {
        kr.g('rk' + i, 'translate(' + (x0 - 24) + ',' + (y0 + i * ch + ch / 2) + ')', 'k',
          S.text(0, 0, 'k=' + i + ' (2^' + i + ')', 'vs'));
        for (j = 0; j < s.rows[i].length; j++) {
          var on = false;
          for (var t = 0; t < s.hl.length; t++) { if (s.hl[t][0] === i && s.hl[t][1] === j) { on = true; break; } }
          kr.g('c' + i + '_' + j, 'translate(' + (x0 + j * cw + cw / 2) + ',' + (y0 + i * ch + ch / 2) + ')', 'k',
            '<rect class="cell ' + (on ? 'compare' : '') + '" x="' + (-cw / 2 + 3) + '" y="' + (-ch / 2 + 2) +
            '" width="' + (cw - 6) + '" height="' + (ch - 4) + '" rx="4"/>' +
            S.text(0, 0, s.rows[i][j], 'cell-txt'));
        }
      }
      kr.end();
    }
  });

  /* ============================================================
     布隆过滤器（Bloom Filter）
     ============================================================ */
  DSV.register({
    id: 'oth-bloom', name: '布隆过滤器', category: '其他',
    desc: '用 m 位的位数组 + k 个哈希函数表示集合：插入 x 时把 k(x) 个位置置 1；查询 y 时若 k(y) 位不全为 1 则「一定不在」，全为 1 则「可能在」——有一定概率误报（假阳性），但绝不会漏报。插入 O(k)，查询 O(k)，空间 O(m)。',
    viewBox: '0 0 1000 600',
    code: [
      'BloomFilter(m):',
      '  bits[0..m-1] = 0',
      'insert(x):',
      '  for h in {h1,h2,h3}: bits[h(x)] = 1',
      'query(x):',
      '  for h in {h1,h2,h3}:',
      '    if bits[h(x)] == 0: return 一定不在',
      '  return 可能在（有误报概率）'
    ],
    inputs: [
      { key: 'm', label: '位数组长度 m', def: '11', hint: '整数，例如 11' },
      { key: 'words', label: '建过滤器时自动插入的元素（逗号分隔）', def: 'apple,banana,cat', hint: '留空则只建空过滤器' }
    ],
    actions: [
      { key: 'build', label: '初始化空过滤器', primary: true },
      { key: 'insert', label: '插入元素', arg: { label: '元素', def: 'apple' } },
      { key: 'query', label: '查询元素', arg: { label: '元素', def: 'banana' } }
    ],
    samples: [
      { label: '示例：m=11', values: { m: '11' } },
      { label: '示例：m=7', values: { m: '7' } },
      { label: '示例：m=15', values: { m: '15' } }
    ],
    random: function () {
      return { m: String(DSV.ri(7, 15)) };
    },
    run: function (v, action, state) {
      var st = [];
      var key = (action && action.key) || 'build';
      var m = Math.floor(Number(v.m));
      if (!isFinite(m) || m < 3) { m = 11; }
      m = Math.min(m, 16);
      /* 三个固定哈希函数（便于手算演示） */
      function hsum(w) { var s = 0; for (var k = 0; k < w.length; k++) { s += w.charCodeAt(k); } return s; }
      function h1(w) { return hsum(w) % m; }
      function h2(w) { return (hsum(w) + 17 * w.length) % m; }
      function h3(w) { return (hsum(w) * 13 + w.length * w.length) % m; }
      function snapIt(hl, sub, warn) {
        var cells = [];
        for (var i = 0; i < state.m; i++) {
          cells.push({ v: state.bits[i] ? '1' : '0', m: String(i), cls: hl.indexOf(i) >= 0 ? (hl[hl.length - 1] === i ? 'active' : 'compare') : (state.bits[i] ? 'done' : '') });
        }
        return {
          title: '布隆过滤器（m = ' + state.m + ' 位，3 个哈希函数）',
          sub: sub || '', warn: warn || '',
          m: state.m, bits: state.bits.slice(), cells: cells,
          list: state.list.slice()
        };
      }

      /* ---------- 初始化（顺带自动插入默认演示元素） ---------- */
      if (key === 'build') {
        state = { m: m, bits: [], list: [] };
        for (var i = 0; i < m; i++) { state.bits.push(0); }
        push(st, [0, 1], '初始化：位数组 bits[0..' + (m - 1) + '] 全部清零。三个哈希函数（手算演示版）：' +
          'h1(x)=Σcode mod m，h2(x)=(Σcode+17·len) mod m，h3(x)=(Σcode·13+len²) mod m',
          snapIt([], '空过滤器就绪'));
        /* 自动插入演示元素 */
        var ws = String(v.words || '').split(/[,，;；\s]+/).filter(Boolean).slice(0, 4);
        for (var wi = 0; wi < ws.length; wi++) {
          var wx = ws[wi];
          var wp1 = h1(wx), wp2 = h2(wx), wp3 = h3(wx);
          push(st, [2], '自动插入 "' + wx + '"：三个哈希位置 h1=' + wp1 + '，h2=' + wp2 + '，h3=' + wp3,
            snapIt([], '自动插入 "' + wx + '"'));
          state.bits[wp1] = 1;
          push(st, [3], 'h1("' + wx + '") = ' + wp1 + '：把 bits[' + wp1 + '] 置 1', snapIt([wp1], '置位 bits[' + wp1 + ']'));
          state.bits[wp2] = 1;
          push(st, [3], 'h2("' + wx + '") = ' + wp2 + '：把 bits[' + wp2 + '] 置 1', snapIt([wp1, wp2], '置位 bits[' + wp2 + ']'));
          state.bits[wp3] = 1;
          push(st, [3], 'h3("' + wx + '") = ' + wp3 + '：把 bits[' + wp3 + '] 置 1。"' + wx + '" 插入完成',
            snapIt([wp1, wp2, wp3], '"' + wx + '" 插入完成'));
          if (state.list.indexOf(wx) < 0) { state.list.push(wx); }
        }
        return { steps: st, state: DSV.clone(state) };
      }

      if (!state || !state.bits) {
        push(st, [0], '还没有初始化：请先点「初始化空过滤器」', snapIt([], '请先初始化'));
        return { steps: st, state: state || null };
      }
      state = { m: state.m, bits: state.bits.slice(), list: state.list.slice() };

      /* ---------- 插入 ---------- */
      if (key === 'insert') {
        var x = String((action && action.arg) || '').trim();
        if (!x) {
          push(st, [2], '请在参数框里填要插入的元素，例如 apple', snapIt([], '元素为空'));
          return { steps: st, state: state };
        }
        var p1 = h1(x), p2 = h2(x), p3 = h3(x);
        push(st, [2], '插入元素 "' + x + '"：分别计算三个哈希位置 h1=' + p1 + '，h2=' + p2 + '，h3=' + p3,
          snapIt([], '插入 "' + x + '"'));
        state.bits[p1] = 1;
        push(st, [3], 'h1("' + x + '") = ' + p1 + '：把 bits[' + p1 + '] 置 1', snapIt([p1], '置位 bits[' + p1 + ']'));
        state.bits[p2] = 1;
        push(st, [3], 'h2("' + x + '") = ' + p2 + '：把 bits[' + p2 + '] 置 1', snapIt([p1, p2], '置位 bits[' + p2 + ']'));
        state.bits[p3] = 1;
        push(st, [3], 'h3("' + x + '") = ' + p3 + '：把 bits[' + p3 + '] 置 1。插入完成（不存储元素本身）',
          snapIt([p1, p2, p3], '"' + x + '" 插入完成'));
        if (state.list.indexOf(x) < 0) { state.list.push(x); }
        return { steps: st, state: state };
      }

      /* ---------- 查询 ---------- */
      var y = String((action && action.arg) || '').trim();
      if (!y) {
        push(st, [5], '请在参数框里填要查询的元素，例如 banana', snapIt([], '元素为空'));
        return { steps: st, state: state };
      }
      var q1 = h1(y), q2 = h2(y), q3 = h3(y);
      push(st, [5], '查询元素 "' + y + '"：三个哈希位置分别是 h1=' + q1 + '，h2=' + q2 + '，h3=' + q3,
        snapIt([], '查询 "' + y + '"'));
      if (!state.bits[q1]) {
        push(st, [6, 7], 'bits[' + q1 + '] = 0：只要有一个哈希位是 0，元素一定不在集合中（绝无误判）',
          snapIt([q1], '"' + y + '" 一定不在'));
      } else if (!state.bits[q2]) {
        push(st, [6, 7], 'bits[' + q1 + '] = 1 但 bits[' + q2 + '] = 0：元素一定不在集合中',
          snapIt([q1, q2], '"' + y + '" 一定不在'));
      } else if (!state.bits[q3]) {
        push(st, [6, 7], 'bits[' + q1 + ']、bits[' + q2 + '] 都是 1，但 bits[' + q3 + '] = 0：元素一定不在集合中',
          snapIt([q1, q2, q3], '"' + y + '" 一定不在'));
      } else if (state.list.indexOf(y) >= 0) {
        push(st, [7], '三个位 bits[' + q1 + ']、bits[' + q2 + ']、bits[' + q3 + '] 全为 1，而且 "' + y + '" 确实是插入过的元素：在集合中',
          snapIt([q1, q2, q3], '"' + y + '" 在集合中'));
      } else {
        var s2 = snapIt([q1, q2, q3], '"' + y + '" 未插入过但查询通过');
        s2.warn = '误报（假阳性）！"' + y + '" 从未插入，却因为三个位恰好被别的元素置 1，被判为「可能在」';
        push(st, [7], '三个位 bits[' + q1 + ']、bits[' + q2 + ']、bits[' + q3 + '] 全为 1，但 "' + y +
          '" 从未插入过——这就是布隆过滤器的假阳性：它只会误报、不会漏报。位数越少误报率越高。', s2);
      }
      return { steps: st, state: state };
    },
    render: function (kr, s) {
      kr.html('__t', S.text(500, 26, s ? s.title : '布隆过滤器', 'vt'));
      if (!s || !s.bits) {
        kr.html('__e', S.text(500, 300, '点击「初始化空过滤器」建立位数组，再插入 / 查询元素', 'vs'));
        kr.end();
        return;
      }
      kr.html('__st', S.text(500, 48, s.sub, 'vs'));
      drawRow(kr, '__bits', '位数组 bits（格子下方是位下标）', s.cells, 200, { cw: 56 });
      kr.html('__f1', S.text(500, 300, 'h1(x)=Σcode(x) mod m　·　h2(x)=(Σcode+17·len) mod m　·　h3(x)=(Σcode·13+len²) mod m', 'vs'));
      kr.html('__lt', S.text(500, 340, '已插入的元素（布隆过滤器本身并不存储它们）', 'vs'));
      kr.html('__ll', S.text(500, 366, s.list.length ? s.list.join('，') : '（空）', 'vs'));
      kr.end();
    }
  });

  /* ============================================================
     LRU 缓存（哈希表 + 双向链表）
     ============================================================ */
  DSV.register({
    id: 'oth-lru', name: 'LRU 缓存', category: '其他',
    desc: 'LRU（最近最少使用）：缓存容量固定，访问时命中就把该 key 移到最前（head 侧），未命中就插入到最前；装满时把链表最后（最久未用）的 key 淘汰。用哈希表 O(1) 定位结点 + 双向链表 O(1) 移动/删除，单次访问均摊 O(1)。',
    viewBox: '0 0 1000 620',
    code: [
      'LRUCache(cap):',
      '  list = 空（head ↔ tail）',
      'get(key):',
      '  if 命中: 把结点移到最前(head)',
      '  else: 在最前插入新结点;',
      '        若超长: 删除尾部结点(淘汰)'
    ],
    inputs: [
      { key: 'cap', label: '缓存容量', def: '3', hint: '整数，例如 3' },
      { key: 'ops', label: '建缓存时自动执行的访问序列（空格分隔 key）', def: 'A B C D B A C', hint: '例如 A B C D B A；留空则只建空缓存' }
    ],
    actions: [
      { key: 'build', label: '建空缓存', primary: true },
      { key: 'access', label: '访问 key', arg: { label: 'key', def: 'A' } }
    ],
    samples: [
      { label: '示例：容量 3', values: { cap: '3' } },
      { label: '示例：容量 2', values: { cap: '2' } },
      { label: '示例：容量 4', values: { cap: '4' } }
    ],
    random: function () {
      return { cap: String(DSV.ri(2, 4)) };
    },
    run: function (v, action, state) {
      var st = [];
      var key = (action && action.key) || 'build';
      var cap = Math.floor(Number(v.cap));
      if (!isFinite(cap) || cap < 1) { cap = 3; }
      function snapIt(info, warn) {
        return {
          title: 'LRU 缓存（容量 ' + state.cap + '）',
          sub: info || '', warn: warn || '',
          cap: state.cap,
          order: state.order.slice(),      // 左=head 最近使用，右=tail 最久未用
          evicted: state.evicted,
          hits: state.hits, misses: state.misses
        };
      }

      function accessOne(k) {
        var idx = state.order.indexOf(k);
        if (idx >= 0) {
          state.order.splice(idx, 1);
          state.order.unshift(k);
          state.hits++;
          push(st, [2, 3], '访问 "' + k + '"：命中！它现在位于链表第 ' + (idx + 1) + ' 位（从最近端数）。' +
            '把它摘下来移到最前面 head 侧（最近刚用过）。当前缓存：' + state.order.join(' ↔ '),
            snapIt('命中 "' + k + '"，移到最前'));
        } else {
          state.misses++;
          state.order.unshift(k);
          var ev = '';
          if (state.order.length > state.cap) {
            ev = state.order.pop();
            state.evicted = ev;
            push(st, [4, 5], '访问 "' + k + '"：未命中，插入到链表最前。但容量已满（' + state.cap +
              ' 个），淘汰最久未用的尾部 "' + ev + '"（灰色标记）。当前缓存：' + state.order.join(' ↔ '),
              snapIt('未命中 "' + k + '"，淘汰 "' + ev + '"'));
          } else {
            push(st, [4], '访问 "' + k + '"：未命中，插入到链表最前（head）。容量还没满，不淘汰。当前缓存：' +
              state.order.join(' ↔ '), snapIt('未命中 "' + k + '"，直接插入'));
          }
        }
        push(st, [1], '统计：命中 ' + state.hits + ' 次，未命中 ' + state.misses + ' 次。哈希表负责 O(1) 定位结点，' +
          '双向链表负责 O(1) 移动 / 删除尾部', snapIt('命中 ' + state.hits + ' / 未命中 ' + state.misses));
      }

      /* ---------- 建空缓存（顺带自动执行演示访问序列） ---------- */
      if (key === 'build') {
        state = { cap: cap, order: [], evicted: '', hits: 0, misses: 0 };
        push(st, [0, 1], '建立一个容量为 ' + cap + ' 的空 LRU 缓存：双向链表为空，head 与 tail 都还没有结点。' +
          '左=最近使用（head），右=最久未用（tail）', snapIt('空缓存就绪'));
        var keys = String(v.ops || '').split(/[\s,，]+/).filter(Boolean).slice(0, 10);
        for (var oi = 0; oi < keys.length; oi++) {
          accessOne(keys[oi]);
        }
        return { steps: st, state: DSV.clone(state) };
      }

      if (!state || !state.order) {
        push(st, [0], '还没有建缓存：请先点「建空缓存」', snapIt('请先建缓存'));
        return { steps: st, state: state || null };
      }
      state = { cap: state.cap, order: state.order.slice(), evicted: state.evicted, hits: state.hits, misses: state.misses };

      /* ---------- 单次访问 ---------- */
      var k = String((action && action.arg) || '').trim();
      if (!k) {
        push(st, [2], '请在参数框里填要访问的 key，例如 A', snapIt('key 为空'));
        return { steps: st, state: state };
      }
      accessOne(k);
      return { steps: st, state: state };
    },
    render: function (kr, s) {
      kr.html('__t', S.text(500, 26, s ? s.title : 'LRU 缓存', 'vt'));
      if (!s || !s.order) {
        kr.html('__e', S.text(500, 300, '点击「建空缓存」，再用「访问 key」模拟缓存读写', 'vs'));
        kr.end();
        return;
      }
      kr.html('__st', S.text(500, 48, s.sub + '　·　左 = head（最近使用），右 = tail（最久未用）', 'vs'));
      var n = s.order.length;
      var cw = 76, gap = 26, total = n * cw + (n - 1) * gap;
      var x0 = (1000 - total) / 2, y = 250, i;
      kr.html('__hd', S.text(x0 + cw / 2, 190, 'head（最近使用）', 'vs'));
      kr.html('__tl', S.text(x0 + total - cw / 2, 190, 'tail（最久未用）', 'vs'));
      for (i = 0; i < n; i++) {
        var x = x0 + i * (cw + gap);
        kr.g('ln' + i, 'translate(' + (x + cw / 2) + ',' + y + ')', 'k nd compare',
          '<rect x="' + (-cw / 2) + '" y="-24" width="' + cw + '" height="48" rx="6"/>' +
          S.text(0, 0, s.order[i], 'cell-txt'));
        if (i < n - 1) {
          kr.html('ar' + i, S.line(x + cw / 2 + 6, y, x + cw + gap - cw / 2 - 6, y, 'edge',
            ' marker-end="url(#arrow)"'));
        }
      }
      if (!n) { kr.html('__emp', S.text(500, y, '（空）', 'vs')); }
      kr.html('__defs', S.arrowDefs());
      kr.html('__ev', S.text(500, 360, '最近淘汰：' + (s.evicted ? s.evicted : '（无）') +
        '　·　命中 ' + s.hits + ' 次 / 未命中 ' + s.misses + ' 次 / 容量 ' + s.cap, 'vs'));
      kr.end();
    }
  });

})();
