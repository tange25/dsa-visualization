/* ============================================================
   viz-recursion.js —— 递归章节（3 个可视化）
   阶乘（递归） / 字符串反转（递归） / N 皇后问题（回溯）
   三个均为「无状态」算法：run 直接返回 steps 数组
   ============================================================ */
(function () {
  'use strict';
  var DSV = window.DSV, S = DSV.svg;

  function push(steps, code, desc, snap) { steps.push({ code: code, desc: desc, snap: snap }); }

  var ACT_RUN = [{ key: 'run', label: '开始演示', primary: true }];

  /* ============================================================
     1. 阶乘（递归）
     ============================================================ */
  DSV.register({
    id: 'rec-fact', name: '阶乘（递归）', category: '递归',
    desc: 'fact(n) = n × fact(n-1)，基线条件 fact(0) = fact(1) = 1。递归下降时把每一层调用压入调用栈，到达基线后再逐层返回并把结果写回。时间复杂度 O(n)，递归深度（栈空间）O(n)。',
    viewBox: '0 0 1000 520',
    code: [
      'fact(n):',                                      // 0
      '  if n <= 1: return 1          // 基线条件',     // 1
      '  t = fact(n - 1)              // 递归调用：先压栈', // 2
      '  return n * t                 // 回溯：计算并写回' // 3
    ],
    inputs: [{ key: 'n', label: 'n', def: '5', hint: '0-8 的整数' }],
    actions: ACT_RUN,
    samples: [
      { label: '示例：n = 5', values: { n: '5' } },
      { label: '示例：n = 0（直接命中基线）', values: { n: '0' } },
      { label: '示例：n = 8（较深的调用栈）', values: { n: '8' } }
    ],
    random: function () { return { n: String(DSV.ri(2, 8)) }; },
    run: function (v) {
      var n = parseInt(v.n, 10);
      if (!isFinite(n) || n < 0) { n = 5; }
      if (n > 8) { n = 8; }
      var st = [], i;
      var frames = [];               // 调用栈：{k, v, cls}，栈底在前
      var table = [];                // table[k] = fact(k) 的值（null 表示尚未确定）
      for (i = 0; i <= n; i++) { table.push(null); }

      function sn(msg, warn) {
        return {
          n: n,
          frames: frames.map(function (f) { return { k: f.k, v: f.v, cls: f.cls }; }),
          table: table.slice(),
          msg: msg || '', warn: !!warn
        };
      }

      push(st, [0], '开始：调用 fact(' + n + ')，递归深度为 ' + n + '，先把每一层调用依次压入调用栈',
        sn('计算 fact(' + n + ')'));

      /* ---- 递归下降：逐层压栈 ---- */
      for (var k = n; k >= 0; k--) {
        frames.push({ k: k, v: null, cls: 'active' });
        for (i = 0; i < frames.length - 1; i++) { frames[i].cls = ''; }
        if (k <= 1) {
          push(st, [0, 1], '压栈 fact(' + k + ')：k = ' + k + ' 满足基线条件 k ≤ 1，不再继续递归，当前栈深 ' + frames.length,
            sn('调用 fact(' + k + ')'));
        } else {
          push(st, [0, 2], '压栈 fact(' + k + ')：要算 fact(' + k + ') 必须先知道 fact(' + (k - 1) + ')，当前栈深 ' + frames.length,
            sn('调用 fact(' + k + ')'));
        }
      }

      /* ---- 到达基线 ---- */
      var b = frames[frames.length - 1];
      b.cls = 'compare';
      push(st, [1], '到达基线：fact(' + b.k + ') 中 n ≤ 1，直接得到 1，不再向下递归',
        sn('fact(' + b.k + ') 命中基线'));
      b.v = 1; b.cls = 'done';
      table[b.k] = 1;
      push(st, [1], '写入返回值表：fact(' + b.k + ') = 1', sn('fact(' + b.k + ') = 1'));

      /* ---- 逐层返回 ---- */
      for (i = frames.length - 2; i >= 0; i--) {
        var f = frames[i];
        f.cls = 'swap';
        push(st, [3], '回溯到 fact(' + f.k + ')：下层 fact(' + (f.k - 1) + ') = ' + table[f.k - 1] + ' 已经确定，可以计算本层',
          sn('回溯 fact(' + f.k + ')'));
        f.v = f.k * table[f.k - 1];
        f.cls = 'done';
        table[f.k] = f.v;
        push(st, [3], '写入：fact(' + f.k + ') = ' + f.k + ' × fact(' + (f.k - 1) + ') = ' + f.k + ' × ' +
          table[f.k - 1] + ' = ' + f.v + '，把结果写回第 ' + (i + 1) + ' 层栈帧',
          sn('fact(' + f.k + ') = ' + f.v));
        f.cls = 'path';
        push(st, [3], '弹出 fact(' + f.k + ') 栈帧，把 ' + f.v + ' 返回给上一层' +
          (frames[i - 1] ? ' fact(' + frames[i - 1].k + ')' : '（调用结束）'), sn('弹出 fact(' + f.k + ')'));
        frames.pop();
        if (frames.length) { frames[frames.length - 1].cls = ''; }
      }

      push(st, [3], '递归结束：fact(' + n + ') = ' + table[n] + '，调用栈已经全部弹出',
        sn('完成：fact(' + n + ') = ' + table[n]));
      return st;
    },
    render: function (kr, s) {
      if (!s) {
        kr.html('__t', S.text(500, 260, '阶乘（递归）：输入 n（0-8）后点击「开始演示」', 'vt'));
        kr.end(); return;
      }
      var i;
      kr.html('__t', S.text(500, 26, '阶乘（递归）：fact(n) = n × fact(n-1)，基线 fact(0) = fact(1) = 1', 'vt'));
      kr.html('__t2', S.text(500, 50, '金色 = 刚压栈 · 蓝色 = 命中基线 · 红色 = 正在返回 · 绿色 = 已写入结果', 'vs'));
      kr.html('__h1', S.text(250, 76, '调用栈（栈底在下，栈顶在上）', 'vs'));
      kr.html('__h2', S.text(740, 76, '已确定的返回值', 'vs'));

      var fs = s.frames || [], baseY = 440, pitch = 44;
      for (i = 0; i < fs.length; i++) {
        var f = fs[i], y = baseY - (fs.length - 1 - i) * pitch;
        kr.g('f' + f.k, 'translate(250,' + y + ')', 'k',
          '<rect class="cell ' + (f.cls || '') + '" x="-118" y="-17" width="236" height="34" rx="5"/>' +
          S.textL(-106, 0, 'fact(' + f.k + ')', 'cell-txt') +
          S.text(78, 0, (f.v === null ? '等待 fact(' + (f.k - 1) + ')…' : '= ' + f.v), 'cell-txt'));
      }
      if (fs.length) {
        kr.html('__tt', S.textL(372, baseY - (fs.length - 1) * pitch, '← 栈顶', 'ptr'));
      }

      for (i = 0; i <= s.n; i++) {
        var val = s.table[i], yy = 108 + i * 40;
        kr.g('t' + i, 'translate(740,' + yy + ')', 'k',
          '<rect class="cell ' + (val === null ? '' : 'done') + '" x="-92" y="-15" width="184" height="30" rx="4"/>' +
          S.textL(-82, 0, 'fact(' + i + ') =', 'cell-txt') +
          S.text(52, 0, (val === null ? '?' : val), 'cell-txt'));
      }

      if (s.msg) { kr.html('__m', S.text(500, 484, s.msg, s.warn ? 'vwarn' : 'vs')); }
      if (s.table[s.n] !== null && s.table[s.n] !== undefined) {
        kr.html('__r', S.text(500, 508, '最终结果：fact(' + s.n + ') = ' + s.table[s.n], 'vt'));
      }
      kr.end();
    }
  });

  /* ============================================================
     2. 字符串反转（递归）
     ============================================================ */
  DSV.register({
    id: 'rec-reverse', name: '字符串反转（递归）', category: '递归',
    desc: '把反转拆成「首字符 + 剩余子串」：reverse(s) = reverse(s[1:]) + s[0]，基线是空串返回 ""。递归时先把首字符留在栈帧里，一路压到空串，回溯时再从后往前把字符拼起来。时间 O(n)，递归深度（栈空间）O(n)。',
    viewBox: '0 0 1000 610',
    code: [
      'reverse(s, lo):',                                  // 0
      '  if lo == s.length: return ""   // 基线：空串',     // 1
      '  sub = reverse(s, lo + 1)       // 先反转后面的子串', // 2
      '  return sub + s[lo]             // 把首字符拼到末尾'  // 3
    ],
    inputs: [{ key: 's', label: '字符串', def: 'abcdef', hint: '1-8 个字符，不含空格' }],
    actions: ACT_RUN,
    samples: [
      { label: '示例：abcdef', values: { s: 'abcdef' } },
      { label: '示例：hello', values: { s: 'hello' } },
      { label: '示例：abcd（较短）', values: { s: 'abcd' } }
    ],
    random: function () {
      var pool = 'abcdefghijklmnopqrstuvwxyz', r = '', n = DSV.ri(4, 7);
      for (var i = 0; i < n; i++) { r += pool.charAt(DSV.ri(0, pool.length - 1)); }
      return { s: r };
    },
    run: function (v) {
      var str = String(v.s == null ? '' : v.s).replace(/[\s,，]+/g, '');
      if (!str) { return []; }
      if (str.length > 8) { str = str.slice(0, 8); }
      var len = str.length, st = [], i;
      var frames = [];            // 调用栈：{lo, res, cls}
      var ret = [];               // ret[lo] = reverse(lo) 的返回值
      for (i = 0; i <= len; i++) { ret.push(null); }

      function sn(lo, msg) {
        return {
          s: str, len: len, lo: (lo == null ? -1 : lo),
          frames: frames.map(function (f) { return { lo: f.lo, res: f.res, cls: f.cls }; }),
          ret: ret.slice(), msg: msg || ''
        };
      }

      push(st, [0], '开始：调用 reverse(s, 0)，把首字符逐个交给栈帧保存，一直递归到空串',
        sn(0, '调用 reverse(0)'));

      /* ---- 递归下降：逐层压栈 ---- */
      for (var lo = 0; lo <= len; lo++) {
        frames.push({ lo: lo, res: null, cls: 'active' });
        for (i = 0; i < frames.length - 1; i++) { frames[i].cls = ''; }
        if (lo === len) {
          push(st, [0, 1], '压栈 reverse(' + lo + ')：lo == 长度 ' + len + '，子串是空串，命中基线，当前栈深 ' + frames.length,
            sn(lo, '调用 reverse(' + lo + ')'));
        } else {
          push(st, [0, 2], '压栈 reverse(' + lo + ')：把首字符 s[' + lo + '] = “' + str[lo] +
            '” 留在这一帧，先去反转子串 s[' + (lo + 1) + '…' + (len - 1) + ']', sn(lo, '调用 reverse(' + lo + ')'));
        }
      }

      /* ---- 基线：空串 ---- */
      var b = frames[frames.length - 1];
      b.cls = 'compare';
      push(st, [1], '到达基线：reverse(' + len + ') 的子串为空，返回空串 ""', sn(len, '基线：空串'));
      b.res = ''; b.cls = 'done'; ret[len] = '';
      push(st, [1], '写入返回值：reverse(' + len + ') = ""', sn(len, 'reverse(' + len + ') = ""'));
      b.cls = 'path';
      push(st, [1], '弹出 reverse(' + len + ') 栈帧，把空串返回给上一层 reverse(' + (len - 1) + ')',
        sn(len, '弹出基线帧'));
      frames.pop();

      /* ---- 逐层回溯拼装 ---- */
      for (i = frames.length - 1; i >= 0; i--) {
        var f = frames[i];
        f.cls = 'swap';
        push(st, [3], '回溯到 reverse(' + f.lo + ')：下层返回 “' + ret[f.lo + 1] + '”，现在把保存的首字符 “' +
          str[f.lo] + '” 拼到它的末尾', sn(f.lo, '回溯 reverse(' + f.lo + ')'));
        f.res = ret[f.lo + 1] + str[f.lo];
        f.cls = 'done';
        ret[f.lo] = f.res;
        push(st, [3], '拼装：reverse(' + f.lo + ') = reverse(' + (f.lo + 1) + ') + s[' + f.lo + '] = “' +
          ret[f.lo + 1] + '” + “' + str[f.lo] + '” = “' + f.res + '”', sn(f.lo, '拼装出 “' + f.res + '”'));
        f.cls = 'path';
        push(st, [3], '弹出 reverse(' + f.lo + ') 栈帧，把 “' + f.res + '” 返回给上一层',
          sn(f.lo, '弹出 reverse(' + f.lo + ')'));
        frames.pop();
      }

      push(st, [3], '递归结束：原串 “' + str + '” 的反转为 “' + ret[0] + '”', sn(-1, '完成'));
      return st;
    },
    render: function (kr, s) {
      if (!s) {
        kr.html('__t', S.text(500, 280, '字符串反转（递归）：reverse(s) = reverse(s[1:]) + s[0]', 'vt'));
        kr.end(); return;
      }
      var ch = s.s.split(''), len = s.len, lo = s.lo, i, t;
      var cw = Math.min(56, Math.floor(780 / Math.max(1, len))), cy = 118;
      var x0 = (1000 - len * cw) / 2;
      var fin = (s.ret && s.ret[0] != null) ? s.ret[0] : '';

      kr.html('__t', S.text(500, 28, '字符串反转（递归）：reverse(s) = reverse(s[1:]) + s[0]，基线是空串', 'vt'));
      kr.html('__t2', S.text(500, 52, '原串 “' + s.s + '”　·　当前已得到的结果：“' + fin + '”', 'vs'));

      /* 字符格子 + 当前子串区间 */
      var subLo = (lo >= 0 && lo < len) ? lo : -1;
      if (subLo >= 0) {
        kr.html('__sub', '<rect class="frame dash" x="' + (x0 + subLo * cw + 2) + '" y="' + (cy - 26) +
          '" width="' + ((len - subLo) * cw - 4) + '" height="52" rx="6"/>' +
          S.text(x0 + (subLo + len) * cw / 2, cy - 40, '当前子串 s[' + subLo + '…' + (len - 1) + ']', 'vs'));
      }
      for (i = 0; i < len; i++) {
        var cl;
        if (lo < 0) { cl = 'done'; }
        else if (i < lo) { cl = 'dead'; }
        else if (i === lo) { cl = 'active'; }
        else { cl = 'compare'; }
        kr.g('ch' + i, 'translate(' + (x0 + i * cw + cw / 2) + ',' + cy + ')', 'k',
          '<rect class="cell ' + cl + '" x="' + (-cw / 2 + 3) + '" y="-22" width="' + (cw - 6) + '" height="44" rx="4"/>' +
          S.text(0, 0, ch[i], 'cell-txt') +
          S.text(0, 36, i, 'idx-txt'));
      }
      if (lo >= 0 && lo <= len) {
        var lx = (lo < len) ? (x0 + lo * cw + cw / 2) : (x0 + len * cw + 24);
        kr.g('__lp', 'translate(' + lx + ',' + cy + ')', 'k',
          S.line(0, 56, 0, 30, 'edge hl') + S.text(0, 72, lo < len ? ('lo = ' + lo) : ('lo = ' + len + '（空串）'), 'ptr'));
      }
      kr.g('__ep', 'translate(' + (x0 + len * cw - cw / 2) + ',' + cy + ')', 'k',
        S.line(0, 56, 0, 30, 'edge') + S.text(0, 72, '末尾 ' + (len - 1), 'tag'));
      kr.html('__sp', S.line(60, 186, 940, 186, 'edge dim'));

      /* 调用栈 */
      kr.html('__h1', S.text(250, 208, '调用栈（栈底在下，栈顶在上）', 'vs'));
      var fs = s.frames || [], baseY = 555, pitch = 42;
      for (i = 0; i < fs.length; i++) {
        var f = fs[i], y = baseY - (fs.length - 1 - i) * pitch;
        kr.g('f' + f.lo, 'translate(250,' + y + ')', 'k',
          '<rect class="cell ' + (f.cls || '') + '" x="-112" y="-17" width="224" height="34" rx="5"/>' +
          S.textL(-100, 0, 'reverse(' + f.lo + ')', 'cell-txt') +
          S.text(66, 0, (f.res === null ? '等待返回…' : '“' + f.res + '”'), 'cell-txt'));
      }
      if (fs.length) {
        kr.html('__tt', S.textL(368, baseY - (fs.length - 1) * pitch, '← 栈顶', 'ptr'));
      }

      /* 各层返回值 */
      kr.html('__h2', S.text(770, 208, '各层返回值（回溯时从右往左拼装）', 'vs'));
      for (i = len; i >= 0; i--) {
        var yy = 246 + (len - i) * 38, r = s.ret[i], bx = 682, inner = '';
        kr.html('rl' + i, S.textL(590, yy, 'reverse(' + i + ') =', 'vs'));
        if (r === null) {
          inner = S.textL(bx, yy, '?', 'vs');
        } else if (r === '') {
          inner = '<rect class="frame dash" x="' + bx + '" y="' + (yy - 11) + '" width="36" height="22" rx="4"/>' +
            S.text(bx + 18, yy, '∅', 'vs');
        } else {
          for (t = 0; t < r.length; t++) {
            inner += '<rect class="cell ' + (i === 0 ? 'path' : 'done') + '" x="' + (bx + t * 30) + '" y="' + (yy - 14) +
              '" width="28" height="28" rx="4"/>' + S.text(bx + t * 30 + 14, yy, r[t], 'cell-txt');
          }
        }
        kr.html('rr' + i, inner);
      }

      if (s.msg) { kr.html('__m', S.text(500, 592, s.msg, 'vs')); }
      kr.end();
    }
  });

    /* ============================================================
     3. N 皇后问题（回溯 · 寻找所有摆放方案）
     ============================================================ */
  DSV.register({
    id: 'rec-queens', name: 'N 皇后问题', category: '递归',
    desc: '在 N×N 棋盘上放 N 个皇后，使它们互不攻击（不同行、不同列、不同主/副对角线）。本演示寻找全部摆放方案：逐行放置，isSafe 判断冲突，冲突换列、本行无解剪枝回溯；每放满一行就记录一个解并继续搜索，直到穷尽所有分支。时间复杂度约 O(N!)，空间 O(N)。',
    viewBox: '0 0 1000 860',
    code: [
      'solve(N):',                                            // 0
      '  queens = [-1] * N          // queens[row] = col',     // 1
      '  solutions = []             // 记录所有解',            // 2
      '  place(0)',                                            // 3
      '',                                                      // 4
      'place(row):',                                           // 5
      '  if row == N:               // 放满一行 → 找到一解',    // 6
      '    solutions.append(queens 的副本)',                   // 7
      '    return                   // 记录后继续回溯找其他解', // 8
      '  for col = 0 to N-1:',                                 // 9
      '    if isSafe(row, col):',                              // 10
      '      queens[row] = col      // 放置皇后',               // 11
      '      place(row + 1)',                                  // 12
      '      queens[row] = -1       // 撤销，尝试下一列',       // 13
      '',                                                      // 14
      'isSafe(row, col):',                                     // 15
      '  for r = 0 to row-1:',                                 // 16
      '    c = queens[r]',                                     // 17
      '    if c == col: return false              // 同列冲突',  // 18
      '    if |r-row| == |c-col|: return false    // 对角冲突',  // 19
      '  return true'                                          // 20
    ],
    inputs: [{ key: 'n', label: '棋盘大小 N', def: '6', hint: '4-8（4-6 可完整跑完所有解）' }],
    actions: ACT_RUN,
    samples: [
      { label: '示例：N = 6（完整找到全部 4 解）', values: { n: '6' } },
      { label: '示例：N = 4（最小的有解规模，2 解）', values: { n: '4' } },
      { label: '示例：N = 8（经典八皇后，共 92 解）', values: { n: '8' } }
    ],
    random: function () { return { n: String(DSV.ri(4, 8)) }; },
    run: function (v) {
      var n = parseInt(v.n, 10);
      if (!isFinite(n)) { n = 6; }
      n = Math.max(4, Math.min(8, n));
      var MAXSTEP = 4000;
      var st = [], q = [], i, r, c;
      for (i = 0; i < n; i++) { q.push(-1); }
      var cls = {};                 // 'row,col' -> 状态 class
      var solutions = [];           // 已找到的所有解（列序列数组）

      function reset() {
        cls = {};
        for (r = 0; r < n; r++) { if (q[r] >= 0) { cls[r + ',' + q[r]] = 'done'; } }
      }
      function grid() {
        var g2 = [];
        for (r = 0; r < n; r++) {
          var row = [];
          for (c = 0; c < n; c++) { row.push(cls[r + ',' + c] || ''); }
          g2.push(row);
        }
        return g2;
      }
      function sn(cur, msg, phase, warn) {
        return {
          n: n, q: q.slice(), grid: grid(), cur: cur || null, msg: msg || '',
          phase: phase || '', warn: !!warn,
          solutions: solutions.slice(), total: solutions.length
        };
      }

      push(st, [0, 1, 2, 3], '开始求解 ' + n + ' 皇后（寻找全部摆放方案）：棋盘 ' + n + '×' + n +
        '，queens 全部置 -1，solutions 为空，从第 0 行开始放置',
        sn(null, '初始化：棋盘为空', '初始化'));

      var row = 0, col = 0, exhausted = false, limited = false;
      while (row >= 0 && row < n) {
        if (st.length > MAXSTEP) { limited = true; break; }

        if (col >= n) {
          /* 本行所有列都失败 → 剪枝回溯 */
          for (c = 0; c < n; c++) { cls[row + ',' + c] = 'dead'; }
          push(st, [9], '第 ' + row + ' 行的 ' + n + ' 列全部尝试完毕，本行无解，剪枝：回溯到上一行',
            sn(null, '第 ' + row + ' 行被剪枝（灰色）', '剪枝回溯'));
          row--;
          if (row < 0) { exhausted = true; break; }
          var pc = q[row];
          q[row] = -1;
          reset();
          cls[row + ',' + pc] = 'swap';
          push(st, [13], '回溯：撤销第 ' + row + ' 行第 ' + pc + ' 列的皇后（queens[' + row + '] = -1），从它的下一列 ' +
            (pc + 1) + ' 继续尝试', sn({ r: row, c: pc }, '撤销 (' + row + ',' + pc + ')', '回溯'));
          col = pc + 1;
          continue;
        }

        reset();
        for (r = 0; r < row; r++) { cls[r + ',' + q[r]] = 'compare'; }
        cls[row + ',' + col] = 'active';
        push(st, row === 0 ? [9, 10] : [9, 10, 15, 16, 17],
          '尝试第 ' + row + ' 行第 ' + col + ' 列：调用 isSafe(' + row + ', ' + col + ')，' +
          (row === 0 ? '第 0 行还没有任何皇后，无需比较，必然安全'
            : '与已放置的 ' + row + ' 个皇后（蓝色）逐一比较：是否同列、是否在同一条主对角线或副对角线上'),
          sn({ r: row, c: col }, '尝试 (' + row + ',' + col + ')', '尝试'));

        var bad = -1, why = '';
        for (r = 0; r < row; r++) {
          var qc = q[r];
          if (qc === col) {
            bad = r; why = '第 ' + r + ' 行的皇后也在第 ' + col + ' 列，同列冲突';
            break;
          }
          if (Math.abs(r - row) === Math.abs(qc - col)) {
            bad = r; why = '与第 ' + r + ' 行的皇后在同一条对角线上（行差 ' + Math.abs(r - row) +
              ' = 列差 ' + Math.abs(qc - col) + '）';
            break;
          }
        }

        if (bad >= 0) {
          reset();
          cls[bad + ',' + q[bad]] = 'swap';
          cls[row + ',' + col] = 'swap';
          push(st, [(q[bad] === col) ? 18 : 19], '冲突：' + why + '，第 ' + row + ' 行第 ' + col + ' 列不可用，换下一列 ' + (col + 1),
            sn({ r: row, c: col }, '冲突：' + why, '冲突'));
          col++;
          continue;
        }

        q[row] = col;
        reset();
        cls[row + ',' + col] = 'path';
        var nr = row + 1;
        push(st, [11, 12], (row === 0 ? '第 0 行必然安全，' : '与前面 ' + row + ' 个皇后都不冲突，安全，') +
          '把皇后放在第 ' + row + ' 行第 ' + col + ' 列（queens[' + row + '] = ' + col + '）；' +
          (nr === n ? '所有 ' + n + ' 行都已放好，到达基线 row == N'
            : '接着递归 place(' + nr + ')，从第 0 列重新开始尝试'),
          sn({ r: row, c: col }, '放置 (' + row + ',' + col + ')', '放置'));

        row = nr; col = 0;
        if (row === n) {
          /* 找到一组解：记录并继续搜索，寻找所有摆放 */
          solutions.push(q.slice());
          push(st, [6, 7, 8], '找到第 ' + solutions.length + ' 个解：' + n + ' 个皇后全部放好且互不攻击，列序列为 [' +
            q.join(', ') + ']；记录到 solutions 后回溯，继续寻找其他摆放',
            sn(null, '第 ' + solutions.length + ' 个解', '找到解'));
          var last = n - 1;
          var lc = q[last];
          q[last] = -1;
          reset();
          cls[last + ',' + lc] = 'swap';
          push(st, [13], '回溯：撤销第 ' + last + ' 行第 ' + lc + ' 列的皇后（queens[' + last + '] = -1），从它的下一列 ' +
            (lc + 1) + ' 继续尝试，寻找其余解', sn({ r: last, c: lc }, '撤销 (' + last + ',' + lc + ')', '回溯'));
          row = last; col = lc + 1;
          continue;
        }
      }

      var KNOWN = { 4: 2, 5: 10, 6: 4, 7: 40, 8: 92 };
      if (exhausted) {
        push(st, [], '搜索结束：所有分支都已尝试完毕，共找到 ' + solutions.length + ' 个解（' + n +
          ' 皇后的全部摆放方案）', sn(null, '搜索完成：' + solutions.length + ' 个解', '完成'));
      } else if (limited) {
        push(st, [], '已达到演示步骤上限（' + MAXSTEP + ' 步），提前停止：目前已找到 ' + solutions.length +
          ' 个解；' + n + ' 皇后共有 ' + (KNOWN[n] || '?') + ' 个解，建议把 N 调小（≤ 6）观看完整搜索过程',
          sn(null, '演示达到上限，已找到 ' + solutions.length + ' 个解', '完成', true));
      }
      return st;
    },
    render: function (kr, s) {
      if (!s) {
        kr.html('__t', S.text(500, 300, 'N 皇后问题（寻找全部摆放方案）：设置棋盘大小 N（4-8）后点击「开始演示」', 'vt'));
        kr.end(); return;
      }
      var n = s.n, r, c;
      var cs = Math.min(52, Math.floor(420 / n));
      var bw = cs * n, x0 = (1000 - bw) / 2, y0 = 84;
      var qsize = Math.round(cs * 0.62);
      var placedCnt = 0, i;
      for (i = 0; i < n; i++) { if (s.q[i] >= 0) { placedCnt++; } }
      var sols = s.solutions || [];
      var solN = sols.length;

      kr.html('__t', S.text(500, 26, 'N 皇后问题：N = ' + n + '　·　' + (s.phase || '演示') +
        '　·　已放置 ' + placedCnt + ' 个皇后　·　已找到 ' + solN + ' 个解', 'vt'));
      kr.html('__t2', S.text(500, 50, '金色 = 当前尝试 · 蓝色 = 正在比较 · 红色 = 冲突 · 紫色 = 新放置 · 灰色 = 被剪枝', 'vs'));

      /* 列号 / 行号 */
      var head = '', side = '';
      for (c = 0; c < n; c++) { head += S.text(x0 + c * cs + cs / 2, y0 - 14, c, 'idx-txt'); }
      for (r = 0; r < n; r++) { side += S.text(x0 - 14, y0 + r * cs + cs / 2, r, 'idx-txt'); }
      kr.html('__hd', head);
      kr.html('__sd', side);

      for (r = 0; r < n; r++) {
        for (c = 0; c < n; c++) {
          var cl = (s.grid[r] && s.grid[r][c]) || '';
          var inner = '<rect class="cell ' + cl + '" x="1" y="1" width="' + (cs - 3) + '" height="' + (cs - 3) + '" rx="4"' +
            ((r + c) % 2 === 1 && cl === '' ? ' style="fill:#f3f8f4"' : '') + '/>';
          if (s.q[r] === c) {
            inner += S.text(cs / 2, cs / 2, '♛', '', ' style="font-size:' + qsize + 'px"');
          } else if (s.cur && s.cur.r === r && s.cur.c === c) {
            inner += S.text(cs / 2, cs / 2, '?', 'vs');
          }
          kr.g('g' + r + '_' + c, 'translate(' + (x0 + c * cs) + ',' + (y0 + r * cs) + ')', 'k', inner);
        }
      }

      /* 下方：每行的皇后所在列 */
      kr.html('__qt', S.text(500, 530, 'queens 数组（第 row 行皇后所在的列，紫色 = 已放置）', 'vs'));
      var cw2 = Math.min(46, Math.floor(600 / n)), xb = (1000 - n * cw2) / 2;
      for (r = 0; r < n; r++) {
        var placed = s.q[r] >= 0;
        kr.g('qc' + r, 'translate(' + (xb + r * cw2 + cw2 / 2) + ',562)', 'k',
          '<rect class="cell ' + (placed ? 'path' : '') + '" x="-18" y="-14" width="36" height="28" rx="4"/>' +
          S.text(0, 0, placed ? s.q[r] : '–', 'cell-txt') +
          S.text(0, 24, r, 'idx-txt'));
      }

      /* 解列表：已找到的所有摆放（缩略图，可点击放大） */
      if (solN) {
        kr.html('__st', S.text(500, 622, '已找到的解（' + solN + ' 个）· 点击缩略图可查看大图 · 紫色边框 = 最近找到', 'vs'));
        var g = Math.max(4, Math.min(12, Math.floor(60 / n)));
        var tile = g * n + 4;
        var gap = 10;
        var perRow = Math.max(1, Math.floor(930 / (tile + gap)));
        var ty = 652, tx0 = 35;
        DSV._queensCur = { n: n, solutions: sols };
        for (i = 0; i < sols.length; i++) {
          var sol = sols[i];
          var kx = tx0 + (i % perRow) * (tile + gap);
          var ky = ty + Math.floor(i / perRow) * (tile + 16);
          var inner = '';
          for (var rr = 0; rr < n; rr++) {
            for (var cc = 0; cc < n; cc++) {
              inner += '<rect x="' + (2 + cc * g) + '" y="' + (2 + rr * g) + '" width="' + (g - 1) + '" height="' + (g - 1) + '"' +
                ' fill="' + ((rr + cc) % 2 === 1 ? '#eef5ef' : '#ffffff') + '" stroke="#d7e4da" stroke-width="0.5"/>';
            }
          }
          for (rr = 0; rr < n; rr++) {
            inner += S.text(2 + sol[rr] * g + g / 2, 2 + rr * g + g / 2, '♛', '', ' style="font-size:' + (g * 1.2) + 'px; fill:#8a3f2f"');
          }
          var isCur = (i === sols.length - 1);
          kr.g('sol' + i, 'translate(' + kx + ',' + ky + ')', 'k',
            '<rect class="cell ' + (isCur ? 'path' : '') + '" x="0" y="0" width="' + (tile - 1) + '" height="' + (tile - 1) + '" rx="2"/>' + inner);
          var hit = kr.el('solhit' + i, 'rect', {
            x: kx, y: ky, width: tile, height: tile, fill: 'transparent',
            style: 'cursor:pointer'
          });
          (function (kk) {
            hit.addEventListener('click', function () {
              var cur = DSV._queensCur;
              if (cur && cur.solutions[kk]) { DSV.showQueensSol(cur.n, cur.solutions[kk], kk + 1, cur.solutions.length); }
            });
          })(i);
        }
      } else {
        kr.html('__st', S.text(500, 622, '尚未找到解：继续播放，每次放满一行就会记录一组摆放方案', 'vs'));
      }

      if (s.msg) { kr.html('__m', S.text(500, 838, s.msg, s.warn ? 'vwarn' : 'vs')); }
      kr.end();
    }
  });

  /* 弹窗查看某个解的放大棋盘 */
  DSV.showQueensSol = function (n, q, k, total) {
    var old = document.getElementById('qmodal');
    if (old && old.parentNode) { old.parentNode.removeChild(old); }
    var div = document.createElement('div');
    div.id = 'qmodal';
    div.className = 'qmodal';
    var box = document.createElement('div');
    box.className = 'qmodal-box';

    var title = document.createElement('div');
    title.className = 'qmodal-title';
    title.textContent = '第 ' + k + ' 个解' + (total ? '（共 ' + total + ' 个）' : '') + '　·　列序列 [' + q.join(', ') + ']';

    var cs2 = Math.min(52, Math.floor(440 / n));
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', n * cs2);
    svg.setAttribute('height', n * cs2);
    svg.setAttribute('viewBox', '0 0 ' + (n * cs2) + ' ' + (n * cs2));
    var frag = '';
    var rr, cc;
    for (rr = 0; rr < n; rr++) {
      for (cc = 0; cc < n; cc++) {
        frag += '<rect x="' + (cc * cs2) + '" y="' + (rr * cs2) + '" width="' + cs2 + '" height="' + cs2 + '"' +
          ' fill="' + ((rr + cc) % 2 === 1 ? '#eef5ef' : '#ffffff') + '" stroke="#d7e4da" stroke-width="1"/>';
      }
    }
    for (rr = 0; rr < n; rr++) {
      frag += S.text(q[rr] * cs2 + cs2 / 2, rr * cs2 + cs2 / 2, '♛', '', ' style="font-size:' + Math.round(cs2 * 0.62) + 'px; fill:#8a3f2f"');
    }
    svg.innerHTML = frag;

    var close = document.createElement('button');
    close.className = 'qmodal-close';
    close.type = 'button';
    close.textContent = '关闭';
    close.onclick = function () { if (div.parentNode) { div.parentNode.removeChild(div); } };

    box.appendChild(title); box.appendChild(svg); box.appendChild(close);
    div.appendChild(box);
    div.onclick = function (e) { if (e.target === div && div.parentNode) { div.parentNode.removeChild(div); } };
    document.body.appendChild(div);
  };
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      var m = document.getElementById('qmodal');
      if (m && m.parentNode) { m.parentNode.removeChild(m); }
    }
  });

  /* ============================================================
     4. 汉诺塔（递归）
     ============================================================ */
  DSV.register({
    id: 'rec-hanoi', name: '汉诺塔', category: '递归',
    desc: '把 n 个圆盘从源柱移到目标柱：先把上面 n-1 个借助目标柱移到辅助柱，再把最大的第 n 个圆盘移到目标柱，最后把 n-1 个从辅助柱移到目标柱。共需 2^n - 1 次移动，时间复杂度 O(2^n)，递归深度 O(n)。',
    viewBox: '0 0 1000 720',
    code: [
      'hanoi(n, src, dst, aux):',                          // 0
      '  if n == 1:',                                      // 1
      '    move src -> dst (圆盘 n)',                      // 2
      '    return',                                        // 3
      '  hanoi(n-1, src, aux, dst)   // 先移上面 n-1 个到辅助柱', // 4
      '  move src -> dst (圆盘 n)     // 移最大圆盘',       // 5
      '  hanoi(n-1, aux, dst, src)   // 再把 n-1 个移到目标柱'  // 6
    ],
    inputs: [{ key: 'n', label: '圆盘数 n', def: '3', hint: '2-4' }],
    actions: ACT_RUN,
    samples: [
      { label: '示例：n = 3（经典，7 步）', values: { n: '3' } },
      { label: '示例：n = 4（15 步）', values: { n: '4' } }
    ],
    random: function () { return { n: String(DSV.ri(2, 4)) }; },
    run: function (v) {
      var n = parseInt(v.n, 10);
      if (!isFinite(n) || n < 1) { n = 3; }
      n = Math.max(1, Math.min(4, n));
      var st = [];
      var names = ['A', 'B', 'C'];
      var pegs = [[], [], []];
      var d, i;
      for (d = n; d >= 1; d--) { pegs[0].push(d); }   // 柱 A 自底向上放 n, n-1, ..., 1
      var moves = [];
      var clsMap = {};
      var treeId = 0;

      function buildTree(nn, src, dst, aux) {
        var node = { id: 'h' + (treeId++), n: nn, src: src, dst: dst, aux: aux, left: null, right: null };
        if (nn > 1) {
          node.left = buildTree(nn - 1, src, aux, dst);
          node.right = buildTree(nn - 1, aux, dst, src);
        }
        return node;
      }
      var tree = buildTree(n, 'A', 'C', 'B');

      function pegIdx(name) { return name === 'A' ? 0 : (name === 'B' ? 1 : 2); }
      function snap(activeId, msg) {
        return {
          n: n,
          pegs: pegs.map(function (p) { return p.slice(); }),
          moves: moves.map(function (m) { return { disk: m.disk, from: m.from, to: m.to }; }),
          tree: DSV.clone(tree),
          activeId: activeId,
          clsMap: DSV.clone(clsMap),
          msg: msg || ''
        };
      }

      push(st, [0], '开始：hanoi(' + n + ', A→C, 辅助=B)。初始时 ' + n + ' 个圆盘全部在柱 A，要求移到柱 C，每次只能移动一个圆盘且小盘必须在大盘之上',
        snap(null, '调用 hanoi(' + n + ')'));

      function walk(node) {
        var si = pegIdx(node.src);
        clsMap[node.id] = 'active';
        push(st, [0], '进入 hanoi(' + node.n + ', ' + node.src + '→' + node.dst + ', 辅助=' + node.aux + ')',
          snap(node.id, '调用 hanoi(' + node.n + ')'));

        if (node.left) {
          walk(node.left);
          clsMap[node.id] = 'active';
        }

        var disk = pegs[si].pop();
        pegs[pegIdx(node.dst)].push(disk);
        moves.push({ disk: disk, from: node.src, to: node.dst });
        clsMap[node.id] = 'swap';
        push(st, [node.n === 1 ? 2 : 5],
          '移动圆盘 ' + disk + '：' + node.src + ' → ' + node.dst + '（第 ' + moves.length + ' 次移动，共需 ' + (Math.pow(2, n) - 1) + ' 次）',
          snap(node.id, '移动圆盘 ' + disk + ' ' + node.src + '→' + node.dst));

        if (node.right) { walk(node.right); }

        clsMap[node.id] = 'done';
        push(st, [3, 6], 'hanoi(' + node.n + ', ' + node.src + '→' + node.dst + ') 完成，返回上一层',
          snap(node.id, '返回 hanoi(' + node.n + ')'));
      }
      walk(tree);

      push(st, [], '全部完成：' + n + ' 个圆盘已从柱 A 移到柱 C，共移动 ' + moves.length + ' 次（= 2^' + n + ' - 1）',
        snap(null, '完成'));
      return st;
    },
    render: function (kr, s) {
      if (!s) {
        kr.html('__t', S.text(500, 280, '汉诺塔：输入圆盘数 n（2-4）后点击「开始演示」', 'vt'));
        kr.end(); return;
      }
      kr.html('__t', S.text(500, 24, '汉诺塔：把 n 个圆盘从柱 A 移到柱 C，借助柱 B', 'vt'));
      kr.html('__t2', S.text(500, 48, '金色 = 当前递归调用 · 红色 = 正在移动圆盘 · 绿色 = 已完成该层调用', 'vs'));

      var pegX = [200, 500, 800], baseY = 260, names = ['A', 'B', 'C'];
      var p, i;
      for (p = 0; p < 3; p++) {
        kr.html('peg' + p,
          S.line(pegX[p], 100, pegX[p], baseY, 'edge') +
          S.line(pegX[p] - 56, baseY, pegX[p] + 56, baseY, 'edge') +
          S.text(pegX[p], baseY + 22, '柱 ' + names[p], 'vs'));
        var disks = s.pegs[p] || [];
        for (i = 0; i < disks.length; i++) {
          var d = disks[i];
          var w = 34 + d * 20;
          var y = baseY - (i + 1) * 22;
          kr.g('d' + p + '_' + i, 'translate(' + pegX[p] + ',' + y + ')', 'k',
            '<rect class="cell done" x="' + (-w / 2) + '" y="-10" width="' + w + '" height="20" rx="4"/>' +
            S.text(0, 0, d, 'cell-txt'));
        }
      }

      kr.html('__mc', S.text(500, 310, '已完成移动 ' + s.moves.length + ' / ' + (Math.pow(2, s.n) - 1) + ' 次', 'vs'));
      var last = s.moves[s.moves.length - 1];
      if (last) {
        kr.html('__lm', S.text(500, 334, '最近一次：圆盘 ' + last.disk + ' 从 ' + last.from + ' → ' + last.to, 'ptr'));
      }

      kr.html('__th', S.text(500, 372, '递归调用树（h(n, src→dst, 辅助=aux)）', 'vs'));
      if (s.tree) {
        DSV.drawTree(kr, s.tree, {
          top: 400, dy: 62, dx: 46,
          node: function (nd) {
            var cls = (s.clsMap && s.clsMap[nd.id]) || '';
            return {
              inner: S.circle(0, 0, 20) + S.text(0, -3, 'h(' + nd.n + ')') + S.text(0, 14, nd.src + '→' + nd.dst, 'tag'),
              cls: cls
            };
          },
          edge: function (pa, ch) { return 'tree'; }
        });
      }
      if (s.msg) { kr.html('__m', S.text(500, 700, s.msg, 'vs')); }
      kr.end();
    }
  });

  /* ============================================================
     5. 斐波那契（朴素递归，重复子问题）
     ============================================================ */
  DSV.register({
    id: 'rec-fib', name: '斐波那契（递归）', category: '递归',
    desc: 'fib(n) = fib(n-1) + fib(n-2)，基线 fib(0)=0, fib(1)=1。朴素递归会重复计算大量相同子问题：fib(5) 共触发 15 次调用，而真正不同的子问题只有 6 个。时间复杂度 O(2^n)，空间 O(n)；若加记忆化（memo）可降到 O(n)。',
    viewBox: '0 0 1000 660',
    code: [
      'fib(n):',                                   // 0
      '  if n <= 1: return n      // 基线',       // 1
      '  return fib(n-1) + fib(n-2)'               // 2
    ],
    inputs: [{ key: 'n', label: 'n', def: '5', hint: '2-6' }],
    actions: ACT_RUN,
    samples: [
      { label: '示例：n = 5（fib(5)=5）', values: { n: '5' } },
      { label: '示例：n = 6（重复子问题更多）', values: { n: '6' } }
    ],
    random: function () { return { n: String(DSV.ri(3, 6)) }; },
    run: function (v) {
      var n = parseInt(v.n, 10);
      if (!isFinite(n) || n < 0) { n = 5; }
      n = Math.max(2, Math.min(6, n));
      var st = [], i;
      var memo = []; for (i = 0; i <= n; i++) { memo.push(null); }
      var visits = {};
      var treeId = 0;

      function buildTree(k) {
        var node = { id: 'f' + (treeId++), k: k, left: null, right: null };
        if (k > 1) {
          node.left = buildTree(k - 1);
          node.right = buildTree(k - 2);
        }
        return node;
      }
      var tree = buildTree(n);

      function snap(activeId, clsMap, msg) {
        return {
          n: n,
          tree: DSV.clone(tree),
          activeId: activeId,
          clsMap: DSV.clone(clsMap || {}),
          memo: memo.slice(),
          visits: DSV.clone(visits),
          msg: msg || ''
        };
      }

      push(st, [0], '开始 fib(' + n + ')：朴素递归 fib(n)=fib(n-1)+fib(n-2)。注意观察同一子问题 f(k) 被反复进入的情况（灰色结点）',
        snap(null, {}, '调用 fib(' + n + ')'));

      var clsMap = {};
      function walk(node) {
        var k = node.k;
        visits[k] = (visits[k] || 0) + 1;
        var repeated = visits[k] > 1;
        clsMap[node.id] = 'active';

        if (k <= 1) {
          push(st, [1], '进入 fib(' + k + ')：命中基线条件，fib(' + k + ') = ' + k +
            (repeated ? '（⚠ 这是第 ' + visits[k] + ' 次计算 fib(' + k + ')！朴素递归没有记忆化，重复计算了）' : ''),
            snap(node.id, clsMap, 'fib(' + k + ') = ' + k));
          memo[k] = k;
          clsMap[node.id] = 'done';
          push(st, [1], '写入 memo[' + k + '] = ' + k, snap(node.id, clsMap, ''));
          return k;
        }

        push(st, [0], '进入 fib(' + k + ')' +
          (repeated ? '：⚠ 这是第 ' + visits[k] + ' 次计算 fib(' + k + ')，朴素递归会把整棵子树重算一遍！' : ''),
          snap(node.id, clsMap, '调用 fib(' + k + ')'));

        var a = walk(node.left);
        clsMap[node.id] = 'active';
        var b = walk(node.right);
        clsMap[node.id] = 'active';

        memo[k] = a + b;
        clsMap[node.id] = 'done';
        push(st, [2], '合并结果：fib(' + k + ') = fib(' + (k - 1) + ') + fib(' + (k - 2) + ') = ' + a + ' + ' + b + ' = ' + (a + b),
          snap(node.id, clsMap, 'fib(' + k + ') = ' + (a + b)));
        return a + b;
      }
      var result = walk(tree);

      var totalCalls = 0;
      for (var key in visits) { if (visits.hasOwnProperty(key)) { totalCalls += visits[key]; } }
      var distinct = 0;
      for (var key2 in visits) { if (visits.hasOwnProperty(key2)) { distinct++; } }
      push(st, [], '递归结束：fib(' + n + ') = ' + result + '。共触发 ' + totalCalls + ' 次函数调用，而不同的子问题只有 ' + distinct +
        ' 个——这就是朴素递归 O(2^n) 的根源；如果每个 f(k) 只算一次（记忆化），只要 ' + distinct + ' 次，即 O(n)',
        snap(null, clsMap, '完成'));
      return st;
    },
    render: function (kr, s) {
      if (!s) {
        kr.html('__t', S.text(500, 280, '斐波那契（递归）：输入 n（2-6）后点击「开始演示」', 'vt'));
        kr.end(); return;
      }
      kr.html('__t', S.text(500, 24, '斐波那契朴素递归：f(n) = f(n-1) + f(n-2)，基线 f(0)=0, f(1)=1', 'vt'));
      kr.html('__t2', S.text(500, 48, '金色 = 当前调用 · 灰色 = 重复子问题（第 2 次及以后进入）· 绿色 = 已算出值', 'vs'));

      DSV.drawTree(kr, s.tree, {
        top: 80, dy: 64, dx: 40,
        node: function (nd) {
          var cls = (s.clsMap && s.clsMap[nd.id]) || '';
          if (cls === '' && s.visits && s.visits[nd.k] > 1) { cls = 'dead'; }
          var v = s.memo[nd.k];
          return {
            inner: S.circle(0, 0, 19) + S.text(0, -3, 'f(' + nd.k + ')') + S.text(0, 14, v == null ? '?' : String(v), 'tag'),
            cls: cls
          };
        },
        edge: function (pa, ch) { return 'tree'; }
      });

      var y0 = 500;
      kr.html('__mh', S.text(500, y0 - 22, '记忆化表 memo（若加记忆化，每个子问题只算一次，O(n)）', 'vs'));
      var cw = 58, x0 = (1000 - (s.n + 1) * cw) / 2;
      for (var i = 0; i <= s.n; i++) {
        var v = s.memo[i];
        kr.g('m' + i, 'translate(' + (x0 + i * cw + cw / 2) + ',' + y0 + ')', 'k',
          '<rect class="cell ' + (v == null ? '' : 'done') + '" x="' + (-cw / 2 + 2) + '" y="-16" width="' + (cw - 4) + '" height="32" rx="4"/>' +
          S.text(0, 0, v == null ? '?' : v, 'cell-txt') +
          S.text(0, 26, 'f(' + i + ')', 'idx-txt'));
      }
      if (s.msg) { kr.html('__m', S.text(500, 600, s.msg, 'vs')); }
      kr.end();
    }
  });

})();
