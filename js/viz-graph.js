/* ============================================================
   viz-graph.js —— 图算法章节（10 个算法）
   广度优先搜索 / 深度优先搜索 / 连通分量 / Dijkstra / Prim
   拓扑排序（入度数组法）/ 拓扑排序（DFS 法）/ Floyd-Warshall / Kruskal / A* 启发式搜索
   全部算法共用同一套 parseGraph(edgesStr, directed) 与 layout(verts)
   ============================================================ */
(function () {
  'use strict';
  var DSV = window.DSV, S = DSV.svg;
  var CAT = '图算法';

  /* ---------------- 通用小工具 ---------------- */
  function push(steps, code, desc, snap) { steps.push({ code: code, desc: desc, snap: snap }); }
  function clsArr(n) { var a = []; for (var i = 0; i < n; i++) { a.push(''); } return a; }
  function vmap(verts) { var m = {}; verts.forEach(function (v, i) { m[v] = i; }); return m; }
  function isNumTok(t) { return t !== '' && isFinite(Number(t)); }
  function INF() { return Infinity; }
  function distTxt(v) { return v === Infinity ? '∞' : String(v); }

  /* ---------------- 统一图解析 ----------------
     输入：一行一条边 "u v w" 或 "u v"（w 省略时自动补 1）
     顶点从所有边中提取，去重后按字典序排序。
     directed = true 时把 "u v" 解释为 u → v。
     返回 { verts, edges:[{u,v,w}], adj, directed, weighted }
  ------------------------------------------------ */
  function parseGraph(str, directed) {
    var toks = String(str == null ? '' : str)
      .split(/[\s,，;；、\/|\n\r]+/)
      .filter(function (t) { return t !== ''; });
    var edges = [], seen = {}, i = 0;
    while (i < toks.length && edges.length < 40) {
      var u = toks[i++];
      if (i >= toks.length) { break; }
      var v = toks[i++];
      var w = 1;
      if (i < toks.length && isNumTok(toks[i])) {
        var nw = Number(toks[i]);
        if (isFinite(nw) && nw >= 0) { w = nw; i++; }
      }
      if (!u || !v) { continue; }
      // 无向图把 (u,v) 与 (v,u) 视为同一条边，去重
      var key = directed ? (u + '>' + v) : (u < v ? u + '-' + v : v + '-' + u);
      if (seen[key]) { continue; }
      seen[key] = 1;
      edges.push({ u: u, v: v, w: w });
    }
    var set = {};
    edges.forEach(function (e) { set[e.u] = 1; set[e.v] = 1; });
    var verts = Object.keys(set).sort();
    if (verts.length > 16) {
      var keep = {};
      verts = verts.slice(0, 16);
      verts.forEach(function (x) { keep[x] = 1; });
      edges = edges.filter(function (e) { return keep[e.u] && keep[e.v]; });
    }
    var adj = {};
    verts.forEach(function (x) { adj[x] = []; });
    edges.forEach(function (e, idx) {
      adj[e.u].push({ v: e.v, w: e.w, i: idx });
      if (!directed) { adj[e.v].push({ v: e.u, w: e.w, i: idx }); }
    });
    var weighted = false;
    edges.forEach(function (e) { if (e.w !== 1) { weighted = true; } });
    return { verts: verts, edges: edges, adj: adj, directed: !!directed, weighted: weighted };
  }

  /* ---------------- 统一布局：顶点均匀排在一个圆上 ----------------
     圆心 (500,280)，半径 175；从正上方开始顺时针排列。
     半径留出余量，保证顶部顶点（y=105，圆顶 y=82）不与副标题（y=48）重叠。
  ------------------------------------------------ */
  function layout(verts) {
    var n = verts.length, pos = {}, cx = 500, cy = 280, RR = 175;
    if (!n) { return pos; }
    if (n === 1) { pos[verts[0]] = { x: cx, y: cy }; return pos; }
    for (var i = 0; i < n; i++) {
      var a = -Math.PI / 2 + 2 * Math.PI * i / n;
      pos[verts[i]] = { x: cx + RR * Math.cos(a), y: cy + RR * Math.sin(a) };
    }
    return pos;
  }

  /* ---------------- 通用图绘制 ----------------
     snap: { verts, edges, vc:[顶点class], ec:[边class], vsub:[顶点下方小字], directed, weighted }
  ------------------------------------------------ */
  function drawGraph(kr, s, opt) {
    opt = opt || {};
    var verts = s.verts || [], edges = s.edges || [], pos = layout(verts), R = 23;
    var ge = kr.g('__ge', 'translate(0,0)', 'k');
    var gw = kr.g('__gw', 'translate(0,0)', 'k');
    var gn = kr.g('__gn', 'translate(0,0)', 'k');
    var i, showW = opt.showW;
    for (i = 0; i < edges.length; i++) {
      var e = edges[i], p = pos[e.u], q = pos[e.v];
      if (!p || !q) { continue; }
      var dx = q.x - p.x, dy = q.y - p.y, L = Math.sqrt(dx * dx + dy * dy) || 1;
      var ux = dx / L, uy = dy / L;
      var tail = R + 2, head = R + (s.directed ? 9 : 2);
      var cls = (s.ec && s.ec[i]) ? s.ec[i] : '';
      kr.html('e' + i, S.line(p.x + ux * tail, p.y + uy * tail, q.x - ux * head, q.y - uy * head,
        'edge ' + cls, s.directed ? ' marker-end="url(#arrow)"' : ''), ge);
      if (showW) {
        // 边权标签放在两圆之间的自由段中点；自由段太短时垂直偏移到边旁，避免压顶点
        var seg = Math.max(0, L - tail - head);
        var mx = p.x + ux * (tail + seg / 2), my = p.y + uy * (tail + seg / 2);
        var off = (seg >= 34) ? 0 : (R + 6);
        var lx = mx - uy * off, ly = my + ux * off;
        kr.html('w' + i, '<rect class="cell" x="' + (lx - 14) + '" y="' + (ly - 11) + '" width="28" height="22" rx="3"/>' +
          S.text(lx, ly, e.w, 'cell-txt'), gw);
      }
    }
    for (i = 0; i < verts.length; i++) {
      var v = verts[i], pp = pos[v];
      var vcls = (s.vc && s.vc[i]) ? s.vc[i] : '';
      var sub = (s.vsub && s.vsub[i]) ? s.vsub[i] : '';
      kr.g('v_' + v, 'translate(' + pp.x + ',' + pp.y + ')', 'k nd ' + vcls,
        S.circle(0, 0, R) + S.text(0, 0, v, '') +
        (sub ? S.text(0, (pp.y > 290 ? -(R + 15) : R + 15), sub, 'tag') : ''), gn);
    }
  }

  /** 图 + 标题 + 副标题 + 警告行的公共底板 */
  function base(kr, s, warnY) {
    kr.html('__t', S.text(500, 26, s.title || '', 'vt'));
    if (s.sub) { kr.html('__s', S.text(500, 48, s.sub, 'vs')); }
    if (s.directed) { kr.html('__defs', S.arrowDefs()); }
    drawGraph(kr, s, { showW: s.weighted && s.showW !== false });
    if (s.warn) { kr.html('__w', S.text(500, warnY || 508, s.warn, 'vwarn')); }
  }

  /** 一行小格子（队列 / 表格 / 边列表 / 序列） */
  function drawRow(kr, key, label, items, y, opt) {
    opt = opt || {};
    if (!items || !items.length) { return; }
    var cw = opt.cw || 42, gap = opt.gap || 5, n = items.length;
    var total = n * cw + (n - 1) * gap;
    var x0 = Math.max(30, (1000 - total) / 2), inner = '', i;
    if (label) { inner += S.text(500, y - 26, label, 'vs'); }
    for (i = 0; i < n; i++) {
      var it = items[i] || {}, x = x0 + i * (cw + gap);
      var v = (it.v === undefined || it.v === null) ? '' : String(it.v);
      inner += '<rect class="cell ' + (it.cls || '') + '" x="' + x + '" y="' + (y - 15) +
        '" width="' + cw + '" height="30" rx="4"/>' + S.text(x + cw / 2, y, v, 'cell-txt');
      if (it.m) { inner += S.text(x + cw / 2, y + 25, it.m, 'ptr'); }
    }
    kr.html(key, inner);
  }

  /** 若干行小字文本（分量列表 / 结果说明） */
  function drawLines(kr, key, lines, y, step, max) {
    var inner = '', n = Math.min(lines.length, max || 99);
    for (var i = 0; i < n; i++) { inner += S.text(500, y + i * (step || 22), lines[i], 'vs'); }
    if (lines.length > n) { inner += S.text(500, y + n * (step || 22), '…… 其余 ' + (lines.length - n) + ' 项已省略', 'vs'); }
    kr.html(key, inner);
  }

  /* ---------------- 随机数据 ----------------
     6~8 个顶点（A,B,C…）、8~12 条边、权值 1~9 的连通图；
     dag = true 时按随机拓扑序只连前向边，保证是有向无环图（且弱连通）。
  ------------------------------------------------ */
  function randomEdges(dag) {
    var n = DSV.ri(6, 8), verts = [], i;
    for (i = 0; i < n; i++) { verts.push(String.fromCharCode(65 + i)); }
    var m = Math.min(DSV.ri(8, 12), Math.floor(n * (n - 1) / 2));
    var ord = DSV.shuffle(verts);          // 随机排列，作为拓扑序
    var seen = {}, lines = [];
    function add(a, b) {
      if (a === b) { return false; }
      var k = dag ? (a + '>' + b) : (a < b ? a + '-' + b : b + '-' + a);
      if (seen[k]) { return false; }
      seen[k] = 1;
      lines.push(a + ' ' + b + ' ' + DSV.ri(1, 9));
      return true;
    }
    // 先连成一棵随机生成树，保证（弱）连通
    for (i = 1; i < n; i++) { add(ord[DSV.ri(0, i - 1)], ord[i]); }
    // 再补足到 m 条边
    var guard = 0;
    while (lines.length < m && guard++ < 400) {
      var a = DSV.ri(0, n - 1), b = DSV.ri(0, n - 1);
      if (a === b) { continue; }
      if (a > b) { var t = a; a = b; b = t; }
      add(ord[a], ord[b]);
    }
    return DSV.shuffle(lines).join('\n');
  }

  /* ---------------- 示例数据与输入定义 ---------------- */
  var G6 = 'A B 4\nA C 2\nB C 1\nB D 5\nC D 8\nC E 3\nD E 2\nD F 6\nE F 7';
  var G3 = 'A B 4\nA C 2\nB C 1';
  var GT = 'A B\nA C\nB D\nB E\nC F\nC G';
  var G5 = 'A B 3\nA C 8\nB C 2\nB D 5\nC D 4\nC E 6\nD E 9';
  var DAG1 = 'A B\nA C\nB D\nC D\nC E\nD F\nE F';
  var DAG2 = 'A C\nB C\nB D\nC E\nD E\nE F';
  var CYC = 'A B\nB C\nC A\nC D\nD E';

  function inEdges(def) {
    return { key: 'edges', label: '边表', def: def, multiline: true, hint: '一行一条边：u v w（w 可省略则默认 1），支持多行' };
  }
  function inStart(def) {
    return { key: 'start', label: '起点', def: def || 'A', hint: '顶点名，缺省取字典序第一个顶点' };
  }
  function inEnd(def) {
    return { key: 'end', label: '终点', def: def || 'F', hint: '顶点名，缺省取字典序最后一个顶点' };
  }
  function inHeur(def) {
    return {
      key: 'heuristic', label: '启发式 h(v)', multiline: true, def: def || '0',
      hint: '可选：0（退化为 Dijkstra）/ 直线距离（按画布坐标的欧氏距离，仅供直观演示）/ 自定义（每行"顶点 估值"，其余默认 0）'
    };
  }
  function rndVal(dag) { return { edges: randomEdges(dag), start: 'A' }; }

  /* ============================================================
     1. 广度优先搜索 BFS
     ============================================================ */
  DSV.register({
    id: 'bfs', name: '广度优先搜索', category: CAT,
    desc: '从起点出发，用队列按「层」向外扩展：出队一个顶点，把它所有未访问的邻接点入队并标记，直到队列为空。可求无权图单源最短距离。时间 O(V+E)，空间 O(V)。',
    viewBox: '0 0 1000 700',
    code: [
      'BFS(G, s):',
      '  for v in V: visited[v] = false; d[v] = ∞',
      '  visited[s] = true; d[s] = 0; Q.enqueue(s)',
      '  while Q 非空:',
      '    u = Q.dequeue()',
      '    for v in adj[u]:',
      '      if not visited[v]:',
      '        visited[v] = true; d[v] = d[u] + 1; Q.enqueue(v)',
      '  return d'
    ],
    inputs: [inEdges(G6), inStart('A')],
    samples: [
      { label: '示例：6 顶点有权图', values: { edges: G6, start: 'A' } },
      { label: '示例：三角形小图', values: { edges: G3, start: 'A' } },
      { label: '示例：树形无权图', values: { edges: GT, start: 'A' } }
    ],
    random: function () { return rndVal(false); },
    run: function (v) {
      var g = parseGraph(v.edges, false);
      if (!g.verts.length) { return []; }
      var st = [], n = g.verts.length, vi = vmap(g.verts), m = g.edges.length;
      var start = (v.start && vi[v.start] != null) ? v.start : g.verts[0];
      var vis = {}, d = {}, q = [], order = [];
      var vc = clsArr(n), ec = clsArr(m);
      var i;
      for (i = 0; i < n; i++) { d[g.verts[i]] = INF(); }
      function snap(sub) {
        var vs = [];
        for (var t = 0; t < n; t++) { vs[t] = d[g.verts[t]] === INF() ? '' : 'd=' + d[g.verts[t]]; }
        return {
          verts: g.verts, edges: g.edges, vc: vc.slice(), ec: ec.slice(), vsub: vs,
          directed: false, weighted: g.weighted, title: '广度优先搜索 BFS（起点 ' + start + '）',
          sub: sub || '', warn: '',
          queue: q.map(function (x, k) { return { v: x, cls: k === 0 ? 'active' : 'compare', m: k === 0 ? '队首' : '' }; }),
          order: order.map(function (x) { return { v: x, cls: 'done' }; })
        };
      }
      push(st, [0, 1], '初始化：共 ' + n + ' 个顶点、' + m + ' 条边，全部置为未访问（白），距离 d = ∞',
        snap('未访问 ' + n + ' 个顶点'));
      vis[start] = true; d[start] = 0; q.push(start); order.push(start); vc[vi[start]] = 'compare';
      push(st, [2], '起点 ' + start + ' 标记已发现并入队，d[' + start + '] = 0，队列 = [' + q.join(', ') + ']',
        snap('起点入队'));
      var guard = 0;
      while (q.length && guard++ < 500) {
        var u = q.shift();
        vc[vi[u]] = 'active';
        push(st, [3, 4], '出队队首顶点 ' + u + '（d = ' + d[u] + '），准备遍历它的邻接点',
          snap('出队：' + u + '，队列剩余 ' + q.length + ' 个'));
        var nb = g.adj[u] || [];
        for (var t2 = 0; t2 < nb.length; t2++) {
          var w = nb[t2].v, ei = nb[t2].i;
          ec[ei] = 'hl';
          if (!vis[w]) {
            vis[w] = true; d[w] = d[u] + 1; q.push(w); order.push(w); vc[vi[w]] = 'compare';
            push(st, [6, 7], '邻接点 ' + w + ' 未访问：标记入队，d[' + w + '] = d[' + u + ']+1 = ' + d[w] +
              '，边 ' + u + '—' + w + ' 加入 BFS 树', snap('发现 ' + w + '，入队'));
            ec[ei] = 'path';
          } else {
            push(st, [6], '邻接点 ' + w + ' 已访问（' + (q.indexOf(w) >= 0 ? '仍在队列中' : '已出队') + '），跳过，边 ' + u + '—' + w + ' 不是树边',
              snap('跳过已访问的 ' + w));
            ec[ei] = '';
          }
        }
        vc[vi[u]] = 'done';
        push(st, [3], '顶点 ' + u + ' 的邻接点全部处理完，' + u + ' 完成（黑），队列 = [' + q.join(', ') + ']',
          snap(u + ' 处理完毕'));
      }
      push(st, [8], '队列为空，广度优先搜索结束。访问顺序：' + order.join(' → ') + '；各点层数 d：' +
        g.verts.map(function (x) { return x + '=' + distTxt(d[x]); }).join('，'), snap('搜索完成'));
      return st;
    },
    render: function (kr, s) {
      if (!s) { kr.html('__e', S.text(500, 300, '（尚未开始，点击「开始演示」运行广度优先搜索）', 'vs')); kr.end(); return; }
      base(kr, s, 508);
      drawRow(kr, '__q', '队列（左端为队首，右端为队尾）', s.queue, 570, { cw: 46 });
      drawRow(kr, '__o', '访问顺序（已出队顶点）', s.order, 655, { cw: 46 });
      kr.end();
    }
  });

  /* ============================================================
     2. 深度优先搜索 DFS
     ============================================================ */
  DSV.register({
    id: 'dfs', name: '深度优先搜索', category: CAT,
    desc: '从起点出发沿着一条路一直走到底，再回溯继续。用递归（显式递归栈）实现，记录每个顶点的发现时间 d[] 与完成时间 f[]，树边为紫色、回边为红色。时间 O(V+E)，空间 O(V)。',
    viewBox: '0 0 1000 700',
    code: [
      'DFS(G):',
      '  for v in V: color[v] = 白; time = 0',
      '  for s in V: if color[s] == 白: DFS-Visit(s)',
      '',
      'DFS-Visit(u):',
      '  color[u] = 灰; d[u] = ++time            // 发现',
      '  for v in adj[u]:',
      '    if color[v] == 白:',
      '      tree(u,v); DFS-Visit(v)',
      '    else if color[v] == 灰: 记录回边 (u,v)',
      '  color[u] = 黑; f[u] = ++time            // 完成'
    ],
    inputs: [inEdges(G6), inStart('A')],
    samples: [
      { label: '示例：6 顶点有权图', values: { edges: G6, start: 'A' } },
      { label: '示例：三角形小图', values: { edges: G3, start: 'A' } },
      { label: '示例：树形无权图', values: { edges: GT, start: 'A' } }
    ],
    random: function () { return rndVal(false); },
    run: function (v) {
      var g = parseGraph(v.edges, false);
      if (!g.verts.length) { return []; }
      var st = [], n = g.verts.length, vi = vmap(g.verts), m = g.edges.length;
      var start = (v.start && vi[v.start] != null) ? v.start : g.verts[0];
      var color = {}, d = {}, f = {}, par = {}, stack = [], fin = [];
      var vc = clsArr(n), ec = clsArr(m), timer = 0, i;
      for (i = 0; i < n; i++) { color[g.verts[i]] = 'white'; d[g.verts[i]] = 0; f[g.verts[i]] = 0; }
      function snap(sub) {
        var vs = [];
        for (var t = 0; t < n; t++) {
          var x = g.verts[t];
          vs[t] = (d[x] ? String(d[x]) : '·') + '/' + (f[x] ? String(f[x]) : '·');
        }
        return {
          verts: g.verts, edges: g.edges, vc: vc.slice(), ec: ec.slice(), vsub: vs,
          directed: false, weighted: g.weighted, title: '深度优先搜索 DFS（d/f 时间戳，起点 ' + start + '）',
          sub: sub || '', warn: '',
          stack: stack.map(function (x, k) { return { v: x, cls: k === stack.length - 1 ? 'active' : 'compare' }; }),
          fin: fin.map(function (x) { return { v: x, cls: 'done' }; })
        };
      }
      function dfs(u) {
        color[u] = 'gray'; d[u] = ++timer; stack.push(u); vc[vi[u]] = 'active';
        push(st, [5], '进入 ' + u + '：置为灰色（已发现），发现时间 d[' + u + '] = ' + d[u] +
          '，递归栈 = [' + stack.join(' ') + ']', snap('递归深入 ' + u));
        var nb = g.adj[u] || [];
        for (var t = 0; t < nb.length; t++) {
          var w = nb[t].v, ei = nb[t].i;
          ec[ei] = 'hl';
          if (color[w] === 'white') {
            push(st, [7, 8], u + ' → ' + w + '：' + w + ' 是白色未发现顶点，边 (' + u + ',' + w + ') 是树边，递归进入 ' + w,
              snap('沿树边进入 ' + w));
            ec[ei] = 'path';
            par[w] = u;
            dfs(w);
          } else if (color[w] === 'gray') {
            if (!g.directed && par[u] === w) {
              push(st, [9], u + ' → ' + w + '：' + w + ' 是自己的父结点（无向边的反向），忽略', snap('忽略父边'));
              ec[ei] = '';
            } else {
              ec[ei] = 'swap';
              push(st, [9], u + ' → ' + w + '：' + w + ' 仍是灰色（在递归栈中），边 (' + u + ',' + w + ') 是回边' +
                (g.directed ? '，说明有向图中存在环' : '，说明图中存在环'), snap('发现回边 ' + u + '→' + w));
            }
          } else {
            push(st, [7], u + ' → ' + w + '：' + w + ' 已是黑色（已完成），是已处理过的边，跳过', snap('跳过已完成顶点'));
            ec[ei] = '';
          }
        }
        color[u] = 'black'; f[u] = ++timer; vc[vi[u]] = 'done'; stack.pop(); fin.push(u);
        push(st, [10], u + ' 的邻接点全部处理完：置为黑色，完成时间 f[' + u + '] = ' + f[u] + '，弹出递归栈',
          snap(u + ' 完成，回溯'));
      }
      push(st, [0, 1], '初始化：所有顶点置为白色，时间戳 time = 0，从起点 ' + start + ' 开始', snap('全部顶点为白色'));
      dfs(start);
      var rest = [];
      for (i = 0; i < n; i++) { if (color[g.verts[i]] === 'white') { rest.push(g.verts[i]); } }
      for (i = 0; i < rest.length; i++) {
        push(st, [2], '顶点 ' + rest[i] + ' 仍是白色（与起点不连通），从它继续深度优先搜索', snap('处理未访问顶点 ' + rest[i]));
        dfs(rest[i]);
      }
      push(st, [2], '所有顶点均为黑色，深度优先搜索结束。完成序：' + fin.join(' → '), snap('搜索完成'));
      return st;
    },
    render: function (kr, s) {
      if (!s) { kr.html('__e', S.text(500, 300, '（尚未开始，点击「开始演示」运行深度优先搜索）', 'vs')); kr.end(); return; }
      base(kr, s, 508);
      drawRow(kr, '__st', '递归栈（右端为栈顶 = 当前所在顶点）', s.stack, 570, { cw: 46 });
      drawRow(kr, '__fn', '完成顺序（按 f 从小到大，顶点下方 d/f）', s.fin, 655, { cw: 46 });
      kr.end();
    }
  });

  /* ============================================================
     3. 连通分量
     ============================================================ */
  DSV.register({
    id: 'connected', name: '连通分量', category: CAT,
    desc: '对每个尚未归类的顶点做一次 BFS/DFS，把它能到达的所有顶点染成同一个连通分量，直到所有顶点都有分量编号。时间 O(V+E)，空间 O(V)。',
    viewBox: '0 0 1000 740',
    code: [
      'connectedComponents(G):',
      '  for v in V: comp[v] = -1',
      '  c = 0',
      '  for s in V:',
      '    if comp[s] != -1: continue',
      '    comp[s] = c                       // 新分量',
      '    从 s 出发 BFS，把所有可达顶点 v 的 comp[v] 置为 c',
      '    c = c + 1',
      '  return comp, c'
    ],
    inputs: [inEdges('A B 4\nA C 2\nB C 1\nD E 3\nE F 1\nG H 2')],
    samples: [
      { label: '示例：3 个连通分量', values: { edges: 'A B 4\nA C 2\nB C 1\nD E 3\nE F 1\nG H 2' } },
      { label: '示例：整体连通', values: { edges: G6 } },
      { label: '示例：含孤立顶点', values: { edges: 'A B\nB C\nD E\nF G\nG H' } }
    ],
    random: function () { return rndVal(false); },
    run: function (v) {
      var g = parseGraph(v.edges, false);
      if (!g.verts.length) { return []; }
      var st = [], n = g.verts.length, m = g.edges.length;
      var PAL = ['active', 'compare', 'path', 'done', 'swap', 'active', 'compare', 'path'];
      var comp = [], vc = clsArr(n), ec = clsArr(m), i;
      for (i = 0; i < n; i++) { comp.push(-1); }
      function snap(sub, lines) {
        var vs = [];
        for (var t = 0; t < n; t++) { vs[t] = comp[t] >= 0 ? ('#' + (comp[t] + 1)) : ''; }
        return {
          verts: g.verts, edges: g.edges, vc: vc.slice(), ec: ec.slice(), vsub: vs,
          directed: false, weighted: g.weighted, title: '连通分量（' + n + ' 个顶点，' + m + ' 条边）',
          sub: sub || '', warn: '', lines: lines || []
        };
      }
      function lines() {
        var out = [], seen = {};
        for (var t = 0; t < n; t++) {
          var c = comp[t];
          if (c < 0 || seen[c]) { continue; }
          seen[c] = 1;
          var mem = [];
          for (var k = 0; k < n; k++) { if (comp[k] === c) { mem.push(g.verts[k]); } }
          out.push('分量 #' + (c + 1) + '（' + mem.length + ' 个顶点）：' + mem.join('，'));
        }
        if (!out.length) { out.push('（还没有确定任何分量）'); }
        return out;
      }
      push(st, [0, 1, 2], '初始化：' + n + ' 个顶点分量编号全为 -1（未归类），分量计数器 c = 0',
        snap('所有顶点未归类', lines()));
      var c = 0;
      for (i = 0; i < n; i++) {
        var s = g.verts[i];
        if (comp[i] !== -1) {
          push(st, [4], '顶点 ' + s + ' 已属于分量 #' + (comp[i] + 1) + '，跳过', snap('跳过 ' + s, lines()));
          continue;
        }
        comp[i] = c; vc[i] = PAL[c % PAL.length];
        push(st, [3, 5, 6], '发现未归类顶点 ' + s + '，开启新分量 #' + (c + 1) + '，从它出发做一次 BFS',
          snap('开始分量 #' + (c + 1), lines()));
        var q = [i], head = 0;
        while (head < q.length) {
          var u = q[head++], un = g.verts[u];
          var nb = g.adj[un] || [];
          for (var t2 = 0; t2 < nb.length; t2++) {
            var w = nb[t2].v, ei = nb[t2].i, wi = g.verts.indexOf(w);
            ec[ei] = 'hl';
            if (comp[wi] === -1) {
              comp[wi] = c; vc[wi] = PAL[c % PAL.length]; q.push(wi);
              push(st, [6], '从 ' + un + ' 到达未归类顶点 ' + w + '，把它并入分量 #' + (c + 1) +
                '，边 ' + un + '—' + w + ' 属于该分量', snap('并入 ' + w, lines()));
              ec[ei] = 'path';
            } else {
              push(st, [6], '邻接点 ' + w + ' 已属于分量 #' + (comp[wi] + 1) + '，无需处理', snap('跳过 ' + w, lines()));
              ec[ei] = (comp[wi] === c) ? 'path' : '';
            }
          }
        }
        push(st, [7], '分量 #' + (c + 1) + ' 遍历完毕，共 ' + (function () {
          var kk = 0; for (var k2 = 0; k2 < n; k2++) { if (comp[k2] === c) { kk++; } } return kk;
        })() + ' 个顶点，c 增加到 ' + (c + 1), snap('分量 #' + (c + 1) + ' 完成', lines()));
        c++;
      }
      push(st, [8], '所有顶点都已归类：共 ' + c + ' 个连通分量', snap('共 ' + c + ' 个连通分量', lines()));
      return st;
    },
    render: function (kr, s) {
      if (!s) { kr.html('__e', S.text(500, 300, '（尚未开始，点击「开始演示」求连通分量）', 'vs')); kr.end(); return; }
      base(kr, s, 508);
      kr.html('__lt', S.text(500, 552, '分量列表', 'vs'));
      drawLines(kr, '__ls', s.lines || [], 578, 22, 7);
      kr.end();
    }
  });

  /* ============================================================
     4. Dijkstra 最短路径
     ============================================================ */
  DSV.register({
    id: 'dijkstra', name: 'Dijkstra 最短路径', category: CAT,
    desc: '贪心：反复从未确定集合中取出 dist 最小的顶点并「确定」它，再用它的所有出边松弛邻接点的距离。要求边权非负。用数组实现时时间 O(V²+E)，二叉堆实现 O((V+E)logV)。',
    viewBox: '0 0 1000 740',
    code: [
      'Dijkstra(G, s):',
      '  for v in V: dist[v] = ∞; prev[v] = null',
      '  dist[s] = 0',
      '  while 存在未确定顶点:',
      '    u = 未确定顶点中 dist 最小的那个',
      '    确定 u（加入集合 S）',
      '    for (u, v, w) in adj[u]:',
      '      if dist[u] + w < dist[v]:',
      '        dist[v] = dist[u] + w; prev[v] = u',
      '  return dist, prev'
    ],
    inputs: [inEdges(G6), inStart('A')],
    samples: [
      { label: '示例：6 顶点有权图', values: { edges: G6, start: 'A' } },
      { label: '示例：三角形小图', values: { edges: G3, start: 'A' } },
      { label: '示例：5 顶点有权图', values: { edges: G5, start: 'A' } }
    ],
    random: function () { return rndVal(false); },
    run: function (v) {
      var g = parseGraph(v.edges, false);
      if (!g.verts.length) { return []; }
      var st = [], n = g.verts.length, vi = vmap(g.verts), m = g.edges.length, i;
      var start = (v.start && vi[v.start] != null) ? v.start : g.verts[0];
      var dist = [], prev = [], done = [], treeEdge = [];
      var vc = clsArr(n), curEdge = -1, curCls = '';
      for (i = 0; i < n; i++) { dist.push(INF()); prev.push(null); done.push(false); treeEdge.push(-1); }
      dist[vi[start]] = 0;
      function ecArr() {
        var e = clsArr(m);
        for (var t = 0; t < n; t++) { if (treeEdge[t] >= 0) { e[treeEdge[t]] = 'path'; } }
        if (curEdge >= 0) { e[curEdge] = curCls || 'hl'; }
        return e;
      }
      function snap(sub) {
        var vs = [], heads = [], ds = [], ps = [];
        for (var t = 0; t < n; t++) {
          vs[t] = dist[t] === INF() ? '∞' : String(dist[t]);
          heads.push({ v: g.verts[t], cls: done[t] ? 'done' : (vc[t] || '') });
          ds.push({ v: distTxt(dist[t]), cls: done[t] ? 'done' : (vc[t] || ''), m: g.verts[t] });
          ps.push({ v: prev[t] === null ? '—' : g.verts[prev[t]], cls: done[t] ? 'done' : '', m: g.verts[t] });
        }
        return {
          verts: g.verts, edges: g.edges, vc: vc.slice(), ec: ecArr(), vsub: vs,
          directed: false, weighted: true, title: 'Dijkstra 最短路径（源点 ' + start + '，边权非负）',
          sub: sub || '', warn: '', heads: heads, ds: ds, ps: ps
        };
      }
      push(st, [0, 1, 2], '初始化：除源点 ' + start + ' 的 dist = 0 外，其余顶点 dist = ∞，前驱为空',
        snap('初始化 dist 数组'));
      for (var it = 0; it < n; it++) {
        var u = -1, best = INF();
        for (i = 0; i < n; i++) { if (!done[i] && dist[i] < best) { best = dist[i]; u = i; } }
        if (u < 0) {
          push(st, [3], '剩余未确定顶点的 dist 都是 ∞（与源点不连通），提前结束', snap('剩余顶点不可达'));
          break;
        }
        vc[u] = 'active';
        push(st, [3, 4], '在未确定顶点中扫描 dist：选中最小者 ' + g.verts[u] + '（dist = ' + distTxt(dist[u]) + '）',
          snap('选中 dist 最小的顶点 ' + g.verts[u]));
        done[u] = true; vc[u] = 'done';
        push(st, [5], '确定顶点 ' + g.verts[u] + '，它的最短距离已最终确定，加入已确定集合 S',
          snap(g.verts[u] + ' 已确定'));
        var nb = g.adj[g.verts[u]] || [];
        for (var t2 = 0; t2 < nb.length; t2++) {
          var w = nb[t2].v, wt = nb[t2].w, ei = nb[t2].i, wi = vi[w];
          curEdge = ei; curCls = 'hl';
          if (done[wi]) {
            push(st, [6], '边 ' + g.verts[u] + '—' + w + '（权 ' + wt + '）：' + w + ' 已确定，无需松弛',
              snap(w + ' 已确定，跳过'));
            curEdge = -1;
            continue;
          }
          vc[wi] = 'compare';
          var nd = dist[u] + wt;
          var better = nd < dist[wi];
          push(st, [7], '松弛边 ' + g.verts[u] + '—' + w + '（权 ' + wt + '）：dist[' + g.verts[u] + ']+w = ' +
            distTxt(dist[u]) + '+' + wt + ' = ' + distTxt(nd) + '，与 dist[' + w + '] = ' + distTxt(dist[wi]) + ' 比较：' +
            (better ? '更小，可以更新' : '不更小，保持原值'), snap('松弛 ' + g.verts[u] + '—' + w));
          if (better) {
            dist[wi] = nd; prev[wi] = u; treeEdge[wi] = ei;
            vc[wi] = 'swap'; curCls = 'swap';
            push(st, [8], '更新 dist[' + w + '] = ' + nd + '，前驱 prev[' + w + '] = ' + g.verts[u] +
              '，边 ' + g.verts[u] + '—' + w + ' 进入最短路径树', snap('更新 ' + w + ' 的距离'));
            curCls = 'path';
          }
          vc[wi] = '';
          curEdge = -1;
        }
      }
      var res = [];
      for (i = 0; i < n; i++) { res.push(g.verts[i] + '=' + distTxt(dist[i])); }
      push(st, [9], '全部顶点处理完毕。从 ' + start + ' 到各顶点的最短距离：' + res.join('，') +
        '（∞ 表示不可达）', snap('最短路求解完成'));
      return st;
    },
    render: function (kr, s) {
      if (!s) { kr.html('__e', S.text(500, 300, '（尚未开始，点击「开始演示」运行 Dijkstra）', 'vs')); kr.end(); return; }
      base(kr, s, 508);
      drawRow(kr, '__h', '顶点', s.heads, 552, { cw: 44 });
      drawRow(kr, '__d', 'dist：源点到该顶点当前已知的最短距离', s.ds, 628, { cw: 44 });
      drawRow(kr, '__p', 'prev：最短路径上的前驱顶点', s.ps, 704, { cw: 44 });
      kr.end();
    }
  });

  /* ============================================================
     5. Prim 最小生成树
     ============================================================ */
  DSV.register({
    id: 'prim', name: 'Prim 最小生成树', category: CAT,
    desc: '从起点开始，每次在所有「一端已在树中、另一端不在树中」的跨切边里挑权值最小的一条加入生成树，直到含全部顶点。时间 O(V·E)（数组实现），二叉堆可优化到 O(E logV)。',
    viewBox: '0 0 1000 700',
    code: [
      'Prim(G, s):',
      '  inTree[s] = true; MST = []; total = 0',
      '  while |MST| < |V| - 1:',
      '    在所有 u∈树、v∉树 的边中找权值最小的 (u,v,w)',
      '    if 找不到: 图不连通，结束',
      '    MST.add((u,v,w)); inTree[v] = true; total += w',
      '  return MST, total'
    ],
    inputs: [inEdges(G6), inStart('A')],
    samples: [
      { label: '示例：6 顶点有权图', values: { edges: G6, start: 'A' } },
      { label: '示例：三角形小图', values: { edges: G3, start: 'A' } },
      { label: '示例：5 顶点有权图', values: { edges: G5, start: 'A' } }
    ],
    random: function () { return rndVal(false); },
    run: function (v) {
      var g = parseGraph(v.edges, false);
      if (!g.verts.length) { return []; }
      var st = [], n = g.verts.length, vi = vmap(g.verts), m = g.edges.length, i;
      var start = (v.start && vi[v.start] != null) ? v.start : g.verts[0];
      var inTree = [], vc = clsArr(n), ec = clsArr(m), mst = [], total = 0;
      var curEdge = -1, curCls = '';
      for (i = 0; i < n; i++) { inTree.push(false); }
      function snap(sub) {
        var e = ec.slice();
        if (curEdge >= 0) { e[curEdge] = curCls || 'hl'; }
        return {
          verts: g.verts, edges: g.edges, vc: vc.slice(), ec: e, vsub: [],
          directed: false, weighted: true, title: 'Prim 最小生成树（起点 ' + start + '）',
          sub: sub || '', warn: '',
          edgesRow: mst.map(function (ei) { return { v: g.edges[ei].u + '-' + g.edges[ei].v, cls: 'path', m: String(g.edges[ei].w) }; }),
          total: total
        };
      }
      inTree[vi[start]] = true; vc[vi[start]] = 'path';
      push(st, [0, 1], '初始化：把起点 ' + start + ' 放入已选集合（紫色），生成树边集为空，总权值 0',
        snap('已选集合 = {' + start + '}'));
      var round = 0;
      while (mst.length < n - 1) {
        round++;
        var best = -1, bw = INF(), cnt = 0;
        push(st, [2], '第 ' + round + ' 轮：已选集合 = {' + g.verts.filter(function (x, k) { return inTree[k]; }).join('，') +
          '}，开始扫描所有跨切边', snap('第 ' + round + ' 轮：扫描跨切边'));
        for (i = 0; i < m; i++) {
          var e = g.edges[i], iu = vi[e.u], iv = vi[e.v];
          var tu = inTree[iu], tv = inTree[iv];
          if (tu === tv) {
            curEdge = i; curCls = '';
            push(st, [3], '检查边 ' + e.u + '—' + e.v + '（权 ' + e.w + '）：两端' +
              (tu ? '都在树内' : '都不在树内') + '，不是跨切边，跳过', snap('跳过 ' + e.u + '—' + e.v));
            curEdge = -1;
            continue;
          }
          cnt++;
          curEdge = i; curCls = 'hl';
          push(st, [3], '检查跨切边 ' + e.u + '—' + e.v + '（权 ' + e.w + '）：候选最小 = ' +
            (bw === INF() ? '—' : bw) + ' → ' + (e.w < bw ? ('更新为 ' + e.w) : ('仍为 ' + bw)),
            snap('检查 ' + e.u + '—' + e.v + '（权 ' + e.w + '）'));
          if (e.w < bw) { bw = e.w; best = i; }
          curEdge = -1;
        }
        if (best < 0 || cnt === 0) {
          push(st, [4], '没有找到任何跨切边：图不连通，只能得到最小生成森林（已加入 ' + mst.length + ' 条边）',
            snap('图不连通'));
          break;
        }
        var be = g.edges[best];
        var bu = inTree[vi[be.u]] ? be.u : be.v;
        var bv = inTree[vi[be.u]] ? be.v : be.u;
        curEdge = best; curCls = 'swap'; vc[vi[bv]] = 'swap';
        push(st, [3], '第 ' + round + ' 轮选中权值最小的跨切边 ' + be.u + '—' + be.v + '（权 ' + be.w +
          '），把新顶点 ' + bv + ' 接入生成树', snap('选中 ' + be.u + '—' + be.v + '（权 ' + be.w + '）'));
        mst.push(best); ec[best] = 'path'; inTree[vi[bv]] = true; vc[vi[bv]] = 'path'; total += be.w;
        curEdge = best; curCls = 'path';
        push(st, [5], '边 ' + be.u + '—' + be.v + ' 已加入最小生成树，已选集合 = {' +
          g.verts.filter(function (x, k) { return inTree[k]; }).join('，') + '}，当前总权值 = ' + total,
          snap('已加入 ' + mst.length + ' 条边，总权值 ' + total));
        curEdge = -1;
      }
      push(st, [6], '最小生成树构造完成：共 ' + mst.length + ' 条边，总权值 = ' + total + '：' +
        mst.map(function (ei) { return g.edges[ei].u + '-' + g.edges[ei].v + '(' + g.edges[ei].w + ')'; }).join('，'),
        snap('最小生成树完成'));
      return st;
    },
    render: function (kr, s) {
      if (!s) { kr.html('__e', S.text(500, 300, '（尚未开始，点击「开始演示」构造最小生成树）', 'vs')); kr.end(); return; }
      base(kr, s, 508);
      drawRow(kr, '__mst', '已加入生成树的边（格子下方为权值）', s.edgesRow, 570, { cw: 52 });
      kr.html('__tt', S.text(500, 640, '当前总权值 = ' + s.total, 'vt'));
      kr.end();
    }
  });

  /* ============================================================
     6. 拓扑排序（入度数组法）
     ============================================================ */
  DSV.register({
    id: 'topo-indegree', name: '拓扑排序（入度数组法）', category: CAT,
    desc: '本算法固定按有向图处理：每条 "u v" 解释为一条有向边 u → v。先统计各顶点入度，把入度为 0 的顶点入队，反复出队输出并把后继入度减 1。时间 O(V+E)。若输出顶点数少于总顶点数，说明图中存在环。',
    viewBox: '0 0 1000 740',
    code: [
      'topoSortByIndegree(G):',
      '  统计所有顶点的入度 indeg[v]',
      '  Q = 所有 indeg[v] == 0 的顶点',
      '  while Q 非空:',
      '    u = Q.dequeue(); 输出 u',
      '    for v in adj[u]:            // u → v',
      '      indeg[v] = indeg[v] - 1',
      '      if indeg[v] == 0: Q.enqueue(v)',
      '  if 输出顶点数 < |V|: 图中存在环，无法拓扑排序'
    ],
    inputs: [inEdges(DAG1)],
    samples: [
      { label: '示例：有向无环图', values: { edges: DAG1 } },
      { label: '示例：另一个 DAG', values: { edges: DAG2 } },
      { label: '示例：含环（无法排序）', values: { edges: CYC } }
    ],
    random: function () { return { edges: randomEdges(true) }; },
    run: function (v) {
      var g = parseGraph(v.edges, true);
      if (!g.verts.length) { return []; }
      var st = [], n = g.verts.length, vi = vmap(g.verts), m = g.edges.length, i;
      var indeg = [], vc = clsArr(n), ec = clsArr(m), q = [], out = [];
      for (i = 0; i < n; i++) { indeg.push(0); }
      g.edges.forEach(function (e) { indeg[vi[e.v]]++; });
      function snap(sub) {
        var ig = [], vs = [];
        for (var t = 0; t < n; t++) {
          ig.push({ v: String(indeg[t]), cls: indeg[t] === 0 ? 'done' : '', m: g.verts[t] });
          vs[t] = '入' + indeg[t];
        }
        return {
          verts: g.verts, edges: g.edges, vc: vc.slice(), ec: ec.slice(), vsub: vs,
          directed: true, weighted: g.weighted, title: '拓扑排序 · 入度数组法（有向图 u → v）',
          sub: sub || '', warn: '',
          indeg: ig,
          queue: q.map(function (x, k) { return { v: g.verts[x], cls: k === 0 ? 'active' : 'compare', m: k === 0 ? '队首' : '' }; }),
          out: out.map(function (x) { return { v: g.verts[x], cls: 'done' }; })
        };
      }
      var degTxt = g.verts.map(function (x, k) { return x + ':' + indeg[k]; }).join('，');
      push(st, [0, 1], '统计各顶点入度（"u v" 表示 u → v，v 的入度加 1）：' + degTxt, snap('入度表已建立'));
      for (i = 0; i < n; i++) { if (indeg[i] === 0) { q.push(i); vc[i] = 'compare'; } }
      push(st, [2], '把所有入度为 0 的顶点入队：[' + q.map(function (x) { return g.verts[x]; }).join(', ') + ']',
        snap('入度 0 的顶点入队'));
      var guard = 0;
      while (q.length && guard++ < 500) {
        var u = q.shift();
        vc[u] = 'active';
        push(st, [3, 4], '出队队首顶点 ' + g.verts[u] + '（入度为 0），把它输出到拓扑序列',
          snap('输出 ' + g.verts[u]));
        out.push(u); vc[u] = 'done';
        var nb = g.adj[g.verts[u]] || [];
        for (var t2 = 0; t2 < nb.length; t2++) {
          var w = nb[t2].v, ei = nb[t2].i, wi = vi[w];
          ec[ei] = 'hl'; vc[wi] = 'compare';
          push(st, [5, 6], '处理有向边 ' + g.verts[u] + ' → ' + w + '：把它删去，入度 ' + indeg[wi] + ' 减为 ' + (indeg[wi] - 1),
            snap('松弛 ' + g.verts[u] + ' → ' + w));
          indeg[wi]--; ec[ei] = 'done';
          if (indeg[wi] === 0) {
            q.push(wi); vc[wi] = 'compare';
            push(st, [7], w + ' 的入度变为 0，入队：[' + q.map(function (x) { return g.verts[x]; }).join(', ') + ']',
              snap(w + ' 入队'));
          } else {
            vc[wi] = '';
            push(st, [7], w + ' 的入度还有 ' + indeg[wi] + '，暂时不能入队', snap(w + ' 入度 ' + indeg[wi]));
          }
        }
      }
      if (out.length < n) {
        var cyc = [];
        for (i = 0; i < n; i++) { if (out.indexOf(i) < 0) { cyc.push(g.verts[i]); vc[i] = 'dead'; } }
        var s2 = snap('存在环');
        s2.warn = '图中存在环，无法拓扑排序！剩余顶点：' + cyc.join('，');
        push(st, [8], '队列已空但只输出了 ' + out.length + '/' + n + ' 个顶点，剩余顶点 ' + cyc.join('，') +
          ' 的入度始终不为 0，说明图中存在环', s2);
      } else {
        push(st, [8], '拓扑排序完成，共输出 ' + n + ' 个顶点：' + out.map(function (x) { return g.verts[x]; }).join(' → '),
          snap('拓扑排序完成'));
      }
      return st;
    },
    render: function (kr, s) {
      if (!s) { kr.html('__e', S.text(500, 300, '（尚未开始，点击「开始演示」运行拓扑排序）', 'vs')); kr.end(); return; }
      base(kr, s, 508);
      drawRow(kr, '__ig', '入度表（格子下方为顶点名）', s.indeg, 550, { cw: 44 });
      drawRow(kr, '__q', '队列（入度为 0 的顶点，左端为队首）', s.queue, 626, { cw: 44 });
      drawRow(kr, '__o', '输出序列（拓扑序）', s.out, 702, { cw: 44 });
      kr.end();
    }
  });

  /* ============================================================
     7. 拓扑排序（DFS 法）
     ============================================================ */
  DSV.register({
    id: 'topo-dfs', name: '拓扑排序（DFS 法）', category: CAT,
    desc: '本算法固定按有向图处理：每条 "u v" 解释为一条有向边 u → v。对有向无环图做深度优先搜索，按完成时间 f 递减（即逆后序）输出即为拓扑序；DFS 中遇到灰色结点说明有回边、图中存在环。时间 O(V+E)。',
    viewBox: '0 0 1000 700',
    code: [
      'topoSortByDFS(G):',
      '  S = 空栈                          // 结果栈',
      '  for s in V: if color[s] == 白: DFS-Visit(s)',
      '  依次弹出 S 得到拓扑序（f 从大到小）',
      '',
      'DFS-Visit(u):',
      '  color[u] = 灰',
      '  for v in adj[u]:                  // u → v',
      '    if color[v] == 灰: 发现回边，存在环',
      '    if color[v] == 白: DFS-Visit(v)',
      '  color[u] = 黑; f[u] = ++time',
      '  S.push(u)                         // 完成后压栈'
    ],
    inputs: [inEdges(DAG1)],
    samples: [
      { label: '示例：有向无环图', values: { edges: DAG1 } },
      { label: '示例：另一个 DAG', values: { edges: DAG2 } },
      { label: '示例：含环（无法排序）', values: { edges: CYC } }
    ],
    random: function () { return { edges: randomEdges(true) }; },
    run: function (v) {
      var g = parseGraph(v.edges, true);
      if (!g.verts.length) { return []; }
      var st = [], n = g.verts.length, vi = vmap(g.verts), m = g.edges.length, i;
      var color = {}, d = {}, f = {}, stack = [], rstack = [], order = [];
      var vc = clsArr(n), ec = clsArr(m), timer = 0, hasCycle = false;
      for (i = 0; i < n; i++) { color[g.verts[i]] = 'white'; d[g.verts[i]] = 0; f[g.verts[i]] = 0; }
      function snap(sub) {
        var vs = [];
        for (var t = 0; t < n; t++) {
          var x = g.verts[t];
          vs[t] = 'f=' + (f[x] ? f[x] : '·');
        }
        return {
          verts: g.verts, edges: g.edges, vc: vc.slice(), ec: ec.slice(), vsub: vs,
          directed: true, weighted: g.weighted, title: '拓扑排序 · DFS 法（按完成时间 f 递减输出）',
          sub: sub || '', warn: '',
          stack: stack.map(function (x, k) { return { v: x, cls: k === stack.length - 1 ? 'active' : 'compare' }; }),
          rstack: rstack.map(function (x) { return { v: x, cls: 'path' }; }),
          order: order.map(function (x) { return { v: x, cls: 'done' }; })
        };
      }
      function dfs(u) {
        color[u] = 'gray'; d[u] = ++timer; stack.push(u); vc[vi[u]] = 'active';
        push(st, [5], '进入 ' + u + '：置为灰色并压入递归栈，栈 = [' + stack.join(' ') + ']', snap('递归深入 ' + u));
        var nb = g.adj[u] || [];
        for (var t = 0; t < nb.length; t++) {
          var w = nb[t].v, ei = nb[t].i;
          ec[ei] = 'hl';
          if (color[w] === 'gray') {
            hasCycle = true; ec[ei] = 'swap';
            var s2 = snap('发现回边');
            s2.warn = '发现回边 ' + u + ' → ' + w + '：图中存在环，无法拓扑排序！';
            push(st, [8], '检查有向边 ' + u + ' → ' + w + '：' + w + ' 仍是灰色（在递归栈中），这是回边，说明图中存在环', s2);
          } else if (color[w] === 'white') {
            push(st, [9], '检查有向边 ' + u + ' → ' + w + '：' + w + ' 尚未访问，递归进入 ' + w, snap('递归进入 ' + w));
            ec[ei] = 'path';
            dfs(w);
          } else {
            push(st, [7], '检查有向边 ' + u + ' → ' + w + '：' + w + ' 已完成（黑色），是前向边或横叉边，直接跳过',
              snap('跳过已完成的 ' + w));
            ec[ei] = '';
          }
        }
        color[u] = 'black'; f[u] = ++timer; vc[vi[u]] = 'done'; stack.pop(); rstack.push(u);
        push(st, [10, 11], u + ' 的所有后继处理完：置为黑色，完成时间 f[' + u + '] = ' + f[u] + '，把 ' + u + ' 压入结果栈',
          snap(u + ' 完成并压入结果栈'));
      }
      push(st, [0, 1], '初始化：结果栈为空，所有顶点为白色，准备逐个做深度优先搜索', snap('初始化'));
      for (i = 0; i < n; i++) {
        if (color[g.verts[i]] === 'white') {
          push(st, [2], '顶点 ' + g.verts[i] + ' 仍是白色，从它开始一次深度优先搜索', snap('从 ' + g.verts[i] + ' 开始'));
          dfs(g.verts[i]);
        }
      }
      if (hasCycle) {
        var s4 = snap('存在环，无法拓扑排序');
        s4.warn = '图中存在环，无法拓扑排序！';
        push(st, [3], '深度优先搜索中发现了回边，图中存在环，无法得到拓扑序列', s4);
        return st;
      }
      push(st, [3], '深度优先搜索全部结束，结果栈（栈底→栈顶）= [' + rstack.join('，') + ']，开始依次弹出',
        snap('开始弹出结果栈'));
      for (i = rstack.length - 1; i >= 0; i--) {
        order.push(rstack[i]);
        var s3 = snap('弹出 ' + rstack[i]);
        s3.rstack = rstack.slice(0, i).map(function (x) { return { v: x, cls: 'path' }; });
        push(st, [3], '弹出栈顶 ' + rstack[i] + '（f = ' + f[rstack[i]] + '），加入拓扑序列：' + order.join(' → '), s3);
      }
      push(st, [3], '拓扑排序完成：' + order.join(' → '), snap('拓扑排序完成'));
      return st;
    },
    render: function (kr, s) {
      if (!s) { kr.html('__e', S.text(500, 300, '（尚未开始，点击「开始演示」运行拓扑排序）', 'vs')); kr.end(); return; }
      base(kr, s, 508);
      drawRow(kr, '__st', '递归栈（右端为栈顶 = 当前顶点）', s.stack, 550, { cw: 44 });
      drawRow(kr, '__rs', '结果栈（左端为栈底，右端为栈顶）', s.rstack, 628, { cw: 44 });
      drawRow(kr, '__od', '拓扑序列（按 f 递减依次弹出）', s.order, 686, { cw: 44 });
      kr.end();
    }
  });

  /* ============================================================
     8. Floyd-Warshall 全源最短路
     ============================================================ */
  DSV.register({
    id: 'floyd', name: 'Floyd-Warshall 全源最短路', category: CAT,
    desc: '动态规划：三重循环 k、i、j，尝试用顶点 k 作中转点来缩短 i 到 j 的距离，即判断 D[i][k]+D[k][j] < D[i][j]。可处理负权边（不能有负权环）。时间 O(V³)，空间 O(V²)。为保证动画可读，顶点数请 ≤ 6。',
    viewBox: '0 0 1000 700',
    code: [
      'Floyd-Warshall(D):',
      '  初始化：D[i][i] = 0，有边则 D[u][v] = w，其余为 ∞',
      '  for k = 0 to n-1:',
      '    for i = 0 to n-1:',
      '      for j = 0 to n-1:',
      '        if D[i][k] + D[k][j] < D[i][j]:',
      '          D[i][j] = D[i][k] + D[k][j]',
      '  return D'
    ],
    inputs: [inEdges(G5)],
    samples: [
      { label: '示例：5 顶点有权图', values: { edges: G5 } },
      { label: '示例：6 顶点有权图', values: { edges: G6 } },
      { label: '示例：三角形小图', values: { edges: G3 } }
    ],
    random: function () {
      // 顶点数控制在 6 以内，保证矩阵与步骤数可读
      var lines = randomEdges(false).split('\n'), keep = {}, out = [], i;
      var lim = ['A', 'B', 'C', 'D', 'E', 'F'];
      for (i = 0; i < lines.length && out.length < 10; i++) {
        var t = lines[i].split(/\s+/);
        if (lim.indexOf(t[0]) >= 0 && lim.indexOf(t[1]) >= 0) {
          var k = t[0] < t[1] ? t[0] + '-' + t[1] : t[1] + '-' + t[0];
          if (!keep[k]) { keep[k] = 1; out.push(lines[i]); }
        }
      }
      return { edges: out.join('\n') };
    },
    run: function (v) {
      var g = parseGraph(v.edges, false);
      if (!g.verts.length) { return []; }
      var n = g.verts.length;
      if (n > 6) {
        return [{
          code: [1],
          desc: '当前图有 ' + n + ' 个顶点，Floyd-Warshall 需要 O(V³) = ' + (n * n * n) +
            ' 次判断，动画步骤过多。请把顶点数控制在 6 个以内（例如只保留 A…F）。',
          snap: {
            verts: [], edges: [], vc: [], ec: [], directed: false, weighted: false,
            title: 'Floyd-Warshall 全源最短路', sub: '', warn: '',
            tooBig: '顶点数 = ' + n + ' > 6，无法演示：请把顶点数控制在 6 个以内再运行'
          }
        }];
      }
      var st = [], vi = vmap(g.verts), m = g.edges.length, i, j, k;
      var D = [];
      for (i = 0; i < n; i++) {
        D.push([]);
        for (j = 0; j < n; j++) { D[i].push(i === j ? 0 : INF()); }
      }
      g.edges.forEach(function (e) {
        var a = vi[e.u], b = vi[e.v];
        if (e.w < D[a][b]) { D[a][b] = e.w; D[b][a] = e.w; }
      });
      var vc = clsArr(n), ec = clsArr(m);
      function snap(kk, ii, jj, upd) {
        var cp = [];
        for (var a = 0; a < n; a++) { cp.push(D[a].slice()); }
        return {
          verts: g.verts, edges: g.edges, vc: vc.slice(), ec: ec.slice(), vsub: [],
          directed: false, weighted: true, title: 'Floyd-Warshall 全源最短路（n = ' + n + '）',
          sub: '', warn: '', D: cp, k: kk, ci: ii, cj: jj, upd: !!upd,
          round: kk >= 0 ? ('第 ' + (kk + 1) + ' / ' + n + ' 轮：中转点 k = ' + g.verts[kk]) : '初始化距离矩阵'
        };
      }
      push(st, [0, 1], '初始化距离矩阵：对角线 D[i][i] = 0，每条边的权值填入 D[u][v] 与 D[v][u]，其余为 ∞',
        snap(-1, -1, -1, false));
      for (k = 0; k < n; k++) {
        vc = clsArr(n); vc[k] = 'active';
        push(st, [2], '第 ' + (k + 1) + ' 轮：以顶点 ' + g.verts[k] + ' 作为中转点 k，检查全部 ' + (n * n) + ' 个 (i, j) 组合',
          snap(k, -1, -1, false));
        for (i = 0; i < n; i++) {
          for (j = 0; j < n; j++) {
            var via = D[i][k] + D[k][j], cur = D[i][j], upd = false;
            if (i === k || j === k || i === j) {
              push(st, [5], '(' + g.verts[i] + ',' + g.verts[j] + ')：' +
                (i === k ? 'i 就是中转点 k' : (j === k ? 'j 就是中转点 k' : 'i == j，对角线恒为 0')) +
                '，D[i][k]+D[k][j] = ' + distTxt(via) + ' 不会小于 ' + distTxt(cur) + '，跳过',
                snap(k, i, j, false));
              continue;
            }
            if (via < cur) { D[i][j] = via; upd = true; }
            vc = clsArr(n); vc[k] = 'active'; vc[i] = 'compare'; vc[j] = 'compare';
            push(st, [5, 6], '(' + g.verts[i] + ',' + g.verts[j] + ')：D[' + g.verts[i] + '][' + g.verts[k] + '] + D[' +
              g.verts[k] + '][' + g.verts[j] + '] = ' + distTxt(D[i][k]) + ' + ' + distTxt(D[k][j]) + ' = ' + distTxt(via) +
              '，与 D[' + g.verts[i] + '][' + g.verts[j] + '] = ' + distTxt(cur) + ' 比较：' +
              (upd ? '更小，更新为 ' + distTxt(via) + '（即 ' + g.verts[i] + ' → … → ' + g.verts[k] + ' → … → ' + g.verts[j] + ' 更近）'
                : '不小于原值，保持不变'),
              snap(k, i, j, upd));
          }
        }
      }
      vc = clsArr(n);
      var txt = [];
      for (i = 0; i < n; i++) {
        var row = [];
        for (j = 0; j < n; j++) { row.push(distTxt(D[i][j])); }
        txt.push(g.verts[i] + ' → [' + row.join(', ') + ']');
      }
      push(st, [7], '全部 ' + n + ' 轮处理完毕，得到全源最短距离矩阵：' + txt.join('；'),
        snap(-1, -1, -1, false));
      return st;
    },
    render: function (kr, s) {
      if (!s) { kr.html('__e', S.text(500, 300, '（尚未开始，点击「开始演示」运行 Floyd-Warshall）', 'vs')); kr.end(); return; }
      if (s.tooBig) {
        kr.html('__t', S.text(500, 26, s.title || 'Floyd-Warshall', 'vt'));
        kr.html('__w', S.text(500, 300, s.tooBig, 'vwarn'));
        kr.end();
        return;
      }
      base(kr, s, 508);
      var n = s.verts.length, cw = 54, ch = 30, i, j;
      var x0 = 500 - (n * cw) / 2, y0 = 512;
      kr.html('__rt', S.textL(56, 486, s.round || '', 'vs'));
      kr.html('__ml', S.textL(x0 - 52, y0 - 18, 'D[i][j]', 'vs'));
      for (j = 0; j < n; j++) {
        kr.g('hc' + j, 'translate(' + (x0 + j * cw + cw / 2) + ',' + (y0 - 18) + ')', 'k',
          S.text(0, 0, s.verts[j], 'vs'));
      }
      for (i = 0; i < n; i++) {
        kr.g('hr' + i, 'translate(' + (x0 - 20) + ',' + (y0 + i * ch + ch / 2) + ')', 'k',
          S.text(0, 0, s.verts[i], 'vs'));
        for (j = 0; j < n; j++) {
          var cls = '';
          if (i === s.ci && j === s.cj) { cls = s.upd ? 'swap' : 'active'; }
          else if (i === s.k) { cls = 'compare'; }
          else if (j === s.k) { cls = 'compare'; }
          else if (i === j) { cls = 'done'; }
          kr.g('m' + i + '_' + j, 'translate(' + (x0 + j * cw + cw / 2) + ',' + (y0 + i * ch + ch / 2) + ')', 'k',
            '<rect class="cell ' + cls + '" x="' + (-cw / 2 + 3) + '" y="' + (-ch / 2 + 2) +
            '" width="' + (cw - 6) + '" height="' + (ch - 4) + '" rx="4"/>' +
            S.text(0, 0, distTxt(s.D[i][j]), 'cell-txt'));
        }
      }
      kr.end();
    }
  });

  /* ============================================================
     9. Kruskal 最小生成树
     ============================================================ */
  DSV.register({
    id: 'kruskal', name: 'Kruskal 最小生成树', category: CAT,
    desc: '把所有边按权值升序排序，用并查集逐条判断：两端不在同一集合就加入最小生成树并合并集合，否则丢弃（否则会形成环）。时间 O(E logE)，空间 O(V)。',
    viewBox: '0 0 1000 700',
    code: [
      'Kruskal(G):',
      '  把 E 中所有边按权值 w 升序排序',
      '  初始化并查集：每个顶点各自成一个集合',
      '  MST = []; total = 0',
      '  for (u, v, w) in 已排序边列表:',
      '    if find(u) != find(v):',
      '      MST.add((u,v,w)); union(u,v); total += w',
      '    else: 舍弃（两端已连通，加入会形成环）',
      '  return MST, total'
    ],
    inputs: [inEdges(G6)],
    samples: [
      { label: '示例：6 顶点有权图', values: { edges: G6 } },
      { label: '示例：5 顶点有权图', values: { edges: G5 } },
      { label: '示例：三角形小图', values: { edges: G3 } }
    ],
    random: function () { return rndVal(false); },
    run: function (v) {
      var g = parseGraph(v.edges, false);
      if (!g.verts.length) { return []; }
      var st = [], n = g.verts.length, vi = vmap(g.verts), m = g.edges.length, i;
      var par = [], mst = [], total = 0;
      var vc = clsArr(n), ec = clsArr(m), curEdge = -1, curCls = '';
      for (i = 0; i < n; i++) { par.push(i); }
      function find(x) { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; }
      var list = [];
      for (i = 0; i < m; i++) { list.push(i); }
      list.sort(function (a, b) { return g.edges[a].w - g.edges[b].w; });
      function snap(sub) {
        var e = ec.slice();
        if (curEdge >= 0) { e[curEdge] = curCls || 'hl'; }
        var vs = [];
        for (var t = 0; t < n; t++) { vs[t] = '∈' + g.verts[find(t)]; }
        return {
          verts: g.verts, edges: g.edges, vc: vc.slice(), ec: e, vsub: vs,
          directed: false, weighted: true, title: 'Kruskal 最小生成树（并查集 + 边按权升序）',
          sub: sub || '', warn: '',
          list: list.map(function (ei, k) {
            var cls = ec[ei];
            if (k === curEdge) { cls = curCls || 'hl'; }
            else if (mst.indexOf(ei) >= 0) { cls = 'path'; }
            else if (ec[ei].indexOf('dead') >= 0) { cls = 'dead'; }
            return { v: g.edges[ei].u + '-' + g.edges[ei].v, cls: cls, m: String(g.edges[ei].w) };
          }),
          mstRow: mst.map(function (ei) { return { v: g.edges[ei].u + '-' + g.edges[ei].v, cls: 'path', m: String(g.edges[ei].w) }; }),
          total: total
        };
      }
      push(st, [0, 1], '把所有 ' + m + ' 条边按权值升序排序：' +
        list.map(function (ei) { return g.edges[ei].u + '-' + g.edges[ei].v + '(' + g.edges[ei].w + ')'; }).join('，'),
        snap('边已排序'));
      push(st, [2, 3], '初始化并查集：' + n + ' 个顶点各自成一个集合，最小生成树为空，总权值 0',
        snap('并查集初始化'));
      for (i = 0; i < list.length; i++) {
        var ei = list[i], e = g.edges[ei], iu = vi[e.u], iv = vi[e.v];
        curEdge = i; curCls = 'hl'; vc[iu] = 'active'; vc[iv] = 'active';
        push(st, [4], '考虑第 ' + (i + 1) + ' 条边 ' + e.u + '—' + e.v + '（权 ' + e.w + '）',
          snap('检查边 ' + e.u + '—' + e.v));
        var ru = find(iu), rv = find(iv);
        if (ru === rv) {
          vc[iu] = ''; vc[iv] = '';
          push(st, [7], 'find(' + e.u + ') = ' + g.verts[ru] + ' 与 find(' + e.v + ') = ' + g.verts[rv] +
            ' 相同，两端已在同一集合，加入会形成环，舍弃这条边', snap('舍弃 ' + e.u + '—' + e.v));
          ec[ei] = 'dead dim'; curCls = 'dead';
          push(st, [7], '边 ' + e.u + '—' + e.v + '（权 ' + e.w + '）被丢弃（画面中变灰）', snap('已丢弃'));
        } else {
          push(st, [5, 6], 'find(' + e.u + ') = ' + g.verts[ru] + '，find(' + e.v + ') = ' + g.verts[rv] +
            '，两者不同：加入最小生成树并合并两个集合，总权值 ' + total + ' + ' + e.w + ' = ' + (total + e.w),
            snap('加入 ' + e.u + '—' + e.v));
          mst.push(ei); total += e.w; ec[ei] = 'path'; curCls = 'path';
          par[rv] = ru;
          vc[iu] = 'path'; vc[iv] = 'path';
          push(st, [6], '边 ' + e.u + '—' + e.v + ' 已加入（紫色），当前生成树有 ' + mst.length + ' 条边，总权值 = ' + total,
            snap('已加入 ' + mst.length + ' 条边'));
        }
        vc[iu] = ''; vc[iv] = '';
        curEdge = -1;
      }
      for (i = 0; i < n; i++) { if (mst.length >= 0) { vc[i] = 'path'; } }
      if (mst.length < n - 1) {
        var s2 = snap('最小生成森林');
        s2.warn = '图不连通：只得到 ' + mst.length + ' 条边的最小生成森林（连通图应为 ' + (n - 1) + ' 条）';
        push(st, [8], '处理完所有边，但只加入了 ' + mst.length + ' 条（连通图应有 ' + (n - 1) +
          ' 条），说明原图不连通，得到的是最小生成森林，总权值 = ' + total, s2);
      } else {
        push(st, [8], '最小生成树构造完成：共 ' + (n - 1) + ' 条边，总权值 = ' + total + '：' +
          mst.map(function (x) { return g.edges[x].u + '-' + g.edges[x].v + '(' + g.edges[x].w + ')'; }).join('，'),
          snap('最小生成树完成'));
      }
      return st;
    },
    render: function (kr, s) {
      if (!s) { kr.html('__e', S.text(500, 300, '（尚未开始，点击「开始演示」运行 Kruskal）', 'vs')); kr.end(); return; }
      base(kr, s, 508);
      drawRow(kr, '__el', '已按权值升序排序的边列表（格子下方为权值）', s.list, 552, { cw: 52 });
      drawRow(kr, '__ms', '最小生成树 MST 已选边', s.mstRow, 640, { cw: 52 });
      kr.html('__tt', S.text(500, 686, '当前总权值 = ' + s.total, 'vt'));
      kr.end();
    }
  });

  /* ============================================================
     11. A*（A-star）启发式搜索
     ============================================================ */

  /* ---------------- 启发式函数构造 ----------------
     依据输入框字符串解析出 h(v) -> 非负实数：
       "0" / "dijkstra" / 空      → h(v)=0（退化为 Dijkstra，恒可采纳、必最优）
       "直线距离" / "line" / "euclid" → 按画布圆形布局的欧氏距离 h(v)=dist(pos[v], pos[end])
                                      （直观演示启发式的引导作用；在任意边权下未必可采纳，仅供演示）
       其它（自定义）             → 每行 "顶点 估值"，其余顶点 h=0
     注：A* 要得到「最优」路径，h 必须满足可采纳性 h(v) ≤ 真实最小剩余代价；
         否则可能提前锁定次优路径。h=0 永远可采纳。
  ------------------------------------------------ */
  function buildHeuristic(g, hstr, end) {
    var lower = String(hstr == null ? '' : hstr).trim().toLowerCase();
    if (!lower || lower === '0' || lower === 'dijkstra' || lower === '无' || lower === '零') {
      return function () { return 0; };
    }
    if (lower.indexOf('直线') >= 0 || lower === 'line' || lower === 'euclid' || lower === '欧氏' || lower === 'euclidean') {
      var pos = layout(g.verts);
      var pe = pos[end] || { x: 0, y: 0 };
      return function (v) {
        var p = pos[v];
        if (!p) { return 0; }
        return Math.round(Math.sqrt((p.x - pe.x) * (p.x - pe.x) + (p.y - pe.y) * (p.y - pe.y)));
      };
    }
    // 自定义：逐行 "顶点 估值"
    var tbl = {}, toks = String(hstr).split(/[\s,，;；\n\r]+/).filter(function (t) { return t !== ''; });
    var j = 0;
    while (j + 1 < toks.length) {
      var vv = toks[j], hh = Number(toks[j + 1]);
      if (isFinite(hh) && hh >= 0 && g.verts.indexOf(vv) >= 0) { tbl[vv] = Math.round(hh); }
      j += 2;
    }
    return function (v) { return tbl[v] || 0; };
  }

  /**
   * A* 搜索（公开清晰接口）
   * @param {Object}   graph   由 parseGraph(edges, directed) 得到，含 verts / adj
   * @param {string}   start   起点顶点名
   * @param {string}  end      终点顶点名
   * @param {Function} h       启发式函数 h(v) -> 非负实数，估计顶点 v 到 end 的剩余代价
   *                           （满足可采纳性 h(v) ≤ 真实最小剩余代价时可保证最优解）
   * @returns {{found:boolean, path:string[], cost:number}}
   *   found=true  : 找到路径，path 为 起点→终点 的顶点序列，cost 为路径总代价（边权之和）
   *   found=false : 终点不可达（与起点不连通），path=[]，cost=Infinity
   *
   * 时间复杂度：每个顶点最多入开放列表一次并扩展一次，每条边最多松弛一次；
   *   用线性扫描取 f 最小 → O(V·(V+E))；若开放列表用二叉堆 → O((V+E) log V)。
   * 空间复杂度：O(V+E)（存储 g/f/prev 与邻接表、开放/关闭集合）。
   */
  function aStar(graph, start, end, h) {
    var verts = graph.verts, vi = vmap(verts), n = verts.length;
    if (vi[start] == null || vi[end] == null) {
      return { found: false, path: [], cost: Infinity };
    }
    var g = [], f = [], prev = [], inOpen = [], inClosed = [], i;
    for (i = 0; i < n; i++) { g.push(INF()); f.push(INF()); prev.push(null); inOpen.push(false); inClosed.push(false); }
    var s = vi[start], t = vi[end];
    g[s] = 0; f[s] = h(start); inOpen[s] = true;
    while (true) {
      // 从开放列表中取出 f = g + h 最小的顶点（线性扫描；工程可用二叉堆 O(log n)）
      var u = -1, bestF = INF();
      for (i = 0; i < n; i++) { if (inOpen[i] && f[i] < bestF) { bestF = f[i]; u = i; } }
      if (u < 0) { break; }                                   // 开放列表空 → 终点不可达
      inOpen[u] = false; inClosed[u] = true;
      if (u === t) { break; }                                 // 到达终点
      var nb = graph.adj[verts[u]] || [];
      for (i = 0; i < nb.length; i++) {
        var w = nb[i].v, wt = nb[i].w, wi = vi[w];
        if (inClosed[wi]) { continue; }                       // 已确定最优，不再松弛
        var tg = g[u] + wt;                                   // 经过 u 到达 w 的 tentative 代价
        if (tg < g[wi]) {
          prev[wi] = u;
          g[wi] = tg;
          f[wi] = tg + h(w);
          inOpen[wi] = true;
        }
      }
    }
    if (g[t] === INF()) { return { found: false, path: [], cost: Infinity }; }
    // 沿前驱回溯路径
    var path = [], cur = t;
    while (cur !== null) { path.unshift(verts[cur]); cur = prev[cur]; }
    if (path[0] !== start) { return { found: false, path: [], cost: Infinity }; }
    return { found: true, path: path, cost: g[t] };
  }
  // 公开清晰接口：可直接 window.DSV.aStar(graph, start, end, h) 调用
  DSV.aStar = aStar;
  // 配套：把"边表字符串"解析成图对象，再传给 aStar
  DSV.parseGraph = parseGraph;

  DSV.register({
    id: 'astar', name: 'A* 启发式搜索', category: CAT,
    desc: '在 Dijkstra 基础上引入启发式 h(v)：用 f(v)=g(v)+h(v) 作为优先估计，每次扩展开放列表中 f 最小的顶点，从而优先朝终点方向搜索、减少扩展节点数。h=0 时退化为 Dijkstra（必最优）；h 可采纳时同样最优但更快。时间 O(V·(V+E))（线性取最小）/ 二叉堆 O((V+E)logV)，空间 O(V+E)。终点不可达时返回 found=false。',
    viewBox: '0 0 1000 920',
    code: [
      'A*(G, s, t, h):',
      '  for v in V: g[v]=∞; f[v]=∞; prev[v]=null; closed=false',
      '  g[s]=0; f[s]=h(s); open={s}',
      '  while open 非空:',
      '    u = open 中 f 最小的顶点; 从 open 移除, 标记 closed',
      '    if u == t: return 回溯 prev 得到路径',
      '    for (u,v,w) in adj[u]:',
      '      if v 已 closed: continue',
      '      if g[u]+w < g[v]:',
      '        g[v]=g[u]+w; f[v]=g[v]+h(v); prev[v]=u; open.add(v)',
      '  return 终点不可达'
    ],
    inputs: [inEdges(G6), inStart('A'), inEnd('F'), inHeur('0')],
    samples: [
      { label: '示例：6 顶点图（h=0，等价于 Dijkstra）', values: { edges: G6, start: 'A', end: 'F', heuristic: '0' } },
      { label: '示例：6 顶点图（直线距离启发式，直观演示）', values: { edges: G6, start: 'A', end: 'F', heuristic: '直线距离' } },
      { label: '示例：终点不可达', values: { edges: 'A B 3\nA C 2\nB C 1\nX Y 4', start: 'A', end: 'Y', heuristic: '0' } }
    ],
    random: function () { return { edges: randomEdges(false), start: 'A', end: 'F' }; },
    run: function (v) {
      var g = parseGraph(v.edges, false);
      if (!g.verts.length) { return []; }
      var st = [], n = g.verts.length, vi = vmap(g.verts), m = g.edges.length, i;
      var start = (v.start && vi[v.start] != null) ? v.start : g.verts[0];
      var end = (v.end && vi[v.end] != null) ? v.end : g.verts[n - 1];
      var h = buildHeuristic(g, v.heuristic, end);
      var G = [], F = [], prev = [], inOpen = [], inClosed = [];
      var ec = clsArr(m), pathE = [];
      var curEdge = -1, curCls = '', curU = -1, curW = -1;
      for (i = 0; i < n; i++) { G.push(INF()); F.push(INF()); prev.push(null); inOpen.push(false); inClosed.push(false); }
      G[vi[start]] = 0; F[vi[start]] = h(start); inOpen[vi[start]] = true;
      var lastPath = [], found = false;
      function ecArr() {
        var e = ec.slice();
        for (var tp = 0; tp < n; tp++) { if (pathE[tp] >= 0) { e[pathE[tp]] = 'path'; } }
        if (curEdge >= 0) { e[curEdge] = curCls || 'hl'; }
        return e;
      }
      function snap(sub) {
        var ev = [];
        for (var t = 0; t < n; t++) {
          var c = '';
          if (inClosed[t]) { c = 'done'; }
          else if (inOpen[t]) { c = 'open'; }
          if (t === curU && !inClosed[t]) { c = 'active'; }
          if (t === curW && !inClosed[t] && c !== 'active') { c = 'compare'; }
          if (lastPath.length && lastPath.indexOf(g.verts[t]) >= 0) { c = 'path'; }
          ev[t] = c;
        }
        var openStr = [];
        for (var o = 0; o < n; o++) { if (inOpen[o]) { openStr.push(g.verts[o] + '(f=' + distTxt(F[o]) + ')'); } }
        return {
          verts: g.verts, edges: g.edges, vc: ev, ec: ecArr(), vsub: [],
          directed: false, weighted: true,
          title: 'A* 搜索（起点 ' + start + ' → 终点 ' + end + '）',
          sub: sub || '', warn: '',
          heads: g.verts.map(function (x, k) { return { v: x, cls: (inClosed[k] ? 'done' : (inOpen[k] ? 'open' : '')) }; }),
          gs: g.verts.map(function (x, k) { return { v: distTxt(G[k]), cls: (inClosed[k] ? 'done' : (inOpen[k] ? 'open' : '')), m: x }; }),
          fs: g.verts.map(function (x, k) { return { v: distTxt(F[k]), cls: (inClosed[k] ? 'done' : (inOpen[k] ? 'open' : '')), m: x }; }),
          hs: g.verts.map(function (x, k) { return { v: distTxt(h(x)), cls: (inClosed[k] ? 'done' : (inOpen[k] ? 'open' : '')), m: x }; }),
          ps: g.verts.map(function (x, k) { return { v: prev[k] === null ? '—' : g.verts[prev[k]], cls: (inClosed[k] ? 'done' : ''), m: x }; }),
          openStr: openStr
        };
      }
      push(st, [0, 1, 2], '初始化：g[' + start + ']=0，f[' + start + ']=g+h=' + distTxt(F[vi[start]]) +
        '；其余顶点 g=∞、f=∞。开放列表={ ' + start + ' }。g 是起点到该点的实际最小代价，h 是启发式估计的剩余代价。',
        snap('初始化 g/f，开放列表={ ' + start + ' }'));
      while (true) {
        var u = -1, bestF = INF();
        for (i = 0; i < n; i++) { if (inOpen[i] && F[i] < bestF) { bestF = F[i]; u = i; } }
        if (u < 0) {
          push(st, [3], '开放列表已空，仍未到达终点 ' + end + '：起点 ' + start + ' 与终点 ' + end +
            ' 不连通，搜索失败（返回 found=false，代价 ∞）', snap('开放列表空，终点不可达'));
          break;
        }
        curU = u; inOpen[u] = false; inClosed[u] = true;
        push(st, [3, 4], '从开放列表取出 f 最小的顶点 ' + g.verts[u] + '（f=' + distTxt(F[u]) +
          '），标记为已确定（closed），准备用它的出边松弛邻居', snap('展开 ' + g.verts[u] + '（f=' + distTxt(F[u]) + '）'));
        if (u === vi[end]) {
          // 回溯路径
          lastPath = []; var c = u;
          while (c !== null) { lastPath.unshift(g.verts[c]); c = prev[c]; }
          for (var pk = 1; pk < lastPath.length; pk++) {
            var pa = lastPath[pk - 1], pb = lastPath[pk];
            for (var ei2 = 0; ei2 < m; ei2++) {
              var e2 = g.edges[ei2];
              if ((e2.u === pa && e2.v === pb) || (!g.directed && e2.u === pb && e2.v === pa)) { pathE[ei2] = ei2; break; }
            }
          }
          curU = -1;
          push(st, [5], '到达终点 ' + end + '！沿 prev 回溯得到最优路径：' + lastPath.join(' → ') +
            '，总代价 = ' + G[vi[end]], snap('找到路径：' + lastPath.join(' → ')));
          found = true;
          break;
        }
        var nb = g.adj[g.verts[u]] || [];
        for (var k = 0; k < nb.length; k++) {
          var w = nb[k].v, wt = nb[k].w, wi = vi[w], ei = nb[k].i;
          curEdge = ei; curCls = 'hl'; curW = wi;
          if (inClosed[wi]) {
            push(st, [6], '检查边 ' + g.verts[u] + '—' + w + '（权 ' + wt + '）：' + w + ' 已确定（closed），跳过松弛',
              snap(w + ' 已确定，跳过'));
            curEdge = -1; curW = -1;
            continue;
          }
          var tg = G[u] + wt;
          var better = tg < G[wi];
          push(st, [6, 7], '松弛边 ' + g.verts[u] + '—' + w + '（权 ' + wt + '）：tentative g = g[' + g.verts[u] +
            ']+w = ' + distTxt(G[u]) + '+' + wt + ' = ' + distTxt(tg) + '，与 g[' + w + ']=' + distTxt(G[wi]) +
            ' 比较：' + (better ? '更小 → 更新并加入开放列表' : '不更小 → 保持原值'),
            snap('松弛 ' + g.verts[u] + '—' + w));
          if (better) {
            prev[wi] = u; G[wi] = tg; F[wi] = tg + h(w); inOpen[wi] = true;
            curCls = 'swap';
            push(st, [8, 9], '更新 g[' + w + ']=' + tg + '，f[' + w + ']=g+h=' + distTxt(tg) + '+h(' + w + ')=' +
              distTxt(F[wi]) + '，前驱 prev[' + w + ']=' + g.verts[u] + '，' + w + ' 进入开放列表',
              snap('更新 ' + w + '：g=' + tg + '，f=' + F[wi]));
            curCls = 'path';
          }
          curEdge = -1; curW = -1;
        }
        curU = -1;
      }
      if (found) {
        push(st, [10], 'A* 完成：从 ' + start + ' 到 ' + end + ' 的最优路径 = ' + lastPath.join(' → ') +
          '，总代价 = ' + G[vi[end]] + '（共 ' + (lastPath.length - 1) + ' 条边）。开放列表最终剩余：' +
          (snap('').openStr.length ? snap('').openStr.join('，') : '空'),
          snap('完成：' + lastPath.join(' → ')));
      } else {
        push(st, [10], 'A* 结束：终点 ' + end + ' 不可达（与起点 ' + start + ' 不连通），返回 found=false、路径为空、代价 = ∞',
          snap('终点不可达'));
      }
      return st;
    },
    render: function (kr, s) {
      if (!s) { kr.html('__e', S.text(500, 320, '（尚未开始，点击「开始演示」运行 A*）', 'vs')); kr.end(); return; }
      base(kr, s, 508);
      drawRow(kr, '__h', '顶点', s.heads, 552, { cw: 44 });
      drawRow(kr, '__g', 'g：起点到该点的实际最小代价', s.gs, 628, { cw: 44 });
      drawRow(kr, '__f', 'f = g + h：A* 的优先估计（开放列表按 f 取最小）', s.fs, 704, { cw: 44 });
      drawRow(kr, '__hv', 'h：启发式估计（到终点的剩余代价）', s.hs, 780, { cw: 44 });
      drawRow(kr, '__p', 'prev：最短路径上的前驱顶点', s.ps, 856, { cw: 44 });
      if (s.openStr && s.openStr.length) {
        kr.html('__open', S.text(500, 876, '当前开放列表（按 f 排序）：' + s.openStr.join('，'), 'vs'));
      }
      kr.end();
    }
  });

  /* ============================================================
     12. Bellman-Ford 专用工具（允许负权边的有向边表解析 + 随机图）
     ------------------------------------------------------------ */
  function parseBF(str) {
    var toks = String(str == null ? '' : str)
      .split(/[\s,，;；、\/|\n\r]+/).filter(function (t) { return t !== ''; });
    var edges = [], seen = {}, i = 0;
    while (i < toks.length && edges.length < 30) {
      var u = toks[i++];
      if (i >= toks.length) { break; }
      var v = toks[i++];
      var w = 1;
      if (i < toks.length && isNumTok(toks[i])) {
        var nw = Number(toks[i]);
        if (isFinite(nw)) { w = nw; i++; }
      }
      if (!u || !v) { continue; }
      var key = u + '>' + v;
      if (seen[key]) { continue; }
      seen[key] = 1;
      edges.push({ u: u, v: v, w: w });
    }
    var set = {};
    edges.forEach(function (e) { set[e.u] = 1; set[e.v] = 1; });
    var verts = Object.keys(set).sort();
    if (verts.length > 10) { verts = verts.slice(0, 10); }
    var keep = {};
    verts.forEach(function (x) { keep[x] = 1; });
    edges = edges.filter(function (e) { return keep[e.u] && keep[e.v]; });
    var adj = {};
    verts.forEach(function (x) { adj[x] = []; });
    edges.forEach(function (e, idx) { adj[e.u].push({ v: e.v, w: e.w, i: idx }); });
    return { verts: verts, edges: edges, adj: adj, directed: true };
  }
  /* DAG（按随机拓扑序只连前向边）+ 负权边：不会出现负环，Bellman-Ford 一定收敛 */
  function rndBF() {
    var n = DSV.ri(5, 7), verts = [], i;
    for (i = 0; i < n; i++) { verts.push(String.fromCharCode(65 + i)); }
    var ord = DSV.shuffle(verts), seen = {}, lines = [];
    function add(a, b) {
      if (a === b) { return; }
      var k = a + '>' + b;
      if (seen[k]) { return; }
      seen[k] = 1;
      lines.push(a + ' ' + b + ' ' + DSV.ri(-3, 9));
    }
    for (i = 1; i < n; i++) { add(ord[DSV.ri(0, i - 1)], ord[i]); }
    var guard = 0;
    while (lines.length < DSV.ri(8, 10) && guard++ < 200) {
      var a = DSV.ri(0, n - 1), b = DSV.ri(0, n - 1);
      if (a !== b) { add(ord[a], ord[b]); }
    }
    return lines.join('\n');
  }

  /* ============================================================
     13. 关键路径（AOE 网）
     ============================================================ */
  DSV.register({
    id: 'grp-aoe', name: '关键路径（AOE 网）', category: CAT,
    desc: 'AOE 网是带权有向无环图：顶点=事件，边=活动，权=持续时间。ve[v]=事件 v 的最早发生时间（前驱 ve+权 的最大值），vl[v]=最迟发生时间（后继 vl−权 的最小值）；满足 ve[u]+w==vl[v] 的活动是关键活动，串联起来就是关键路径，其长度=工程最短工期。先拓扑排序，再双向递推，时间 O(V+E)，空间 O(V)。',
    viewBox: '0 0 1000 740',
    code: [
      'criticalPath(G):',
      '  求拓扑序 topo',
      '  ve[v] = 0；按 topo 正序：',
      '    ve[v] = max(ve[u] + w(u→v))',
      '  vl[v] = ve[终点]；按 topo 逆序：',
      '    vl[u] = min(vl[v] - w(u→v))',
      '  关键活动：ve[u] + w == vl[v]',
      '  关键路径长度 = ve[终点]'
    ],
    inputs: [inEdges('A B 3\nA C 2\nB D 5\nC D 1\nB E 4\nD F 2\nE F 6\nC G 3\nG F 1')],
    samples: [
      { label: '示例：7 事件 AOE 网', values: { edges: 'A B 3\nA C 2\nB D 5\nC D 1\nB E 4\nD F 2\nE F 6\nC G 3\nG F 1' } },
      { label: '示例：两条关键路径并列', values: { edges: 'A B 2\nA C 4\nB C 1\nB D 4\nC D 2' } },
      { label: '示例：含环（无法求关键路径）', values: { edges: CYC + '\nC D 2' } }
    ],
    random: function () { return { edges: randomEdges(true) }; },
    run: function (v) {
      var g = parseGraph(v.edges, true);
      if (!g.verts.length) { return []; }
      var st = [], n = g.verts.length, vi = vmap(g.verts), m = g.edges.length, i;
      var indeg = [];
      for (i = 0; i < n; i++) { indeg.push(0); }
      g.edges.forEach(function (e) { indeg[vi[e.v]]++; });
      var ve = [], vl = [], vc = clsArr(n), ec = clsArr(m);
      for (i = 0; i < n; i++) { ve.push(0); vl.push(0); }
      function snap(sub) {
        var vs = [];
        for (var t = 0; t < n; t++) { vs[t] = 've=' + ve[t] + ' / vl=' + vl[t]; }
        return {
          verts: g.verts, edges: g.edges, vc: vc.slice(), ec: ec.slice(), vsub: vs,
          directed: true, weighted: true, title: '关键路径 AOE（有向带权 DAG）',
          sub: sub || '', warn: '', ve: ve.slice(), vl: vl.slice()
        };
      }
      push(st, [0, 1], '初始化：共 ' + n + ' 个事件（顶点）、' + m + ' 项活动（边，权=持续时间），ve 全部置 0。第一步先求拓扑序',
        snap('第一步：求拓扑序'));
      var indeg2 = indeg.slice(), q = [], topo = [];
      for (i = 0; i < n; i++) { if (indeg2[i] === 0) { q.push(i); } }
      while (q.length) {
        var u = q.shift();
        topo.push(u); vc[u] = 'active';
        push(st, [1], '取入度为 0 的事件 ' + g.verts[u] + '，加入拓扑序列：' +
          topo.map(function (x) { return g.verts[x]; }).join(' → '), snap('输出事件 ' + g.verts[u]));
        vc[u] = 'done';
        var nb = g.adj[g.verts[u]] || [];
        for (var t = 0; t < nb.length; t++) {
          var w = nb[t].v, wi = vi[w], ei = nb[t].i;
          indeg2[wi]--; ec[ei] = 'done';
          push(st, [1], '删去活动 ' + g.verts[u] + ' → ' + w + '，事件 ' + w + ' 的入度变为 ' + indeg2[wi] +
            (indeg2[wi] === 0 ? '（变为 0，可以入队）' : ''), snap('删边 ' + g.verts[u] + '→' + w));
          if (indeg2[wi] === 0) { q.push(wi); }
        }
      }
      if (topo.length < n) {
        var cyc = [];
        for (i = 0; i < n; i++) { if (topo.indexOf(i) < 0) { cyc.push(g.verts[i]); vc[i] = 'dead'; } }
        var s0 = snap('存在环');
        s0.warn = '图中存在环，不是 AOE 网！剩余事件：' + cyc.join('，');
        push(st, [1], '队列已空但只排出 ' + topo.length + '/' + n + ' 个事件，剩余 ' + cyc.join('，') +
          ' 的入度始终不为 0，说明图中有环，无法求关键路径', s0);
        return st;
      }
      /* ---- 正向求 ve ---- */
      push(st, [2, 3], '拓扑序：' + topo.map(function (x) { return g.verts[x]; }).join(' → ') +
        '。开始按拓扑序正序求最早发生时间 ve[v] = max{ ve[u] + w(u→v) }，源点 ve=0', snap('第二步：求 ve[]'));
      for (var k = 0; k < topo.length; k++) {
        var u2 = topo[k]; vc[u2] = 'active';
        var nb2 = g.adj[g.verts[u2]] || [];
        for (var t2 = 0; t2 < nb2.length; t2++) {
          var e2 = nb2[t2], wi2 = vi[e2.v], ei2 = e2.i;
          var cand = ve[u2] + e2.w;
          ec[ei2] = 'hl';
          if (cand > ve[wi2]) {
            push(st, [3], '活动 ' + g.verts[u2] + ' → ' + e2.v + '（权 ' + e2.w + '）：ve[' + g.verts[u2] + ']+w = ' +
              ve[u2] + '+' + e2.w + ' = ' + cand + '，刷新 ve[' + e2.v + '] = ' + cand, snap('更新 ve[' + e2.v + ']=' + cand));
            ve[wi2] = cand; ec[ei2] = 'path';
          } else {
            push(st, [3], '活动 ' + g.verts[u2] + ' → ' + e2.v + '（权 ' + e2.w + '）：' + ve[u2] + '+' + e2.w + ' = ' +
              cand + ' ≤ ve[' + e2.v + '] = ' + ve[wi2] + '，不能提前，不刷新', snap('ve[' + e2.v + '] 保持 ' + ve[wi2]));
            ec[ei2] = '';
          }
        }
        vc[u2] = 'done';
      }
      /* ---- 逆向求 vl ---- */
      var sink = topo[topo.length - 1];
      for (i = 0; i < n; i++) { vl[i] = ve[sink]; }
      vc = clsArr(n); ec = clsArr(m);
      push(st, [4], '最早时间 ve 全部求出：工程终点 ' + g.verts[sink] + ' 的最早时间 = ' + ve[sink] +
        '。开始按拓扑序逆序求最迟时间 vl[u] = min{ vl[v] - w(u→v) }，先令所有 vl = ve[终点] = ' + ve[sink],
        snap('第三步：求 vl[]'));
      for (k = topo.length - 1; k >= 0; k--) {
        var u3 = topo[k]; vc[u3] = 'active';
        for (i = 0; i < m; i++) {
          var e3 = g.edges[i];
          if (vi[e3.v] !== u3) { continue; }
          var ui3 = vi[e3.u];
          ec[i] = 'hl';
          var cand2 = vl[u3] - e3.w;
          if (cand2 < vl[ui3]) {
            push(st, [5], '活动 ' + e3.u + ' → ' + e3.v + '（权 ' + e3.w + '）：vl[' + e3.v + ']-w = ' +
              vl[u3] + '-' + e3.w + ' = ' + cand2 + '，刷新 vl[' + e3.u + '] = ' + cand2, snap('更新 vl[' + e3.u + ']=' + cand2));
            vl[ui3] = cand2; ec[i] = 'swap';
          } else {
            push(st, [5], '活动 ' + e3.u + ' → ' + e3.v + '（权 ' + e3.w + '）：' + vl[u3] + '-' + e3.w + ' = ' +
              cand2 + ' ≥ vl[' + e3.u + '] = ' + vl[ui3] + '，不必推迟，不刷新', snap('vl[' + e3.u + '] 保持 ' + vl[ui3]));
            ec[i] = '';
          }
        }
        vc[u3] = 'done';
      }
      /* ---- 关键活动判定 ---- */
      var crit = [];
      for (i = 0; i < m; i++) {
        var e4 = g.edges[i];
        if (ve[vi[e4.u]] + e4.w === vl[vi[e4.v]]) { crit.push(i); ec[i] = 'path'; }
        else { ec[i] = ''; }
      }
      vc = clsArr(n);
      for (i = 0; i < n; i++) { if (ve[i] === vl[i]) { vc[i] = 'path'; } }
      push(st, [6, 7], 've 与 vl 都求完了。逐活动判断 ve[u]+w == vl[v]：关键活动 = ' +
        (crit.length ? crit.map(function (x) { return g.edges[x].u + '→' + g.edges[x].v; }).join('，') : '（没有）') +
        '。金色边=关键活动，金色事件=ve==vl；关键路径总工期 = ve[终点] = ' + ve[sink], snap('关键路径已标出'));
      return st;
    },
    render: function (kr, s) {
      if (!s) { kr.html('__e', S.text(500, 300, '（尚未开始，点击「开始演示」求关键路径）', 'vs')); kr.end(); return; }
      base(kr, s, 706);
      var vr = [], lr = [];
      for (var i = 0; i < s.verts.length; i++) {
        vr.push({ v: String(s.ve[i]), cls: s.ve[i] === s.vl[i] ? 'path' : '', m: s.verts[i] });
        lr.push({ v: String(s.vl[i]), cls: s.ve[i] === s.vl[i] ? 'path' : '', m: s.verts[i] });
      }
      drawRow(kr, '__ve', 've：事件最早发生时间（格子下方是事件名）', vr, 556, { cw: 44 });
      drawRow(kr, '__vl', 'vl：事件最迟发生时间', lr, 632, { cw: 44 });
      kr.html('__cp', S.text(500, 694, '金色 = 关键活动 / 关键事件（ve[u]+w == vl[v]），关键路径长度 = 工程最短工期', 'vs'));
      kr.end();
    }
  });

  /* ============================================================
     14. Bellman-Ford 最短路（允许负权边，可检测负权环）
     ============================================================ */
  DSV.register({
    id: 'grp-bellman-ford', name: 'Bellman-Ford 最短路', category: CAT,
    desc: '与 Dijkstra 不同，Bellman-Ford 每轮都按边表顺序对全部边做松弛 dist[v]=min(dist[v], dist[u]+w)，重复 |V|-1 轮即可收敛（允许负权边）；再做一轮若仍能松弛，说明存在总权为负的环，最短路无下界。时间 O(V·E)，空间 O(V)。',
    viewBox: '0 0 1000 740',
    code: [
      'Bellman-Ford(G, s):',
      '  dist[s] = 0；其余 dist = ∞',
      '  for round = 1 to |V|-1:',
      '    for 每条边 (u,v,w):',
      '      if dist[u] + w < dist[v]:',
      '        dist[v] = dist[u] + w',
      '  再做一轮：仍能松弛 → 存在负权环'
    ],
    inputs: [inEdges('A B 4\nA C 5\nB C -3\nC D 2\nB D 6'), inStart('A')],
    samples: [
      { label: '示例：含负权边', values: { edges: 'A B 4\nA C 5\nB C -3\nC D 2\nB D 6', start: 'A' } },
      { label: '示例：存在负权环', values: { edges: 'A B 2\nB C -5\nC A 1\nC D 3', start: 'A' } },
      { label: '示例：三角形小图', values: { edges: 'A B 4\nB C -1\nA C 2', start: 'A' } }
    ],
    random: function () { return { edges: rndBF(), start: 'A' }; },
    run: function (v) {
      var g = parseBF(v.edges);
      if (!g.verts.length) { return []; }
      var st = [], n = g.verts.length, vi = vmap(g.verts), m = g.edges.length, i;
      var start = (v.start && vi[v.start] != null) ? v.start : g.verts[0];
      var dist = [], vc = clsArr(n), ec = clsArr(m);
      for (i = 0; i < n; i++) { dist.push(INF()); }
      dist[vi[start]] = 0;
      function snap(sub) {
        var ds = [];
        for (var t = 0; t < n; t++) {
          ds.push({ v: distTxt(dist[t]), cls: vc[t] || '', m: g.verts[t] });
        }
        return {
          verts: g.verts, edges: g.edges, vc: vc.slice(), ec: ec.slice(), vsub: [],
          directed: true, weighted: true, title: 'Bellman-Ford 最短路（源点 ' + start + '，允许负权边）',
          sub: sub || '', warn: '', dist: ds
        };
      }
      push(st, [0, 1], '初始化：dist[' + start + '] = 0，其余顶点 dist = ∞。共 ' + n + ' 个顶点，最多做 ' + (n - 1) + ' 轮松弛',
        snap('初始化 dist 数组'));
      var finished = false;
      for (var round = 1; round <= n - 1 && !finished; round++) {
        var upd = 0;
        push(st, [2, 3], '—— 第 ' + round + ' 轮松弛：按边表顺序依次检查全部 ' + m + ' 条边 ——', snap('第 ' + round + ' 轮开始'));
        for (i = 0; i < m; i++) {
          var e = g.edges[i], ui = vi[e.u], wi = vi[e.v];
          if (dist[ui] === INF()) {
            ec[i] = 'hl';
            push(st, [3], '边 ' + e.u + ' → ' + e.v + '（权 ' + e.w + '）：dist[' + e.u + '] = ∞（源点到不了），跳过',
              snap('跳过 ' + e.u + '→' + e.v));
            ec[i] = '';
            continue;
          }
          var nd = dist[ui] + e.w, old = dist[wi];
          ec[i] = 'hl'; vc[ui] = 'compare';
          if (nd < old) {
            vc[wi] = 'swap';
            push(st, [4, 5], '松弛边 ' + e.u + ' → ' + e.v + '（权 ' + e.w + '）：dist[' + e.u + ']+w = ' +
              distTxt(dist[ui]) + '+' + e.w + ' = ' + nd + ' < dist[' + e.v + '] = ' + distTxt(old) +
              '，于是更新 dist[' + e.v + '] = ' + nd, snap('更新 dist[' + e.v + '] = ' + nd));
            dist[wi] = nd; upd++; ec[i] = 'path';
          } else {
            push(st, [4], '松弛边 ' + e.u + ' → ' + e.v + '（权 ' + e.w + '）：' + distTxt(dist[ui]) + '+' + e.w + ' = ' +
              nd + ' ≥ dist[' + e.v + '] = ' + distTxt(old) + '，不更新', snap('dist[' + e.v + '] 不变'));
            ec[i] = '';
          }
          vc[ui] = ''; vc[wi] = '';
        }
        push(st, [2], '第 ' + round + ' 轮结束：本轮共松弛 ' + upd + ' 次。当前 dist：' +
          g.verts.map(function (x, k) { return x + '=' + distTxt(dist[k]); }).join('，'), snap('第 ' + round + ' 轮结束'));
        if (upd === 0) {
          push(st, [2], '本轮一条边都没能松弛，说明距离已全部收敛，提前结束（只跑了 ' + round + ' 轮）', snap('提前收敛'));
          finished = true;
        }
      }
      var cyc = null;
      for (i = 0; i < m; i++) {
        var e2 = g.edges[i];
        if (dist[vi[e2.u]] !== INF() && dist[vi[e2.u]] + e2.w < dist[vi[e2.v]]) { cyc = e2; ec[i] = 'swap'; break; }
      }
      if (cyc) {
        var s2 = snap('存在负权环！');
        s2.warn = '检测到负权环：还能继续松弛，最短距离无下界！';
        push(st, [6], '最后再检查一轮：边 ' + cyc.u + ' → ' + cyc.v + ' 仍能松弛（dist[' + cyc.u + ']+' + cyc.w +
          ' < dist[' + cyc.v + ']），说明图中存在总权为负的环，最短路无意义', s2);
      } else {
        push(st, [6], '最后一轮检查没有任何边能继续松弛，全部最短距离已求出（∞ 表示从源点不可达）：' +
          g.verts.map(function (x, k) { return x + '=' + distTxt(dist[k]); }).join('，'), snap('最短路求解完成'));
      }
      return st;
    },
    render: function (kr, s) {
      if (!s) { kr.html('__e', S.text(500, 300, '（尚未开始，点击「开始演示」运行 Bellman-Ford）', 'vs')); kr.end(); return; }
      base(kr, s, 706);
      drawRow(kr, '__h', '顶点', s.verts.map(function (x) { return { v: x, cls: '' }; }), 556, { cw: 44 });
      drawRow(kr, '__d', 'dist：源点到该顶点当前已知最短距离', s.dist, 632, { cw: 44 });
      kr.html('__note', S.text(500, 694, '金色边 = 本轮发生松弛的边；负权边也能处理，但图中不能有负权环', 'vs'));
      kr.end();
    }
  });

  /* ============================================================
     15. 最大流 Edmonds-Karp（BFS 找增广路）
     ============================================================ */
  DSV.register({
    id: 'grp-maxflow', name: '最大流（Edmonds-Karp）', category: CAT,
    desc: '把每条边看成「正向剩余容量 c−f」与「反向退流容量 f」：反复用 BFS 在残留网络里找源 s 到汇 t 的增广路，取路上剩余容量的最小值（瓶颈）增广流量；找不到增广路时总流量即最大流。时间 O(V·E²)，空间 O(V+E)。',
    viewBox: '0 0 1000 740',
    code: [
      'EdmondsKarp(G, s, t):',
      '  残留网络：正向 c-f，反向 f',
      '  while BFS 在残留网络中找到 s→t 的路:',
      '    bottleneck = 路上最小剩余容量',
      '    沿增广路 f += bottleneck（反向即退流）',
      '    总流量 += bottleneck',
      '  总流量 = 最大流（= 最小割容量）'
    ],
    inputs: [inEdges('A B 3\nA C 2\nB C 1\nB D 3\nC E 4\nD E 1\nD F 2\nE F 3'), inStart('A'), inEnd('F')],
    samples: [
      { label: '示例：8 边流网络', values: { edges: 'A B 3\nA C 2\nB C 1\nB D 3\nC E 4\nD E 1\nD F 2\nE F 3', start: 'A', end: 'F' } },
      { label: '示例：小图', values: { edges: 'A B 5\nA C 4\nB C 2\nB D 3\nC D 5', start: 'A', end: 'D' } },
      { label: '示例：两条并联路', values: { edges: 'A B 2\nA C 3\nB D 2\nC D 3', start: 'A', end: 'D' } }
    ],
    random: function () {
      var edges = randomEdges(true);
      var g = parseGraph(edges, true);
      return { edges: edges, start: g.verts[0], end: g.verts[g.verts.length - 1] };
    },
    run: function (v) {
      var g = parseGraph(v.edges, true);
      if (!g.verts.length) { return []; }
      var st = [], n = g.verts.length, vi = vmap(g.verts), m = g.edges.length, i;
      var start = (v.start && vi[v.start] != null) ? v.start : g.verts[0];
      var end = (v.end && vi[v.end] != null) ? v.end : g.verts[n - 1];
      var flow = [];
      for (i = 0; i < m; i++) { flow.push(0); }
      var total = 0, augs = [], curPath = [];
      function snap(sub) {
        var es = g.edges.map(function (e, k) { return { u: e.u, v: e.v, w: flow[k] + '/' + e.w }; });
        var ec2 = clsArr(m);
        for (var k = 0; k < m; k++) {
          if (curPath.indexOf(k) >= 0) { ec2[k] = 'path'; }
          else if (flow[k] > 0) { ec2[k] = 'done'; }
        }
        return {
          verts: g.verts, edges: es, vc: clsArr(n), ec: ec2, vsub: [],
          directed: true, weighted: true, title: '最大流 Edmonds-Karp（源 ' + start + ' → 汇 ' + end + '，标签=流量/容量）',
          sub: sub || '', warn: '', total: total,
          lines: augs.map(function (a, k) { return '第 ' + (k + 1) + ' 条增广路：' + a.path.join(' → ') + '，瓶颈 ' + a.bn; })
        };
      }
      push(st, [0, 1], '初始化：所有边流量 f=0，残留网络正方向剩余容量=原容量，反方向退流容量=0。画面边标签显示「当前流量/容量」',
        snap('初始残留网络'));
      var guard = 0;
      while (guard++ < 60) {
        /* ---- 在残留网络上 BFS ---- */
        var vis = [], prevV = [], prevE = [];
        for (i = 0; i < n; i++) { vis.push(false); prevV.push(-1); prevE.push(-1); }
        var q = [vi[start]]; vis[vi[start]] = true;
        while (q.length) {
          var u = q.shift();
          var nb = g.adj[g.verts[u]] || [];
          for (var t = 0; t < nb.length; t++) {
            var e = nb[t], ei = e.i, wi = vi[e.v];
            var fwd = g.edges[ei].w - flow[ei];
            if (!vis[wi] && fwd > 0) { vis[wi] = true; prevV[wi] = u; prevE[wi] = ei * 2; q.push(wi); }
          }
          for (i = 0; i < m; i++) {
            var e2 = g.edges[i];
            if (vi[e2.v] === u && flow[i] > 0 && !vis[vi[e2.u]]) {
              vis[vi[e2.u]] = true; prevV[vi[e2.u]] = u; prevE[vi[e2.u]] = i * 2 + 1; q.push(vi[e2.u]);
            }
          }
        }
        if (!vis[vi[end]]) {
          curPath = [];
          push(st, [2], 'BFS 从 ' + start + ' 出发，残留网络里已经走不到 ' + end + '，不存在更多增广路，算法结束',
            snap('无增广路，结束'));
          break;
        }
        /* ---- 回溯增广路 ---- */
        var pathV = [], pathE = [], dirs = [];
        var cur = vi[end];
        while (cur !== vi[start]) {
          var pe = prevE[cur];
          pathE.unshift(Math.floor(pe / 2));
          dirs.unshift(pe % 2);
          pathV.unshift(g.verts[cur]);
          cur = prevV[cur];
        }
        pathV.unshift(start);
        var bn = INF();
        for (i = 0; i < pathE.length; i++) {
          var ei = pathE[i];
          var r = dirs[i] ? flow[ei] : (g.edges[ei].w - flow[ei]);
          if (r < bn) { bn = r; }
        }
        curPath = pathE.slice();
        push(st, [2, 3], 'BFS 在残留网络中找到一条增广路：' + pathV.join(' → ') +
          '（BFS 保证这是经过边数最少的路）', snap('增广路：' + pathV.join(' → ')));
        push(st, [3], '计算瓶颈：路上各边剩余容量取最小值 = ' + bn + '，本次增广最多推进 ' + bn + ' 个单位流量',
          snap('瓶颈 = ' + bn));
        for (i = 0; i < pathE.length; i++) {
          if (dirs[i]) { flow[pathE[i]] -= bn; }   // 反向边：退流
          else { flow[pathE[i]] += bn; }
        }
        total += bn;
        augs.push({ path: pathV.slice(), bn: bn });
        push(st, [4, 5], '沿增广路增广 ' + bn + ' 个单位：总流量 = ' + total + '。各边标签更新为「流量/容量」',
          snap('增广后总流量 = ' + total));
        curPath = [];
      }
      push(st, [6], '最大流 = ' + total + '（即源点 ' + start + ' 的总流出）。共进行 ' + augs.length +
        ' 轮增广。根据最大流-最小割定理，这个值也是把 s 与 t 分开的最小割容量。时间 O(V·E²)。', snap('最大流 = ' + total));
      return st;
    },
    render: function (kr, s) {
      if (!s) { kr.html('__e', S.text(500, 300, '（尚未开始，点击「开始演示」求最大流）', 'vs')); kr.end(); return; }
      base(kr, s, 706);
      kr.html('__tt', S.text(500, 552, '当前总流量 = ' + s.total, 'vt'));
      kr.html('__lt', S.text(500, 576, '各轮增广记录（下方为瓶颈值）', 'vs'));
      drawLines(kr, '__ls', s.lines || [], 602, 22, 5);
      kr.end();
    }
  });

  /* ============================================================
     16. Tarjan 强连通分量
     ============================================================ */
  DSV.register({
    id: 'grp-tarjan', name: 'Tarjan 强连通分量', category: CAT,
    desc: '有向图中，互相可达的顶点构成一个强连通分量（SCC）。Tarjan 用一次 DFS：dfn[u]=发现时间，low[u]=从 u 的子孙出发、经一条回边能到达的最小 dfn；当 low[u]==dfn[u] 时，递归栈顶到 u 的全部顶点属于同一个 SCC。时间 O(V+E)，空间 O(V)。',
    viewBox: '0 0 1000 740',
    code: [
      'Tarjan(u):',
      '  dfn[u] = low[u] = ++time; 压入栈',
      '  for v in adj[u]:',
      '    if v 未访问: Tarjan(v); low[u]=min(low[u],low[v])',
      '    else if v 在栈中: low[u]=min(low[u],dfn[v])',
      '  if low[u] == dfn[u]:',
      '    弹出栈顶到 u，组成一个 SCC'
    ],
    inputs: [inEdges('A B\nB C\nC A\nC D\nD E\nE D\nE F')],
    samples: [
      { label: '示例：3 个 SCC', values: { edges: 'A B\nB C\nC A\nC D\nD E\nE D\nE F' } },
      { label: '示例：链式（每点一个 SCC）', values: { edges: 'A B\nB C\nC D' } },
      { label: '示例：两个双节点环', values: { edges: 'A B\nB A\nB C\nC D\nD C' } }
    ],
    random: function () {
      var n = DSV.ri(5, 7), verts = [], i;
      for (i = 0; i < n; i++) { verts.push(String.fromCharCode(65 + i)); }
      var ord = DSV.shuffle(verts), seen = {}, lines = [];
      function add(a, b) {
        if (a === b) { return; }
        var k = a + '>' + b;
        if (seen[k]) { return; }
        seen[k] = 1;
        lines.push(a + ' ' + b);
      }
      for (i = 1; i < n; i++) { add(ord[DSV.ri(0, i - 1)], ord[i]); }
      var guard = 0;
      while (lines.length < DSV.ri(8, 11) && guard++ < 200) {
        var a = DSV.ri(0, n - 1), b = DSV.ri(0, n - 1);
        if (a !== b) { add(verts[a], verts[b]); }
      }
      return { edges: lines.join('\n') };
    },
    run: function (v) {
      var g = parseGraph(v.edges, true);
      if (!g.verts.length) { return []; }
      var st = [], n = g.verts.length, vi = vmap(g.verts), m = g.edges.length, i;
      var dfn = [], low = [], onStk = {}, stack = [], sccs = [];
      var vc = clsArr(n), ec = clsArr(m), time = 0;
      for (i = 0; i < n; i++) { dfn.push(0); low.push(0); }
      var PAL = ['active', 'compare', 'path', 'done', 'swap'];
      function snap(sub) {
        var vs = [];
        for (var t = 0; t < n; t++) {
          vs[t] = dfn[t] ? (dfn[t] + '/' + low[t]) : '·';
        }
        return {
          verts: g.verts, edges: g.edges, vc: vc.slice(), ec: ec.slice(), vsub: vs,
          directed: true, weighted: false, title: 'Tarjan 强连通分量（顶点下方 dfn/low）',
          sub: sub || '', warn: '',
          stack: stack.map(function (x, k) { return { v: x, cls: k === stack.length - 1 ? 'active' : 'compare' }; }),
          lines: sccs.map(function (c, k) { return 'SCC #' + (k + 1) + '：' + c.join('，'); })
        };
      }
      function dfs(u) {
        var ui = vi[u];
        dfn[ui] = low[ui] = ++time;
        onStk[u] = true; stack.push(u); vc[ui] = 'active';
        push(st, [1], '发现顶点 ' + u + '：dfn[' + u + '] = low[' + u + '] = ' + time + '，压入递归栈（栈 = [' + stack.join(' ') + ']）',
          snap('发现 ' + u));
        var nb = g.adj[u] || [];
        for (var t = 0; t < nb.length; t++) {
          var w = nb[t].v, ei = nb[t].i, wi = vi[w];
          ec[ei] = 'hl';
          if (!dfn[wi]) {
            push(st, [3], '边 ' + u + ' → ' + w + '：' + w + ' 还未访问，这是树边，递归进入 ' + w, snap('递归进入 ' + w));
            ec[ei] = 'path';
            dfs(w);
            low[ui] = Math.min(low[ui], low[wi]);
            push(st, [4], '从 ' + w + ' 回溯到 ' + u + '：low[' + u + '] = min(low[' + u + '], low[' + w + ']=' + low[wi] + ') = ' + low[ui],
              snap('回溯更新 low[' + u + ']'));
          } else if (onStk[w]) {
            low[ui] = Math.min(low[ui], dfn[wi]);
            ec[ei] = 'swap';
            push(st, [5], '边 ' + u + ' → ' + w + '：' + w + ' 已访问且仍在栈中（回边/横叉边），low[' + u + '] = min(low[' + u + '], dfn[' + w + ']=' + dfn[wi] + ') = ' + low[ui],
              snap('用 dfn[' + w + '] 更新 low[' + u + ']'));
          } else {
            push(st, [3], '边 ' + u + ' → ' + w + '：' + w + ' 已访问且不在栈中（已输出为别的 SCC），跳过',
              snap('跳过已输出的 ' + w));
            ec[ei] = '';
          }
        }
        if (low[ui] === dfn[ui]) {
          var comp = [];
          while (true) {
            var x = stack.pop();
            onStk[x] = false;
            comp.push(x);
            if (x === u) { break; }
          }
          sccs.push(comp);
          var cid = sccs.length - 1;
          comp.forEach(function (x) { vc[vi[x]] = PAL[cid % PAL.length]; });
          push(st, [6], 'low[' + u + '] == dfn[' + u + ']（=' + dfn[ui] + '）：从栈顶弹到 ' + u + '，这些顶点互相可达，组成 SCC #' +
            (cid + 1) + '：{' + comp.join('，') + '}', snap('输出 SCC #' + (cid + 1) + '：{' + comp.join('，') + '}'));
        } else {
          vc[ui] = 'compare';
          push(st, [6], 'low[' + u + ']=' + low[ui] + ' < dfn[' + u + ']=' + dfn[ui] + '：' + u + ' 还在某个更大的 SCC 里，留在栈中',
            snap(u + ' 留在栈中'));
        }
      }
      push(st, [0], '初始化：所有顶点 dfn/low 为 0，递归栈为空，从字典序第一个顶点开始 DFS', snap('初始化'));
      for (i = 0; i < n; i++) {
        if (!dfn[i]) {
          push(st, [0], '顶点 ' + g.verts[i] + ' 尚未访问，从它开始一轮 DFS', snap('从 ' + g.verts[i] + ' 开始'));
          dfs(g.verts[i]);
        }
      }
      push(st, [6], 'DFS 全部结束：共求出 ' + sccs.length + ' 个强连通分量。把每个 SCC 缩成一个点后，得到的就是一个有向无环图。',
        snap('全部 SCC 求出'));
      return st;
    },
    render: function (kr, s) {
      if (!s) { kr.html('__e', S.text(500, 300, '（尚未开始，点击「开始演示」求强连通分量）', 'vs')); kr.end(); return; }
      base(kr, s, 706);
      drawRow(kr, '__st', '递归栈（右端为栈顶 = 当前顶点）', s.stack, 556, { cw: 46 });
      kr.html('__lt', S.text(500, 596, '已求出的强连通分量', 'vs'));
      drawLines(kr, '__ls', s.lines || [], 622, 22, 4);
      kr.end();
    }
  });

  /* ============================================================
     17. 欧拉回路（Hierholzer 算法）
     ============================================================ */
  DSV.register({
    id: 'grp-euler', name: '欧拉回路（Hierholzer）', category: CAT,
    desc: '无向图存在欧拉回路 ⟺ 连通且所有顶点度数为偶数；恰有两个奇度顶点时存在欧拉路径（从一个奇点走到另一个）。Hierholzer：从起点出发沿未走过的边一直走，走不动时把当前顶点拼到回路最前面并回溯，直到用完所有边。时间 O(V+E)。',
    viewBox: '0 0 1000 740',
    code: [
      'Hierholzer(G):',
      '  检查度数：全偶→回路；恰 2 奇度→路径',
      '  stack = [起点]',
      '  while stack 非空:',
      '    u = 栈顶；若还有未走的边 (u,v):',
      '      标记该边已用；push(v)',
      '    else:',
      '      pop(u)，把 u 拼到回路最前面'
    ],
    inputs: [inEdges('A B\nA C\nB C\nC D\nD E\nC E')],
    samples: [
      { label: '示例：存在欧拉回路', values: { edges: 'A B\nA C\nB C\nC D\nD E\nC E' } },
      { label: '示例：存在欧拉路径（两个奇点）', values: { edges: 'A B\nB C\nC D' } },
      { label: '示例：不连通（无解）', values: { edges: 'A B\nB C\nC A\nD E' } }
    ],
    random: function () {
      var n = DSV.ri(5, 7), verts = [], i;
      for (i = 0; i < n; i++) { verts.push(String.fromCharCode(65 + i)); }
      var lines = [];
      for (i = 0; i < n; i++) { lines.push(verts[i] + ' ' + verts[(i + 1) % n]); }
      var c = DSV.ri(1, 2);
      for (i = 0; i < c; i++) {
        var a = DSV.ri(0, n - 1), b = DSV.ri(0, n - 1);
        if (a !== b) { lines.push(verts[a] + ' ' + verts[b]); }
      }
      return { edges: lines.join('\n') };
    },
    run: function (v) {
      var g = parseGraph(v.edges, false);
      if (!g.verts.length) { return []; }
      var st = [], n = g.verts.length, vi = vmap(g.verts), m = g.edges.length, i;
      var deg = [];
      for (i = 0; i < n; i++) { deg.push(0); }
      g.edges.forEach(function (e) { deg[vi[e.u]]++; deg[vi[e.v]]++; });
      var vc = clsArr(n), ec = clsArr(m), used = [];
      for (i = 0; i < m; i++) { used.push(false); }
      function snap(sub) {
        var vs = [];
        for (var t = 0; t < n; t++) { vs[t] = '度 ' + deg[t]; }
        return {
          verts: g.verts, edges: g.edges, vc: vc.slice(), ec: ec.slice(), vsub: vs,
          directed: false, weighted: false, title: '欧拉回路 Hierholzer（无向图）',
          sub: sub || '', warn: ''
        };
      }
      /* ---- 度条件检查 ---- */
      var odd = [];
      for (i = 0; i < n; i++) { if (deg[i] % 2 === 1) { odd.push(i); vc[i] = 'compare'; } }
      push(st, [1], '第一步检查度数：' + g.verts.map(function (x, k) { return x + '=' + deg[k]; }).join('，') +
        '。奇度顶点有 ' + odd.length + ' 个：' + (odd.length ? odd.map(function (x) { return g.verts[x]; }).join('，') : '无'),
        snap('度数检查'));
      if (odd.length === 1 || odd.length > 2) {
        var s0 = snap('无解');
        s0.warn = '奇度顶点数 = ' + odd.length + '，既不是 0 也不是 2，不存在欧拉路径/回路！';
        push(st, [1], '奇度顶点数 = ' + odd.length + '，不满足「0 个或 2 个」的必要条件，图中不存在欧拉路径或回路', s0);
        return st;
      }
      if (odd.length === 2) {
        push(st, [1], '恰有 2 个奇度顶点（' + g.verts[odd[0]] + '、' + g.verts[odd[1]] + '），存在欧拉路径：' +
          '必须从其中一个奇点出发、另一个结束', snap('欧拉路径：从 ' + g.verts[odd[0]] + ' 出发'));
      } else {
        push(st, [1], '所有顶点度数都是偶数，存在欧拉回路：可从任意顶点出发（取字典序第一个 ' + g.verts[0] + '）',
          snap('欧拉回路'));
      }
      /* ---- 连通性粗检：从起点做一次 DFS ---- */
      var start = odd.length === 2 ? odd[0] : 0;
      var seen = {};
      (function flood(u) {
        if (seen[u]) { return; }
        seen[u] = true;
        (g.adj[u] || []).forEach(function (e) { flood(e.v); });
      })(g.verts[start]);
      for (i = 0; i < n; i++) {
        if (!seen[g.verts[i]]) {
          var s1 = snap('不连通');
          s1.warn = '图不连通：' + g.verts[i] + ' 与起点 ' + g.verts[start] + ' 不连通，无欧拉路径！';
          push(st, [1], '从起点 ' + g.verts[start] + ' 出发遍历不到顶点 ' + g.verts[i] +
            '：各边所在的连通块互相分离，即使度数满足条件也不存在欧拉路径', s1);
          return st;
        }
      }
      /* ---- Hierholzer ---- */
      var stack = [g.verts[start]], route = [];
      push(st, [2], '开始 Hierholzer：当前路径栈 = [' + g.verts[start] + ']，回路列表为空', snap('出发'));
      var guard = 0;
      while (stack.length && guard++ < 400) {
        var u = stack[stack.length - 1];
        /* 找一条未走过的关联边 */
        var found = -1;
        var nb = g.adj[u] || [];
        for (var t = 0; t < nb.length; t++) {
          if (!used[nb[t].i]) { found = nb[t].i; break; }
        }
        if (found >= 0) {
          var e = g.edges[found];
          var other = (e.u === u) ? e.v : e.u;
          used[found] = true; ec[found] = 'hl'; vc[vi[u]] = 'active'; vc[vi[other]] = 'compare';
          push(st, [4, 5], '从 ' + u + ' 沿未走过的边走到 ' + other + '，标记该边已用，' + other + ' 压入路径栈（栈 = [' +
            stack.concat(other).join(' ') + ']）', snap('边 ' + u + '—' + other + ' 已走'));
          stack.push(other);
          ec[found] = 'done';
        } else {
          stack.pop(); vc[vi[u]] = 'done';
          route.unshift(u);
          push(st, [6, 7], '到了 ' + u + '，它的边都走过了（死路）：把 ' + u + ' 拼到回路列表最前面。回退一步继续找',
            snap('死路：把 ' + u + ' 拼入回路'));
        }
      }
      /* 最终把走过的边标为 path */
      for (i = 0; i < m; i++) { ec[i] = used[i] ? 'path' : 'dead dim'; }
      vc = clsArr(n);
      push(st, [7], '全部边用完，Hierholzer 结束。得到' + (odd.length ? '欧拉路径' : '欧拉回路') + '：' +
        route.join(' → ') + (odd.length ? '' : ' → ' + route[0]) + '（共经过 ' + m + ' 条边）。金色边 = 回路中的边。',
        snap(odd.length ? '欧拉路径完成' : '欧拉回路完成'));
      return st;
    },
    render: function (kr, s) {
      if (!s) { kr.html('__e', S.text(500, 300, '（尚未开始，点击「开始演示」求欧拉回路）', 'vs')); kr.end(); return; }
      base(kr, s, 706);
      kr.html('__note', S.text(500, 560, '顶点下方标注度数；金色边 = 欧拉路径上的边，灰色边 = 未使用（或图不连通部分）', 'vs'));
      kr.end();
    }
  });

  /* ============================================================
     18. 匈牙利算法（二分图最大匹配）
     ============================================================ */
  DSV.register({
    id: 'grp-hungarian', name: '匈牙利算法（二分匹配）', category: CAT,
    desc: '二分图两边顶点分两列。依次为左部每个顶点 u 找匹配：沿边试探右部 r——r 未匹配就直接配对；r 已匹配给别人，就尝试给那个人重新找一条出路（增广路）。找到增广路则匹配数 +1。时间 O(V·E)，空间 O(V+E)。',
    viewBox: '0 0 1000 640',
    code: [
      'Hungarian(G):',
      '  matchR[r] = null',
      '  for u in 左部:',
      '    visited = 空（右部本轮访问标记）',
      '    if tryMatch(u): 匹配数 +1',
      '',
      'tryMatch(u):',
      '  for r in adj[u]:',
      '    if r 未访问:',
      '      visited[r] = true',
      '      if matchR[r] == null or tryMatch(matchR[r]):',
      '        matchR[r] = u; return true',
      '  return false'
    ],
    inputs: [inEdges('A X\nA Y\nB X\nB Z\nC Y\nC Z')],
    samples: [
      { label: '示例：3×3 二分图', values: { edges: 'A X\nA Y\nB X\nB Z\nC Y\nC Z' } },
      { label: '示例：链式匹配', values: { edges: 'A X\nB X\nC X\nC Y' } },
      { label: '示例：完整匹配', values: { edges: 'A X\nA Z\nB Y\nC X\nC Z' } }
    ],
    random: function () {
      var L = ['A', 'B', 'C', 'D'], R = ['W', 'X', 'Y', 'Z'];
      var lines = [], i, j;
      for (i = 0; i < L.length; i++) {
        var k = DSV.ri(1, 2);
        var rr = DSV.shuffle(R);
        for (j = 0; j < k; j++) { lines.push(L[i] + ' ' + rr[j]); }
      }
      return { edges: lines.join('\n') };
    },
    run: function (v) {
      var g = parseGraph(v.edges, false);
      if (!g.verts.length) { return []; }
      /* 从边表分出左部/右部：按出现顺序，所有 "u" 当左部，"v" 当右部 */
      var left = [], right = {};
      g.edges.forEach(function (e) {
        if (left.indexOf(e.u) < 0) { left.push(e.u); }
        right[e.v] = 1;
      });
      var Rlist = Object.keys(right).sort();
      var st = [], matchR = {}, matchL = {}, i, j;
      left.forEach(function (l) { matchL[l] = null; });
      Rlist.forEach(function (r) { matchR[r] = null; });
      var visits = {};   // 本轮右部访问标记
      var curEdges = {}; // edge idx -> cls
      for (i = 0; i < g.edges.length; i++) { curEdges[i] = ''; }
      function posOf(x, isLeft) {
        var arr = isLeft ? left : Rlist;
        var k = arr.indexOf(x);
        var cnt = arr.length;
        var y = cnt === 1 ? 300 : 150 + k * (300 / (cnt - 1));
        return { x: isLeft ? 220 : 780, y: y };
      }
      function snap(sub) {
        var es = [];
        for (var k = 0; k < g.edges.length; k++) {
          var e = g.edges[k], pl = posOf(e.u, true), pr = posOf(e.v, false);
          es.push({ lx: pl.x, ly: pl.y, rx: pr.x, ry: pr.y, cls: curEdges[k] });
        }
        var ls = [], rs = [];
        for (var a = 0; a < left.length; a++) { ls.push({ name: left[a], x: posOf(left[a], true).x, y: posOf(left[a], true).y, cls: matchL[left[a]] ? 'path' : '' }); }
        for (var b = 0; b < Rlist.length; b++) { rs.push({ name: Rlist[b], x: posOf(Rlist[b], false).x, y: posOf(Rlist[b], false).y, cls: matchR[Rlist[b]] ? 'path' : '' }); }
        return {
          title: '匈牙利算法 · 二分图最大匹配（左部 ' + left.length + ' 个，右部 ' + Rlist.length + ' 个）',
          sub: sub || '', warn: '', left: ls, right: rs, edges: es,
          matched: left.filter(function (l) { return matchL[l]; }).map(function (l) { return l + '—' + matchL[l]; })
        };
      }
      function refreshEdges() {
        for (var k = 0; k < g.edges.length; k++) {
          var e = g.edges[k];
          curEdges[k] = (matchL[e.u] === e.v) ? 'path' : '';
        }
      }
      function tryMatch(u, depth) {
        var nb = g.adj[u] || [];
        for (var t = 0; t < nb.length; t++) {
          var r = nb[t].v, ei = nb[t].i;
          curEdges[ei] = 'hl';
          if (visits[r]) {
            push(st, [8, 9], u + ' → ' + r + '：' + r + ' 本轮已访问过（避免来回试探死循环），跳过',
              snap(depth + '跳过 ' + r));
            curEdges[ei] = matchL[u] === r ? 'path' : '';
            continue;
          }
          visits[r] = true;
          if (matchR[r] === null) {
            matchR[r] = u; matchL[u] = r;
            refreshEdges();
            push(st, [10, 11], u + ' → ' + 'r=' + r + '：右部顶点 ' + r + ' 还没匹配，直接配对成功！' +
              '现在 ' + u + ' — ' + r, snap('匹配成功 ' + u + '—' + r));
            return true;
          }
          push(st, [10], u + ' → ' + r + '：' + r + ' 已经匹配给 ' + matchR[r] +
            '，尝试为 ' + matchR[r] + ' 重新找另一条出路（增广）', snap('尝试增广'));
          var ok = tryMatch(matchR[r], depth + '  ');
          if (ok) {
            matchR[r] = u; matchL[u] = r;
            refreshEdges();
            push(st, [10, 11], '增广成功：把 ' + r + ' 改配给 ' + u + '（原来配它的 ' + matchR[r] +
              ' 已通过增广路找到新家）', snap('重配 ' + u + '—' + r));
            return true;
          }
          curEdges[ei] = '';
        }
        push(st, [12], u + ' 的所有右部邻居都试过了，找不到增广路：' + u + ' 本轮无法匹配', snap(u + ' 匹配失败'));
        return false;
      }
      push(st, [0, 1], '初始化：左部 ' + left.join('、') + '，右部 ' + Rlist.join('、') + '，匹配表 matchR 全空，匹配数 = 0。' +
        '接下来按左部顺序逐个尝试匹配', snap('初始化匹配为空'));
      for (i = 0; i < left.length; i++) {
        var u = left[i];
        visits = {};
        push(st, [2, 3], '—— 为左部顶点 ' + u + ' 找匹配（清空右部访问标记 visited）——', snap('尝试匹配 ' + u));
        var ok = tryMatch(u, '');
        if (!ok) {
          push(st, [2], u + ' 匹配失败，它保持未匹配状态，继续处理下一个左部顶点', snap(u + ' 未匹配'));
        }
      }
      push(st, [1], '全部左部顶点处理完。最大匹配 = ' + left.filter(function (l) { return matchL[l]; }).length +
        ' 对：' + (snap('').matched.length ? snap('').matched.join('，') : '（空）'), snap('最大匹配完成'));
      return st;
    },
    render: function (kr, s) {
      if (!s) { kr.html('__e', S.text(500, 300, '（尚未开始，点击「开始演示」求最大匹配）', 'vs')); kr.end(); return; }
      kr.html('__defs', S.arrowDefs());
      kr.html('__t', S.text(500, 26, s.title, 'vt'));
      kr.html('__s', S.text(500, 48, s.sub, 'vs'));
      kr.html('__lt', S.text(220, 96, '左部 L', 'vs'));
      kr.html('__rt', S.text(780, 96, '右部 R', 'vs'));
      var ge = kr.g('__he', 'translate(0,0)', 'k');
      var gn = kr.g('__hn', 'translate(0,0)', 'k');
      var i;
      for (i = 0; i < s.edges.length; i++) {
        var e = s.edges[i];
        kr.html('he' + i, S.line(e.lx, e.ly, e.rx, e.ry, 'edge ' + e.cls), ge);
      }
      for (i = 0; i < s.left.length; i++) {
        var l = s.left[i];
        kr.g('nl' + i, 'translate(' + l.x + ',' + l.y + ')', 'k nd ' + l.cls,
          S.circle(0, 0, 22) + S.text(0, 0, l.name), gn);
      }
      for (i = 0; i < s.right.length; i++) {
        var r = s.right[i];
        kr.g('nr' + i, 'translate(' + r.x + ',' + r.y + ')', 'k nd ' + r.cls,
          S.circle(0, 0, 22) + S.text(0, 0, r.name), gn);
      }
      kr.html('__mm', S.text(500, 560, '已匹配：' + (s.matched.length ? s.matched.join('，') : '（空）') +
        '　　金色边 = 当前匹配，高亮边 = 正在试探的增广路', 'vs'));
      kr.end();
    }
  });

})();
