/* ============================================================
   viz-dp.js —— 动态规划章节（5 个无状态算法）
   二项式系数 / 找零问题 / 0-1 背包 / 最长公共子序列 / 编辑距离
   均为「无状态」算法：run 直接返回 steps 数组
   ============================================================ */
(function () {
  'use strict';
  var DSV = window.DSV, S = DSV.svg;

  function push(steps, code, desc, snap) { steps.push({ code: code, desc: desc, snap: snap }); }

  /* ---------- 通用 DP 表格渲染 ---------- */
  function dpGrid(kr, g) {
    var R = g.R, C = g.C;
    var ox = g.ox || 50, oy = g.oy || 96;
    var cw = g.cw || Math.min(48, Math.floor((960 - ox) / Math.max(1, C)));
    var ch = g.ch || Math.min(40, Math.floor((600 - oy) / Math.max(1, R)));
    kr.html('__t', S.text(500, 30, g.title || '', 'vt'));
    if (g.sub) { kr.html('__s', S.text(500, 56, g.sub, 'vs')); }
    // 表头（上：列；左：行）
    var i;
    if (g.headC) {
      for (i = 0; i < R; i++) {
        var hc = (g.markC === i) ? 'ptr' : 'vs';
        if (g.rowLabelL != null) { kr.html('hl' + i, S.textL(g.rowLabelL, oy + i * ch + ch / 2, g.headC[i], hc)); }
        else { kr.html('hl' + i, S.text(ox - 16, oy + i * ch + ch / 2, g.headC[i], hc)); }
      }
    }
    if (g.headR) {
      for (i = 0; i < C; i++) {
        var hr = (g.markR === i) ? 'ptr' : 'vs';
        kr.html('ht' + i, S.text(ox + i * cw + cw / 2, oy - 14, g.headR[i], hr));
      }
    }
    for (var r = 0; r < R; r++) {
      for (var c = 0; c < C; c++) {
        var cell = (g.get && g.get(r, c)) || { v: '', cls: '' };
        var x = ox + c * cw, y = oy + r * ch;
        kr.g('g_' + r + '_' + c, 'translate(' + x + ',' + y + ')', 'k',
          '<rect class="cell ' + (cell.cls || '') + '" x="3" y="3" width="' + (cw - 6) + '" height="' + (ch - 6) + '" rx="4"/>' +
          (cell.v !== '' && cell.v != null ? S.text(cw / 2, ch / 2, cell.v, 'cell-txt') : ''));
      }
    }
    if (g.note) { kr.html('__n', S.text(500, oy + R * ch + 26, g.note, 'vs')); }
  }

  /* ============================================================
     1. 二项式系数 C(n, k)（帕斯卡三角形）
     ============================================================ */
  DSV.register({
    id: 'dp-binomial', name: '二项式系数', category: '动态规划',
    desc: '用帕斯卡三角形递推计算组合数 C(n,k)：C(i,j)=C(i-1,j-1)+C(i-1,j)，边界 C(i,0)=C(i,i)=1。时间/空间 O(n·k)。',
    code: [
      'C(0,0) = 1',
      'for i = 1 to n:',
      '  C(i,0) = C(i,i) = 1',
      '  for j = 1 to i-1:',
      '    C(i,j) = C(i-1,j-1) + C(i-1,j)',
      'return C(n,k)'
    ],
    viewBox: '0 0 1000 640',
    inputs: [{ key: 'n', label: 'n', def: '8', hint: '行数（≤15）' }, { key: 'k', label: 'k', def: '3', hint: '取几个（≤n）' }],
    samples: [
      { label: '示例：C(8,3)', values: { n: '8', k: '3' } },
      { label: '示例：C(10,5)', values: { n: '10', k: '5' } }
    ],
    random: function () { var n = DSV.ri(6, 12); return { n: String(n), k: String(DSV.ri(1, n)) }; },
    run: function (v) {
      var n = Math.max(0, Math.min(15, parseInt(v.n, 10) || 0));
      var k = Math.max(0, Math.min(n, parseInt(v.k, 10) || 0));
      if (n < 1) { return []; }
      var R = n + 1, C = k + 1;
      var tab = []; for (var r = 0; r < R; r++) { tab.push([]); for (var c = 0; c < C; c++) { tab[r].push({ v: '', cls: '' }); } }
      var val = []; for (var r2 = 0; r2 < R; r2++) { val.push([]); for (var c2 = 0; c2 < C; c2++) { val[r2].push(0); } }
      var steps = [];
      var headC = [], headR = [];
      for (var a = 0; a < R; a++) { headC.push('i=' + a); }
      for (var b = 0; b < C; b++) { headR.push('j=' + b); }
      function snap(extra) {
        var t = []; for (var i = 0; i < R; i++) { t.push(tab[i].map(function (x) { return { v: x.v, cls: x.cls }; })); }
        return { R: R, C: C, headC: headC, headR: headR, get: function (r, c) { return t[r][c]; }, title: '二项式系数 C(' + n + ',' + k + ')', sub: (extra && extra.sub) || '', markR: (extra && extra.markR), markC: (extra && extra.markC), note: (extra && extra.note) || '' };
      }
      val[0][0] = 1; tab[0][0] = { v: '1', cls: 'done' };
      push(steps, [0], '初始化：C(0,0) = 1', snap({ sub: '起始' }));
      for (var i = 1; i <= n; i++) {
        val[i][0] = 1; tab[i][0] = { v: '1', cls: 'done' };
        if (i <= k) { val[i][i] = 1; tab[i][i] = { v: '1', cls: 'done' }; }
        push(steps, [1, 2], '第 ' + i + ' 行：边界 C(' + i + ',0)=C(' + i + ',' + i + ')=1', snap({ sub: '计算第 ' + i + ' 行', markC: 0 }));
        for (var j = 1; j < i && j <= k; j++) {
          tab[i - 1][j - 1].cls = 'compare'; tab[i - 1][j].cls = 'compare'; tab[i][j].cls = 'active';
          push(steps, [4, 5], 'C(' + i + ',' + j + ') = C(' + (i - 1) + ',' + (j - 1) + ')+C(' + (i - 1) + ',' + j + ') = ' + val[i - 1][j - 1] + '+' + val[i - 1][j],
            snap({ sub: 'C(' + i + ',' + j + ')', markR: i, markC: j }));
          val[i][j] = val[i - 1][j - 1] + val[i - 1][j];
          tab[i][j] = { v: String(val[i][j]), cls: 'done' };
        }
      }
      push(steps, [6], '结果：C(' + n + ',' + k + ') = ' + val[n][k], snap({ sub: '完成', markR: n, markC: k, note: 'C(' + n + ',' + k + ') = ' + val[n][k] }));
      return steps;
    },
    render: function (kr, s) { if (!s) { kr.html('__t', S.text(500, 30, '二项式系数', 'vt')); kr.end(); return; } dpGrid(kr, s); }
  });

  /* ============================================================
     2. 找零问题（最少硬币数）
     ============================================================ */
  DSV.register({
    id: 'dp-change', name: '找零问题', category: '动态规划',
    desc: '给定面值 coins 与目标金额 A，求凑出 A 的最少硬币数。dp[i]=min(dp[i], dp[i-c]+1)，dp[0]=0，其余初为 ∞。时间 O(A·|coins|)。',
    code: [
      'dp[0] = 0；其余 dp = ∞',
      'for i = 1 to A:',
      '  for c in coins:',
      '    if c <= i: dp[i] = min(dp[i], dp[i-c] + 1)',
      'return dp[A]'
    ],
    viewBox: '0 0 1000 420',
    inputs: [{ key: 'coins', label: '硬币面值', def: '1,3,4', hint: '逗号分隔' }, { key: 'amount', label: '目标金额', def: '10', hint: '≤40' }],
    samples: [
      { label: '示例：面值 1,3,4 凑 10', values: { coins: '1,3,4', amount: '10' } },
      { label: '示例：面值 1,5,10 凑 18', values: { coins: '1,5,10', amount: '18' } }
    ],
    random: function () { return { coins: DSV.shuffle([1, 2, 3, 4, 5]).slice(0, 3).sort(function (a, b) { return a - b; }).join(','), amount: String(DSV.ri(8, 20)) }; },
    run: function (v) {
      var coins = DSV.nums(v.coins, 12).filter(function (x) { return x > 0; });
      var A = Math.max(0, Math.min(40, parseInt(v.amount, 10) || 0));
      if (!coins.length || A < 1) { return []; }
      var dp = []; for (var i = 0; i <= A; i++) { dp.push(Infinity); }
      dp[0] = 0;
      var steps = [];
      var headR = []; for (var c = 0; c <= A; c++) { headR.push(String(c)); }
      function snap(extra) {
        return {
          R: 1, C: A + 1, headR: headR, headC: ['金额'],
          get: function (r, c) { return { v: dp[c] === Infinity ? '∞' : String(dp[c]), cls: (extra && extra.cls && extra.cls[c]) || '' }; },
          title: '找零问题：凑出 ' + A + ' 的最少硬币数', sub: (extra && extra.sub) || '',
          markR: 0, markC: (extra && extra.markC), note: (extra && extra.note) || ''
        };
      }
      push(steps, [0], '初始化：dp[0]=0，其余为 ∞（表示暂不可达）', snap({ sub: '起始' }));
      for (var i = 1; i <= A; i++) {
        var best = Infinity, bestC = -1;
        for (var ci = 0; ci < coins.length; ci++) {
          var c = coins[ci];
          if (c <= i) {
            var cand = dp[i - c] + 1;
            push(steps, [2, 3], '金额 ' + i + '：尝试面值 ' + c + '，dp[' + (i - c) + ']=' + (dp[i - c] === Infinity ? '∞' : dp[i - c]) + '，得 ' + cand + ' 枚硬币',
              snap({ sub: '金额 ' + i + ' · 面值 ' + c, markC: i, cls: mkCls(A, i, i - c, c) }));
            if (cand < best) { best = cand; bestC = c; }
          }
        }
        dp[i] = best;
        var cls = {}; cls[i] = 'done';
        push(steps, [4], 'dp[' + i + '] = ' + (best === Infinity ? '∞（无法凑出）' : best + '（用面值 ' + bestC + '）'),
          snap({ sub: 'dp[' + i + '] 确定', markC: i, cls: cls, note: (best === Infinity ? '金额 ' + i + ' 无法用给定面值凑出' : '') }));
      }
      function mkCls(A, i, from, c) {
        var o = {}; o[i] = 'active'; o[from] = 'compare'; return o;
      }
      push(steps, [5], '最少硬币数 = ' + (dp[A] === Infinity ? '∞（无法凑出）' : dp[A]), snap({ sub: '完成', markC: A, cls: (function () { var o = {}; o[A] = 'done'; return o; })() }));
      return steps;
    },
    render: function (kr, s) { if (!s) { kr.html('__t', S.text(500, 30, '找零问题', 'vt')); kr.end(); return; } dpGrid(kr, s); }
  });

  /* ============================================================
     3. 0-1 背包问题
     ============================================================ */
  DSV.register({
    id: 'dp-knapsack', name: '0-1 背包', category: '动态规划',
    desc: 'n 件物品（重量 w、价值 v），容量 W，每件至多选一次，求最大价值。dp[i][j]=max(dp[i-1][j], dp[i-1][j-w_i]+v_i)。时间/空间 O(n·W)。',
    code: [
      'for j = 0 to W: dp[0][j] = 0',
      'for i = 1 to n:',
      '  for j = 0 to W:',
      '    dp[i][j] = dp[i-1][j]',
      '    if w[i] <= j:',
      '      dp[i][j] = max(dp[i][j], dp[i-1][j-w[i]] + v[i])',
      'return dp[n][W]'
    ],
    viewBox: '0 0 1000 700',
    inputs: [
      { key: 'w', label: '重量 w', def: '2,3,4,5', hint: '逗号分隔' },
      { key: 'v', label: '价值 v', def: '3,4,5,6', hint: '逗号分隔' },
      { key: 'W', label: '容量 W', def: '10', hint: '≤24' }
    ],
    samples: [
      { label: '示例：w=2,3,4,5 v=3,4,5,6 W=10', values: { w: '2,3,4,5', v: '3,4,5,6', W: '10' } },
      { label: '示例：w=1,3,4,5 v=1,4,5,7 W=8', values: { w: '1,3,4,5', v: '1,4,5,7', W: '8' } }
    ],
    random: function () {
      var n = DSV.ri(4, 7); var w = [], v = [];
      for (var i = 0; i < n; i++) { w.push(DSV.ri(1, 6)); v.push(DSV.ri(1, 9)); }
      return { w: w.join(','), v: v.join(','), W: String(DSV.ri(8, 16)) };
    },
    run: function (v) {
      var w = DSV.nums(v.w, 12), val = DSV.nums(v.v, 12);
      var n = Math.min(w.length, val.length, 9);
      if (n < 1) { return []; }
      w = w.slice(0, n); val = val.slice(0, n);
      var W = Math.max(0, Math.min(24, parseInt(v.W, 10) || 0));
      var dp = []; for (var i = 0; i <= n; i++) { dp.push([]); for (var j = 0; j <= W; j++) { dp[i].push(0); } }
      var tab = []; for (var r = 0; r <= n; r++) { tab.push([]); for (var c = 0; c <= W; c++) { tab[r].push({ v: '0', cls: '' }); } }
      var steps = [];
      var headC = ['∅']; for (var ii = 1; ii <= n; ii++) { headC.push('物品' + ii + '(w' + w[ii - 1] + ',v' + val[ii - 1] + ')'); }
      var headR = []; for (var j = 0; j <= W; j++) { headR.push(String(j)); }
      function snap(extra) {
        var t = []; for (var i = 0; i <= n; i++) { t.push(tab[i].map(function (x) { return { v: x.v, cls: x.cls }; })); }
        return { R: n + 1, C: W + 1, headC: headC, headR: headR, get: function (r, c) { return t[r][c]; }, title: '0-1 背包（容量 ' + W + '）', sub: (extra && extra.sub) || '', markR: (extra && extra.markR), markC: (extra && extra.markC), note: (extra && extra.note) || '' };
      }
      for (var j0 = 0; j0 <= W; j0++) { tab[0][j0] = { v: '0', cls: 'done' }; }
      push(steps, [0], '第 0 行（不选任何物品）：所有容量下价值均为 0', snap({ sub: '初始化' }));
      for (var i = 1; i <= n; i++) {
        push(steps, [1, 2], '考虑第 ' + i + ' 件物品：重量 ' + w[i - 1] + '，价值 ' + val[i - 1], snap({ sub: '物品 ' + i, markR: i }));
        for (var j = 0; j <= W; j++) {
          var notake = dp[i - 1][j];
          var take = (w[i - 1] <= j) ? dp[i - 1][j - w[i - 1]] + val[i - 1] : -Infinity;
          tab[i - 1][j].cls = 'compare';
          if (w[i - 1] <= j) { tab[i - 1][j - w[i - 1]].cls = 'compare'; }
          tab[i][j].cls = 'active';
          var chose = (take > notake) ? '取（+v）' : '不取';
          push(steps, [3, 4, 5, 6], '容量 ' + j + '：不取=' + notake + '，取=' + (take === -Infinity ? '不可取' : take) + ' → ' + chose,
            snap({ sub: '物品' + i + ' · 容量 ' + j, markR: i, markC: j }));
          dp[i][j] = Math.max(notake, take);
          tab[i][j] = { v: String(dp[i][j]), cls: (take > notake && w[i - 1] <= j) ? 'swap' : 'done' };
        }
      }
      push(steps, [7], '最大价值 = ' + dp[n][W], snap({ sub: '完成', markR: n, markC: W, note: '最大价值 = ' + dp[n][W] }));
      return steps;
    },
    render: function (kr, s) { if (!s) { kr.html('__t', S.text(500, 30, '0-1 背包', 'vt')); kr.end(); return; } s.ox = 160; s.rowLabelL = 12; dpGrid(kr, s); }
  });

  /* ============================================================
     4. 最长公共子序列 LCS
     ============================================================ */
  DSV.register({
    id: 'dp-lcs', name: '最长公共子序列', category: '动态规划',
    desc: '求两字符串 X、Y 的最长公共子序列（不要求连续）。dp[i][j]=dp[i-1][j-1]+1（字符相等）或 max(dp[i-1][j],dp[i][j-1])。时间 O(|X|·|Y|)。',
    code: [
      'dp[0][*] = dp[*][0] = 0',
      'for i = 1 to |X|:',
      '  for j = 1 to |Y|:',
      '    if X[i-1] == Y[j-1]:',
      '      dp[i][j] = dp[i-1][j-1] + 1',
      '    else:',
      '      dp[i][j] = max(dp[i-1][j], dp[i][j-1])',
      'return dp[|X|][|Y|]'
    ],
    viewBox: '0 0 1000 660',
    inputs: [{ key: 'X', label: '字符串 X', def: 'ABCBDAB', hint: '字符序列' }, { key: 'Y', label: '字符串 Y', def: 'BDCABA', hint: '字符序列' }],
    samples: [
      { label: '示例：X=ABCBDAB Y=BDCABA', values: { X: 'ABCBDAB', Y: 'BDCABA' } },
      { label: '示例：X=AGGTAB Y=GXTXAYB', values: { X: 'AGGTAB', Y: 'GXTXAYB' } }
    ],
    random: function () { var A = 'ABCD'; var a = [], b = []; for (var i = 0; i < DSV.ri(5, 8); i++) { a.push(A[DSV.ri(0, 3)]); } for (var j = 0; j < DSV.ri(5, 8); j++) { b.push(A[DSV.ri(0, 3)]); } return { X: a.join(''), Y: b.join('') }; },
    run: function (v) {
      var X = String(v.X || '').replace(/\s/g, ''), Y = String(v.Y || '').replace(/\s/g, '');
      var m = Math.min(X.length, 14), n = Math.min(Y.length, 14);
      X = X.slice(0, m); Y = Y.slice(0, n);
      if (m < 1 || n < 1) { return []; }
      var dp = []; for (var i = 0; i <= m; i++) { dp.push([]); for (var j = 0; j <= n; j++) { dp[i].push(0); } }
      var tab = []; for (var r = 0; r <= m; r++) { tab.push([]); for (var c = 0; c <= n; c++) { tab[r].push({ v: '0', cls: '' }); } }
      var steps = [];
      var headC = ['∅']; for (var a = 0; a < m; a++) { headC.push(X[a]); }
      var headR = ['∅']; for (var b = 0; b < n; b++) { headR.push(Y[b]); }
      function snap(extra) {
        var t = []; for (var i = 0; i <= m; i++) { t.push(tab[i].map(function (x) { return { v: x.v, cls: x.cls }; })); }
        return { R: m + 1, C: n + 1, headC: headC, headR: headR, get: function (r, c) { return t[r][c]; }, title: '最长公共子序列 LCS', sub: (extra && extra.sub) || '', markR: (extra && extra.markR), markC: (extra && extra.markC), note: (extra && extra.note) || '' };
      }
      for (var q = 0; q <= n; q++) { tab[0][q] = { v: '0', cls: 'done' }; }
      for (var q2 = 0; q2 <= m; q2++) { tab[q2][0] = { v: '0', cls: 'done' }; }
      push(steps, [0], '空串与任何串的 LCS 长度均为 0（首行首列为 0）', snap({ sub: '初始化' }));
      for (var i = 1; i <= m; i++) {
        for (var j = 1; j <= n; j++) {
          tab[i - 1][j - 1].cls = 'compare'; tab[i - 1][j].cls = 'compare'; tab[i][j - 1].cls = 'compare'; tab[i][j].cls = 'active';
          if (X[i - 1] === Y[j - 1]) {
            dp[i][j] = dp[i - 1][j - 1] + 1;
            push(steps, [4, 5], 'X[' + (i - 1) + ']=' + X[i - 1] + ' == Y[' + (j - 1) + ']=' + Y[j - 1] + '，沿左上对角 +1 → dp=' + dp[i][j],
              snap({ sub: 'X=' + X[i - 1] + ' · Y=' + Y[j - 1] + ' 匹配', markR: j, markC: i }));
            tab[i][j] = { v: String(dp[i][j]), cls: 'swap' };
          } else {
            dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            push(steps, [6, 7], 'X[' + (i - 1) + ']=' + X[i - 1] + ' ≠ Y[' + (j - 1) + ']=' + Y[j - 1] + '，取上/左较大者 → dp=' + dp[i][j],
              snap({ sub: 'X=' + X[i - 1] + ' · Y=' + Y[j - 1] + ' 不等', markR: j, markC: i }));
            tab[i][j] = { v: String(dp[i][j]), cls: 'done' };
          }
        }
      }
      // 回溯
      var lcs = '', bi = m, bj = n, path = [];
      while (bi > 0 && bj > 0) {
        if (X[bi - 1] === Y[bj - 1]) { lcs = X[bi - 1] + lcs; path.push([bi, bj]); bi--; bj--; }
        else if (dp[bi - 1][bj] >= dp[bi][bj - 1]) { bi--; }
        else { bj--; }
      }
      path.reverse().forEach(function (p, k) {
        tab[p[0]][p[1]].cls = 'path';
        push(steps, [8], '回溯：字符 ' + X[p[0] - 1] + ' 属于 LCS（沿对角前进一步）', snap({ sub: '回溯 LCS（' + (k + 1) + '/' + path.length + '）', markR: p[1], markC: p[0], note: '当前 LCS = ' + lcs }));
      });
      push(steps, [8], 'LCS 长度 = ' + dp[m][n] + '，子序列为 “' + lcs + '”', snap({ sub: '完成', markR: n, markC: m, note: 'LCS = “' + lcs + '”，长度 ' + dp[m][n] }));
      return steps;
    },
    render: function (kr, s) { if (!s) { kr.html('__t', S.text(500, 30, '最长公共子序列', 'vt')); kr.end(); return; } dpGrid(kr, s); }
  });

  /* ============================================================
     5. 编辑距离（Levenshtein）
     ============================================================ */
  DSV.register({
    id: 'dp-edit', name: '编辑距离', category: '动态规划',
    desc: '将字符串 X 变为 Y 的最少单字符操作数（插入/删除/替换各代价 1）。dp[i][j] 由 dp[i-1][j]、dp[i][j-1]、dp[i-1][j-1] 取最小 +1（或字符相等时直接继承）。时间 O(|X|·|Y|)。',
    code: [
      'dp[i][0] = i；dp[0][j] = j',
      'for i = 1 to |X|:',
      '  for j = 1 to |Y|:',
      '    if X[i-1] == Y[j-1]:',
      '      dp[i][j] = dp[i-1][j-1]',
      '    else:',
      '      dp[i][j] = 1 + min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])',
      'return dp[|X|][|Y|]'
    ],
    viewBox: '0 0 1000 660',
    inputs: [{ key: 'X', label: '字符串 X', def: 'sunday', hint: '源串' }, { key: 'Y', label: '字符串 Y', def: 'saturday', hint: '目标串' }],
    samples: [
      { label: '示例：sunday→saturday', values: { X: 'sunday', Y: 'saturday' } },
      { label: '示例：kitten→sitting', values: { X: 'kitten', Y: 'sitting' } }
    ],
    random: function () { var A = 'abcde'; var a = [], b = []; for (var i = 0; i < DSV.ri(5, 8); i++) { a.push(A[DSV.ri(0, 4)]); } for (var j = 0; j < DSV.ri(5, 8); j++) { b.push(A[DSV.ri(0, 4)]); } return { X: a.join(''), Y: b.join('') }; },
    run: function (v) {
      var X = String(v.X || '').replace(/\s/g, ''), Y = String(v.Y || '').replace(/\s/g, '');
      var m = Math.min(X.length, 14), n = Math.min(Y.length, 14);
      X = X.slice(0, m); Y = Y.slice(0, n);
      if (m < 1 || n < 1) { return []; }
      var dp = []; for (var i = 0; i <= m; i++) { dp.push([]); for (var j = 0; j <= n; j++) { dp[i].push(0); } }
      var tab = []; for (var r = 0; r <= m; r++) { tab.push([]); for (var c = 0; c <= n; c++) { tab[r].push({ v: '0', cls: '' }); } }
      var steps = [];
      var headC = ['∅']; for (var a = 0; a < m; a++) { headC.push(X[a]); }
      var headR = ['∅']; for (var b = 0; b < n; b++) { headR.push(Y[b]); }
      function snap(extra) {
        var t = []; for (var i = 0; i <= m; i++) { t.push(tab[i].map(function (x) { return { v: x.v, cls: x.cls }; })); }
        return { R: m + 1, C: n + 1, headC: headC, headR: headR, get: function (r, c) { return t[r][c]; }, title: '编辑距离（' + X + ' → ' + Y + '）', sub: (extra && extra.sub) || '', markR: (extra && extra.markR), markC: (extra && extra.markC), note: (extra && extra.note) || '' };
      }
      for (var i0 = 0; i0 <= m; i0++) { dp[i0][0] = i0; tab[i0][0] = { v: String(i0), cls: 'done' }; }
      for (var j0 = 0; j0 <= n; j0++) { dp[0][j0] = j0; tab[0][j0] = { v: String(j0), cls: 'done' }; }
      push(steps, [0], '边界：删光 X 需 i 次、插入成 Y 需 j 次', snap({ sub: '初始化' }));
      for (var i = 1; i <= m; i++) {
        for (var j = 1; j <= n; j++) {
          tab[i - 1][j].cls = 'compare'; tab[i][j - 1].cls = 'compare'; tab[i - 1][j - 1].cls = 'compare'; tab[i][j].cls = 'active';
          if (X[i - 1] === Y[j - 1]) {
            dp[i][j] = dp[i - 1][j - 1];
            push(steps, [4, 5], 'X[' + (i - 1) + ']=' + X[i - 1] + ' == Y[' + (j - 1) + ']=' + Y[j - 1] + '，无需操作，继承左上 → dp=' + dp[i][j],
              snap({ sub: '匹配', markR: j, markC: i }));
            tab[i][j] = { v: String(dp[i][j]), cls: 'swap' };
          } else {
            var mn = Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
            dp[i][j] = mn + 1;
            var op = (mn === dp[i - 1][j - 1]) ? '替换' : (mn === dp[i - 1][j] ? '删除' : '插入');
            push(steps, [6, 7], 'X[' + (i - 1) + ']≠Y[' + (j - 1) + ']，取 上/左/左上 最小(' + mn + ')+1，操作=' + op + ' → dp=' + dp[i][j],
              snap({ sub: op + '（' + X[i - 1] + '→' + Y[j - 1] + '）', markR: j, markC: i }));
            tab[i][j] = { v: String(dp[i][j]), cls: 'done' };
          }
        }
      }
      // 回溯
      var bi = m, bj = n, ops = [];
      while (bi > 0 && bj > 0) {
        if (X[bi - 1] === Y[bj - 1]) { bi--; bj--; }
        else if (dp[bi - 1][bj - 1] <= dp[bi - 1][bj] && dp[bi - 1][bj - 1] <= dp[bi][bj - 1]) { ops.push('替换 ' + X[bi - 1] + '→' + Y[bj - 1]); bi--; bj--; }
        else if (dp[bi - 1][bj] <= dp[bi][bj - 1]) { ops.push('删除 ' + X[bi - 1]); bi--; }
        else { ops.push('插入 ' + Y[bj - 1]); bj--; }
      }
      while (bi > 0) { ops.push('删除 ' + X[bi - 1]); bi--; }
      while (bj > 0) { ops.push('插入 ' + Y[bj - 1]); bj--; }
      ops.reverse();
      push(steps, [8], '编辑距离 = ' + dp[m][n] + '，一个最优操作序列：' + ops.join('，'),
        snap({ sub: '完成', markR: n, markC: m, note: '编辑距离 = ' + dp[m][n] }));
      return steps;
    },
    render: function (kr, s) { if (!s) { kr.html('__t', S.text(500, 30, '编辑距离', 'vt')); kr.end(); return; } dpGrid(kr, s); }
  });

})();
