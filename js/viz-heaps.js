/* ============================================================
   viz-heaps.js —— 堆结构章节（5 个有状态数据结构）
   二叉堆（最小堆）/ 二项队列 / 斐波那契堆 / 左倾堆 / 斜堆
   全部为「有状态」结构：run 返回 { steps, state }
   ============================================================ */
(function () {
  'use strict';
  var DSV = window.DSV, S = DSV.svg;

  /* ---------- 通用工具 ---------- */
  function push(steps, code, desc, snap) { steps.push({ code: code, desc: desc, snap: snap }); }
  function zeros(n) { var a = []; for (var i = 0; i < n; i++) { a.push(''); } return a; }

  /* ============================================================
     1. 二叉堆（最小堆，数组实现）
     ============================================================ */
  var HEAP_CODE = [
    '// 最小堆：父结点的值 ≤ 两个孩子的值，根结点为最小值',
    'buildHeap(A):',                       // 0
    '  for i = n/2-1 downto 0: siftDown(A, i, n)', // 1
    '',
    'insert(x):',                          // 3
    '  A[n] = x; n = n+1',                 // 4
    '  percolateUp(n-1)',                  // 5
    '',
    'deleteMin():',                        // 7
    '  swap(A[0], A[n-1]); n = n-1',       // 8
    '  siftDown(A, 0, n)',                 // 9
    '',
    'siftDown(A, i, size):',               // 11
    '  while 2*i+1 < size:',
    '    c = 较小的孩子',                   // 13
    '    if A[i] <= A[c]: break',
    '    swap(A[i], A[c]); i = c',
    '',
    'percolateUp(i):',                     // 17
    '  while i>0 and A[i] < A[(i-1)/2]:',
    '    swap(A[i], A[(i-1)/2]); i = (i-1)/2'
  ];

  function heapSnap(a, c, tcls, title, sub, size) {
    return { a: a.slice(), c: (c || zeros(a.length)).slice(), tcls: tcls || {}, title: title || '', sub: sub || '', size: (size == null ? a.length : size) };
  }
  function heapFind(a, val) {
    for (var i = 0; i < a.length; i++) { if (a[i] === val) { return i; } }
    return -1;
  }

  DSV.register({
    id: 'heap', name: '二叉堆（最小堆）', category: '堆结构',
    desc: '数组实现的完全二叉树最小堆。支持建堆（自底向上 siftDown，O(n)）、插入（上滤）、删除最小值（下滤）、减小关键字（上滤）。堆顶恒为最小值，取最小 O(1)、插入/删除 O(log n)。',
    code: HEAP_CODE,
    viewBox: '0 0 1000 720',
    inputs: [{ key: 'init', label: '初始序列', def: '20,15,30,18,25,12,40', hint: '逗号分隔的数字' }],
    actions: [
      { key: 'build', label: '建堆', primary: true },
      { key: 'insert', label: '插入', arg: { label: '值', def: '10' } },
      { key: 'deleteMin', label: '删除最小值' },
      { key: 'decreaseKey', label: '减小关键字', arg: { label: '值,新值', def: '30,8' } },
      { key: 'findMin', label: '查看最小值' }
    ],
    samples: [
      { label: '示例：随机小堆', values: { init: '20,15,30,18,25,12,40' } },
      { label: '示例：逆序', values: { init: '9,8,7,6,5,4,3,2,1' } }
    ],
    random: function () { return { init: DSV.randArr(DSV.ri(7, 11), 1, 99).join(',') }; },
    run: function (v, action, state) {
      var a, st = [], self = this;
      function ensure() {
        if (!state || !state.a) { a = DSV.nums(v.init, 30); }
        else { a = state.a.slice(); }
        state = { a: a };
      }
      ensure();
      var n = a.length;
      var L = { build: [1], ins: [4, 5], del: [8, 9], sift: [11, 13, 14, 15], up: [17, 18] };

      function siftDown(i, size, phase) {
        while (2 * i + 1 < size) {
          var ch = 2 * i + 1;
          var c = zeros(size); c[i] = 'active'; c[ch] = 'compare';
          if (ch + 1 < size) { c[ch + 1] = 'compare'; }
          var tcls = {}; tcls[i] = 'active'; tcls[ch] = 'compare'; if (ch + 1 < size) { tcls[ch + 1] = 'compare'; }
          push(st, [12, 13], '比较 A[' + i + ']=' + a[i] + ' 与其孩子' + (ch + 1 < size ? '（左 ' + a[ch] + '，右 ' + a[ch + 1] + '）' : '（仅左孩子 ' + a[ch] + '）'),
            heapSnap(a, c, tcls, '二叉堆', phase, size));
          if (ch + 1 < size && a[ch + 1] < a[ch]) { ch = ch + 1; }
          tcls = {}; tcls[i] = 'active'; tcls[ch] = 'path';
          push(st, [13], '较小的孩子是 A[' + ch + ']=' + a[ch], heapSnap(a, (function () { var z = zeros(size); z[i] = 'active'; z[ch] = 'path'; return z; })(), tcls, '二叉堆', phase, size));
          if (a[i] <= a[ch]) {
            push(st, [14], 'A[' + i + ']=' + a[i] + ' ≤ A[' + ch + ']=' + a[ch] + '，满足最小堆性质，停止下滤',
              heapSnap(a, (function () { var z = zeros(size); z[i] = 'done'; return z; })(), { i: 'done' }, '二叉堆', phase, size));
            break;
          }
          var t = a[i]; a[i] = a[ch]; a[ch] = t;
          var cc = zeros(size); cc[i] = 'swap'; cc[ch] = 'swap';
          var tt = {}; tt[i] = 'swap'; tt[ch] = 'swap';
          push(st, [15], '交换 A[' + i + '] 与 A[' + ch + ']，i 下移到 ' + ch, heapSnap(a, cc, tt, '二叉堆', phase, size));
          i = ch;
        }
      }

      if (action.key === 'build') {
        if (n < 1) { return []; }
        push(st, [0], '开始建堆：n = ' + n + '，采用自底向上的 siftDown（O(n)）', heapSnap(a, null, {}, '二叉堆', '建堆阶段', n));
        for (var i = Math.floor(n / 2) - 1; i >= 0; i--) {
          push(st, [1], '对下标 ' + i + '（最后一个非叶子结点）向下调整', heapSnap(a, (function () { var z = zeros(n); z[i] = 'active'; return z; })(), { i: 'active' }, '二叉堆', '建堆阶段', n));
          siftDown(i, n, '建堆阶段');
        }
        push(st, [1], '建堆完成：堆顶 A[0] = ' + a[0] + ' 为最小值', heapSnap(a, (function () { var z = zeros(n); z[0] = 'done'; return z; })(), { 0: 'done' }, '二叉堆', '建堆完成', n));
        return { steps: st, state: { a: a.slice() } };
      }

      if (action.key === 'insert') {
        var x = Number(action.arg);
        if (!isFinite(x)) { push(st, [3], '请输入合法的插入值。', heapSnap(a, null, {}, '二叉堆', '插入', n)); return { steps: st, state: { a: a.slice() } }; }
        a.push(x); n = a.length;
        push(st, [4], '把 ' + x + ' 追加到数组末尾 A[' + (n - 1) + ']', heapSnap(a, (function () { var z = zeros(n); z[n - 1] = 'active'; return z; })(), { [n - 1]: 'active' }, '二叉堆', '插入 ' + x, n));
        var i2 = n - 1;
        while (i2 > 0) {
          var p = Math.floor((i2 - 1) / 2);
          var c = zeros(n); c[i2] = 'compare'; c[p] = 'compare';
          var tcls = {}; tcls[i2] = 'compare'; tcls[p] = 'compare';
          push(st, [17], '比较 A[' + i2 + ']=' + a[i2] + ' 与父结点 A[' + p + ']=' + a[p], heapSnap(a, c, tcls, '二叉堆', '上滤 ' + x, n));
          if (a[i2] >= a[p]) {
            push(st, [17], 'A[' + i2 + ']=' + a[i2] + ' ≥ A[' + p + ']=' + a[p] + '，满足堆性质，停止上滤', heapSnap(a, (function () { var z = zeros(n); z[i2] = 'done'; return z; })(), { [i2]: 'done' }, '二叉堆', '插入完成', n));
            break;
          }
          var t = a[i2]; a[i2] = a[p]; a[p] = t;
          var cc = zeros(n); cc[i2] = 'swap'; cc[p] = 'swap';
          var tt = {}; tt[i2] = 'swap'; tt[p] = 'swap';
          push(st, [18], 'A[' + i2 + '] < A[' + p + ']，交换，i 上移到父结点 ' + p, heapSnap(a, cc, tt, '二叉堆', '上滤 ' + x, n));
          i2 = p;
        }
        push(st, [18], '插入 ' + x + ' 完成：堆顶仍为 ' + a[0], heapSnap(a, (function () { var z = zeros(n); z[0] = 'done'; return z; })(), { 0: 'done' }, '二叉堆', '插入完成', n));
        return { steps: st, state: { a: a.slice() } };
      }

      if (action.key === 'deleteMin') {
        if (n < 1) { push(st, [7], '堆为空，无法删除最小值。', heapSnap(a, null, {}, '二叉堆', '空堆', 0)); return { steps: st, state: { a: [] } }; }
        var minV = a[0];
        push(st, [7], '堆顶 A[0] = ' + minV + ' 为最小值，将被删除', heapSnap(a, (function () { var z = zeros(n); z[0] = 'active'; return z; })(), { 0: 'active' }, '二叉堆', '删除最小值', n));
        var last = a[n - 1];
        a[0] = last; a.pop(); n = a.length;
        var c = zeros(Math.max(n, 1)); if (n) { c[0] = 'swap'; }
        push(st, [8], '把堆尾 ' + last + ' 移到堆顶 A[0]，堆大小变为 ' + n, heapSnap(a, c, { 0: 'swap' }, '二叉堆', '删除最小值', n));
        if (n > 0) { siftDown(0, n, '删除最小值'); }
        push(st, [9], '删除最小值 ' + minV + ' 完成' + (n ? '：新的堆顶为 ' + a[0] : '：堆已空'), heapSnap(a, (function () { var z = zeros(n); if (n) { z[0] = 'done'; } return z; })(), n ? { 0: 'done' } : {}, '二叉堆', '删除完成', n));
        return { steps: st, state: { a: a.slice() } };
      }

      if (action.key === 'decreaseKey') {
        var parts = String(action.arg).split(/[,\s，]+/).map(Number);
        var oldV = parts[0], newV = parts[1];
        if (!isFinite(oldV) || !isFinite(newV)) { push(st, [17], '请输入「原值,新值」。', heapSnap(a, null, {}, '二叉堆', '减小关键字', n)); return { steps: st, state: { a: a.slice() } }; }
        var idx = heapFind(a, oldV);
        if (idx < 0) { push(st, [17], '堆中不存在值 ' + oldV + '。', heapSnap(a, null, {}, '二叉堆', '减小关键字', n)); return { steps: st, state: { a: a.slice() } }; }
        if (newV >= oldV) { push(st, [17], '新值 ' + newV + ' 必须严格小于原值 ' + oldV + ' 才叫“减小”。', heapSnap(a, null, {}, '二叉堆', '减小关键字', n)); return { steps: st, state: { a: a.slice() } }; }
        a[idx] = newV;
        push(st, [17], '将 A[' + idx + '] 由 ' + oldV + ' 减小为 ' + newV, heapSnap(a, (function () { var z = zeros(n); z[idx] = 'active'; return z; })(), { [idx]: 'active' }, '二叉堆', '减小关键字', n));
        var i3 = idx;
        while (i3 > 0) {
          var p = Math.floor((i3 - 1) / 2);
          var c = zeros(n); c[i3] = 'compare'; c[p] = 'compare';
          push(st, [17], '比较 A[' + i3 + ']=' + a[i3] + ' 与父结点 A[' + p + ']=' + a[p], heapSnap(a, c, { [i3]: 'compare', [p]: 'compare' }, '二叉堆', '上滤 ' + newV, n));
          if (a[i3] >= a[p]) { push(st, [17], 'A[' + i3 + '] ≥ A[' + p + ']，无需再上移', heapSnap(a, (function () { var z = zeros(n); z[i3] = 'done'; return z; })(), { [i3]: 'done' }, '二叉堆', '减小完成', n)); break; }
          var t = a[i3]; a[i3] = a[p]; a[p] = t;
          push(st, [18], '交换 A[' + i3 + '] 与 A[' + p + ']，继续上滤', heapSnap(a, (function () { var z = zeros(n); z[i3] = 'swap'; z[p] = 'swap'; return z; })(), { [i3]: 'swap', [p]: 'swap' }, '二叉堆', '上滤 ' + newV, n));
          i3 = p;
        }
        push(st, [18], '减小关键字完成', heapSnap(a, (function () { var z = zeros(n); if (n) { z[0] = 'done'; } return z; })(), n ? { 0: 'done' } : {}, '二叉堆', '减小完成', n));
        return { steps: st, state: { a: a.slice() } };
      }

      if (action.key === 'findMin') {
        if (n < 1) { push(st, [7], '堆为空。', heapSnap(a, null, {}, '二叉堆', '空堆', 0)); return { steps: st, state: { a: a.slice() } }; }
        push(st, [7], '最小值即堆顶 A[0] = ' + a[0], heapSnap(a, (function () { var z = zeros(n); z[0] = 'active'; return z; })(), { 0: 'active' }, '二叉堆', '查看最小值', n));
        return { steps: st, state: { a: a.slice() } };
      }

      push(st, [0], '请选择操作。', heapSnap(a, null, {}, '二叉堆', '就绪', n));
      return { steps: st, state: { a: a.slice() } };
    },
    render: function (kr, s) {
      if (!s) { kr.html('__t', S.text(500, 30, '二叉堆（最小堆）', 'vt')); kr.end(); return; }
      kr.html('__t', S.text(500, 30, s.title || '二叉堆（最小堆）', 'vt'));
      var a = s.a, n = a.length, size = (s.size == null ? n : s.size);
      // 树形
      function build(i) { if (i >= n) { return null; } return { id: i, left: build(2 * i + 1), right: build(2 * i + 2) }; }
      var root = build(0);
      DSV.drawTree(kr, root, {
        top: 64, dy: 76, dx: 44,
        node: function (nd) {
          var cls = (s.tcls && s.tcls[nd.id]) || '';
          if (nd.id >= size) { cls = 'dead'; }
          return { inner: S.circle(0, 0, 24) + S.text(0, 0, a[nd.id]) + S.text(0, 36, nd.id, 'idx-txt'), cls: cls };
        },
        edge: function (p, ch) { return (ch.id < size) ? 'tree' : 'dim'; }
      });
      // 数组
      var baseY = 660, topY = 420;
      if (n) {
        var max = 1; a.forEach(function (v) { if (typeof v === 'number') { max = Math.max(max, Math.abs(v)); } });
        var maxH = baseY - topY - 30;
        var lay = DSV.barLayout(n, { baseY: baseY, topY: topY, cw: 46 });
        for (var i = 0; i < n; i++) {
          var L = lay[i], v = a[i];
          var h = (typeof v === 'number') ? 22 + (Math.abs(v) / max) * maxH : 44;
          var cls = (s.c && s.c[i]) || '';
          if (i >= size) { cls = 'dead'; }
          var inner = '<rect class="bar ' + cls + '" x="' + (-L.w / 2) + '" y="' + (-h) + '" width="' + L.w + '" height="' + h + '" rx="3"/>' +
            S.text(0, -h - 12, v, 'bar-val') + S.text(0, 18, i, 'idx-txt');
          kr.g('b' + i, 'translate(' + L.cx + ',' + baseY + ')', 'k', inner);
        }
        kr.html('__ad', S.text(500, topY - 16, '数组视图' + (size < n ? '（灰色为已出堆的已排序部分）' : ''), 'vt'));
      } else {
        kr.html('__ad', S.text(500, topY, '（堆为空）', 'vs'));
      }
    }
  });

  /* ============================================================
     通用：指针树（左倾堆 / 斜堆）的快照与渲染
     ============================================================ */
  function treeSnap(st, hl, title, sub) { return { root: DSV.clone(st.root), hl: hl || {}, title: title || '', sub: sub || '' }; }
  function nplOf(n) { return n ? (n.npl || 0) : -1; }
  function mkHNode(v, st, withNpl) { var n = { id: 'h' + st.next, v: v, left: null, right: null }; st.next++; if (withNpl) { n.npl = 0; } return n; }
  function swapFields(a, b) {
    var t = a.v; a.v = b.v; b.v = t;
    t = a.left; a.left = b.left; b.left = t;
    t = a.right; a.right = b.right; b.right = t;
    if ('npl' in a && 'npl' in b) { t = a.npl; a.npl = b.npl; b.npl = t; }
  }
  function swapChildren(n) { var t = n.left; n.left = n.right; n.right = t; }

  function drawPointerTree(kr, snap, showNpl) {
    kr.html('__t', S.text(500, 30, snap.title || '堆', 'vt'));
    if (!snap.root) { kr.html('__e', S.text(500, 260, '（堆为空）', 'vs')); return; }
    DSV.drawTree(kr, snap.root, {
      top: 70, dy: 80, dx: 46, nodeSize: 58,
      node: function (n) {
        var cls = (snap.hl && snap.hl[n.id]) || '';
        var sub = showNpl ? ('npl=' + (n.npl || 0)) : '';
        return { inner: S.circle(0, 0, 26) + S.text(0, showNpl ? -3 : 0, n.v) + (showNpl ? S.rect(-22, 32, 44, 16, 'cell') + S.text(0, 40, sub, 'nd-label') : ''), cls: cls };
      },
      edge: function (p, c) { return (snap.hl && snap.hl[c.id] === 'path') ? 'tree path' : 'tree'; }
    });
  }

  /* ---------- 左倾堆 ---------- */
  var LEFTIST_CODE = [
    '// 左倾堆：每个结点的 npl(零路径长) 满足 npl(左) ≥ npl(右)',
    'merge(x, y):',                          // 1
    '  if x == null: return y',
    '  if y == null: return x',
    '  if x.v > y.v: swap(x, y)',            // 4
    '  x.right = merge(x.right, y)',         // 5
    '  if npl(x.left) < npl(x.right):',
    '    swap(x.left, x.right)',             // 7
    '  x.npl = npl(x.right) + 1',
    '  return x',
    '',
    'insert(x):',                            // 10
    '  merge(heap, newNode(x))',
    'deleteMin():',                          // 12
    '  merge(heap.left, heap.right)'
  ];

  DSV.register({
    id: 'leftist', name: '左倾堆', category: '堆结构',
    desc: '左倾堆是堆序的二叉堆，通过维护「零路径长 npl（到最近空结点的路径长度）」保证左孩子的 npl ≥ 右孩子的 npl，从而向一侧倾斜。所有操作基于 merge：合并 O(log n)，插入 O(log n)，删除最小值 O(log n)，无需旋转。',
    code: LEFTIST_CODE,
    viewBox: '0 0 1000 560',
    inputs: [{ key: 'init', label: '初始序列', def: '10,20,5,30,15,25,8', hint: '逗号分隔的数字' }],
    actions: [
      { key: 'build', label: '建堆', primary: true },
      { key: 'insert', label: '插入', arg: { label: '值', def: '3' } },
      { key: 'deleteMin', label: '删除最小值' },
      { key: 'findMin', label: '查看最小值' }
    ],
    samples: [
      { label: '示例：随机', values: { init: '10,20,5,30,15,25,8' } },
      { label: '示例：逆序', values: { init: '9,8,7,6,5,4,3' } }
    ],
    random: function () { return { init: DSV.randArr(DSV.ri(6, 9), 1, 99).join(',') }; },
    run: function (v, action, state) {
      var st = state || { root: null, next: 1 }, steps = [];

      function lmerge(x, y, tag, depth) {
        if (!x) { return y; }
        if (!y) { return x; }
        if (x.v > y.v) { swapFields(x, y); }
        push(steps, [4], '比较两棵子树的根 ' + x.v + ' 与 ' + y.v + '，' + x.v + ' 较小，作为本子树的根', treeSnap(st, { [x.id]: 'active', [y.id]: 'compare' }, '左倾堆', '合并'), tag);
        x.right = lmerge(x.right, y, tag, depth + 1);
        push(steps, [5], '把合并结果接到 ' + x.v + ' 的右孩子', treeSnap(st, { [x.id]: 'active', [x.right ? x.right.id : '']: 'path' }, '左倾堆', '合并'), tag);
        if (nplOf(x.left) < nplOf(x.right)) {
          swapChildren(x);
          push(steps, [7], 'npl(左)=' + nplOf(x.left) + ' < npl(右)=' + nplOf(x.right) + '，交换左右孩子以维持左倾性质',
            treeSnap(st, { [x.id]: 'active' }, '左倾堆', '左倾调整'), tag);
        }
        x.npl = (x.right ? nplOf(x.right) : -1) + 1;
        if (x.npl < 0) { x.npl = 0; }
        push(steps, [8], '更新 ' + x.v + ' 的 npl = ' + x.npl, treeSnap(st, { [x.id]: 'active' }, '左倾堆', 'npl=' + x.npl), tag);
        return x;
      }

      if (action.key === 'build') {
        st = { root: null, next: 1 };
        var vals = DSV.nums(v.init, 30);
        if (!vals.length) { return []; }
        push(steps, [10], '开始建堆：逐个插入 ' + vals.join(','), treeSnap(st, {}, '左倾堆', '建堆'));
        vals.forEach(function (xv) {
          var node = mkHNode(xv, st, true);
          if (!st.root) { st.root = node; }
          else {
            if (st.root.v > node.v) { swapFields(st.root, node); }
            st.root.right = lmerge(st.root.right, node, '建堆', 1);
            if (nplOf(st.root.left) < nplOf(st.root.right)) { swapChildren(st.root); }
            st.root.npl = (st.root.right ? nplOf(st.root.right) : -1) + 1; if (st.root.npl < 0) { st.root.npl = 0; }
          }
          push(steps, [10], '插入 ' + xv + ' 完成' + (st.root ? '，当前堆顶 ' + st.root.v : ''), treeSnap(st, st.root ? { [st.root.id]: 'active' } : {}, '左倾堆', '插入 ' + xv));
        });
        return { steps: steps, state: { root: DSV.clone(st.root), next: st.next } };
      }

      if (action.key === 'insert') {
        var x = Number(action.arg);
        if (!isFinite(x)) { push(steps, [10], '请输入合法的插入值。', treeSnap(st, {}, '左倾堆', '插入')); return { steps: steps, state: st }; }
        var node = mkHNode(x, st, true);
        if (!st.root) { st.root = node; }
        else {
          if (st.root.v > node.v) { swapFields(st.root, node); }
          st.root.right = lmerge(st.root.right, node, '插入', 1);
          if (nplOf(st.root.left) < nplOf(st.root.right)) { swapChildren(st.root); }
          st.root.npl = (st.root.right ? nplOf(st.root.right) : -1) + 1; if (st.root.npl < 0) { st.root.npl = 0; }
        }
        push(steps, [10], '插入 ' + x + ' 完成，堆顶 ' + (st.root ? st.root.v : '—'), treeSnap(st, st.root ? { [st.root.id]: 'active' } : {}, '左倾堆', '插入完成'));
        return { steps: steps, state: { root: DSV.clone(st.root), next: st.next } };
      }

      if (action.key === 'deleteMin') {
        if (!st.root) { push(steps, [12], '堆为空，无法删除最小值。', treeSnap(st, {}, '左倾堆', '空堆')); return { steps: steps, state: st }; }
        var minV = st.root.v, minId = st.root.id;
        push(steps, [12], '堆顶 ' + minV + ' 为最小值，将被删除', treeSnap(st, { [minId]: 'active' }, '左倾堆', '删除最小值'));
        var left = st.root.left, right = st.root.right;
        st.root = lmerge(left, right, '删除最小值', 1);
        push(steps, [12], '删除堆顶 ' + minV + '，合并其左右子树为新堆' + (st.root ? '，新堆顶 ' + st.root.v : '（堆已空）'),
          treeSnap(st, st.root ? { [st.root.id]: 'active' } : {}, '左倾堆', '删除完成'));
        return { steps: steps, state: { root: DSV.clone(st.root), next: st.next } };
      }

      if (action.key === 'findMin') {
        if (!st.root) { push(steps, [12], '堆为空。', treeSnap(st, {}, '左倾堆', '空堆')); return { steps: steps, state: st }; }
        push(steps, [12], '最小值即堆顶 ' + st.root.v, treeSnap(st, { [st.root.id]: 'active' }, '左倾堆', '查看最小值'));
        return { steps: steps, state: st };
      }

      push(steps, [0], '请选择操作。', treeSnap(st, {}, '左倾堆', '就绪'));
      return { steps: steps, state: st };
    },
    render: function (kr, s) { if (!s) { kr.html('__t', S.text(500, 30, '左倾堆', 'vt')); kr.end(); return; } drawPointerTree(kr, s, true); }
  });

  /* ---------- 斜堆 ---------- */
  var SKEW_CODE = [
    '// 斜堆：左倾堆的简化版，不维护 npl，合并后无条件交换左右孩子',
    'merge(x, y):',                          // 1
    '  if x == null: return y',
    '  if y == null: return x',
    '  if x.v > y.v: swap(x, y)',            // 4
    '  x.right = merge(x.right, y)',         // 5
    '  swap(x.left, x.right)',              // 6  无条件交换
    '  return x',
    '',
    'insert(x):',                            // 8
    '  merge(heap, newNode(x))',
    'deleteMin():',                          // 10
    '  merge(heap.left, heap.right)'
  ];

  DSV.register({
    id: 'skew', name: '斜堆', category: '堆结构',
    desc: '斜堆是左倾堆的无 npl 简化版：merge 后无条件交换结点的左右孩子（除递归最底层外），从而得到摊还 O(log n) 的合并效率。实现最简单，但会自然向右倾斜。插入、删除最小值均为摊还 O(log n)。',
    code: SKEW_CODE,
    viewBox: '0 0 1000 540',
    inputs: [{ key: 'init', label: '初始序列', def: '10,20,5,30,15,25,8', hint: '逗号分隔的数字' }],
    actions: [
      { key: 'build', label: '建堆', primary: true },
      { key: 'insert', label: '插入', arg: { label: '值', def: '3' } },
      { key: 'deleteMin', label: '删除最小值' },
      { key: 'findMin', label: '查看最小值' }
    ],
    samples: [
      { label: '示例：随机', values: { init: '10,20,5,30,15,25,8' } },
      { label: '示例：逆序', values: { init: '9,8,7,6,5,4,3' } }
    ],
    random: function () { return { init: DSV.randArr(DSV.ri(6, 9), 1, 99).join(',') }; },
    run: function (v, action, state) {
      var st = state || { root: null, next: 1 }, steps = [];

      function smerge(x, y, tag) {
        if (!x) { return y; }
        if (!y) { return x; }
        if (x.v > y.v) { swapFields(x, y); }
        push(steps, [4], '比较两棵子树的根 ' + x.v + ' 与 ' + y.v + '，' + x.v + ' 较小，作为本子树的根', treeSnap(st, { [x.id]: 'active', [y.id]: 'compare' }, '斜堆', '合并'), tag);
        x.right = smerge(x.right, y, tag);
        push(steps, [5], '把合并结果接到 ' + x.v + ' 的右孩子', treeSnap(st, { [x.id]: 'active', [x.right ? x.right.id : '']: 'path' }, '斜堆', '合并'), tag);
        swapChildren(x);
        push(steps, [6], '无条件交换 ' + x.v + ' 的左右孩子（斜堆特色，摊还 O(log n)）', treeSnap(st, { [x.id]: 'active' }, '斜堆', '左右交换'), tag);
        return x;
      }

      if (action.key === 'build') {
        st = { root: null, next: 1 };
        var vals = DSV.nums(v.init, 30);
        if (!vals.length) { return []; }
        push(steps, [8], '开始建堆：逐个插入 ' + vals.join(','), treeSnap(st, {}, '斜堆', '建堆'));
        vals.forEach(function (xv) {
          var node = mkHNode(xv, st, false);
          if (!st.root) { st.root = node; }
          else {
            if (st.root.v > node.v) { swapFields(st.root, node); }
            st.root.right = smerge(st.root.right, node, '建堆');
            swapChildren(st.root);
          }
          push(steps, [8], '插入 ' + xv + ' 完成' + (st.root ? '，当前堆顶 ' + st.root.v : ''), treeSnap(st, st.root ? { [st.root.id]: 'active' } : {}, '斜堆', '插入 ' + xv));
        });
        return { steps: steps, state: { root: DSV.clone(st.root), next: st.next } };
      }

      if (action.key === 'insert') {
        var x = Number(action.arg);
        if (!isFinite(x)) { push(steps, [8], '请输入合法的插入值。', treeSnap(st, {}, '斜堆', '插入')); return { steps: steps, state: st }; }
        var node = mkHNode(x, st, false);
        if (!st.root) { st.root = node; }
        else {
          if (st.root.v > node.v) { swapFields(st.root, node); }
          st.root.right = smerge(st.root.right, node, '插入');
          swapChildren(st.root);
        }
        push(steps, [8], '插入 ' + x + ' 完成，堆顶 ' + (st.root ? st.root.v : '—'), treeSnap(st, st.root ? { [st.root.id]: 'active' } : {}, '斜堆', '插入完成'));
        return { steps: steps, state: { root: DSV.clone(st.root), next: st.next } };
      }

      if (action.key === 'deleteMin') {
        if (!st.root) { push(steps, [10], '堆为空，无法删除最小值。', treeSnap(st, {}, '斜堆', '空堆')); return { steps: steps, state: st }; }
        var minV = st.root.v, minId = st.root.id;
        push(steps, [10], '堆顶 ' + minV + ' 为最小值，将被删除', treeSnap(st, { [minId]: 'active' }, '斜堆', '删除最小值'));
        var left = st.root.left, right = st.root.right;
        st.root = smerge(left, right, '删除最小值');
        push(steps, [10], '删除堆顶 ' + minV + '，合并其左右子树为新堆' + (st.root ? '，新堆顶 ' + st.root.v : '（堆已空）'),
          treeSnap(st, st.root ? { [st.root.id]: 'active' } : {}, '斜堆', '删除完成'));
        return { steps: steps, state: { root: DSV.clone(st.root), next: st.next } };
      }

      if (action.key === 'findMin') {
        if (!st.root) { push(steps, [10], '堆为空。', treeSnap(st, {}, '斜堆', '空堆')); return { steps: steps, state: st }; }
        push(steps, [10], '最小值即堆顶 ' + st.root.v, treeSnap(st, { [st.root.id]: 'active' }, '斜堆', '查看最小值'));
        return { steps: steps, state: st };
      }

      push(steps, [0], '请选择操作。', treeSnap(st, {}, '斜堆', '就绪'));
      return { steps: steps, state: st };
    },
    render: function (kr, s) { if (!s) { kr.html('__t', S.text(500, 30, '斜堆', 'vt')); kr.end(); return; } drawPointerTree(kr, s, false); }
  });

  /* ============================================================
     通用：森林（二项队列 / 斐波那契堆）的布局与渲染
     结点用 n.kids（数组）表示孩子；斐波那契堆用 n.child + n.sibling
     ============================================================ */
  function kidsOf(n) {
    if (!n) { return []; }
    if (n.kids) { return n.kids; }
    var arr = []; var c = n.child; while (c) { arr.push(c); c = c.sibling; } return arr;
  }
  function layoutF(r) { // r: 根结点；返回 {pos:id->{x,y}, order, depth}
    var pos = {}, counter = 0, depth = 0;
    (function walk(n, d) {
      if (!n) { return; }
      kidsOf(n).forEach(function (c) { walk(c, d + 1); });
      pos[n.id] = { order: counter++, depth: d };
      depth = Math.max(depth, d);
    })(r, 0);
    return { pos: pos, n: counter, depth: depth };
  }
  function drawFNode(kr, n, x, y, cls, extra) {
    kr.g('f_' + n.id, 'translate(' + x + ',' + y + ')', 'k nd ' + (cls || ''),
      '<circle r="24"></circle>' + S.text(0, extra ? -3 : 0, n.v) + (extra ? S.text(0, 40, extra, 'nd-label') : ''));
  }
  function drawForest(kr, roots, hl, title, sub, opts) {
    opts = opts || {};
    kr.html('__t', S.text(500, 28, title || '堆', 'vt'));
    if (sub) { kr.html('__s', S.text(500, 52, sub, 'vs')); }
    if (!roots || !roots.length) { kr.html('__e', S.text(500, 280, '（堆为空）', 'vs')); return; }
    // 先为每棵树确定宽度（列数）
    var infos = roots.map(function (r) { return layoutF(r); });
    var colGap = 70, dx = 64, dy = 70, perH = (opts.depth0 || 0);
    // 每棵树占一列区域，水平居中排列
    var maxDepth = 0; infos.forEach(function (I) { maxDepth = Math.max(maxDepth, I.depth); });
    var totalCols = 0; infos.forEach(function (I) { totalCols += I.n; });
    var W = 1000, usable = W - 80;
    var slot = Math.max(46, Math.min(dx, usable / Math.max(1, totalCols)));
    var x0 = 40, curX = x0;
    roots.forEach(function (r, ri) {
      var I = infos[ri];
      var treeW = (I.n - 1) * slot;
      var ox = curX + treeW / 2;
      curX += treeW + colGap;
      var yTop = 84;
      // 画边
      (function edges(n) {
        var p = I.pos[n.id]; if (!p) { return; }
        kidsOf(n).forEach(function (c) {
          var cp = I.pos[c.id];
          if (cp) { kr.html('fe_' + n.id + '_' + c.id, S.line(ox + (p.order - (I.n - 1) / 2) * slot, yTop + p.depth * dy, ox + (cp.order - (I.n - 1) / 2) * slot, yTop + cp.depth * dy, 'edge tree')); }
          edges(c);
        });
      })(r);
      // 画结点
      (function nodesFn(n) {
        var p = I.pos[n.id]; if (!p) { return; }
        var x = ox + (p.order - (I.n - 1) / 2) * slot, y = yTop + p.depth * dy;
        var cls = (hl && hl[n.id]) || (opts.degree && n.degree != null ? '' : '');
        drawFNode(kr, n, x, y, cls, opts.extra ? opts.extra(n) : '');
        kidsOf(n).forEach(function (c) { nodesFn(c); });
      })(r);
    });
  }

  /* ---------- 二项队列 ---------- */
  var BINO_CODE = [
    '// 二项队列：由若干棵二项树 B0,B1,B2… 组成的森林，每棵 Bk 含 2^k 个结点',
    'insert(x):',                           // 1
    '  t = new B0(x)',
    '  carry(t)',                           // 3
    'carry(t):',                            // 4
    '  d = t.degree',
    '  while forest[d] != null:',           // 6
    '    t = mergeTrees(t, forest[d])',
    '    forest[d] = null; d = d + 1',
    '  forest[d] = t',
    '',
    'deleteMin():',                         // 10
    '  m = 根中值最小的树',
    '  把 m 的孩子逐一 carry 回 forest',     // 12
    '  return m.v'
  ];

  DSV.register({
    id: 'binomial', name: '二项队列', category: '堆结构',
    desc: '二项队列（二项堆）是若干二项树的森林，每棵 Bk 恰好有 2^k 个结点、高度 k。插入按「二进制进位」合并同阶树（carry），删除最小值先把最小值所在树的孩子拆回森林再合并。插入/合并摊还 O(1)，删除最小值 O(log n)。',
    code: BINO_CODE,
    viewBox: '0 0 1000 600',
    inputs: [{ key: 'init', label: '初始序列', def: '12,7,25,15,28,33,41,9', hint: '逗号分隔的数字' }],
    actions: [
      { key: 'build', label: '建堆', primary: true },
      { key: 'insert', label: '插入', arg: { label: '值', def: '5' } },
      { key: 'deleteMin', label: '删除最小值' },
      { key: 'findMin', label: '查看最小值' }
    ],
    samples: [
      { label: '示例：触发进位合并', values: { init: '1,2,3,4,5,6,7' } },
      { label: '示例：随机', values: { init: '12,7,25,15,28,33,41,9' } }
    ],
    random: function () { return { init: DSV.randArr(DSV.ri(6, 9), 1, 99).join(',') }; },
    run: function (v, action, state) {
      // 状态：forest 为数组，forest[d] = 根结点或 null；结点 {id,v,deg,kids:[]}
      var st = state || { forest: [], next: 1 }, steps = [];
      function snap(hl, title, sub) { return { forest: DSV.clone(st.forest), hl: hl || {}, title: title || '二项队列', sub: sub || '' }; }
      function mkB(v) { var t = { id: 'b' + st.next, v: v, deg: 0, kids: [] }; st.next++; return t; }
      function mergeTrees(t1, t2) {
        if (t1.v > t2.v) { var x = t1; t1 = t2; t2 = x; }
        t1.kids.push(t2); t1.deg = t1.deg + 1;
        return t1;
      }
      function carry(t, tag, note) {
        var d = t.deg;
        while (st.forest[d]) {
          var other = st.forest[d]; st.forest[d] = null;
          push(steps, [6, 7], 'forest[' + d + '] 已有一棵 B' + d + '，合并两棵同阶树（根 ' + t.v + ' 与 ' + other.v + '）', snap({ [t.id]: 'active', [other.id]: 'compare' }, '二项队列', note || '进位合并'), tag);
          t = mergeTrees(t, other);
          st.forest[d] = null; d = d + 1;
        }
        st.forest[d] = t;
        push(steps, [8], '把合并结果放入 forest[' + d + ']（当前为 B' + d + '）', snap({ [t.id]: 'active' }, '二项队列', note || '进位完成'), tag);
        return t;
      }
      function buildForest(vals, tag) {
        vals.forEach(function (xv) {
          var t = mkB(xv);
          push(steps, [1, 2], '创建单结点 B0(' + xv + ')', snap({ [t.id]: 'active' }, '二项队列', '插入 ' + xv), tag);
          carry(t, tag, '插入 ' + xv);
        });
      }

      if (action.key === 'build') {
        st = { forest: [], next: 1 };
        var vals = DSV.nums(v.init, 30);
        if (!vals.length) { return []; }
        push(steps, [1], '开始建堆：逐个插入 ' + vals.join(','), snap({}, '二项队列', '建堆'));
        buildForest(vals, '建堆');
        return { steps: steps, state: { forest: DSV.clone(st.forest), next: st.next } };
      }
      if (action.key === 'insert') {
        var x = Number(action.arg);
        if (!isFinite(x)) { push(steps, [1], '请输入合法的插入值。', snap({}, '二项队列', '插入')); return { steps: steps, state: st }; }
        var t = mkB(x);
        push(steps, [1, 2], '创建单结点 B0(' + x + ')', snap({ [t.id]: 'active' }, '二项队列', '插入 ' + x));
        carry(t, '插入', '插入 ' + x);
        push(steps, [1], '插入 ' + x + ' 完成', snap({}, '二项队列', '插入完成'));
        return { steps: steps, state: { forest: DSV.clone(st.forest), next: st.next } };
      }
      if (action.key === 'deleteMin') {
        var minD = -1, minNode = null;
        for (var d = 0; d < st.forest.length; d++) {
          if (st.forest[d] && (!minNode || st.forest[d].v < minNode.v)) { minNode = st.forest[d]; minD = d; }
        }
        if (!minNode) { push(steps, [10], '堆为空，无法删除最小值。', snap({}, '二项队列', '空堆')); return { steps: steps, state: st }; }
        push(steps, [10], '最小值在 B' + minD + ' 的根：' + minNode.v, snap({ [minNode.id]: 'active' }, '二项队列', '删除最小值'));
        st.forest[minD] = null;
        var children = minNode.kids.slice().sort(function (a, b) { return a.deg - b.deg; });
        push(steps, [11], '把 B' + minD + ' 的孩子（' + (children.length ? children.map(function (c) { return 'B' + c.deg + '(' + c.v + ')'; }).join(', ') : '无') + '）逐一 carry 回 forest',
          snap({}, '二项队列', '拆分孩子'));
        children.forEach(function (c) { c.parent = null; carry(c, '删除最小值', '合并孩子 B' + c.deg); });
        push(steps, [12], '删除最小值 ' + minNode.v + ' 完成', snap({}, '二项队列', '删除完成'));
        return { steps: steps, state: { forest: DSV.clone(st.forest), next: st.next } };
      }
      if (action.key === 'findMin') {
        var m2 = null, md2 = -1;
        for (var d2 = 0; d2 < st.forest.length; d2++) { if (st.forest[d2] && (!m2 || st.forest[d2].v < m2.v)) { m2 = st.forest[d2]; md2 = d2; } }
        if (!m2) { push(steps, [10], '堆为空。', snap({}, '二项队列', '空堆')); return { steps: steps, state: st }; }
        push(steps, [10], '最小值在各树根中最小者：B' + md2 + ' 的根 ' + m2.v, snap({ [m2.id]: 'active' }, '二项队列', '查看最小值'));
        return { steps: steps, state: st };
      }
      push(steps, [0], '请选择操作。', snap({}, '二项队列', '就绪'));
      return { steps: steps, state: st };
    },
    render: function (kr, s) {
      if (!s) { kr.html('__t', S.text(500, 28, '二项队列', 'vt')); kr.end(); return; }
      var roots = (s.forest || []).filter(function (x) { return x; });
      drawForest(kr, roots, s.hl, s.title, s.sub, { extra: function (n) { return 'B' + n.deg; } });
    }
  });

  /* ---------- 斐波那契堆 ---------- */
  var FIB_CODE = [
    '// 斐波那契堆：根组成双链表，每结点有孩子链表；lazy 合并，仅 extractMin 时整理',
    'insert(x):',                           // 1
    '  新建结点加入根链表',
    'extractMin():',                        // 3
    '  m = 根链表中值最小的根',
    '  把 m 的孩子移到根链表',              // 5
    '  consolidate(): 合并根链表中度数相同的树', // 6
    'decreaseKey(x, k):',                   // 7
    '  x.v = k',
    '  if x.v < x.parent.v: cut(x); cascadingCut(x.parent)'
  ];

  DSV.register({
    id: 'fibonacci', name: '斐波那契堆', category: '堆结构',
    desc: '斐波那契堆是理论上最优的堆：插入、合并、减小关键字均为摊还 O(1)，extractMin 摊还 O(log n)。它采用「惰性合并」——插入只挂到根链表，删除最小值时才用 consolidate 合并同度根；减小关键字触发 cut 与级联剪枝（cascading cut）。',
    code: FIB_CODE,
    viewBox: '0 0 1000 620',
    inputs: [{ key: 'init', label: '初始序列', def: '23,7,21,3,17,11,29,5', hint: '逗号分隔的数字' }],
    actions: [
      { key: 'build', label: '建堆', primary: true },
      { key: 'insert', label: '插入', arg: { label: '值', def: '4' } },
      { key: 'deleteMin', label: '删除最小值' },
      { key: 'decreaseKey', label: '减小关键字', arg: { label: '值,新值', def: '21,2' } },
      { key: 'findMin', label: '查看最小值' }
    ],
    samples: [
      { label: '示例：随机', values: { init: '23,7,21,3,17,11,29,5' } },
      { label: '示例：触发级联剪枝', values: { init: '10,20,30,40,50,25' } }
    ],
    random: function () { return { init: DSV.randArr(DSV.ri(6, 9), 1, 99).join(',') }; },
    run: function (v, action, state) {
      // 结点: {id,v,deg,child(首孩子),sibling,parent,mark}；roots: 数组
      var st = state || { roots: [], next: 1 }, steps = [];
      // 斐波那契结点的 parent/child/sibling 构成环，无法用 JSON 克隆；
      // 快照只需用于渲染，故沿 child/sibling 复制出无环结构（丢弃 parent 指针）
      function cloneFib(roots) {
        function cloneNode(n) {
          if (!n) { return null; }
          var c = { id: n.id, v: n.v, deg: n.deg, mark: !!n.mark, child: null, sibling: null, parent: null };
          var kids = [], ch = n.child;
          while (ch) { kids.push(cloneNode(ch)); ch = ch.sibling; }
          for (var i = 0; i < kids.length; i++) { kids[i].sibling = (i + 1 < kids.length) ? kids[i + 1] : null; }
          c.child = kids.length ? kids[0] : null;
          return c;
        }
        return (roots || []).map(cloneNode);
      }
      function snap(hl, title, sub) { return { roots: cloneFib(st.roots), hl: hl || {}, title: title || '斐波那契堆', sub: sub || '' }; }
      function mkF(x) { var t = { id: 'f' + st.next, v: x, deg: 0, child: null, sibling: null, parent: null, mark: false }; st.next++; return t; }
      function childrenArr(n) { var a = [], c = n.child; while (c) { a.push(c); c = c.sibling; } return a; }
      function addChild(p, c) { c.parent = p; c.sibling = p.child; p.child = c; p.deg++; c.mark = false; }
      function findNode(val) {
        var found = null;
        function dfs(n) { if (!n || found) { return; } if (n.v === val) { found = n; return; } var c = n.child; while (c) { dfs(c); c = c.sibling; } }
        st.roots.forEach(function (r) { dfs(r); });
        return found;
      }
      function concat(arr) { return arr.length ? arr.map(function (c) { return '(' + c.v + ',d' + c.deg + ')'; }).join(',') : '无'; }

      if (action.key === 'build') {
        st = { roots: [], next: 1 };
        var vals = DSV.nums(v.init, 30);
        if (!vals.length) { return []; }
        push(steps, [1], '开始建堆：逐个插入 ' + vals.join(','), snap({}, '斐波那契堆', '建堆'));
        var lastNode = null;
        vals.forEach(function (xv) {
          var node = mkF(xv); st.roots.push(node);
          push(steps, [1, 2], '创建结点 ' + xv + ' 并加入根链表' + (lastNode ? '（紧随 ' + lastNode.v + ' 之后）' : ''), snap({ [node.id]: 'active' }, '斐波那契堆', '插入 ' + xv));
          lastNode = node;
        });
        return { steps: steps, state: st };
      }

      if (action.key === 'insert') {
        var x = Number(action.arg);
        if (!isFinite(x)) { push(steps, [1], '请输入合法的插入值。', snap({}, '斐波那契堆', '插入')); return { steps: steps, state: st }; }
        var node = mkF(x); st.roots.push(node);
        push(steps, [1, 2], '创建结点 ' + x + ' 并入根链表（懒合并，O(1)）', snap({ [node.id]: 'active' }, '斐波那契堆', '插入 ' + x));
        return { steps: steps, state: st };
      }

      if (action.key === 'deleteMin') {
        if (!st.roots.length) { push(steps, [3], '堆为空，无法删除最小值。', snap({}, '斐波那契堆', '空堆')); return { steps: steps, state: st }; }
        var minR = st.roots[0], mi = 0;
        for (var i = 1; i < st.roots.length; i++) { if (st.roots[i].v < minR.v) { minR = st.roots[i]; mi = i; } }
        push(steps, [3, 4], '根链表中值最小的根是 ' + minR.v, snap({ [minR.id]: 'active' }, '斐波那契堆', '删除最小值'));
        st.roots.splice(mi, 1);
        var kids = childrenArr(minR);
        kids.forEach(function (c) { c.parent = null; st.roots.push(c); });
        push(steps, [5], '把 ' + minR.v + ' 的孩子 ' + concat(kids) + ' 移到根链表', snap({}, '斐波那契堆', '孩子入根链表'));
        // consolidate
        var A = {};
        var keep = [];
        st.roots.forEach(function (r) {
          var x = r;
          while (A[x.deg] && A[x.deg] !== x) {
            var y = A[x.deg]; A[x.deg] = null;
            if (x.v > y.v) { var t = x; x = y; y = t; }
            addChild(x, y);
            push(steps, [6], '合并两棵同度(d=' + x.deg + ')的树：根 ' + x.v + ' 成为 ' + y.v + ' 的父结点', snap({ [x.id]: 'active', [y.id]: 'compare' }, '斐波那契堆', 'consolidate'));
          }
          A[x.deg] = x;
        });
        st.roots = Object.keys(A).map(function (k) { return A[k]; }).filter(Boolean);
        push(steps, [6], 'consolidate 完成，根链表合并为 ' + st.roots.length + ' 棵树', snap({}, '斐波那契堆', '整理完成'));
        return { steps: steps, state: st };
      }

      if (action.key === 'decreaseKey') {
        var parts = String(action.arg).split(/[,\s，]+/).map(Number);
        var oldV = parts[0], newV = parts[1];
        if (!isFinite(oldV) || !isFinite(newV)) { push(steps, [7], '请输入「原值,新值」。', snap({}, '斐波那契堆', '减小关键字')); return { steps: steps, state: st }; }
        var node = findNode(oldV);
        if (!node) { push(steps, [7], '堆中不存在值 ' + oldV + '。', snap({}, '斐波那契堆', '减小关键字')); return { steps: steps, state: st }; }
        if (newV >= oldV) { push(steps, [7], '新值必须严格小于原值。', snap({}, '斐波那契堆', '减小关键字')); return { steps: steps, state: st }; }
        node.v = newV;
        push(steps, [7, 8], '将结点 ' + oldV + ' 的值减小为 ' + newV, snap({ [node.id]: 'active' }, '斐波那契堆', '减小关键字'));
        if (node.parent) {
          if (newV >= node.parent.v) {
            push(steps, [8], '新值 ' + newV + ' ≥ 父结点 ' + node.parent.v + '，无需剪枝', snap({ [node.id]: 'done' }, '斐波那契堆', '无需剪枝'));
          } else {
            // cut
            var parent = node.parent;
            function cut(c) {
              if (!c.parent) { return; }
              var p = c.parent;
              // 从 p 的孩子链表中移除 c
              if (p.child === c) { p.child = c.sibling; }
              else { var sib = p.child; while (sib && sib.sibling !== c) { sib = sib.sibling; } if (sib) { sib.sibling = c.sibling; } }
              p.deg--;
              c.parent = null; c.sibling = null; c.mark = false;
              st.roots.push(c);
            }
            cut(node);
            push(steps, [8], '新值 ' + newV + ' < 父结点 ' + parent.v + '，将 ' + newV + ' 从父结点剪下并加入根链表（cut）',
              snap({ [node.id]: 'active' }, '斐波那契堆', 'cut'));
            var p = parent;
            while (p && p.mark) {
              var cp = p.parent;
              cut(p);
              push(steps, [9], '父结点 ' + (p.v) + ' 已被标记（mark），继续级联剪枝（cascading cut）', snap({ [p.id]: 'active' }, '斐波那契堆', '级联剪枝'));
              p = cp;
            }
            if (p) { p.mark = true; push(steps, [9], '父结点 ' + p.v + ' 未被标记，打上 mark 标记，级联剪枝结束', snap({ [p.id]: 'active' }, '斐波那契堆', '标记 mark')); }
          }
        } else {
          push(steps, [8], node.v + ' 已在根链表，直接减小即可', snap({ [node.id]: 'done' }, '斐波那契堆', '根为最小值'));
        }
        return { steps: steps, state: st };
      }

      if (action.key === 'findMin') {
        if (!st.roots.length) { push(steps, [3], '堆为空。', snap({}, '斐波那契堆', '空堆')); return { steps: steps, state: st }; }
        var m = st.roots[0];
        st.roots.forEach(function (r) { if (r.v < m.v) { m = r; } });
        push(steps, [3], '最小值即根链表中最小者：' + m.v, snap({ [m.id]: 'active' }, '斐波那契堆', '查看最小值'));
        return { steps: steps, state: st };
      }

      push(steps, [0], '请选择操作。', snap({}, '斐波那契堆', '就绪'));
      return { steps: steps, state: st };
    },
    render: function (kr, s) {
      if (!s) { kr.html('__t', S.text(500, 28, '斐波那契堆', 'vt')); kr.end(); return; }
      var roots = (s.roots || []).filter(function (x) { return x; });
      drawForest(kr, roots, s.hl, s.title, s.sub, { extra: function (n) { return n.mark ? '★' : ''; } });
    }
  });

})();
