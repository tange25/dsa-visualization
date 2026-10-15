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

})();
