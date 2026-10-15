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

  /* ============================================================
     5. 单链表（状态式）
     ============================================================ */
  var ACT_RUN = [{ key: 'run', label: '开始演示', primary: true }];

  /** 双向链表渲染：节点方框 + next（上箭头）/prev（下箭头）双向连线 */
  function drawDLL(kr, nodes, c, cy) {
    var n = nodes.length, bw = 86, gap = 50, pitch = bw + gap;
    var total = n > 0 ? (n * bw + (n - 1) * gap) : 0;
    var x0 = (1000 - total) / 2, i;
    var cxs = [];
    for (i = 0; i < n; i++) { cxs.push(x0 + i * pitch + bw / 2); }
    for (i = 0; i < n - 1; i++) {
      var sx = cxs[i] + bw / 2 + 2, ex = cxs[i + 1] - bw / 2 - 10;
      kr.html('f' + i, arrow(sx, cy - 8, ex, cy - 8, '', C_EDGE) + S.text((sx + ex) / 2, cy - 22, 'next', 'tag'));
      kr.html('b' + i, arrow(ex, cy + 12, sx, cy + 12, '', C_EDGE) + S.text((sx + ex) / 2, cy + 28, 'prev', 'tag'));
    }
    if (n > 0) {
      kr.html('enull', arrow(cxs[0] - bw / 2 - 2, cy, cxs[0] - bw / 2 - 22, cy, '', C_EDGE) +
        S.text(cxs[0] - bw / 2 - 30, cy + 4, 'null', 'tag'));
      kr.html('dnull', arrow(cxs[n - 1] + bw / 2 + 2, cy, cxs[n - 1] + bw / 2 + 22, cy, '', C_EDGE) +
        S.text(cxs[n - 1] + bw / 2 + 30, cy + 4, 'null', 'tag'));
    }
    for (i = 0; i < n; i++) {
      kr.g('n' + nodes[i].id, 'translate(' + cxs[i] + ',' + cy + ')', 'k',
        nodeBox(nodes[i].v, c[i] || '', nodes[i].id, bw));
    }
    return { cxs: cxs, bw: bw, n: n, cy: cy };
  }

  DSV.register({
    id: 'bas-sll', name: '单链表', category: '基础结构',
    desc: '用一组不连续的节点存储元素，每个节点除数据外还有一个 next 指针指向后继，末尾节点 next 为 null。按值查找 O(n)、尾插 O(1)（有尾指针时）、删除 O(n)，空间 O(n)，但不需要连续内存。',
    code: [
      'build(list):',                              // 0
      '  head = null; tail = null',                 // 1
      '  for x in list: append(x)',                // 2
      '',                                          // 3
      'append(x):',                                // 4
      '  N = new Node(x)',                         // 5
      '  if tail: tail.next = N',                  // 6
      '  tail = N; if !head: head = N',            // 7
      '',                                          // 8
      'traverse():',                               // 9
      '  p = head; while p: visit(p); p = p.next',  // 10
      '',                                          // 11
      'delete(v):',                                // 12
      '  从 head 找第一个值为 v 的节点并摘除'        // 13
    ],
    inputs: [IN_SEQ],
    actions: [
      { key: 'build', label: '按初始序列建表', primary: true },
      { key: 'traverse', label: '遍历' },
      { key: 'append', label: '尾插', arg: { label: '值', def: '9' } },
      { key: 'delete', label: '按值删除', arg: { label: '值', def: '3' } },
      { key: 'clear', label: '清空链表' }
    ],
    samples: [
      { label: '示例：数字序列', values: { init: '3,1,4,1,5' } },
      { label: '示例：字母序列', values: { init: 'a,b,c,d' } }
    ],
    random: function () { return { init: DSV.randArr(DSV.ri(3, 5), 1, 99).join(',') }; },
    run: function (v, action, st) {
      var MAX = 8, a = (action && action.key) || 'build';
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
        push(steps, [0], '清空链表：head 与 tail 都置 null，' + st.nodes.length + ' 个节点全部释放',
          sn(-1, '', null, '准备清空', false, '节点数 ' + st.nodes.length));
        st.nodes = [];
        push(steps, [0], '清空完成：链表为空', sn(-1, '', null, '已清空', false, '节点数 0'));
        return { steps: steps, state: st };
      }

      if (a === 'build') {
        var list = seq(v);
        st.nodes = [];
        if (!list.length) {
          push(steps, [0], '初始序列为空，无法建表，请在「初始序列」中输入元素', sn(-1, '', null, '初始序列为空', true, '节点数 0'));
          return { steps: steps, state: st };
        }
        push(steps, [0, 1], '建表：head = tail = null，然后按初始序列 [' + list.join(', ') + '] 依次尾插',
          sn(-1, '', null, '开始建表', false, '节点数 0'));
        for (var t = 0; t < list.length; t++) {
          if (st.nodes.length >= MAX) {
            push(steps, [4], '演示上限：最多展示 ' + MAX + ' 个节点，' + list[t] + ' 不再插入',
              sn(-1, '', null, '已达演示上限 ' + MAX + ' 个节点', true, '节点数 ' + st.nodes.length));
            break;
          }
          var nid = ++st.seq;
          st.nodes.push({ id: nid, v: list[t] });
          push(steps, [5, 6, 7], '尾插第 ' + (t + 1) + ' 个元素 ' + list[t] + '：创建 N' + nid +
            '，原尾结点 next 指向它，tail 移到 N' + nid,
            sn(st.nodes.length - 1, 'active', null, '尾插 ' + list[t], false, '节点数 ' + st.nodes.length));
        }
        push(steps, [7], '建表完成：共 ' + st.nodes.length + ' 个节点，head → N' +
          (st.nodes.length ? st.nodes[0].id : 'null'), sn(0, 'done', null, '建表完成', false, '节点数 ' + st.nodes.length));
        return { steps: steps, state: st };
      }

      if (a === 'traverse') {
        push(steps, [9], '开始遍历：p = head，逐个访问节点直到 p == null',
          sn(0, 'active', null, '准备遍历', false, '节点数 ' + st.nodes.length));
        if (!st.nodes.length) {
          push(steps, [10], 'head == null，链表为空，遍历直接结束', sn(-1, '', null, '空链表', false, '节点数 0'));
          return { steps: steps, state: st };
        }
        for (var i = 0; i < st.nodes.length; i++) {
          push(steps, [10], '访问第 ' + (i + 1) + ' 个节点：N' + st.nodes[i].id + '.val = ' + st.nodes[i].v +
            (i < st.nodes.length - 1 ? '，p = p.next 继续' : '，p == null，遍历结束'),
            sn(i, 'active', null, '访问 N' + st.nodes[i].id, false, '节点数 ' + st.nodes.length));
        }
        push(steps, [10], '遍历完成：共访问 ' + st.nodes.length + ' 个节点',
          sn(-1, '', null, '遍历完成', false, '节点数 ' + st.nodes.length));
        return { steps: steps, state: st };
      }

      if (a === 'append') {
        var x = (action && action.arg != null) ? String(action.arg).trim() : '';
        if (x === '') { x = autoVal(); }
        if (st.nodes.length >= MAX) {
          push(steps, [4], '演示上限：最多 ' + MAX + ' 个节点，请先删除再插入',
            sn(-1, '', null, '已达演示上限', true, '节点数 ' + st.nodes.length));
          return { steps: steps, state: st };
        }
        var id = ++st.seq;
        push(steps, [5], '创建新节点 N' + id + '（值 = ' + x + '）',
          sn(-1, '', { id: id, v: x }, '新建 N' + id, false, '节点数 ' + st.nodes.length));
        if (!st.nodes.length) {
          push(steps, [7], '链表为空：head 与 tail 同时指向 N' + id,
            sn(-1, '', { id: id, v: x }, '空表：head = tail = N' + id, false, '节点数 0'));
          st.nodes.push({ id: id, v: x });
          push(steps, [7], 'N' + id + ' 成为唯一节点，next = null',
            sn(0, 'active', null, '尾插成功', false, '节点数 1'));
        } else {
          var lastId = 'N' + st.nodes[st.nodes.length - 1].id;
          push(steps, [6], '把原尾结点 ' + lastId + ' 的 next 指向新节点 N' + id,
            sn(st.nodes.length - 1, 'compare', { id: id, v: x }, '连接 next', false, '节点数 ' + st.nodes.length));
          st.nodes.push({ id: id, v: x });
          push(steps, [7], 'tail 指针改指向 N' + id + '，它成为新的尾结点',
            sn(st.nodes.length - 1, 'active', null, 'tail → N' + id, false, '节点数 ' + st.nodes.length));
        }
        push(steps, [7], '尾插完成：链表共 ' + st.nodes.length + ' 个节点',
          sn(st.nodes.length - 1, 'done', null, '尾插成功', false, '节点数 ' + st.nodes.length));
        return { steps: steps, state: st };
      }

      /* delete */
      var dv = (action && action.arg != null) ? String(action.arg).trim() : '';
      if (dv === '') { dv = autoVal(); }
      push(steps, [12], '按值删除：从 head 开始找第一个值为 ' + dv + ' 的节点',
        sn(0, 'active', null, '准备删除 ' + dv, false, '节点数 ' + st.nodes.length));
      if (!st.nodes.length) {
        push(steps, [13], '链表为空，没有节点可删', sn(-1, '', null, '空链表', true, '节点数 0'));
        return { steps: steps, state: st };
      }
      var found = -1;
      for (var j = 0; j < st.nodes.length; j++) {
        if (String(st.nodes[j].v) === dv) { found = j; break; }
      }
      if (found < 0) {
        push(steps, [13], '遍历完整条链表都没找到值为 ' + dv + ' 的节点，删除失败',
          sn(-1, '', null, '未找到 ' + dv, true, '节点数 ' + st.nodes.length));
        return { steps: steps, state: st };
      }
      var delNode = st.nodes[found];
      push(steps, [13], '找到目标：N' + delNode.id + '（值 ' + dv + '）在位置 ' + (found + 1) +
        '，摘除它并把前后节点的指针连上',
        sn(found, 'swap', null, '摘除 N' + delNode.id, false, '节点数 ' + st.nodes.length));
      st.nodes.splice(found, 1);
      push(steps, [13], '删除完成：N' + delNode.id + ' 已从链上移除，剩余 ' + st.nodes.length + ' 个节点',
        sn(Math.max(0, found - 1), 'done', null, '已删除 ' + dv, false, '节点数 ' + st.nodes.length));
      return { steps: steps, state: st };
    },
    render: function (kr, s) {
      if (!s) {
        kr.html('__t', S.text(500, 260, '单链表：点击「按初始序列建表」开始演示', 'vt'));
        kr.end(); return;
      }
      kr.html('__t', S.text(500, 28, '单链表：head 指向第一个节点，每个节点 next 指向下一个，末尾 next = null', 'vt'));
      kr.html('__t2', S.text(500, 52, '当前节点数 size = ' + (s.nodes || []).length + '（演示上限 8 个）', 'vs'));
      var L = drawList(kr, s, { cy: 300 });
      drawPend(kr, s.pend, 150, 168, '新节点（尚未接入）');
      if (L.n > 0) {
        kr.g('__ph', 'translate(' + L.cxs[0] + ',0)', 'k',
          arrow(0, 210, 0, 274, 'hl', C_HL) + S.text(0, 196, 'head', 'ptr'));
      } else {
        kr.html('__ph', S.text(500, 300, 'head → null（空链表）', 'ptr'));
      }
      if (s.msg) { kr.html('__m', S.text(500, 420, s.msg, s.warn ? 'vwarn' : 'vs')); }
      if (s.sub) { kr.html('__s', S.text(500, 448, s.sub, 'vs')); }
      kr.end();
    }
  });

  /* ============================================================
     6. 双向链表（状态式）
     ============================================================ */
  DSV.register({
    id: 'bas-dll', name: '双向链表', category: '基础结构',
    desc: '每个节点除数据外有 prev（前驱）和 next（后继）两个指针，首尾节点的外侧指针指向 null。可以从两端遍历；插入、删除在已知位置时 O(1)，按值查找 O(n)。空间比单链表多一个指针。',
    code: [
      'build(list):',                              // 0
      '  head = tail = null',                      // 1
      '  for x in list: append(x)',                // 2
      '',                                         // 3
      'append(x):',                               // 4
      '  N = new Node(x)',                         // 5
      '  N.prev = tail',                           // 6
      '  if tail: tail.next = N',                 // 7
      '  tail = N; if !head: head = N',           // 8
      '',                                         // 9
      'delete(v):',                               // 10
      '  找到值为 v 的节点 p',                     // 11
      '  p.prev.next = p.next',                    // 12
      '  p.next.prev = p.prev'                     // 13
    ],
    inputs: [IN_SEQ],
    actions: [
      { key: 'build', label: '按初始序列建表', primary: true },
      { key: 'append', label: '尾插', arg: { label: '值', def: '9' } },
      { key: 'delete', label: '按值删除', arg: { label: '值', def: '3' } },
      { key: 'clear', label: '清空链表' }
    ],
    samples: [
      { label: '示例：数字序列', values: { init: '3,1,4,1,5' } },
      { label: '示例：字母序列', values: { init: 'a,b,c,d' } }
    ],
    random: function () { return { init: DSV.randArr(DSV.ri(3, 5), 1, 99).join(',') }; },
    run: function (v, action, st) {
      var MAX = 8, a = (action && action.key) || 'build';
      if (!st || !st.nodes) { st = { nodes: [], seq: 0 }; }
      var steps = [];
      function sn(hi, hicls, msg, warn, sub) {
        var c = zeros(st.nodes.length), i;
        for (i = 0; i < c.length; i++) { c[i] = (hi === i) ? (hicls || 'active') : 'done'; }
        return {
          nodes: st.nodes.map(function (nd) { return { id: nd.id, v: nd.v }; }),
          c: c, msg: msg || '', warn: !!warn, sub: sub || ''
        };
      }

      if (a === 'clear') {
        push(steps, [0], '清空双向链表：head 与 tail 置 null，' + st.nodes.length + ' 个节点全部释放',
          sn(-1, '', '准备清空', false, '节点数 ' + st.nodes.length));
        st.nodes = [];
        push(steps, [0], '清空完成：链表为空', sn(-1, '', '已清空', false, '节点数 0'));
        return { steps: steps, state: st };
      }

      if (a === 'build') {
        var list = seq(v);
        st.nodes = [];
        if (!list.length) {
          push(steps, [0], '初始序列为空，无法建表', sn(-1, '', '初始序列为空', true, '节点数 0'));
          return { steps: steps, state: st };
        }
        push(steps, [0, 1], '建表：head = tail = null，按 [' + list.join(', ') + '] 依次尾插',
          sn(-1, '', '开始建表', false, '节点数 0'));
        for (var t = 0; t < list.length; t++) {
          if (st.nodes.length >= MAX) {
            push(steps, [4], '演示上限：最多 ' + MAX + ' 个节点', sn(-1, '', '已达上限', true, '节点数 ' + st.nodes.length));
            break;
          }
          var nid = ++st.seq;
          st.nodes.push({ id: nid, v: list[t] });
          push(steps, [5, 6, 7, 8], '尾插 ' + list[t] + '：N' + nid + '.prev 指向原尾结点，原尾结点.next 指向 N' + nid +
            '，tail 移到 N' + nid, sn(st.nodes.length - 1, 'active', '尾插 ' + list[t], false, '节点数 ' + st.nodes.length));
        }
        push(steps, [8], '建表完成：共 ' + st.nodes.length + ' 个节点', sn(0, 'done', '建表完成', false, '节点数 ' + st.nodes.length));
        return { steps: steps, state: st };
      }

      if (a === 'append') {
        var x = (action && action.arg != null) ? String(action.arg).trim() : '';
        if (x === '') { x = autoVal(); }
        if (st.nodes.length >= MAX) {
          push(steps, [4], '演示上限：最多 ' + MAX + ' 个节点', sn(-1, '', '已达上限', true, '节点数 ' + st.nodes.length));
          return { steps: steps, state: st };
        }
        var id = ++st.seq;
        push(steps, [5], '创建新节点 N' + id + '（值 = ' + x + '）',
          sn(-1, '', '新建 N' + id, false, '节点数 ' + st.nodes.length));
        if (!st.nodes.length) {
          push(steps, [8], '链表为空：head = tail = N' + id, sn(-1, '', '空表', false, '节点数 0'));
          st.nodes.push({ id: id, v: x });
        } else {
          push(steps, [6, 7], 'N' + id + '.prev 指向原尾结点，原尾结点.next 指向 N' + id,
            sn(st.nodes.length - 1, 'compare', '连接双向指针', false, '节点数 ' + st.nodes.length));
          st.nodes.push({ id: id, v: x });
        }
        push(steps, [8], 'tail 移到 N' + id + '，尾插完成',
          sn(st.nodes.length - 1, 'done', '尾插成功', false, '节点数 ' + st.nodes.length));
        return { steps: steps, state: st };
      }

      /* delete */
      var dv = (action && action.arg != null) ? String(action.arg).trim() : '';
      if (dv === '') { dv = autoVal(); }
      push(steps, [10], '按值删除：找第一个值为 ' + dv + ' 的节点',
        sn(0, 'active', '准备删除 ' + dv, false, '节点数 ' + st.nodes.length));
      if (!st.nodes.length) {
        push(steps, [11], '链表为空', sn(-1, '', '空链表', true, '节点数 0'));
        return { steps: steps, state: st };
      }
      var found = -1;
      for (var j = 0; j < st.nodes.length; j++) {
        if (String(st.nodes[j].v) === dv) { found = j; break; }
      }
      if (found < 0) {
        push(steps, [11], '未找到值为 ' + dv + ' 的节点', sn(-1, '', '未找到', true, '节点数 ' + st.nodes.length));
        return { steps: steps, state: st };
      }
      var delNode = st.nodes[found];
      push(steps, [11, 12, 13], '找到 N' + delNode.id + '（值 ' + dv + '）在位置 ' + (found + 1) +
        '：把它的前驱.next 接到后继、后继.prev 接到前驱，绕过 N' + delNode.id,
        sn(found, 'swap', '摘除 N' + delNode.id, false, '节点数 ' + st.nodes.length));
      st.nodes.splice(found, 1);
      push(steps, [13], '删除完成：剩余 ' + st.nodes.length + ' 个节点',
        sn(Math.max(0, found - 1), 'done', '已删除 ' + dv, false, '节点数 ' + st.nodes.length));
      return { steps: steps, state: st };
    },
    render: function (kr, s) {
      if (!s) {
        kr.html('__t', S.text(500, 260, '双向链表：点击「按初始序列建表」开始演示', 'vt'));
        kr.end(); return;
      }
      kr.html('__t', S.text(500, 28, '双向链表：每个节点有 prev（下箭头）和 next（上箭头）两个指针', 'vt'));
      kr.html('__t2', S.text(500, 52, '当前节点数 size = ' + (s.nodes || []).length + '（演示上限 8 个）', 'vs'));
      var L = drawDLL(kr, s.nodes || [], s.c || [], 300);
      if (L.n > 0) {
        kr.g('__ph', 'translate(' + L.cxs[0] + ',0)', 'k',
          arrow(0, 210, 0, 274, 'hl', C_HL) + S.text(0, 196, 'head', 'ptr'));
      } else {
        kr.html('__ph', S.text(500, 300, 'head → null（空链表）', 'ptr'));
      }
      if (s.msg) { kr.html('__m', S.text(500, 420, s.msg, s.warn ? 'vwarn' : 'vs')); }
      if (s.sub) { kr.html('__s', S.text(500, 448, s.sub, 'vs')); }
      kr.end();
    }
  });

  /* ============================================================
     7. 中缀表达式转后缀（调度场算法）
     ============================================================ */
  DSV.register({
    id: 'bas-infix-post', name: '中缀转后缀（栈）', category: '基础结构',
    desc: 'Dijkstra 调度场算法：从左到右扫描中缀表达式，操作数直接输出；运算符与栈顶比较优先级，栈顶优先级更高或相等且左结合时弹出输出；遇右括号弹出到左括号。最终后缀表达式只需一个栈即可求值。时间 O(n)，空间 O(n)。',
    viewBox: '0 0 1000 600',
    code: [
      'toPostfix(expr):',                          // 0
      '  for token in expr:',                      // 1
      '    if 操作数: 输出 token',                  // 2
      "    if '(': 压栈",                           // 3
      "    if ')': 弹出直到 '('",                   // 4
      '    if 运算符 op:',                          // 5
      '      while 栈顶优先级 ≥ op: 弹出输出',        // 6
      '      压入 op',                               // 7
      '  最后把栈全部弹出输出'                        // 8
    ],
    inputs: [{ key: 'expr', label: '中缀表达式', def: 'a+b*c-d', hint: '如 a+b*c 或 (a+b)*c，支持 + - * / ^' }],
    actions: ACT_RUN,
    samples: [
      { label: '示例：a+b*c-d', values: { expr: 'a+b*c-d' } },
      { label: '示例：(a+b)*(c-d)', values: { expr: '(a+b)*(c-d)' } },
      { label: '示例：a^b/c', values: { expr: 'a^b/c' } }
    ],
    random: function () {
      var ops = ['+', '-', '*', '/'], out = ['a'];
      var n = DSV.ri(3, 5);
      for (var i = 0; i < n; i++) {
        out.push(ops[DSV.ri(0, ops.length - 1)]);
        out.push(String.fromCharCode(97 + DSV.ri(0, 5)));
      }
      return { expr: out.join('') };
    },
    run: function (v) {
      var expr = String(v.expr == null ? '' : v.expr).replace(/\s+/g, '');
      var st = [];
      if (!expr) {
        return [{ code: [0], desc: '表达式为空，请输入中缀表达式，如 a+b*c',
          snap: { tokens: [], tcls: [], pos: -1, opStack: [], output: [], msg: '空输入', warn: true } }];
      }
      var tokens = [], i;
      for (i = 0; i < expr.length; i++) {
        var ch = expr[i];
        if (/[a-zA-Z0-9]/.test(ch)) { tokens.push({ t: ch, k: 'opd' }); }
        else if ('+-*/^()'.indexOf(ch) >= 0) { tokens.push({ t: ch, k: ch }); }
      }
      function prec(op) { return op === '^' ? 4 : (op === '*' || op === '/' ? 3 : (op === '+' || op === '-' ? 2 : 0)); }
      function leftAssoc(op) { return op !== '^'; }

      var opStack = [], output = [], tcls = [];
      for (i = 0; i < tokens.length; i++) { tcls.push(''); }

      function snap(pos, msg, warn) {
        return {
          tokens: tokens.map(function (tk) { return tk.t; }),
          tcls: tcls.slice(), pos: pos,
          opStack: opStack.slice(), output: output.slice(),
          msg: msg || '', warn: !!warn
        };
      }

      push(st, [0], '开始扫描中缀表达式：' + expr + '，共 ' + tokens.length + ' 个 token。操作数直接输出，运算符压栈',
        snap(-1, '初始化'));

      for (i = 0; i < tokens.length; i++) {
        var tk = tokens[i];
        tcls = tcls.slice(); tcls[i] = 'active';

        if (tk.k === 'opd') {
          output.push(tk.t);
          push(st, [2], 'token "' + tk.t + '" 是操作数，直接加入输出队列 → [' + output.join(' ') + ']',
            snap(i, '输出 ' + tk.t));
        } else if (tk.t === '(') {
          opStack.push(tk.t);
          push(st, [3], 'token "(" 左括号，直接压入运算符栈', snap(i, '压入 ('));
        } else if (tk.t === ')') {
          var popped = [];
          while (opStack.length && opStack[opStack.length - 1] !== '(') {
            popped.push(opStack.pop());
            output.push(popped[popped.length - 1]);
          }
          if (opStack.length) { opStack.pop(); }
          push(st, [4], 'token ")"：弹出栈顶运算符到输出直到遇到 "("，弹出：' + popped.join(' ') +
            '；左括号 "(" 丢弃不输出', snap(i, '处理 )'));
        } else {
          var op = tk.t;
          push(st, [5], 'token "' + op + '" 是运算符（优先级 ' + prec(op) + '），与栈顶比较',
            snap(i, '处理运算符 ' + op));
          var pops = [];
          while (opStack.length) {
            var top = opStack[opStack.length - 1];
            if (top === '(') { break; }
            if (prec(top) > prec(op) || (prec(top) === prec(op) && leftAssoc(op))) {
              pops.push(opStack.pop());
              output.push(pops[pops.length - 1]);
            } else { break; }
          }
          if (pops.length) {
            push(st, [6], '栈顶 ' + pops.join(' ') + ' 优先级 ≥ ' + op + '，依次弹出到输出队列',
              snap(i, '弹出 ' + pops.join(' ')));
          } else {
            push(st, [6], '栈顶为空或优先级低于 ' + op + '，无需弹出', snap(i, ''));
          }
          opStack.push(op);
          push(st, [7], '把运算符 ' + op + ' 压栈', snap(i, '压入 ' + op));
        }
        tcls[i] = '';
      }

      if (opStack.length) {
        var rest = opStack.slice();
        push(st, [8], '扫描完毕，把运算符栈中剩余的 ' + rest.join(' ') + ' 全部弹出到输出',
          snap(tokens.length, '收尾'));
        while (opStack.length) { output.push(opStack.pop()); }
      }
      push(st, [8], '转换完成：后缀表达式 = ' + output.join(' ') +
        '（求值时从左到右，遇到运算符就取栈顶两个数运算，O(n)）',
        snap(tokens.length, '完成'));
      return st;
    },
    render: function (kr, s) {
      if (!s) {
        kr.html('__t', S.text(500, 280, '中缀转后缀：输入中缀表达式后点击「开始演示」', 'vt'));
        kr.end(); return;
      }
      kr.html('__t', S.text(500, 26, '中缀转后缀（调度场算法）：操作数直出，运算符比较优先级后压栈', 'vt'));
      kr.html('__t2', S.text(500, 50, '金色 = 当前扫描的 token；运算符栈在中部，输出队列在下方', 'vs'));

      var cw = 44, gap = 8, n = s.tokens.length, i;
      var total = n * cw + Math.max(0, n - 1) * gap, x0 = (1000 - total) / 2;
      for (i = 0; i < n; i++) {
        kr.g('tk' + i, 'translate(' + (x0 + i * (cw + gap) + cw / 2) + ',130)', 'k',
          '<rect class="cell ' + (s.tcls[i] || '') + '" x="' + (-cw / 2 + 2) + '" y="-18" width="' + (cw - 4) + '" height="36" rx="4"/>' +
          S.text(0, 0, s.tokens[i], 'cell-txt') +
          (i === s.pos ? S.text(0, 34, '▲', 'ptr') : ''));
      }

      kr.html('__sh', S.text(250, 220, '运算符栈（栈顶在下）', 'vs'));
      var stk = s.opStack || [];
      for (i = 0; i < stk.length; i++) {
        var isTop = (i === stk.length - 1);
        kr.g('sk' + i, 'translate(250,' + (250 + i * 42) + ')', 'k',
          '<rect class="cell ' + (isTop ? 'active' : '') + '" x="-22" y="-18" width="44" height="36" rx="4"/>' +
          S.text(0, 0, stk[i], 'cell-txt'));
      }
      if (!stk.length) { kr.html('__se', S.text(250, 260, '（空栈）', 'vs')); }

      kr.html('__oh', S.text(500, 430, '输出队列（后缀表达式）', 'vs'));
      var out = s.output || [];
      var ocw = 44, ototal = out.length * ocw + Math.max(0, out.length - 1) * gap, ox0 = (1000 - ototal) / 2;
      for (i = 0; i < out.length; i++) {
        kr.g('ot' + i, 'translate(' + (ox0 + i * (ocw + gap) + ocw / 2) + ',470)', 'k',
          '<rect class="cell done" x="' + (-ocw / 2 + 2) + '" y="-18" width="' + (ocw - 4) + '" height="36" rx="4"/>' +
          S.text(0, 0, out[i], 'cell-txt'));
      }
      if (!out.length) { kr.html('__oe', S.text(500, 470, '（空）', 'vs')); }

      if (s.msg) { kr.html('__m', S.text(500, 550, s.msg, s.warn ? 'vwarn' : 'vs')); }
      kr.end();
    }
  });

  /* ============================================================
     8. 单调栈（下一个更大元素）
     ============================================================ */
  DSV.register({
    id: 'bas-mono-stack', name: '单调栈（下一个更大元素）', category: '基础结构',
    desc: '求数组中每个元素右边第一个比它大的元素（NGE）：从左到右扫描，栈里保存尚未找到答案的下标，且栈内对应值自底向上严格递增。当前元素比栈顶大时栈顶找到答案就弹出。每个元素入栈、出栈各一次，时间 O(n)，空间 O(n)。',
    viewBox: '0 0 1000 620',
    code: [
      'nge(A):',                                   // 0
      '  stack = []  // 存下标，对应值单调递增',      // 1
      '  for i = 0 to n-1:',                        // 2
      '    while stack 非空 且 A[栈顶] < A[i]:',    // 3
      '      j = stack.pop(); result[j] = A[i]',    // 4
      '    stack.push(i)',                          // 5
      '  剩余栈中元素 result = -1',                  // 6
      '  return result'                             // 7
    ],
    inputs: [{ key: 'arr', label: '数组', def: '2,1,2,4,3', hint: '逗号分隔数字' }],
    actions: ACT_RUN,
    samples: [
      { label: '示例：2,1,2,4,3', values: { arr: '2,1,2,4,3' } },
      { label: '示例：递减（答案全 -1）', values: { arr: '5,4,3,2,1' } },
      { label: '示例：1,3,2,4,5', values: { arr: '1,3,2,4,5' } }
    ],
    random: function () { return { arr: DSV.randArr(DSV.ri(5, 8), 1, 9).join(',') }; },
    run: function (v) {
      var a = DSV.nums(v.arr, 12), n = a.length;
      var st = [];
      if (n < 1) {
        return [{ code: [0], desc: '数组为空',
          snap: { a: [], c: [], stack: [], result: [], msg: '空输入', warn: true } }];
      }
      var stack = [], result = [], c = zeros(n), i;
      for (i = 0; i < n; i++) { result.push(null); }

      function snap(msg, warn) {
        return {
          a: a.slice(), c: c.slice(),
          stack: stack.slice(), result: result.slice(),
          msg: msg || '', warn: !!warn
        };
      }

      push(st, [0, 1], '开始求下一个更大元素：A = [' + a.join(', ') + ']，栈空，result 全部为 null',
        snap('初始化'));

      for (i = 0; i < n; i++) {
        c = zeros(n); c[i] = 'active';
        push(st, [2], 'i = ' + i + '，A[i] = ' + a[i] + '，与栈顶比较',
          snap('扫描 A[' + i + ']=' + a[i]));

        var poppedAny = false;
        while (stack.length && a[stack[stack.length - 1]] < a[i]) {
          var j = stack.pop();
          result[j] = a[i];
          poppedAny = true;
          push(st, [3, 4], '栈顶 A[' + j + '] = ' + a[j] + ' < A[' + i + '] = ' + a[i] +
            '，弹出 j=' + j + '，result[' + j + '] = ' + a[i] + '（右边第一个更大元素找到了）',
            snap('弹出 j=' + j));
        }
        if (!poppedAny) {
          push(st, [3], stack.length ?
            '栈顶 A[' + stack[stack.length - 1] + '] = ' + a[stack[stack.length - 1]] +
            ' ≥ A[' + i + ']=' + a[i] + '，不弹出' : '栈为空，直接入栈', snap('比较'));
        }

        stack.push(i);
        c = zeros(n);
        for (var t = 0; t < stack.length; t++) { c[stack[t]] = 'compare'; }
        c[i] = 'active';
        push(st, [5], '把下标 i=' + i + ' 压栈。栈内对应值自底向上严格递增：' +
          stack.map(function (x) { return 'A[' + x + ']=' + a[x]; }).join(' < '),
          snap('压入 i=' + i));
      }

      for (i = 0; i < stack.length; i++) { result[stack[i]] = -1; }
      c = zeros(n);
      for (i = 0; i < n; i++) { c[i] = 'done'; }
      push(st, [6, 7], '扫描结束，栈里剩余的 ' + stack.length + ' 个元素（' +
        stack.map(function (x) { return 'A[' + x + ']=' + a[x]; }).join(', ') +
        '）右边没有更大元素，result 置 -1。最终 result = [' + result.join(', ') + ']',
        snap('完成'));
      return st;
    },
    render: function (kr, s) {
      if (!s) {
        kr.html('__t', S.text(500, 280, '单调栈：输入数组后点击「开始演示」', 'vt'));
        kr.end(); return;
      }
      kr.html('__t', S.text(500, 26, '单调栈：求每个元素右边第一个更大元素（NGE）', 'vt'));
      kr.html('__t2', S.text(500, 50, '金色 = 当前扫描的 i · 蓝色 = 在栈中等待答案 · 红色 = 刚找到答案被弹出', 'vs'));

      var a = s.a, n = a.length, i;
      var lay = DSV.barLayout(n, { baseY: 260, topY: 90, cw: 44 });
      var max = 1;
      for (i = 0; i < n; i++) { if (Math.abs(a[i]) > max) { max = Math.abs(a[i]); } }
      var maxH = 260 - 90 - 30;
      for (i = 0; i < n; i++) {
        var h = 22 + (Math.abs(a[i]) / max) * maxH;
        kr.g('b' + i, 'translate(' + lay[i].cx + ',260)', 'k',
          '<rect class="bar ' + (s.c[i] || '') + '" x="' + (-lay[i].w / 2) + '" y="' + (-h) +
          '" width="' + lay[i].w + '" height="' + h + '" rx="3"/>' +
          S.text(0, -h - 12, a[i], 'bar-val') + S.text(0, 18, i, 'idx-txt'));
      }

      kr.html('__sh', S.text(200, 330, '栈（存下标，对应值单调递增）', 'vs'));
      var stk = s.stack || [];
      for (i = 0; i < stk.length; i++) {
        var isTop = (i === stk.length - 1);
        kr.g('sk' + i, 'translate(200,' + (360 + i * 40) + ')', 'k',
          '<rect class="cell ' + (isTop ? 'active' : 'compare') + '" x="-42" y="-16" width="84" height="32" rx="4"/>' +
          S.text(0, 0, 'A[' + stk[i] + ']=' + a[stk[i]], 'cell-txt'));
      }
      if (!stk.length) { kr.html('__se', S.text(200, 380, '（空栈）', 'vs')); }

      kr.html('__rh', S.text(650, 330, 'result[i]：右边第一个更大元素', 'vs'));
      var res = s.result || [];
      var rcw = 56, rx0 = (1000 - res.length * rcw) / 2;
      for (i = 0; i < res.length; i++) {
        kr.g('r' + i, 'translate(' + (rx0 + i * rcw + rcw / 2) + ',380)', 'k',
          '<rect class="cell ' + (res[i] == null ? '' : 'done') + '" x="' + (-rcw / 2 + 2) + '" y="-16" width="' + (rcw - 4) + '" height="32" rx="4"/>' +
          S.text(0, 0, res[i] == null ? '?' : res[i], 'cell-txt') +
          S.text(0, 26, 'i=' + i, 'idx-txt'));
      }

      if (s.msg) { kr.html('__m', S.text(500, 560, s.msg, s.warn ? 'vwarn' : 'vs')); }
      kr.end();
    }
  });

  /* ============================================================
     9. 滑动窗口最大值（单调队列）
     ============================================================ */
  DSV.register({
    id: 'bas-slip-max', name: '滑动窗口最大值（单调队列）', category: '基础结构',
    desc: '窗口大小为 k，每次右移一位求窗口内最大值。用单调双端队列存下标：队首是当前窗口最大值，队列内对应值严格递减。新元素入队时从队尾弹出所有更小者，窗口滑出左端时若队首过期则出队。每个元素入队出队各一次，时间 O(n)。',
    viewBox: '0 0 1000 620',
    code: [
      'slidingMax(A, k):',                          // 0
      '  deque = []  // 存下标，对应值严格递减',     // 1
      '  for i = 0 to n-1:',                        // 2
      '    while deque 队尾值 <= A[i]: 弹出队尾',    // 3
      '    deque.push(i)',                          // 4
      '    if deque.front <= i-k: 弹出队首(过期)',   // 5
      '    if i >= k-1: result[i-k+1] = A[deque.front]', // 6
      '  return result'                             // 7
    ],
    inputs: [
      { key: 'arr', label: '数组', def: '1,3,-1,-3,5,3,6,7', hint: '逗号分隔数字' },
      { key: 'k', label: '窗口大小 k', def: '3', hint: '2-6' }
    ],
    actions: ACT_RUN,
    samples: [
      { label: '示例：经典 k=3', values: { arr: '1,3,-1,-3,5,3,6,7', k: '3' } },
      { label: '示例：k=4', values: { arr: '4,3,5,4,7,1,2', k: '4' } }
    ],
    random: function () {
      return { arr: DSV.randArr(DSV.ri(7, 10), -5, 20).join(','), k: String(DSV.ri(3, 4)) };
    },
    run: function (v) {
      var a = DSV.nums(v.arr, 15), n = a.length;
      var k = parseInt(v.k, 10);
      if (!isFinite(k) || k < 1) { k = 3; }
      k = Math.min(n, k);
      var st = [];
      if (n < 1) {
        return [{ code: [0], desc: '数组为空',
          snap: { a: [], c: [], deque: [], result: [], winLo: 0, winHi: -1, i: -1, msg: '空输入', warn: true } }];
      }
      var deque = [], result = [], c = zeros(n), i;
      function snap(msg, warn) {
        return {
          a: a.slice(), c: c.slice(),
          deque: deque.slice(), result: result.slice(),
          winLo: (i - k + 1), winHi: i, i: i,
          msg: msg || '', warn: !!warn
        };
      }
      push(st, [0, 1], '开始：A = [' + a.join(', ') + ']，窗口大小 k = ' + k + '，双端队列空，result 空',
        snap('初始化'));

      for (i = 0; i < n; i++) {
        c = zeros(n); c[i] = 'active';
        push(st, [2], 'i = ' + i + '，A[i] = ' + a[i] + '，准备入队',
          snap('扫描 A[' + i + ']=' + a[i]));

        var poppedTail = [];
        while (deque.length && a[deque[deque.length - 1]] <= a[i]) {
          poppedTail.push(deque.pop());
        }
        if (poppedTail.length) {
          push(st, [3], '队尾 ' + poppedTail.map(function (x) { return 'A[' + x + ']=' + a[x]; }).join(', ') +
            ' ≤ ' + a[i] + '，不可能成为窗口最大值，从队尾弹出', snap('维护单调性'));
        }

        deque.push(i);
        c = zeros(n);
        for (var t = 0; t < deque.length; t++) { c[deque[t]] = 'compare'; }
        c[i] = 'active';
        push(st, [4], '把下标 i=' + i + ' 从队尾入队。队列内对应值自队首到队尾严格递减：' +
          deque.map(function (x) { return 'A[' + x + ']=' + a[x]; }).join(' > '),
          snap('入队 i=' + i));

        if (deque[0] <= i - k) {
          var front = deque.shift();
          c = zeros(n); c[front] = 'dead';
          push(st, [5], '队首下标 ' + front + ' 已滑出窗口（<= i - k = ' + (i - k) + '），从队首弹出',
            snap('队首过期'));
        }

        if (i >= k - 1) {
          result.push(a[deque[0]]);
          c = zeros(n);
          for (var t2 = 0; t2 < deque.length; t2++) { c[deque[t2]] = 'compare'; }
          c[deque[0]] = 'swap';
          push(st, [6], '窗口 [' + (i - k + 1) + '…' + i + '] 形成，队首 A[' + deque[0] + ']=' +
            a[deque[0]] + ' 是最大值 → result[' + (i - k + 1) + '] = ' + a[deque[0]],
            snap('窗口最大值 = ' + a[deque[0]]));
        } else {
          push(st, [6], '窗口还未成形（i < k-1=' + (k - 1) + '），暂不输出', snap('窗口成形中'));
        }
      }
      c = zeros(n);
      push(st, [7], '完成：共 ' + result.length + ' 个窗口，每个窗口最大值 = [' + result.join(', ') + ']',
        snap('完成'));
      return st;
    },
    render: function (kr, s) {
      if (!s) {
        kr.html('__t', S.text(500, 280, '滑动窗口最大值：输入数组与窗口大小后点击「开始演示」', 'vt'));
        kr.end(); return;
      }
      kr.html('__t', S.text(500, 26, '滑动窗口最大值：单调双端队列，队首即窗口最大值', 'vt'));
      kr.html('__t2', S.text(500, 50, '金色 = 当前 i · 蓝色 = 在队列中 · 红色 = 队首（最大值）', 'vs'));

      var a = s.a, n = a.length, i;
      var lay = DSV.barLayout(n, { baseY: 240, topY: 80, cw: 42 });
      var max = 1;
      for (i = 0; i < n; i++) { if (Math.abs(a[i]) > max) { max = Math.abs(a[i]); } }
      var maxH = 240 - 80 - 30;

      if (s.winHi >= 0 && s.winLo <= s.winHi) {
        var lx = lay[Math.max(0, s.winLo)].x - 4;
        var hiIdx = Math.min(n - 1, s.winHi);
        var rx = lay[hiIdx].x + lay[hiIdx].w + 4;
        kr.html('__wf', '<rect class="frame dash" x="' + lx + '" y="60" width="' + (rx - lx) +
          '" height="' + (240 - 60 + 10) + '" rx="6"/>' +
          S.text((lx + rx) / 2, 50, '当前窗口 [' + s.winLo + '…' + s.winHi + ']', 'vs'));
      }

      for (i = 0; i < n; i++) {
        var h = 22 + (Math.abs(a[i]) / max) * maxH;
        kr.g('b' + i, 'translate(' + lay[i].cx + ',240)', 'k',
          '<rect class="bar ' + (s.c[i] || '') + '" x="' + (-lay[i].w / 2) + '" y="' + (-h) +
          '" width="' + lay[i].w + '" height="' + h + '" rx="3"/>' +
          S.text(0, -h - 12, a[i], 'bar-val') + S.text(0, 18, i, 'idx-txt'));
      }

      kr.html('__dh', S.text(500, 310, '单调双端队列（队首在左，对应值严格递减）', 'vs'));
      var dq = s.deque || [];
      var dcw = 60, dgap = 6, dtotal = dq.length * dcw + Math.max(0, dq.length - 1) * dgap, dx0 = (1000 - dtotal) / 2;
      for (i = 0; i < dq.length; i++) {
        var isFront = (i === 0);
        kr.g('d' + i, 'translate(' + (dx0 + i * (dcw + dgap) + dcw / 2) + ',350)', 'k',
          '<rect class="cell ' + (isFront ? 'swap' : 'compare') + '" x="' + (-dcw / 2 + 2) + '" y="-16" width="' + (dcw - 4) + '" height="32" rx="4"/>' +
          S.text(0, 0, 'A[' + dq[i] + ']=' + a[dq[i]], 'cell-txt') +
          S.text(0, 26, isFront ? '队首(最大)' : '', 'idx-txt'));
      }
      if (!dq.length) { kr.html('__de', S.text(500, 350, '（队列空）', 'vs')); }

      kr.html('__rh', S.text(500, 430, 'result（每个窗口的最大值）', 'vs'));
      var res = s.result || [];
      var rcw = 56, rtotal = res.length * rcw + Math.max(0, res.length - 1) * 6, rx0 = (1000 - rtotal) / 2;
      for (i = 0; i < res.length; i++) {
        kr.g('r' + i, 'translate(' + (rx0 + i * (rcw + 6) + rcw / 2) + ',470)', 'k',
          '<rect class="cell done" x="' + (-rcw / 2 + 2) + '" y="-16" width="' + (rcw - 4) + '" height="32" rx="4"/>' +
          S.text(0, 0, res[i], 'cell-txt') +
          S.text(0, 26, '窗' + (i + 1), 'idx-txt'));
      }

      if (s.msg) { kr.html('__m', S.text(500, 560, s.msg, s.warn ? 'vwarn' : 'vs')); }
      kr.end();
    }
  });

})();
