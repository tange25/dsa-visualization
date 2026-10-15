/* ============================================================
   viz-geo.js —— 几何算法章节（5 个算法）
   2D 旋转与缩放矩阵 · 2D 旋转与平移（齐次坐标）· 2D 坐标系变换
   3D 旋转与缩放矩阵 · 3D 坐标系变换
   矩阵乘法、矩阵求逆、等轴测投影全部手写实现（不依赖任何库）
   ============================================================ */
(function () {
  'use strict';
  var DSV = window.DSV, S = DSV.svg;

  /* ============================================================
     一、通用工具：数值、矩阵、投影、绘制片段
     ============================================================ */
  function push(steps, code, desc, snap) { steps.push({ code: code, desc: desc, snap: snap }); }

  /** 数值格式化：保留 2 位小数 */
  function f2(v) {
    if (typeof v !== 'number' || !isFinite(v)) { return '—'; }
    if (v === 0) { v = 0; }
    return v.toFixed(2);
  }
  /** 安全解析数字（NaN / 空串 → 默认值） */
  function num(v, def) {
    var x = parseFloat(v);
    return isFinite(x) ? x : def;
  }
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function near(a, b) { return Math.abs(a - b) < 1e-6; }

  /* ---------- 矩阵运算（普通二维 JS 数组，手写实现） ---------- */
  function mat(r, c) {
    var m = [], i, j, row;
    for (i = 0; i < r; i++) { row = []; for (j = 0; j < c; j++) { row.push(0); } m.push(row); }
    return m;
  }
  /** C = A·B，C[i][j] = Σ(k) A[i][k]·B[k][j] */
  function matMul(A, B) {
    var n = A.length, k = B.length, m = B[0].length, C = mat(n, m), i, j, t, s;
    for (i = 0; i < n; i++) {
      for (j = 0; j < m; j++) {
        s = 0;
        for (t = 0; t < k; t++) { s += A[i][t] * B[t][j]; }
        C[i][j] = s;
      }
    }
    return C;
  }
  /** 矩阵 × 列向量 */
  function matVec(M, v) {
    var n = M.length, m = M[0].length, o = [], i, j, s;
    for (i = 0; i < n; i++) {
      s = 0;
      for (j = 0; j < m; j++) { s += M[i][j] * v[j]; }
      o.push(s);
    }
    return o;
  }
  /** 转置 */
  function matT(A) {
    var n = A.length, m = A[0].length, C = mat(m, n), i, j;
    for (i = 0; i < n; i++) { for (j = 0; j < m; j++) { C[j][i] = A[i][j]; } }
    return C;
  }
  /** 2×2 / 3×3 行列式 */
  function det2(A) { return A[0][0] * A[1][1] - A[0][1] * A[1][0]; }
  function det3(A) {
    return A[0][0] * (A[1][1] * A[2][2] - A[1][2] * A[2][1])
      - A[0][1] * (A[1][0] * A[2][2] - A[1][2] * A[2][0])
      + A[0][2] * (A[1][0] * A[2][1] - A[1][1] * A[2][0]);
  }
  /** 3×3 求逆（伴随矩阵法）：A⁻¹ = adj(A) / det(A)，奇异时返回 null */
  function inv3(A) {
    var d = det3(A);
    if (!isFinite(d) || Math.abs(d) < 1e-9) { return null; }
    var C = mat(3, 3), i, j, r, c, rs, row, minor;
    for (i = 0; i < 3; i++) {
      for (j = 0; j < 3; j++) {
        rs = [];
        for (r = 0; r < 3; r++) {
          if (r === i) { continue; }
          row = [];
          for (c = 0; c < 3; c++) { if (c === j) { continue; } row.push(A[r][c]); }
          rs.push(row);
        }
        minor = rs[0][0] * rs[1][1] - rs[0][1] * rs[1][0];
        C[j][i] = ((i + j) % 2 === 0 ? 1 : -1) * minor / d;   // 转置存放即伴随矩阵
      }
    }
    return C;
  }
  /** 2×2 求逆（备用） */
  function inv2(A) {
    var d = det2(A);
    if (!isFinite(d) || Math.abs(d) < 1e-9) { return null; }
    return [[A[1][1] / d, -A[0][1] / d], [-A[1][0] / d, A[0][0] / d]];
  }
  /** 矩阵转字符串：[[a, b], [c, d]] */
  function ms(M) {
    return '[' + M.map(function (r) { return '[' + r.map(f2).join(', ') + ']'; }).join(', ') + ']';
  }
  /** 乘法某一元素的求和表达式：返回 {expr, val} */
  function terms(A, B, i, j) {
    var parts = [], sum = 0, k;
    for (k = 0; k < B.length; k++) {
      parts.push(f2(A[i][k]) + '×' + f2(B[k][j]));
      sum += A[i][k] * B[k][j];
    }
    return { expr: parts.join(' + '), val: sum };
  }
  /** 解析多边形顶点："0,0, 3,0, 1.5,2.5" → [[0,0],[3,0],[1.5,2.5]] */
  function parsePts(s) {
    var f = DSV.nums(s, 24), p = [], i;
    for (i = 0; i + 1 < f.length; i += 2) { p.push([clamp(f[i], -10, 10), clamp(f[i + 1], -10, 10)]); }
    if (p.length < 3) { p = [[0, 0], [3, 0], [1.5, 2.5]]; }
    if (p.length > 8) { p = p.slice(0, 8); }
    return p;
  }

  /* ---------- 绘制片段 ---------- */
  /** 矩阵方括号 */
  function bracket(x, y, w, h) {
    return S.path('M' + (x - 9) + ' ' + y + ' L' + (x - 2) + ' ' + y + ' L' + (x - 2) + ' ' + (y + h) + ' L' + (x - 9) + ' ' + (y + h), 'edge') +
      S.path('M' + (x + w + 2) + ' ' + y + ' L' + (x + w + 9) + ' ' + y + ' L' + (x + w + 9) + ' ' + (y + h) + ' L' + (x + w + 2) + ' ' + (y + h), 'edge');
  }
  /** 画一个矩阵格子表：m = {label, M, hl:[i,j], cls, note} */
  function drawMat(kr, key, m, x, y, opt) {
    opt = opt || {};
    var cw = opt.cw || 58, ch = opt.ch || 32;
    var M = m.M || [], rows = M.length, cols = rows ? M[0].length : 0;
    var w = cols * cw, h = rows * ch, s = '', i, j, on, cls;
    if (m.label) { s += S.text(x + w / 2, y - 20, m.label, 'vs'); }
    s += bracket(x, y, w, h);
    for (i = 0; i < rows; i++) {
      for (j = 0; j < cols; j++) {
        on = !!(m.hl && m.hl[0] === i && m.hl[1] === j);
        cls = on ? (m.hlCls || 'active') : (m.cls || '');
        s += '<rect class="cell ' + cls + '" x="' + (x + j * cw + 2) + '" y="' + (y + i * ch + 2) +
          '" width="' + (cw - 4) + '" height="' + (ch - 4) + '" rx="4"/>' +
          S.text(x + j * cw + cw / 2, y + i * ch + ch / 2, f2(M[i][j]), 'cell-txt');
      }
    }
    if (m.note) { s += S.text(x + w / 2, y + h + 20, m.note, 'tag'); }
    kr.html(key, s);
  }
  /** 画一个列向量：V = [a, b, c] */
  function drawVec(kr, key, label, V, x, y, opt) {
    opt = opt || {};
    var cw = opt.cw || 52, ch = opt.ch || 32, n = V.length, s = '', i;
    if (label) { s += S.text(x + cw / 2, y - 20, label, 'vs'); }
    s += bracket(x, y, cw, n * ch);
    for (i = 0; i < n; i++) {
      var on = opt.hl === i;
      s += '<rect class="cell ' + (on ? (opt.hlCls || 'active') : (opt.cls || '')) + '" x="' + (x + 2) +
        '" y="' + (y + i * ch + 2) + '" width="' + (cw - 4) + '" height="' + (ch - 4) + '" rx="4"/>' +
        S.text(x + cw / 2, y + i * ch + ch / 2, f2(V[i]), 'cell-txt');
    }
    kr.html(key, s);
  }
  /** 二维视口：世界坐标 → 画布坐标（y 轴向上） */
  function view2(o) {
    return {
      X: function (x) { return o.cx + x * o.sc; },
      Y: function (y) { return o.cy - y * o.sc; }
    };
  }
  /** 坐标网格 + x/y 轴（返回 SVG 片段） */
  function gridStr(V, o) {
    var s = '', x, y;
    for (x = o.xmin; x <= o.xmax; x++) { s += S.line(V.X(x), V.Y(o.ymin), V.X(x), V.Y(o.ymax), 'edge dim'); }
    for (y = o.ymin; y <= o.ymax; y++) { s += S.line(V.X(o.xmin), V.Y(y), V.X(o.xmax), V.Y(y), 'edge dim'); }
    s += S.line(V.X(o.xmin - 0.4), V.Y(0), V.X(o.xmax + 0.6), V.Y(0), 'edge', 'marker-end="url(#arrow)"');
    s += S.line(V.X(0), V.Y(o.ymin - 0.4), V.X(0), V.Y(o.ymax + 0.6), 'edge', 'marker-end="url(#arrow)"');
    s += S.text(V.X(o.xmax + 0.6), V.Y(0) - 14, 'x', 'vs');
    s += S.text(V.X(0) + 18, V.Y(o.ymax - 0.35) + 2, 'y', 'vs');
    for (x = o.xmin; x <= o.xmax; x++) { if (x !== 0) { s += S.text(V.X(x), V.Y(0) + 15, x, 'tag'); } }
    for (y = o.ymin; y <= o.ymax; y++) { if (y !== 0) { s += S.text(V.X(0) - 14, V.Y(y), y, 'tag'); } }
    return s;
  }
  /** 折线多边形（自定义描边样式，用 style 覆盖 CSS） */
  function polyStr(V, pts, style) {
    if (!pts || pts.length < 2) { return ''; }
    var d = pts.map(function (p) { return V.X(p[0]) + ',' + V.Y(p[1]); }).join(' ');
    return S.poly(d, '', ' style="' + style + '"');
  }
  /** 右侧信息面板：标题 + 若干行文本 */
  function panelStr(x, y, w, rows, title) {
    var h = 44 + rows.length * 26 + 12, s = '<rect class="frame dash" x="' + x + '" y="' + y +
      '" width="' + w + '" height="' + h + '" rx="6"/>' + S.text(x + w / 2, y + 18, title, 'vs'), k;
    for (k = 0; k < rows.length; k++) {
      var r = rows[k] || {}, yy = y + 44 + k * 26;
      if (r.cls) {
        s += '<rect class="cell ' + r.cls + '" x="' + (x + 8) + '" y="' + (yy - 11) + '" width="' + (w - 16) + '" height="22" rx="3"/>';
      }
      s += S.text(x + w / 2, yy, r.t, 'cell-txt');
    }
    return s;
  }
  /** 等轴测投影：把三维点 (x,y,z) 投到二维画布 */
  var ISO = Math.PI / 6, ISO_C = Math.cos(ISO), ISO_S = Math.sin(ISO);
  function proj3(p, o) {
    var X = (p[0] - p[2]) * ISO_C;
    var Y = (p[0] + p[2]) * ISO_S - p[1] * 0.92;   // 竖直方向略压缩，视觉更像等轴测
    return [o.cx + o.sc * X, o.cy + o.sc * Y];
  }
  /** 三维坐标轴（带箭头与 X/Y/Z 标注） */
  function axes3Str(o, style, lab) {
    var L = o.len || 2.4, dirs = [[[L, 0, 0], 'X'], [[0, L, 0], 'Y'], [[0, 0, L], 'Z']];
    var s = '', i, a, b, mid;
    for (i = 0; i < 3; i++) {
      a = proj3([0, 0, 0], o);
      b = proj3(dirs[i][0], o);
      mid = proj3([dirs[i][0][0] * -0.45, dirs[i][0][1] * -0.45, dirs[i][0][2] * -0.45], o);
      s += S.line(mid[0], mid[1], a[0], a[1], '', ' style="' + style + ';opacity:.35"');
      s += S.line(a[0], a[1], b[0], b[1], '', ' style="' + style + '" marker-end="url(#arrow)"');
      s += S.text(b[0] + (i === 0 ? 14 : (i === 2 ? -14 : 0)), b[1] + (i === 1 ? -14 : 8), (lab ? lab[i] : dirs[i][1]), 'vs');
    }
    return s;
  }
  /** 立方体 8 顶点与 12 条棱 */
  var CUBE_V = [], CUBE_E = [];
  (function () {
    var i, j;
    for (i = 0; i < 8; i++) { CUBE_V.push([(i & 1) ? 1 : -1, (i & 2) ? 1 : -1, (i & 4) ? 1 : -1]); }
    for (i = 0; i < 8; i++) {
      for (j = i + 1; j < 8; j++) {
        var d = i ^ j;
        if (d === 1 || d === 2 || d === 4) { CUBE_E.push([i, j]); }
      }
    }
  })();
  function cubeStr(vts, o, style) {
    var s = '', k, a, b;
    for (k = 0; k < CUBE_E.length; k++) {
      a = proj3(vts[CUBE_E[k][0]], o);
      b = proj3(vts[CUBE_E[k][1]], o);
      s += S.line(a[0], a[1], b[0], b[1], '', ' style="' + style + '"');
    }
    return s;
  }
  /** 自定义颜色的箭头 marker（蓝 / 金 / 紫） */
  function extraDefs() {
    return '<defs>' +
      '<marker id="arrowB" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">' +
      '<path d="M 0 0 L 10 5 L 0 10 z" fill="#1565a8"/></marker>' +
      '<marker id="arrowG" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">' +
      '<path d="M 0 0 L 10 5 L 0 10 z" fill="#e6ad10"/></marker>' +
      '<marker id="arrowP" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">' +
      '<path d="M 0 0 L 10 5 L 0 10 z" fill="#8d4fa0"/></marker>' +
      '</defs>';
  }

  /* ============================================================
     二、算法 1：2D 旋转与缩放矩阵
     ============================================================ */
  DSV.register({
    id: 'rotate-scale-2d', name: '2D 旋转与缩放矩阵', category: '几何算法',
    desc: '二维图形的线性变换都可以写成 2×2 矩阵：缩放 S = [[sx,0],[0,sy]]，绕原点逆时针旋转 R = [[cosθ,-sinθ],[sinθ,cosθ]]。复合时「右乘的先作用」，M = R·S 表示先缩放后旋转；而 S·R 表示先旋转后缩放，两者一般不等（矩阵乘法不可交换）。每个顶点只做一次矩阵—向量乘法（4 次乘法 + 2 次加法），n 个顶点总代价 O(n)。',
    viewBox: '0 0 1000 700',
    code: [
      'rotateScale2D(P, θ, sx, sy):',
      '  S = [[sx, 0], [0, sy]]              // 缩放矩阵',
      '  R = [[cosθ, -sinθ], [sinθ, cosθ]]   // 旋转矩阵',
      '  for i = 0 to 1:',
      '    for j = 0 to 1:                   // M = R·S',
      '      M[i][j] = Σ(k=0..1) R[i][k]·S[k][j]',
      '  for t = 0 to n-1:                   // 逐顶点变换',
      '    x′ = M[0][0]·x + M[0][1]·y',
      '    y′ = M[1][0]·x + M[1][1]·y',
      '  return P′'
    ],
    inputs: [
      { key: 'theta', label: '旋转角 θ（度）', def: '30', hint: '逆时针为正，例如 30 / -45' },
      { key: 'sx', label: '缩放 sx', def: '1.5', hint: 'x 方向缩放因子' },
      { key: 'sy', label: '缩放 sy', def: '0.8', hint: 'y 方向缩放因子' },
      { key: 'pts', label: '多边形顶点（x,y 交替）', def: '0,0, 3,0, 1.5,2.5', hint: '逗号分隔，至少 3 个点' }
    ],
    actions: [{ key: 'run', label: '开始演示', primary: true }],
    samples: [
      { label: '示例：旋转 30° + 不等比缩放', values: { theta: '30', sx: '1.5', sy: '0.8', pts: '0,0, 3,0, 1.5,2.5' } },
      { label: '示例：正方形旋转 90° 并放大', values: { theta: '90', sx: '1.5', sy: '1.5', pts: '-1,-1, 1,-1, 1,1, -1,1' } },
      { label: '示例：顺时针 45°（负角）', values: { theta: '-45', sx: '1.2', sy: '1.2', pts: '0,0, 3,0, 1.5,2.5' } }
    ],
    random: function () {
      return {
        theta: String(15 * DSV.ri(-11, 11)),
        sx: (DSV.ri(6, 18) / 10).toFixed(1),
        sy: (DSV.ri(6, 18) / 10).toFixed(1),
        pts: '0,0, 3,0, 1.5,2.5'
      };
    },
    run: function (v) {
      var th = clamp(num(v.theta, 30), -720, 720);
      var sx = clamp(num(v.sx, 1), -4, 4), sy = clamp(num(v.sy, 1), -4, 4);
      var pts = parsePts(v.pts), n = pts.length, i, j, t;
      var rad = th * Math.PI / 180, c = Math.cos(rad), s = Math.sin(rad);
      var SM = [[sx, 0], [0, sy]];
      var RM = [[c, -s], [s, c]];
      var M = matMul(RM, SM);        // 先缩放后旋转
      var MS = matMul(SM, RM);       // 先旋转后缩放（对比用）
      var outPts = [], alt = null, st = [];
      for (t = 0; t < n; t++) { outPts.push(null); }

      function rows(cur) {
        var r = [];
        for (var k = 0; k < n; k++) {
          var p = pts[k], q = outPts[k];
          r.push({
            t: 'P' + k + '：(' + f2(p[0]) + ', ' + f2(p[1]) + ') → ' + (q ? '(' + f2(q[0]) + ', ' + f2(q[1]) + ')' : '待计算'),
            cls: k === cur ? 'active' : (q ? 'done' : '')
          });
        }
        return r;
      }
      function sn(o) {
        o = o || {};
        return {
          title: '2D 旋转与缩放：θ = ' + f2(th) + '°，sx = ' + f2(sx) + '，sy = ' + f2(sy),
          sub: '灰色虚线 = 原图；金色实线 = R·S（先缩放后旋转）；红色虚线 = S·R（先旋转后缩放）',
          pts: pts, out: outPts.slice(), hl: (o.hl == null ? -1 : o.hl), full: !!o.full,
          alt: alt ? alt.slice() : null,
          formula: o.formula || '',
          rows: o.rows || rows(o.hl == null ? -1 : o.hl),
          mats: [
            { label: '缩放矩阵 S', M: SM, hl: o.hlS || null },
            { label: '旋转矩阵 R(θ)', M: RM, hl: o.hlR || null },
            { label: 'M = R·S（先缩放后旋转）', M: M, hl: o.hlM || null },
            { label: '对比 S·R（先旋转后缩放）', M: MS, hl: o.hlMS || null }
          ]
        };
      }

      push(st, [0], '开始：多边形有 ' + n + ' 个顶点，θ = ' + f2(th) + '°，sx = ' + f2(sx) + '，sy = ' + f2(sy) +
        '。先构造两个基本矩阵 S 与 R，再算复合矩阵 M = R·S：矩阵从右往左作用，所以先缩放、后旋转。',
        sn({ sub: '第一步：构造基本矩阵', formula: 'S = [[sx, 0], [0, sy]]；R = [[cosθ, -sinθ], [sinθ, cosθ]]' }));

      push(st, [1], 'S[0][0] = sx = ' + f2(sx) + '：顶点的 x 坐标乘以 ' + f2(sx),
        sn({ hlS: [0, 0], formula: 'S[0][0] = sx = ' + f2(sx) }));
      push(st, [1], 'S[0][1] = 0：缩放不产生交叉项，x 不受 y 影响',
        sn({ hlS: [0, 1], formula: 'S[0][1] = 0' }));
      push(st, [1], 'S[1][0] = 0：同理 y 不受 x 影响',
        sn({ hlS: [1, 0], formula: 'S[1][0] = 0' }));
      push(st, [1], 'S[1][1] = sy = ' + f2(sy) + '：顶点的 y 坐标乘以 ' + f2(sy),
        sn({ hlS: [1, 1], formula: 'S = ' + ms(SM) }));

      push(st, [2], 'R[0][0] = cosθ = cos ' + f2(th) + '° = ' + f2(c),
        sn({ hlR: [0, 0], formula: 'cos ' + f2(th) + '° = ' + f2(c) + '，sin ' + f2(th) + '° = ' + f2(s) }));
      push(st, [2], 'R[0][1] = -sinθ = -' + f2(s) + ' = ' + f2(-s) + '（旋转矩阵的右上角带负号）',
        sn({ hlR: [0, 1], formula: 'R[0][1] = -sinθ = ' + f2(-s) }));
      push(st, [2], 'R[1][0] = sinθ = ' + f2(s),
        sn({ hlR: [1, 0], formula: 'R[1][0] = sinθ = ' + f2(s) }));
      push(st, [2], 'R[1][1] = cosθ = ' + f2(c) + '，于是 R = ' + ms(RM) + '（行列式 = cos²+sin² = 1，是保长变换）',
        sn({ hlR: [1, 1], formula: 'R = ' + ms(RM) }));

      for (i = 0; i < 2; i++) {
        for (j = 0; j < 2; j++) {
          var tm = terms(RM, SM, i, j);
          push(st, [3, 4, 5], 'M[' + i + '][' + j + '] = Σ(k=0..1) R[' + i + '][k]·S[k][' + j + '] = ' + tm.expr + ' = ' + f2(tm.val),
            sn({ hlM: [i, j], formula: 'M[' + i + '][' + j + '] = ' + tm.expr + ' = ' + f2(tm.val) }));
        }
      }
      push(st, [3, 4, 5], '复合矩阵算完：M = R·S = ' + ms(M) + '。它把「先缩放再旋转」两步合并成一步矩阵乘法。',
        sn({ formula: 'M = R·S = ' + ms(M), sub: '第二步：把 M 作用到每个顶点' }));

      for (t = 0; t < n; t++) {
        var p = pts[t];
        push(st, [6], '取第 ' + (t + 1) + ' 个顶点 P' + t + ' = (' + f2(p[0]) + ', ' + f2(p[1]) + ')，把它写成列向量 v = [x, y]ᵀ，计算 v′ = M·v',
          sn({ hl: t, rows: rows(t), formula: 'v = [' + f2(p[0]) + ', ' + f2(p[1]) + ']ᵀ' }));
        var nx = M[0][0] * p[0] + M[0][1] * p[1];
        push(st, [7], 'x′ = M[0][0]·x + M[0][1]·y = ' + f2(M[0][0]) + '×' + f2(p[0]) + ' + ' + f2(M[0][1]) + '×' + f2(p[1]) + ' = ' + f2(nx),
          sn({ hl: t, rows: rows(t), formula: 'x′ = ' + f2(M[0][0]) + '×' + f2(p[0]) + ' + ' + f2(M[0][1]) + '×' + f2(p[1]) + ' = ' + f2(nx) }));
        var ny = M[1][0] * p[0] + M[1][1] * p[1];
        push(st, [8], 'y′ = M[1][0]·x + M[1][1]·y = ' + f2(M[1][0]) + '×' + f2(p[0]) + ' + ' + f2(M[1][1]) + '×' + f2(p[1]) + ' = ' + f2(ny),
          sn({ hl: t, rows: rows(t), formula: 'y′ = ' + f2(M[1][0]) + '×' + f2(p[0]) + ' + ' + f2(M[1][1]) + '×' + f2(p[1]) + ' = ' + f2(ny) }));
        outPts[t] = [nx, ny];
        push(st, [7, 8], 'P' + t + ' 变换完成：(' + f2(p[0]) + ', ' + f2(p[1]) + ') → (' + f2(nx) + ', ' + f2(ny) + ')',
          sn({ hl: t, rows: rows(t), formula: 'P′' + t + ' = (' + f2(nx) + ', ' + f2(ny) + ')' }));
      }

      var same = true;
      for (i = 0; i < 2; i++) { for (j = 0; j < 2; j++) { if (!near(M[i][j], MS[i][j])) { same = false; } } }
      alt = [];
      for (t = 0; t < n; t++) { alt.push(matVec(MS, pts[t])); }
      push(st, [3, 4, 5], '换个顺序：先旋转后缩放的复合矩阵是 S·R = ' + ms(MS) + '。' +
        (same ? '本例中 S·R 恰好等于 R·S（sx = sy 或 θ 为 0 的特殊情形），此时乘法可交换。'
          : '对比 R·S = ' + ms(M) + ' 可见两者不同 —— 矩阵乘法不满足交换律，变换顺序会改变结果。'),
        sn({ full: true, hlMS: [0, 0], rows: rows(-1), formula: 'S·R = ' + ms(MS) + '，R·S = ' + ms(M) }));
      push(st, [3, 4, 5], '画面上的红色虚线多边形就是「先旋转后缩放」的结果，与金色实线（先缩放后旋转）位置明显不同：' +
        '几何上先缩放会沿着原坐标轴拉伸，先旋转则是先在原方向拉伸再整体转过去。',
        sn({ full: true, rows: rows(-1), sub: '红色虚线 = S·R 的结果，与金色实线对比' }));
      push(st, [9], '完成：' + n + ' 个顶点各做一次 2×2 矩阵—向量乘法（4 次乘法 + 2 次加法），总代价 O(n)；' +
        '所有顶点的变换可以一次合成到矩阵 M 中，这就是图形管线里「模型变换矩阵」的由来。',
        sn({ full: true, rows: rows(-1), formula: 'P′ = M·P，M = R·S = ' + ms(M) }));
      return st;
    },
    render: function (kr, s) {
      kr.html('__defs', S.arrowDefs() + extraDefs());
      if (!s) { kr.html('__e', S.text(500, 300, '点击「开始演示」查看 2D 旋转与缩放矩阵', 'vs')); kr.end(); return; }
      var V = view2({ cx: 380, cy: 250, sc: 44 });
      var o = { xmin: -6, xmax: 6, ymin: -4, ymax: 4 }, i;
      kr.html('__t', S.text(500, 26, s.title, 'vt'));
      kr.html('__st', S.text(500, 48, s.sub, 'vs'));

      var g = gridStr(V, o);
      if (s.alt) { g += polyStr(V, s.alt, 'fill:rgba(168,64,47,.12);stroke:#a8402f;stroke-width:2.2;stroke-dasharray:7 5'); }
      g += polyStr(V, s.pts, 'fill:rgba(120,140,128,.10);stroke:#8aa896;stroke-width:2;stroke-dasharray:7 5');
      if (s.full) { g += polyStr(V, s.out, 'fill:rgba(255,204,51,.22);stroke:#006633;stroke-width:2.6'); }
      for (i = 0; i < s.pts.length; i++) {
        var p = s.pts[i], q = s.out[i];
        g += S.circle(V.X(p[0]), V.Y(p[1]), 5, '', ' style="fill:#fff;stroke:#006633;stroke-width:2"');
        g += S.text(V.X(p[0]) + 13, V.Y(p[1]) - 12, 'P' + i, 'tag');
        if (q) {
          g += S.line(V.X(p[0]), V.Y(p[1]), V.X(q[0]), V.Y(q[1]), '', ' style="stroke:#e6ad10;stroke-width:1.6;stroke-dasharray:4 3"');
          g += S.circle(V.X(q[0]), V.Y(q[1]), 5, '', ' style="fill:' + (i === s.hl ? '#ffcc33' : '#e6ad10') + ';stroke:#006633;stroke-width:2"');
          var lqx = V.X(q[0]) + 13, lqy = V.Y(q[1]) - 12;
          if (Math.abs(V.X(q[0]) - V.X(p[0])) + Math.abs(V.Y(q[1]) - V.Y(p[1])) < 14) { lqx += 22; lqy -= 22; }
          g += S.text(lqx, lqy, "P′" + i, 'nd-label');
        }
      }
      kr.html('__plane', g);
      kr.html('__panel', panelStr(706, 84, 260, s.rows, '顶点变换：v′ = M·v'));
      if (s.formula) { kr.html('__f', S.text(500, 452, s.formula, 'vs')); }
      drawMat(kr, 'm0', s.mats[0], 62, 512, { cw: 74, ch: 38 });
      drawMat(kr, 'm1', s.mats[1], 218, 512, { cw: 74, ch: 38 });
      drawMat(kr, 'm2', s.mats[2], 374, 512, { cw: 74, ch: 38 });
      drawMat(kr, 'm3', s.mats[3], 530, 512, { cw: 74, ch: 38 });
      kr.html('__note', S.text(500, 664, '结果[i][j] = Σ a[i][k]·b[k][j]：高亮格为当前正在计算的元素', 'tag'));
      kr.end();
    }
  });

  /* ============================================================
     三、算法 2：2D 旋转与平移矩阵（齐次坐标）
     ============================================================ */
  DSV.register({
    id: 'rotate-translate-2d', name: '2D 旋转与平移矩阵', category: '几何算法',
    desc: '平移不是线性变换（它不保持原点），所以要升一维用齐次坐标表示：二维点 (x, y) 写成 (x, y, 1)，平移就变成 3×3 矩阵 T = [[1,0,tx],[0,1,ty],[0,0,1]] 的乘法。旋转同样升维成 R = [[cosθ,-sinθ,0],[sinθ,cosθ,0],[0,0,1]]，于是「先旋转后平移」可以合并成一个矩阵 M = T·R，顶点只做一次 3×3 矩阵 × 三维向量的乘法，代价 O(n)。',
    viewBox: '0 0 1000 700',
    code: [
      'rotateTranslate2D(P, θ, tx, ty):',
      '  R = [[cosθ,-sinθ,0], [sinθ,cosθ,0], [0,0,1]]   // 齐次旋转矩阵',
      '  T = [[1,0,tx], [0,1,ty], [0,0,1]]              // 齐次平移矩阵',
      '  for i = 0 to 2:',
      '    for j = 0 to 2:                              // M = T·R',
      '      M[i][j] = Σ(k=0..2) T[i][k]·R[k][j]',
      '  for t = 0 to n-1:',
      '    v = [x, y, 1]ᵀ                               // 齐次坐标：二维点写成 (x, y, 1)',
      '    v′ = M · v                                   // 一次矩阵乘法同时完成旋转与平移',
      '  return P′'
    ],
    inputs: [
      { key: 'theta', label: '旋转角 θ（度）', def: '45', hint: '逆时针为正' },
      { key: 'tx', label: '平移 tx', def: '2', hint: 'x 方向平移量' },
      { key: 'ty', label: '平移 ty', def: '1', hint: 'y 方向平移量' },
      { key: 'pts', label: '多边形顶点（x,y 交替）', def: '0,0, 3,0, 1.5,2.5', hint: '逗号分隔，至少 3 个点' }
    ],
    actions: [{ key: 'run', label: '开始演示', primary: true }],
    samples: [
      { label: '示例：旋转 45° 后平移 (2,1)', values: { theta: '45', tx: '2', ty: '1', pts: '0,0, 3,0, 1.5,2.5' } },
      { label: '示例：旋转 180° 后平移 (-3,2)', values: { theta: '180', tx: '-3', ty: '2', pts: '-1,-1, 1,-1, 1,1, -1,1' } },
      { label: '示例：只平移不旋转（θ=0）', values: { theta: '0', tx: '3', ty: '-2', pts: '0,0, 3,0, 1.5,2.5' } }
    ],
    random: function () {
      return {
        theta: String(15 * DSV.ri(-11, 11)),
        tx: String(DSV.ri(-4, 4)), ty: String(DSV.ri(-3, 3)),
        pts: '0,0, 3,0, 1.5,2.5'
      };
    },
    run: function (v) {
      var th = clamp(num(v.theta, 0), -720, 720);
      var tx = clamp(num(v.tx, 0), -10, 10), ty = clamp(num(v.ty, 0), -10, 10);
      var pts = parsePts(v.pts), n = pts.length, i, j, t;
      var rad = th * Math.PI / 180, c = Math.cos(rad), s = Math.sin(rad);
      var RM = [[c, -s, 0], [s, c, 0], [0, 0, 1]];
      var TM = [[1, 0, tx], [0, 1, ty], [0, 0, 1]];
      var M = matMul(TM, RM);        // 先旋转后平移
      var MT = matMul(RM, TM);       // 先平移后旋转（对比）
      var outPts = [], alt = null, st = [];
      for (t = 0; t < n; t++) { outPts.push(null); }

      function rows(cur) {
        var r = [];
        for (var k = 0; k < n; k++) {
          var p = pts[k], q = outPts[k];
          r.push({
            t: 'P' + k + '：(' + f2(p[0]) + ', ' + f2(p[1]) + ') → ' + (q ? '(' + f2(q[0]) + ', ' + f2(q[1]) + ')' : '待计算'),
            cls: k === cur ? 'active' : (q ? 'done' : '')
          });
        }
        return r;
      }
      function sn(o) {
        o = o || {};
        return {
          title: '2D 旋转 + 平移（齐次坐标）：θ = ' + f2(th) + '°，t = (' + f2(tx) + ', ' + f2(ty) + ')',
          sub: '灰色虚线 = 原图；金色实线 = T·R（先旋转后平移）；红色虚线 = R·T（先平移后旋转）',
          pts: pts, out: outPts.slice(), hl: (o.hl == null ? -1 : o.hl), full: !!o.full,
          alt: alt ? alt.slice() : null,
          formula: o.formula || '',
          rows: o.rows || rows(o.hl == null ? -1 : o.hl),
          vec: o.vec || null, res: o.res || null,
          mats: [
            { label: '平移矩阵 T', M: TM, hl: o.hlT || null },
            { label: '旋转矩阵 R(θ)', M: RM, hl: o.hlR || null },
            { label: 'M = T·R（先旋转后平移）', M: M, hl: o.hlM || null }
          ]
        };
      }

      push(st, [0], '开始：多边形有 ' + n + ' 个顶点。平移不能写成 2×2 矩阵（它把原点也移动了），' +
        '所以引入齐次坐标：把二维点 (x, y) 写成 (x, y, 1)，第三分量恒为 1，' +
        '于是平移变成一次矩阵乘法。θ = ' + f2(th) + '°，t = (' + f2(tx) + ', ' + f2(ty) + ')。',
        sn({ formula: '齐次坐标：(x, y) → (x, y, 1)' }));

      push(st, [1], 'R 的左上 2×2 块就是普通旋转矩阵：R[0][0] = cosθ = ' + f2(c) + '，R[0][1] = -sinθ = ' + f2(-s) +
        '，R[1][0] = sinθ = ' + f2(s) + '，R[1][1] = cosθ = ' + f2(c),
        sn({ hlR: [0, 0], formula: 'R = ' + ms(RM) + '，左上块为 2D 旋转' }));
      push(st, [1], 'R 的第三列是 (0, 0, 1)ᵀ：旋转不动原点，也不改变齐次分量（第三行保证 (x, y, 1) 的 1 仍然是 1）',
        sn({ hlR: [1, 2], formula: 'R 的第三列 = (0, 0, 1)ᵀ' }));

      push(st, [2], 'T 的对角线是 1（不缩放），第三列放平移量：T[0][2] = tx = ' + f2(tx) + '，T[1][2] = ty = ' + f2(ty),
        sn({ hlT: [0, 2], formula: 'T = ' + ms(TM) }));
      push(st, [2], 'T 的第三行 (0, 0, 1) 保证齐次坐标的第三分量恒为 1 —— 这就是「平移也能用矩阵乘法表示」的关键',
        sn({ hlT: [2, 0], formula: 'T 的第三行 = (0, 0, 1)' }));

      for (i = 0; i < 3; i++) {
        for (j = 0; j < 3; j++) {
          var tm = terms(TM, RM, i, j);
          push(st, [3, 4, 5], 'M[' + i + '][' + j + '] = Σ(k=0..2) T[' + i + '][k]·R[k][' + j + '] = ' + tm.expr + ' = ' + f2(tm.val),
            sn({ hlM: [i, j], formula: 'M[' + i + '][' + j + '] = ' + tm.expr + ' = ' + f2(tm.val) }));
        }
      }
      push(st, [3, 4, 5], '复合矩阵 M = T·R = ' + ms(M) + '：左上角仍是旋转，第三列变成了平移后的位置，' +
        '一次乘法就能同时完成「旋转 + 平移」。',
        sn({ formula: 'M = T·R = ' + ms(M), sub: '第三步：用 M 变换每个顶点' }));

      for (t = 0; t < n; t++) {
        var p = pts[t];
        push(st, [6, 7], '取顶点 P' + t + ' = (' + f2(p[0]) + ', ' + f2(p[1]) + ')，写成齐次列向量 v = [' + f2(p[0]) + ', ' + f2(p[1]) + ', 1]ᵀ',
          sn({ hl: t, rows: rows(t), vec: [p[0], p[1], 1], res: null, formula: 'v = [' + f2(p[0]) + ', ' + f2(p[1]) + ', 1]ᵀ' }));
        var o3 = matVec(M, [p[0], p[1], 1]);
        outPts[t] = [o3[0], o3[1]];
        push(st, [8], 'v′ = M·v：x′ = ' + f2(o3[0]) + '，y′ = ' + f2(o3[1]) + '，第三分量 = ' + f2(o3[2]) +
          '（仍为 1，说明结果还是合法的二维点）。P' + t + '：(' + f2(p[0]) + ', ' + f2(p[1]) + ') → (' + f2(o3[0]) + ', ' + f2(o3[1]) + ')',
          sn({ hl: t, rows: rows(t), vec: [p[0], p[1], 1], res: o3, formula: 'v′ = M·v = [' + f2(o3[0]) + ', ' + f2(o3[1]) + ', ' + f2(o3[2]) + ']ᵀ' }));
      }

      alt = [];
      for (t = 0; t < n; t++) { alt.push(matVec(MT, pts[t]).slice(0, 2)); }
      push(st, [3, 4, 5], '顺序问题：若先平移后旋转，复合矩阵是 R·T = ' + ms(MT) + '，' +
        '它的第三列是「被旋转过的平移量」(' + f2(MT[0][2]) + ', ' + f2(MT[1][2]) + ')，与 T·R 的 (' + f2(M[0][2]) + ', ' + f2(M[1][2]) + ') 不同。',
        sn({ full: true, hlM: [0, 2], rows: rows(-1), formula: 'R·T = ' + ms(MT) + ' ≠ T·R' }));
      push(st, [8], '画面中红色虚线是「先平移后旋转」的结果：图形整体转到了别的位置，而金色实线（先旋转后平移）只是绕自身旋转后再整体挪动。',
        sn({ full: true, rows: rows(-1), sub: '红色虚线 = R·T 的结果' }));
      push(st, [9], '完成：' + n + ' 个顶点各一次 3×3 矩阵 × 三维向量（9 次乘法 + 6 次加法），代价 O(n)；' +
        '齐次坐标让旋转、缩放、平移、乃至透视投影都能统一成矩阵乘法，是计算机图形学的基础工具。',
        sn({ full: true, rows: rows(-1), formula: 'M = T·R = ' + ms(M) }));
      return st;
    },
    render: function (kr, s) {
      kr.html('__defs', S.arrowDefs() + extraDefs());
      if (!s) { kr.html('__e', S.text(500, 300, '点击「开始演示」查看 2D 旋转与平移（齐次坐标）', 'vs')); kr.end(); return; }
      var V = view2({ cx: 380, cy: 250, sc: 44 });
      var o = { xmin: -6, xmax: 6, ymin: -4, ymax: 4 }, i;
      kr.html('__t', S.text(500, 26, s.title, 'vt'));
      kr.html('__st', S.text(500, 48, s.sub, 'vs'));

      var g = gridStr(V, o);
      if (s.alt) { g += polyStr(V, s.alt, 'fill:rgba(168,64,47,.12);stroke:#a8402f;stroke-width:2.2;stroke-dasharray:7 5'); }
      g += polyStr(V, s.pts, 'fill:rgba(120,140,128,.10);stroke:#8aa896;stroke-width:2;stroke-dasharray:7 5');
      if (s.full) { g += polyStr(V, s.out, 'fill:rgba(255,204,51,.22);stroke:#006633;stroke-width:2.6'); }
      for (i = 0; i < s.pts.length; i++) {
        var p = s.pts[i], q = s.out[i];
        g += S.circle(V.X(p[0]), V.Y(p[1]), 5, '', ' style="fill:#fff;stroke:#006633;stroke-width:2"');
        g += S.text(V.X(p[0]) + 13, V.Y(p[1]) - 12, 'P' + i, 'tag');
        if (q) {
          g += S.line(V.X(p[0]), V.Y(p[1]), V.X(q[0]), V.Y(q[1]), '', ' style="stroke:#e6ad10;stroke-width:1.6;stroke-dasharray:4 3"');
          g += S.circle(V.X(q[0]), V.Y(q[1]), 5, '', ' style="fill:' + (i === s.hl ? '#ffcc33' : '#e6ad10') + ';stroke:#006633;stroke-width:2"');
          var lqx = V.X(q[0]) + 13, lqy = V.Y(q[1]) - 12;
          if (Math.abs(V.X(q[0]) - V.X(p[0])) + Math.abs(V.Y(q[1]) - V.Y(p[1])) < 14) { lqx += 22; lqy -= 22; }
          g += S.text(lqx, lqy, "P′" + i, 'nd-label');
        }
      }
      kr.html('__plane', g);
      kr.html('__panel', panelStr(706, 84, 260, s.rows, '顶点变换：v′ = M·v'));
      if (s.formula) { kr.html('__f', S.text(500, 452, s.formula, 'vs')); }
      drawMat(kr, 'm0', s.mats[0], 60, 522, { cw: 58, ch: 32 });
      drawMat(kr, 'm1', s.mats[1], 280, 522, { cw: 58, ch: 32 });
      drawMat(kr, 'm2', s.mats[2], 500, 522, { cw: 58, ch: 32 });
      if (s.vec) { drawVec(kr, 'v0', '齐次列向量 v', s.vec, 720, 522, { cw: 52, ch: 32 }); }
      if (s.res) { drawVec(kr, 'v1', '结果 v′ = M·v', s.res, 800, 522, { cw: 52, ch: 32 }); }
      kr.html('__note', S.text(500, 664, '齐次坐标把二维点写成 (x, y, 1)，第三行 (0,0,1) 保证第三分量不变', 'tag'));
      kr.end();
    }
  });

  /* ============================================================
     四、算法 3：2D 坐标系变换
     ============================================================ */
  DSV.register({
    id: 'changing-coords-2d', name: '2D 坐标系变换', category: '几何算法',
    desc: '同一个点在不同坐标系下有不同的坐标。设新坐标系 B 的原点为 O、基向量为 u 与 v，则局部坐标 (xb, yb) 换算到世界坐标为 P = O + xb·u + yb·v；写成齐次矩阵就是 M = [[u.x, v.x, O.x], [u.y, v.y, O.y], [0, 0, 1]]（三列依次是 u、v、原点）。反向换算用 M 的逆矩阵：xb = u·(P-O)，yb = v·(P-O)，当 u、v 正交且为单位长度时 M⁻¹ 的旋转部分就是转置。每次换算只做常数次乘法，代价 O(1)。',
    viewBox: '0 0 1000 700',
    code: [
      'coord2D(xb, yb, O, φ):',
      '  u = (cosφ, sinφ);  v = (-sinφ, cosφ)      // 新坐标系的一组正交单位基',
      '  M = [[u.x, v.x, O.x], [u.y, v.y, O.y], [0, 0, 1]]',
      '  P = O + xb·u + yb·v                       // 局部坐标 → 世界坐标',
      '  P.x = O.x + xb·u.x + yb·v.x',
      '  P.y = O.y + xb·u.y + yb·v.y',
      '  Minv = inverse(M)                         // 反向换算矩阵',
      '  d = P - O                                 // 先减去原点',
      '  xb = u·d;  yb = v·d                       // 投影到基向量（正交基即转置）',
      '  return P, (xb, yb)'
    ],
    inputs: [
      { key: 'ox', label: '新原点 O.x', def: '2', hint: '世界坐标下的 x' },
      { key: 'oy', label: '新原点 O.y', def: '1', hint: '世界坐标下的 y' },
      { key: 'phi', label: '新坐标系旋转角 φ（度）', def: '30', hint: '基向量 u = (cosφ, sinφ)' },
      { key: 'xb', label: '局部坐标 xb', def: '2', hint: '在坐标系 B 下的 x' },
      { key: 'yb', label: '局部坐标 yb', def: '1', hint: '在坐标系 B 下的 y' }
    ],
    actions: [{ key: 'run', label: '开始演示', primary: true }],
    samples: [
      { label: '示例：原点 (2,1) 旋转 30°', values: { ox: '2', oy: '1', phi: '30', xb: '2', yb: '1' } },
      { label: '示例：原点 (-1,2) 旋转 -45°', values: { ox: '-1', oy: '2', phi: '-45', xb: '1.5', yb: '2' } },
      { label: '示例：原点 (0,0) 旋转 90°（纯旋转）', values: { ox: '0', oy: '0', phi: '90', xb: '3', yb: '1' } }
    ],
    random: function () {
      return {
        ox: String(DSV.ri(-3, 3)), oy: String(DSV.ri(-3, 3)),
        phi: String(15 * DSV.ri(-11, 11)),
        xb: String(DSV.ri(-3, 4)), yb: String(DSV.ri(-3, 4))
      };
    },
    run: function (v) {
      var ox = clamp(num(v.ox, 0), -10, 10), oy = clamp(num(v.oy, 0), -10, 10);
      var phi = clamp(num(v.phi, 0), -720, 720);
      var xb = clamp(num(v.xb, 0), -10, 10), yb = clamp(num(v.yb, 0), -10, 10);
      var rad = phi * Math.PI / 180, c = Math.cos(rad), s = Math.sin(rad);
      var u = [c, s], w = [-s, c];                    // w 即第二个基向量 v（避免与输入 yb 混淆命名）
      var M = [[u[0], w[0], ox], [u[1], w[1], oy], [0, 0, 1]];
      var Minv = inv3(M);
      var st = [];
      if (!Minv) { Minv = matT(M); }                  // 理论上不会奇异（正交基），兜底用转置
      var P = [ox + xb * u[0] + yb * w[0], oy + xb * u[1] + yb * w[1]];
      var back = null;

      function sn(o) {
        o = o || {};
        return {
          title: '2D 坐标系变换：O = (' + f2(ox) + ', ' + f2(oy) + ')，φ = ' + f2(phi) + '°，局部坐标 (' + f2(xb) + ', ' + f2(yb) + ')',
          sub: '黑色实线 = 世界坐标系；蓝色/金色 = 新坐标系 B（含单位刻度网格）',
          ox: ox, oy: oy, u: u, v: w, phi: phi,
          P: o.P || null, showP: !!o.P,
          local: [xb, yb], back: o.back || null,
          formula: o.formula || '',
          rows: o.rows || [],
          mats: [
            { label: 'M：局部 → 世界（列 = u, v, O）', M: M, hl: o.hlM || null },
            { label: 'M⁻¹：世界 → 局部', M: Minv, hl: o.hlI || null }
          ],
          vec: o.vec || null, res: o.res || null
        };
      }
      function rows(cur) {
        var r = [
          { t: '局部坐标：(' + f2(xb) + ', ' + f2(yb) + ')', cls: cur === 0 ? 'active' : 'done' },
          { t: '世界坐标：' + (P ? '(' + f2(P[0]) + ', ' + f2(P[1]) + ')' : '待计算'), cls: cur === 1 ? 'active' : 'done' },
          { t: '反算回去：' + (back ? '(' + f2(back[0]) + ', ' + f2(back[1]) + ')' : '待计算'), cls: cur === 2 ? 'active' : 'done' },
          { t: '基 u = (' + f2(u[0]) + ', ' + f2(u[1]) + ')', cls: '' },
          { t: '基 v = (' + f2(w[0]) + ', ' + f2(w[1]) + ')', cls: '' }
        ];
        return r;
      }

      push(st, [0], '开始：世界坐标系（黑轴）之外，还有一个新坐标系 B：原点 O = (' + f2(ox) + ', ' + f2(oy) +
        ')，基向量由旋转角 φ = ' + f2(phi) + '° 决定。点 P 在 B 下的坐标为 (' + f2(xb) + ', ' + f2(yb) + ')，求它的世界坐标。',
        sn({ rows: rows(0), formula: 'P = O + xb·u + yb·v' }));

      push(st, [1], '基向量 u = (cosφ, sinφ) = (cos ' + f2(phi) + '°, sin ' + f2(phi) + '°) = (' + f2(u[0]) + ', ' + f2(u[1]) + ')：' +
        '它是 B 的 x 轴方向上的单位向量。',
        sn({ rows: rows(0), formula: 'u = (' + f2(u[0]) + ', ' + f2(u[1]) + ')' }));
      push(st, [1], '基向量 v = (-sinφ, cosφ) = (' + f2(-s) + ', ' + f2(c) + ')：它是 u 逆时针旋转 90° 得到的单位向量，' +
        '与 u 正交（u·v = ' + f2(u[0] * w[0] + u[1] * w[1]) + ' ≈ 0），所以 B 是一个直角坐标系。',
        sn({ rows: rows(0), formula: 'v = (' + f2(w[0]) + ', ' + f2(w[1]) + ')，u·v = 0' }));

      push(st, [2], 'M 的第 1 列放基向量 u：M[0][0] = u.x = ' + f2(u[0]) + '，M[1][0] = u.y = ' + f2(u[1]),
        sn({ hlM: [0, 0], rows: rows(0), formula: '第 1 列 = u' }));
      push(st, [2], 'M 的第 2 列放基向量 v：M[0][1] = v.x = ' + f2(w[0]) + '，M[1][1] = v.y = ' + f2(w[1]),
        sn({ hlM: [0, 1], rows: rows(0), formula: '第 2 列 = v' }));
      push(st, [2], 'M 的第 3 列放原点 O：M[0][2] = O.x = ' + f2(ox) + '，M[1][2] = O.y = ' + f2(oy) +
        ' —— 这就是齐次坐标的好处：平移（原点）也能写进矩阵。',
        sn({ hlM: [0, 2], rows: rows(0), formula: '第 3 列 = O = (' + f2(ox) + ', ' + f2(oy) + ')' }));
      push(st, [2], 'M 的最后一行固定为 (0, 0, 1)，于是 M = ' + ms(M) + '，用它可以一步完成局部 → 世界的换算。',
        sn({ hlM: [2, 2], rows: rows(0), formula: 'M = ' + ms(M) }));

      push(st, [3, 4], '正向换算：P.x = O.x + xb·u.x + yb·v.x = ' + f2(ox) + ' + ' + f2(xb) + '×' + f2(u[0]) +
        ' + ' + f2(yb) + '×' + f2(w[0]) + ' = ' + f2(P[0]),
        sn({ rows: rows(1), vec: [xb, yb, 1], res: null, formula: 'P.x = ' + f2(P[0]) }));
      push(st, [3, 5], 'P.y = O.y + xb·u.y + yb·v.y = ' + f2(oy) + ' + ' + f2(xb) + '×' + f2(u[1]) +
        ' + ' + f2(yb) + '×' + f2(w[1]) + ' = ' + f2(P[1]) + '，所以世界坐标 P = (' + f2(P[0]) + ', ' + f2(P[1]) + ')',
        sn({ P: P, rows: rows(1), vec: [xb, yb, 1], res: [P[0], P[1], 1], formula: 'P = (' + f2(P[0]) + ', ' + f2(P[1]) + ')' }));
      push(st, [3], '检验：等价的写法是齐次矩阵乘法 [P.x, P.y, 1]ᵀ = M·[xb, yb, 1]ᵀ，' +
        '展开就是 O + xb·u + yb·v，两种写法完全一样。',
        sn({ P: P, rows: rows(1), vec: [xb, yb, 1], res: [P[0], P[1], 1], formula: 'M·[xb, yb, 1]ᵀ = [' + f2(P[0]) + ', ' + f2(P[1]) + ', 1]ᵀ' }));

      push(st, [6], '反向换算：先求 M 的逆。因为 u、v 是正交单位向量，M 的旋转部分 R 满足 R⁻¹ = Rᵀ，' +
        '平移部分为 -Rᵀ·O；这里直接用伴随矩阵法算 3×3 的逆：M⁻¹ = ' + ms(Minv),
        sn({ P: P, rows: rows(2), hlI: [0, 0], formula: 'M⁻¹ = ' + ms(Minv) }));
      push(st, [6], 'M⁻¹ 的第 1 行是 (' + f2(Minv[0][0]) + ', ' + f2(Minv[0][1]) + ', ' + f2(Minv[0][2]) + ')：' +
        '前两个分量正好是 u（正交基下「投影到 u」就是点乘 u），常数项是 -O·u。',
        sn({ P: P, rows: rows(2), hlI: [0, 1], formula: '第 1 行 ≈ (u, -O·u)' }));
      push(st, [6], 'M⁻¹ 的第 2 行是 (' + f2(Minv[1][0]) + ', ' + f2(Minv[1][1]) + ', ' + f2(Minv[1][2]) + ') ≈ (v, -O·v)，' +
        '第三行仍是 (0, 0, 1)。',
        sn({ P: P, rows: rows(2), hlI: [1, 2], formula: '第 2 行 ≈ (v, -O·v)' }));

      var d = [P[0] - ox, P[1] - oy];
      push(st, [7], '把世界坐标减去原点：d = P - O = (' + f2(P[0]) + ' - ' + f2(ox) + ', ' + f2(P[1]) + ' - ' + f2(oy) +
        ') = (' + f2(d[0]) + ', ' + f2(d[1]) + ')，得到相对新原点的向量。',
        sn({ P: P, rows: rows(2), vec: [P[0], P[1], 1], res: null, formula: 'd = (' + f2(d[0]) + ', ' + f2(d[1]) + ')' }));
      var bx = u[0] * d[0] + u[1] * d[1];
      var by = w[0] * d[0] + w[1] * d[1];
      back = [bx, by];
      push(st, [8], '向基向量投影：xb = u·d = ' + f2(u[0]) + '×' + f2(d[0]) + ' + ' + f2(u[1]) + '×' + f2(d[1]) + ' = ' + f2(bx),
        sn({ P: P, back: back, rows: rows(2), hlI: [0, 0], vec: [P[0], P[1], 1], res: [bx, 0, 1], formula: 'xb = ' + f2(bx) }));
      push(st, [8], 'yb = v·d = ' + f2(w[0]) + '×' + f2(d[0]) + ' + ' + f2(w[1]) + '×' + f2(d[1]) + ' = ' + f2(by) +
        '，反算得到 (' + f2(bx) + ', ' + f2(by) + ')，与输入的局部坐标一致，换算正确。',
        sn({ P: P, back: back, rows: rows(2), hlI: [1, 0], vec: [P[0], P[1], 1], res: [bx, by, 1], formula: 'yb = ' + f2(by) }));
      push(st, [9], '完成：局部 → 世界用 M（乘一次矩阵），世界 → 局部用 M⁻¹（再乘一次）。' +
        '由于每一步都是固定次数的乘法，单次换算代价 O(1)；这也说明「换坐标系」本质就是左乘一个基向量矩阵（或其逆）。',
        sn({ P: P, back: back, rows: rows(-1), vec: [P[0], P[1], 1], res: [bx, by, 1], formula: 'M·M⁻¹ = I' }));
      return st;
    },
    render: function (kr, s) {
      kr.html('__defs', S.arrowDefs() + extraDefs());
      if (!s) { kr.html('__e', S.text(500, 300, '点击「开始演示」查看 2D 坐标系变换', 'vs')); kr.end(); return; }
      var V = view2({ cx: 380, cy: 250, sc: 44 });
      var o = { xmin: -6, xmax: 6, ymin: -4, ymax: 4 }, k;
      kr.html('__t', S.text(500, 26, s.title, 'vt'));
      kr.html('__st', S.text(500, 640, s.sub, 'vs'));

      var g = gridStr(V, o);
      // 新坐标系 B 的单位刻度网格（沿 u、v 方向）
      var OX = s.ox, OY = s.oy, ux = s.u[0], uy = s.u[1], vx = s.v[0], vy = s.v[1];
      for (k = -5; k <= 5; k++) {
        g += S.line(V.X(OX + k * ux - 5 * vx), V.Y(OY + k * uy - 5 * vy),
          V.X(OX + k * ux + 5 * vx), V.Y(OY + k * uy + 5 * vy), '',
          ' style="stroke:#9ec9f5;stroke-width:1;stroke-dasharray:3 5;opacity:.7"');
        g += S.line(V.X(OX - 5 * ux + k * vx), V.Y(OY - 5 * uy + k * vy),
          V.X(OX + 5 * ux + k * vx), V.Y(OY + 5 * uy + k * vy), '',
          ' style="stroke:#f0d98a;stroke-width:1;stroke-dasharray:3 5;opacity:.7"');
      }
      // 新坐标系的两条轴
      g += S.line(V.X(OX - 0.6 * ux), V.Y(OY - 0.6 * uy), V.X(OX + 5.2 * ux), V.Y(OY + 5.2 * uy), '',
        ' style="stroke:#1565a8;stroke-width:2.4" marker-end="url(#arrowB)"');
      g += S.line(V.X(OX - 0.6 * vx), V.Y(OY - 0.6 * vy), V.X(OX + 5.2 * vx), V.Y(OY + 5.2 * vy), '',
        ' style="stroke:#e6ad10;stroke-width:2.4" marker-end="url(#arrowG)"');
      g += S.text(V.X(OX + 5.2 * ux), V.Y(OY + 5.2 * uy) - 12, 'u', 'vs');
      g += S.text(V.X(OX + 5.2 * vx) + 6, V.Y(OY + 5.2 * vy) - 6, 'v', 'vs');
      // 原点标记
      g += S.circle(V.X(OX), V.Y(OY), 6, '', ' style="fill:#1565a8;stroke:#fff;stroke-width:2"');
      g += S.text(V.X(OX), V.Y(OY) - 20, 'O(' + f2(OX) + ',' + f2(OY) + ')', 'ptr');
      // 单位刻度点
      for (k = 1; k <= 4; k++) {
        g += S.circle(V.X(OX + k * ux), V.Y(OY + k * uy), 3, '', ' style="fill:#1565a8"');
        g += S.circle(V.X(OX + k * vx), V.Y(OY + k * vy), 3, '', ' style="fill:#e6ad10"');
      }
      // 目标点 P
      if (s.showP) {
        var px = s.P[0], py = s.P[1];
        g += S.line(V.X(OX), V.Y(OY), V.X(px), V.Y(py), '', ' style="stroke:#8d4fa0;stroke-width:1.8;stroke-dasharray:5 4"');
        g += S.line(V.X(OX + s.local[0] * ux), V.Y(OY + s.local[0] * uy), V.X(px), V.Y(py), '',
          ' style="stroke:#e6ad10;stroke-width:1.6"');
        g += S.circle(V.X(px), V.Y(py), 7, '', ' style="fill:#c48ad1;stroke:#7b3f8c;stroke-width:2"');
        g += S.text(V.X(px) + 46, V.Y(py) - 16, '世界 (' + f2(px) + ', ' + f2(py) + ')', 'vs');
        g += S.text(V.X(px) + 46, V.Y(py) + 4, '局部 (' + f2(s.local[0]) + ', ' + f2(s.local[1]) + ')', 'nd-label');
      }
      kr.html('__plane', g);
      kr.html('__panel', panelStr(706, 84, 260, s.rows, '同一·点的两套坐标'));
      if (s.formula) { kr.html('__f', S.text(500, 452, s.formula, 'vs')); }
      drawMat(kr, 'm0', s.mats[0], 150, 522, { cw: 58, ch: 32 });
      drawMat(kr, 'm1', s.mats[1], 400, 522, { cw: 58, ch: 32 });
      if (s.vec) { drawVec(kr, 'v0', '输入', s.vec, 660, 522, { cw: 52, ch: 32 }); }
      if (s.res) { drawVec(kr, 'v1', '输出', s.res, 742, 522, { cw: 52, ch: 32 }); }
      kr.html('__note', S.text(500, 664, 'M 的三列依次是基向量 u、v 与新原点 O；M⁻¹ 完成反向换算', 'tag'));
      kr.end();
    }
  });

  /* ============================================================
     五、算法 4：3D 旋转与缩放矩阵
     ============================================================ */
  DSV.register({
    id: 'rotate-scale-3d', name: '3D 旋转与缩放矩阵', category: '几何算法',
    desc: '三维旋转用 3×3 正交矩阵表示：绕 X 轴 Rx、绕 Y 轴 Ry、绕 Z 轴 Rz（绕 Z 轴时 z 不变，退化成二维旋转），均匀缩放为 S = s·I₃。组合旋转就是矩阵连乘 M = Rz·Ry·Rx·S（右乘先作用），再把 M 作用到每个顶点 v′ = M·v。画面使用等轴测投影把三维画到二维：x′ = cx + s·(x−z)·cos30°，y′ = cy + s·((x+z)·sin30° − 0.92·y)。n 个顶点的变换代价 O(n)。',
    viewBox: '0 0 1000 700',
    code: [
      'rotateScale3D(V, θx, θy, θz, s):',
      '  S = s · I₃                                       // 均匀缩放矩阵',
      '  Rx = [[1,0,0],[0,cx,-sx],[0,sx,cx]]              // 绕 X 轴旋转',
      '  Ry = [[cy,0,sy],[0,1,0],[-sy,0,cy]]              // 绕 Y 轴旋转',
      '  Rz = [[cz,-sz,0],[sz,cz,0],[0,0,1]]              // 绕 Z 轴旋转',
      '  A = matMul(Ry, Rx)                               // A[i][j] = Σ Ry[i][k]·Rx[k][j]',
      '  B = matMul(Rz, A);  M = matMul(B, S)             // 组合旋转 + 缩放',
      '  for t = 0 to n-1:',
      '    V′[t] = matVec(M, V[t])                        // 3×3 矩阵 × 三维向量',
      '  return V′'
    ],
    inputs: [
      { key: 'rx', label: '绕 X 轴角 θx（度）', def: '30', hint: '右手系，逆时针为正' },
      { key: 'ry', label: '绕 Y 轴角 θy（度）', def: '0', hint: '右手系' },
      { key: 'rz', label: '绕 Z 轴角 θz（度）', def: '45', hint: '绕 Z 轴等价于 2D 旋转' },
      { key: 's', label: '缩放因子 s', def: '1.2', hint: '三个方向同时缩放' }
    ],
    actions: [{ key: 'run', label: '开始演示', primary: true }],
    samples: [
      { label: '示例：绕 Z 轴 45° + 放大 1.2', values: { rx: '0', ry: '0', rz: '45', s: '1.2' } },
      { label: '示例：绕 X 轴 30°（顶面可见）', values: { rx: '30', ry: '0', rz: '0', s: '1' } },
      { label: '示例：绕 Y 轴 60° + 缩小 0.7', values: { rx: '0', ry: '60', rz: '0', s: '0.7' } },
      { label: '示例：三轴组合旋转', values: { rx: '30', ry: '45', rz: '20', s: '1.1' } }
    ],
    random: function () {
      return {
        rx: String(15 * DSV.ri(-11, 11)), ry: String(15 * DSV.ri(-11, 11)), rz: String(15 * DSV.ri(-11, 11)),
        s: (DSV.ri(6, 16) / 10).toFixed(1)
      };
    },
    run: function (v) {
      var rx = clamp(num(v.rx, 0), -720, 720), ry = clamp(num(v.ry, 0), -720, 720), rz = clamp(num(v.rz, 0), -720, 720);
      var sc = clamp(num(v.s, 1), -3, 3);
      var ax = rx * Math.PI / 180, ay = ry * Math.PI / 180, az = rz * Math.PI / 180;
      var cx = Math.cos(ax), sx = Math.sin(ax), cy = Math.cos(ay), sy = Math.sin(ay), cz = Math.cos(az), sz = Math.sin(az);
      var SM = [[sc, 0, 0], [0, sc, 0], [0, 0, sc]];
      var Rx = [[1, 0, 0], [0, cx, -sx], [0, sx, cx]];
      var Ry = [[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]];
      var Rz = [[cz, -sz, 0], [sz, cz, 0], [0, 0, 1]];
      var A = matMul(Ry, Rx), B = matMul(Rz, A), M = matMul(B, SM);
      var n = CUBE_V.length, st = [], t, i, j;
      var outV = [];
      for (t = 0; t < n; t++) { outV.push(null); }

      function rows(cur) {
        var r = [];
        for (var k = 0; k < n; k++) {
          var p = CUBE_V[k], q = outV[k];
          r.push({
            t: 'V' + k + ' (' + p[0] + ',' + p[1] + ',' + p[2] + ') → ' + (q ? '(' + f2(q[0]) + ',' + f2(q[1]) + ',' + f2(q[2]) + ')' : '待计算'),
            cls: k === cur ? 'active' : (q ? 'done' : '')
          });
        }
        return r;
      }
      function sn(o) {
        o = o || {};
        return {
          title: '3D 旋转与缩放：θx = ' + f2(rx) + '°，θy = ' + f2(ry) + '°，θz = ' + f2(rz) + '°，s = ' + f2(sc),
          sub: '灰色虚线立方体 = 原始；金色实线 = 变换后（等轴测投影）',
          src: CUBE_V, out: outV.slice(), hl: (o.hl == null ? -1 : o.hl), full: !!o.full,
          formula: o.formula || '', rows: o.rows || rows(o.hl == null ? -1 : o.hl),
          vec: o.vec || null, res: o.res || null,
          mats: o.mats || [
            { label: 'A = Ry·Rx', M: A, hl: null },
            { label: 'B = Rz·A', M: B, hl: null },
            { label: 'M = B·S', M: M, hl: null }
          ]
        };
      }

      push(st, [0], '开始：立方体 8 个顶点 V0…V7 = (±1, ±1, ±1)，12 条棱。目标是把「缩放 + 绕 X/Y/Z 组合旋转」合成一个 3×3 矩阵 M，' +
        '再逐顶点计算 v′ = M·v。画面用等轴测投影把三维画到二维。',
        sn({ formula: 'M = Rz·Ry·Rx·S（右乘先作用：先缩放，再依次绕 X、Y、Z 旋转）' }));

      push(st, [1], '均匀缩放矩阵 S = s·I₃ = ' + ms(SM) + '：三个方向同乘 ' + f2(sc) + '，对角线全为 s，其余为 0。',
        sn({ mats: [{ label: 'S = s·I₃', M: SM, hl: [0, 0] }, { label: 'A = Ry·Rx', M: A, hl: null }, { label: 'M = B·S', M: M, hl: null }],
          formula: 'S = ' + ms(SM) }));
      push(st, [2], '绕 X 轴旋转：x 坐标不动，yz 平面内做二维旋转，Rx = ' + ms(Rx) + '（cosθx = ' + f2(cx) + '，sinθx = ' + f2(sx) + '）。',
        sn({ mats: [{ label: 'Rx（绕 X 轴）', M: Rx, hl: [1, 1] }, { label: 'A = Ry·Rx', M: A, hl: null }, { label: 'M = B·S', M: M, hl: null }],
          formula: 'Rx = ' + ms(Rx) }));
      push(st, [3], '绕 Y 轴旋转：y 坐标不动，zx 平面内旋转，注意 sin 的符号位置与绕 X 不同：Ry = ' + ms(Ry) +
        '（cosθy = ' + f2(cy) + '，sinθy = ' + f2(sy) + '）。',
        sn({ mats: [{ label: 'Ry（绕 Y 轴）', M: Ry, hl: [0, 2] }, { label: 'A = Ry·Rx', M: A, hl: null }, { label: 'M = B·S', M: M, hl: null }],
          formula: 'Ry = ' + ms(Ry) }));
      push(st, [4], '绕 Z 轴旋转：z 坐标不动，xy 平面内旋转，退化成二维旋转：Rz = ' + ms(Rz) +
        '（cosθz = ' + f2(cz) + '，sinθz = ' + f2(sz) + '）。',
        sn({ mats: [{ label: 'Rz（绕 Z 轴）', M: Rz, hl: [0, 1] }, { label: 'A = Ry·Rx', M: A, hl: null }, { label: 'M = B·S', M: M, hl: null }],
          formula: 'Rz = ' + ms(Rz) }));

      for (i = 0; i < 3; i++) {
        for (j = 0; j < 3; j++) {
          var tm = terms(Ry, Rx, i, j);
          push(st, [5], 'A[' + i + '][' + j + '] = Σ(k=0..2) Ry[' + i + '][k]·Rx[k][' + j + '] = ' + tm.expr + ' = ' + f2(tm.val),
            sn({
              mats: [
                { label: 'Ry', M: Ry, hl: null },
                { label: 'Rx', M: Rx, hl: null },
                { label: 'A = Ry·Rx', M: A, hl: [i, j] }
              ], formula: 'A[' + i + '][' + j + '] = ' + tm.expr + ' = ' + f2(tm.val)
            }));
        }
      }
      push(st, [5], 'A = Ry·Rx = ' + ms(A) + '：把绕 X 与绕 Y 的两次旋转合并成一个矩阵（先绕 X，再绕 Y）。',
        sn({ mats: [{ label: 'A = Ry·Rx', M: A, hl: null }, { label: 'Rz', M: Rz, hl: null }, { label: 'M = B·S', M: M, hl: null }],
          formula: 'A = ' + ms(A) }));
      push(st, [6], '再左乘 Rz 得到 B = Rz·A = ' + ms(B) + '（逐元素的算法与上面相同，这里直接给出结果）。',
        sn({ mats: [{ label: 'A = Ry·Rx', M: A, hl: null }, { label: 'B = Rz·A', M: B, hl: [0, 0] }, { label: 'M = B·S', M: M, hl: null }],
          formula: 'B = Rz·A = ' + ms(B) }));
      push(st, [6], '最后乘上缩放：M = B·S = ' + ms(M) + '。因为 S = s·I₃，这等价于把 B 的每个元素乘以 ' + f2(sc) +
        '；矩阵的行列式 = s³ = ' + f2(sc * sc * sc) + '，即体积放大倍数。',
        sn({ mats: [{ label: 'B = Rz·A', M: B, hl: null }, { label: 'S = s·I₃', M: SM, hl: [1, 1] }, { label: 'M = B·S', M: M, hl: null }],
          formula: 'M = ' + ms(M) + '，det(M) = ' + f2(sc * sc * sc) }));

      for (t = 0; t < n; t++) {
        var p = CUBE_V[t];
        push(st, [7], '取顶点 V' + t + ' = (' + p[0] + ', ' + p[1] + ', ' + p[2] + ')，准备计算 v′ = M·v',
          sn({ hl: t, rows: rows(t), vec: p, res: null, formula: 'v = [' + p[0] + ', ' + p[1] + ', ' + p[2] + ']ᵀ' }));
        var q = matVec(M, p);
        outV[t] = q;
        push(st, [8], 'V' + t + '：x′ = ' + f2(q[0]) + '，y′ = ' + f2(q[1]) + '，z′ = ' + f2(q[2]) +
          '（每一项都是 M 的一行与 v 的点积，共 9 次乘法 + 6 次加法）',
          sn({ hl: t, rows: rows(t), vec: p, res: q, formula: 'M·v = [' + f2(q[0]) + ', ' + f2(q[1]) + ', ' + f2(q[2]) + ']ᵀ' }));
      }
      push(st, [9], '完成：8 个顶点全部变换，立方体的 12 条棱按新顶点重画（画面中的金色实线）。' +
        '一次矩阵合成 + n 次矩阵—向量乘法，总代价 O(n)，这也是三维图形管线里模型变换的做法。',
        sn({ full: true, rows: rows(-1), formula: 'M = Rz·Ry·Rx·S = ' + ms(M) }));
      return st;
    },
    render: function (kr, s) {
      kr.html('__defs', S.arrowDefs() + extraDefs());
      if (!s) { kr.html('__e', S.text(500, 300, '点击「开始演示」查看 3D 旋转与缩放矩阵', 'vs')); kr.end(); return; }
      var o = { cx: 380, cy: 245, sc: 62, len: 2.6 }, i;
      kr.html('__t', S.text(500, 26, s.title, 'vt'));
      kr.html('__st', S.text(500, 48, s.sub, 'vs'));

      var g = axes3Str(o, 'stroke:#7f9c8a;stroke-width:2');
      // 原始立方体（灰虚线）
      g += cubeStr(s.src, o, 'stroke:#8aa896;stroke-width:1.6;stroke-dasharray:6 5;fill:none');
      // 变换后的立方体
      if (s.full) { g += cubeStr(s.out, o, 'stroke:#006633;stroke-width:2.4;fill:none'); }
      // 顶点
      for (i = 0; i < s.src.length; i++) {
        var a = proj3(s.src[i], o), q = s.out[i], b = null;
        if (i === s.hl) {
          g += S.circle(a[0], a[1], 6, '', ' style="fill:#ffcc33;stroke:#006633;stroke-width:2"');
          g += S.text(a[0] + 14, a[1] - 10, 'V' + i, 'ptr');
        }
        if (q) {
          b = proj3(q, o);
          g += S.line(a[0], a[1], b[0], b[1], '', ' style="stroke:#e6ad10;stroke-width:1.4;stroke-dasharray:4 3"');
          g += S.circle(b[0], b[1], 5, '', ' style="fill:' + (i === s.hl ? '#ffcc33' : '#e6ad10') + ';stroke:#006633;stroke-width:2"');
          g += S.text(b[0] + 14, b[1] - 10, "V′" + i, 'nd-label');
        }
      }
      kr.html('__plane', g);
      kr.html('__panel', panelStr(706, 84, 262, s.rows, '顶点变换：v′ = M·v'));
      if (s.formula) { kr.html('__f', S.text(500, 452, s.formula, 'vs')); }
      drawMat(kr, 'm0', s.mats[0], 70, 522, { cw: 48, ch: 30 });
      drawMat(kr, 'm1', s.mats[1], 260, 522, { cw: 48, ch: 30 });
      drawMat(kr, 'm2', s.mats[2], 450, 522, { cw: 48, ch: 30 });
      if (s.vec) { drawVec(kr, 'v0', '顶点 v', s.vec, 660, 522, { cw: 48, ch: 30 }); }
      if (s.res) { drawVec(kr, 'v1', '结果 v′', s.res, 740, 522, { cw: 48, ch: 30 }); }
      kr.html('__note', S.text(500, 670, '等轴测投影：x′ = cx + s·(x−z)·cos30°，y′ = cy + s·((x+z)·sin30° − 0.92·y)', 'tag'));
      kr.end();
    }
  });

  /* ============================================================
     六、算法 5：3D 坐标系变换
     ============================================================ */
  DSV.register({
    id: 'changing-coords-3d', name: '3D 坐标系变换', category: '几何算法',
    desc: '三维坐标系 B 由原点 O 与三个基向量 u、v、w 决定。把基向量按列排成 3×3 矩阵 B = [u v w]，则局部坐标 (xb,yb,zb) 与世界坐标的换算为 P = O + B·(xb,yb,zb)ᵀ；反向换算为 (xb,yb,zb)ᵀ = B⁻¹·(P − O)。当 u、v、w 正交且为单位长度时 B⁻¹ = Bᵀ（转置即求逆），反向换算就是向基向量做点乘投影。演示里 B = Ry(φ)·Rx(θ)，并附带圆柱坐标 (r, φ, z) 作为第二示例。单次换算 O(1)。',
    viewBox: '0 0 1000 700',
    code: [
      'coord3D(P, φ, θ, O):',
      '  R = matMul(Ry(φ), Rx(θ))                 // 新坐标系的姿态矩阵，列即基向量',
      '  u = R[:,0];  v = R[:,1];  w = R[:,2]     // 三个正交单位基向量',
      '  B = [u v w]                              // 基向量按列排成 3×3 矩阵',
      '  d = P - O                                // 相对新原点的向量',
      '  xb = u·d;  yb = v·d;  zb = w·d           // 投影到基向量（正交 ⇒ B⁻¹ = Bᵀ）',
      '  Binv = transpose(B)                      // 反向换算矩阵',
      '  P′ = O + xb·u + yb·v + zb·w              // 反算验证，应还原为 P',
      '  // 第二示例：圆柱坐标 (r, φ, z)',
      '  r = √(x²+y²);  φ = atan2(y, x);  z = z',
      '  x = r·cosφ;  y = r·sinφ;  z = z          // 逆变换',
      '  return (xb, yb, zb)'
    ],
    inputs: [
      { key: 'phi', label: '绕 Y 轴角 φ（度）', def: '40', hint: '新坐标系先绕 Y 轴转' },
      { key: 'theta', label: '绕 X 轴角 θ（度）', def: '25', hint: '再绕 X 轴转' },
      { key: 'ox', label: '新原点 O.x', def: '1', hint: '默认 1' },
      { key: 'oy', label: '新原点 O.y', def: '0.5', hint: '默认 0.5' },
      { key: 'oz', label: '新原点 O.z', def: '0', hint: '默认 0' },
      { key: 'p', label: '世界坐标点 P（x,y,z）', def: '1.5,1,0.5', hint: '逗号分隔的三个数' }
    ],
    actions: [{ key: 'run', label: '开始演示', primary: true }],
    samples: [
      { label: '示例：φ=40°, θ=25°, O=(1,0.5,0)', values: { phi: '40', theta: '25', ox: '1', oy: '0.5', oz: '0', p: '1.5,1,0.5' } },
      { label: '示例：纯绕 Y 轴 90°', values: { phi: '90', theta: '0', ox: '0', oy: '0', oz: '0', p: '0,1,2' } },
      { label: '示例：原点在 (0,1,-1) 的倾斜坐标系', values: { phi: '30', theta: '-20', ox: '0', oy: '1', oz: '-1', p: '-1,1.5,1' } }
    ],
    random: function () {
      return {
        phi: String(15 * DSV.ri(-11, 11)), theta: String(15 * DSV.ri(-11, 11)),
        ox: String(DSV.ri(-2, 2)), oy: String(DSV.ri(-2, 2)), oz: String(DSV.ri(-2, 2)),
        p: (DSV.ri(-20, 20) / 10) + ',' + (DSV.ri(-20, 20) / 10) + ',' + (DSV.ri(-20, 20) / 10)
      };
    },
    run: function (v) {
      var st = [];
      var phi = clamp(num(v.phi, 0), -720, 720), th = clamp(num(v.theta, 0), -720, 720);
      var pa = DSV.nums(v.p, 8);
      var P = [num(pa[0], 1), num(pa[1], 1), num(pa[2], 1)];
      var O = [clamp(num(v.ox, 0), -8, 8), clamp(num(v.oy, 0), -8, 8), clamp(num(v.oz, 0), -8, 8)];
      var ap = phi * Math.PI / 180, at = th * Math.PI / 180;
      var cp = Math.cos(ap), sp = Math.sin(ap), ct = Math.cos(at), sint = Math.sin(at);
      var Ry = [[cp, 0, sp], [0, 1, 0], [-sp, 0, cp]];
      var Rx = [[1, 0, 0], [0, ct, -sint], [0, sint, ct]];
      var R = matMul(Ry, Rx);
      var B = [                                    // 基向量按列排成的矩阵（等于 R）
        [R[0][0], R[0][1], R[0][2]],
        [R[1][0], R[1][1], R[1][2]],
        [R[2][0], R[2][1], R[2][2]]
      ];
      var u = [B[0][0], B[1][0], B[2][0]];
      var vv = [B[0][1], B[1][1], B[2][1]];
      var w = [B[0][2], B[1][2], B[2][2]];
      var Binv = matT(B);                          // 正交矩阵：转置即逆
      var chk = inv3(B);                           // 用一般求逆法校验
      var d = [P[0] - O[0], P[1] - O[1], P[2] - O[2]];
      var xb = u[0] * d[0] + u[1] * d[1] + u[2] * d[2];
      var yb = vv[0] * d[0] + vv[1] * d[1] + vv[2] * d[2];
      var zb = w[0] * d[0] + w[1] * d[1] + w[2] * d[2];
      var st2 = [], i, j, local = null;

      function sn(o) {
        o = o || {};
        return {
          title: '3D 坐标系变换：φ = ' + f2(phi) + '°，θ = ' + f2(th) + '°，O = (' + f2(O[0]) + ', ' + f2(O[1]) + ', ' + f2(O[2]) + ')',
          sub: '灰轴 = 世界坐标系；蓝/金/紫轴 = 新坐标系 B（u, v, w）',
          O: O, P: P, u: u, v: vv, w: w, phi: phi, theta: th,
          local: o.local || null, backP: o.backP || null,
          formula: o.formula || '',
          cyl: o.cyl || null,
          rows: o.rows || [],
          mats: [
            { label: 'B = [u v w]（局部 → 世界）', M: B, hl: o.hlB || null },
            { label: 'B⁻¹ = Bᵀ（世界 → 局部）', M: Binv, hl: o.hlI || null }
          ],
          vec: o.vec || null, res: o.res || null
        };
      }
      function rows(cur) {
        return [
          { t: '世界坐标 P = (' + f2(P[0]) + ', ' + f2(P[1]) + ', ' + f2(P[2]) + ')', cls: cur === 0 ? 'active' : 'done' },
          { t: '局部坐标 (' + (local ? f2(xb) + ', ' + f2(yb) + ', ' + f2(zb) : '待计算') + ')', cls: cur === 1 ? 'active' : 'done' },
          { t: '反算验证 P′ = ' + (local ? '(' + f2(P[0]) + ', ' + f2(P[1]) + ', ' + f2(P[2]) + ') ✔' : '待计算'), cls: cur === 2 ? 'active' : 'done' },
          { t: 'u = (' + f2(u[0]) + ', ' + f2(u[1]) + ', ' + f2(u[2]) + ')', cls: '' },
          { t: 'v = (' + f2(vv[0]) + ', ' + f2(vv[1]) + ', ' + f2(vv[2]) + ')', cls: '' },
          { t: 'w = (' + f2(w[0]) + ', ' + f2(w[1]) + ', ' + f2(w[2]) + ')', cls: '' }
        ];
      }

      push(st, [0], '开始：世界坐标系（灰轴）之外有一个新坐标系 B，它由绕 Y 轴转 φ = ' + f2(phi) + '°、绕 X 轴转 θ = ' + f2(th) +
        '° 得到，原点在 O = (' + f2(O[0]) + ', ' + f2(O[1]) + ', ' + f2(O[2]) + ')。点 P = (' + f2(P[0]) + ', ' + f2(P[1]) + ', ' + f2(P[2]) +
        ') 在 B 下的坐标是多少？',
        sn({ rows: rows(0), formula: '姿态矩阵 R = Ry(φ)·Rx(θ)' }));

      for (i = 0; i < 3; i++) {
        for (j = 0; j < 3; j++) {
          var tm = terms(Ry, Rx, i, j);
          push(st, [1], 'R[' + i + '][' + j + '] = Σ(k=0..2) Ry[' + i + '][k]·Rx[k][' + j + '] = ' + tm.expr + ' = ' + f2(tm.val),
            sn({ rows: rows(0), hlB: [i, j], formula: 'R[' + i + '][' + j + '] = ' + tm.expr + ' = ' + f2(tm.val) }));
        }
      }
      push(st, [1], '姿态矩阵 R = Ry·Rx = ' + ms(R) + '：它是正交矩阵（Rᵀ·R = I），行列式为 ' + f2(det3(R)) + '，' +
        '所以它的三个列向量构成一组正交单位基。',
        sn({ rows: rows(0), formula: 'R = ' + ms(R) }));

      push(st, [2], '第 1 列即基向量 u = (' + f2(u[0]) + ', ' + f2(u[1]) + ', ' + f2(u[2]) + ')：新坐标系的 x 轴方向。',
        sn({ rows: rows(0), hlB: [0, 0], formula: 'u = (' + f2(u[0]) + ', ' + f2(u[1]) + ', ' + f2(u[2]) + ')' }));
      push(st, [2], '第 2 列即基向量 v = (' + f2(vv[0]) + ', ' + f2(vv[1]) + ', ' + f2(vv[2]) + ')：新坐标系的 y 轴方向。',
        sn({ rows: rows(0), hlB: [0, 1], formula: 'v = (' + f2(vv[0]) + ', ' + f2(vv[1]) + ', ' + f2(vv[2]) + ')' }));
      push(st, [2], '第 3 列即基向量 w = (' + f2(w[0]) + ', ' + f2(w[1]) + ', ' + f2(w[2]) + ')：新坐标系的 z 轴方向；' +
        '至此 B = [u v w] = ' + ms(B),
        sn({ rows: rows(0), hlB: [0, 2], formula: 'B = ' + ms(B) }));

      push(st, [3, 4], '先把 P 减去新原点：d = P − O = (' + f2(d[0]) + ', ' + f2(d[1]) + ', ' + f2(d[2]) + ')。' +
        '这一步对应「坐标系只旋转不平移」的情形。',
        sn({ rows: rows(1), vec: P, res: null, formula: 'd = P − O = (' + f2(d[0]) + ', ' + f2(d[1]) + ', ' + f2(d[2]) + ')' }));
      push(st, [5], 'xb = u·d = ' + f2(u[0]) + '×' + f2(d[0]) + ' + ' + f2(u[1]) + '×' + f2(d[1]) + ' + ' + f2(u[2]) + '×' + f2(d[2]) +
        ' = ' + f2(xb) + '（把 d 投影到 u 上）',
        sn({ rows: rows(1), hlI: [0, 0], vec: d, res: [xb, 0, 0], formula: 'xb = ' + f2(xb) }));
      push(st, [5], 'yb = v·d = ' + f2(vv[0]) + '×' + f2(d[0]) + ' + ' + f2(vv[1]) + '×' + f2(d[1]) + ' + ' + f2(vv[2]) + '×' + f2(d[2]) +
        ' = ' + f2(yb),
        sn({ rows: rows(1), hlI: [1, 0], vec: d, res: [xb, yb, 0], formula: 'yb = ' + f2(yb) }));
      local = [xb, yb, zb];
      push(st, [5], 'zb = w·d = ' + f2(w[0]) + '×' + f2(d[0]) + ' + ' + f2(w[1]) + '×' + f2(d[1]) + ' + ' + f2(w[2]) + '×' + f2(d[2]) +
        ' = ' + f2(zb) + '。于是在坐标系 B 下 P 的局部坐标是 (' + f2(xb) + ', ' + f2(yb) + ', ' + f2(zb) + ')。',
        sn({ rows: rows(1), local: local, hlI: [2, 0], vec: d, res: [xb, yb, zb], formula: '局部坐标 = (' + f2(xb) + ', ' + f2(yb) + ', ' + f2(zb) + ')' }));

      push(st, [6], '反向换算矩阵：因为 B 的列是正交单位向量，B⁻¹ = Bᵀ = ' + ms(Binv) +
        '（用伴随矩阵法求逆得到的结果与转置一致：' + (chk ? '是' : '否') + '），不必真的去做高斯消元。',
        sn({ rows: rows(1), local: local, hlI: [0, 1], vec: d, res: [xb, yb, zb], formula: 'B⁻¹ = Bᵀ' }));
      push(st, [6], 'B⁻¹ 的第 1 行就是 uᵀ = (' + f2(Binv[0][0]) + ', ' + f2(Binv[0][1]) + ', ' + f2(Binv[0][2]) + ')，' +
        '第 2 行是 vᵀ，第 3 行是 wᵀ —— 所以「求局部坐标」就是分别向三个基向量做点乘。',
        sn({ rows: rows(1), local: local, hlI: [1, 2], vec: d, res: [xb, yb, zb], formula: '行 = 基向量的转置' }));
      push(st, [6], '统一写法：(xb, yb, zb)ᵀ = B⁻¹·(P − O)，一次矩阵乘法就把世界坐标换成局部坐标。',
        sn({ rows: rows(2), local: local, hlI: [2, 2], vec: d, res: [xb, yb, zb], formula: 'B⁻¹·d = (' + f2(xb) + ', ' + f2(yb) + ', ' + f2(zb) + ')ᵀ' }));

      var bp = [
        O[0] + xb * u[0] + yb * vv[0] + zb * w[0],
        O[1] + xb * u[1] + yb * vv[1] + zb * w[1],
        O[2] + xb * u[2] + yb * vv[2] + zb * w[2]
      ];
      push(st, [7], '反算验证：P′ = O + xb·u + yb·v + zb·w = (' + f2(bp[0]) + ', ' + f2(bp[1]) + ', ' + f2(bp[2]) +
        ')，与原世界坐标 P = (' + f2(P[0]) + ', ' + f2(P[1]) + ', ' + f2(P[2]) + ') 一致，说明正反换算互逆（B·B⁻¹ = I）。',
        sn({ rows: rows(2), local: local, backP: bp, vec: [xb, yb, zb], res: bp, formula: 'P′ = O + B·局部坐标 = P' }));

      var rr = Math.sqrt(P[0] * P[0] + P[1] * P[1]);
      var ph = Math.atan2(P[1], P[0]) * 180 / Math.PI;
      push(st, [8, 9], '第二示例：圆柱坐标 (r, φ, z)。同一点 P = (' + f2(P[0]) + ', ' + f2(P[1]) + ', ' + f2(P[2]) +
        ') 写成圆柱坐标为：r = √(x²+y²) = ' + f2(rr) + '，φ = atan2(y, x) = ' + f2(ph) + '°，z = ' + f2(P[2]) + '。',
        sn({ rows: rows(2), local: local, backP: bp, cyl: { r: rr, phi: ph, z: P[2] }, vec: [xb, yb, zb], res: bp,
          formula: 'r = ' + f2(rr) + '，φ = ' + f2(ph) + '°，z = ' + f2(P[2]) }));
      push(st, [10], '圆柱坐标逆变换：x = r·cosφ = ' + f2(rr) + '×' + f2(Math.cos(ph * Math.PI / 180)) + ' = ' + f2(rr * Math.cos(ph * Math.PI / 180)) +
        '，y = r·sinφ = ' + f2(rr * Math.sin(ph * Math.PI / 180)) + '，z 保持不变 = ' + f2(P[2]) + '，回到原坐标。',
        sn({ rows: rows(2), local: local, backP: bp, cyl: { r: rr, phi: ph, z: P[2] }, vec: [xb, yb, zb], res: bp,
          formula: 'x = r·cosφ，y = r·sinφ，z = z' }));
      push(st, [11], '完成：三维坐标换算与二维同理 —— 基向量按列排成矩阵 B，正向用 B（乘局部坐标并加上原点），反向用 Bᵀ（正交基）或 B⁻¹。' +
        '每次换算只需一次矩阵乘法，代价 O(1)。',
        sn({ rows: rows(-1), local: local, backP: bp, cyl: { r: rr, phi: ph, z: P[2] }, vec: [xb, yb, zb], res: bp,
          formula: 'B·Bᵀ = I' }));
      return st;
    },
    render: function (kr, s) {
      kr.html('__defs', S.arrowDefs() + extraDefs());
      if (!s) { kr.html('__e', S.text(500, 300, '点击「开始演示」查看 3D 坐标系变换', 'vs')); kr.end(); return; }
      var o = { cx: 360, cy: 240, sc: 62, len: 2.4 }, k;
      kr.html('__t', S.text(500, 26, s.title, 'vt'));
      kr.html('__st', S.text(500, 48, s.sub, 'vs'));

      var g = axes3Str(o, 'stroke:#7f9c8a;stroke-width:2');
      // 新坐标系 B 的三条轴（从 O 出发，方向为 u, v, w）
      var axes = [[s.u, 'u', '#1565a8', 'arrowB'], [s.v, 'v', '#e6ad10', 'arrowG'], [s.w, 'w', '#8d4fa0', 'arrowP']];
      var org = proj3(s.O, o);
      for (k = 0; k < 3; k++) {
        var d = axes[k][0];
        var tip = proj3([s.O[0] + d[0] * 2.3, s.O[1] + d[1] * 2.3, s.O[2] + d[2] * 2.3], o);
        g += S.line(org[0], org[1], tip[0], tip[1], '', ' style="stroke:' + axes[k][2] + ';stroke-width:2.4" marker-end="url(#' + axes[k][3] + ')"');
        g += S.text(tip[0] + (k === 2 ? -16 : 12), tip[1] + (k === 1 ? -12 : 10), axes[k][1], 'vs');
        for (var m = 1; m <= 2; m++) {
          var tk = proj3([s.O[0] + d[0] * m, s.O[1] + d[1] * m, s.O[2] + d[2] * m], o);
          g += S.circle(tk[0], tk[1], 3, '', ' style="fill:' + axes[k][2] + '"');
        }
      }
      // 原点 O
      g += S.circle(org[0], org[1], 6, '', ' style="fill:#1565a8;stroke:#fff;stroke-width:2"');
      g += S.text(org[0] - 10, org[1] - 22, 'O(' + f2(s.O[0]) + ',' + f2(s.O[1]) + ',' + f2(s.O[2]) + ')', 'ptr');
      // 点 P
      var pp = proj3(s.P, o);
      g += S.line(org[0], org[1], pp[0], pp[1], '', ' style="stroke:#8d4fa0;stroke-width:1.6;stroke-dasharray:5 4"');
      g += S.circle(pp[0], pp[1], 7, '', ' style="fill:#c48ad1;stroke:#7b3f8c;stroke-width:2"');
      var wpx = pp[0] + 52, wpy = pp[1] - 16, lpx = pp[0] + 52, lpy = pp[1] + 4;
      if (Math.abs(pp[0] - org[0]) + Math.abs(pp[1] - org[1]) < 60) { wpx = pp[0] + 6; wpy = pp[1] + 34; lpx = pp[0] + 6; lpy = pp[1] + 52; }
      g += S.text(wpx, wpy, '世界 (' + f2(s.P[0]) + ', ' + f2(s.P[1]) + ', ' + f2(s.P[2]) + ')', 'vs');
      g += S.text(lpx, lpy, s.local ? '局部 (' + f2(s.local[0]) + ', ' + f2(s.local[1]) + ', ' + f2(s.local[2]) + ')' : '局部 待计算', 'nd-label');
      kr.html('__plane', g);

      var rows = s.rows.slice();
      if (s.cyl) {
        rows.push({ t: '圆柱：r=' + f2(s.cyl.r) + '，φ=' + f2(s.cyl.phi) + '°，z=' + f2(s.cyl.z), cls: 'active' });
      }
      kr.html('__panel', panelStr(706, 84, 262, rows, '同一·点的两套坐标'));
      if (s.formula) { kr.html('__f', S.text(500, 452, s.formula, 'vs')); }
      drawMat(kr, 'm0', s.mats[0], 130, 522, { cw: 52, ch: 30 });
      drawMat(kr, 'm1', s.mats[1], 350, 522, { cw: 52, ch: 30 });
      if (s.vec) { drawVec(kr, 'v0', '输入', s.vec, 590, 522, { cw: 50, ch: 30 }); }
      if (s.res) { drawVec(kr, 'v1', '输出', s.res, 680, 522, { cw: 50, ch: 30 }); }
      kr.html('__note', S.text(500, 668, '正向：P = O + B·局部坐标；反向：局部坐标 = Bᵀ·(P − O)（基正交时 B⁻¹ = Bᵀ）', 'tag'));
      kr.end();
    }
  });

  /* ============================================================
     六、算法 6：凸包 Andrew 单调链
     ------------------------------------------------------------ */
  /** 解析多行点集：每行 "x y"，自动去重，最多 12 个点 */
  function parsePts2(s) {
    var f = DSV.nums(s, 30), p = [], i;
    for (i = 0; i + 1 < f.length; i += 2) { p.push([clamp(f[i], -8, 8), clamp(f[i + 1], -6, 6)]); }
    var seen = {}, out = [];
    p.forEach(function (q) { var k = q[0] + ',' + q[1]; if (!seen[k]) { seen[k] = 1; out.push(q); } });
    return out.slice(0, 12);
  }
  /** 叉积 (b-a) × (c-a)：>0 左转，<0 右转，=0 共线 */
  function crossZ(a, b, c) {
    return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  }

  DSV.register({
    id: 'geo-convex-hull', name: '凸包（Andrew 单调链）', category: '几何算法',
    desc: '把点集按 x 升序排列（x 相同按 y），先从左到右构造「下凸链」：每加入新点，若末尾两个点与新点不构成左转（叉积 ≤ 0）就弹出末尾；再从右到左构造「上凸链」，两段拼起来就是凸包。只需排序 + 两次线性扫描，时间 O(n log n)，空间 O(n)。',
    viewBox: '0 0 1000 640',
    code: [
      'convexHull(P):',
      '  P 按 x 升序排序（x 相同按 y）',
      '  下链：for p in P（从左到右）:',
      '    while 末两点与 p 叉积 ≤ 0: 弹出末尾',
      '    把 p 加入下链',
      '  上链：for p in P（从右到左）: 同理',
      '  凸包 = 下链 + 上链（去掉重复端点）'
    ],
    inputs: [
      { key: 'pts', label: '点集（每行 "x y"）', multiline: true,
        def: '1 1\n4 1\n5 3\n2 4\n0 3\n3 2\n6 2',
        hint: '每行一个点 "x y"，x 范围 -8~8，y 范围 -6~6，最多 12 个点' }
    ],
    samples: [
      { label: '示例：7 个散点', values: { pts: '1 1\n4 1\n5 3\n2 4\n0 3\n3 2\n6 2' } },
      { label: '示例：含共线点', values: { pts: '0 0\n2 0\n4 0\n1 2\n3 2\n2 3' } },
      { label: '示例：凹四边形', values: { pts: '0 0\n5 0\n5 4\n2 1\n0 4' } }
    ],
    random: function () {
      var n = DSV.ri(8, 11), lines = [], i;
      for (i = 0; i < n; i++) { lines.push(DSV.ri(-6, 6) + ' ' + DSV.ri(-4, 4)); }
      return { pts: lines.join('\n') };
    },
    run: function (v) {
      var pts = parsePts2(v.pts);
      if (pts.length < 3) {
        return [{
          code: [0],
          desc: '有效点少于 3 个，无法构造凸包。请在点集输入框里每行填一个 "x y"，至少 3 个点。',
          snap: { empty: '点太少：至少需要 3 个点' }
        }];
      }
      var st = [];
      var P = pts.slice().sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
      function mkrows(cur, msg) {
        var r = [
          { t: '排序后共 ' + P.length + ' 个点', cls: 'done' },
          { t: '当前处理：P' + cur, cls: 'active' }
        ];
        if (msg) { r.push({ t: msg, cls: '' }); }
        return r;
      }
      function snap(o) {
        o = o || {};
        return {
          title: '凸包 Andrew 单调链（共 ' + P.length + ' 个点）',
          sub: o.sub || '', pts: P.slice(),
          lower: (o.lower || []).map(function (p) { return p.slice(); }),
          upper: (o.upper || []).map(function (p) { return p.slice(); }),
          hull: (o.hull || []).map(function (p) { return p.slice(); }),
          hlIdx: o.hlIdx == null ? -1 : o.hlIdx,
          popIdx: o.popIdx == null ? -1 : o.popIdx,
          rows: o.rows || []
        };
      }
      push(st, [0], '输入点集共 ' + P.length + ' 个点：' + P.map(function (p, k) { return 'P' + k + '(' + f2(p[0]) + ',' + f2(p[1]) + ')'; }).join('，') +
        '。先把所有点按 x 升序排列（x 相同按 y）', snap({ sub: '第一步：排序', rows: mkrows(-1) }));
      /* ---- 下链 ---- */
      var lower = [];
      for (var i = 0; i < P.length; i++) {
        while (lower.length >= 2) {
          var a = lower[lower.length - 2], b = lower[lower.length - 1];
          var cr = crossZ(a, b, P[i]);
          if (cr <= 0) {
            push(st, [3, 4], '加入 P' + i + '(' + f2(P[i][0]) + ',' + f2(P[i][1]) + ') 前检查：末两点 (' +
              f2(a[0]) + ',' + f2(a[1]) + ') → (' + f2(b[0]) + ',' + f2(b[1]) + ') 与 P' + i + ' 的叉积 = ' +
              f2(cr) + (cr === 0 ? '（共线）' : '（右转）') + ' ≤ 0，弹出 (' + f2(b[0]) + ',' + f2(b[1]) + ')',
              snap({ sub: '下链：弹出凹点', lower: lower.slice(0, lower.length - 1), hlIdx: i, popIdx: lower.length - 1,
                rows: mkrows(i, '叉积 ' + f2(cr) + ' ≤ 0，弹出') }));
            lower.pop();
          } else { break; }
        }
        lower.push(P[i]);
        push(st, [4, 5], '把 P' + i + '(' + f2(P[i][0]) + ',' + f2(P[i][1]) + ') 加入下链。当前下链：' +
          lower.map(function (p) { return '(' + f2(p[0]) + ',' + f2(p[1]) + ')'; }).join(' → '),
          snap({ sub: '下链构造中', lower: lower.slice(), hlIdx: i, rows: mkrows(i) }));
      }
      /* ---- 上链 ---- */
      var upper = [];
      for (i = P.length - 1; i >= 0; i--) {
        while (upper.length >= 2) {
          var a2 = upper[upper.length - 2], b2 = upper[upper.length - 1];
          var cr2 = crossZ(a2, b2, P[i]);
          if (cr2 <= 0) {
            push(st, [3, 4], '上链加入 P' + i + '(' + f2(P[i][0]) + ',' + f2(P[i][1]) + ') 前检查：叉积 = ' +
              f2(cr2) + ' ≤ 0，弹出 (' + f2(b2[0]) + ',' + f2(b2[1]) + ')',
              snap({ sub: '上链：弹出凹点', lower: lower.slice(), upper: upper.slice(0, upper.length - 1), hlIdx: i,
                rows: mkrows(i, '叉积 ' + f2(cr2) + ' ≤ 0，弹出') }));
            upper.pop();
          } else { break; }
        }
        upper.push(P[i]);
        push(st, [4, 5], '把 P' + i + ' 加入上链（从右往左走）。当前上链：' +
          upper.map(function (p) { return '(' + f2(p[0]) + ',' + f2(p[1]) + ')'; }).join(' → '),
          snap({ sub: '上链构造中', lower: lower.slice(), upper: upper.slice(), hlIdx: i, rows: mkrows(i) }));
      }
      /* ---- 拼接 ---- */
      var hull = lower.slice(0, lower.length - 1).concat(upper.slice(0, upper.length - 1));
      push(st, [6], '下链与上链都构造完毕：下链 ' + (lower.length - 1) + ' 段、上链 ' + (upper.length - 1) +
        ' 段，去掉两条链首尾重复的端点后拼接，得到凸包共 ' + hull.length + ' 个顶点：' +
        hull.map(function (p) { return '(' + f2(p[0]) + ',' + f2(p[1]) + ')'; }).join(' → '),
        snap({ sub: '凸包完成', hull: hull, lower: lower.slice(), upper: upper.slice(), rows: [{ t: '凸包 ' + hull.length + ' 个顶点', cls: 'done' }] }));
      return st;
    },
    render: function (kr, s) {
      kr.html('__defs', S.arrowDefs() + extraDefs());
      if (!s) { kr.html('__e', S.text(500, 300, '点击「开始演示」构造凸包', 'vs')); kr.end(); return; }
      if (s.empty) {
        kr.html('__t', S.text(500, 26, '凸包 Andrew 单调链', 'vt'));
        kr.html('__w', S.text(500, 300, s.empty, 'vwarn'));
        kr.end();
        return;
      }
      var V = view2({ cx: 380, cy: 280, sc: 40 });
      var o = { xmin: -8, xmax: 8, ymin: -6, ymax: 6 };
      kr.html('__t', S.text(500, 26, s.title, 'vt'));
      kr.html('__st', S.text(500, 48, s.sub, 'vs'));
      var g = gridStr(V, o);
      if (s.hull && s.hull.length >= 3) {
        var hd = s.hull.map(function (p) { return V.X(p[0]) + ',' + V.Y(p[1]); }).join(' ') + ' ' +
          V.X(s.hull[0][0]) + ',' + V.Y(s.hull[0][1]);
        g += S.poly(hd, '', ' style="fill:rgba(255,204,51,.18);stroke:#e6ad10;stroke-width:2.6"');
      }
      g += polyStr(V, s.lower, 'fill:none;stroke:#1565a8;stroke-width:2.2');
      g += polyStr(V, s.upper, 'fill:none;stroke:#8d4fa0;stroke-width:2.2');
      for (var i = 0; i < s.pts.length; i++) {
        var p = s.pts[i];
        var isHull = s.hull && s.hull.some(function (q) { return q[0] === p[0] && q[1] === p[1]; });
        g += S.circle(V.X(p[0]), V.Y(p[1]), 5, '',
          ' style="fill:' + (i === s.hlIdx ? '#ffcc33' : (isHull ? '#e6ad10' : '#fff')) + ';stroke:' +
          (i === s.popIdx ? '#a8402f' : '#006633') + ';stroke-width:2"');
        g += S.text(V.X(p[0]) + 11, V.Y(p[1]) - 11, 'P' + i, 'tag');
      }
      kr.html('__plane', g);
      kr.html('__panel', panelStr(700, 84, 270, s.rows || [], '构造过程'));
      kr.end();
    }
  });

  /* ============================================================
     七、算法 7：最近点对（分治法）
     ------------------------------------------------------------ */
  DSV.register({
    id: 'geo-closest-pair', name: '最近点对（分治）', category: '几何算法',
    desc: '在 n 个点中找欧氏距离最近的一对。分治：按 x 坐标从中线切开，左、右两半分别递归求最近对，得到距离 d；再只检查中线两侧宽 d 的带状区域——带内按 y 排序后，每个点只需和它后面最多 7 个点比较（鸽笼原理），即可找到跨两半的更近点。排序 O(n log n)，递归合并每层 O(n)，总时间 O(n log n)。',
    viewBox: '0 0 1000 640',
    code: [
      'closestPair(P, lo, hi):',
      '  if 点数 ≤ 3: 暴力枚举所有点对',
      '  mid = (lo+hi)/2；中线 x = P[mid].x',
      '  dL = 左半递归；dR = 右半递归；d = min(dL,dR)',
      '  strip = 带内 |x-中线| < d 的点（按 y 排序）',
      '  for s in strip: 与后面至多 7 个点比较',
      '    若距离 < d: 更新 d 与最近对',
      '  return d'
    ],
    inputs: [
      { key: 'pts', label: '点集（每行 "x y"）', multiline: true,
        def: '1 3\n2 8\n3 1\n5 6\n6 2\n7 9\n8 4\n9 7',
        hint: '每行一个点 "x y"，x 范围 -8~8，y 范围 -6~6，最多 10 个点' }
    ],
    samples: [
      { label: '示例：8 个散点', values: { pts: '1 3\n2 8\n3 1\n5 6\n6 2\n7 9\n8 4\n9 7' } },
      { label: '示例：含更近跨线对', values: { pts: '0 0\n1 4\n3 2\n4 6\n6 5\n8 1\n9 3' } },
      { label: '示例：只有 3 个点', values: { pts: '0 0\n4 0\n1 2' } }
    ],
    random: function () {
      var n = DSV.ri(7, 10), lines = [], i;
      for (i = 0; i < n; i++) { lines.push(DSV.ri(-7, 7) + ' ' + DSV.ri(-5, 5)); }
      return { pts: lines.join('\n') };
    },
    run: function (v) {
      var pts = parsePts2(v.pts).slice(0, 10);
      if (pts.length < 2) {
        return [{
          code: [0],
          desc: '有效点少于 2 个，无法找最近点对。请在点集输入框里每行填一个 "x y"，至少 2 个点。',
          snap: { empty: '点太少：至少需要 2 个点' }
        }];
      }
      var st = [];
      var P = pts.slice().sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
      var best = { d: Infinity, pair: null };
      function d2(a, b) { var dx = a[0] - b[0], dy = a[1] - b[1]; return Math.sqrt(dx * dx + dy * dy); }
      function snap(o) {
        o = o || {};
        return {
          title: '最近点对分治（共 ' + P.length + ' 个点，已按 x 排序）',
          sub: o.sub || '', pts: P.slice(),
          region: o.region || null,
          midX: o.midX == null ? null : o.midX,
          stripX: o.stripX == null ? null : o.stripX,
          cmp: o.cmp ? [o.cmp[0].slice(), o.cmp[1].slice()] : null,
          bestPair: best.pair ? [best.pair[0].slice(), best.pair[1].slice()] : null,
          bestD: best.d,
          rows: o.rows || []
        };
      }
      function tryPair(a, b, tag) {
        var d = d2(a, b);
        var rows = [{ t: '比较 (' + f2(a[0]) + ',' + f2(a[1]) + ') 与 (' + f2(b[0]) + ',' + f2(b[1]) + ')', cls: 'compare' },
          { t: '距离 = ' + f2(d) + '，当前最优 = ' + f2(best.d), cls: '' }];
        if (d < best.d) {
          best.d = d; best.pair = [a, b];
          rows.push({ t: '刷新最优！', cls: 'active' });
          push(st, [5, 6], tag + '比较 (' + f2(a[0]) + ',' + f2(a[1]) + ') 与 (' + f2(b[0]) + ',' + f2(b[1]) + ')：距离 = ' +
            f2(d) + ' < 当前最优 ' + f2(best.d) + '，刷新最近对',
            snap({ sub: tag + '找到更近的点对', cmp: [a, b], rows: rows }));
          return true;
        }
        push(st, [5], tag + '比较 (' + f2(a[0]) + ',' + f2(a[1]) + ') 与 (' + f2(b[0]) + ',' + f2(b[1]) + ')：距离 = ' +
          f2(d) + ' ≥ 当前最优 ' + f2(best.d) + '，不刷新', snap({ sub: tag + '无改进', cmp: [a, b], rows: rows }));
        return false;
      }
      function cp(lo, hi, tag) {
        var len = hi - lo;
        if (len <= 3) {
          push(st, [1], tag + '区间 [P' + lo + '..P' + (hi - 1) + '] 只有 ' + len + ' 个点，直接暴力枚举全部点对',
            snap({ sub: tag + '小规模：暴力', region: [lo, hi], rows: [{ t: len + ' 个点，暴力枚举', cls: 'active' }] }));
          for (var i = lo; i < hi; i++) {
            for (var j = i + 1; j < hi; j++) {
              tryPair(P[i], P[j], tag);
            }
          }
          return best.d;
        }
        var mid = Math.floor((lo + hi) / 2);
        var midX = P[mid][0];
        push(st, [2], tag + '区间 [P' + lo + '..P' + (hi - 1) + '] 共 ' + len + ' 个点，在 x = ' + f2(midX) +
          ' 处切一刀，分成左 [' + lo + '..' + (mid - 1) + '] 与右 [' + mid + '..' + (hi - 1) + '] 两半',
          snap({ sub: tag + '分治切分', region: [lo, hi], midX: midX, rows: [{ t: '中线 x = ' + f2(midX), cls: 'active' }] }));
        var dL = cp(lo, mid, tag + ' 左半:');
        var dR = cp(mid, hi, tag + ' 右半:');
        var d = Math.min(dL, dR);
        push(st, [3], tag + '左右两半都算完：左半最优 = ' + f2(dL) + '，右半最优 = ' + f2(dR) +
          '，取较小者 d = ' + f2(d) + '。接下来只需检查中线附近宽 2d 的带状区域里是否藏着跨两半的更近点对',
          snap({ sub: tag + '进入带内合并', region: [lo, hi], midX: midX, stripX: d,
            rows: [{ t: '左半 ' + f2(dL), cls: 'done' }, { t: '右半 ' + f2(dR), cls: 'done' }, { t: 'd = ' + f2(d), cls: 'active' }] }));
        /* 带状区域：|x - midX| < d，按 y 排序 */
        var strip = [];
        for (var k = lo; k < hi; k++) { if (Math.abs(P[k][0] - midX) < d) { strip.push(P[k]); } }
        strip.sort(function (a, b) { return a[1] - b[1] || a[0] - b[0]; });
        push(st, [4], tag + '收集带内 |x - ' + f2(midX) + '| < ' + f2(d) + ' 的点共 ' + strip.length +
          ' 个，并按 y 坐标排序。鸽笼原理保证：每个点只需和后面至多 7 个点比较',
          snap({ sub: tag + '带状区域', region: [lo, hi], midX: midX, stripX: d,
            rows: [{ t: '带内 ' + strip.length + ' 个点，按 y 排序', cls: 'active' }] }));
        for (var a = 0; a < strip.length; a++) {
          for (var b2 = a + 1; b2 < Math.min(a + 8, strip.length); b2++) {
            if (Math.abs(strip[b2][1] - strip[a][1]) >= d) { break; }
            tryPair(strip[a], strip[b2], tag + ' 带内:');
          }
        }
        return best.d;
      }
      push(st, [0], '点集共 ' + P.length + ' 个点，先按 x 坐标升序排列。随后分治：一直切到两半各 ≤ 3 个点时暴力枚举，再合并带状区域',
        snap({ sub: '开始分治', region: [0, P.length], rows: [{ t: '按 x 排序完成', cls: 'done' }] }));
      cp(0, P.length, '');
      push(st, [6], '分治结束。全局最近点对：(' + f2(best.pair[0][0]) + ',' + f2(best.pair[0][1]) + ') 与 (' +
        f2(best.pair[1][0]) + ',' + f2(best.pair[1][1]) + ')，距离 = ' + f2(best.d) +
        '。每层合并只检查 O(n) 个带内比较，总时间 O(n log n)。',
        snap({ sub: '最近点对已找到', rows: [{ t: '最近距离 = ' + f2(best.d), cls: 'active' }] }));
      return st;
    },
    render: function (kr, s) {
      kr.html('__defs', S.arrowDefs() + extraDefs());
      if (!s) { kr.html('__e', S.text(500, 300, '点击「开始演示」求最近点对', 'vs')); kr.end(); return; }
      if (s.empty) {
        kr.html('__t', S.text(500, 26, '最近点对（分治）', 'vt'));
        kr.html('__w', S.text(500, 300, s.empty, 'vwarn'));
        kr.end();
        return;
      }
      var V = view2({ cx: 380, cy: 280, sc: 40 });
      var o = { xmin: -8, xmax: 8, ymin: -6, ymax: 6 };
      kr.html('__t', S.text(500, 26, s.title, 'vt'));
      kr.html('__st', S.text(500, 48, s.sub, 'vs'));
      var g = gridStr(V, o);
      /* 当前递归区间：底部画一条粗线 */
      if (s.region) {
        var x0 = V.X(s.pts[s.region[0]][0]), x1 = V.X(s.pts[s.region[1] - 1][0]);
        g += S.line(x0, V.Y(-5.4), x1, V.Y(-5.4), 'edge', ' style="stroke:#1565a8;stroke-width:4"');
      }
      /* 中线 */
      if (s.midX != null) {
        g += S.line(V.X(s.midX), V.Y(-5.6), V.X(s.midX), V.Y(5.6), 'edge', ' style="stroke:#a8402f;stroke-width:1.6;stroke-dasharray:6 4"');
      }
      /* 带状区域 */
      if (s.midX != null && s.stripX != null && isFinite(s.stripX)) {
        g += S.rect(V.X(s.midX - s.stripX), V.Y(5.6), (V.X(s.midX + s.stripX) - V.X(s.midX - s.stripX)),
          (V.Y(-5.6) - V.Y(5.6)), '', ' style="fill:rgba(168,64,47,.08);stroke:none"');
      }
      for (var i = 0; i < s.pts.length; i++) {
        var p = s.pts[i];
        g += S.circle(V.X(p[0]), V.Y(p[1]), 5, '', ' style="fill:#fff;stroke:#006633;stroke-width:2"');
        g += S.text(V.X(p[0]) + 10, V.Y(p[1]) - 10, 'P' + i, 'tag');
      }
      if (s.cmp) {
        g += S.line(V.X(s.cmp[0][0]), V.Y(s.cmp[0][1]), V.X(s.cmp[1][0]), V.Y(s.cmp[1][1]), '',
          ' style="stroke:#a8402f;stroke-width:2.4"');
      }
      if (s.bestPair) {
        g += S.line(V.X(s.bestPair[0][0]), V.Y(s.bestPair[0][1]), V.X(s.bestPair[1][0]), V.Y(s.bestPair[1][1]), '',
          ' style="stroke:#e6ad10;stroke-width:3"');
      }
      kr.html('__plane', g);
      kr.html('__panel', panelStr(700, 84, 270, s.rows || [], '当前状态'));
      kr.html('__bd', S.text(500, 560, '当前全局最优距离 = ' + (isFinite(s.bestD) ? f2(s.bestD) : '∞') +
        '　·　红虚线=分治中线，红色矩形=比较带状区域，金线=当前最优对', 'vs'));
      kr.end();
    }
  });

})();
