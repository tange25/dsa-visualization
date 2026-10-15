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

})();
