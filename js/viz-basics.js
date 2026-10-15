/* ============================================================
   viz-basics.js —— 基础结构章节（4 个可视化）
   栈（数组实现） / 栈（链表实现） / 队列（循环数组） / 队列（链表实现）
   四个均为「有状态」数据结构：run 返回 { steps, state }
   ============================================================ */
(function () {
  'use strict';
  var DSV = window.DSV, S = DSV.svg;

  /* ---------- 通用工具 ---------- */
  function push(steps, code, desc, snap) { steps.push({ code: code, desc: desc, snap: snap }); }
  function zeros(n) { var a = []; for (var i = 0; i < n; i++) { a.push(''); } return a; }

  var C_EDGE = '#7f9c8a';   // 普通连线（与 .edge 同色）
  var C_HL = '#c9920a';     // 高亮连线（金色）

  /** 手绘箭头连线：线段 + 三角箭头（不依赖 marker defs） */
  function arrow(x1, y1, x2, y2, cls, color) {
    var dx = x2 - x1, dy = y2 - y1, len = Math.sqrt(dx * dx + dy * dy);
    if (!len) { return ''; }
    var ux = dx / len, uy = dy / len;
    var h = len > 18 ? 9 : Math.max(3, len * 0.45), w = 4.5;
    var bx = x2 - ux * h, by = y2 - uy * h;
    var px = -uy * w, py = ux * w;
    var p1 = (bx + px).toFixed(1) + ',' + (by + py).toFixed(1);
    var p2 = (bx - px).toFixed(1) + ',' + (by - py).toFixed(1);
    var p3 = x2.toFixed(1) + ',' + y2.toFixed(1);
    return S.line(x1, y1, bx.toFixed(1), by.toFixed(1), 'edge ' + (cls || '')) +
      '<polygon points="' + p1 + ' ' + p2 + ' ' + p3 + '" fill="' + (color || C_EDGE) + '"/>';
  }

  /** 链表节点方框（宽 bw，高 48，中心在 0,0） */
  function nodeBox(v, cls, id, bw) {
    return '<rect class="cell ' + (cls || '') + '" x="' + (-bw / 2) + '" y="-24" width="' + bw + '" height="48" rx="5"/>' +
      S.text(0, -6, v, 'cell-txt') +
      S.text(0, 12, 'N' + id, 'nd-label');
  }

  /** 尚未接入链表的「新节点」 */
  function drawPend(kr, pend, x, y, label) {
    if (!pend) { return; }
    kr.g('__pend', 'translate(' + x + ',' + y + ')', 'k',
      '<rect class="frame dash" x="-52" y="-32" width="104" height="64" rx="6"/>' +
      nodeBox(pend.v, 'active', pend.id, 86) +
      S.text(0, -44, label, 'vs'));
  }

  /**
   * 绘制单链表：节点方框 + next 箭头 + 末尾 null 标记
   * 返回 { cxs, bw, pitch, cy }
   */
  function drawList(kr, s, opt) {
    opt = opt || {};
    var nodes = s.nodes || [], n = nodes.length, i;
    var bw = 86, gap = 44, pitch = bw + gap, cy = opt.cy || 300;
    var total = n > 0 ? (n * bw + (n - 1) * gap) : 0;
    var x0 = (1000 - total) / 2;
    var cxs = [];
    for (i = 0; i < n; i++) { cxs.push(x0 + i * pitch + bw / 2); }
    var cm = (s.c || zeros(n));
    for (i = 0; i < n; i++) {
      var sx = cxs[i] + bw / 2 + 2, ex = cxs[i] + pitch - bw / 2 - 10;
      var hl = (opt.hlNext === i) ? 'hl' : '';
      kr.html('ea' + i, arrow(sx, cy, ex, cy, hl, hl ? C_HL : C_EDGE) + S.text((sx + ex) / 2, cy - 13, 'next', 'tag'));
    }
    if (n > 0) {
      var nx = cxs[n - 1] + bw / 2 + 34;
      kr.html('enull', arrow(cxs[n - 1] + bw / 2 + 2, cy, nx - 16, cy, '', C_EDGE) +
        '<rect class="cell dead" x="' + nx + '" y="' + (cy - 13) + '" width="42" height="26" rx="4"/>' +
        S.text(nx + 21, cy, 'null', 'tag'));
    }
    for (i = 0; i < n; i++) {
      kr.g('n' + nodes[i].id, 'translate(' + cxs[i] + ',' + cy + ')', 'k', nodeBox(nodes[i].v, cm[i], nodes[i].id, bw));
    }
    return { cxs: cxs, bw: bw, pitch: pitch, cy: cy, n: n };
  }

  /** 输入：初始序列（逗号分隔） */
  var IN_SEQ = { key: 'init', label: '初始序列', def: '3,1,4,1,5', hint: '逗号或空格分隔' };
  var IN_CAP = { key: 'cap', label: '数组容量', def: '6', hint: '3-8' };
  function seq(v) { return DSV.toks(v.init); }
  function capOf(v, lo, hi) {
    var c = parseInt(v.cap, 10);
    if (!isFinite(c)) { c = 6; }
    return Math.max(lo, Math.min(hi, c));
  }
  function autoVal() { return String(DSV.ri(10, 99)); }

  /* ============================================================
     1. 栈（数组实现）
     ============================================================ */
  DSV.register({
    id: 'stack-array', name: '栈（数组实现）', category: '基础结构',
    desc: '用一段连续数组 data[0…capacity-1] 存放元素，top 记录栈顶下标（空栈为 -1）。入栈 top++ 后写值，出栈取值后 top--。入栈、出栈、取栈顶均为 O(1)，空间 O(capacity)；数组满时入栈会上溢（Overflow），空栈出栈会下溢（Underflow）。',
    code: [
      'push(x):',                                  // 0
      '  if top == capacity - 1:',                 // 1
      '    error "栈满：上溢 Overflow"',            // 2
      '  top = top + 1',                           // 3
      '  data[top] = x',                           // 4
      '',                                          // 5
      'pop():',                                    // 6
      '  if top == -1:',                           // 7
      '    error "栈空：下溢 Underflow"',           // 8
      '  v = data[top]',                           // 9
      '  data[top] = null',                        // 10
      '  top = top - 1',                           // 11
      '  return v',                                // 12
      '',                                          // 13
      'peek():',                                   // 14
      '  if top == -1: error "栈空"',              // 15
      '  return data[top]'                         // 16
    ],
    inputs: [IN_SEQ, IN_CAP],
    actions: [
      { key: 'push', label: '入栈', arg: { label: '值', def: '9' }, primary: true },
      { key: 'pop', label: '出栈' },
      { key: 'peek', label: '查看栈顶' },
      { key: 'build', label: '按初始序列建栈' },
      { key: 'clear', label: '清空栈' }
    ],
    samples: [
      { label: '示例：数字入栈', values: { init: '3,1,4,1,5', cap: '6' } },
      { label: '示例：刚好装满（演示上溢）', values: { init: '1,2,3,4,5,6', cap: '6' } },
      { label: '示例：字母入栈', values: { init: 'a,b,c,d', cap: '8' } }
    ],
    random: function () { return { init: DSV.randArr(DSV.ri(4, 6), 1, 99).join(','), cap: String(DSV.ri(6, 8)) }; },
    run: function (v, action, st) {
      var cap = capOf(v, 3, 8);
      var a = (action && action.key) || 'push';
      if (!st || st.cap !== cap) {
        st = { cap: cap, data: [], top: -1 };
        for (var i = 0; i < cap; i++) { st.data.push(null); }
      }
      var steps = [];
      function sn(hi, hicls, msg, warn, sub) {
        var c = zeros(cap), i2;
        for (i2 = 0; i2 < cap; i2++) {
          c[i2] = (i2 <= st.top) ? 'done' : '';
          if (hi != null && hi >= 0 && hi === i2) { c[i2] = hicls || 'active'; }
        }
        return { cap: cap, data: st.data.slice(), top: st.top, c: c, msg: msg || '', warn: !!warn, sub: sub || '' };
      }

      if (a === 'clear') {
        push(steps, [10, 11], '清空栈：把 top 置回 -1，' + (st.top + 1) + ' 个元素全部作废', sn(-1, '', '准备清空'));
        st.top = -1;
        for (var z = 0; z < cap; z++) { st.data[z] = null; }
        push(steps, [10, 11], '清空完成：栈为空，top = -1', sn(-1, '', '已清空', false, '元素个数 0'));
        return { steps: steps, state: st };
      }

      if (a === 'build') {
        var list = seq(v);
        st.top = -1;
        for (var b = 0; b < cap; b++) { st.data[b] = null; }
        if (!list.length) {
          push(steps, [0], '初始序列为空，无法建栈，请在「初始序列」中输入元素', sn(-1, '', '初始序列为空', true, '元素个数 0'));
          return { steps: steps, state: st };
        }
        push(steps, [0], '建栈：清空数组后，按初始序列 [' + list.join(', ') + '] 依次入栈', sn(-1, '', '开始建栈', false, '元素个数 0'));
        for (var t = 0; t < list.length; t++) {
          if (st.top >= cap - 1) {
            push(steps, [1, 2], '数组已满（top = ' + (cap - 1) + '），元素 ' + list[t] + ' 上溢，停止建栈',
              sn(-1, '', '上溢 Overflow：数组容量 ' + cap + ' 不够', true, '已放入 ' + (st.top + 1) + ' 个'));
            break;
          }
          st.top++; st.data[st.top] = list[t];
          push(steps, [3, 4], '入栈第 ' + (t + 1) + ' 个元素 ' + list[t] + '：top → ' + st.top + '，data[' + st.top + '] = ' + list[t],
            sn(st.top, 'active', '放入 ' + list[t], false, '元素个数 ' + (st.top + 1)));
        }
        push(steps, [4], '建栈完成：栈内共 ' + (st.top + 1) + ' 个元素，栈顶是 ' +
          (st.top >= 0 ? st.data[st.top] : '（空）'), sn(st.top, 'done', '建栈完成', false, '元素个数 ' + (st.top + 1)));
        return { steps: steps, state: st };
      }

      if (a === 'pop') {
        push(steps, [6], '准备出栈：当前 top = ' + st.top + '，栈内 ' + (st.top + 1) + ' 个元素',
          sn(st.top, 'active', '准备出栈', false, '元素个数 ' + (st.top + 1)));
        if (st.top < 0) {
          push(steps, [7, 8], 'top == -1，栈内没有元素，发生下溢（Underflow），出栈失败',
            sn(-1, '', '下溢 Underflow：空栈不能出栈', true, '元素个数 0'));
          return { steps: steps, state: st };
        }
        var v1 = st.data[st.top];
        push(steps, [9], '取出栈顶元素：v = data[' + st.top + '] = ' + v1,
          sn(st.top, 'swap', '取出 ' + v1, false, '元素个数 ' + (st.top + 1)));
        var old = st.top;
        st.data[st.top] = null; st.top--;
        push(steps, [10, 11], '把 data[' + old + '] 置空（逻辑删除），top 减 1 → ' + st.top,
          sn(old, 'swap', '删除原栈顶格', false, '元素个数 ' + (st.top + 1)));
        push(steps, [12], '出栈完成：弹出元素 ' + v1 + '，栈内剩余 ' + (st.top + 1) + ' 个元素',
          sn(st.top, 'done', '返回 ' + v1, false, '元素个数 ' + (st.top + 1)));
        return { steps: steps, state: st };
      }

      if (a === 'peek') {
        push(steps, [14, 15], '查看栈顶：top = ' + st.top, sn(st.top, 'active', '准备查看', false, '元素个数 ' + (st.top + 1)));
        if (st.top < 0) {
          push(steps, [15], 'top == -1，栈为空，没有栈顶元素可看', sn(-1, '', '空栈：peek 失败', true, '元素个数 0'));
          return { steps: steps, state: st };
        }
        push(steps, [16], '栈顶元素是 data[' + st.top + '] = ' + st.data[st.top] + '（只读取，不修改 top）',
          sn(st.top, 'path', '返回 ' + st.data[st.top], false, '元素个数 ' + (st.top + 1)));
        return { steps: steps, state: st };
      }

      /* push */
      var x = (action && action.arg != null) ? String(action.arg).trim() : '';
      if (x === '') { x = autoVal(); }
      push(steps, [0], '准备入栈：元素 x = ' + x + '，当前 top = ' + st.top + '（元素个数 ' + (st.top + 1) + '）',
        sn(st.top, 'done', '准备入栈 ' + x, false, '元素个数 ' + (st.top + 1)));
      if (st.top >= cap - 1) {
        push(steps, [1, 2], 'top = ' + st.top + ' 已等于 capacity - 1 = ' + (cap - 1) + '，数组放满了，发生上溢（Overflow），入栈失败',
          sn(st.top, 'swap', '上溢 Overflow：栈满，无法入栈 ' + x, true, '元素个数 ' + (st.top + 1) + ' / 容量 ' + cap));
        return { steps: steps, state: st };
      }
      push(steps, [1], '检查容量：top = ' + st.top + ' < capacity - 1 = ' + (cap - 1) + '，还有空位，可以入栈',
        sn(st.top, 'done', '容量检查通过', false, '元素个数 ' + (st.top + 1)));
      st.top++;
      push(steps, [3], 'top 指针自增：top = ' + st.top + '（新的栈顶下标）',
        sn(st.top, 'active', 'top → ' + st.top, false, '元素个数 ' + (st.top + 1)));
      st.data[st.top] = x;
      push(steps, [4], '写入：data[' + st.top + '] = ' + x,
        sn(st.top, 'swap', '写入 data[' + st.top + ']', false, '元素个数 ' + (st.top + 1)));
      push(steps, [4], '入栈完成：' + x + ' 成为新的栈顶，栈内共 ' + (st.top + 1) + ' 个元素（后进先出 LIFO）',
        sn(st.top, 'done', '入栈成功', false, '元素个数 ' + (st.top + 1)));
      return { steps: steps, state: st };
    },
    render: function (kr, s) {
      if (!s) {
        kr.html('__t', S.text(500, 260, '栈（数组实现）：点击「入栈」或「按初始序列建栈」开始演示', 'vt'));
        kr.end(); return;
      }
      var cap = s.cap, cw = Math.min(66, Math.floor(880 / cap)), h = 52;
      var x0 = (1000 - cap * cw) / 2, cy = 290, i;
      kr.html('__t', S.text(500, 28, '栈（数组实现）：容量 capacity = ' + cap + '，元素个数 size = ' + (s.top + 1), 'vt'));
      kr.html('__t2', S.text(500, 52, 'data[0] 是栈底，top 所指是栈顶；入栈向右生长，出栈向左回退（后进先出 LIFO）', 'vs'));
      kr.html('__f', '<rect class="frame dash" x="' + (x0 - 10) + '" y="' + (cy - h / 2 - 12) + '" width="' + (cap * cw + 20) + '" height="' + (h + 24) + '" rx="6"/>' +
        S.textL(x0 - 6, cy - h / 2 - 24, '数组 data[0…' + (cap - 1) + ']', 'vs') +
        S.text(x0 - 34, cy, '栈底', 'tag'));
      for (i = 0; i < cap; i++) {
        var cx = x0 + i * cw + cw / 2, val = s.data[i];
        kr.g('c' + i, 'translate(' + cx + ',' + cy + ')', 'k',
          '<rect class="cell ' + (s.c[i] || '') + '" x="' + (-cw / 2 + 3) + '" y="' + (-h / 2) + '" width="' + (cw - 6) + '" height="' + h + '" rx="4"/>' +
          S.text(0, 0, (val === null || val === undefined) ? '·' : val, 'cell-txt') +
          S.text(-cw / 2 - 12, 0, i, 'idx-txt'));
      }
      var tx = (s.top >= 0) ? (x0 + s.top * cw + cw / 2) : (x0 - 46);
      kr.g('__tp', 'translate(' + tx + ',' + cy + ')', 'k',
        arrow(0, 76, 0, h / 2 + 12, 'hl', C_HL) +
        S.text(0, 94, s.top >= 0 ? ('top = ' + s.top) : 'top = -1（空栈）', 'ptr'));
      if (s.msg) { kr.html('__m', S.text(500, 420, s.msg, s.warn ? 'vwarn' : 'vs')); }
      if (s.sub) { kr.html('__s', S.text(500, 448, s.sub, 'vs')); }
      kr.end();
    }
  });

  /* ============================================================
     2. 栈（链表实现）
     ============================================================ */
  DSV.register({
    id: 'stack-ll', name: '栈（链表实现）', category: '基础结构',
    desc: '用单链表实现栈：top 指向链表的头结点，入栈就是「头插」，出栈就是「头删」，因此不需要移动任何已有元素。入栈、出栈、取栈顶都是 O(1)，空间 O(n)，且没有容量上限（这里为方便演示限制 8 个节点）。',
    code: [
      'push(x):',                                  // 0
      '  N = new Node(x)',                         // 1
      '  N.next = top                              // 新节点指向原栈顶',  // 2
      '  top = N                                   // top 移到新节点',    // 3
      '  size = size + 1',                         // 4
      '',                                          // 5
      'pop():',                                    // 6
      '  if top == null:',                         // 7
      '    error "栈空：下溢 Underflow"',           // 8
      '  v = top.val',                             // 9
      '  top = top.next                            // 头删',             // 10
      '  size = size - 1',                         // 11
      '  return v',                                // 12
      '',                                          // 13
      'peek():',                                   // 14
      '  if top == null: error "栈空"',            // 15
      '  return top.val'                           // 16
    ],
    inputs: [IN_SEQ],
    actions: [
      { key: 'push', label: '入栈', arg: { label: '值', def: '7' }, primary: true },
      { key: 'pop', label: '出栈' },
      { key: 'peek', label: '查看栈顶' },
      { key: 'build', label: '按初始序列建栈' },
      { key: 'clear', label: '清空栈' }
    ],
    samples: [
      { label: '示例：数字入栈', values: { init: '3,1,4,1,5' } },
      { label: '示例：字母入栈', values: { init: 'a,b,c,d' } },
      { label: '示例：单个元素', values: { init: '42' } }
    ],
    random: function () { return { init: DSV.randArr(DSV.ri(3, 5), 1, 99).join(',') }; },
    run: function (v, action, st) {
      var MAX = 8, a = (action && action.key) || 'push';
      if (!st || !st.nodes) { st = { nodes: [], seq: 0 }; }
      var steps = [];
      function sn(hi, hicls, pend, msg, warn, sub) {
        var c = zeros(st.nodes.length), i;
        for (i = 0; i < c.length; i++) { c[i] = (hi === i) ? (hicls || 'active') : 'done'; }
        return {
          nodes: st.nodes.map(function (nd) { return { id: nd.id, v: nd.v }; }),
          c: c, pend: pend || null, msg: msg || '', warn: !!warn, sub: sub || ''
        };
      }

      if (a === 'clear') {
        push(steps, [10], '清空栈：top 改为 null，' + st.nodes.length + ' 个节点全部释放',
          sn(-1, '', null, '准备清空', false, '节点数 ' + st.nodes.length));
        st.nodes = [];
        push(steps, [10], '清空完成：链表为空，top = null', sn(-1, '', null, '已清空', false, '节点数 0'));
        return { steps: steps, state: st };
      }

      if (a === 'build') {
        var list = seq(v);
        st.nodes = [];
        if (!list.length) {
          push(steps, [0], '初始序列为空，无法建栈，请在「初始序列」中输入元素', sn(-1, '', null, '初始序列为空', true, '节点数 0'));
          return { steps: steps, state: st };
        }
        push(steps, [0], '建栈：清空链表后，按初始序列 [' + list.join(', ') + '] 依次头插', sn(-1, '', null, '开始建栈', false, '节点数 0'));
        for (var t = 0; t < list.length; t++) {
          if (st.nodes.length >= MAX) {
            push(steps, [0], '演示上限：链表最多展示 ' + MAX + ' 个节点，' + list[t] + ' 不再入栈',
              sn(-1, '', null, '已达演示上限 ' + MAX + ' 个节点', true, '节点数 ' + st.nodes.length));
            break;
          }
          var nid = ++st.seq, nnd = { id: nid, v: list[t] };
          st.nodes.unshift(nnd);
          push(steps, [1, 2, 3], '头插第 ' + (t + 1) + ' 个元素 ' + list[t] + '：N' + nid + '.next 指向原栈顶，top 改指向 N' + nid,
            sn(0, 'active', null, '入栈 ' + list[t], false, '节点数 ' + st.nodes.length));
        }
        push(steps, [4], '建栈完成：链上共 ' + st.nodes.length + ' 个节点，栈顶（头结点）是 ' +
          (st.nodes.length ? st.nodes[0].v : '（空）'), sn(0, 'done', null, '建栈完成', false, '节点数 ' + st.nodes.length));
        return { steps: steps, state: st };
      }

      if (a === 'pop') {
        push(steps, [6], '准备出栈：top 指向 ' + (st.nodes.length ? '节点 N' + st.nodes[0].id : 'null') +
          '，链上 ' + st.nodes.length + ' 个节点', sn(0, 'active', null, '准备出栈', false, '节点数 ' + st.nodes.length));
        if (!st.nodes.length) {
          push(steps, [7, 8], 'top == null，链上没有任何节点，发生下溢（Underflow），出栈失败',
            sn(-1, '', null, '下溢 Underflow：空栈不能出栈', true, '节点数 0'));
          return { steps: steps, state: st };
        }
        var head = st.nodes[0], v1 = head.v;
        push(steps, [9], '读取头结点：v = top.val = N' + head.id + '.val = ' + v1,
          sn(0, 'swap', null, '取出 ' + v1, false, '节点数 ' + st.nodes.length));
        var nextId = st.nodes.length > 1 ? ('N' + st.nodes[1].id) : 'null';
        st.nodes.shift();
        push(steps, [10], '头删：top 改指向原头结点的后继 ' + nextId + '，节点 N' + head.id + ' 从链上摘除',
          sn(-1, '', null, '删除头结点', false, '节点数 ' + st.nodes.length));
        push(steps, [11, 12], '出栈完成：弹出 ' + v1 + '，链上剩余 ' + st.nodes.length + ' 个节点',
          sn(st.nodes.length ? 0 : -1, 'done', null, '返回 ' + v1, false, '节点数 ' + st.nodes.length));
        return { steps: steps, state: st };
      }

      if (a === 'peek') {
        push(steps, [14, 15], '查看栈顶：top 指向 ' + (st.nodes.length ? '节点 N' + st.nodes[0].id : 'null'),
          sn(0, 'active', null, '准备查看', false, '节点数 ' + st.nodes.length));
        if (!st.nodes.length) {
          push(steps, [15], 'top == null，栈为空，没有栈顶元素可看', sn(-1, '', null, '空栈：peek 失败', true, '节点数 0'));
          return { steps: steps, state: st };
        }
        push(steps, [16], '栈顶元素是头结点 N' + st.nodes[0].id + ' 的值 ' + st.nodes[0].v + '（只读，不摘除节点）',
          sn(0, 'path', null, '返回 ' + st.nodes[0].v, false, '节点数 ' + st.nodes.length));
        return { steps: steps, state: st };
      }

      /* push */
      var x = (action && action.arg != null) ? String(action.arg).trim() : '';
      if (x === '') { x = autoVal(); }
      push(steps, [0], '准备入栈：元素 x = ' + x + '，当前链上 ' + st.nodes.length + ' 个节点',
        sn(-1, '', null, '准备入栈 ' + x, false, '节点数 ' + st.nodes.length));
      if (st.nodes.length >= MAX) {
        push(steps, [0], '演示上限：链表最多展示 ' + MAX + ' 个节点，请先出栈再入栈',
          sn(-1, '', null, '已达演示上限 ' + MAX + ' 个节点', true, '节点数 ' + st.nodes.length));
        return { steps: steps, state: st };
      }
      var id = ++st.seq;
      push(steps, [1], '创建新节点 N' + id + '（值 = ' + x + '），它的 next 还没有连上',
        sn(-1, '', { id: id, v: x }, '新建节点 N' + id, false, '节点数 ' + st.nodes.length));
      var oldTop = st.nodes.length ? ('N' + st.nodes[0].id + '（值 ' + st.nodes[0].v + '）') : 'null';
      push(steps, [2], '把 N' + id + '.next 指向原栈顶 ' + oldTop + '，新节点插到链表头部',
        sn(0, 'compare', { id: id, v: x }, '连接 next', false, '节点数 ' + st.nodes.length));
      st.nodes.unshift({ id: id, v: x });
      push(steps, [3], 'top 指针改指向 N' + id + '，它成为新的栈顶（头结点）',
        sn(0, 'active', null, 'top → N' + id, false, '节点数 ' + st.nodes.length));
      push(steps, [4], '入栈完成：链上共 ' + st.nodes.length + ' 个节点，栈顶是 ' + x,
        sn(0, 'done', null, '入栈成功', false, '节点数 ' + st.nodes.length));
      return { steps: steps, state: st };
    },
    render: function (kr, s) {
      if (!s) {
        kr.html('__t', S.text(500, 260, '栈（链表实现）：点击「入栈」或「按初始序列建栈」开始演示', 'vt'));
        kr.end(); return;
      }
      kr.html('__t', S.text(500, 28, '栈（链表实现）：top 指向头结点，入栈 = 头插，出栈 = 头删', 'vt'));
      kr.html('__t2', S.text(500, 52, '当前节点数 size = ' + (s.nodes || []).length +
        '（演示上限 8 个节点）；箭头方向即 next 指针方向', 'vs'));
      var L = drawList(kr, s, { cy: 300 });
      drawPend(kr, s.pend, 150, 168, '新节点（尚未接入链表）');
      if (L.n > 0) {
        kr.g('__tp', 'translate(' + L.cxs[0] + ',0)', 'k',
          arrow(0, 210, 0, 274, 'hl', C_HL) + S.text(0, 196, 'top', 'ptr'));
      } else {
        kr.html('__tp', S.text(500, 300, 'top → null（空栈）', 'ptr'));
      }
      if (s.msg) { kr.html('__m', S.text(500, 420, s.msg, s.warn ? 'vwarn' : 'vs')); }
      if (s.sub) { kr.html('__s', S.text(500, 448, s.sub, 'vs')); }
      kr.end();
    }
  });

  /* ============================================================
     3. 队列（循环数组实现）
     ============================================================ */
  DSV.register({
    id: 'queue-array', name: '队列（循环数组）', category: '基础结构',
    desc: '用一段数组做成环：front 指向队首元素，rear 指向「下一个入队位置」，两个指针都按 (i+1) % capacity 环绕前进。入队、出队都是 O(1)，空间 O(capacity)；队满时入队会溢出，队空时出队会下溢。',
    viewBox: '0 0 1000 580',
    code: [
      'enqueue(x):',                               // 0
      '  if size == capacity:',                    // 1
      '    error "队满：无法入队"',                 // 2
      '  data[rear] = x',                          // 3
      '  // 循环队列：尾指针取模前进',              // 4
      '  rear = (rear + 1) % capacity',            // 5
      '  size = size + 1',                         // 6
      '',                                          // 7
      'dequeue():',                                // 8
      '  if size == 0:',                           // 9
      '    error "队空：无法出队"',                 // 10
      '  v = data[front]',                         // 11
      '  data[front] = null',                      // 12
      '  front = (front + 1) % capacity            // 取模前进',  // 13
      '  size = size - 1',                         // 14
      '  return v',                                // 15
      '',                                          // 16
      'front_val():',                              // 17
      '  if size == 0: error "队空"',              // 18
      '  return data[front]'                       // 19
    ],
    inputs: [IN_SEQ, IN_CAP],
    actions: [
      { key: 'enqueue', label: '入队', arg: { label: '值', def: '8' }, primary: true },
      { key: 'dequeue', label: '出队' },
      { key: 'peek', label: '查看队首' },
      { key: 'build', label: '按初始序列建队' },
      { key: 'clear', label: '清空队列' }
    ],
    samples: [
      { label: '示例：基本入队', values: { init: '3,1,4,1,5', cap: '6' } },
      { label: '示例：刚好装满（演示队满）', values: { init: '1,2,3,4,5,6', cap: '6' } },
      { label: '示例：字母入队', values: { init: 'a,b,c,d', cap: '8' } }
    ],
    random: function () { return { init: DSV.randArr(DSV.ri(4, 6), 1, 99).join(','), cap: String(DSV.ri(6, 8)) }; },
    run: function (v, action, st) {
      var cap = capOf(v, 3, 8);
      var a = (action && action.key) || 'enqueue';
      if (!st || st.cap !== cap) {
        st = { cap: cap, data: [], front: 0, rear: 0, size: 0 };
        for (var i = 0; i < cap; i++) { st.data.push(null); }
      }
      var steps = [];
      function sn(hi, hicls, msg, warn, sub) {
        var c = zeros(cap), i2;
        for (i2 = 0; i2 < cap; i2++) {
          c[i2] = (st.data[i2] === null || st.data[i2] === undefined) ? '' : 'done';
          if (hi != null && hi >= 0 && hi === i2) { c[i2] = hicls || 'active'; }
        }
        return {
          cap: cap, data: st.data.slice(), front: st.front, rear: st.rear, size: st.size,
          c: c, msg: msg || '', warn: !!warn, sub: sub || ''
        };
      }

      if (a === 'clear') {
        push(steps, [12], '清空队列：' + st.size + ' 个元素全部作废，front = rear = 0，size = 0',
          sn(-1, '', '准备清空', false, '元素个数 ' + st.size));
        for (var z = 0; z < cap; z++) { st.data[z] = null; }
        st.front = 0; st.rear = 0; st.size = 0;
        push(steps, [12], '清空完成：队列为空', sn(-1, '', '已清空', false, '元素个数 0'));
        return { steps: steps, state: st };
      }

      if (a === 'build') {
        var list = seq(v);
        for (var b = 0; b < cap; b++) { st.data[b] = null; }
        st.front = 0; st.rear = 0; st.size = 0;
        if (!list.length) {
          push(steps, [0], '初始序列为空，无法建队，请在「初始序列」中输入元素', sn(-1, '', '初始序列为空', true, '元素个数 0'));
          return { steps: steps, state: st };
        }
        push(steps, [0], '建队：清空数组后，按初始序列 [' + list.join(', ') + '] 依次入队', sn(-1, '', '开始建队', false, '元素个数 0'));
        for (var t = 0; t < list.length; t++) {
          if (st.size >= cap) {
            push(steps, [1, 2], 'size == capacity = ' + cap + '，队列已满，元素 ' + list[t] + ' 无法入队',
              sn(-1, '', '队满：容量 ' + cap + ' 不够', true, '元素个数 ' + st.size));
            break;
          }
          var pos = st.rear;
          st.data[pos] = list[t];
          st.rear = (st.rear + 1) % cap; st.size++;
          push(steps, [3, 5], '入队第 ' + (t + 1) + ' 个元素 ' + list[t] + '：data[' + pos + '] = ' + list[t] +
            '，rear 环绕到 ' + st.rear, sn(pos, 'swap', '放入 ' + list[t], false, '元素个数 ' + st.size));
        }
        push(steps, [6], '建队完成：队内共 ' + st.size + ' 个元素，队首是 ' +
          (st.size ? st.data[st.front] : '（空）'), sn(st.front, 'done', '建队完成', false, '元素个数 ' + st.size));
        return { steps: steps, state: st };
      }

      if (a === 'dequeue') {
        push(steps, [8], '准备出队：front = ' + st.front + '，rear = ' + st.rear + '，元素个数 size = ' + st.size,
          sn(st.front, 'active', '准备出队', false, '元素个数 ' + st.size));
        if (st.size === 0) {
          push(steps, [9, 10], 'size == 0，队列中没有元素，无法出队（下溢）',
            sn(-1, '', '队空：无法出队', true, '元素个数 0'));
          return { steps: steps, state: st };
        }
        var v1 = st.data[st.front], of = st.front;
        push(steps, [11], '取出队首：v = data[' + of + '] = ' + v1,
          sn(of, 'swap', '取出 ' + v1, false, '元素个数 ' + st.size));
        st.data[of] = null;
        st.front = (st.front + 1) % cap;
        st.size--;
        push(steps, [12, 13], '把 data[' + of + '] 置空，front 取模前进：(' + of + ' + 1) % ' + cap + ' = ' + st.front,
          sn(st.front, 'active', 'front → ' + st.front, false, '元素个数 ' + st.size));
        push(steps, [14, 15], '出队完成：队首元素 ' + v1 + ' 出队，剩余 ' + st.size + ' 个元素（先进先出 FIFO）',
          sn(st.size ? st.front : -1, 'done', '返回 ' + v1, false, '元素个数 ' + st.size));
        return { steps: steps, state: st };
      }

      if (a === 'peek') {
        push(steps, [17, 18], '查看队首：front = ' + st.front + '，size = ' + st.size,
          sn(st.front, 'active', '准备查看', false, '元素个数 ' + st.size));
        if (st.size === 0) {
          push(steps, [18], 'size == 0，队列为空，没有队首元素可看', sn(-1, '', '队空：peek 失败', true, '元素个数 0'));
          return { steps: steps, state: st };
        }
        push(steps, [19], '队首元素是 data[' + st.front + '] = ' + st.data[st.front] + '（只读取，不移动 front）',
          sn(st.front, 'path', '返回 ' + st.data[st.front], false, '元素个数 ' + st.size));
        return { steps: steps, state: st };
      }

      /* enqueue */
      var x = (action && action.arg != null) ? String(action.arg).trim() : '';
      if (x === '') { x = autoVal(); }
      push(steps, [0], '准备入队：元素 x = ' + x + '，front = ' + st.front + '，rear = ' + st.rear + '，size = ' + st.size,
        sn(st.rear, 'active', '准备入队 ' + x, false, '元素个数 ' + st.size));
      if (st.size >= cap) {
        push(steps, [1, 2], 'size = ' + st.size + ' 已等于 capacity = ' + cap + '，队列已满，入队失败（溢出）',
          sn(st.rear, 'swap', '队满：无法入队 ' + x, true, '元素个数 ' + st.size + ' / 容量 ' + cap));
        return { steps: steps, state: st };
      }
      var rp = st.rear;
      st.data[rp] = x;
      push(steps, [3], '写入队尾：data[rear] = data[' + rp + '] = ' + x,
        sn(rp, 'swap', '写入 data[' + rp + ']', false, '元素个数 ' + (st.size + 1)));
      st.rear = (st.rear + 1) % cap;
      push(steps, [5], '尾指针取模前进：rear = (' + rp + ' + 1) % ' + cap + ' = ' + st.rear +
        (st.rear === 0 ? '（绕过数组末尾回到下标 0，这就是「循环」）' : ''),
        sn(st.rear, 'active', 'rear → ' + st.rear, false, '元素个数 ' + (st.size + 1)));
      st.size++;
      push(steps, [6], '入队完成：' + x + ' 进入队尾，队内共 ' + st.size + ' 个元素（先进先出 FIFO）',
        sn(rp, 'done', '入队成功', false, '元素个数 ' + st.size));
      return { steps: steps, state: st };
    },
    render: function (kr, s) {
      if (!s) {
        kr.html('__t', S.text(500, 260, '队列（循环数组）：点击「入队」或「按初始序列建队」开始演示', 'vt'));
        kr.end(); return;
      }
      var cap = s.cap, R = 110, cs = 44, cx = 500, cy = 250, i;
      kr.html('__t', S.text(500, 28, '循环队列（数组实现）：容量 capacity = ' + cap + '，元素个数 size = ' + s.size, 'vt'));
      kr.html('__t2', S.text(500, 50, 'front 指向队首元素，rear 指向下一个入队位置；两个指针都按 (i+1) % capacity 环绕', 'vs'));
      kr.html('__ring', '<circle class="frame dash" cx="500" cy="250" r="' + R + '"/>');
      kr.html('__c1', S.text(500, 232, '元素个数 size = ' + s.size, 'ptr'));
      kr.html('__c2', S.text(500, 270, '容量 = ' + cap + (s.size === cap ? '（队满）' : (s.size === 0 ? '（队空）' : '')) +
        '　入队方向 ↻', 'vs'));

      for (i = 0; i < cap; i++) {
        var ang = (-90 + i * (360 / cap)) * Math.PI / 180;
        var px = cx + R * Math.cos(ang), py = cy + R * Math.sin(ang);
        var val = s.data[i];
        kr.g('q' + i, 'translate(' + px.toFixed(1) + ',' + py.toFixed(1) + ')', 'k',
          '<rect class="cell ' + (s.c[i] || '') + '" x="' + (-cs / 2) + '" y="' + (-cs / 2) + '" width="' + cs + '" height="' + cs + '" rx="5"/>' +
          S.text(0, 0, (val === null || val === undefined) ? '·' : val, 'cell-txt') +
          S.text(0, cs / 2 + 10, i, 'idx-txt'));
      }

      function ptrAt(idx, label, key, color) {
        var a2 = (-90 + idx * (360 / cap)) * Math.PI / 180;
        var ux = Math.cos(a2), uy = Math.sin(a2);
        var sIn = R + cs / 2 + 5, sOut = R + cs / 2 + 30, sLab = R + cs / 2 + 42;
        kr.html(key, arrow(cx + ux * sOut, cy + uy * sOut, cx + ux * sIn, cy + uy * sIn, 'hl', color) +
          S.text(cx + ux * sLab, cy + uy * sLab, label, 'ptr'));
      }
      ptrAt(s.front, 'front', '__pf', C_HL);
      ptrAt(s.rear, 'rear', '__pr', C_HL);

      if (s.size > 0) {
        kr.html('__lt', S.text(500, 466, '逻辑顺序（出队顺序：队首 → 队尾）', 'vs'));
        var cw2 = 46, tot = s.size * cw2, xb = (1000 - tot) / 2, t;
        for (t = 0; t < s.size; t++) {
          var ix = (s.front + t) % cap;
          kr.g('lg' + t, 'translate(' + (xb + t * cw2 + cw2 / 2) + ',494)', 'k',
            '<rect class="cell done" x="-20" y="-15" width="40" height="30" rx="4"/>' +
            S.text(0, 0, s.data[ix], 'cell-txt') +
            S.text(0, 25, (t === 0 ? '队首' : (t === s.size - 1 ? '队尾' : '')), 'ptr'));
        }
      } else {
        kr.html('__lt', S.text(500, 480, '（队列为空：front 与 rear 重合，没有元素）', 'vs'));
      }
      if (s.msg) { kr.html('__m', S.text(500, 546, s.msg, s.warn ? 'vwarn' : 'vs')); }
      if (s.sub) { kr.html('__s', S.text(500, 568, s.sub, 'vs')); }
      kr.end();
    }
  });

  /* ============================================================
     4. 队列（链表实现）
     ============================================================ */
  DSV.register({
    id: 'queue-ll', name: '队列（链表实现）', category: '基础结构',
    desc: '用单链表实现队列：head 指向队首（出队端），tail 指向队尾（入队端）。入队是「尾插」，出队是「头删」，两个操作都是 O(1)，空间 O(n)，没有容量上限（这里为方便演示限制 8 个节点）。',
    code: [
      'enqueue(x):',                               // 0
      '  N = new Node(x)',                         // 1
      '  if tail == null: head = tail = N          // 空队时首尾都指向 N',  // 2
      '  else: tail.next = N; tail = N',           // 3
      '  size = size + 1',                         // 4
      '',                                          // 5
      'dequeue():',                                // 6
      '  if head == null: error "队空：无法出队"',  // 7
      '  v = head.val',                            // 8
      '  head = head.next                          // 头删',              // 9
      '  if head == null: tail = null              // 队变空时尾指针复位', // 10
      '  size = size - 1',                         // 11
      '  return v'                                 // 12
    ],
    inputs: [IN_SEQ],
    actions: [
      { key: 'enqueue', label: '入队', arg: { label: '值', def: '6' }, primary: true },
      { key: 'dequeue', label: '出队' },
      { key: 'build', label: '按初始序列建队' },
      { key: 'clear', label: '清空队列' }
    ],
    samples: [
      { label: '示例：数字入队', values: { init: '3,1,4,1,5' } },
      { label: '示例：字母入队', values: { init: 'a,b,c,d' } },
      { label: '示例：两个元素', values: { init: '10,20' } }
    ],
    random: function () { return { init: DSV.randArr(DSV.ri(3, 5), 1, 99).join(',') }; },
    run: function (v, action, st) {
      var MAX = 8, a = (action && action.key) || 'enqueue';
      if (!st || !st.nodes) { st = { nodes: [], seq: 0 }; }
      var steps = [];
      function sn(hi, hicls, pend, msg, warn, sub) {
        var c = zeros(st.nodes.length), i;
        for (i = 0; i < c.length; i++) { c[i] = (hi === i) ? (hicls || 'active') : 'done'; }
        return {
          nodes: st.nodes.map(function (nd) { return { id: nd.id, v: nd.v }; }),
          c: c, pend: pend || null, msg: msg || '', warn: !!warn, sub: sub || ''
        };
      }

      if (a === 'clear') {
        push(steps, [9, 10], '清空队列：head 与 tail 都改为 null，' + st.nodes.length + ' 个节点全部释放',
          sn(-1, '', null, '准备清空', false, '节点数 ' + st.nodes.length));
        st.nodes = [];
        push(steps, [9, 10], '清空完成：链表为空，head = tail = null', sn(-1, '', null, '已清空', false, '节点数 0'));
        return { steps: steps, state: st };
      }

      if (a === 'build') {
        var list = seq(v);
        st.nodes = [];
        if (!list.length) {
          push(steps, [0], '初始序列为空，无法建队，请在「初始序列」中输入元素', sn(-1, '', null, '初始序列为空', true, '节点数 0'));
          return { steps: steps, state: st };
        }
        push(steps, [0], '建队：清空链表后，按初始序列 [' + list.join(', ') + '] 依次尾插', sn(-1, '', null, '开始建队', false, '节点数 0'));
        for (var t = 0; t < list.length; t++) {
          if (st.nodes.length >= MAX) {
            push(steps, [0], '演示上限：链表最多展示 ' + MAX + ' 个节点，' + list[t] + ' 不再入队',
              sn(-1, '', null, '已达演示上限 ' + MAX + ' 个节点', true, '节点数 ' + st.nodes.length));
            break;
          }
          var nid = ++st.seq;
          st.nodes.push({ id: nid, v: list[t] });
          push(steps, [1, 3], '尾插第 ' + (t + 1) + ' 个元素 ' + list[t] + '：原尾结点 next 指向 N' + nid + '，tail 改指向 N' + nid,
            sn(st.nodes.length - 1, 'active', null, '入队 ' + list[t], false, '节点数 ' + st.nodes.length));
        }
        push(steps, [4], '建队完成：链上共 ' + st.nodes.length + ' 个节点，队首是 ' +
          (st.nodes.length ? st.nodes[0].v : '（空）') + '，队尾是 ' +
          (st.nodes.length ? st.nodes[st.nodes.length - 1].v : '（空）'), sn(0, 'done', null, '建队完成', false, '节点数 ' + st.nodes.length));
        return { steps: steps, state: st };
      }

      if (a === 'dequeue') {
        push(steps, [6], '准备出队：head 指向 ' + (st.nodes.length ? '节点 N' + st.nodes[0].id : 'null') +
          '，链上 ' + st.nodes.length + ' 个节点', sn(0, 'active', null, '准备出队', false, '节点数 ' + st.nodes.length));
        if (!st.nodes.length) {
          push(steps, [7], 'head == null（队列为空），没有队首元素，出队失败',
            sn(-1, '', null, '队空：无法出队', true, '节点数 0'));
          return { steps: steps, state: st };
        }
        var head = st.nodes[0], v1 = head.v;
        push(steps, [8], '读取队首：v = head.val = N' + head.id + '.val = ' + v1,
          sn(0, 'swap', null, '取出 ' + v1, false, '节点数 ' + st.nodes.length));
        var nextId = st.nodes.length > 1 ? ('N' + st.nodes[1].id) : 'null';
        st.nodes.shift();
        push(steps, [9], '头删：head 改指向原队首的后继 ' + nextId + '，节点 N' + head.id + ' 出队',
          sn(st.nodes.length ? 0 : -1, 'active', null, '删除头结点', false, '节点数 ' + st.nodes.length));
        if (!st.nodes.length) {
          push(steps, [10], '删除后链表变空，tail 也必须复位为 null（否则 tail 会指向已删除的节点）',
            sn(-1, '', null, 'tail → null', false, '节点数 0'));
        }
        push(steps, [11, 12], '出队完成：队首元素 ' + v1 + ' 出队，剩余 ' + st.nodes.length + ' 个节点（先进先出 FIFO）',
          sn(st.nodes.length ? 0 : -1, 'done', null, '返回 ' + v1, false, '节点数 ' + st.nodes.length));
        return { steps: steps, state: st };
      }

      /* enqueue */
      var x = (action && action.arg != null) ? String(action.arg).trim() : '';
      if (x === '') { x = autoVal(); }
      push(steps, [0], '准备入队：元素 x = ' + x + '，当前链上 ' + st.nodes.length + ' 个节点',
        sn(-1, '', null, '准备入队 ' + x, false, '节点数 ' + st.nodes.length));
      if (st.nodes.length >= MAX) {
        push(steps, [0], '演示上限：链表最多展示 ' + MAX + ' 个节点，请先出队再入队',
          sn(-1, '', null, '已达演示上限 ' + MAX + ' 个节点', true, '节点数 ' + st.nodes.length));
        return { steps: steps, state: st };
      }
      var id = ++st.seq;
      push(steps, [1], '创建新节点 N' + id + '（值 = ' + x + '），准备挂到链表尾部',
        sn(-1, '', { id: id, v: x }, '新建节点 N' + id, false, '节点数 ' + st.nodes.length));
      if (!st.nodes.length) {
        push(steps, [2], '当前队列为空：head 与 tail 同时指向新节点 N' + id,
          sn(-1, '', { id: id, v: x }, '空队：head = tail = N' + id, false, '节点数 ' + st.nodes.length));
        st.nodes.push({ id: id, v: x });
        push(steps, [3], 'N' + id + ' 成为唯一的节点，既是队首也是队尾，它的 next 为 null',
          sn(0, 'active', null, '入队成功', false, '节点数 ' + st.nodes.length));
      } else {
        var lastId = 'N' + st.nodes[st.nodes.length - 1].id;
        push(steps, [3], '把原尾结点 ' + lastId + ' 的 next 指向新节点 N' + id + '（尾插）',
          sn(st.nodes.length - 1, 'compare', { id: id, v: x }, '连接 next', false, '节点数 ' + st.nodes.length));
        st.nodes.push({ id: id, v: x });
        push(steps, [3], 'tail 指针改指向新节点 N' + id + '，它成为新的队尾',
          sn(st.nodes.length - 1, 'active', null, 'tail → N' + id, false, '节点数 ' + st.nodes.length));
      }
      push(steps, [4], '入队完成：链上共 ' + st.nodes.length + ' 个节点，队首 ' + st.nodes[0].v +
        '，队尾 ' + x, sn(st.nodes.length - 1, 'done', null, '入队成功', false, '节点数 ' + st.nodes.length));
      return { steps: steps, state: st };
    },
    render: function (kr, s) {
      if (!s) {
        kr.html('__t', S.text(500, 260, '队列（链表实现）：点击「入队」或「按初始序列建队」开始演示', 'vt'));
        kr.end(); return;
      }
      kr.html('__t', S.text(500, 28, '队列（链表实现）：head 指向队首（出队端），tail 指向队尾（入队端）', 'vt'));
      kr.html('__t2', S.text(500, 52, '当前节点数 size = ' + (s.nodes || []).length +
        '（演示上限 8 个节点）；入队尾插、出队头删，先进先出 FIFO', 'vs'));
      var L = drawList(kr, s, { cy: 300 });
      drawPend(kr, s.pend, 840, 168, '新节点（尚未接入链表）');
      if (L.n > 0) {
        kr.g('__ph', 'translate(' + L.cxs[0] + ',0)', 'k',
          arrow(0, 210, 0, 274, 'hl', C_HL) + S.text(0, 196, 'head', 'ptr'));
        kr.g('__ptl', 'translate(' + L.cxs[L.n - 1] + ',0)', 'k',
          arrow(0, 390, 0, 328, 'hl', C_HL) + S.text(0, 406, 'tail', 'ptr'));
      } else {
        kr.html('__ph', S.text(500, 300, 'head → null　tail → null（空队列）', 'ptr'));
      }
      if (s.msg) { kr.html('__m', S.text(500, 440, s.msg, s.warn ? 'vwarn' : 'vs')); }
      if (s.sub) { kr.html('__s', S.text(500, 466, s.sub, 'vs')); }
      kr.end();
    }
  });

})();
