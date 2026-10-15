/* ============================================================
   viz-sorting.js —— 排序章节（10 个算法）
   冒泡 / 选择 / 插入 / 希尔 / 归并 / 快速 / 桶 / 计数 / 基数 / 堆排序
   ============================================================ */
(function () {
  'use strict';
  var DSV = window.DSV, S = DSV.svg;

  /* ---------- 通用工具 ---------- */
  function push(steps, code, desc, snap) { steps.push({ code: code, desc: desc, snap: snap }); }
  function zeros(n) { var a = []; for (var i = 0; i < n; i++) { a.push(''); } return a; }

  /** 柱状数组 */
  function drawArr(kr, snap, opt) {
    opt = opt || {};
    var a = snap.a || [], n = a.length;
    var baseY = opt.baseY || 420, topY = opt.topY || 90, cw = opt.cw || 46;
    if (snap.title) { kr.html('__t', S.text(500, 30, snap.title, 'vt')); }
    if (!n) { kr.html('__t2', S.text(500, baseY - 120, '（数组为空，请输入数据）', 'vs')); return; }
    var lay = DSV.barLayout(n, { baseY: baseY, topY: topY, cw: cw });
    var max = 1;
    a.forEach(function (v) { if (typeof v === 'number') { max = Math.max(max, Math.abs(v)); } });
    var maxH = baseY - topY - 40;
    for (var i = 0; i < n; i++) {
      var L = lay[i], v = a[i];
      var h = (typeof v === 'number') ? 22 + (Math.abs(v) / max) * maxH : 44;
      var cls = (snap.c && snap.c[i]) || '';
      var inner = '<rect class="bar ' + cls + '" x="' + (-L.w / 2) + '" y="' + (-h) + '" width="' + L.w + '" height="' + h + '" rx="3"/>' +
        S.text(0, -h - 12, v, 'bar-val') +
        S.text(0, 18, i, 'idx-txt');
      kr.g('b' + i, 'translate(' + L.cx + ',' + baseY + ')', 'k', inner);
    }
    (snap.idx || []).forEach(function (p, k) {
      var L = lay[p.i]; if (!L) { return; }
      kr.g('p' + k, 'translate(' + L.cx + ',' + (baseY + 38) + ')', 'k', S.text(0, 0, p.t, 'ptr' + (p.c ? ' ptr-t' : '')));
    });
    if (snap.sub) { kr.html('__s', S.text(500, baseY + 62, snap.sub, 'vs')); }
  }

  /** 一行小格子（辅助数组 / 输出 / 计数数组） */
  function drawRow(kr, key, label, items, y, opt) {
    opt = opt || {};
    var cw = opt.cw || 36, gap = opt.gap || 4, n = items.length;
    var total = n * cw + (n - 1) * gap;
    var x0 = (1000 - total) / 2;
    var inner = '';
    if (label) { inner += S.text(500, y - 24, label, 'vs'); }
    for (var i = 0; i < n; i++) {
      var it = items[i] || {};
      var x = x0 + i * (cw + gap);
      if (it.v === undefined || it.v === null || it.v === '') { continue; }
      inner += '<rect class="cell ' + (it.cls || '') + '" x="' + x + '" y="' + (y - 14) + '" width="' + cw + '" height="28" rx="4"/>' +
        S.text(x + cw / 2, y, it.v, 'cell-txt');
      if (it.m) { inner += S.text(x + cw / 2, y + 22, it.m, 'ptr'); }
    }
    kr.html(key, inner);
  }

  /** 桶（竖向队列） */
  function drawBuckets(kr, bks, y0, opt) {
    opt = opt || {};
    var m = bks.length, cw = opt.cw || 44, gap = 8, H = opt.h || 230;
    var total = m * cw + (m - 1) * gap, x0 = (1000 - total) / 2;
    if (opt.title) { kr.html('__bt', S.text(500, y0 - 22, opt.title, 'vs')); }
    for (var b = 0; b < m; b++) {
      var x = x0 + b * (cw + gap);
      var inner = S.text(x + cw / 2, y0, (opt.labels ? opt.labels[b] : b), 'vs') +
        '<rect class="frame dash" x="' + x + '" y="' + (y0 + 12) + '" width="' + cw + '" height="' + H + '" rx="4"/>';
      var list = bks[b] || [];
      // 自底向上入桶：最后一个元素恰好落在框架内（底边距框架底 2px）；
      // 元素较多时压缩行距（最小等于格子高度，保证互不重叠）
      var pitch = Math.max(25, Math.min(27, (H - 4) / Math.max(1, list.length)));
      for (var k = 0; k < list.length; k++) {
        var yy = y0 + 12 + H - 27 - k * pitch;
        inner += '<rect class="cell ' + (list[k].cls || '') + '" x="' + x + '" y="' + yy + '" width="' + cw + '" height="25" rx="4"/>' +
          S.text(x + cw / 2, yy + 13, list[k].v, 'cell-txt');
      }
      kr.html('bk' + b, inner);
    }
  }

  var IN = [{ key: 'arr', label: '数组', def: '5,2,9,1,5,6,3', hint: '逗号或空格分隔的数字' }];
  var SAM = [
    { label: '示例：小规模乱序', values: { arr: '5,2,9,1,5,6,3' } },
    { label: '示例：完全逆序', values: { arr: '9,8,7,6,5,4,3,2,1' } },
    { label: '示例：近乎有序', values: { arr: '1,2,3,5,4,6,7,8' } },
    { label: '示例：含重复元素', values: { arr: '4,4,2,7,2,9,4,1' } }
  ];
  var RND = function () { return { arr: DSV.randArr(DSV.ri(8, 14), 1, 99).join(',') }; };

  /* ============================================================
     1. 冒泡排序
     ============================================================ */
  DSV.register({
    id: 'bubble', name: '冒泡排序', category: '排序',
    desc: '反复扫描数组，比较相邻元素，逆序就交换，使最大元素像气泡一样浮到末尾。稳定排序，最坏/平均 O(n²)，最好 O(n)。',
    code: [
      'bubbleSort(A):',
      '  n = A.length',
      '  for i = 0 to n-2:',
      '    swapped = false',
      '    for j = 0 to n-i-2:',
      '      if A[j] > A[j+1]:',
      '        swap(A[j], A[j+1])',
      '        swapped = true',
      '    if not swapped: break',
      '  return A'
    ],
    inputs: IN, samples: SAM, random: RND,
    run: function (v) {
      var a = DSV.nums(v.arr, 26), n = a.length;
      if (n < 2) { return []; }
      var st = [], c = zeros(n), done = [];
      for (var q = 0; q < n; q++) { done.push(false); }
      function cc() { var o = []; for (var i = 0; i < n; i++) { o[i] = done[i] ? 'done' : (c[i] || ''); } return o; }
      function sn(extra) {
        return { a: a.slice(), c: cc(), idx: (extra && extra.idx) || [], title: '冒泡排序', sub: (extra && extra.sub) || '' };
      }
      push(st, [0, 1], '开始冒泡排序：n = ' + n, sn());
      for (var i = 0; i < n - 1; i++) {
        push(st, [2, 3], '第 ' + (i + 1) + ' 轮：swapped = false，比较范围 0 … ' + (n - i - 1), sn({ sub: '第 ' + (i + 1) + ' 轮' }));
        var swapped = false;
        for (var j = 0; j < n - i - 1; j++) {
          c[j] = 'compare'; c[j + 1] = 'compare';
          push(st, [5], '比较 A[' + j + ']=' + a[j] + ' 与 A[' + (j + 1) + ']=' + a[j + 1] + '：' + a[j] +
            (a[j] > a[j + 1] ? ' > ' : ' ≤ ') + a[j + 1] + (a[j] > a[j + 1] ? '，逆序需要交换' : '，保持不动'),
            sn({ idx: [{ i: j, t: 'j' }, { i: j + 1, t: 'j+1' }], sub: '第 ' + (i + 1) + ' 轮' }));
          if (a[j] > a[j + 1]) {
            var t = a[j]; a[j] = a[j + 1]; a[j + 1] = t; swapped = true;
            c[j] = 'swap'; c[j + 1] = 'swap';
            push(st, [6, 7], '交换 A[' + j + '] 与 A[' + (j + 1) + ']，swapped = true',
              sn({ idx: [{ i: j, t: 'j', c: 1 }, { i: j + 1, t: 'j+1', c: 1 }], sub: '第 ' + (i + 1) + ' 轮' }));
          }
          c[j] = ''; c[j + 1] = '';
        }
        done[n - 1 - i] = true;
        push(st, [8], '第 ' + (i + 1) + ' 轮结束：A[' + (n - 1 - i) + ']=' + a[n - 1 - i] + ' 已沉到末尾' +
          (swapped ? '' : '；本轮没有交换，数组已有序，提前结束'), sn({ sub: '第 ' + (i + 1) + ' 轮' }));
        if (!swapped) { for (var k = 0; k < n; k++) { done[k] = true; } break; }
      }
      for (var m = 0; m < n; m++) { done[m] = true; }
      push(st, [9], '排序完成：' + a.join(', '), sn({ sub: '全部就位' }));
      return st;
    },
    render: function (kr, s) { if (s) { drawArr(kr, s); } }
  });

  /* ============================================================
     2. 选择排序
     ============================================================ */
  DSV.register({
    id: 'selection', name: '选择排序', category: '排序',
    desc: '每一轮在未排序区间里线性扫描找出最小值，再与区间首元素交换。不稳定排序，比较次数恒为 O(n²)，交换次数 O(n)。',
    code: [
      'selectionSort(A):',
      '  n = A.length',
      '  for i = 0 to n-2:',
      '    min = i',
      '    for j = i+1 to n-1:',
      '      if A[j] < A[min]: min = j',
      '    if min != i: swap(A[i], A[min])',
      '  return A'
    ],
    inputs: IN, samples: SAM, random: RND,
    run: function (v) {
      var a = DSV.nums(v.arr, 26), n = a.length;
      if (n < 2) { return []; }
      var st = [], c = zeros(n), done = [];
      for (var q = 0; q < n; q++) { done.push(false); }
      function cc() { var o = []; for (var i = 0; i < n; i++) { o[i] = done[i] ? 'done' : (c[i] || ''); } return o; }
      function sn(idx, sub) { return { a: a.slice(), c: cc(), idx: idx || [], title: '选择排序', sub: sub || '' }; }
      push(st, [0, 1], '开始选择排序：n = ' + n, sn());
      for (var i = 0; i < n - 1; i++) {
        var min = i;
        c[i] = 'active';
        push(st, [2, 3], '第 ' + (i + 1) + ' 轮：假设最小值在位置 i = ' + i + '（值 ' + a[i] + '）', sn([{ i: i, t: 'i' }, { i: min, t: 'min' }], '第 ' + (i + 1) + ' 轮'));
        for (var j = i + 1; j < n; j++) {
          if (c[min] === 'active') { c[min] = 'path'; }
          c[j] = 'compare';
          push(st, [5], '比较 A[' + j + ']=' + a[j] + ' 与当前最小值 A[' + min + ']=' + a[min] + '：' +
            (a[j] < a[min] ? '更小，更新 min = ' + j : '不小于当前最小值，min 不变'),
            sn([{ i: i, t: 'i' }, { i: j, t: 'j' }, { i: min, t: 'min' }], '第 ' + (i + 1) + ' 轮'));
          if (a[j] < a[min]) { c[min] = ''; min = j; c[min] = 'active'; }
          else { c[j] = ''; }
        }
        if (min !== i) {
          var t = a[i]; a[i] = a[min]; a[min] = t;
          c[i] = 'swap'; c[min] = 'swap';
          push(st, [6], '把最小值 A[' + min + '] 与 A[' + i + '] 交换，A[' + i + '] 归位',
            sn([{ i: i, t: 'i', c: 1 }, { i: min, t: 'min', c: 1 }], '第 ' + (i + 1) + ' 轮'));
        } else {
          push(st, [6], 'min == i，A[' + i + '] 本身就是最小值，无需交换', sn([{ i: i, t: 'i' }], '第 ' + (i + 1) + ' 轮'));
        }
        c = zeros(n); done[i] = true;
      }
      for (var m = 0; m < n; m++) { done[m] = true; }
      push(st, [7], '排序完成：' + a.join(', '), sn([], '全部就位'));
      return st;
    },
    render: function (kr, s) { if (s) { drawArr(kr, s); } }
  });

  /* ============================================================
     3. 插入排序
     ============================================================ */
  DSV.register({
    id: 'insertion', name: '插入排序', category: '排序',
    desc: '把数组看成「已排序前缀 + 未排序后缀」，逐个把新元素插入到前缀中的合适位置。稳定排序，最好 O(n)，最坏 O(n²)。',
    code: [
      'insertionSort(A):',
      '  for i = 1 to n-1:',
      '    key = A[i]',
      '    j = i - 1',
      '    while j >= 0 and A[j] > key:',
      '      A[j+1] = A[j]',
      '      j = j - 1',
      '    A[j+1] = key',
      '  return A'
    ],
    inputs: IN, samples: SAM, random: RND,
    run: function (v) {
      var a = DSV.nums(v.arr, 26), n = a.length;
      if (n < 2) { return []; }
      var st = [], c = zeros(n), done = [];
      for (var q = 0; q < n; q++) { done.push(false); }
      done[0] = true;
      function cc() { var o = []; for (var i = 0; i < n; i++) { o[i] = done[i] ? 'done' : (c[i] || ''); } return o; }
      function sn(idx, sub, key) { return { a: a.slice(), c: cc(), idx: idx || [], title: '插入排序' + (key ? '（key = ' + key + '）' : ''), sub: sub || '' }; }
      push(st, [0], '开始插入排序：A[0] 视为长度 1 的已排序区间', sn([{ i: 0, t: '已序' }]));
      for (var i = 1; i < n; i++) {
        var key = a[i];
        c[i] = 'active';
        push(st, [1, 2], '取出 key = A[' + i + '] = ' + key + '，准备插入左侧已排序区间', sn([{ i: i, t: 'key' }], '处理第 ' + (i + 1) + ' 个元素', key));
        var j = i - 1;
        push(st, [3], '令 j = i - 1 = ' + j + '，从右往左找插入位置', sn([{ i: i, t: 'key' }, { i: j, t: 'j' }], '', key));
        var moved = false;
        while (j >= 0 && a[j] > key) {
          if (!moved) { c[i] = 'swap'; }
          c[j] = 'compare';
          push(st, [4], 'A[' + j + ']=' + a[j] + ' > key=' + key + '，需要右移', sn([{ i: j, t: 'j' }, { i: i, t: 'key' }], '', key));
          a[j + 1] = a[j];
          c[j] = 'done'; c[j + 1] = 'swap';
          push(st, [5, 6], '把 A[' + j + '] 右移到 A[' + (j + 1) + ']，j 递减为 ' + (j - 1), sn([{ i: j, t: 'j', c: 1 }, { i: j + 1, t: '←移' }], '', key));
          c[j] = 'done'; j--;
          moved = true;
        }
        a[j + 1] = key;
        c = zeros(n);
        for (var k = 0; k <= i; k++) { done[k] = true; }
        c[j + 1] = 'swap';
        push(st, [7], (j >= 0 ? 'A[' + j + ']=' + a[j] + ' ≤ key，停止' : 'j < 0，已到数组头部') + '，把 key 放入 A[' + (j + 1) + ']',
          sn([{ i: j + 1, t: '插入', c: 1 }], '前缀长度 ' + (i + 1), key));
        c = zeros(n);
      }
      push(st, [8], '排序完成：' + a.join(', '), sn([], '全部就位'));
      return st;
    },
    render: function (kr, s) { if (s) { drawArr(kr, s); } }
  });

  /* ============================================================
     4. 希尔排序
     ============================================================ */
  DSV.register({
    id: 'shell', name: '希尔排序', category: '排序',
    desc: '按逐渐缩小的间隔 gap 对「分组子数组」做插入排序，最后 gap=1 时退化为普通插入排序。不稳定，时间复杂度约 O(n^1.3)~O(n²)。',
    code: [
      'shellSort(A):',
      '  n = A.length',
      '  for gap = n/2; gap > 0; gap = gap/2:',
      '    for i = gap to n-1:',
      '      key = A[i]; j = i',
      '      while j >= gap and A[j-gap] > key:',
      '        A[j] = A[j-gap]',
      '        j = j - gap',
      '      A[j] = key',
      '  return A'
    ],
    inputs: IN, samples: SAM, random: RND,
    run: function (v) {
      var a = DSV.nums(v.arr, 26), n = a.length;
      if (n < 2) { return []; }
      var st = [], c = zeros(n);
      function sn(idx, sub) { return { a: a.slice(), c: c.slice(), idx: idx || [], title: '希尔排序', sub: sub || '' }; }
      push(st, [0, 1], '开始希尔排序：n = ' + n, sn());
      for (var gap = Math.floor(n / 2); gap > 0; gap = Math.floor(gap / 2)) {
        c = zeros(n);
        push(st, [2], '取间隔 gap = ' + gap + '，把下标同余的元素分为一组，共 ' + gap + ' 组', sn([], 'gap = ' + gap));
        for (var i = gap; i < n; i++) {
          var key = a[i], j = i;
          c[i] = 'active';
          push(st, [3, 4], 'i = ' + i + '，key = A[' + i + '] = ' + key + '，同组前一个元素是 A[' + (i - gap) + ']',
            sn([{ i: i, t: 'i' }, { i: i - gap, t: 'i-gap' }], 'gap = ' + gap));
          while (j >= gap && a[j - gap] > key) {
            c[j - gap] = 'compare';
            push(st, [5], 'A[' + (j - gap) + ']=' + a[j - gap] + ' > key=' + key + '，需要后移',
              sn([{ i: j - gap, t: '比较' }, { i: j, t: 'j' }], 'gap = ' + gap));
            a[j] = a[j - gap];
            c[j] = 'swap'; c[j - gap] = 'done';
            push(st, [6, 7], 'A[' + (j - gap) + '] 移到 A[' + j + ']，j = ' + (j - gap),
              sn([{ i: j, t: 'j', c: 1 }], 'gap = ' + gap));
            j -= gap;
          }
          a[j] = key;
          c = zeros(n); c[j] = 'swap';
          push(st, [8], '把 key=' + key + ' 放入 A[' + j + ']',
            sn([{ i: j, t: '放入', c: 1 }], 'gap = ' + gap));
          c = zeros(n);
        }
        c = zeros(n);
        push(st, [2], 'gap = ' + gap + ' 的分组插入排序完成：' + a.join(', '), sn([], 'gap = ' + gap + ' 完成'));
      }
      var d = zeros(n); for (var m = 0; m < n; m++) { d[m] = 'done'; }
      push(st, [9], '排序完成（最后 gap=1 相当于一次插入排序）：' + a.join(', '), { a: a.slice(), c: d, title: '希尔排序', sub: '全部就位' });
      return st;
    },
    render: function (kr, s) { if (s) { drawArr(kr, s); } }
  });

  /* ============================================================
     5. 归并排序
     ============================================================ */
  DSV.register({
    id: 'merge', name: '归并排序', category: '排序',
    desc: '分治法：把数组递归地一分为二分别排序，再把两个有序段合并。稳定排序，时间 O(n log n)，需要 O(n) 辅助空间。',
    code: [
      'mergeSort(A, lo, hi):',
      '  if lo >= hi: return',
      '  mid = (lo + hi) / 2',
      '  mergeSort(A, lo, mid)',
      '  mergeSort(A, mid+1, hi)',
      '  merge(A, lo, mid, hi)',
      '',
      'merge(A, lo, mid, hi):',
      '  L = A[lo..mid]; R = A[mid+1..hi]',
      '  i = 0; j = 0; k = lo',
      '  while i < |L| and j < |R|:',
      '    if L[i] <= R[j]: A[k++] = L[i++]',
      '    else:            A[k++] = R[j++]',
      '  剩余元素直接拷回 A'
    ],
    viewBox: '0 0 1000 620',
    inputs: IN, samples: SAM, random: RND,
    run: function (v) {
      var a = DSV.nums(v.arr, 22), n = a.length;
      if (n < 2) { return []; }
      var st = [], c = zeros(n);
      function sn(idx, sub, seg, out) {
        return { a: a.slice(), c: c.slice(), idx: idx || [], title: '归并排序', sub: sub || '', seg: seg, out: out };
      }

      function merge(lo, mid, hi) {
        var L = a.slice(lo, mid + 1), R = a.slice(mid + 1, hi + 1);
        c = zeros(n);
        for (var t = lo; t <= mid; t++) { c[t] = 'compare'; }
        for (var t2 = mid + 1; t2 <= hi; t2++) { c[t2] = 'active'; }
        push(st, [8, 9], '合并区间 [' + lo + '…' + hi + ']：左段 ' + L.join(',') + '，右段 ' + R.join(',') + '，i=0, j=0, k=' + lo,
          sn([{ i: lo, t: 'lo' }, { i: mid, t: 'mid' }, { i: hi, t: 'hi' }], '合并 [' + lo + '…' + hi + ']', { lo: lo, mid: mid, hi: hi },
            { L: L.map(function (x) { return { v: x, cls: 'compare' }; }), R: R.map(function (x) { return { v: x, cls: 'active' }; }), k: -1 }));
        var i = 0, j = 0, k = lo;
        var out = zeros(hi - lo + 1);
        while (i < L.length && j < R.length) {
          c = zeros(n);
          for (var t3 = lo; t3 <= hi; t3++) { c[t3] = (t3 <= mid) ? 'compare' : 'active'; }
          if (lo + i <= mid) { c[lo + i] = 'path'; }
          if (mid + 1 + j <= hi) { c[mid + 1 + j] = 'path'; }
          c[k] = 'swap';
          push(st, [11], '比较 L[' + i + ']=' + L[i] + ' 与 R[' + j + ']=' + R[j] + '：' + (L[i] <= R[j] ? 'L 更小（相等取左，保证稳定）' : 'R 更小'),
            sn([{ i: Math.min(n - 1, lo + i), t: 'i' }, { i: Math.min(n - 1, mid + 1 + j), t: 'j' }, { i: k, t: 'k', c: 1 }],
              '合并 [' + lo + '…' + hi + ']', { lo: lo, mid: mid, hi: hi },
              { L: L.map(function (x, q) { return { v: x, cls: q === i ? 'path' : 'compare' }; }), R: R.map(function (x, q) { return { v: x, cls: q === j ? 'path' : 'active' }; }), k: k - lo }));
          if (L[i] <= R[j]) { a[k] = L[i]; out[k - lo] = L[i]; i++; }
          else { a[k] = R[j]; out[k - lo] = R[j]; j++; }
          k++;
          c = zeros(n);
          for (var t4 = lo; t4 < k; t4++) { c[t4] = 'done'; }
          c[k - 1] = 'swap';
          push(st, [12], '写入 A[' + (k - 1) + '] = ' + a[k - 1] + '，k 前进到 ' + k,
            sn([{ i: k - 1, t: 'k', c: 1 }], '合并 [' + lo + '…' + hi + ']', { lo: lo, mid: mid, hi: hi },
              { L: L.map(function (x, q) { return { v: x, cls: q < i ? 'done' : 'compare' }; }), R: R.map(function (x, q) { return { v: x, cls: q < j ? 'done' : 'active' }; }), k: k - 1 - lo }));
        }
        while (i < L.length) {
          a[k] = L[i]; out[k - lo] = L[i];
          push(st, [13], '右段已用完，把左段剩余 L[' + i + ']=' + L[i] + ' 拷入 A[' + k + ']',
            sn([{ i: k, t: 'k', c: 1 }], '合并 [' + lo + '…' + hi + ']', { lo: lo, mid: mid, hi: hi },
              { L: L.map(function (x, q) { return { v: x, cls: q <= i ? 'done' : 'compare' }; }), R: R.map(function (x, q) { return { v: x, cls: q < j ? 'done' : 'active' }; }), k: k - lo }));
          i++; k++;
        }
        while (j < R.length) {
          a[k] = R[j]; out[k - lo] = R[j];
          push(st, [13], '左段已用完，把右段剩余 R[' + j + ']=' + R[j] + ' 拷入 A[' + k + ']',
            sn([{ i: k, t: 'k', c: 1 }], '合并 [' + lo + '…' + hi + ']', { lo: lo, mid: mid, hi: hi },
              { L: L.map(function (x, q) { return { v: x, cls: q < i ? 'done' : 'compare' }; }), R: R.map(function (x, q) { return { v: x, cls: q <= j ? 'done' : 'active' }; }), k: k - lo }));
          j++; k++;
        }
        c = zeros(n);
        for (var t5 = lo; t5 <= hi; t5++) { c[t5] = 'done'; }
        push(st, [13], '区间 [' + lo + '…' + hi + '] 合并完成 → ' + a.slice(lo, hi + 1).join(','),
          sn([], '[' + lo + '…' + hi + '] 有序', { lo: lo, mid: mid, hi: hi },
            { L: L.map(function (x) { return { v: x, cls: 'done' }; }), R: R.map(function (x) { return { v: x, cls: 'done' }; }), k: -1 }));
      }

      function ms(lo, hi) {
        c = zeros(n);
        for (var t = lo; t <= hi; t++) { c[t] = 'active'; }
        push(st, [0, 1], '进入 mergeSort(' + lo + ', ' + hi + ')' + (lo >= hi ? '：区间长度 ≤ 1，直接返回' : ''),
          sn([{ i: lo, t: 'lo' }, { i: hi, t: 'hi' }], '分解 [' + lo + '…' + hi + ']'));
        if (lo >= hi) { c = zeros(n); return; }
        var mid = Math.floor((lo + hi) / 2);
        push(st, [2], 'mid = ' + mid + '，把区间分为 [' + lo + '…' + mid + '] 与 [' + (mid + 1) + '…' + hi + ']',
          sn([{ i: lo, t: 'lo' }, { i: mid, t: 'mid' }, { i: hi, t: 'hi' }], '分解 [' + lo + '…' + hi + ']'));
        push(st, [3], '递归排序左半段 [' + lo + '…' + mid + ']', sn([{ i: lo, t: 'lo' }, { i: mid, t: 'mid' }], '递归左半'));
        ms(lo, mid);
        push(st, [4], '递归排序右半段 [' + (mid + 1) + '…' + hi + ']', sn([{ i: mid + 1, t: 'mid+1' }, { i: hi, t: 'hi' }], '递归右半'));
        ms(mid + 1, hi);
        push(st, [5], '左右两段都已有序，开始合并', sn([], '准备合并'));
        merge(lo, mid, hi);
      }

      push(st, [0], '开始归并排序：n = ' + n, sn());
      ms(0, n - 1);
      var d = zeros(n); for (var m = 0; m < n; m++) { d[m] = 'done'; }
      push(st, [5], '排序完成：' + a.join(', '), { a: a.slice(), c: d, title: '归并排序', sub: '全部就位' });
      return st;
    },
    render: function (kr, s) {
      if (!s) { return; }
      drawArr(kr, { a: s.a, c: s.c, idx: s.idx, title: s.title, sub: s.sub }, { baseY: 380, topY: 80, cw: 44 });
      if (s.out) {
        drawRow(kr, '__L', '左段 L', s.out.L, 470);
        drawRow(kr, '__R', '右段 R', s.out.R, 530);
        var cells = [];
        for (var i = 0; i < (s.out.L.length + s.out.R.length); i++) {
          var done = false;
          cells.push({ v: '·', cls: i === s.out.k ? 'swap' : '' });
        }
        drawRow(kr, '__O', '合并输出（k 指向当前写入位置）', cells, 590);
      }
    }
  });

  /* ============================================================
     6. 快速排序
     ============================================================ */
  DSV.register({
    id: 'quick', name: '快速排序', category: '排序',
    desc: '分治法：选一个基准 pivot，把小于它的放左边、大于它的放右边（划分），再递归处理两侧。不稳定，平均 O(n log n)，最坏 O(n²)。这里使用 Lomuto 划分（取末元素为 pivot）。',
    code: [
      'quickSort(A, lo, hi):',
      '  if lo >= hi: return',
      '  p = partition(A, lo, hi)',
      '  quickSort(A, lo, p-1)',
      '  quickSort(A, p+1, hi)',
      '',
      'partition(A, lo, hi):',
      '  pivot = A[hi]',
      '  i = lo',
      '  for j = lo to hi-1:',
      '    if A[j] <= pivot:',
      '      swap(A[i], A[j]); i = i + 1',
      '  swap(A[i], A[hi])',
      '  return i'
    ],
    inputs: IN, samples: SAM, random: RND,
    run: function (v) {
      var a = DSV.nums(v.arr, 22), n = a.length;
      if (n < 2) { return []; }
      var st = [], c = zeros(n), done = [];
      for (var q = 0; q < n; q++) { done.push(false); }
      function cc() { var o = []; for (var i = 0; i < n; i++) { o[i] = done[i] ? 'done' : (c[i] || ''); } return o; }
      function sn(idx, sub) { return { a: a.slice(), c: cc(), idx: idx || [], title: '快速排序', sub: sub || '' }; }

      function partition(lo, hi) {
        var pivot = a[hi];
        c = zeros(n);
        c[hi] = 'active';
        push(st, [7, 8], '划分 [' + lo + '…' + hi + ']：pivot = A[' + hi + '] = ' + pivot + '，i = ' + lo,
          sn([{ i: hi, t: 'pivot' }, { i: lo, t: 'i' }], '划分 [' + lo + '…' + hi + ']'));
        var i = lo;
        for (var j = lo; j < hi; j++) {
          c = zeros(n); c[hi] = 'active'; c[j] = 'compare'; if (i < n) { c[i] = 'path'; }
          push(st, [10], 'j = ' + j + '：比较 A[' + j + ']=' + a[j] + ' 与 pivot=' + pivot + '：' +
            (a[j] <= pivot ? '≤ pivot，属于左区' : '> pivot，暂不处理'),
            sn([{ i: j, t: 'j' }, { i: i, t: 'i' }, { i: hi, t: 'pivot' }], '划分 [' + lo + '…' + hi + ']'));
          if (a[j] <= pivot) {
            var t = a[i]; a[i] = a[j]; a[j] = t;
            c = zeros(n); c[hi] = 'active'; c[i] = 'swap'; c[j] = 'swap';
            push(st, [11], '交换 A[' + i + '] 与 A[' + j + ']，i 前进到 ' + (i + 1) + '（i 左侧都是 ≤ pivot 的元素）',
              sn([{ i: i, t: 'i', c: 1 }, { i: j, t: 'j', c: 1 }, { i: hi, t: 'pivot' }], '划分 [' + lo + '…' + hi + ']'));
            i++;
          }
        }
        var t2 = a[i]; a[i] = a[hi]; a[hi] = t2;
        c = zeros(n); c[i] = 'swap'; c[hi] = 'swap';
        push(st, [12], '把 pivot 换到 A[' + i + ']，此时左边全 ≤ ' + pivot + '，右边全 > ' + pivot,
          sn([{ i: i, t: 'pivot 就位', c: 1 }], '划分 [' + lo + '…' + hi + ']'));
        done[i] = true;
        c = zeros(n);
        push(st, [13], '返回划分点 p = ' + i, sn([{ i: i, t: 'p' }], 'p = ' + i));
        return i;
      }

      function qs(lo, hi) {
        c = zeros(n);
        for (var t = lo; t <= hi; t++) { if (!done[t]) { c[t] = 'active'; } }
        push(st, [0, 1], '进入 quickSort(' + lo + ', ' + hi + ')' + (lo >= hi ? '：区间长度 ≤ 1，直接返回' : ''),
          sn([{ i: lo, t: 'lo' }, { i: hi, t: 'hi' }], '递归区间 [' + lo + '…' + hi + ']'));
        if (lo >= hi) { if (lo === hi) { done[lo] = true; } return; }
        push(st, [2], '对 [' + lo + '…' + hi + '] 做划分', sn([{ i: lo, t: 'lo' }, { i: hi, t: 'hi' }], '划分前'));
        var p = partition(lo, hi);
        push(st, [3], '递归排序左半 [' + lo + '…' + (p - 1) + ']', sn([{ i: p, t: 'p' }], '递归左半'));
        qs(lo, p - 1);
        push(st, [4], '递归排序右半 [' + (p + 1) + '…' + hi + ']', sn([{ i: p, t: 'p' }], '递归右半'));
        qs(p + 1, hi);
      }

      push(st, [0], '开始快速排序：n = ' + n, sn());
      qs(0, n - 1);
      for (var m = 0; m < n; m++) { done[m] = true; }
      push(st, [4], '排序完成：' + a.join(', '), sn([], '全部就位'));
      return st;
    },
    render: function (kr, s) { if (s) { drawArr(kr, s); } }
  });

  /* ============================================================
     7. 桶排序
     ============================================================ */
  DSV.register({
    id: 'bucket', name: '桶排序', category: '排序',
    desc: '把元素按值域均匀分配到若干个桶里，每个桶内单独排序（这里用插入排序），再按桶序依次取出。数据均匀时可达 O(n+k)。',
    code: [
      'bucketSort(A, k):',
      '  n = A.length',
      '  建 k 个空桶 B[0..k-1]',
      '  for x in A:',
      '    B[ floor(x * k / (max+1)) ].add(x)',
      '  for b = 0 to k-1:',
      '    insertionSort(B[b])',
      '  按桶序把各桶元素依次写回 A',
      '  return A'
    ],
    viewBox: '0 0 1000 700',
    inputs: [{ key: 'arr', label: '数组（0-99）', def: '42,32,33,52,37,47,51,8,16,21', hint: '0-99 的整数' },
    { key: 'k', label: '桶数', def: '5', hint: '2-10' }],
    samples: [
      { label: '示例：均匀分布', values: { arr: '42,32,33,52,37,47,51,8,16,21', k: '5' } },
      { label: '示例：集中在低段', values: { arr: '3,7,12,9,18,2,15,11,6,20', k: '4' } }
    ],
    random: function () { return { arr: DSV.randArr(DSV.ri(10, 16), 0, 99).join(','), k: String(DSV.ri(4, 7)) }; },
    run: function (v) {
      var a = DSV.nums(v.arr, 24), n = a.length;
      if (!n) { return []; }
      var k = Math.max(1, Math.min(10, parseInt(v.k, 10) || 5));
      var st = [], buckets = [], i;
      for (i = 0; i < k; i++) { buckets.push([]); }
      var max = Math.max.apply(null, a.concat([1]));
      function sn(idx, sub, hi) {
        hi = hi || {};
        return {
          a: a.slice(), c: (function () { var o = []; for (var t = 0; t < n; t++) { o[t] = (hi.i === t) ? 'active' : ''; } return o; })(),
          idx: idx || [], title: '桶排序（k = ' + k + ' 个桶）', sub: sub || '',
          bks: buckets.map(function (b, bi) { return b.map(function (x) { return { v: x, cls: (hi.b === bi) ? 'active' : '' }; }); })
        };
      }
      push(st, [0, 1], '开始桶排序：n = ' + n + '，max = ' + max + '，桶数 k = ' + k, sn());
      for (i = 0; i < n; i++) {
        var b = Math.floor(a[i] * k / (max + 1));
        buckets[b].push(a[i]);
        push(st, [3, 4], '元素 ' + a[i] + ' 落入桶 B[' + b + ']（floor(' + a[i] + '×' + k + '/' + (max + 1) + ') = ' + b + '）',
          sn([{ i: i, t: 'x' }], '分配元素 ' + a[i], { i: i, b: b }));
      }
      push(st, [3, 4], '分配完成，各桶内容：' + buckets.map(function (b2, bi) { return 'B' + bi + '=[' + b2.join(',') + ']'; }).join(' '), sn());
      for (var bi = 0; bi < k; bi++) {
        push(st, [6], '对桶 B[' + bi + '] 做插入排序', sn([], '排序桶 B' + bi, { b: bi }));
        var arr = buckets[bi];
        for (var p = 1; p < arr.length; p++) {
          var key = arr[p], j = p - 1;
          while (j >= 0 && arr[j] > key) { arr[j + 1] = arr[j]; j--; }
          arr[j + 1] = key;
          push(st, [7], '桶 B[' + bi + '] 内插入 ' + key + ' → [' + arr.join(',') + ']', sn([], '排序桶 B' + bi, { b: bi }));
        }
      }
      var out = [];
      for (var q = 0; q < k; q++) { out = out.concat(buckets[q]); }
      push(st, [8], '按桶序拼接：' + out.join(', '), sn([], '拼接结果'));
      for (i = 0; i < n; i++) { a[i] = out[i]; }
      push(st, [9], '排序完成：' + a.join(', '), sn([], '全部就位'));
      return st;
    },
    render: function (kr, s) {
      if (!s) { return; }
      drawArr(kr, { a: s.a, c: s.c, idx: s.idx, title: s.title, sub: s.sub }, { baseY: 250, topY: 70, cw: 40 });
      drawBuckets(kr, s.bks, 360, { h: 300, title: '桶（自底向上入桶）' });
    }
  });

  /* ============================================================
     8. 计数排序
     ============================================================ */
  DSV.register({
    id: 'counting', name: '计数排序', category: '排序',
    desc: '非比较排序：统计每个值出现的次数，再用前缀和确定每个值的输出起始位置，最后稳定地回填。时间 O(n+k)，适合值域较小的整数。',
    code: [
      'countingSort(A, k):',
      '  C[0..k-1] = 0',
      '  for x in A: C[x] = C[x] + 1',
      '  for i = 1 to k-1: C[i] = C[i] + C[i-1]',
      '  for j = n-1 downto 0:',
      '    B[ C[A[j]] - 1 ] = A[j]',
      '    C[A[j]] = C[A[j]] - 1',
      '  return B'
    ],
    viewBox: '0 0 1000 660',
    inputs: [{ key: 'arr', label: '数组（0-9）', def: '4,2,2,8,3,3,1,5,7,0,6,5', hint: '0-9 的整数' }],
    samples: [
      { label: '示例：含重复值', values: { arr: '4,2,2,8,3,3,1,5,7,0,6,5' } },
      { label: '示例：全相同', values: { arr: '3,3,3,3,3' } }
    ],
    random: function () { return { arr: DSV.randArr(DSV.ri(10, 16), 0, 9).join(',') }; },
    run: function (v) {
      var a = DSV.nums(v.arr, 24), n = a.length;
      if (!n) { return []; }
      var K = 10, st = [], C = [], i;
      for (i = 0; i < K; i++) { C.push(0); }
      var B = [];
      for (i = 0; i < n; i++) { B.push(null); }
      function sn(sub, hc, hb) {
        hc = hc || {};
        return {
          a: a.slice(), c: (function () { var o = []; for (var t = 0; t < n; t++) { o[t] = (hc.i === t) ? 'active' : ''; } return o; })(),
          idx: (hc.i != null && hc.i >= 0) ? [{ i: hc.i, t: '扫描' }] : [], title: '计数排序（值域 0…9）', sub: sub || '',
          C: C.map(function (x, ci) { return { v: x, cls: (hc.c === ci) ? 'active' : 'done', m: String(ci) }; }),
          B: B.map(function (x, bi) { return { v: (x === null ? '' : x), cls: (hb != null && hb === bi) ? 'swap' : (x !== null ? 'done' : '') }; })
        };
      }
      push(st, [0, 1], '开始计数排序：n = ' + n + '，值域 0…9，计数数组 C 全置 0', sn('初始化'));
      for (i = 0; i < n; i++) {
        C[a[i]]++;
        push(st, [3], '统计 A[' + i + '] = ' + a[i] + '，C[' + a[i] + '] 变为 ' + C[a[i]], sn('统计第 ' + (i + 1) + ' 个元素', { i: i, c: a[i] }));
      }
      push(st, [4], '统计结束，C = [' + C.join(', ') + ']', sn('频次统计完成'));
      for (i = 1; i < K; i++) {
        C[i] = C[i] + C[i - 1];
        push(st, [4], '前缀和：C[' + i + '] += C[' + (i - 1) + '] → ' + C[i] + '（表示 ≤ ' + i + ' 的元素共 ' + C[i] + ' 个）', sn('累加前缀和', { c: i }));
      }
      push(st, [4], 'C 变为前缀和数组 [' + C.join(', ') + ']，C[v]-1 即值 v 的最后一个输出位置', sn('前缀和完成'));
      for (var j = n - 1; j >= 0; j--) {
        var val = a[j], pos = C[val] - 1;
        B[pos] = val; C[val]--;
        push(st, [6, 7], '从后往前取 A[' + j + ']=' + val + '：写入 B[' + pos + ']，然后 C[' + val + '] 减 1 → ' + C[val] + '（保证稳定性）',
          sn('回填 A[' + j + ']', { i: j, c: val }, pos));
      }
      push(st, [8], '排序完成：' + B.join(', '), sn('全部就位', null, -1));
      return st;
    },
    render: function (kr, s) {
      if (!s) { return; }
      drawArr(kr, { a: s.a, c: s.c, idx: s.idx, title: s.title, sub: s.sub }, { baseY: 250, topY: 70, cw: 40 });
      drawRow(kr, '__C', '计数数组 C（下标 = 值）', s.C, 368, { cw: 52 });
      drawRow(kr, '__B', '输出数组 B', s.B, 490, { cw: 52 });
    }
  });

  /* ============================================================
     9. 基数排序
     ============================================================ */
  DSV.register({
    id: 'radix', name: '基数排序', category: '排序',
    desc: '非比较排序：从最低位到最高位，每一轮按当前位（0-9）把元素稳定地分配到 10 个队列中再依次收集。时间 O(d·(n+10))，d 为位数。',
    code: [
      'radixSort(A, d):',
      '  for p = 1, 10, 100, ... (每一位):',
      '    建 10 个空队列 Q[0..9]',
      '    for x in A (保持原顺序):',
      '      digit = (x / p) mod 10',
      '      Q[digit].enqueue(x)',
      '    按 Q[0]..Q[9] 的顺序把元素依次取回 A',
      '  return A'
    ],
    viewBox: '0 0 1000 720',
    inputs: [{ key: 'arr', label: '数组（非负整数）', def: '170,45,75,90,802,24,2,66', hint: '非负整数' }],
    samples: [
      { label: '示例：经典数据', values: { arr: '170,45,75,90,802,24,2,66' } },
      { label: '示例：位数相同', values: { arr: '321,145,678,910,234,567' } }
    ],
    random: function () {
      var n = DSV.ri(8, 12), o = [];
      for (var i = 0; i < n; i++) { o.push(DSV.ri(1, 999)); }
      return { arr: o.join(',') };
    },
    run: function (v) {
      var a = DSV.nums(v.arr, 20), n = a.length;
      if (!n) { return []; }
      var st = [], i;
      var max = Math.max.apply(null, a.concat([1]));
      var digits = String(max).length;
      var Q = [];
      for (i = 0; i < 10; i++) { Q.push([]); }
      function sn(sub, hi, hq) {
        return {
          a: a.slice(), c: (function () { var o = []; for (var t = 0; t < n; t++) { o[t] = (hi != null && hi === t) ? 'active' : ''; } return o; })(),
          idx: (hi != null) ? [{ i: hi, t: 'x' }] : [], title: '基数排序（共 ' + digits + ' 位）', sub: sub || '',
          Q: Q.map(function (q, qi) { return q.map(function (x) { return { v: x, cls: (hq != null && hq === qi) ? 'active' : '' }; }); })
        };
      }
      push(st, [0], '开始基数排序：最大数 ' + max + '，共 ' + digits + ' 位，从个位开始', sn('初始化', null, null));
      for (var p = 1, pass = 1; p <= Math.pow(10, digits - 1); p *= 10, pass++) {
        for (i = 0; i < 10; i++) { Q[i] = []; }
        push(st, [1, 2], '第 ' + pass + ' 轮：按第 ' + pass + ' 位（位权 ' + p + '）分配，清空 10 个队列', sn('第 ' + pass + ' 轮 · 分配'));
        for (i = 0; i < n; i++) {
          var d = Math.floor(a[i] / p) % 10;
          Q[d].push(a[i]);
          push(st, [4, 5], 'A[' + i + ']=' + a[i] + '，第 ' + pass + ' 位是 ' + d + '，入队 Q[' + d + ']', sn('第 ' + pass + ' 轮 · 分配', i, d));
        }
        push(st, [6], '分配完成，按 Q0→Q9 顺序收集：' + (function () { var o = []; for (var t = 0; t < 10; t++) { o = o.concat(Q[t]); } return o.join(', '); })(), sn('第 ' + pass + ' 轮 · 准备收集'));
        var idx = 0;
        for (var q = 0; q < 10; q++) {
          for (var k = 0; k < Q[q].length; k++) {
            a[idx] = Q[q][k];
            push(st, [6], '从 Q[' + q + '] 取出 ' + Q[q][k] + '，写回 A[' + idx + ']', sn('第 ' + pass + ' 轮 · 收集', idx, q));
            idx++;
          }
        }
        push(st, [6], '第 ' + pass + ' 轮结束：' + a.join(', '), sn('第 ' + pass + ' 轮完成'));
      }
      var done = []; for (i = 0; i < n; i++) { done.push('done'); }
      push(st, [7], '排序完成：' + a.join(', '), { a: a.slice(), c: done, title: '基数排序', sub: '全部就位', Q: Q.map(function (q) { return []; }) });
      return st;
    },
    render: function (kr, s) {
      if (!s) { return; }
      drawArr(kr, { a: s.a, c: s.c, idx: s.idx, title: s.title, sub: s.sub }, { baseY: 180, topY: 60, cw: 44 });
      drawBuckets(kr, s.Q, 310, { h: 330, title: '队列 Q0 … Q9（自底向上入队）' });
    }
  });

  /* ============================================================
     10. 堆排序
     ============================================================ */
  DSV.register({
    id: 'heapsort', name: '堆排序', category: '排序',
    desc: '先把数组原地建成大顶堆，再反复把堆顶（最大值）与堆尾交换并缩小堆、向下调整。原地排序，时间 O(n log n)，不稳定。',
    code: [
      'heapSort(A):',
      '  n = A.length',
      '  for i = n/2-1 downto 0: siftDown(A, i, n)   // 建堆',
      '  for end = n-1 downto 1:',
      '    swap(A[0], A[end])',
      '    siftDown(A, 0, end)',
      '  return A',
      '',
      'siftDown(A, i, size):',
      '  while 2*i+1 < size:',
      '    c = 2*i+1                       // 左孩子',
      '    if c+1 < size and A[c+1] > A[c]: c = c+1',
      '    if A[i] >= A[c]: break',
      '    swap(A[i], A[c]); i = c'
    ],
    viewBox: '0 0 1000 760',
    inputs: IN, samples: SAM, random: RND,
    run: function (v) {
      var a = DSV.nums(v.arr, 20), n = a.length;
      if (n < 2) { return []; }
      var st = [], c = zeros(n), done = [];
      for (var q0 = 0; q0 < n; q0++) { done.push(false); }
      var tc = {};
      function cc() { var o = []; for (var i = 0; i < n; i++) { o[i] = done[i] ? 'done' : (c[i] || ''); } return o; }
      function sn(idx, sub, size) {
        return {
          a: a.slice(), c: cc(), idx: idx || [], title: '堆排序', sub: sub || '',
          tcls: DSV.clone(tc), size: size == null ? n : size
        };
      }

      function siftDown(i, size, phase) {
        push(st, [8], '向下调整：从 i = ' + i + '（值 ' + a[i] + '）开始，堆大小 ' + size, sn([{ i: i, t: 'i' }], phase, size));
        while (2 * i + 1 < size) {
          var ch = 2 * i + 1;
          c = zeros(n); c[i] = 'active'; c[ch] = 'compare'; if (ch + 1 < size) { c[ch + 1] = 'compare'; }
          tc = {}; tc[i] = 'active'; tc[ch] = 'compare'; if (ch + 1 < size) { tc[ch + 1] = 'compare'; }
          push(st, [9, 10], '左孩子 A[' + ch + ']=' + a[ch] + (ch + 1 < size ? '，右孩子 A[' + (ch + 1) + ']=' + a[ch + 1] : '，无右孩子'),
            sn([{ i: i, t: 'i' }, { i: ch, t: '左' }], phase, size));
          if (ch + 1 < size && a[ch + 1] > a[ch]) { ch = ch + 1; }
          tc = {}; tc[i] = 'active'; tc[ch] = 'path';
          c = zeros(n); c[i] = 'active'; c[ch] = 'path';
          push(st, [11], '选出更大的孩子 c = ' + ch + '（值 ' + a[ch] + '）', sn([{ i: i, t: 'i' }, { i: ch, t: 'c' }], phase, size));
          if (a[i] >= a[ch]) {
            push(st, [12], 'A[' + i + ']=' + a[i] + ' ≥ A[' + ch + ']=' + a[ch] + '，满足堆性质，调整结束', sn([{ i: i, t: 'i' }], phase, size));
            tc = {}; c = zeros(n);
            return;
          }
          var t = a[i]; a[i] = a[ch]; a[ch] = t;
          c = zeros(n); c[i] = 'swap'; c[ch] = 'swap';
          tc = {}; tc[i] = 'swap'; tc[ch] = 'swap';
          push(st, [13], 'A[' + i + '] < A[' + ch + ']，交换两者，i 下移到 ' + ch, sn([{ i: i, t: '↑', c: 1 }, { i: ch, t: 'i', c: 1 }], phase, size));
          i = ch;
        }
        tc = {}; c = zeros(n);
        push(st, [9], 'i = ' + i + ' 已是叶子，向下调整结束', sn([{ i: i, t: 'i' }], phase, size));
      }

      push(st, [0, 1], '开始堆排序：n = ' + n + '，第一步原地建大顶堆', sn());
      for (var i = Math.floor(n / 2) - 1; i >= 0; i--) {
        push(st, [2], '建堆：对下标 ' + i + '（最后一个非叶子）向下调整', sn([{ i: i, t: 'i' }], '建堆阶段'));
        siftDown(i, n, '建堆阶段');
      }
      var dd = []; for (var z = 0; z < n; z++) { dd.push(false); }
      push(st, [2], '大顶堆建好：堆顶 A[0] = ' + a[0] + ' 是最大值', sn([{ i: 0, t: '堆顶' }], '建堆完成'));

      for (var end = n - 1; end >= 1; end--) {
        c = zeros(n); c[0] = 'swap'; c[end] = 'swap';
        tc = {}; tc[0] = 'swap'; tc[end] = 'dead';
        push(st, [4], '交换堆顶 A[0]=' + a[0] + ' 与堆尾 A[' + end + ']=' + a[end] + '，最大值归位',
          sn([{ i: 0, t: '堆顶', c: 1 }, { i: end, t: '堆尾', c: 1 }], '排序阶段', end));
        var t2 = a[0]; a[0] = a[end]; a[end] = t2;
        done[end] = true;
        tc = {}; tc[end] = 'dead';
        push(st, [5], '堆大小缩小为 ' + end + '，对新的堆顶 A[0]=' + a[0] + ' 向下调整',
          sn([{ i: 0, t: '堆顶' }], '排序阶段', end));
        siftDown(0, end, '排序阶段');
      }
      for (var m = 0; m < n; m++) { done[m] = true; }
      tc = {};
      push(st, [6], '排序完成：' + a.join(', '), sn([], '全部就位', 0));
      return st;
    },
    render: function (kr, s) {
      if (!s) { return; }
      // 上方：堆的树形表示
      var n = s.a.length, size = s.size == null ? n : s.size;
      function build(i) {
        if (i >= n) { return null; }
        return { id: i, left: build(2 * i + 1), right: build(2 * i + 2) };
      }
      var root = build(0);
      DSV.drawTree(kr, root, {
        top: 64, dy: 76, dx: 44,
        node: function (nd) {
          var cls = (s.tcls && s.tcls[nd.id]) || '';
          if (nd.id >= size) { cls = 'dead'; }
          return { inner: S.circle(0, 0, 24) + S.text(0, 0, s.a[nd.id]) + S.text(0, 34, nd.id, 'idx-txt'), cls: cls };
        },
        edge: function (p, ch) { return (ch.id < size) ? 'tree' : 'dim'; }
      });
      kr.html('__hd', S.text(500, 24, '大顶堆（树形视图）', 'vt'));
      // 下方：数组
      drawArr(kr, { a: s.a, c: s.c, idx: s.idx, title: '', sub: s.sub || (s.size != null && s.size < n ? '堆大小 = ' + s.size + '，灰色为已出堆的已排序部分' : '') },
        { baseY: 640, topY: 400, cw: 44 });
      kr.html('__ad', S.text(500, 372, '数组视图', 'vt'));
    }
  });

  /* ============================================================
     11. 外部排序（多路归并 + 胜者树）
     ============================================================ */
  var ACT_RUN = [{ key: 'run', label: '开始演示', primary: true }];

  DSV.register({
    id: 'srt-external', name: '外部排序（多路归并）', category: '排序',
    desc: '数据量大到装不进内存时，先分段读入排序成若干个有序段，再用胜者树做 k 路归并：每次从 k 段中取最小值输出。每选一个元素只需沿树走一条路径比较，O(log k)，总时间 O(n log k)，避免朴素 k-1 次手动比较。',
    viewBox: '0 0 1000 720',
    code: [
      'externalMerge(runs):',                       // 0
      '  建胜者树：叶子 = 各段当前元素',             // 1
      '  内部结点 = 两孩子中的较小者',               // 2
      '  while 树根 != ∞:',                          // 3
      '    输出树根的值（来自最小的那一路）',          // 4
      '    该路指针前进到下一个元素',                // 5
      '    沿路径重新比较，更新胜者树',              // 6
      '  结束'                                       // 7
    ],
    inputs: [{ key: 'runs', label: '有序段（每行一段）', def: '10,20,30\n15,25,35\n12,18,28', hint: '每行一个已升序段，逗号分隔', multiline: true }],
    actions: ACT_RUN,
    samples: [
      { label: '示例：3 路归并', values: { runs: '10,20,30\n15,25,35\n12,18,28' } },
      { label: '示例：4 路归并', values: { runs: '1,5,9\n2,6,10\n3,7,11\n4,8,12' } }
    ],
    random: function () {
      var lines = [], r, t;
      for (r = 0; r < 3; r++) {
        var arr = [];
        for (t = 0; t < 3; t++) { arr.push(DSV.ri(1, 30)); }
        arr.sort(function (a, b) { return a - b; });
        lines.push(arr.join(','));
      }
      return { runs: lines.join('\n') };
    },
    run: function (v) {
      var raw = String(v.runs || '');
      var lines = raw.split(/\r?\n/);
      var runs = [];
      for (var i = 0; i < lines.length; i++) {
        var nums = DSV.nums(lines[i], 10);
        if (nums.length) {
          nums.sort(function (a, b) { return a - b; });
          runs.push(nums);
        }
      }
      var st = [];
      if (!runs.length) {
        return [{ code: [0], desc: '没有可归并的有序段，请在多行输入中每行给出一段',
          snap: { runs: [], ptrs: [], cur: [], tree: null, out: [], hlLeaf: -1, title: '外部排序', sub: '空输入', warn: true } }];
      }
      var k = runs.length;
      var ptrs = [];
      for (var r0 = 0; r0 < k; r0++) { ptrs.push(0); }
      var out = [];

      function curVal(r) { return ptrs[r] < runs[r].length ? runs[r][ptrs[r]] : Infinity; }
      function buildTree(lo, hi) {
        if (lo === hi - 1) {
          return { id: 'l' + lo, v: curVal(lo), run: lo, left: null, right: null, isLeaf: true };
        }
        var mid = Math.floor((lo + hi) / 2);
        var L = buildTree(lo, mid);
        var R = buildTree(mid, hi);
        var win = (L.v <= R.v) ? L : R;
        return { id: 'n' + lo + '_' + hi, v: win.v, run: win.run, left: L, right: R, isLeaf: false };
      }
      function snap(title, sub, hlLeaf, warn) {
        return {
          runs: runs.map(function (r) { return r.slice(); }),
          ptrs: ptrs.slice(),
          cur: ptrs.map(function (p, r) { return curVal(r); }),
          tree: buildTree(0, k),
          out: out.slice(),
          hlLeaf: (hlLeaf == null ? -1 : hlLeaf),
          title: title, sub: sub || '', warn: !!warn
        };
      }

      push(st, [0, 1, 2], '开始多路归并：共 ' + k + ' 个有序段，长度分别为 [' +
        runs.map(function (r) { return r.length; }).join(', ') +
        ']。为每段建立一个叶子结点，内部结点取两孩子较小者作为胜者',
        snap('外部排序', '建胜者树'));

      var stepCount = 0;
      while (true) {
        var root = buildTree(0, k);
        if (!isFinite(root.v)) { break; }
        var winRun = root.run;
        var winVal = root.v;
        stepCount++;

        push(st, [4], '第 ' + stepCount + ' 次输出：胜者树树根 = ' + winVal +
          '，来自第 ' + (winRun + 1) + ' 路（该路当前指针在位置 ' + ptrs[winRun] + '）',
          snap('外部排序', '输出 ' + winVal, winRun));

        out.push(winVal);
        ptrs[winRun]++;
        var nextVal = curVal(winRun);
        push(st, [5, 6], '第 ' + (winRun + 1) + ' 路指针前进到 ' + ptrs[winRun] +
          (isFinite(nextVal) ? '，下一个元素是 ' + nextVal + '，沿路径重新比较更新胜者树' :
            '，该路已耗尽（置为 ∞），沿路径重新比较更新胜者树'),
          snap('外部排序', '前进指针', winRun));
      }

      push(st, [7], '归并完成：所有有序段已耗尽，共输出 ' + out.length + ' 个元素，结果 = [' + out.join(', ') +
        ']。每输出一个元素只需 O(log k) 次比较，k=' + k,
        snap('外部排序', '归并完成'));
      return st;
    },
    render: function (kr, s) {
      if (!s) {
        kr.html('__t', S.text(500, 300, '外部排序：在多行输入中每行给出一个有序段后点击「开始演示」', 'vt'));
        kr.end(); return;
      }
      kr.html('__t', S.text(500, 26, s.title || '外部排序（多路归并）：胜者树', 'vt'));
      kr.html('__t2', S.text(500, 50, s.sub || '', 'vs'));

      var runs = s.runs || [], k = runs.length;
      var rowY = 90;
      for (var r = 0; r < k; r++) {
        kr.html('rl' + r, S.text(50, rowY + r * 30 + 5, '第' + (r + 1) + '路', 'vs'));
        var cw = 40, x0 = 110;
        for (var i = 0; i < runs[r].length; i++) {
          var isCur = (i === s.ptrs[r]);
          kr.g('rc' + r + '_' + i, 'translate(' + (x0 + i * (cw + 4) + cw / 2) + ',' + (rowY + r * 30) + ')', 'k',
            '<rect class="cell ' + (isCur ? 'active' : (i < s.ptrs[r] ? 'done' : '')) + '" x="' + (-cw / 2 + 2) + '" y="-14" width="' + (cw - 4) + '" height="28" rx="4"/>' +
            S.text(0, 0, runs[r][i], 'cell-txt'));
        }
        if (s.ptrs[r] >= runs[r].length) {
          kr.g('rd' + r, 'translate(' + (x0 + runs[r].length * (cw + 4) + 20) + ',' + (rowY + r * 30) + ')', 'k',
            '<rect class="cell dead" x="-20" y="-14" width="40" height="28" rx="4"/>' +
            S.text(0, 0, '∞', 'cell-txt'));
        }
      }

      kr.html('__th', S.text(500, 220, '胜者树（内部结点 = 两孩子较小者，树根 = 下一个输出）', 'vs'));
      if (s.tree) {
        DSV.drawTree(kr, s.tree, {
          top: 250, dy: 60, dx: 60,
          node: function (nd) {
            var cls = '';
            if (nd.isLeaf && s.hlLeaf === nd.run) { cls = 'swap'; }
            if (!isFinite(nd.v)) { cls = 'dead'; }
            return {
              inner: S.circle(0, 0, nd.isLeaf ? 18 : 22) + S.text(0, 0, isFinite(nd.v) ? nd.v : '∞') +
                (nd.isLeaf ? S.text(0, 30, '路' + (nd.run + 1), 'tag') : S.text(0, 32, 'min', 'tag')),
              cls: cls
            };
          },
          edge: function (pa, ch) { return 'tree'; }
        });
      }

      kr.html('__oh', S.text(500, 470, '归并输出带', 'vs'));
      var out = s.out || [];
      var ocw = 44, ototal = out.length * ocw + Math.max(0, out.length - 1) * 6, ox0 = (1000 - ototal) / 2;
      for (var i2 = 0; i2 < out.length; i2++) {
        kr.g('o' + i2, 'translate(' + (ox0 + i2 * (ocw + 6) + ocw / 2) + ',510)', 'k',
          '<rect class="cell done" x="' + (-ocw / 2 + 2) + '" y="-16" width="' + (ocw - 4) + '" height="32" rx="4"/>' +
          S.text(0, 0, out[i2], 'cell-txt'));
      }
      if (!out.length) { kr.html('__oe', S.text(500, 510, '（空）', 'vs')); }

      if (s.warn) { kr.html('__m', S.text(500, 590, s.sub || '', 'vwarn')); }
      kr.end();
    }
  });

  /* ============================================================
     12. 鸡尾酒排序（双向冒泡）
     ============================================================ */
  DSV.register({
    id: 'srt-cocktail', name: '鸡尾酒排序', category: '排序',
    desc: '冒泡排序的双向版本：先从左到右把最大值推到右端，再从右到左把最小值推到左端，收缩两端边界直到某轮没有交换。对基本有序但两端有小元素的序列比冒泡快，稳定排序，平均/最坏 O(n²)，最好 O(n)。',
    code: [
      'cocktailSort(A):',                              // 0
      '  lo = 0; hi = n-1',                            // 1
      '  while lo < hi:',                               // 2
      '    swapped = false',                            // 3
      '    for i = lo to hi-1:',                       // 4
      '      if A[i] > A[i+1]: swap; swapped = true',   // 5
      '    hi = hi - 1',                                // 6
      '    for i = hi downto lo+1:',                   // 7
      '      if A[i-1] > A[i]: swap; swapped = true',  // 8
      '    lo = lo + 1',                                // 9
      '    if not swapped: break',                      // 10
      '  return A'                                      // 11
    ],
    inputs: IN, samples: SAM, random: RND,
    run: function (v) {
      var a = DSV.nums(v.arr, 16), n = a.length;
      if (n < 2) { return []; }
      var st = [], c = zeros(n), done = [];
      for (var q = 0; q < n; q++) { done.push(false); }
      function cc() { var o = []; for (var i = 0; i < n; i++) { o[i] = done[i] ? 'done' : (c[i] || ''); } return o; }
      function sn(idx, sub) { return { a: a.slice(), c: cc(), idx: idx || [], title: '鸡尾酒排序', sub: sub || '' }; }

      push(st, [0, 1], '开始鸡尾酒排序：lo = 0，hi = ' + (n - 1), sn());
      var lo = 0, hi = n - 1;
      while (lo < hi) {
        var swapped = false;
        c = zeros(n);
        push(st, [3, 4], '从左到右扫描 [' + lo + '…' + hi + ']：把最大值向右推',
          sn([{ i: lo, t: 'lo' }, { i: hi, t: 'hi' }], '左→右扫描'));
        for (var j = lo; j < hi; j++) {
          c = zeros(n); c[j] = 'compare'; c[j + 1] = 'compare';
          push(st, [5], '比较 A[' + j + ']=' + a[j] + ' 与 A[' + (j + 1) + ']=' + a[j + 1] + '：' +
            (a[j] > a[j + 1] ? a[j] + ' > ' + a[j + 1] + '，逆序交换' : '不交换'),
            sn([{ i: j, t: 'j' }, { i: j + 1, t: 'j+1' }], '左→右扫描'));
          if (a[j] > a[j + 1]) {
            var t = a[j]; a[j] = a[j + 1]; a[j + 1] = t;
            swapped = true;
            c = zeros(n); c[j] = 'swap'; c[j + 1] = 'swap';
            push(st, [5], '交换后：[' + a.join(', ') + ']',
              sn([{ i: j, t: 'j', c: 1 }, { i: j + 1, t: 'j+1', c: 1 }], '左→右扫描'));
          }
        }
        done[hi] = true;
        hi--;
        push(st, [6], '左→右轮结束：A[' + (hi + 1) + '] 已就位（本轮最大值），hi 收缩为 ' + hi,
          sn([{ i: hi + 1, t: '就位' }], '右边界收缩'));
        if (!swapped || lo >= hi) { break; }

        swapped = false;
        c = zeros(n);
        push(st, [7, 8], '从右到左扫描 [' + lo + '…' + hi + ']：把最小值向左推',
          sn([{ i: lo, t: 'lo' }, { i: hi, t: 'hi' }], '右→左扫描'));
        for (var j2 = hi; j2 > lo; j2--) {
          c = zeros(n); c[j2 - 1] = 'compare'; c[j2] = 'compare';
          push(st, [8], '比较 A[' + (j2 - 1) + ']=' + a[j2 - 1] + ' 与 A[' + j2 + ']=' + a[j2] + '：' +
            (a[j2 - 1] > a[j2] ? a[j2 - 1] + ' > ' + a[j2] + '，逆序交换' : '不交换'),
            sn([{ i: j2 - 1, t: 'j-1' }, { i: j2, t: 'j' }], '右→左扫描'));
          if (a[j2 - 1] > a[j2]) {
            var t2 = a[j2 - 1]; a[j2 - 1] = a[j2]; a[j2] = t2;
            swapped = true;
            c = zeros(n); c[j2 - 1] = 'swap'; c[j2] = 'swap';
            push(st, [8], '交换后：[' + a.join(', ') + ']',
              sn([{ i: j2 - 1, t: 'j-1', c: 1 }, { i: j2, t: 'j', c: 1 }], '右→左扫描'));
          }
        }
        done[lo] = true;
        lo++;
        push(st, [9], '右→左轮结束：A[' + (lo - 1) + '] 已就位（本轮最小值），lo 收缩为 ' + lo,
          sn([{ i: lo - 1, t: '就位' }], '左边界收缩'));
        if (!swapped) { break; }
      }
      for (var m = 0; m < n; m++) { done[m] = true; }
      push(st, [10, 11], '排序完成：' + a.join(', '), sn([], '全部就位'));
      return st;
    },
    render: function (kr, s) { if (s) { drawArr(kr, s); } }
  });

  /* ============================================================
     13. 梳排序（Comb Sort）
     ============================================================ */
  DSV.register({
    id: 'srt-comb', name: '梳排序', category: '排序',
    desc: '冒泡排序的改进：比较间隔 gap 从 n 开始，每轮按 1.3 缩小（gap = floor(gap/1.3)），直到 gap=1 退化为相邻冒泡。大间隔时元素可以一次跳很远，比冒泡少很多次相邻交换。不稳定，平均约 O(n log n)，最坏 O(n²)。',
    code: [
      'combSort(A):',                                  // 0
      '  n = A.length',                                // 1
      '  gap = n',                                     // 2
      '  while gap > 1 or swapped:',                   // 3
      '    swapped = false',                           // 4
      '    gap = max(1, floor(gap / 1.3))',            // 5
      '    for i = 0 to n-gap-1:',                     // 6
      '      if A[i] > A[i+gap]: swap; swapped = true', // 7
      '  return A'                                     // 8
    ],
    inputs: IN, samples: SAM, random: RND,
    run: function (v) {
      var a = DSV.nums(v.arr, 16), n = a.length;
      if (n < 2) { return []; }
      var st = [], c = zeros(n);
      function sn(idx, sub) { return { a: a.slice(), c: c.slice(), idx: idx || [], title: '梳排序', sub: sub || '' }; }

      push(st, [0, 1, 2], '开始梳排序：n = ' + n + '，初始间隔 gap = ' + n, sn());
      var gap = n;
      var swapped = true;
      while (gap > 1 || swapped) {
        swapped = false;
        gap = Math.max(1, Math.floor(gap / 1.3));
        c = zeros(n);
        push(st, [5, 6], '新一轮：gap = floor(上轮 gap / 1.3) = ' + gap +
          (gap === 1 ? '（gap=1，退化为相邻比较，即冒泡）' : ''),
          sn([], 'gap = ' + gap));
        for (var i = 0; i < n - gap; i++) {
          c = zeros(n); c[i] = 'compare'; c[i + gap] = 'compare';
          push(st, [7], '比较 A[' + i + ']=' + a[i] + ' 与 A[' + (i + gap) + ']=' + a[i + gap] +
            '（相隔 ' + gap + '）：' + (a[i] > a[i + gap] ? '逆序，交换' : '不交换'),
            sn([{ i: i, t: 'i' }, { i: i + gap, t: 'i+' + gap }], 'gap = ' + gap));
          if (a[i] > a[i + gap]) {
            var t = a[i]; a[i] = a[i + gap]; a[i + gap] = t;
            swapped = true;
            c = zeros(n); c[i] = 'swap'; c[i + gap] = 'swap';
            push(st, [7], '交换后：[' + a.join(', ') + ']',
              sn([{ i: i, t: 'i', c: 1 }, { i: i + gap, t: 'i+' + gap, c: 1 }], 'gap = ' + gap));
          }
        }
        if (!swapped && gap === 1) { break; }
      }
      var d = zeros(n); for (var m = 0; m < n; m++) { d[m] = 'done'; }
      push(st, [8], '排序完成：' + a.join(', '), { a: a.slice(), c: d, title: '梳排序', sub: '全部就位' });
      return st;
    },
    render: function (kr, s) { if (s) { drawArr(kr, s); } }
  });

})();
