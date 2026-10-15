/* ============================================================
   viz-strings.js —— 字符串算法章节（5 个算法）
   Boyer-Moore 字符串匹配 / KMP 字符串匹配 / 字典树 Trie /
   压缩字典树（Radix Tree） / 哈夫曼编码
   ============================================================ */
(function () {
  'use strict';
  var DSV = window.DSV, S = DSV.svg;

  /* ---------------- 通用工具 ---------------- */
  function push(steps, code, desc, snap) { steps.push({ code: code, desc: desc, snap: snap }); }
  function rep(n, v) { var a = []; for (var i = 0; i < n; i++) { a.push(v == null ? '' : v); } return a; }

  /** 一行字符格子：文本串 / 模式串（每个字符一格，下方显示下标） */
  function drawChars(kr, key, chars, y, opt) {
    opt = opt || {};
    var n = chars.length;
    var cw = opt.cw || Math.min(46, Math.floor((1000 - 80) / Math.max(1, n)));
    var x0 = opt.x0 == null ? (1000 - n * cw) / 2 : opt.x0;
    if (opt.label) { kr.html(key + '_lab', S.text(500, opt.labelY == null ? (y - 36) : opt.labelY, opt.label, 'vs')); }
    for (var i = 0; i < n; i++) {
      var cx = x0 + i * cw + cw / 2;
      kr.g(key + '_' + i, 'translate(' + cx + ',' + y + ')', 'k',
        '<rect class="cell ' + ((opt.cls && opt.cls[i]) || '') + '" x="' + (-cw / 2 + 3) + '" y="-22" width="' + (cw - 6) + '" height="44" rx="4"/>' +
        S.text(0, 0, chars[i], 'cell-txt') + S.text(0, 34, i, 'idx-txt'));
    }
    return { x0: x0, cw: cw };
  }

  /** 一行小格子：上为主值，下为注释（用于位移表 / lps / 队列 / 编码表） */
  function drawRow(kr, key, label, items, y, opt) {
    opt = opt || {};
    var cw = opt.cw || 54, gap = opt.gap || 6, n = items.length;
    var total = n * cw + (n - 1) * gap, x0 = (1000 - total) / 2;
    if (label) { kr.html(key + '_lab', S.text(500, y - 30, label, 'vs')); }
    for (var i = 0; i < n; i++) {
      var it = items[i] || {}, cx = x0 + i * (cw + gap) + cw / 2;
      kr.g(key + '_' + i, 'translate(' + cx + ',' + y + ')', 'k',
        '<rect class="cell ' + (it.cls || '') + '" x="' + (-cw / 2) + '" y="-18" width="' + cw + '" height="36" rx="4"/>' +
        S.text(0, -5, it.top == null ? '' : it.top, 'cell-txt') +
        S.text(0, 12, it.sub == null ? '' : it.sub, 'idx-txt'));
    }
    return { x0: x0, cw: cw, gap: gap };
  }

  /** 指针标签 */
  function ptr(kr, key, x, y, txt, red) {
    kr.g(key, 'translate(' + x + ',' + y + ')', 'k', S.text(0, 0, txt, 'ptr' + (red ? ' ptr-t' : '')));
  }

  /** 虚线框（当前对齐位置） */
  function frame(kr, key, x, y, w, h) {
    kr.html(key, '<rect class="frame dash" x="' + x + '" y="' + y + '" width="' + Math.max(0, w) + '" height="' + Math.max(0, h) + '" rx="6"/>');
  }

  /** 字符串过长时截断显示 */
  function cut(s, n) { s = String(s == null ? '' : s); return s.length > n ? s.slice(0, n) + '…' : s; }

  /* ============================================================
     多叉树布局（字典树 / 压缩字典树共用）
     按层从左到右排开，同层叶子等距，父结点居于孩子中间
     ============================================================ */
  function depthOf(root, kidsOf) {
    var d = 0;
    (function w(n, k) {
      if (k > d) { d = k; }
      var ks = kidsOf(n);
      for (var i = 0; i < ks.length; i++) { w(ks[i], k + 1); }
    })(root, 0);
    return d;
  }

  function layoutNary(root, kidsOf, opt) {
    opt = opt || {};
    var W = opt.W || 1000, top = opt.top || 96, dy = opt.dy || 66, sp = opt.sp || 112;
    var slot = {}, dep = {}, cursor = 0;
    (function walk(n, d) {
      dep[n.id] = d;
      var ks = kidsOf(n);
      if (!ks.length) { slot[n.id] = cursor; cursor++; return; }
      for (var i = 0; i < ks.length; i++) { walk(ks[i], d + 1); }
      slot[n.id] = (slot[ks[0].id] + slot[ks[ks.length - 1].id]) / 2;
    })(root, 0);
    var span = Math.max(1, cursor - 1);
    var step = Math.min(sp, (W - 100) / span);
    var pos = {};
    for (var id in slot) {
      if (!Object.prototype.hasOwnProperty.call(slot, id)) { continue; }
      pos[id] = { x: W / 2 + (slot[id] - span / 2) * step, y: top + dep[id] * dy };
    }
    return pos;
  }

  /** 边上的小标签框（压缩字典树用） */
  function edgeBox(txt, cls) {
    var w = Math.max(24, 14 + 11 * String(txt).length);
    return '<rect class="cell ' + (cls || '') + '" x="' + (-w / 2) + '" y="-12" width="' + w + '" height="24" rx="4"/>' +
      S.text(0, 0, txt, 'cell-txt');
  }

  /* ============================================================
     1. Boyer-Moore 字符串匹配（坏字符规则）
     ============================================================ */
  DSV.register({
    id: 'boyer-moore', name: 'Boyer-Moore 字符串匹配', category: '字符串算法',
    desc: '从右往左比较模式串，失配时利用「坏字符规则」一次性右移多格：坏字符 c 在 P 中最后出现位置为 k，则右移 max(1, j-k)。预处理 O(m+|Σ|)，匹配平均 O(n/m)，最坏 O(n·m)。',
    viewBox: '0 0 1000 560',
    code: [
      'boyerMoore(T, P):',
      '  n = T.length; m = P.length',
      '  last[c] = c 在 P 中最后出现的下标；不在 P 中记 -1',
      '  s = 0                              // P 相对 T 的偏移量',
      '  while s <= n - m:',
      '    j = m - 1                        // 从右往左比较',
      '    while j >= 0 and P[j] == T[s+j]: j--',
      '    if j < 0:',
      '      报告匹配位置 s; s = s + 1',
      '    else:                            // 失配',
      '      c = T[s+j]                     // 坏字符',
      '      k = last[c]',
      '      s = s + max(1, j - k)          // 坏字符规则右移',
      '  return 所有匹配位置'
    ],
    inputs: [
      { key: 'text', label: '文本串 T', def: 'ABABDABACDABABC', hint: '长度不超过 40' },
      { key: 'pat', label: '模式串 P', def: 'ABABC', hint: '长度不超过 12' }
    ],
    actions: [{ key: 'run', label: '开始匹配', primary: true }],
    samples: [
      { label: '示例：经典样例', values: { text: 'ABABDABACDABABC', pat: 'ABABC' } },
      { label: '示例：坏字符不在 P 中', values: { text: 'BBCABCDABABCDABCDABDE', pat: 'ABCDABD' } },
      { label: '示例：多次匹配', values: { text: 'AAABAAABAAAB', pat: 'AAAB' } }
    ],
    random: function () {
      var A = 'ABCD', n = DSV.ri(18, 26), t = '';
      for (var i = 0; i < n; i++) { t += A.charAt(DSV.ri(0, A.length - 1)); }
      var k = DSV.ri(4, Math.max(4, n - 6)), m = DSV.ri(3, 5);
      return { text: t, pat: t.substr(k, m) };
    },
    run: function (v) {
      var T = String(v.text == null ? '' : v.text).replace(/\s+/g, '').slice(0, 40);
      var P = String(v.pat == null ? '' : v.pat).replace(/\s+/g, '').slice(0, 12);
      var n = T.length, m = P.length;
      if (!n || !m) {
        return [{ code: [0], desc: '输入无效：文本串与模式串都必须非空（且模式串不能比文本串长）。',
          snap: { msg: '请输入非空的文本串 T 与模式串 P（T 长度 ≤ 40，P 长度 ≤ 12）。', warn: true } }];
      }
      if (m > n) {
        return [{ code: [0], desc: '输入无效：模式串长度 ' + m + ' 大于文本串长度 ' + n + '，不可能匹配。',
          snap: { msg: '模式串比文本串长，无法匹配，请重新输入。', warn: true } }];
      }

      var st = [], last = {}, order = [], j, i;
      var tcls = rep(n), pcls = rep(m), matches = [], s = 0;

      function sn(o) {
        o = o || {};
        return {
          text: T, pat: P, s: s, j: o.j == null ? -1 : o.j,
          tcls: tcls.slice(), pcls: pcls.slice(),
          last: DSV.clone(last), order: order.slice(), hc: o.hc || '',
          matches: matches.slice(), info: o.info || '', msg: o.msg || '', found: !!o.found
        };
      }
      function reset() { tcls = rep(n); pcls = rep(m); }

      push(st, [0, 1], '开始 Boyer-Moore 匹配：文本串 T 长度 n = ' + n + '，模式串 P 长度 m = ' + m + '。',
        sn({ info: '第一步先构造坏字符位移表', msg: '初始化' }));

      /* --- 构造坏字符表 --- */
      for (j = 0; j < m; j++) {
        if (order.indexOf(P.charAt(j)) < 0) { order.push(P.charAt(j)); }
      }
      order.sort();
      push(st, [2], '构造坏字符表：先把 P 中出现过的字符列出来，初始时 last 全部记为 -1（表示不在 P 中）。',
        sn({ info: 'P 中的字符：' + order.join(' '), msg: '构造坏字符表' }));
      for (j = 0; j < m; j++) {
        var c = P.charAt(j);
        var old = last[c] == null ? -1 : last[c];
        last[c] = j;
        push(st, [2], '扫描 P[' + j + '] = “' + c + '”，更新 last[“' + c + '”] = ' + j +
          (old >= 0 ? '（覆盖原来的 ' + old + '，因为要取最后出现的位置）' : '（首次出现）'),
          sn({ hc: c, info: 'last[“' + c + '”] = ' + j, msg: '构造坏字符表：扫描 P[' + j + ']' }));
      }
      var tabTxt = order.map(function (c2) { return c2 + '→' + last[c2]; }).join('，');
      push(st, [2], '坏字符表构造完成：' + tabTxt + '。不在表中的字符一律记 -1。',
        sn({ info: '坏字符表：' + tabTxt, msg: '坏字符表完成，开始匹配' }));

      /* --- 匹配 --- */
      var guard = 0;
      while (s <= n - m && guard++ < 120) {
        reset();
        for (i = 0; i < m; i++) { pcls[i] = 'dim'; }
        for (i = s; i < s + m; i++) { tcls[i] = 'dim'; }
        push(st, [4], '检查循环条件：剩余长度 n - s = ' + (n - s) + ' ≥ m = ' + m + '，还可以把 P 放进窗口 T[' + s + '…' + (s + m - 1) + ']。',
          sn({ j: m - 1, info: 's = ' + s + '，剩余 ' + (n - s) + ' 个字符', msg: '窗口 T[' + s + '…' + (s + m - 1) + ']' }));
        push(st, [5], '对齐：s = ' + s + '，令 j = m-1 = ' + (m - 1) + '，从 P 的最右端开始往左比较。',
          sn({ j: m - 1, info: 's = ' + s + '，j = ' + (m - 1) + '，i = s + j = ' + (s + m - 1), msg: '对齐 s = ' + s }));

        j = m - 1;
        while (j >= 0 && P.charAt(j) === T.charAt(s + j)) {
          tcls[s + j] = 'compare'; pcls[j] = 'compare';
          push(st, [6], '比较 P[' + j + ']=“' + P.charAt(j) + '” 与 T[' + (s + j) + ']=“' + T.charAt(s + j) + '”：相同。',
            sn({ j: j, info: 's = ' + s + '，j = ' + j + '，i = s + j = ' + (s + j), msg: '第 ' + (matches.length + 1) + ' 次对齐' }));
          tcls[s + j] = 'done'; pcls[j] = 'done';
          j--;
          push(st, [6], '这一位匹配成功，j 减 1 → ' + j + (j >= 0 ? '，继续比较左边一位。' : '，j < 0 说明 P 的每一位都匹配上了。'),
            sn({ j: j, info: 'j = ' + j, msg: '第 ' + (matches.length + 1) + ' 次对齐' }));
        }

        if (j < 0) {
          matches.push(s);
          for (i = 0; i < m; i++) { tcls[s + i] = 'done'; pcls[i] = 'done'; }
          push(st, [7, 8], 'j < 0：P 的 ' + m + ' 个字符全部匹配成功！在位置 ' + s + ' 找到一次匹配。',
            sn({ j: -1, found: true, info: '匹配位置 s = ' + s, msg: '找到匹配：位置 ' + s }));
          s = s + 1;
          push(st, [8], '为了找出所有匹配，s 只右移 1 位变为 ' + s + '，继续下一轮对齐。',
            sn({ j: -1, info: 's = ' + s, msg: '继续搜索' }));
        } else {
          var bad = T.charAt(s + j);
          tcls[s + j] = 'swap'; pcls[j] = 'swap';
          push(st, [6], '比较 P[' + j + ']=“' + P.charAt(j) + '” 与 T[' + (s + j) + ']=“' + bad + '”：不匹配，坏字符 c = “' + bad + '”。',
            sn({ j: j, info: 's = ' + s + '，j = ' + j + '，i = s + j = ' + (s + j) + '，坏字符 c = “' + bad + '”', msg: '失配：坏字符 “' + bad + '”' }));
          var k = last[bad] == null ? -1 : last[bad];
          push(st, [10, 11], '查坏字符表：字符 “' + bad + '” 在 P 中最后出现的位置 k = ' + k +
            (k < 0 ? '（它根本不在 P 里，记 -1）' : '（即 P[' + k + ']）') + '。',
            sn({ j: j, hc: bad, info: 'k = last[“' + bad + '”] = ' + k, msg: '查表：k = ' + k }));
          var sh = Math.max(1, j - k);
          push(st, [12], '按坏字符规则计算位移：max(1, j - k) = max(1, ' + j + ' - ' + k + ') = ' + sh +
            (sh === 1 ? '（取 1 是为了保证模式串至少右移一格，不会原地打转）' : '') + '。',
            sn({ j: j, hc: bad, info: '位移 ' + sh + ' 格', msg: '应右移 ' + sh + ' 格' }));
          push(st, [12], '把 P 右移 ' + sh + ' 格：s = ' + s + ' → ' + (s + sh) + '，中间那些对齐位置可以安全跳过。',
            sn({ j: j, hc: bad, info: '右移 ' + sh + ' 格：s = ' + s + ' → ' + (s + sh), msg: '右移 ' + sh + ' 格' }));
          s = s + sh;
        }
      }
      reset();
      push(st, [13], '搜索结束（s > n - m）：' + (matches.length
        ? '共找到 ' + matches.length + ' 次匹配，起始位置为 ' + matches.join('、') + '。'
        : '文本串中没有出现模式串。'),
        sn({ info: '匹配结束', msg: matches.length ? '完成：共 ' + matches.length + ' 次匹配' : '完成：未找到匹配' }));
      return st;
    },
    render: function (kr, s) {
      if (!s || !s.text) {
        kr.html('__t', S.text(500, 250, (s && s.msg) || 'Boyer-Moore 字符串匹配：输入文本串与模式串后点击「开始匹配」', s && s.warn ? 'vwarn' : 'vs'));
        kr.end(); return;
      }
      kr.html('__t', S.text(500, 26, 'Boyer-Moore 坏字符规则', 'vt'));
      kr.html('__t2', S.text(500, 50, 'T = ' + cut(s.text, 40) + '    P = ' + cut(s.pat, 14), 'vs'));

      var T = s.text.split(''), P = s.pat.split(''), n = T.length, m = P.length;
      var cw = Math.min(46, Math.floor((1000 - 80) / Math.max(1, n)));
      var x0 = (1000 - n * cw) / 2;
      var ty = 120, py = 232;

      drawChars(kr, 'T', T, ty, { cw: cw, x0: x0, cls: s.tcls, label: '文本串 T（格子下方为下标 i）', labelY: 84 });
      frame(kr, '__f', x0 + s.s * cw - 3, ty - 26, m * cw + 6, 52);
      drawChars(kr, 'P', P, py, { cw: cw, x0: x0 + s.s * cw, cls: s.pcls, label: '模式串 P（格子下方为下标 j，对齐量 s = ' + s.s + '）', labelY: 196 });

      if (s.j >= 0 && s.j < m) { ptr(kr, '__pj', x0 + s.s * cw + s.j * cw + cw / 2, py + 56, 'j', true); }
      if (s.j >= 0 && s.s + s.j < n) { ptr(kr, '__pi', x0 + (s.s + s.j) * cw + cw / 2, ty + 54, 'i'); }

      /* 坏字符位移表 */
      var chs = s.order.slice();
      if (s.hc && chs.indexOf(s.hc) < 0) { chs.push(s.hc); }
      var items = chs.map(function (c) {
        var v = (s.last && s.last[c] != null) ? s.last[c] : -1;
        return { top: c, sub: v, cls: c === s.hc ? 'active' : (s.found ? 'done' : '') };
      });
      drawRow(kr, 'TB', '坏字符位移表 last[c]：c 在 P 中最后出现的下标（格子上排为字符，下排为下标；不在 P 中记 -1）',
        items, 364, { cw: 52 });

      if (s.info) { kr.html('__i', S.text(500, 425, s.info, 'vs')); }
      kr.html('__m', S.text(500, 458,
        s.msg + (s.matches && s.matches.length ? '（已找到位置：' + s.matches.join('、') + '）' : ''),
        s.found ? 'ptr' : 'vs'));
      kr.end();
    }
  });

  /* ============================================================
     2. KMP 字符串匹配
     ============================================================ */
  DSV.register({
    id: 'kmp', name: 'KMP 字符串匹配', category: '字符串算法',
    desc: '先构造模式串的 lps（最长相等前后缀）数组，失配时利用已有信息只回退模式指针 j = lps[j-1]，文本指针 i 永不回退。预处理 O(m)，匹配 O(n+m)。',
    viewBox: '0 0 1000 560',
    code: [
      'buildLps(P):                        // 最长相等前后缀数组',
      '  lps[0] = 0; len = 0; i = 1',
      '  while i < m:',
      '    if P[i] == P[len]:',
      '      len++; lps[i] = len; i++',
      '    else if len > 0:',
      '      len = lps[len-1]              // 回退 len，i 不动',
      '    else:',
      '      lps[i] = 0; i++',
      '  return lps',
      '',
      'kmp(T, P):',
      '  lps = buildLps(P)',
      '  i = 0; j = 0                      // i 指向文本，j 指向模式',
      '  while i < n:',
      '    if T[i] == P[j]:',
      '      i++; j++                      // 匹配，双双前进',
      '      if j == m: 报告匹配位置 i-m; j = lps[j-1]',
      '    else:                           // 失配',
      '      if j > 0: j = lps[j-1]        // 只回退 j，i 绝不回退',
      '      else: i++                     // j 已为 0，只能推进 i',
      '  return 所有匹配位置'
    ],
    inputs: [
      { key: 'text', label: '文本串 T', def: 'ABABDABACDABABC', hint: '长度不超过 40' },
      { key: 'pat', label: '模式串 P', def: 'ABABC', hint: '长度不超过 12' }
    ],
    actions: [{ key: 'run', label: '开始匹配', primary: true }],
    samples: [
      { label: '示例：经典样例', values: { text: 'ABABDABACDABABC', pat: 'ABABC' } },
      { label: '示例：大量回退', values: { text: 'AAAAABAAABA', pat: 'AAAA' } },
      { label: '示例：前缀复用', values: { text: 'ABCABCABD', pat: 'ABCABD' } }
    ],
    random: function () {
      var A = 'AB', n = DSV.ri(16, 24), t = '';
      for (var i = 0; i < n; i++) { t += A.charAt(DSV.ri(0, 1)); }
      var k = DSV.ri(3, Math.max(3, n - 6)), m = DSV.ri(4, 6);
      return { text: t, pat: t.substr(k, m) };
    },
    run: function (v) {
      var T = String(v.text == null ? '' : v.text).replace(/\s+/g, '').slice(0, 40);
      var P = String(v.pat == null ? '' : v.pat).replace(/\s+/g, '').slice(0, 12);
      var n = T.length, m = P.length;
      if (!n || !m) {
        return [{ code: [0], desc: '输入无效：文本串与模式串都必须非空。',
          snap: { msg: '请输入非空的文本串 T 与模式串 P（T 长度 ≤ 40，P 长度 ≤ 12）。', warn: true } }];
      }
      if (m > n) {
        return [{ code: [0], desc: '输入无效：模式串长度 ' + m + ' 大于文本串长度 ' + n + '，不可能匹配。',
          snap: { msg: '模式串比文本串长，无法匹配，请重新输入。', warn: true } }];
      }

      var st = [], lps = [], i, k;
      for (k = 0; k < m; k++) { lps.push(-1); }

      /* ---------- 第一阶段：构造 lps ---------- */
      function snLps(o) {
        o = o || {};
        return {
          phase: 'lps', text: T, pat: P, lps: lps.slice(), i: o.i == null ? -1 : o.i,
          len: o.len == null ? -1 : o.len, pcls: (o.pcls || rep(m)).slice(),
          matches: [], info: o.info || '', msg: o.msg || ''
        };
      }
      function lpsCls(ii, ll, a, b) {
        var c = rep(m);
        if (ii >= 0 && ii < m) { c[ii] = a || 'active'; }
        if (ll >= 0 && ll < m) { c[ll] = b || 'compare'; }
        return c;
      }

      lps[0] = 0;
      push(st, [0, 1], '构造 lps 数组：lps[0] = 0（单个字符没有真前缀与真后缀），len = 0（当前已匹配的前缀长度），i = 1。',
        snLps({ i: 1, len: 0, pcls: lpsCls(1, 0), info: 'lps[0] = 0，len = 0，i = 1', msg: '第一阶段：构造 lps 数组' }));

      var len = 0;
      i = 1;
      var g1 = 0;
      while (i < m && g1++ < 60) {
        push(st, [3], '比较 P[' + i + ']=“' + P.charAt(i) + '” 与 P[' + len + ']=“' + P.charAt(len) + '”：' +
          (P.charAt(i) === P.charAt(len) ? '相等' : '不相等') + '。',
          snLps({ i: i, len: len, pcls: lpsCls(i, len, 'compare', 'compare'), info: 'i = ' + i + '，len = ' + len, msg: '构造 lps[' + i + ']' }));
        if (P.charAt(i) === P.charAt(len)) {
          len++; lps[i] = len;
          push(st, [4], '相等：已匹配前缀长度 len 加 1 变为 ' + len + '，于是 lps[' + i + '] = ' + len + '，i 前进到 ' + (i + 1) + '。',
            snLps({ i: i, len: len - 1, pcls: lpsCls(i, len - 1), info: 'lps[' + i + '] = ' + len, msg: 'lps[' + i + '] = ' + len }));
          i++;
        } else if (len > 0) {
          var nl = lps[len - 1];
          push(st, [6], '不等且 len > 0：不能轻易放弃，把 len 回退到 lps[' + (len - 1) + '] = ' + nl + '（i 保持 ' + i + ' 不动）。',
            snLps({ i: i, len: len, pcls: lpsCls(i, len, 'active', 'swap'), info: 'len 回退：' + len + ' → ' + nl, msg: '回退 len = ' + nl }));
          len = nl;
        } else {
          lps[i] = 0;
          push(st, [8], '不等且 len == 0：前缀已经无法再缩短，lps[' + i + '] = 0，i 前进到 ' + (i + 1) + '。',
            snLps({ i: i, len: 0, pcls: lpsCls(i, -1), info: 'lps[' + i + '] = 0', msg: 'lps[' + i + '] = 0' }));
          i++;
        }
      }
      push(st, [9], 'lps 数组构造完成：[' + lps.join(', ') + ']。lps[j] 表示 P[0..j] 中最长的相等真前缀与真后缀长度。',
        snLps({ i: -1, len: -1, pcls: rep(m), info: 'lps = [' + lps.join(', ') + ']', msg: 'lps 构造完成，开始匹配' }));

      /* ---------- 第二阶段：匹配 ---------- */
      var matches = [], gi = 0, gj = 0;
      function snM(o) {
        o = o || {};
        var tcls = rep(n), pcls = rep(m), al = Math.max(0, gi - Math.min(gj, m));
        for (var q = 0; q < Math.min(gj, m); q++) {
          pcls[q] = 'done';
          if (al + q < n) { tcls[al + q] = 'done'; }
        }
        if (o.found && al + m <= n) {
          for (var q2 = 0; q2 < m; q2++) { tcls[al + q2] = 'done'; pcls[q2] = 'done'; }
        }
        if (gi < n && o.tc) { tcls[gi] = o.tc; }
        if (gj < m && o.pc) { pcls[gj] = o.pc; }
        return {
          phase: 'match', text: T, pat: P, lps: lps.slice(), i: gi, j: gj,
          tcls: tcls, pcls: pcls, matches: matches.slice(),
          info: o.info || '', msg: o.msg || '', found: !!o.found
        };
      }

      push(st, [11, 12, 13], '开始匹配：i = 0（文本指针），j = 0（模式指针）。i 只增不减，这是 KMP 的核心。',
        snM({ tc: 'active', pc: 'active', info: 'i = 0，j = 0', msg: '第二阶段：用 lps 做匹配' }));

      var g2 = 0;
      while (gi < n && g2++ < 200) {
        var same = (gj < m) && (T.charAt(gi) === P.charAt(gj));
        push(st, [15], '比较 T[' + gi + ']=“' + T.charAt(gi) + '” 与 P[' + gj + ']=“' + (gj < m ? P.charAt(gj) : '—') + '”：' +
          (gj >= m ? 'j 已达 m，先处理上一次的完整匹配' : (same ? '相等' : '不相等')) + '。',
          snM({ tc: 'compare', pc: 'compare', info: 'i = ' + gi + '，j = ' + gj, msg: '比较 T[' + gi + '] 与 P[' + gj + ']' }));
        if (same) {
          gi++; gj++;
          push(st, [16], '相等：i 前进到 ' + gi + '，j 前进到 ' + gj + '（两个指针一起右移）。',
            snM({ tc: 'active', pc: 'active', info: 'i = ' + gi + '，j = ' + gj, msg: '匹配成功一位' }));
          if (gj === m) {
            matches.push(gi - m);
            push(st, [17], 'j == m：模式串全部匹配！在位置 ' + (gi - m) + ' 找到一次匹配。',
              snM({ found: true, info: '匹配位置 ' + (gi - m), msg: '找到匹配：位置 ' + (gi - m) }));
            var nj = lps[m - 1];
            push(st, [17], '继续搜索：令 j = lps[' + (m - 1) + '] = ' + nj + '，而 i = ' + gi + ' 保持不变 —— 文本指针 i 绝不回退，这就是 KMP 高效的关键。',
              snM({ info: 'j = ' + nj + '，i = ' + gi + ' 不变', msg: 'j 回退为 ' + nj + '，i 不动' }));
            gj = nj;
          }
        } else {
          if (gj > 0) {
            var nj2 = lps[gj - 1];
            push(st, [19], '失配且 j > 0：P[0..' + (gj - 1) + '] 已经和文本匹配过，其中长度为 ' + nj2 +
              ' 的前缀可以直接复用，所以只把 j 回退到 lps[' + (gj - 1) + '] = ' + nj2 + '，i = ' + gi + ' 保持不动。',
              snM({ tc: 'swap', pc: 'swap', info: 'j：' + gj + ' → ' + nj2 + '，i = ' + gi + ' 不动', msg: '只回退 j = ' + nj2 }));
            gj = nj2;
          } else {
            gi++;
            push(st, [20], '失配且 j == 0：模式串已无法再回退，只能把文本指针 i 推进到 ' + gi + '。',
              snM({ tc: 'swap', pc: 'active', info: 'i = ' + gi, msg: '推进 i = ' + gi }));
          }
        }
      }
      push(st, [21], '匹配结束：' + (matches.length
        ? '共找到 ' + matches.length + ' 次匹配，起始位置为 ' + matches.join('、') + '，总共只扫描了文本串一遍。'
        : '文本串中没有出现模式串。'),
        snM({ info: '匹配结束', msg: matches.length ? '完成：共 ' + matches.length + ' 次匹配' : '完成：未找到匹配' }));
      return st;
    },
    render: function (kr, s) {
      if (!s || !s.text) {
        kr.html('__t', S.text(500, 250, (s && s.msg) || 'KMP 字符串匹配：输入文本串与模式串后点击「开始匹配」', s && s.warn ? 'vwarn' : 'vs'));
        kr.end(); return;
      }
      kr.html('__t', S.text(500, 26, 'KMP 字符串匹配（lps = 最长相等前后缀）', 'vt'));
      kr.html('__t2', S.text(500, 50, 'T = ' + cut(s.text, 40) + '    P = ' + cut(s.pat, 14), 'vs'));

      var n = s.text.length, m = s.pat.length;
      var cw = Math.min(46, Math.floor((1000 - 80) / Math.max(1, n)));
      var x0 = (1000 - n * cw) / 2;
      var ty = 120, py = 232;

      if (s.phase === 'lps') {
        var cw2 = Math.min(56, Math.max(34, Math.floor((1000 - 80) / Math.max(1, m))));
        var x02 = (1000 - m * cw2) / 2;
        drawChars(kr, 'P', s.pat.split(''), ty, { cw: cw2, x0: x02, cls: s.pcls, label: '模式串 P（自身与自身比对，求最长相等前后缀）', labelY: 84 });
        if (s.i >= 0 && s.i < m) { ptr(kr, '__pi', x02 + s.i * cw2 + cw2 / 2, ty + 54, 'i', true); }
        if (s.len >= 0 && s.len < m) { ptr(kr, '__pl', x02 + s.len * cw2 + cw2 / 2, ty + 76, 'len'); }
      } else {
        var al = Math.max(0, s.i - Math.min(s.j, m));
        drawChars(kr, 'T', s.text.split(''), ty, { cw: cw, x0: x0, cls: s.tcls, label: '文本串 T（格子下方为下标，i 只增不减）', labelY: 84 });
        frame(kr, '__f', x0 + al * cw - 3, ty - 26, Math.min(m, n - al) * cw + 6, 52);
        drawChars(kr, 'P', s.pat.split(''), py, { cw: cw, x0: x0 + al * cw, cls: s.pcls, label: '模式串 P（对齐量 i - j = ' + al + '）', labelY: 196 });
        if (s.i < n) { ptr(kr, '__pi', x0 + s.i * cw + cw / 2, ty + 54, 'i'); }
        if (s.j < m) { ptr(kr, '__pj', x0 + al * cw + s.j * cw + cw / 2, py + 56, 'j', true); }
      }

      var lit = s.lps.map(function (v, idx) {
        var hl = (s.phase === 'lps') ? (idx === s.i ? 'active' : 'done') : (idx === s.j ? 'active' : (idx < (s.j || 0) ? 'done' : ''));
        return { top: v < 0 ? '·' : v, sub: idx, cls: hl };
      });
      drawRow(kr, 'LP', 'lps 数组（上排为最长相等前后缀长度，下排为下标；当前 j 高亮）', lit, 364, { cw: 46 });

      if (s.info) { kr.html('__i', S.text(500, 425, s.info, 'vs')); }
      kr.html('__m', S.text(500, 458,
        s.msg + (s.matches && s.matches.length ? '（已找到位置：' + s.matches.join('、') + '）' : ''),
        s.found ? 'ptr' : 'vs'));
      kr.end();
    }
  });

  /* ============================================================
     3. 字典树 Trie
     ============================================================ */
  function mkTNode(id, ch) { return { id: id, ch: ch, end: false, word: '', kids: {} }; }

  DSV.register({
    id: 'trie', name: '字典树（Trie）', category: '字符串算法',
    desc: '多叉树结构：每条边代表一个字符，从根到某个结点的路径即为一个前缀，单词结尾结点打标记。插入 / 查找 / 前缀查询均为 O(L)（L 为单词长度），空间换时间，适合前缀匹配与自动补全。',
    viewBox: '0 0 1000 660',
    code: [
      'insert(w):',
      '  node = root; i = 0',
      '  for 每个字符 c in w:',
      '    if node 有字符 c 对应的子结点:',
      '      node = 该子结点                 // 沿已有边下行',
      '    else:',
      '      新建子结点 c，挂在 node 下      // 开辟新分支',
      '      node = 新结点',
      '  node.end = true                     // 标记单词结尾',
      '',
      'find(w) / startsWith(p):',
      '  node = root',
      '  for 每个字符 c:',
      '    if node 没有 c 这条边: return false',
      '    node = 该子结点',
      '  return find ? node.end : true       // 前缀查询只需走通'
    ],
    inputs: [{ key: 'words', label: '单词序列', def: 'cat,car,card,care,dog,do,done', hint: '逗号分隔，最多 8 个单词' }],
    actions: [
      { key: 'build', label: '按序列建树', primary: true },
      { key: 'insert', label: '插入单词', arg: { label: '单词', def: 'cat' } },
      { key: 'find', label: '查找单词', arg: { label: '单词', def: 'card' } },
      { key: 'prefix', label: '前缀查询', arg: { label: '前缀', def: 'ca' } }
    ],
    samples: [
      { label: '示例：共享前缀 car/card/care', values: { words: 'cat,car,card,care,dog,do,done' } },
      { label: '示例：app 系列', values: { words: 'app,apple,application,ban,banana,band' } }
    ],
    random: function () {
      var pool = ['cat', 'car', 'card', 'care', 'dog', 'do', 'done', 'try', 'tree', 'tea', 'ten', 'in', 'ink', 'app', 'apple', 'bat', 'bay', 'sea', 'set', 'sun'];
      var w = DSV.shuffle(pool).slice(0, DSV.ri(4, 6));
      w.sort();
      return { words: w.join(',') };
    },
    run: function (v, action, state) {
      var words = DSV.toks(v.words).slice(0, 8).map(function (w) { return String(w).slice(0, 10); });
      var key = (action && action.key) || 'build';
      var arg = String((action && action.arg) == null ? '' : action.arg).replace(/\s+/g, '').slice(0, 10);
      if (!state || !state.root) { state = { next: 1, root: mkTNode('t0', '') }; }
      var st = [];

      function sn(hl, msg, warn) {
        hl = hl || {};
        return { tree: DSV.clone(state.root), nodeCls: DSV.clone(hl.node || {}), edgeCls: DSV.clone(hl.edge || {}), msg: msg || '', warn: !!warn };
      }

      /* ---------- 插入 ---------- */
      function insert(word, prefix) {
        var node = state.root;
        push(st, [0, 1], '插入单词 “' + word + '”：从根结点出发。', sn({ node: (function () { var o = {}; o[node.id] = 'active'; return o; })() },
          '插入 “' + word + '”'));
        for (var i = 0; i < word.length; i++) {
          var ch = word.charAt(i);
          var ekey = node.id + '|' + ch;
          var child = node.kids[ch];
          var ha = {}; ha[node.id] = 'active';
          push(st, [2], '取单词的第 ' + (i + 1) + ' 个字符 “' + ch + '”（共 ' + word.length + ' 个），在当前结点的孩子里查找。',
            sn({ node: ha }, '处理第 ' + (i + 1) + ' 个字符 “' + ch + '”'));
          if (child) {
            var h1 = {}; h1[node.id] = 'active';
            var e1 = {}; e1[ekey] = 'hl';
            push(st, [3], '第 ' + (i + 1) + ' 个字符 “' + ch + '”：当前结点已经有 “' + ch + '” 这条边，直接复用，不新建结点。',
              sn({ node: h1, edge: e1 }, '沿已有边 “' + ch + '” 下行'));
            node = child;
            var h2 = {}; h2[node.id] = 'active';
            push(st, [4], '沿边下行到结点 “' + ch + '”，继续处理下一个字符。', sn({ node: h2 }, '到达 “' + ch + '”'));
          } else {
            var h3 = {}; h3[node.id] = 'active';
            push(st, [4, 5], '第 ' + (i + 1) + ' 个字符 “' + ch + '”：当前结点没有 “' + ch + '” 这条边，需要新建分支。',
              sn({ node: h3 }, '缺少边 “' + ch + '”，准备新建'));
            var nn = mkTNode('t' + (state.next++), ch);
            node.kids[ch] = nn;
            var h4 = {}; h4[nn.id] = 'swap';
            var e4 = {}; e4[ekey] = 'hl';
            push(st, [6], '新建结点 “' + ch + '” 并挂在父结点下（红色 swap 表示写入新结点）。',
              sn({ node: h4, edge: e4 }, '新建结点 “' + ch + '”'));
            node = nn;
          }
        }
        node.end = true; node.word = word;
        var h5 = {}; h5[node.id] = 'active';
        push(st, [7], '单词 “' + word + '” 的字符全部处理完毕，把该结点标记为单词结尾（end = true，绿色 ✓）。',
          sn({ node: h5 }, prefix ? '已插入 “' + word + '”' : '“' + word + '” 插入完成'));
      }

      /* ---------- 查找 / 前缀 ---------- */
      function search(word, isPrefix) {
        var node = state.root;
        push(st, [9, 10], (isPrefix ? '前缀查询 “' + word + '”' : '查找单词 “' + word + '”') + '：从根结点出发逐字符下行。',
          sn({ node: (function () { var o = {}; o[node.id] = 'active'; return o; })() }, '查找 “' + word + '”'));
        for (var i = 0; i < word.length; i++) {
          var ch = word.charAt(i);
          var child = node.kids[ch];
          if (!child) {
            var h0 = {}; h0[node.id] = 'swap';
            push(st, [12], '当前结点没有 “' + ch + '” 这条边，走不下去 —— “' + word + '” ' + (isPrefix ? '不是任何单词的前缀。' : '不存在于字典树中。'),
              sn({ node: h0 }, '“' + word + '” ' + (isPrefix ? '不是已有前缀' : '不存在'), true));
            return;
          }
          var h1 = {}; h1[node.id] = 'active';
          var e1 = {}; e1[node.id + '|' + ch] = 'hl';
          push(st, [13], '第 ' + (i + 1) + ' 个字符 “' + ch + '”：有这条边，沿边下行到子结点。',
            sn({ node: h1, edge: e1 }, '匹配 “' + ch + '”'));
          node = child;
          var h2 = {}; h2[node.id] = 'active';
          push(st, [13], '到达结点 “' + ch + '”，继续匹配下一个字符。', sn({ node: h2 }, '到达 “' + ch + '”'));
        }
        if (isPrefix) {
          var cnt = 0;
          (function cntEnd(n) { if (n.end) { cnt++; } var ks = Object.keys(n.kids); for (var q = 0; q < ks.length; q++) { cntEnd(n.kids[ks[q]]); } })(node);
          var h3 = {}; h3[node.id] = 'active';
          push(st, [14], '前缀 “' + word + '” 的每条字符边都走得通，因此它存在；该前缀下面共有 ' + cnt + ' 个单词。',
            sn({ node: h3 }, '前缀 “' + word + '” 存在，含 ' + cnt + ' 个单词'));
        } else if (node.end) {
          var h4 = {}; h4[node.id] = 'active';
          push(st, [14], '所有字符都匹配成功，且该结点带有单词结尾标记（end = true），所以 “' + word + '” 存在于字典树中。',
            sn({ node: h4 }, '“' + word + '” 存在'));
        } else {
          var h5 = {}; h5[node.id] = 'swap';
          push(st, [14], '所有字符都能走通，但该结点没有单词结尾标记，说明 “' + word + '” 只是某个单词的前缀，并不存在于字典树中。',
            sn({ node: h5 }, '“' + word + '” 只是前缀，不存在', true));
        }
      }

      if (key === 'build') {
        state = { next: 1, root: mkTNode('t0', '') };
        push(st, [0], '建树：先创建一棵只含根结点的空字典树，然后依次插入 ' + words.length + ' 个单词。', sn({}, '初始化空字典树（只有根结点）'));
        if (!words.length) {
          push(st, [0], '单词序列为空，无法建树。', sn({}, '请在「单词序列」输入框中填写逗号分隔的单词', true));
        }
        for (var w = 0; w < words.length; w++) { insert(words[w], true); }
        push(st, [7], '建树完成，共插入 ' + words.length + ' 个单词：' + words.join('、') + '。',
          sn({}, '建树完成：' + words.join('、')));
      } else if (key === 'insert') {
        if (!arg) { push(st, [0], '请在「单词」输入框中填写要插入的单词。', sn({}, '插入失败：单词为空', true)); }
        else { insert(arg, false); }
      } else if (key === 'find') {
        if (!arg) { push(st, [9], '请在「单词」输入框中填写要查找的单词。', sn({}, '查找失败：单词为空', true)); }
        else { search(arg, false); }
      } else if (key === 'prefix') {
        if (!arg) { push(st, [9], '请在「前缀」输入框中填写要查询的前缀。', sn({}, '查询失败：前缀为空', true)); }
        else { search(arg, true); }
      } else {
        push(st, [0], '未知操作。', sn({}, '未知操作', true));
      }
      return { steps: st, state: state };
    },
    render: function (kr, s) {
      if (!s || !s.tree) {
        kr.html('__t', S.text(500, 300, '字典树 Trie：点击「按序列建树」开始，或逐个插入单词', 'vs'));
        kr.end(); return;
      }
      kr.html('__t', S.text(500, 26, '字典树 Trie（绿色 ✓ 结点表示单词结尾）', 'vt'));
      kr.html('__m', S.text(500, 52, s.msg || '', s.warn ? 'vwarn' : 'vs'));

      function kidsOf(n) {
        var ks = Object.keys(n.kids || {}).sort();
        return ks.map(function (k) { return n.kids[k]; });
      }
      var d = depthOf(s.tree, kidsOf);
      var dy = Math.max(46, Math.min(70, (560 - 100) / Math.max(1, d)));
      var pos = layoutNary(s.tree, kidsOf, { top: 100, dy: dy, sp: 112 });
      var ge = kr.g('__E', 'translate(0,0)', 'k'), gn = kr.g('__N', 'translate(0,0)', 'k');

      (function walk(n) {
        var p = pos[n.id];
        var ks = kidsOf(n);
        for (var i = 0; i < ks.length; i++) {
          var c = ks[i], cp = pos[c.id];
          var ekey = n.id + '|' + c.ch;
          var ecls = (s.edgeCls && s.edgeCls[ekey]) || '';
          kr.html('e_' + ekey, S.line(p.x, p.y, cp.x, cp.y, 'edge tree ' + ecls), ge);
          walk(c);
        }
        var cls = (s.nodeCls && s.nodeCls[n.id]) || (n.end ? 'done' : '');
        var inner;
        if (n.id === s.tree.id) {
          inner = S.rect(-28, -20, 56, 40) + S.text(0, 0, '根');
        } else if (n.end) {
          inner = S.circle(0, 0, 22) + S.text(0, 0, n.ch) + S.text(14, -14, '✓') + S.text(0, 34, n.word || '', 'nd-label');
        } else {
          inner = S.circle(0, 0, 22) + S.text(0, 0, n.ch);
        }
        kr.g('n_' + n.id, 'translate(' + p.x + ',' + p.y + ')', 'k nd ' + cls, inner, gn);
      })(s.tree);
      kr.end();
    }
  });

  /* ============================================================
     4. 压缩字典树（压缩 Trie / Radix Tree）
     ============================================================ */
  function mkCNode(id, label) { return { id: id, label: label, end: false, word: '', kids: [] }; }

  DSV.register({
    id: 'compressed-trie', name: '压缩字典树（Radix Tree）', category: '字符串算法',
    desc: '每条边上存一段字符串而不是单个字符，度为 1 且非单词结尾的中间结点会被合并进边，从而大幅减少结点数。查找 / 插入 O(L)；插入时若边只匹配了一部分，需要把这条边分裂成两段并引入中间结点。',
    viewBox: '0 0 1000 660',
    code: [
      'insert(w):',
      '  node = root; i = 0',
      '  while i < |w|:',
      '    rest = w[i..]; 在 node 的孩子中找以 rest[0] 开头的边 e',
      '    if 没有这样的边:',
      '      新建孩子，边标签 = rest，标记单词结尾; return',
      '    k = e.label 与 rest 的最长公共前缀长度',
      '    if k == |e.label|: node = e 指向的孩子; i += k; continue',
      '    else:                              // 边只匹配了一部分，需要分裂',
      '      新建中间结点 mid，边标签 = e.label[0..k)',
      '      e.label = e.label[k..]; 把 e 挂到 mid 下; 用 mid 替换 e',
      '      node = mid; i += k',
      '      if i == |w|: mid.end = true  else: 新建孩子，边标签 = w[i..]',
      '      return',
      '  node.end = true                      // w 是已有单词的前缀'
    ],
    inputs: [{ key: 'words', label: '单词序列', def: 'app,apple,application,ban,banana,band', hint: '逗号分隔，最多 8 个单词' }],
    actions: [
      { key: 'build', label: '按序列建树', primary: true },
      { key: 'insert', label: '插入单词', arg: { label: '单词', def: 'bandage' } },
      { key: 'find', label: '查找单词', arg: { label: '单词', def: 'banana' } },
      { key: 'prefix', label: '前缀查询', arg: { label: '前缀', def: 'ban' } }
    ],
    samples: [
      { label: '示例：分裂演示 app/apple/application', values: { words: 'app,apple,application,ban,banana,band' } },
      { label: '示例：do/dog/dogs/dot', values: { words: 'do,dog,dogs,dot,door' } }
    ],
    random: function () {
      var pool = ['app', 'apple', 'application', 'ban', 'banana', 'band', 'cat', 'cats', 'catch', 'do', 'dog', 'dogs', 'door', 'tea', 'ted', 'ten'];
      var w = DSV.shuffle(pool).slice(0, DSV.ri(4, 6));
      w.sort();
      return { words: w.join(',') };
    },
    run: function (v, action, state) {
      var words = DSV.toks(v.words).slice(0, 8).map(function (w) { return String(w).slice(0, 12); });
      var key = (action && action.key) || 'build';
      var arg = String((action && action.arg) == null ? '' : action.arg).replace(/\s+/g, '').slice(0, 12);
      if (!state || !state.root) { state = { next: 1, root: mkCNode('c0', '') }; }
      var st = [];

      function sn(hl, msg, warn) {
        hl = hl || {};
        return { tree: DSV.clone(state.root), nodeCls: DSV.clone(hl.node || {}), edgeCls: DSV.clone(hl.edge || {}), msg: msg || '', warn: !!warn };
      }
      function ekeyOf(p, c) { return p.id + '|' + c.id; }

      /* ---------- 插入 ---------- */
      function insert(word, inBuild) {
        var node = state.root, i = 0, guard = 0;
        var h0 = {}; h0[node.id] = 'active';
        push(st, [0, 1], '插入单词 “' + word + '”：从根结点出发，i = 0（i 是单词中尚未处理的位置）。',
          sn({ node: h0 }, '插入 “' + word + '”'));
        while (i < word.length && guard++ < 30) {
          var rest = word.slice(i), ch = rest.charAt(0);
          var idx = -1;
          for (var q = 0; q < node.kids.length; q++) {
            if (String(node.kids[q].label).charAt(0) === ch) { idx = q; break; }
          }
          var h1 = {}; h1[node.id] = 'active';
          if (idx < 0) {
            push(st, [3, 4], '当前待处理串 rest = “' + rest + '”，结点没有以 “' + ch + '” 开头的边。',
              sn({ node: h1 }, '缺少以 “' + ch + '” 开头的边'));
            var leaf = mkCNode('c' + (state.next++), rest);
            leaf.end = true; leaf.word = word;
            node.kids.push(leaf);
            var h2 = {}; h2[leaf.id] = 'swap';
            var e2 = {}; e2[ekeyOf(node, leaf)] = 'hl';
            push(st, [5], '新建叶结点，边标签直接就是整个剩余串 “' + rest + '”（压缩 Trie 一条边存一段字符串），并标记为单词结尾。',
              sn({ node: h2, edge: e2 }, '新建边 “' + rest + '”'));
            push(st, [5], '单词 “' + word + '” 插入完成。', sn({}, inBuild ? '已插入 “' + word + '”' : '“' + word + '” 插入完成'));
            return;
          }
          var c = node.kids[idx];
          var e1 = {}; e1[ekeyOf(node, c)] = 'hl';
          push(st, [3], '当前待处理串 rest = “' + rest + '”，找到以 “' + ch + '” 开头的边，边标签为 “' + c.label + '”。',
            sn({ node: h1, edge: e1 }, '检查边 “' + c.label + '”'));
          var k2 = 0;
          while (k2 < c.label.length && k2 < rest.length && c.label.charAt(k2) === rest.charAt(k2)) { k2++; }
          push(st, [6], '求最长公共前缀：边 “' + c.label + '” 与 rest “' + rest + '” 的公共前缀长度 k = ' + k2 +
            (k2 ? '，公共部分是 “' + c.label.slice(0, k2) + '”' : '（第一个字符之后就不同）') + '。',
            sn({ node: h1, edge: e1 }, '公共前缀长度 k = ' + k2));
          if (k2 === c.label.length) {
            push(st, [7], 'k = ' + k2 + ' 等于边长 ' + c.label.length + '：整条边完全匹配，沿边下行到它的孩子，i 前进到 ' + (i + k2) + '。',
              sn({ node: h1, edge: e1 }, '整条边匹配，继续下行'));
            node = c; i += k2;
            continue;
          }
          var pre = c.label.slice(0, k2), suf = c.label.slice(k2);
          push(st, [8], 'k = ' + k2 + ' < 边长 ' + c.label.length + '：这条边只匹配了一部分，必须分裂 —— 公共前缀 “' +
            (pre || '（空）') + '” 抽出来成为新的中间结点，剩下的 “' + suf + '” 继续往下挂。',
            sn({ node: h1, edge: e1 }, '需要分裂边 “' + c.label + '”'));
          var mid = mkCNode('c' + (state.next++), pre);
          c.label = suf;
          mid.kids.push(c);
          node.kids[idx] = mid;
          var h3 = {}; h3[mid.id] = 'swap';
          var e3 = {}; e3[ekeyOf(node, mid)] = 'hl';
          push(st, [9, 10], '创建中间结点，边标签为公共前缀 “' + (pre || '（空）') + '”；原子树 “' + suf + '” 改为挂在它下面，并整体替换原来的边。',
            sn({ node: h3, edge: e3 }, '分裂出中间结点 “' + (pre || '（空）') + '”'));
          node = mid; i += k2;
          if (i >= word.length) {
            mid.end = true; mid.word = word;
            var h4 = {}; h4[mid.id] = 'swap';
            push(st, [12], '单词 “' + word + '” 正好在中间结点处结束，把它标记为单词结尾（end = true）。',
              sn({ node: h4 }, '“' + word + '” 在中间结点结尾'));
          } else {
            var leaf2 = mkCNode('c' + (state.next++), word.slice(i));
            leaf2.end = true; leaf2.word = word;
            mid.kids.push(leaf2);
            var h5 = {}; h5[leaf2.id] = 'swap';
            var e5 = {}; e5[ekeyOf(mid, leaf2)] = 'hl';
            push(st, [12], '为新单词新建孩子，边标签 = 剩余串 “' + word.slice(i) + '”，并标记为单词结尾。',
              sn({ node: h5, edge: e5 }, '新建边 “' + word.slice(i) + '”'));
          }
          push(st, [12], '单词 “' + word + '” 插入完成。', sn({}, inBuild ? '已插入 “' + word + '”' : '“' + word + '” 插入完成'));
          return;
        }
        node.end = true; node.word = word;
        var h6 = {}; h6[node.id] = 'swap';
        push(st, [14], '单词 “' + word + '” 在现有路径上就结束了（它是某个已有单词的前缀），直接把该结点标记为单词结尾。',
          sn({ node: h6 }, inBuild ? '已插入 “' + word + '”' : '“' + word + '” 插入完成'));
      }

      /* ---------- 查找 / 前缀 ---------- */
      function search(word, isPrefix) {
        var node = state.root, i = 0, guard = 0;
        var h0 = {}; h0[node.id] = 'active';
        push(st, [0], (isPrefix ? '前缀查询 “' + word + '”' : '查找单词 “' + word + '”') + '：从根结点开始，每次拿一条边与剩余串比对。',
          sn({ node: h0 }, '查找 “' + word + '”'));
        while (i < word.length && guard++ < 30) {
          var rest = word.slice(i), ch = rest.charAt(0), idx = -1;
          for (var q = 0; q < node.kids.length; q++) {
            if (String(node.kids[q].label).charAt(0) === ch) { idx = q; break; }
          }
          if (idx < 0) {
            var hf = {}; hf[node.id] = 'swap';
            push(st, [3], '没有以 “' + ch + '” 开头的边，走不下去 —— “' + word + '” ' + (isPrefix ? '不是任何单词的前缀。' : '不存在。'),
              sn({ node: hf }, '“' + word + '” ' + (isPrefix ? '不是已有前缀' : '不存在'), true));
            return;
          }
          var c = node.kids[idx];
          var e1 = {}; e1[ekeyOf(node, c)] = 'hl';
          var k2 = 0;
          while (k2 < c.label.length && k2 < rest.length && c.label.charAt(k2) === rest.charAt(k2)) { k2++; }
          push(st, [6], '剩余串 “' + rest + '” 与边 “' + c.label + '” 的公共前缀长度 k = ' + k2 + '。',
            sn({ node: (function () { var o = {}; o[node.id] = 'active'; return o; })(), edge: e1 }, '比对边 “' + c.label + '”'));
          if (k2 < c.label.length) {
            var hf2 = {}; hf2[node.id] = 'swap';
            push(st, [6], 'k = ' + k2 + ' < 边长 ' + c.label.length + '：边上的内容比剩余串更长，二者不一致 —— “' + word + '” ' +
              (isPrefix ? '不是任何单词的前缀。' : '不存在。'),
              sn({ node: hf2, edge: e1 }, '“' + word + '” ' + (isPrefix ? '不是已有前缀' : '不存在'), true));
            return;
          }
          var hn = {}; hn[c.id] = 'active';
          push(st, [7], '整条边 “' + c.label + '” 匹配成功，沿边下行，i 前进到 ' + (i + k2) + '。',
            sn({ node: hn, edge: e1 }, '沿边 “' + c.label + '” 下行'));
          node = c; i += k2;
        }
        if (isPrefix) {
          var cnt = 0;
          (function ce(n) { if (n.end) { cnt++; } for (var q = 0; q < n.kids.length; q++) { ce(n.kids[q]); } })(node);
          var h3 = {}; h3[node.id] = 'active';
          push(st, [7], '前缀 “' + word + '” 全部走通，因此它存在；该前缀下面共有 ' + cnt + ' 个单词。',
            sn({ node: h3 }, '前缀 “' + word + '” 存在，含 ' + cnt + ' 个单词'));
        } else if (node.end) {
          var h4 = {}; h4[node.id] = 'active';
          push(st, [7], '所有字符都匹配成功，且该结点带单词结尾标记，所以 “' + word + '” 存在。',
            sn({ node: h4 }, '“' + word + '” 存在'));
        } else {
          var h5 = {}; h5[node.id] = 'swap';
          push(st, [7], '字符都能走通，但该结点没有单词结尾标记，“' + word + '” 只是前缀，并不存在。',
            sn({ node: h5 }, '“' + word + '” 只是前缀，不存在', true));
        }
      }

      if (key === 'build') {
        state = { next: 1, root: mkCNode('c0', '') };
        push(st, [0], '建树：创建只含根结点的空压缩字典树，然后依次插入 ' + words.length + ' 个单词。', sn({}, '初始化空压缩字典树'));
        if (!words.length) {
          push(st, [0], '单词序列为空，无法建树。', sn({}, '请在「单词序列」输入框中填写逗号分隔的单词', true));
        }
        for (var w = 0; w < words.length; w++) { insert(words[w], true); }
        push(st, [14], '建树完成：' + words.join('、') + '。每条边都存了一段字符串，度为 1 的非结尾结点已被合并。',
          sn({}, '建树完成：' + words.join('、')));
      } else if (key === 'insert') {
        if (!arg) { push(st, [0], '请在「单词」输入框中填写要插入的单词。', sn({}, '插入失败：单词为空', true)); }
        else { insert(arg, false); }
      } else if (key === 'find') {
        if (!arg) { push(st, [0], '请在「单词」输入框中填写要查找的单词。', sn({}, '查找失败：单词为空', true)); }
        else { search(arg, false); }
      } else if (key === 'prefix') {
        if (!arg) { push(st, [0], '请在「前缀」输入框中填写要查询的前缀。', sn({}, '查询失败：前缀为空', true)); }
        else { search(arg, true); }
      } else {
        push(st, [0], '未知操作。', sn({}, '未知操作', true));
      }
      return { steps: st, state: state };
    },
    render: function (kr, s) {
      if (!s || !s.tree) {
        kr.html('__t', S.text(500, 300, '压缩字典树：点击「按序列建树」开始，边上存的是一段字符串', 'vs'));
        kr.end(); return;
      }
      kr.html('__t', S.text(500, 26, '压缩字典树 Radix Tree（边标签 = 一段字符串，绿色 ✓ 为单词结尾）', 'vt'));
      kr.html('__m', S.text(500, 52, s.msg || '', s.warn ? 'vwarn' : 'vs'));

      function kidsOf(n) {
        return (n.kids || []).slice().sort(function (a, b) { return String(a.label) < String(b.label) ? -1 : 1; });
      }
      var d = depthOf(s.tree, kidsOf);
      var dy = Math.max(64, Math.min(96, (560 - 100) / Math.max(1, d)));
      var pos = layoutNary(s.tree, kidsOf, { top: 100, dy: dy, sp: 118 });
      var ge = kr.g('__E', 'translate(0,0)', 'k'), gn = kr.g('__N', 'translate(0,0)', 'k');
      var nodeMap = {};
      (function coll2(n) { nodeMap[n.id] = n; (n.kids || []).forEach(coll2); })(s.tree);

      (function walk(n) {
        var p = pos[n.id];
        var ks = kidsOf(n);
        for (var i = 0; i < ks.length; i++) {
          var c = ks[i], cp = pos[c.id];
          var ekey = n.id + '|' + c.id;
          var ecls = (s.edgeCls && s.edgeCls[ekey]) || '';
          kr.html('e_' + ekey, S.line(p.x, p.y, cp.x, cp.y, 'edge tree ' + ecls), ge);
          var ex2 = cp.x - p.x, ey2 = cp.y - p.y, EL2 = Math.sqrt(ex2 * ex2 + ey2 * ey2) || 1;
          var ux2 = ex2 / EL2, uy2 = ey2 / EL2;
          var rn = (n.id === s.tree.id ? 28 : (n.end ? 20 : 15)), rc = (c.end ? 20 : 15);
          var seg2 = Math.max(0, EL2 - rn - rc), mid2 = rn + seg2 / 2;
          var bw2 = Math.max(24, 14 + 11 * String(c.label).length);
          var hw2 = bw2 / 2 + 3, hh2 = 15, off2 = hw2 + Math.max(rn, rc) + 2;
          var mx2 = (p.x + cp.x) / 2, my2 = (p.y + cp.y) / 2;
          function clash2(x, y) {
            if (x - hw2 < 42 || x + hw2 > 958) { return true; }
            if (Math.abs(x - p.x) < hw2 + rn && Math.abs(y - p.y) < hh2 + rn) { return true; }
            if (Math.abs(x - cp.x) < hw2 + rc && Math.abs(y - cp.y) < hh2 + rc) { return true; }
            if (n.end && Math.abs(y - (p.y + 36)) < hh2 + 9 && Math.abs(x - p.x) < hw2 + 15) { return true; }
            for (var oid in nodeMap) {
              if (oid === n.id || oid === c.id) { continue; }
              var on2 = nodeMap[oid], op2 = pos[oid];
              if (!op2) { continue; }
              var orx = (oid === s.tree.id ? 28 : (on2.end ? 20 : 15));
              var ory = (oid === s.tree.id ? 20 : (on2.end ? 20 : 15));
              if (Math.abs(x - op2.x) < hw2 + orx && Math.abs(y - op2.y) < hh2 + ory) { return true; }
              if (on2.end && Math.abs(y - (op2.y + 34)) < hh2 + 9 && Math.abs(x - op2.x) < hw2 + 15) { return true; }
            }
            return false;
          }
          var lx2 = mx2, ly2 = my2;
          var cand2 = [[mx2 - uy2 * off2, my2 + ux2 * off2], [mx2 + uy2 * off2, my2 - ux2 * off2], [mx2, my2]];
          for (var ci2 = 0; ci2 < cand2.length; ci2++) {
            if (!clash2(cand2[ci2][0], cand2[ci2][1])) { lx2 = cand2[ci2][0]; ly2 = cand2[ci2][1]; break; }
          }
          kr.g('l_' + ekey, 'translate(' + lx2 + ',' + ly2 + ')', 'k', edgeBox(c.label, ecls === 'hl' ? 'active' : ''), ge);
          walk(c);
        }
        var cls = (s.nodeCls && s.nodeCls[n.id]) || (n.end ? 'done' : '');
        var inner;
        if (n.id === s.tree.id) {
          inner = S.rect(-28, -20, 56, 40) + S.text(0, 0, '根');
        } else if (n.end) {
          inner = S.circle(0, 0, 20) + S.text(0, -2, '✓') + S.text(0, 34, n.word || '', 'nd-label');
        } else {
          inner = S.circle(0, 0, 15);
        }
        kr.g('n_' + n.id, 'translate(' + p.x + ',' + p.y + ')', 'k nd ' + cls, inner, gn);
      })(s.tree);
      kr.end();
    }
  });

  /* ============================================================
     5. 哈夫曼编码
     ============================================================ */
  function parseSyms(str) {
    var out = [];
    String(str == null ? '' : str).split(/[\s,，;；]+/).forEach(function (t) {
      if (!t) { return; }
      var p = t.split(':');
      var name = p[0];
      if (!name) { return; }
      var w = p.length > 1 ? Number(p[1]) : NaN;
      if (!isFinite(w) || w <= 0) { w = 1; }
      out.push({ name: name, w: w });
    });
    return out.slice(0, 10);
  }

  /** 绘制一棵小规模二叉树（哈夫曼森林用）
   *  按「自然宽度」布局（不压缩），由调用方按宽度分配槽位；
   *  边标签放在两圆之间的自由段中点，太短时垂直偏移到边旁，避免压结点。 */
  function drawBin(kr, root, opt) {
    if (!root) { return null; }
    var dx = opt.dx || 48, dy = opt.dy || 64, top = opt.top || 0;
    var nodeSize = opt.nodeSize || 48, gap = (opt.gap == null) ? 8 : opt.gap;
    var r = opt.r || 21;
    var lay = DSV.treeLayout(root, { dx: dx, dy: dy, top: top, w: 1e6, nodeSize: nodeSize, gap: gap });
    var pos = lay.pos, C = 5e5, ox = opt.ox || 0, oy = opt.oy || 0;
    var ge = kr.g('__hfe', 'translate(0,0)', 'k'), gn = kr.g('__hfn', 'translate(0,0)', 'k');
    var placedLbl = [];
    (function we(n) {
      if (!n) { return; }
      we(n.left); we(n.right);
      var p = pos[n.id], px = ox + p.x - C, py = oy + p.y;
      var slb = null;
      ['left', 'right'].forEach(function (side) {
        var c = n[side];
        if (!c || !pos[c.id]) { return; }
        var cp = pos[c.id], cx2 = ox + cp.x - C, cy2 = oy + cp.y;
        var ecls = opt.edge ? opt.edge(n, c, side) : 'tree';
        kr.html('he_' + n.id + '_' + side, S.line(px, py, cx2, cy2, 'edge ' + ecls));
        if (opt.edgeLabel) {
          var t = opt.edgeLabel(n, c, side);
          if (t) {
            var ex = cx2 - px, ey = cy2 - py, EL = Math.sqrt(ex * ex + ey * ey) || 1;
            var ux = ex / EL, uy = ey / EL;
            var seg = Math.max(0, EL - 2 * r);
            var mid = r + seg / 2;
            var hw = 15, hh = 15;
            function hcl(x, y) {
              if (Math.abs(x - px) < hw + r && Math.abs(y - py) < hh + r) { return true; }
              if (Math.abs(x - cx2) < hw + r && Math.abs(y - cy2) < hh + r) { return true; }
              if (slb && Math.abs(x - slb[0]) < hw + hw - 2 && Math.abs(y - slb[1]) < hh + hh - 2) { return true; }
              for (var pi = 0; pi < placedLbl.length; pi++) {
                if (Math.abs(x - placedLbl[pi][0]) < hw + hw - 2 && Math.abs(y - placedLbl[pi][1]) < hh + hh - 2) { return true; }
              }
              for (var oid in pos) {
                if (oid === n.id || oid === c.id) { continue; }
                var op2 = pos[oid];
                if (!op2) { continue; }
                if (Math.abs(x - (ox + op2.x - C)) < hw + r && Math.abs(y - (oy + op2.y)) < hh + r) { return true; }
              }
              return false;
            }
            var lx, ly;
            if (seg >= 40) { lx = px + ux * mid; ly = py + uy * mid; }
            else {
              var off = hw + r + 2;
              var cand = [
                [px + ux * mid - uy * off, py + uy * mid + ux * off],
                [px + ux * mid + uy * off, py + uy * mid - ux * off],
                [px + ux * mid, py + uy * mid]
              ];
              lx = cand[0][0]; ly = cand[0][1];
              for (var ci = 0; ci < cand.length; ci++) {
                if (!hcl(cand[ci][0], cand[ci][1])) { lx = cand[ci][0]; ly = cand[ci][1]; break; }
              }
            }
            if (side === 'left') { slb = [lx, ly]; }
            placedLbl.push([lx, ly]);
            kr.g('hl_' + n.id + '_' + side, 'translate(' + lx + ',' + ly + ')', 'k', edgeBox(t, ecls === 'path' ? 'path' : ''));
          }
        }
      });
    })(root);
    (function wn(n) {
      if (!n) { return; }
      var p = pos[n.id];
      if (!p) { return; }
      var d = opt.node ? opt.node(n, p) : { cls: '', inner: '' };
      kr.g('hn_' + n.id, 'translate(' + (ox + p.x - C) + ',' + (oy + p.y) + ')', 'k nd ' + (d.cls || ''), d.inner);
      wn(n.left); wn(n.right);
    })(root);
    return lay;
  }

  DSV.register({
    id: 'huffman', name: '哈夫曼编码', category: '字符串算法',
    desc: '贪心构造：每次从最小堆里取出权值最小的两棵树合并（左记 0、右记 1），直到只剩一棵树，再从根到叶读出 0/1 路径即得编码。时间复杂度 O(n log n)，产生的编码是前缀码且带权路径长度 WPL 最小。',
    viewBox: '0 0 1000 660',
    code: [
      'huffman(symbols):',
      '  为每个字符建立叶子结点，权值 = 频率',
      '  把所有结点按权值放入最小堆 H',
      '  while |H| > 1:',
      '    x = H.popMin(); y = H.popMin()       // 取权值最小的两个',
      '    z = new Node(w = x.w + y.w)',
      '    z.left = x; z.right = y              // 左分支记 0，右分支记 1',
      '    H.push(z)                            // 合并后的新树重新入堆',
      '  root = H.popMin()                      // 哈夫曼树构造完成',
      '  // 从根向下分配编码',
      '  dfs(node, code):',
      '    if node 是叶子: table[node.ch] = code; return',
      '    dfs(node.left, code + "0"); dfs(node.right, code + "1")',
      '  WPL = Σ w_i × |code_i|'
    ],
    inputs: [{ key: 'symbols', label: '字符与权值', def: 'a:45,b:13,c:12,d:16,e:9,f:5', hint: '格式：字符:权值，逗号分隔，最多 10 个' }],
    actions: [{ key: 'run', label: '开始构造', primary: true }],
    samples: [
      { label: '示例：经典权值 a:45,b:13,c:12,d:16,e:9,f:5', values: { symbols: 'a:45,b:13,c:12,d:16,e:9,f:5' } },
      { label: '示例：8 个字符', values: { symbols: 'x:7,y:19,z:2,w:6,u:32,v:3,t:21,r:10' } },
      { label: '示例：3 个字符', values: { symbols: 'A:20,B:5,C:10' } }
    ],
    random: function () {
      var letters = 'abcdefghij', n = DSV.ri(4, 7), out = [];
      for (var i = 0; i < n; i++) { out.push(letters.charAt(i) + ':' + DSV.ri(1, 60)); }
      return { symbols: out.join(',') };
    },
    run: function (v) {
      var syms = parseSyms(v.symbols);
      if (!syms.length) {
        return [{ code: [0], desc: '输入无效：请按「字符:权值」的格式填写，例如 a:45,b:13。',
          snap: { msg: '输入无效：请按「字符:权值」的格式填写（例如 a:45,b:13,c:12）。', warn: true } }];
      }
      var st = [], nodes = [], seq = 0, id = 0;
      function cmp(a, b) { if (a.w !== b.w) { return a.w - b.w; } return a.seq - b.seq; }

      function charsOf(n) {
        if (!n) { return ''; }
        if (!n.left && !n.right) { return n.ch; }
        return charsOf(n.left) + charsOf(n.right);
      }
      function sn(o) {
        o = o || {};
        var sel = o.sel || [];
        return {
          forest: DSV.clone(nodes),
          queue: nodes.map(function (nd) {
            return { top: charsOf(nd), sub: nd.w, cls: sel.indexOf(nd.id) >= 0 ? 'swap' : '' };
          }),
          hl: DSV.clone(o.hl || {}), msg: o.msg || '', warn: !!o.warn,
          codes: o.codes ? DSV.clone(o.codes) : null,
          wpl: o.wpl == null ? null : o.wpl
        };
      }

      push(st, [0], '开始构造哈夫曼树：共读入 ' + syms.length + ' 个字符及其权值，' +
        syms.map(function (sy) { return sy.name + '(' + sy.w + ')'; }).join('、') + '。',
        sn({ msg: '读入 ' + syms.length + ' 个字符' }));
      syms.forEach(function (sy, si) {
        var nd = { id: 'h' + (id++), ch: sy.name, w: sy.w, seq: seq++, left: null, right: null };
        nodes.push(nd);
        var h = {}; h[nd.id] = 'swap';
        push(st, [1], '为字符 “' + sy.name + '” 建立一个叶子结点，权值 w = ' + sy.w + '（第 ' + (si + 1) + ' / ' + syms.length + ' 个）。',
          sn({ sel: [nd.id], hl: h, msg: '建立叶子 “' + sy.name + '”(' + sy.w + ')' }));
      });
      nodes.sort(cmp);
      push(st, [2], '把所有叶子结点按权值从小到大放入最小堆（队首永远是权值最小的结点）：' +
        nodes.map(function (nd) { return nd.ch + '(' + nd.w + ')'; }).join('、') + '。',
        sn({ msg: '入堆完成，共 ' + nodes.length + ' 棵树' }));

      var guard = 0;
      while (nodes.length > 1 && guard++ < 40) {
        var x = nodes.shift(), y = nodes.shift();
        var h1 = {}; h1[x.id] = 'active'; h1[y.id] = 'active';
        push(st, [4], '取出权值最小的两个结点：' + charsOf(x) + '(' + x.w + ') 与 ' + charsOf(y) + '(' + y.w + ')。',
          sn({ sel: [x.id, y.id], hl: h1, msg: '取出最小的两个：' + x.w + ' 与 ' + y.w }));
        var z = { id: 'h' + (id++), ch: '', w: x.w + y.w, seq: seq++, left: x, right: y };
        var h2 = {}; h2[z.id] = 'swap';
        push(st, [5, 6], '把它们合并为新结点，权值 = ' + x.w + ' + ' + y.w + ' = ' + z.w +
          '；权值较小的 ' + charsOf(x) + ' 作为左孩子（走 0），' + charsOf(y) + ' 作为右孩子（走 1）。',
          sn({ sel: [x.id, y.id], hl: h2, msg: '合并为权值 ' + z.w + ' 的新结点' }));
        nodes.push(z);
        nodes.sort(cmp);
        var h3 = {}; h3[z.id] = 'swap';
        push(st, [7], '把新结点按权值 ' + z.w + ' 重新插入队列（小根堆），当前队列：' +
          nodes.map(function (nd) { return charsOf(nd) + '(' + nd.w + ')'; }).join('、') + '。',
          sn({ sel: [z.id], hl: h3, msg: '新结点入堆，剩余 ' + nodes.length + ' 棵树' }));
      }

      var root = nodes[0];
      if (!root) { return []; }
      var h4 = {}; h4[root.id] = 'active';
      push(st, [8], '队列中只剩一棵树，哈夫曼树构造完成，根结点权值 = ' + root.w + '（等于所有字符权值之和）。',
        sn({ hl: h4, msg: '哈夫曼树构造完成，根权值 = ' + root.w }));

      /* ---------- 分配编码 ---------- */
      var codes = {}, wpl = 0;
      push(st, [10], '从根开始向下遍历分配编码：往左走记 0，往右走记 1，走到叶子就得到该字符的编码。',
        sn({ hl: h4, codes: {}, wpl: 0, msg: '开始分配 0/1 编码' }));

      (function walk(n, code, path, epath) {
        var hl = {};
        path.forEach(function (pid) { hl[pid] = 'path'; });
        epath.forEach(function (ek) { hl[ek] = 'path'; });
        hl[n.id] = 'active';
        if (!n.left && !n.right) {
          var c = code || '0';
          codes[n.ch] = c;
          wpl += n.w * c.length;
          push(st, [11], '到达叶子 “' + n.ch + '”（权值 ' + n.w + '）：从根到它的路径是 ' + c +
            '，长度 ' + c.length + '，于是编码 ' + n.ch + ' = ' + c + '，对 WPL 的贡献为 ' + n.w + '×' + c.length + ' = ' + (n.w * c.length) + '。',
            sn({ hl: hl, codes: codes, wpl: wpl, msg: n.ch + ' → ' + c + '（长度 ' + c.length + '）' }));
          return;
        }
        push(st, [12], '内部结点（权值 ' + n.w + '）不是叶子，继续向下分配：先走左孩子，编码追加 0。',
          sn({ hl: hl, codes: codes, wpl: wpl, msg: '内部结点 ' + n.w + '：向左记 0' }));
        var p2 = path.concat([n.id]);
        if (n.left) { walk(n.left, code + '0', p2, epath.concat([n.id + '_left'])); }
        if (n.right) {
          push(st, [12], '回到内部结点（权值 ' + n.w + '）：再走右孩子，编码追加 1，得到 ' + code + '1。',
            sn({ hl: hl, codes: codes, wpl: wpl, msg: '内部结点 ' + n.w + '：向右记 1' }));
          walk(n.right, code + '1', p2, epath.concat([n.id + '_right']));
        }
      })(root, '', [], []);

      var tbl = Object.keys(codes).map(function (ch) { return ch + '=' + codes[ch]; }).join('，');
      push(st, [13], '编码完成：' + tbl + '。带权路径长度 WPL = Σ 权值×码长 = ' + wpl + '（哈夫曼编码保证 WPL 最小）。',
        sn({ hl: {}, codes: codes, wpl: wpl, msg: '完成：WPL = ' + wpl }));
      return st;
    },
    render: function (kr, s) {
      if (!s || !s.forest) {
        kr.html('__t', S.text(500, 300, (s && s.msg) || '哈夫曼编码：输入「字符:权值」后点击「开始构造」', s && s.warn ? 'vwarn' : 'vs'));
        kr.end(); return;
      }
      kr.html('__t', S.text(500, 26, '哈夫曼编码（每次合并权值最小的两棵树）', 'vt'));
      kr.html('__m', S.text(500, 50, s.msg || '', s.warn ? 'vwarn' : 'vs'));

      /* 森林：每棵树一个小二叉树（先量自然宽度、按宽度分配槽位，避免树间挤压与结点重叠） */
      var k = s.forest.length, MINW = 46;
      var wids = [], sumW = 0;
      for (var t = 0; t < k; t++) {
        var lyT = DSV.treeLayout(s.forest[t], { dx: 48, dy: 52, top: 0, w: 1e6, nodeSize: 48, gap: 8 });
        var wT = Math.max(MINW, lyT.width + 24);
        wids.push(wT); sumW += wT;
      }
      var sc = Math.min(1, 920 / Math.max(1, sumW)), cur = 40;
      for (var t2 = 0; t2 < k; t2++) {
        var slot = Math.max(MINW, Math.round(wids[t2] * sc));
        drawBin(kr, s.forest[t2], {
          ox: cur + slot / 2, oy: 76, dx: 48, dy: 52, nodeSize: 48, r: 21,
          node: function (n) {
            var cls = (s.hl && s.hl[n.id]) || '';
            var leaf = (!n.left && !n.right);
            var inner = S.circle(0, 0, 21) +
              (leaf ? S.text(0, -6, n.ch) + S.text(0, 14, n.w, 'nd-label')
                : S.text(0, -6, n.w) + S.text(0, 14, '∑', 'nd-label'));
            return { inner: inner, cls: cls };
          },
          edge: function (p, c, side) {
            var ek = p.id + '_' + side;
            return (s.hl && s.hl[ek]) ? 'path' : 'tree';
          },
          edgeLabel: function (p, c, side) { return side === 'left' ? '0' : '1'; }
        });
        cur += slot;
      }

      /* 结点队列（最小堆） */
      drawRow(kr, 'Q', '最小堆 / 结点队列（上排为包含的字符，下排为权值；红色为本次取出的两个最小结点）',
        s.queue, 408, { cw: 58 });

      /* 编码表与 WPL */
      if (s.codes) {
        var ks = Object.keys(s.codes);
        drawRow(kr, 'C', '哈夫曼编码表（前缀码：任一编码都不是另一个编码的前缀）',
          ks.map(function (ch) { return { top: ch, sub: s.codes[ch] || '—', cls: 'done' }; }), 490, { cw: 62 });
        if (s.wpl != null) { kr.html('__w', S.text(500, 552, '带权路径长度 WPL = Σ 权值 × 码长 = ' + s.wpl, 'vs')); }
      }
      kr.end();
    }
  });

})();
