/* ============================================================
   viz-indexing2.js —— 索引结构章节（哈希表 + 多路查找树）
   1. 开放哈希表（链地址法）
   2. 闭哈希表（开放寻址 · 线性探测）
   3. 闭哈希表（桶寻址）
   4. B 树
   5. B+ 树
   五个结构全部是「有状态」的：run 返回 { steps, state }，
   下一次操作在已有结构上继续进行。
   ============================================================ */
(function () {
  'use strict';

  var DSV = window.DSV, S = DSV.svg;

  /* ============================================================
     0. 通用小工具
     ============================================================ */

  /** 追加一步：code 为高亮的伪代码行号数组 */
  function push(steps, code, desc, snap) { steps.push({ code: code, desc: desc, snap: snap }); }

  /** 取模（保证非负） */
  function mod(x, m) { return ((x % m) + m) % m; }

  /** 安全解析受限整数 */
  function toInt(v, def, lo, hi) {
    var n = parseInt(v, 10);
    if (!isFinite(n)) { n = def; }
    return Math.max(lo, Math.min(hi, n));
  }

  /** 保留两位小数 */
  function fmt2(v) {
    var s = Math.round(v * 100) / 100;
    return String(s);
  }

  /** 取输入串里的一个整数 */
  function firstNum(s) {
    var t = DSV.nums(s, 1);
    return t.length ? t[0] : null;
  }

  /** 纯提示步骤（画布显示一句话，不画结构） */
  function msgSnap(msg) { return { empty: 1, msg: msg, title: '', sub: '' }; }
  function msgStep(msg) { return { code: [0], desc: msg, snap: msgSnap(msg) }; }

  /** 高亮映射工具：树结点 id -> { c: 结点整体状态, k: {关键字下标: 状态} } */
  function hmap() { return {}; }
  function hNode(h, id, c) {
    if (id == null) { return h; }
    h[id] = h[id] || {}; h[id].c = c; return h;
  }
  function hKey(h, id, i, c) {
    if (id == null) { return h; }
    h[id] = h[id] || {}; h[id].k = h[id].k || {}; h[id].k[i] = c; return h;
  }

  /** 用 seq 组装一行横向格子（items: [{v, cls}]），y 为该行中线 */
  function drawRowCells(kr, key, items, y, opt) {
    opt = opt || {};
    var cw = opt.cw || 44, gap = opt.gap || 6, h = opt.h || 40, n = items.length;
    var total = n * cw + (n - 1) * gap;
    var x = (1000 - total) / 2;
    var inner = '';
    for (var i = 0; i < n; i++) {
      var it = items[i] || {};
      inner += '<rect class="cell ' + (it.cls || '') + '" x="' + x + '" y="' + (y - h / 2) + '" width="' + cw + '" height="' + h + '" rx="4"/>' +
        S.text(x + cw / 2, y, (it.v === null || it.v === undefined ? '' : it.v), 'cell-txt');
      if (it.top !== undefined && it.top !== null) { inner += S.text(x + cw / 2, y - h / 2 - 12, it.top, 'ptr'); }
      if (it.bot !== undefined && it.bot !== null) { inner += S.text(x + cw / 2, y + h / 2 + 14, it.bot, 'idx-txt'); }
      x += cw + gap;
    }
    kr.html(key, inner);
  }

  /* ============================================================
     1. 开放哈希表（链地址法）
     ============================================================ */
  DSV.register({
    id: 'openhash',
    name: '开放哈希表（链地址法）',
    category: '索引结构',
    desc: '长度为 m 的桶数组，每个桶挂一条链表。哈希函数 h(x)=x mod m 决定桶号，哈希值相同的关键字（同义词）串在同一条链表里。冲突只发生在同一个桶内部，查找时先按哈希值一步定位到桶，再沿链表顺序比较。平均查找/插入/删除 O(1+α)（α=n/m 为装填因子），最坏情况全部冲突退化为 O(n)。',
    viewBox: '0 0 1000 560',
    code: [
      '// h(x) = x mod m；冲突的同义词串在同一条链表里',
      'insert(H, x):',
      '  k = x mod m                       // 计算桶号',
      '  p = H[k].head                     // 取桶链表首结点',
      '  while p != null:',
      '    if p.key == x: return           // 已存在，不重复插入',
      '    p = p.next                      // 沿链向后比较',
      '  把新结点挂到链表尾部（空桶则作为首结点）',
      '  n = n + 1                         // 装填因子 α = n / m',
      '',
      'find(H, x):',
      '  k = x mod m; p = H[k].head',
      '  while p != null:',
      '    if p.key == x: return p         // 命中',
      '    p = p.next',
      '  return null                       // 走到 null，查找失败',
      '',
      'delete(H, x):',
      '  k = x mod m; p = H[k].head; prev = null',
      '  while p != null:',
      '    if p.key == x:',
      '      摘除 p（prev.next = p.next；p 为头结点则改 H[k].head）',
      '      return                        // 删除成功',
      '    prev = p; p = p.next',
      '  return                            // 未找到'
    ],
    inputs: [
      { key: 'init', label: '初始序列', def: '5,16,27,38,12,7', hint: '逗号分隔的整数' },
      { key: 'm', label: '桶数组长度 m', def: '11', hint: '哈希函数 h(x)=x mod m' }
    ],
    samples: [
      { label: '示例：构造哈希冲突（5,16,27,38 的桶号都是 5）', values: { init: '5,16,27,38', m: '11' } },
      { label: '示例：分散到不同桶（含一次重复插入）', values: { init: '12,7,25,41,3,19,7', m: '11' } },
      { label: '示例：小表长导致长链', values: { init: '2,9,16,23,30,37', m: '7' } }
    ],
    random: function () {
      var m = DSV.ri(7, 13), n = DSV.ri(5, 8), o = [];
      var base = DSV.ri(1, Math.max(1, m - 1));
      for (var i = 0; i < n; i++) {
        // 一半的元素刻意取成同余序列，保证能看到冲突链
        o.push(i % 2 === 0 ? mod(base + DSV.ri(0, 4) * m, 99) + 1 : DSV.ri(1, 99));
      }
      return { init: o.join(','), m: String(m) };
    },
    actions: [
      { key: 'build', label: '按序列建表', primary: true },
      { key: 'insert', label: '插入', arg: { key: 'x', label: '关键字', def: '50' } },
      { key: 'find', label: '查找', arg: { key: 'x', label: '关键字', def: '27' } },
      { key: 'delete', label: '删除', arg: { key: 'x', label: '关键字', def: '16' } }
    ],
    run: function (v, a, state) {
      var m = toInt(v.m, 11, 2, 16);
      var st = state;
      if (!st || !st.buckets || st.buckets.length !== m) {
        st = { m: m, buckets: [], n: 0, cnt: 1, lf: 0.75 };
        for (var q = 0; q < m; q++) { st.buckets.push([]); }
      }
      var steps = [];

      /** 生成快照（深拷贝后再交给 render） */
      function snap(h) {
        h = h || {};
        var hb = h.hb || {}, hn = h.hn || {};
        var obj = {
          empty: 0, msg: '', m: m, n: st.n, lf: st.n / m,
          warn: h.warn || '',
          title: h.title || ('开放哈希表（链地址法）：m = ' + m + '，当前存有 ' + st.n + ' 个关键字'),
          sub: h.sub || ('装填因子 α = n / m = ' + st.n + ' / ' + m + ' = ' + fmt2(st.n / m)),
          buckets: [], bcls: []
        };
        for (var i = 0; i < m; i++) {
          var list = st.buckets[i] || [], arr = [];
          for (var j = 0; j < list.length; j++) {
            arr.push({ v: list[j].v, id: list[j].id, cls: hn[list[j].id] || '' });
          }
          obj.buckets.push(arr);
          obj.bcls.push(hb[i] || '');
        }
        return DSV.clone(obj);
      }
      /** 只高亮链表第 i 个结点 */
      function keyed(list, i, c) {
        var h = {};
        if (list[i]) { h[list[i].id] = c; }
        return h;
      }
      /** 装填因子提示（不真的扩容） */
      function loadWarn(T) {
        if (st.n / m > st.lf) {
          push(steps, [8], '注意：装填因子 α = ' + fmt2(st.n / m) + ' 已经超过阈值 ' + st.lf +
            '，链表会越来越长、查找退化为 O(n)。工程实现应在此时扩容并再哈希（rehash），本演示只给出提示，不真正 rehash。',
            snap({
              title: T, sub: '建议扩容再哈希',
              warn: 'α = ' + fmt2(st.n / m) + ' > ' + st.lf + '：装填因子过高，建议扩容后再哈希'
            }));
        }
      }

      /* ---------------- 插入 ---------------- */
      function ins(x, pfx) {
        pfx = pfx || '';
        var k = mod(x, m);
        var T = pfx + '插入 ' + x + '：h(' + x + ') = ' + x + ' mod ' + m + ' = ' + k;
        var hb = {}; hb[k] = 'active';
        push(steps, [1, 2], pfx + '计算哈希值：h(' + x + ') = ' + x + ' mod ' + m + ' = ' + k + '，它应该进入桶 ' + k,
          snap({ title: T, sub: '第 1 步：按哈希值直接定位桶 ' + k, hb: hb }));

        var list = st.buckets[k];
        if (!list.length) {
          var nd0 = { v: x, id: st.cnt++ };
          list.push(nd0); st.n++;
          var hn0 = {}; hn0[nd0.id] = 'swap';
          push(steps, [3, 7], '桶 ' + k + ' 的链表为空，没有发生冲突：把 ' + x + ' 作为该链表的首结点挂上去',
            snap({ title: T, sub: '空桶：无需沿链比较', hb: hb, hn: hn0 }));
        } else {
          push(steps, [3, 4], '桶 ' + k + ' 的链表里已经有 ' + list.length + ' 个结点，可能发生冲突：必须从表头沿链依次比较',
            snap({ title: T, sub: '沿链比较第 1 个结点', hb: hb, hn: keyed(list, 0, 'compare') }));
          var dup = false;
          for (var i = 0; i < list.length; i++) {
            var same = (list[i].v === x);
            push(steps, [5], '比较链表第 ' + (i + 1) + ' 个结点的值 ' + list[i].v + ' 与待插入的 ' + x + '：' +
              (same ? '相等，' + x + ' 已经存在，不再插入（哈希表不允许重复关键字）' : '不相等，继续向后'),
              snap({ title: T, sub: '沿链比较第 ' + (i + 1) + ' 个结点', hb: hb, hn: keyed(list, i, same ? 'active' : 'compare') }));
            if (same) { dup = true; break; }
            if (i < list.length - 1) {
              push(steps, [6], '沿 next 指针后移到第 ' + (i + 2) + ' 个结点',
                snap({ title: T, sub: 'p = p.next', hb: hb, hn: keyed(list, i + 1, 'compare') }));
            }
          }
          if (dup) {
            push(steps, [5], x + ' 已存在于桶 ' + k + ' 的链表中，插入结束',
              snap({ title: T, sub: '重复关键字，忽略本次插入' }));
            return;
          }
          push(steps, [6], '走到链表尾部：next 为 null，说明 ' + x + ' 不在表中，可以插入',
            snap({ title: T, sub: 'p == null，退出循环', hb: hb }));
          var nd1 = { v: x, id: st.cnt++ };
          list.push(nd1); st.n++;
          var hn1 = {}; hn1[nd1.id] = 'swap';
          push(steps, [7], '把 ' + x + ' 接到桶 ' + k + ' 链表的末尾（链地址法是不断往同一条链上加长）',
            snap({ title: T, sub: '插入到链尾，冲突解决', hb: hb, hn: hn1 }));
        }
        push(steps, [8], '插入完成：表中共有 n = ' + st.n + ' 个关键字，装填因子 α = ' + fmt2(st.n / m),
          snap({ title: T, sub: '插入完成，α = ' + fmt2(st.n / m) }));
        loadWarn(T);
      }

      /* ---------------- 查找 ---------------- */
      function fnd(x) {
        var k = mod(x, m);
        var T = '查找 ' + x + '：h(' + x + ') = ' + x + ' mod ' + m + ' = ' + k;
        var hb = {}; hb[k] = 'active';
        push(steps, [10, 11], '开始查找 ' + x + '：先算哈希值 h(' + x + ') = ' + k + '，只需要检查桶 ' + k + ' 这一条链表',
          snap({ title: T, sub: '定位到桶 ' + k, hb: hb }));
        var list = st.buckets[k];
        if (!list.length) {
          push(steps, [12], '桶 ' + k + ' 的链表为空（head == null），' + x + ' 一定不在表中，查找失败并返回 null',
            snap({ title: T, sub: '空桶：查找失败', hb: hb }));
          return false;
        }
        for (var i = 0; i < list.length; i++) {
          var hit = (list[i].v === x);
          push(steps, [12, 13], '比较高亮链表中第 ' + (i + 1) + ' 个结点 ' + list[i].v + ' 与 ' + x + '：' + (hit ? '相等，命中！' : '不相等'),
            snap({ title: T, sub: '沿链比较第 ' + (i + 1) + ' 个结点', hb: hb, hn: keyed(list, i, hit ? 'active' : 'compare') }));
          if (hit) {
            push(steps, [13], '查找成功：' + x + ' 在桶 ' + k + ' 的链表第 ' + (i + 1) + ' 个位置，共比较 ' + (i + 1) + ' 次',
              snap({ title: T, sub: '查找成功（比较 ' + (i + 1) + ' 次）', hb: hb, hn: keyed(list, i, 'done') }));
            return true;
          }
          if (i < list.length - 1) {
            push(steps, [14], '沿 next 指针后移到第 ' + (i + 2) + ' 个结点',
              snap({ title: T, sub: 'p = p.next', hb: hb, hn: keyed(list, i + 1, 'compare') }));
          }
        }
        push(steps, [15], '链表走到末尾（next == null）仍未命中，' + x + ' 不在表中，返回 null',
          snap({ title: T, sub: '查找失败', hb: hb }));
        return false;
      }

      /* ---------------- 删除 ---------------- */
      function del(x) {
        var k = mod(x, m);
        var T = '删除 ' + x + '：h(' + x + ') = ' + x + ' mod ' + m + ' = ' + k;
        var hb = {}; hb[k] = 'active';
        push(steps, [16, 17], '开始删除 ' + x + '：哈希值 h(' + x + ') = ' + k + '，先到桶 ' + k + ' 的链表里找它',
          snap({ title: T, sub: '定位到桶 ' + k, hb: hb }));
        var list = st.buckets[k];
        if (!list.length) {
          push(steps, [18], '桶 ' + k + ' 的链表为空，找不到 ' + x + '，删除失败',
            snap({ title: T, sub: '空桶：删除失败', hb: hb }));
          return;
        }
        for (var i = 0; i < list.length; i++) {
          var hit = (list[i].v === x);
          var prev = i > 0 ? list[i - 1] : null;
          push(steps, [18, 19], '比较高亮链表第 ' + (i + 1) + ' 个结点 ' + list[i].v + ' 与 ' + x + '：' + (hit ? '相等，找到了要删的结点' : '不相等'),
            snap({ title: T, sub: '沿链比较第 ' + (i + 1) + ' 个结点', hb: hb, hn: keyed(list, i, hit ? 'swap' : 'compare') }));
          if (hit) {
            var hnD = keyed(list, i, 'dead');
            var msg;
            if (!prev) {
              list.splice(0, 1);
              msg = '该结点是链表首结点：把 H[' + k + '].head 改为它的下一个结点即可';
            } else {
              list.splice(i, 1);
              msg = '把前驱结点 ' + prev.v + ' 的 next 直接指向后继，把这个结点从链上摘下来';
            }
            st.n--;
            push(steps, [20, 21], msg + '，然后释放该结点，n 变为 ' + st.n,
              snap({ title: T, sub: '摘除结点 ' + x, hb: hb, hn: hnD }));
            push(steps, [21], '删除完成：桶 ' + k + ' 的链表现在为 [' + list.map(function (t) { return t.v; }).join(' → ') + ']',
              snap({ title: T, sub: '删除成功' }));
            return;
          }
          if (i < list.length - 1) {
            push(steps, [23], '沿 next 指针后移，prev 同步跟进',
              snap({ title: T, sub: 'prev = p; p = p.next', hb: hb, hn: keyed(list, i + 1, 'compare') }));
          }
        }
        push(steps, [24], '链表走完也没有找到 ' + x + '，删除失败',
          snap({ title: T, sub: '未找到，删除失败', hb: hb }));
      }

      /* ---------------- 动作分发 ---------------- */
      var act = (a && a.key) || 'build';
      if (act === 'build') {
        var ks = DSV.nums(v.init, 10);
        if (!ks.length) {
          return { steps: [msgStep('初始序列为空，请输入逗号分隔的整数序列（例如 5,16,27,38）来建表。')], state: st };
        }
        st = { m: m, buckets: [], n: 0, cnt: 1, lf: 0.75 };
        for (var b = 0; b < m; b++) { st.buckets.push([]); }
        push(steps, [0], '开始按序列 [' + ks.join(', ') + '] 逐个插入建表：桶数组长度 m = ' + m +
          '，哈希函数 h(x) = x mod m，装填因子阈值 ' + st.lf,
          snap({ title: '建表：m = ' + m + '，序列 ' + ks.join(', '), sub: '准备插入第 1 个关键字' }));
        for (var t = 0; t < ks.length; t++) {
          ins(ks[t], '建表第 ' + (t + 1) + '/' + ks.length + ' 步 · ');
        }
        push(steps, [8], '建表完成！共 ' + st.n + ' 个关键字分布在 ' + m + ' 个桶里，装填因子 α = ' + fmt2(st.n / m),
          snap({ title: '建表完成：α = ' + fmt2(st.n / m), sub: '可以继续插入 / 查找 / 删除' }));
      } else {
        var x0 = firstNum(a && a.arg);
        if (x0 === null) {
          return { steps: [msgStep('请在操作按钮右侧的输入框里填写一个整数关键字。')], state: st };
        }
        if (act === 'insert') { ins(x0, ''); }
        else if (act === 'find') { fnd(x0); }
        else { del(x0); }
      }
      return { steps: steps, state: st };
    },

    render: function (kr, s) {
      if (!s) { kr.end(); return; }
      if (s.empty) { kr.html('__m', S.text(500, 260, s.msg, 'vs')); kr.end(); return; }

      kr.html('__defs', S.arrowDefs());
      kr.html('__t', S.text(500, 26, s.title, 'vt'));
      if (s.sub) { kr.html('__st', S.text(500, 48, s.sub, 'vs')); }
      kr.html('__hd', S.text(97, 74, '桶数组 H[0…' + (s.m - 1) + ']', 'vs'));
      kr.html('__hd2', S.textL(200, 74, '每个桶右侧是它的同义词链表 → 末尾指向 null', 'vs'));

      var rows = (s.buckets || []).length;
      var bx = 64, bw = 66, startX = bx + bw + 52;
      var top = 92, bot = 470;
      var rh = Math.min(36, (bot - top) / Math.max(1, rows));
      var nh = Math.min(30, rh - 4);
      var maxLen = 1;
      for (var z = 0; z < rows; z++) { maxLen = Math.max(maxLen, s.buckets[z].length); }
      var avail = 950 - startX - 34;
      var gap = 26, nw = 48;
      if (maxLen * (nw + gap) > avail) {
        nw = Math.max(24, avail / maxLen - gap);
      }
      for (var i = 0; i < rows; i++) {
        var cy = top + i * rh + rh / 2;
        var list = s.buckets[i] || [];
        kr.g('b' + i, 'translate(' + (bx + bw / 2) + ',' + cy + ')', 'k',
          '<rect class="cell ' + (s.bcls[i] || '') + '" x="' + (-bw / 2) + '" y="' + (-nh / 2) + '" width="' + bw + '" height="' + nh + '" rx="4"/>' +
          S.text(0, 0, String(i), 'cell-txt'));
        var prevId = null, prevRight = 0;
        for (var j = 0; j < list.length; j++) {
          var nd = list[j];
          var x = startX + j * (nw + gap);
          if (j === 0) {
            kr.html('ab' + i, S.line(bx + bw + 3, cy, x - 3, cy, 'edge tree', ' marker-end="url(#arrow)"'));
          } else {
            kr.html('a' + prevId, S.line(prevRight, cy, x - 3, cy, 'edge tree', ' marker-end="url(#arrow)"'));
          }
          kr.g('n' + nd.id, 'translate(' + (x + nw / 2) + ',' + cy + ')', 'k',
            '<rect class="cell ' + (nd.cls || '') + '" x="' + (-nw / 2) + '" y="' + (-nh / 2) + '" width="' + nw + '" height="' + nh + '" rx="4"/>' +
            S.text(0, 0, nd.v, 'cell-txt'));
          prevId = nd.id;
          prevRight = x + nw;
        }
        var tx = list.length ? (startX + (list.length - 1) * (nw + gap) + nw + 14) : (startX + 6);
        if (list.length) {
          kr.html('a' + prevId, S.line(prevRight, cy, tx - 12, cy, 'edge tree', ' marker-end="url(#arrow)"'));
        } else {
          kr.html('ab' + i, S.line(bx + bw + 3, cy, startX - 22, cy, 'edge tree', ' marker-end="url(#arrow)"'));
        }
        kr.html('z' + i, S.textL(tx, cy, 'null', 'idx-txt'));
      }
      if (s.warn) { kr.html('__w', S.text(500, 498, s.warn, 'vwarn')); }
      kr.html('__lg', S.text(500, 526, '金色=当前目标桶　蓝色=正在比较　红色=刚写入/新建的结点', 'vs'));
      kr.end();
    }
  });

  /* ============================================================
     2. 闭哈希表（开放寻址 · 线性探测）
     ============================================================ */
  DSV.register({
    id: 'closedhash',
    name: '闭哈希表（开放寻址 · 线性探测）',
    category: '索引结构',
    desc: '所有元素都放在同一个数组里，没有链表。哈希函数 h(x)=x mod m，冲突后用线性探测序列 (h+i) mod m（i=0,1,2,…）逐个找空位。删除不能直接清空槽位，否则会截断别人的探测链，必须打「墓碑」标记；查找时遇到墓碑不能停，只有遇到真正的空槽才能下结论。装填因子不宜超过 0.7，越接近 1 越容易聚集，查找 O(1/(1-α))。',
    viewBox: '0 0 1000 560',
    code: [
      '// h(x) = x mod m；线性探测：(h + i) mod m，i = 0, 1, 2, ...',
      '// 删除只能打墓碑 ✝，绝不能直接置空，否则会截断别人的探测链',
      'insert(T, x):',
      '  firstTomb = -1; i = 0',
      '  while i < m:',
      '    pos = (x mod m + i) mod m        // 第 i 次探测的下标',
      '    if T[pos] 为空:',
      '      p = (firstTomb >= 0 ? firstTomb : pos)  // 优先复用记录的墓碑',
      '      T[p] = x; return               // 写入',
      '    if T[pos] 是墓碑 and firstTomb < 0: firstTomb = pos   // 记录后仍要继续探测',
      '    if T[pos].key == x: return       // 已存在，不重复插入',
      '    i = i + 1',
      '  return 表已满，插入失败',
      '',
      'find(T, x):',
      '  i = 0',
      '  while i < m:',
      '    pos = (x mod m + i) mod m',
      '    if T[pos] 为空: return 未找到     // 探测链断在这里，可以提前结束',
      '    if T[pos] 是墓碑: i++; continue   // 墓碑不能作为终止条件！',
      '    if T[pos].key == x: return pos    // 命中',
      '    i = i + 1',
      '  return 未找到',
      '',
      'delete(T, x):',
      '  i = 0',
      '  while i < m:',
      '    pos = (x mod m + i) mod m',
      '    if T[pos] 为空: return 未找到      // 墓碑同样要继续探测',
      '    if T[pos].key == x: T[pos] = 墓碑 ✝; return 已删除',
      '    i = i + 1',
      '  return 未找到'
    ],
    inputs: [
      { key: 'init', label: '初始序列', def: '5,16,27,38,12,7', hint: '逗号分隔的整数' },
      { key: 'm', label: '表长 m', def: '11', hint: '哈希函数 h(x)=x mod m' }
    ],
    samples: [
      { label: '示例：构造哈希冲突（5,16,27,38 全部落到下标 5）', values: { init: '5,16,27,38', m: '11' } },
      { label: '示例：删除后打成墓碑再查询', values: { init: '4,15,26,37,48,8', m: '11' } },
      { label: '示例：绕回表头（散列值靠近表尾）', values: { init: '10,21,32,43,9', m: '11' } }
    ],
    random: function () {
      var m = DSV.ri(9, 13), n = DSV.ri(5, 8), o = [];
      var base = DSV.ri(1, Math.max(1, m - 1));
      for (var i = 0; i < n; i++) {
        o.push(i % 2 === 0 ? mod(base + DSV.ri(0, 3) * m, 99) + 1 : DSV.ri(1, 99));
      }
      return { init: o.join(','), m: String(m) };
    },
    actions: [
      { key: 'build', label: '按序列建表', primary: true },
      { key: 'insert', label: '插入', arg: { key: 'x', label: '关键字', def: '49' } },
      { key: 'find', label: '查找', arg: { key: 'x', label: '关键字', def: '27' } },
      { key: 'delete', label: '删除', arg: { key: 'x', label: '关键字', def: '16' } }
    ],
    run: function (v, a, state) {
      var m = toInt(v.m, 11, 2, 16);
      var st = state;
      if (!st || !st.slots || st.slots.length !== m) {
        st = { m: m, slots: [], n: 0, lf: 0.75 };
        for (var q = 0; q < m; q++) { st.slots.push({ s: 0, v: 0 }); }  // s: 0 空 / 1 有效 / 2 墓碑
      }
      var steps = [];

      function snap(h) {
        h = h || {};
        var cls = h.cls || [];
        var obj = {
          empty: 0, msg: '', m: m, n: st.n,
          warn: h.warn || '',
          title: h.title || ('闭哈希表（线性探测）：m = ' + m + '，当前 ' + st.n + ' 个元素'),
          sub: h.sub || ('装填因子 α = ' + st.n + ' / ' + m + ' = ' + fmt2(st.n / m)),
          seq: h.seq || '', note: h.note || '',
          probe: (h.probe === undefined ? null : h.probe),
          home: (h.home === undefined ? null : h.home),
          slots: []
        };
        for (var i = 0; i < m; i++) {
          obj.slots.push({ s: st.slots[i].s, v: st.slots[i].v, cls: cls[i] || '' });
        }
        return DSV.clone(obj);
      }
      function clsAt(pos, c) {
        var arr = [];
        for (var i = 0; i < m; i++) { arr.push(i === pos ? c : ''); }
        return arr;
      }
      function countUsed() {
        var c = 0;
        for (var i = 0; i < m; i++) { if (st.slots[i].s !== 0) { c++; } }
        return c;
      }

      /* ---------------- 插入 ---------------- */
      function ins(x, pfx) {
        pfx = pfx || '';
        var home = mod(x, m);
        var T = pfx + '插入 ' + x + '：h(' + x + ') = ' + x + ' mod ' + m + ' = ' + home;
        var base = { title: T, home: home, sub: '起始位置 pos = ' + home };
        if (countUsed() >= m) {
          push(steps, [12], pfx + '表已经没有空位了（' + m + ' 个槽全部被占用），无法插入 ' + x,
            snap({ title: T, sub: '表满，插入失败', warn: '表已满，无法插入' }));
          return;
        }
        push(steps, [3, 4], pfx + '计算哈希值 h(' + x + ') = ' + x + ' mod ' + m + ' = ' + home +
          '，先探测家位置（第 1 次探测）下标 ' + home + '；firstTomb = -1，i = 0',
          snap({ title: T, sub: '第 1 次探测 → 下标 ' + home, home: home, probe: home, cls: clsAt(home, 'compare'), seq: '探测序列：' + home }));
        var firstTomb = -1, seqTxt = '' + home;
        for (var i = 0; i < m; i++) {
          var pos = mod(home + i, m);
          if (i > 0) {
            seqTxt += ' → ' + pos;
            push(steps, [5, 6], '第 ' + (i + 1) + ' 次探测：pos = (' + home + ' + ' + i + ') mod ' + m + ' = ' + pos,
              snap({ title: T, sub: '第 ' + (i + 1) + ' 次探测 → 下标 ' + pos, home: home, probe: pos, cls: clsAt(pos, 'compare'), seq: '探测序列：' + seqTxt }));
          }
          var sl = st.slots[pos];
          if (sl.s === 0) {
            var target = firstTomb >= 0 ? firstTomb : pos;
            sl.v = 0;
            st.slots[target].s = 1; st.slots[target].v = x;
            st.n++;
            push(steps, [7, 8], '下标 ' + pos + ' 是空槽，说明探测链到此结束：' +
              (target === pos ? '直接把 ' + x + ' 写入下标 ' + pos : '前面记录的墓碑下标 ' + target + ' 可以复用，把 ' + x + ' 写入 ' + target) +
              '（只有这样才能避免重复关键字）',
              snap({ title: T, sub: '写入下标 ' + target, home: home, probe: target, cls: clsAt(target, 'swap'), seq: '探测序列：' + seqTxt }));
            push(steps, [8], pfx + '插入完成：共探测 ' + (i + 1) + ' 次，n = ' + st.n + '，α = ' + fmt2(st.n / m),
              snap({ title: T, sub: '插入完成（探测 ' + (i + 1) + ' 次）', warn: (st.n / m > st.lf ? '装填因子 α = ' + fmt2(st.n / m) + ' 偏高，冲突会越来越严重' : '') }));
            return;
          }
          if (sl.s === 2) {
            if (firstTomb < 0) {
              firstTomb = pos;
              push(steps, [9], '下标 ' + pos + ' 是墓碑（曾经删除过元素）：它的位置可以复用，先记下 firstTomb = ' + pos +
                '，但绝不能在这里停下——后面的槽位里可能还有 ' + x,
                snap({ title: T, sub: '记录墓碑 ' + pos + '，继续探测', home: home, probe: pos, cls: clsAt(pos, 'compare'), seq: '探测序列：' + seqTxt }));
            } else {
              push(steps, [9], '下标 ' + pos + ' 又是一个墓碑（firstTomb 已记录为 ' + firstTomb + '），跳过继续向后',
                snap({ title: T, sub: '墓碑：继续探测', home: home, probe: pos, cls: clsAt(pos, 'compare'), seq: '探测序列：' + seqTxt }));
            }
            continue;
          }
          if (sl.v === x) {
            push(steps, [10], '下标 ' + pos + ' 里放的就是 ' + x + '（比较相等），' + x + ' 已经存在于表中，不重复插入，直接返回',
              snap({ title: T, sub: '关键字已存在，插入结束', home: home, probe: pos, cls: clsAt(pos, 'active'), seq: '探测序列：' + seqTxt }));
            return;
          }
          push(steps, [10, 11], '下标 ' + pos + ' 里是另一个关键字 ' + sl.v + '：发生了冲突！与 ' + x + ' 不相等，线性探测下一个位置',
            snap({ title: T, sub: '冲突：' + sl.v + ' ≠ ' + x + '，继续探测', home: home, probe: pos, cls: clsAt(pos, 'compare'), seq: '探测序列：' + seqTxt }));
        }
        if (firstTomb >= 0) {
          st.slots[firstTomb].s = 1; st.slots[firstTomb].v = x; st.n++;
          push(steps, [8], '整张表都被占过（或只剩墓碑），复用第一次记录的墓碑下标 ' + firstTomb + ' 放入 ' + x,
            snap({ title: T, sub: '复用墓碑写入 ' + firstTomb, cls: clsAt(firstTomb, 'swap') }));
          return;
        }
        push(steps, [12], '探测了 ' + m + ' 次仍没有可用位置，表满，插入失败',
          snap({ title: T, sub: '表满，插入失败', warn: '表已满，无法插入' }));
      }

      /* ---------------- 查找 ---------------- */
      function fnd(x) {
        var home = mod(x, m);
        var T = '查找 ' + x + '：h(' + x + ') = ' + x + ' mod ' + m + ' = ' + home;
        if (!st.n) {
          push(steps, [14], '表为空，' + x + ' 不在表中，查找失败', snap({ title: T, sub: '空表，查找失败' }));
          return;
        }
        push(steps, [14, 17], '开始查找 ' + x + '：哈希值 h(' + x + ') = ' + home + '，从下标 ' + home + ' 开始线性探测',
          snap({ title: T, sub: '第 1 次探测 → 下标 ' + home, home: home, probe: home, cls: clsAt(home, 'compare'), seq: '探测序列：' + home }));
        var seqTxt = '' + home;
        for (var i = 0; i < m; i++) {
          var pos = mod(home + i, m);
          if (i > 0) {
            seqTxt += ' → ' + pos;
            push(steps, [17], '第 ' + (i + 1) + ' 次探测：pos = (' + home + ' + ' + i + ') mod ' + m + ' = ' + pos,
              snap({ title: T, sub: '第 ' + (i + 1) + ' 次探测 → 下标 ' + pos, home: home, probe: pos, cls: clsAt(pos, 'compare'), seq: '探测序列：' + seqTxt }));
          }
          var sl = st.slots[pos];
          if (sl.s === 0) {
            push(steps, [18], '下标 ' + pos + ' 是真正的空槽：如果 ' + x + ' 在表里，它一定在这条探测链上、并且会在 ' + pos +
              ' 之前的某个位置被找到，所以可以断定 ' + x + ' 不在表中，查找失败',
              snap({ title: T, sub: '遇到空槽：查找失败', home: home, probe: pos, cls: clsAt(pos, 'compare'), seq: '探测序列：' + seqTxt }));
            return;
          }
          if (sl.s === 2) {
            push(steps, [19], '下标 ' + pos + ' 是墓碑：它只是某个已被删除元素的残留，不能据此断定 ' + x + ' 不存在，必须继续向后探测',
              snap({ title: T, sub: '墓碑：不可停止，继续探测', home: home, probe: pos, cls: clsAt(pos, 'compare'), seq: '探测序列：' + seqTxt }));
            continue;
          }
          if (sl.v === x) {
            push(steps, [20], '下标 ' + pos + ' 的关键字与 ' + x + ' 相等，命中！查找成功，共探测 ' + (i + 1) + ' 次',
              snap({ title: T, sub: '查找成功：下标 ' + pos, home: home, probe: pos, cls: clsAt(pos, 'active'), seq: '探测序列：' + seqTxt }));
            return;
          }
          push(steps, [21], '下标 ' + pos + ' 里是 ' + sl.v + ' ≠ ' + x + '，冲突中的一次失败比较，继续线性探测',
            snap({ title: T, sub: sl.v + ' ≠ ' + x + '，继续探测', home: home, probe: pos, cls: clsAt(pos, 'compare'), seq: '探测序列：' + seqTxt }));
        }
        push(steps, [22], '绕完整张表也没有找到 ' + x + '，查找失败',
          snap({ title: T, sub: '整表探测完毕：未找到' }));
      }

      /* ---------------- 删除 ---------------- */
      function del(x) {
        var home = mod(x, m);
        var T = '删除 ' + x + '：h(' + x + ') = ' + x + ' mod ' + m + ' = ' + home;
        if (!st.n) {
          push(steps, [24], '表为空，无法删除 ' + x, snap({ title: T, sub: '空表，删除失败' }));
          return;
        }
        push(steps, [25, 27], '开始删除 ' + x + '：哈希值 h(' + x + ') = ' + home + '，按同样的探测序列找它',
          snap({ title: T, sub: '第 1 次探测 → 下标 ' + home, home: home, probe: home, cls: clsAt(home, 'compare'), seq: '探测序列：' + home }));
        var seqTxt = '' + home;
        for (var i = 0; i < m; i++) {
          var pos = mod(home + i, m);
          if (i > 0) {
            seqTxt += ' → ' + pos;
            push(steps, [27], '第 ' + (i + 1) + ' 次探测：pos = (' + home + ' + ' + i + ') mod ' + m + ' = ' + pos,
              snap({ title: T, sub: '第 ' + (i + 1) + ' 次探测 → 下标 ' + pos, home: home, probe: pos, cls: clsAt(pos, 'compare'), seq: '探测序列：' + seqTxt }));
          }
          var sl = st.slots[pos];
          if (sl.s === 0) {
            push(steps, [28], '下标 ' + pos + ' 是空槽，说明 ' + x + ' 不在表中，删除失败',
              snap({ title: T, sub: '遇到空槽：未找到', home: home, probe: pos, cls: clsAt(pos, 'compare'), seq: '探测序列：' + seqTxt }));
            return;
          }
          if (sl.s === 2) {
            push(steps, [28], '下标 ' + pos + ' 是墓碑：删除时的判断标准与查找一样，遇到墓碑不能停，继续探测',
              snap({ title: T, sub: '墓碑：继续探测', home: home, probe: pos, cls: clsAt(pos, 'compare'), seq: '探测序列：' + seqTxt }));
            continue;
          }
          if (sl.v === x) {
            sl.s = 2; sl.v = x;   // 保留旧值便于显示，标记为墓碑
            st.n--;
            push(steps, [29], '下标 ' + pos + ' 里正是 ' + x + '：把它标记为墓碑 ✝，而不是清空 ' +
              '——一旦置空，后续查找会以「遇到空槽 → 不存在」为由提前终止，把排在它后面的同义词也判成不存在',
              snap({ title: T, sub: '打上墓碑标记 ✝', home: home, probe: pos, cls: clsAt(pos, 'dead'), seq: '探测序列：' + seqTxt }));
            push(steps, [29], '删除完成：n = ' + st.n + '，槽位 ' + pos + ' 今后可以被插入操作复用（firstTomb）',
              snap({ title: T, sub: '删除成功（墓碑位可被复用）' }));
            return;
          }
          push(steps, [30], '下标 ' + pos + ' 里是 ' + sl.v + ' ≠ ' + x + '，继续向后探测',
            snap({ title: T, sub: sl.v + ' ≠ ' + x + '，继续探测', home: home, probe: pos, cls: clsAt(pos, 'compare'), seq: '探测序列：' + seqTxt }));
        }
        push(steps, [31], '绕完整张表也没找到 ' + x + '，删除失败',
          snap({ title: T, sub: '未找到，删除失败' }));
      }

      var act = (a && a.key) || 'build';
      if (act === 'build') {
        var ks = DSV.nums(v.init, 10);
        if (!ks.length) {
          return { steps: [msgStep('初始序列为空，请输入逗号分隔的整数序列（例如 5,16,27,38）来建表。')], state: st };
        }
        st = { m: m, slots: [], n: 0, lf: 0.75 };
        for (var b = 0; b < m; b++) { st.slots.push({ s: 0, v: 0 }); }
        push(steps, [0, 1], '开始按序列 [' + ks.join(', ') + '] 建表：表长 m = ' + m +
          '，哈希函数 h(x) = x mod m，冲突时用线性探测 (h+i) mod m 找下一个空位；删除时打墓碑而不是置空',
          snap({ title: '建表：m = ' + m + '，序列 ' + ks.join(', '), sub: '准备插入第 1 个关键字' }));
        for (var t = 0; t < ks.length; t++) {
          ins(ks[t], '建表第 ' + (t + 1) + '/' + ks.length + ' 步 · ');
        }
        push(steps, [8], '建表完成！共 ' + st.n + ' 个元素，装填因子 α = ' + fmt2(st.n / m),
          snap({ title: '建表完成：α = ' + fmt2(st.n / m), sub: '可以继续插入 / 查找 / 删除' }));
      } else {
        var x0 = firstNum(a && a.arg);
        if (x0 === null) {
          return { steps: [msgStep('请在操作按钮右侧的输入框里填写一个整数关键字。')], state: st };
        }
        if (act === 'insert') { ins(x0, ''); }
        else if (act === 'find') { fnd(x0); }
        else { del(x0); }
      }
      return { steps: steps, state: st };
    },

    render: function (kr, s) {
      if (!s) { kr.end(); return; }
      if (s.empty) { kr.html('__m', S.text(500, 260, s.msg, 'vs')); kr.end(); return; }

      kr.html('__t', S.text(500, 26, s.title, 'vt'));
      if (s.sub) { kr.html('__st', S.text(500, 48, s.sub, 'vs')); }
      if (s.seq) { kr.html('__sq', S.text(500, 132, s.seq, 'vs')); }

      var slots = s.slots || [], m = slots.length;
      var cw = Math.min(78, (960 - 60) / Math.max(1, m));
      var items = [];
      for (var i = 0; i < m; i++) {
        var sl = slots[i];
        var c = sl.s === 2 ? 'dead' : '';
        if (sl.cls) { c = sl.cls; }
        var tp = '';
        if (s.home === i) { tp += '▲家'; }
        if (s.probe === i) { tp += '▼探测'; }
        items.push({
          v: sl.s === 1 ? String(sl.v) : (sl.s === 2 ? '✝' : '∅'),
          cls: c, bot: String(i), top: tp
        });
      }
      drawRowCells(kr, '__row', items, 320, { cw: cw, gap: 4, h: 48 });

      if (s.warn) { kr.html('__w', S.text(500, 452, s.warn, 'vwarn')); }
      kr.html('__lg', S.text(500, 492, '∅ 空槽　✝ 墓碑（已删除，探测链不可中断）　蓝色=正在探测　金色=命中　红色=写入', 'vs'));
      kr.end();
    }
  });

  /* ============================================================
     3. 闭哈希表（桶寻址）
     ============================================================ */
  DSV.register({
    id: 'closedhash-bucket',
    name: '闭哈希表（桶寻址）',
    category: '索引结构',
    desc: '开放寻址的改进：每个槽位不再只放一个元素，而是一个能放 b 个元素的小桶。哈希函数 h(x)=x mod m 给出槽号，冲突时先塞进同一个槽位的桶里，桶满了才线性探测下一个槽位 (h+i) mod m。它把「每冲突一次就多一次探测」变成「每 b 次冲突才多一次探测」，缓解了线性探测的聚集现象，查找 O(1/(1-α)) 但常数更小。删除时也必须打墓碑 ✝：如果把格子真空出来，前面槽位出现空位会让后面槽位里的元素再也查不到。',
    viewBox: '0 0 1000 560',
    code: [
      '// 每个槽位是一个容量 b 的小桶：h(x) = x mod m，桶内的 b 个格子算同一跳',
      '// 删除同样只能打墓碑 ✝：把格子真空出来会截断后面元素的探测链',
      'insert(T, x):',
      '  firstTomb = null; i = 0',
      '  while i < m:',
      '    pos = (x mod m + i) mod m              // 第 i 次探测的槽位',
      '    for j = 0 to b-1:                      // 扫描桶内 b 个格子',
      '      if T[pos][j].key == x: return        // 已存在，不重复插入',
      '      if T[pos][j] 为空:                   // 真空位：说明 x 不可能在更后面',
      '        目标格 = (firstTomb != null ? firstTomb : (pos, j))',
      '        把 x 写入目标格; return',
      '      if T[pos][j] 是墓碑 and firstTomb == null: firstTomb = (pos, j)  // 记录后仍要继续探测',
      '    // 桶里没有真空位（全被占用或全是墓碑），才线性探测下一槽',
      '    i = i + 1',
      '  return 表满，插入失败',
      '',
      'find(T, x):',
      '  i = 0',
      '  while i < m:',
      '    pos = (x mod m + i) mod m',
      '    for j = 0 to b-1:',
      '      if T[pos][j] 为空: return 未找到      // 真空位 → 探测链到此结束',
      '      if T[pos][j] 是墓碑: continue        // 墓碑不能作为终止条件！',
      '      if T[pos][j].key == x: return (pos, j)',
      '    i = i + 1                              // 桶满了，继续探测下一槽',
      '  return 未找到',
      '',
      'delete(T, x):',
      '  i = 0',
      '  while i < m:',
      '    pos = (x mod m + i) mod m',
      '    for j = 0 to b-1:',
      '      if T[pos][j] 为空: return 未找到      // 真空位 → 链已断，可以停',
      '      if T[pos][j].key == x: T[pos][j] = 墓碑 ✝; return 已删除',
      '    i = i + 1',
      '  return 未找到'
    ],
    inputs: [
      { key: 'init', label: '初始序列', def: '5,16,27,38,12,7', hint: '逗号分隔的整数' },
      { key: 'm', label: '槽位数 m', def: '11', hint: '哈希函数 h(x)=x mod m' },
      { key: 'b', label: '每桶容量 b', def: '2', hint: '1-4，越大越少探测' }
    ],
    samples: [
      { label: '示例：构造哈希冲突（同槽位填满后才外溢）', values: { init: '5,16,27,38,49', m: '11', b: '2' } },
      { label: '示例：大容量桶减少探测次数', values: { init: '3,14,25,36,47,58,69', m: '11', b: '4' } },
      { label: '示例：分散存储', values: { init: '10,4,21,17,32,45', m: '11', b: '2' } }
    ],
    random: function () {
      var m = DSV.ri(9, 13), b = DSV.ri(2, 3), n = DSV.ri(5, 8), o = [];
      var base = DSV.ri(1, Math.max(1, m - 1));
      for (var i = 0; i < n; i++) {
        o.push(i % 2 === 0 ? mod(base + DSV.ri(0, 2) * m, 99) + 1 : DSV.ri(1, 99));
      }
      return { init: o.join(','), m: String(m), b: String(b) };
    },
    actions: [
      { key: 'build', label: '按序列建表', primary: true },
      { key: 'insert', label: '插入', arg: { key: 'x', label: '关键字', def: '60' } },
      { key: 'find', label: '查找', arg: { key: 'x', label: '关键字', def: '27' } },
      { key: 'delete', label: '删除', arg: { key: 'x', label: '关键字', def: '16' } }
    ],
    run: function (v, a, state) {
      var m = toInt(v.m, 11, 2, 14);
      var b = toInt(v.b, 2, 1, 4);
      var st = state;
      if (!st || !st.slots || st.slots.length !== m || st.b !== b) {
        st = { m: m, b: b, slots: [], n: 0, lf: 0.8 };
        for (var q = 0; q < m; q++) { st.slots.push([]); }
      }
      var steps = [];

      function snap(h) {
        h = h || {};
        var hl = h.hl || {};      // 'pos_j' -> cls
        var obj = {
          empty: 0, msg: '', m: m, b: b, n: st.n,
          warn: h.warn || '',
          title: h.title || ('闭哈希表（桶寻址）：m = ' + m + ' 槽 × 每槽 ' + b + ' 格，当前 ' + st.n + ' 个元素'),
          sub: h.sub || ('装填因子 α = ' + st.n + ' / ' + (m * b) + ' = ' + fmt2(st.n / (m * b))),
          seq: h.seq || '',
          probe: (h.probe === undefined ? null : h.probe),
          home: (h.home === undefined ? null : h.home),
          slots: []
        };
        for (var i = 0; i < m; i++) {
          var cell = [], list = st.slots[i];
          for (var j = 0; j < b; j++) {
            var it = list[j];
            // 单元格：null = 真空位；{v, tomb:true} = 墓碑；{v, tomb:false} = 有效元素
            cell.push({
              used: !!it, tomb: !!(it && it.tomb),
              v: (it && !it.tomb) ? it.v : '', cls: hl[i + '_' + j] || ''
            });
          }
          obj.slots.push(cell);
        }
        return DSV.clone(obj);
      }
      function hlAt(pos, j, c) {
        var h = {}; h[pos + '_' + j] = c; return h;
      }

      /* ---------------- 插入 ---------------- */
      function ins(x, pfx) {
        pfx = pfx || '';
        var home = mod(x, m);
        var T = pfx + '插入 ' + x + '：h(' + x + ') = ' + x + ' mod ' + m + ' = ' + home;
        push(steps, [3, 5], pfx + '计算哈希值 h(' + x + ') = ' + x + ' mod ' + m + ' = ' + home +
          '：先看第 1 个槽位 ' + home + ' 的小桶（容量 ' + b + ' 格）；firstTomb = null，i = 0',
          snap({ title: T, sub: '第 1 次探测 → 槽位 ' + home, home: home, probe: home, seq: '探测槽位：' + home }));
        var seqTxt = '' + home;
        var firstTomb = null;
        for (var i = 0; i < m; i++) {
          var pos = mod(home + i, m);
          if (i > 0) {
            seqTxt += ' → ' + pos;
            push(steps, [5], '槽位 ' + mod(home + i - 1, m) + ' 的桶里没有真空位，线性探测下一个槽位：pos = (' + home + ' + ' + i + ') mod ' + m + ' = ' + pos,
              snap({ title: T, sub: '第 ' + (i + 1) + ' 次探测 → 槽位 ' + pos, home: home, probe: pos, seq: '探测槽位：' + seqTxt }));
          }
          var list = st.slots[pos];
          var emptyIdx = -1, dup = false;
          for (var j = 0; j < b; j++) {
            var cell = list[j];
            if (!cell) {
              if (emptyIdx < 0) { emptyIdx = j; }
              continue;
            }
            if (cell.tomb) {
              if (!firstTomb) { firstTomb = { p: pos, j: j }; }
              push(steps, [11], '槽位 ' + pos + ' 第 ' + (j + 1) + ' 格是墓碑：它的位置将来可以复用，先记下 firstTomb = (' +
                pos + ', ' + (j + 1) + ')，但绝不能在这里停下——后面的格子里可能还有 ' + x,
                snap({ title: T, sub: '记录墓碑并继续探测', home: home, probe: pos, hl: hlAt(pos, j, 'compare'), seq: '探测槽位：' + seqTxt }));
              continue;
            }
            if (cell.v === x) {
              push(steps, [7], '检查槽位 ' + pos + ' 的第 ' + (j + 1) + ' 格：里面就是 ' + x + '，' + x + ' 已存在于表中，不重复插入',
                snap({ title: T, sub: '关键字已存在，插入结束', home: home, probe: pos, hl: hlAt(pos, j, 'active'), seq: '探测槽位：' + seqTxt }));
              dup = true;
              break;
            }
            push(steps, [7], '检查槽位 ' + pos + ' 的第 ' + (j + 1) + ' 格：' + cell.v + ' ≠ ' + x + '，继续扫本桶',
              snap({ title: T, sub: '比较槽位 ' + pos + ' 第 ' + (j + 1) + ' 格', home: home, probe: pos, hl: hlAt(pos, j, 'compare'), seq: '探测槽位：' + seqTxt }));
          }
          if (dup) { return; }
          if (emptyIdx >= 0) {
            var tp = firstTomb ? firstTomb.p : pos;
            var tj = firstTomb ? firstTomb.j : emptyIdx;
            st.slots[tp][tj] = { v: x, tomb: false };
            st.n++;
            push(steps, [9, 10], '槽位 ' + pos + ' 的第 ' + (emptyIdx + 1) + ' 格是真空位：说明探测链到此结束，' + x +
              ' 确实不在表里，可以写入 —— ' + (firstTomb
                ? '优先复用第一次记录的墓碑 (' + tp + ', ' + (tj + 1) + ')'
                : '直接写进这个空位 (' + pos + ', ' + (emptyIdx + 1) + ')') +
              (i === 0 ? '（没有发生冲突）' : '（这次冲突一共探测了 ' + (i + 1) + ' 个槽位才解决）'),
              snap({
                title: T, sub: '写入 (' + tp + ', ' + (tj + 1) + ')', home: home, probe: tp,
                hl: hlAt(tp, tj, 'swap'), seq: '探测槽位：' + seqTxt
              }));
            push(steps, [14], pfx + '插入完成：探测了 ' + (i + 1) + ' 个槽位，n = ' + st.n + '，α = ' + fmt2(st.n / (m * b)),
              snap({
                title: T, sub: '插入完成（探测 ' + (i + 1) + ' 个槽位）',
                warn: (st.n / (m * b) > st.lf ? '装填因子 α = ' + fmt2(st.n / (m * b)) + ' 偏高，冲突会加剧' : '')
              }));
            return;
          }
          push(steps, [13], '槽位 ' + pos + ' 的 ' + b + ' 个格子全都不是空位（都被占用或全是墓碑），线性探测下一个槽位',
            snap({ title: T, sub: '槽位 ' + pos + ' 的桶已满', home: home, probe: pos, seq: '探测槽位：' + seqTxt }));
        }
        if (firstTomb) {
          st.slots[firstTomb.p][firstTomb.j] = { v: x, tomb: false };
          st.n++;
          push(steps, [10], '整张表都被占过（只剩墓碑），复用第一次记录的墓碑 (' + firstTomb.p + ', ' + (firstTomb.j + 1) + ') 放入 ' + x,
            snap({ title: T, sub: '复用墓碑写入', home: home, probe: firstTomb.p, hl: hlAt(firstTomb.p, firstTomb.j, 'swap'), seq: '探测槽位：' + seqTxt }));
          return;
        }
        push(steps, [14], '绕完所有槽位也没有空余格子，表满，插入失败',
          snap({ title: T, sub: '表满，插入失败', warn: '表已满，无法插入' }));
      }

      /* ---------------- 查找 ---------------- */
      function fnd(x) {
        var home = mod(x, m);
        var T = '查找 ' + x + '：h(' + x + ') = ' + x + ' mod ' + m + ' = ' + home;
        if (!st.n) {
          push(steps, [16], '表为空，' + x + ' 不在表中，查找失败', snap({ title: T, sub: '空表，查找失败' }));
          return;
        }
        push(steps, [16, 19], '开始查找 ' + x + '：哈希值 h(' + x + ') = ' + home + '，扫描第 1 个槽位 ' + home + ' 的桶',
          snap({ title: T, sub: '第 1 次探测 → 槽位 ' + home, home: home, probe: home, seq: '探测槽位：' + home }));
        var seqTxt = '' + home;
        for (var i = 0; i < m; i++) {
          var pos = mod(home + i, m);
          if (i > 0) {
            seqTxt += ' → ' + pos;
            push(steps, [19], '上个槽位的桶里没有空位，继续线性探测：pos = (' + home + ' + ' + i + ') mod ' + m + ' = ' + pos,
              snap({ title: T, sub: '第 ' + (i + 1) + ' 次探测 → 槽位 ' + pos, home: home, probe: pos, seq: '探测槽位：' + seqTxt }));
          }
          var list = st.slots[pos];
          var hasEmpty = false;
          for (var j = 0; j < b; j++) {
            var cell = list[j];
            if (!cell) {
              hasEmpty = true;
              push(steps, [21], '槽位 ' + pos + ' 的第 ' + (j + 1) + ' 格是真空位：' + x +
                ' 若要插入就一定落在这里，绝不可能跑到后面的槽位，因此断定未找到，查找失败',
                snap({ title: T, sub: '桶内有空位 → 查找失败', home: home, probe: pos, hl: hlAt(pos, j, 'compare'), seq: '探测槽位：' + seqTxt }));
              return;
            }
            if (cell.tomb) {
              push(steps, [22], '槽位 ' + pos + ' 第 ' + (j + 1) + ' 格是墓碑：它只是已删除元素的残留，不能据此断定 ' + x + ' 不存在，必须继续扫',
                snap({ title: T, sub: '墓碑：继续扫描', home: home, probe: pos, hl: hlAt(pos, j, 'dead'), seq: '探测槽位：' + seqTxt }));
              continue;
            }
            if (cell.v === x) {
              push(steps, [23], '槽位 ' + pos + ' 第 ' + (j + 1) + ' 格的值与 ' + x + ' 相等，命中！查找成功，共探测 ' + (i + 1) + ' 个槽位',
                snap({ title: T, sub: '查找成功：槽位 ' + pos + ' 第 ' + (j + 1) + ' 格', home: home, probe: pos, hl: hlAt(pos, j, 'active'), seq: '探测槽位：' + seqTxt }));
              return;
            }
            push(steps, [23], '槽位 ' + pos + ' 第 ' + (j + 1) + ' 格是 ' + cell.v + ' ≠ ' + x + '，继续扫描本桶',
              snap({ title: T, sub: cell.v + ' ≠ ' + x + '，继续', home: home, probe: pos, hl: hlAt(pos, j, 'compare'), seq: '探测槽位：' + seqTxt }));
          }
          if (!hasEmpty) {
            push(steps, [24], '槽位 ' + pos + ' 的 ' + b + ' 个格子都不是空位且都不含 ' + x + '，继续探测下一个槽位',
              snap({ title: T, sub: '槽位 ' + pos + ' 桶满，继续探测', home: home, probe: pos, seq: '探测槽位：' + seqTxt }));
          }
        }
        push(steps, [25], '绕完所有槽位也没有找到 ' + x + '，查找失败',
          snap({ title: T, sub: '未找到' }));
      }

      /* ---------------- 删除 ---------------- */
      function del(x) {
        var home = mod(x, m);
        var T = '删除 ' + x + '：h(' + x + ') = ' + x + ' mod ' + m + ' = ' + home;
        if (!st.n) {
          push(steps, [27], '表为空，无法删除 ' + x, snap({ title: T, sub: '空表，删除失败' }));
          return;
        }
        push(steps, [27, 30], '开始删除 ' + x + '：哈希值 h(' + x + ') = ' + home + '，按与查找完全相同的探测顺序定位',
          snap({ title: T, sub: '第 1 次探测 → 槽位 ' + home, home: home, probe: home, seq: '探测槽位：' + home }));
        var seqTxt = '' + home;
        for (var i = 0; i < m; i++) {
          var pos = mod(home + i, m);
          if (i > 0) {
            seqTxt += ' → ' + pos;
            push(steps, [30], '第 ' + (i + 1) + ' 次探测：pos = (' + home + ' + ' + i + ') mod ' + m + ' = ' + pos,
              snap({ title: T, sub: '第 ' + (i + 1) + ' 次探测 → 槽位 ' + pos, home: home, probe: pos, seq: '探测槽位：' + seqTxt }));
          }
          var list = st.slots[pos];
          var hitIdx = -1, emptyIdx = -1;
          for (var j = 0; j < b; j++) {
            var cell = list[j];
            if (!cell) {
              if (emptyIdx < 0) { emptyIdx = j; }
              continue;
            }
            if (cell.tomb) {
              push(steps, [31], '槽位 ' + pos + ' 第 ' + (j + 1) + ' 格是墓碑：删除时的停止条件与查找一致，墓碑不能终止探测，继续扫描',
                snap({ title: T, sub: '墓碑：继续扫描', home: home, probe: pos, hl: hlAt(pos, j, 'dead'), seq: '探测槽位：' + seqTxt }));
              continue;
            }
            if (cell.v === x) { hitIdx = j; break; }
            push(steps, [31], '槽位 ' + pos + ' 第 ' + (j + 1) + ' 格是 ' + cell.v + ' ≠ ' + x + '，继续扫描本桶',
              snap({ title: T, sub: cell.v + ' ≠ ' + x + '，继续', home: home, probe: pos, hl: hlAt(pos, j, 'compare'), seq: '探测槽位：' + seqTxt }));
          }
          if (hitIdx >= 0) {
            list[hitIdx].tomb = true;
            st.n--;
            push(steps, [33], '在槽位 ' + pos + ' 的第 ' + (hitIdx + 1) + ' 格找到 ' + x + '：把它标记为墓碑 ✝，而不是清空 —— ' +
              '一旦真空出来，后面槽位里那些「因为本桶满了才溢出过去」的元素就再也查不到了',
              snap({ title: T, sub: '打上墓碑标记 ✝', home: home, probe: pos, hl: hlAt(pos, hitIdx, 'dead'), seq: '探测槽位：' + seqTxt }));
            push(steps, [33], '删除完成：n = ' + st.n + '，该格今后可以被插入操作复用（firstTomb）',
              snap({ title: T, sub: '删除成功（墓碑格可被复用）' }));
            return;
          }
          if (emptyIdx >= 0) {
            push(steps, [32], '槽位 ' + pos + ' 的第 ' + (emptyIdx + 1) + ' 格是空的，说明 ' + x + ' 不在表中，删除失败',
              snap({ title: T, sub: '桶内有空位 → 未找到', home: home, probe: pos, hl: hlAt(pos, emptyIdx, 'compare'), seq: '探测槽位：' + seqTxt }));
            return;
          }
          push(steps, [34], '槽位 ' + pos + ' 的桶里没有空位且不含 ' + x + '，继续探测下一个槽位',
            snap({ title: T, sub: '桶满，继续探测', home: home, probe: pos, seq: '探测槽位：' + seqTxt }));
        }
        push(steps, [32], '绕完所有槽位也没有找到 ' + x + '，删除失败',
          snap({ title: T, sub: '未找到，删除失败' }));
      }

      var act = (a && a.key) || 'build';
      if (act === 'build') {
        var ks = DSV.nums(v.init, 10);
        if (!ks.length) {
          return { steps: [msgStep('初始序列为空，请输入逗号分隔的整数序列（例如 5,16,27,38）来建表。')], state: st };
        }
        st = { m: m, b: b, slots: [], n: 0, lf: 0.8 };
        for (var t2 = 0; t2 < m; t2++) { st.slots.push([]); }
        push(steps, [0, 1], '开始按序列 [' + ks.join(', ') + '] 建表：' + m + ' 个槽位，每个槽位是容量 b = ' + b +
          ' 的小桶；冲突先填同槽位的桶，桶满才线性探测下一槽；删除时打墓碑 ✝ 而不是真空出格子',
          snap({ title: '建表：m = ' + m + '，b = ' + b + '，序列 ' + ks.join(', '), sub: '准备插入第 1 个关键字' }));
        for (var t = 0; t < ks.length; t++) {
          ins(ks[t], '建表第 ' + (t + 1) + '/' + ks.length + ' 步 · ');
        }
        push(steps, [14], '建表完成！共 ' + st.n + ' 个元素，装填因子 α = ' + fmt2(st.n / (m * b)),
          snap({ title: '建表完成：α = ' + fmt2(st.n / (m * b)), sub: '可以继续插入 / 查找 / 删除' }));
      } else {
        var x0 = firstNum(a && a.arg);
        if (x0 === null) {
          return { steps: [msgStep('请在操作按钮右侧的输入框里填写一个整数关键字。')], state: st };
        }
        if (act === 'insert') { ins(x0, ''); }
        else if (act === 'find') { fnd(x0); }
        else { del(x0); }
      }
      return { steps: steps, state: st };
    },

    render: function (kr, s) {
      if (!s) { kr.end(); return; }
      if (s.empty) { kr.html('__m', S.text(500, 260, s.msg, 'vs')); kr.end(); return; }

      kr.html('__t', S.text(500, 26, s.title, 'vt'));
      if (s.sub) { kr.html('__st', S.text(500, 48, s.sub, 'vs')); }
      if (s.seq) { kr.html('__sq', S.text(500, 130, s.seq, 'vs')); }

      var slots = s.slots || [], m = slots.length, b = s.b || 2;
      var avail = 940, sw = avail / Math.max(1, m);
      var innerGap = 4, innerPad = 6;
      var cw = Math.max(14, (sw - innerPad * 2 - innerGap * (b - 1)) / b);
      var x0 = (1000 - sw * m) / 2;
      var y = 300, H = 48;
      for (var i = 0; i < m; i++) {
        var list = slots[i] || [];
        var total = cw * b + innerGap * (b - 1);
        var sx = -total / 2;
        var inner = '<rect class="frame dash" x="' + (-sw / 2 + 2) + '" y="' + (-H / 2 - 8) + '" width="' + (sw - 4) +
          '" height="' + (H + 16) + '" rx="6"/>' +
          S.text(0, -H / 2 - 22, String(i), 'idx-txt') +
          S.text(0, -H / 2 - 36, (s.home === i ? '▲家' : ''), 'ptr') +
          S.text(0, H / 2 + 24, (s.probe === i ? '▼探测' : ''), 'ptr ptr-t');
        for (var j = 0; j < b; j++) {
          var it = list[j] || {};
          var val = it.tomb ? '✝' : (it.used ? String(it.v) : '·');
          var cc = it.tomb ? 'dead' : (it.used ? (it.cls || 'done') : '');
          if (it.cls) { cc = it.cls; }
          inner += '<rect class="cell ' + cc + '" x="' + sx + '" y="' + (-H / 2 + 5) +
            '" width="' + cw + '" height="' + (H - 10) + '" rx="3"/>' +
            S.text(sx + cw / 2, 0, val, (it.used && !it.tomb) ? 'cell-txt' : 'idx-txt');
          sx += cw + innerGap;
        }
        kr.g('s' + i, 'translate(' + (x0 + i * sw + sw / 2) + ',' + y + ')', 'k', inner);
      }
      if (s.warn) { kr.html('__w', S.text(500, 448, s.warn, 'vwarn')); }
      kr.html('__lg', S.text(500, 490, '虚线框=一个槽位（内含 ' + b + ' 格小桶）　· 空位　✝ 墓碑（探测不可中断）　金色=命中　蓝色=正在比较　红色=刚写入', 'vs'));
      kr.end();
    }
  });

  /* ============================================================
     B 树 / B+ 树 共用的布局与绘制工具
     结点形态：{ id, keys:[值], children:[子结点], leaf:bool }
     ============================================================ */
  var M_LH = 96;      // 层高
  var M_TOP = 100;    // 根结点中心 y
  var M_GAP = 22;     // 同层相邻子树的最小间距
  var M_PS = 24;      // 孩子指针槽宽度
  var M_NH = 44;      // 结点高度
  var M_CW = 46;      // 关键字格宽度（会按总宽自适应缩小）

  /** 结点自身的绘制宽度 */
  function nodeWidth(n) {
    var k = Math.max(1, (n.keys || []).length);
    if (n.children && n.children.length) { return (k + 1) * M_PS + k * M_CW; }
    return k * M_CW + 26;
  }
  /** 子树占用的总宽度 */
  function measureTree(n) {
    if (!n) { return 0; }
    var own = nodeWidth(n);
    if (!n.children || !n.children.length) { return own; }
    var tot = 0;
    for (var i = 0; i < n.children.length; i++) {
      tot += measureTree(n.children[i]);
      if (i) { tot += M_GAP; }
    }
    return Math.max(own, tot);
  }
  /** 第 j 个孩子对应的连接点在结点上的横向偏移（相对结点中心） */
  function childAnchorOff(n, j) {
    var k = (n.keys || []).length;
    var W = (k + 1) * M_PS + k * M_CW;
    return -W / 2 + j * (M_PS + M_CW) + M_PS / 2;
  }
  /** 递归布局：返回 {id: {x, y, node}} */
  function placeTree(n, cx, depth, out) {
    if (!n) { return; }
    out[n.id] = { x: cx, y: M_TOP + depth * M_LH, node: n };
    if (!n.children || !n.children.length) { return; }
    var ws = [], tot = 0, i;
    for (i = 0; i < n.children.length; i++) {
      ws.push(measureTree(n.children[i]));
      tot += ws[i];
      if (i) { tot += M_GAP; }
    }
    var s = cx - tot / 2;
    for (i = 0; i < n.children.length; i++) {
      placeTree(n.children[i], s + ws[i] / 2, depth + 1, out);
      s += ws[i] + M_GAP;
    }
  }
  function treeDepth(n) {
    if (!n) { return 0; }
    if (!n.children || !n.children.length) { return 1; }
    var mx = 0;
    for (var i = 0; i < n.children.length; i++) { mx = Math.max(mx, treeDepth(n.children[i])); }
    return mx + 1;
  }
  /** 把活结点转换成可渲染的快照树（含每步高亮） */
  function makeTreeSnap(root, m, kind, hl) {
    hl = hl || {};
    var nh = hl.n || {};
    function conv(n) {
      if (!n) { return null; }
      var h = nh[n.id] || {};
      var out = {
        id: n.id, leaf: !!n.leaf, cls: h.c || '',
        keys: [], children: []
      };
      for (var i = 0; i < n.keys.length; i++) {
        out.keys.push({ v: n.keys[i], cls: (h.k && h.k[i]) || '' });
      }
      if (n.children && n.children.length) {
        for (var j = 0; j < n.children.length; j++) { out.children.push(conv(n.children[j])); }
      }
      return out;
    }
    var name = kind === 'B+' ? 'B+ 树' : 'B 树';
    var o = {
      empty: 0, msg: '', m: m, kind: kind, plus: (kind === 'B+'),
      maxK: m - 1, minK: Math.ceil(m / 2) - 1,
      root: conv(root),
      title: hl.title || (name + '：阶数 m = ' + m + '，每个结点最多 ' + (m - 1) + ' 个关键字'),
      sub: hl.sub || '', warn: hl.warn || '', note: hl.note || ''
    };
    return DSV.clone(o);
  }
  /** 结点內部 SVG（相对结点中心） */
  function nodeInner(n, isPlusLeaf) {
    var k = (n.keys || []).length, s = '', i, W, x;
    if (n.children && n.children.length) {
      W = (k + 1) * M_PS + k * M_CW;
      x = -W / 2;
      s += '<rect class="cell ' + (n.cls || '') + '" x="' + (-W / 2) + '" y="' + (-M_NH / 2) + '" width="' + W + '" height="' + M_NH + '" rx="4"/>';
      for (i = 0; i <= k; i++) {
        s += S.circle(x + M_PS / 2, 0, 3, '', ' fill="#7f9c8a"');
        x += M_PS;
        if (i < k) {
          var kc = n.keys[i];
          s += '<rect class="cell ' + (kc.cls || '') + '" x="' + (x + 2) + '" y="' + (-M_NH / 2 + 4) +
            '" width="' + (M_CW - 4) + '" height="' + (M_NH - 8) + '" rx="3"/>' +
            S.text(x + M_CW / 2, 0, kc.v, 'cell-txt');
          x += M_CW;
        }
      }
      return { inner: s, W: W };
    }
    W = k * M_CW + 26;
    x = -W / 2 + 13;
    s += '<rect class="cell ' + (n.cls || '') + '" x="' + (-W / 2) + '" y="' + (-M_NH / 2) + '" width="' + W + '" height="' + M_NH + '" rx="4"/>';
    for (i = 0; i < k; i++) {
      s += '<rect class="cell ' + (n.keys[i].cls || '') + '" x="' + (x + 2) + '" y="' + (-M_NH / 2 + 4) +
        '" width="' + (M_CW - 4) + '" height="' + (M_NH - 8) + '" rx="3"/>' +
        S.text(x + M_CW / 2, 0, n.keys[i].v, 'cell-txt');
      x += M_CW;
    }
    if (isPlusLeaf) { s += S.textL(W / 2 - 6, 0, '→', 'ptr'); }
    return { inner: s, W: W };
  }
  function edgeClsFor(c) {
    if (c === 'active') { return 'tree hl'; }
    if (c === 'path') { return 'tree path'; }
    if (c === 'done') { return 'tree done'; }
    if (c === 'dead') { return 'tree dim'; }
    return 'tree';
  }
  /** B 树 / B+ 树统一渲染 */
  function renderMultiway(kr, s) {
    if (!s) { kr.end(); return; }
    if (s.empty) { kr.html('__m', S.text(500, 300, s.msg, 'vs')); kr.end(); return; }
    kr.html('__defs', S.arrowDefs());
    kr.html('__t', S.text(500, 26, s.title, 'vt'));
    if (s.sub) { kr.html('__st', S.text(500, 48, s.sub, 'vs')); }
    if (s.note) { kr.html('__nt', S.text(500, 68, s.note, 'vs')); }
    if (!s.root) {
      kr.html('__e', S.text(500, 300, '（树为空：请先用「按序列建树」或「插入」放入关键字）', 'vs'));
      kr.end();
      return;
    }
    // 关键字格宽自适应（树很宽时缩小）
    M_CW = 48;
    for (var tries = 0; tries < 12; tries++) {
      var w0 = measureTree(s.root);
      if (w0 <= 930 || M_CW <= 18) { break; }
      M_CW = Math.max(18, Math.round(M_CW * 930 / w0) - 2);
    }
    // 层高自适应（树很深时压缩）
    var d = treeDepth(s.root);
    M_TOP = 100;
    M_LH = d > 1 ? Math.min(96, (452 - M_TOP) / (d - 1)) : 96;

    var pos = {};
    placeTree(s.root, 500, 0, pos);

    var ge = kr.g('__edges', 'translate(0,0)', 'k');
    var gn = kr.g('__nodes', 'translate(0,0)', 'k');

    // 边
    (function walkE(n) {
      if (!n) { return; }
      var p = pos[n.id];
      if (n.children && n.children.length) {
        for (var i = 0; i < n.children.length; i++) {
          var c = n.children[i], cp = pos[c.id];
          if (!cp || !p) { continue; }
          var ax = p.x + childAnchorOff(n, i);
          kr.html('e_' + n.id + '_' + c.id,
            S.line(ax, p.y + M_NH / 2 - 2, cp.x, cp.y - M_NH / 2 + 2, 'edge ' + edgeClsFor(c.cls)), ge);
          walkE(c);
        }
      }
    })(s.root);

    // 结点
    (function walkN(n) {
      if (!n) { return; }
      var p = pos[n.id];
      if (p) {
        var d0 = nodeInner(n, s.plus && n.leaf);
        kr.g('n' + n.id, 'translate(' + p.x + ',' + p.y + ')', 'k', d0.inner, gn);
      }
      if (n.children && n.children.length) {
        for (var i = 0; i < n.children.length; i++) { walkN(n.children[i]); }
      }
    })(s.root);

    // B+ 树：叶子之间的横向链表
    if (s.plus) {
      var order = [];
      (function dfs(n) {
        if (!n) { return; }
        if (n.leaf) { order.push(n); return; }
        if (n.children) { for (var i = 0; i < n.children.length; i++) { dfs(n.children[i]); } }
      })(s.root);
      var gm = kr.g('__links', 'translate(0,0)', 'k');
      for (var q = 0; q < order.length; q++) {
        var a = order[q], pa = pos[a.id];
        if (!pa) { continue; }
        var aw = nodeWidth(a);
        var yb = pa.y + M_NH / 2 + 14;
        var next = order[q + 1];
        if (next) {
          var pb = pos[next.id];
          if (pb) {
            var x1 = pa.x + aw / 2 - 2, x2 = pb.x - nodeWidth(next) / 2 + 2;
            var dpath = 'M ' + x1 + ' ' + (pa.y + M_NH / 2 - 8) + ' L ' + x1 + ' ' + yb + ' L ' + x2 + ' ' + yb + ' L ' + x2 + ' ' + (pb.y + M_NH / 2 - 8);
            var mk = (a.cls === 'path' || a.cls === 'active') ? 'arrowHl' : 'arrow';
            kr.html('ln_' + a.id, S.path(dpath, 'edge ' + edgeClsFor(a.cls), ' marker-end="url(#' + mk + ')"'), gm);
          }
        } else {
          kr.html('ln_null', S.textL(pa.x + aw / 2 + 6, pa.y + 2, '→ ∅', 'idx-txt'), gm);
        }
      }
      kr.html('__lgl', S.text(500, 512, '叶子层之间有横向链表指针（范围查询时沿这条链扫描即可，不需要回到根）', 'vs'));
    }
    if (s.warn) { kr.html('__w', S.text(500, 500, s.warn, 'vwarn')); }
    kr.html('__gh', S.text(500, 620, '阶数 m = ' + s.m + '：每个结点最多 ' + s.maxK + ' 个关键字 / ' + s.m +
      ' 个孩子；除根外每个结点至少 ' + s.minK + ' 个关键字', 'vs'));
    kr.end();
  }

  /* ============================================================
     4. B 树
     ============================================================ */
  DSV.register({
    id: 'btree',
    name: 'B 树',
    category: '索引结构',
    desc: '多路平衡查找树，适合磁盘等外存索引。阶数 m 表示每个结点最多 m 个孩子、最多 m-1 个关键字；除根外每个结点至少 ceil(m/2)-1 个关键字；所有叶子在同一层。关键字直接存在每个结点里（内部结点也存数据），插入时自底向上分裂上溢结点（中间关键字上提），删除时对下溢结点做借位或合并。查找/插入/删除均为 O(log_m n)，树高始终平衡。',
    viewBox: '0 0 1000 660',
    code: [
      '// 阶数 m：每个结点最多 m-1 个关键字、最多 m 个孩子；除根外至少 ceil(m/2)-1 个关键字',
      'insert(T, x):',
      '  if root == null: root = 新建叶子 [x]; return',
      '  leaf = 从根开始，按关键字比较一路向下走到的叶子',
      '  把 x 按有序位置插入 leaf',
      '  while 某个结点发生上溢（关键字数 > m-1）:',
      '    mid = floor(m / 2)',
      '    把 keys[mid] 上提：左半留在原结点，右半另建一个结点',
      '    上提的关键字连同新结点插到父结点的对应位置',
      '    if 没有父结点: 新建根结点（只放这一个关键字），树高 + 1',
      '    继续检查父结点是否也上溢',
      '',
      'find(T, x):',
      '  p = root',
      '  while p != null:',
      '    i = 第一个满足 p.keys[i] >= x 的下标（没有则为 |keys|）',
      '    if i < |keys| and p.keys[i] == x: 命中，返回 p',
      '    if p 是叶子: return 未找到',
      '    p = p.children[i]',
      '',
      'delete(T, x):',
      '  按 find 的路线定位 x 所在的结点 node 与下标 i',
      '  if node 是内部结点: 用左子树的最大关键字（前驱）顶替 x，再转去叶子删除前驱',
      '  从叶子里删掉这个关键字',
      '  while node 发生下溢（关键字数 < ceil(m/2)-1 且不是根）:',
      '    若某个兄弟有多余关键字: 借一个（经父结点旋转，内部结点还要搬一个孩子）',
      '    else: 与兄弟合并，并把父结点中的分隔关键字下移',
      '    node = 父结点（父结点少了一个关键字，可能继续下溢）',
      '  if root 没有关键字且有孩子: root = 唯一的孩子，树高 - 1'
    ],
    inputs: [
      { key: 'init', label: '初始序列', def: '1,2,3,4,5,6,7', hint: '逗号分隔的整数' },
      { key: 'm', label: '阶数 m', def: '4', hint: '3-6，每结点最多 m-1 个关键字' }
    ],
    samples: [
      { label: '示例：触发结点分裂（1..7，m=4，最多 3 个关键字）', values: { init: '1,2,3,4,5,6,7', m: '4' } },
      { label: '示例：只分裂一次（连根，结点高度变化）', values: { init: '10,20,30,40', m: '3' } },
      { label: '示例：乱序插入并多次分裂', values: { init: '50,20,80,10,30,60,90,40,70', m: '4' } }
    ],
    random: function () {
      var m = DSV.ri(3, 5), n = DSV.ri(5, 8), o = [];
      for (var i = 0; i < n; i++) { o.push(DSV.ri(1, 99)); }
      return { init: o.join(','), m: String(m) };
    },
    actions: [
      { key: 'build', label: '按序列建树', primary: true },
      { key: 'insert', label: '插入', arg: { key: 'x', label: '关键字', def: '8' } },
      { key: 'find', label: '查找', arg: { key: 'x', label: '关键字', def: '5' } },
      { key: 'delete', label: '删除', arg: { key: 'x', label: '关键字', def: '4' } }
    ],
    run: function (v, a, state) {
      var m = toInt(v.m, 4, 3, 6);
      var tr = state;
      if (!tr || tr.__kind !== 'btree' || tr.m !== m) { tr = { __kind: 'btree', m: m, root: null, cnt: 1 }; }
      var maxK = m - 1, minK = Math.ceil(m / 2) - 1;
      var steps = [];

      function sn(h) {
        h = h || {};
        h.note = h.note || ('阶数 m = ' + m + '：每个结点最多 ' + maxK + ' 个关键字 / ' + m +
          ' 个孩子；除根外至少 ' + minK + ' 个关键字');
        return makeTreeSnap(tr.root, m, 'B', h);
      }
      function newNode(keys, children, leaf) {
        return { id: tr.cnt++, keys: keys, children: children || [], leaf: !!leaf };
      }

      /* ---------------- 分裂一个上溢结点 ---------------- */
      function doSplit(nd, parent, T, pfx) {
        var h0 = hmap();
        hNode(h0, nd.id, 'swap');
        for (var q = 0; q < nd.keys.length; q++) { hKey(h0, nd.id, q, 'swap'); }
        push(steps, [5, 6], pfx + '结点 #' + nd.id + ' 现在有 ' + nd.keys.length + ' 个关键字 [' + nd.keys.join(' | ') +
          ']，超过了上限 m-1 = ' + maxK + '，发生上溢：必须分裂。取中间下标 mid = floor(m/2) = ' + Math.floor(m / 2),
          sn({ title: T, sub: '结点 #' + nd.id + ' 上溢', n: h0 }));

        var mid = Math.floor(m / 2);
        var upKey = nd.keys[mid];
        var lkeys = nd.keys.slice(0, mid);
        var rkeys = nd.keys.slice(mid + 1);
        var lch = nd.children, rch = [];
        if (!nd.leaf) { rch = nd.children.slice(mid + 1); lch = nd.children.slice(0, mid + 1); }
        var right = newNode(rkeys, rch, nd.leaf);
        nd.keys = lkeys;
        nd.children = nd.leaf ? [] : lch;

        var h1 = hmap();
        hNode(h1, nd.id, 'done'); hNode(h1, right.id, 'done');
        push(steps, [7], pfx + '把中间关键字 ' + upKey + ' 提出来：左半 [' + lkeys.join(', ') + '] 留在原结点 #' + nd.id +
          '，右半 [' + rkeys.join(', ') + '] 放进新结点 #' + right.id +
          (nd.leaf ? '' : '，对应的孩子指针也被切成两段'),
          sn({ title: T, sub: '分裂：左 #' + nd.id + ' ← ' + upKey + ' ↑ → 右 #' + right.id, n: h1 }));

        if (!parent) {
          tr.root = newNode([upKey], [nd, right], false);
          push(steps, [9], pfx + '原结点就是根：新建一个根结点 #' + tr.root.id + '，只放被上提的 ' + upKey +
            '，两个孩子分别是 #' + nd.id + ' 与 #' + right.id + '，于是树高增加 1',
            sn({ title: T, sub: '新建根结点 #' + tr.root.id + '，树高 +1', n: (function () { var g = hmap(); hKey(g, tr.root.id, 0, 'swap'); return g; })() }));
        } else {
          var pi2 = parent.children.indexOf(nd);
          if (pi2 < 0) { pi2 = 0; }
          parent.keys.splice(pi2, 0, upKey);
          parent.children.splice(pi2 + 1, 0, right);
          push(steps, [8], pfx + '把 ' + upKey + ' 插到父结点 #' + parent.id + ' 的第 ' + (pi2 + 1) +
            ' 个关键字位置，新结点 #' + right.id + ' 挂在它右边成为第 ' + (pi2 + 2) + ' 个孩子',
            sn({
              title: T, sub: '上提到父结点 #' + parent.id,
              n: (function () { var g = hmap(); hNode(g, parent.id, 'compare'); hKey(g, parent.id, pi2, 'swap'); return g; })()
            }));
        }
      }

      /* ---------------- 插入 ---------------- */
      function ins(x, pfx) {
        pfx = pfx || '';
        var T = pfx + '插入 ' + x + '（m = ' + m + '）';
        if (!tr.root || !tr.root.keys.length) {
          tr.root = newNode([x], [], true);
          push(steps, [2], pfx + '树为空：新建一个根结点 #' + tr.root.id + '（它同时也是叶子），把 ' + x + ' 放进去',
            sn({ title: T, sub: '新建根结点 #' + tr.root.id, n: (function () { var g = hmap(); hNode(g, tr.root.id, 'swap'); hKey(g, tr.root.id, 0, 'swap'); return g; })() }));
          return;
        }
        push(steps, [3], pfx + '从根结点 #' + tr.root.id + ' 出发，按比较结果一路向下走到应该落的叶子',
          sn({ title: T, sub: '开始向下选路', n: (function () { var g = hmap(); hNode(g, tr.root.id, 'compare'); return g; })() }));
        var path = [];
        var node = tr.root;
        while (!node.leaf) {
          var i = 0;
          while (i < node.keys.length && x > node.keys[i]) { i++; }
          if (i < node.keys.length) {
            if (node.keys[i] === x) {
              push(steps, [3], pfx + '在结点 #' + node.id + ' 里遇到了相等的关键字 ' + x + '：B 树不允许重复关键字，插入结束',
                sn({ title: T, sub: '重复关键字', n: (function () { var g = hmap(); hNode(g, node.id, 'compare'); hKey(g, node.id, i, 'active'); return g; })() }));
              return;
            }
            push(steps, [3], '在结点 #' + node.id + ' 中比较：' + x + (x < node.keys[i] ? ' < ' : ' > ') + node.keys[i] +
              '，走它' + (x < node.keys[i] ? '左边' : '右边') + '的第 ' + (i + 1) + ' 个孩子',
              sn({ title: T, sub: '比较结点 #' + node.id, n: (function () { var g = hmap(); hNode(g, node.id, 'compare'); hKey(g, node.id, i, 'compare'); return g; })() }));
          } else {
            push(steps, [3], '在结点 #' + node.id + ' 中 ' + x + ' 比全部关键字都大，走向最右边的第 ' + (i + 1) + ' 个孩子',
              sn({ title: T, sub: '定位到最后一个孩子', n: (function () { var g = hmap(); hNode(g, node.id, 'compare'); return g; })() }));
          }
          path.push(node);
          node = node.children[i];
        }
        var pos = 0;
        while (pos < node.keys.length && node.keys[pos] < x) { pos++; }
        if (pos < node.keys.length && node.keys[pos] === x) {
          push(steps, [3], pfx + '叶子 #' + node.id + ' 里已经有 ' + x + '，不重复插入',
            sn({ title: T, sub: '重复关键字', n: (function () { var g = hmap(); hNode(g, node.id, 'compare'); hKey(g, node.id, pos, 'active'); return g; })() }));
          return;
        }
        node.keys.splice(pos, 0, x);
        push(steps, [4], pfx + '下降到叶子结点 #' + node.id + '，按大小顺序把 ' + x + ' 插入到第 ' + (pos + 1) +
          ' 个位置 → [' + node.keys.join(' | ') + ']',
          sn({ title: T, sub: '写入叶子 #' + node.id, n: (function () { var g = hmap(); hNode(g, node.id, 'swap'); hKey(g, node.id, pos, 'swap'); return g; })() }));
        path.push(node);
        var split = false;
        while (path.length) {
          var cur = path[path.length - 1];
          if (cur.keys.length <= maxK) { break; }
          path.pop();
          doSplit(cur, path.length ? path[path.length - 1] : null, T, pfx);
          split = true;
        }
        push(steps, [10], pfx + '插入 ' + x + ' 完成' + (split ? '（过程中发生了结点分裂，注意树始终保持平衡）' : '（没有结点上溢，无需分裂）'),
          sn({ title: T, sub: '插入完成' }));
      }

      /* ---------------- 查找 ---------------- */
      function fnd(x) {
        var T = '查找 ' + x + '（m = ' + m + '）';
        if (!tr.root || !tr.root.keys.length) {
          push(steps, [12], '树为空，查找失败', sn({ title: T, sub: '空树' }));
          return;
        }
        push(steps, [12, 13], '开始查找 ' + x + '：B 树的多路查找就是「在结点里找到第一个 ≥ x 的关键字，再顺对应的孩子指针下降」，' +
          '一路走到叶子为止（每下降一层只读一个结点，这正是它适合外存的原因）',
          sn({ title: T, sub: '从根开始查找', n: (function () { var g = hmap(); hNode(g, tr.root.id, 'compare'); return g; })() }));
        var node = tr.root, lv = 0;
        while (node) {
          var i = 0;
          while (i < node.keys.length && x > node.keys[i]) { i++; }
          push(steps, [14, 15], '在第 ' + (lv + 1) + ' 层的结点 #' + node.id + ' 里查找：关键字为 [' + node.keys.join(' | ') + ']，' +
            (i < node.keys.length ? '第一个 ≥ ' + x + ' 的关键字是第 ' + (i + 1) + ' 个 ' + node.keys[i] : x + ' 比所有关键字都大，落到最后'),
            sn({
              title: T, sub: '当前结点 #' + node.id,
              n: (function () { var g = hmap(); hNode(g, node.id, 'compare'); return g; })()
            }));
          if (i < node.keys.length && node.keys[i] === x) {
            push(steps, [16], '命中！' + x + ' 就在结点 #' + node.id + ' 的第 ' + (i + 1) + ' 个关键字位置（第 ' + (lv + 1) +
              ' 层，沿路一共检查了 ' + (lv + 1) + ' 个结点）',
              sn({ title: T, sub: '查找成功', n: (function () { var g = hmap(); hNode(g, node.id, 'active'); hKey(g, node.id, i, 'active'); return g; })() }));
            return;
          }
          if (node.leaf) {
            push(steps, [17], '已经走到叶子 #' + node.id + '，叶子没有更下一层的孩子，说明 ' + x + ' 不在树中，查找失败',
              sn({ title: T, sub: '查找失败', n: (function () { var g = hmap(); hNode(g, node.id, 'dead'); return g; })() }));
            return;
          }
          push(steps, [18], '未命中，沿第 ' + (i + 1) + ' 个孩子指针下降到下一层',
            sn({ title: T, sub: '下降到孩子 #' + (i + 1), n: (function () { var g = hmap(); hNode(g, node.id, 'compare'); return g; })() }));
          node = node.children[i];
          lv++;
        }
      }

      /* ---------------- 删除 ---------------- */
      function del(x) {
        var T = '删除 ' + x + '（m = ' + m + '，除根外每结点至少 ' + minK + ' 个关键字）';
        if (!tr.root || !tr.root.keys.length) {
          push(steps, [20], '树为空，无法删除', sn({ title: T, sub: '空树' }));
          return;
        }
        push(steps, [20, 21], '开始删除 ' + x + '：先按查找的路线定位它，删掉后如果结点关键字太少（下溢），' +
          '就向兄弟借一个关键字，借不到就与兄弟合并并让父结点的分隔关键字下移',
          sn({ title: T, sub: '定位 ' + x, n: (function () { var g = hmap(); hNode(g, tr.root.id, 'compare'); return g; })() }));
        var anc = [];                 // 从根到「当前结点」的路径（最后一项是当前结点）
        var node = tr.root, pos = -1, lv = 0;
        while (true) {
          var i = 0;
          while (i < node.keys.length && x > node.keys[i]) { i++; }
          push(steps, [21], '定位 ' + x + '：在第 ' + (lv + 1) + ' 层结点 #' + node.id + ' 里，' +
            (i < node.keys.length ? '第一个 ≥ ' + x + ' 的关键字是 ' + node.keys[i] + '（第 ' + (i + 1) + ' 个）' : '所有关键字都小于 ' + x),
            sn({ title: T, sub: '定位结点 #' + node.id, n: (function () { var g = hmap(); hNode(g, node.id, 'compare'); return g; })() }));
          if (i < node.keys.length && node.keys[i] === x) { pos = i; anc.push(node); break; }
          if (node.leaf) {
            push(steps, [21], '走到叶子 #' + node.id + ' 也没有找到 ' + x + '，删除失败',
              sn({ title: T, sub: '未找到，删除失败', n: (function () { var g = hmap(); hNode(g, node.id, 'dead'); return g; })() }));
            return;
          }
          anc.push(node);
          node = node.children[i];
          lv++;
        }
        var delKey = x;
        if (!node.leaf) {
          push(steps, [22], x + ' 位于内部结点 #' + node.id + ' 的第 ' + (pos + 1) + ' 个位置：不能在中间开洞，' +
            '改为用左子树里的最大关键字（前驱）顶替它',
            sn({ title: T, sub: '寻找前驱', n: (function () { var g = hmap(); hNode(g, node.id, 'compare'); hKey(g, node.id, pos, 'swap'); return g; })() }));
          var c = node.children[pos];
          anc.push(c);
          while (!c.leaf) { c = c.children[c.keys.length]; anc.push(c); }
          var pred = c.keys[c.keys.length - 1];
          node.keys[pos] = pred;
          push(steps, [22], '前驱是叶子 #' + c.id + ' 的最大关键字 ' + pred + '：把它填到原来 ' + x +
            ' 的位置，问题就转化为「从叶子里删除 ' + pred + '」',
            sn({ title: T, sub: '前驱 ' + pred + ' 上移顶替', n: (function () { var g = hmap(); hNode(g, c.id, 'compare'); hKey(g, c.id, c.keys.length - 1, 'swap'); return g; })() }));
          node = c;
          pos = node.keys.length - 1;
          delKey = pred;
        }
        node.keys.splice(pos, 1);
        push(steps, [23], '从叶子 #' + node.id + ' 中删掉 ' + delKey + ' → [' + node.keys.join(' | ') + ']',
          sn({ title: T, sub: '删除 ' + delKey, n: (function () { var g = hmap(); hNode(g, node.id, 'swap'); return g; })() }));

        // 自底向上修正下溢
        var merged = false;
        while (anc.length > 1) {
          var cur = anc[anc.length - 1];
          anc.pop();
          var parent = anc[anc.length - 1];
          if (cur.keys.length >= minK) { break; }
          var pi3 = parent.children.indexOf(cur);
          if (pi3 < 0) { break; }
          push(steps, [24], '结点 #' + cur.id + ' 只剩 ' + cur.keys.length + ' 个关键字，低于下限 ' + minK +
            '（下溢）：先看兄弟能不能借，借不到就合并',
            sn({ title: T, sub: '#' + cur.id + ' 下溢', n: (function () { var g = hmap(); hNode(g, cur.id, 'swap'); hNode(g, parent.id, 'compare'); return g; })() }));
          var ls = pi3 > 0 ? parent.children[pi3 - 1] : null;
          var rs = pi3 + 1 < parent.children.length ? parent.children[pi3 + 1] : null;
          var borrowed = false;
          if (ls && ls.keys.length > minK) {
            var sep = parent.keys[pi3 - 1];
            var mv = ls.keys[ls.keys.length - 1];
            cur.keys.unshift(sep);
            parent.keys[pi3 - 1] = ls.keys.pop();
            if (!cur.leaf) { cur.children.unshift(ls.children.pop()); }
            push(steps, [25], '左兄弟 #' + ls.id + ' 有富余（' + ls.keys.length + ' 个关键字 > ' + minK + '），可以借：' +
              '把父结点的分隔关键字 ' + sep + ' 旋下来放到 #' + cur.id + ' 的开头，再把左兄弟的最大关键字 ' + mv + ' 旋上去接替它' +
              (cur.leaf ? '' : '，同时把对应的孩子指针也搬过来'),
              sn({ title: T, sub: '向左兄弟借 ' + mv, n: (function () { var g = hmap(); hNode(g, cur.id, 'active'); hNode(g, parent.id, 'compare'); return g; })() }));
            borrowed = true;
          } else if (rs && rs.keys.length > minK) {
            var sep2 = parent.keys[pi3];
            var mv2 = rs.keys[0];
            cur.keys.push(sep2);
            parent.keys[pi3] = rs.keys.shift();
            if (!cur.leaf) { cur.children.push(rs.children.shift()); }
            push(steps, [25], '左兄弟借不出来，但右兄弟 #' + rs.id + ' 有富余：把父结点的分隔关键字 ' + sep2 +
              ' 放到 #' + cur.id + ' 的末尾，再把右兄弟的最小关键字 ' + mv2 + ' 旋上去接替它',
              sn({ title: T, sub: '向右兄弟借 ' + mv2, n: (function () { var g = hmap(); hNode(g, cur.id, 'active'); hNode(g, parent.id, 'compare'); return g; })() }));
            borrowed = true;
          } else if (ls) {
            var pk = parent.keys[pi3 - 1];
            ls.keys = ls.keys.concat([pk], cur.keys);
            if (!cur.leaf) { ls.children = ls.children.concat(cur.children); }
            parent.keys.splice(pi3 - 1, 1);
            parent.children.splice(pi3, 1);
            push(steps, [26], '左右兄弟都没有富余关键字：与左兄弟 #' + ls.id + ' 合并。' +
              '父结点的分隔关键字 ' + pk + ' 被拉下来夹在两个结点中间 → [' + ls.keys.join(' | ') + ']，父结点少了一个关键字和一个孩子',
              sn({ title: T, sub: '与左兄弟合并', n: (function () { var g = hmap(); hNode(g, ls.id, 'swap'); hNode(g, parent.id, 'compare'); return g; })() }));
            merged = true;
          } else if (rs) {
            var pk2 = parent.keys[pi3];
            cur.keys = cur.keys.concat([pk2], rs.keys);
            if (!cur.leaf) { cur.children = cur.children.concat(rs.children); }
            parent.keys.splice(pi3, 1);
            parent.children.splice(pi3 + 1, 1);
            push(steps, [26], '没有左兄弟，右兄弟也没有富余：与右兄弟 #' + rs.id + ' 合并。' +
              '父结点的分隔关键字 ' + pk2 + ' 拉下来夹在中间 → [' + cur.keys.join(' | ') + ']，父结点少一个关键字和一个孩子',
              sn({ title: T, sub: '与右兄弟合并', n: (function () { var g = hmap(); hNode(g, cur.id, 'swap'); hNode(g, parent.id, 'compare'); return g; })() }));
            merged = true;
          } else { break; }
          if (borrowed) { break; }   // 借位不改变父结点关键字个数，链条结束
        }
        if (tr.root && !tr.root.leaf && tr.root.keys.length === 0) {
          tr.root = tr.root.children[0];
          push(steps, [28], '根结点被耗尽（没有关键字了）：把唯一的孩子 #' + tr.root.id + ' 提升为新根，树高减少 1',
            sn({ title: T, sub: '降低树高', n: (function () { var g = hmap(); hNode(g, tr.root.id, 'active'); return g; })() }));
        }
        push(steps, [28], '删除 ' + x + ' 完成' + (merged ? '（过程中发生了结点合并）' : ''),
          sn({ title: T, sub: '删除完成，树仍然平衡' }));
      }

      var act = (a && a.key) || 'build';
      if (act === 'build') {
        var ks = DSV.nums(v.init, 10);
        if (!ks.length) {
          return { steps: [msgStep('初始序列为空，请输入逗号分隔的整数序列（例如 1,2,3,4,5,6,7）来建树。')], state: tr };
        }
        tr = { __kind: 'btree', m: m, root: null, cnt: 1 };
        push(steps, [0], '开始按序列 [' + ks.join(', ') + '] 逐个插入建 B 树：阶数 m = ' + m +
          '（每个结点最多 ' + maxK + ' 个关键字，超过就分裂并把中间关键字上提）',
          sn({ title: '建树：m = ' + m + '，序列 ' + ks.join(', '), sub: '准备插入第 1 个关键字', root: null }));
        for (var t = 0; t < ks.length; t++) { ins(ks[t], '建树第 ' + (t + 1) + '/' + ks.length + ' 步 · '); }
        push(steps, [0], '建树完成！共插入 ' + ks.length + ' 个关键字，所有叶子都在同一层，树始终保持平衡',
          sn({ title: '建树完成（m = ' + m + '）', sub: '可以继续插入 / 查找 / 删除' }));
      } else {
        var x0 = firstNum(a && a.arg);
        if (x0 === null) {
          return { steps: [msgStep('请在操作按钮右侧的输入框里填写一个整数关键字。')], state: tr };
        }
        if (act === 'insert') { ins(x0, ''); }
        else if (act === 'find') { fnd(x0); }
        else { del(x0); }
      }
      return { steps: steps, state: tr };
    },
    render: function (kr, s) { renderMultiway(kr, s); }
  });

  /* ============================================================
     5. B+ 树
     ============================================================ */
  DSV.register({
    id: 'bplustree',
    name: 'B+ 树',
    category: '索引结构',
    desc: 'B 树的变种，数据库索引的主力结构。与 B 树的关键区别：内部结点只存索引（导航用的关键字），所有真实数据都在叶子结点里；叶子之间用横向链表串起来，因此范围查询只要定位到起点叶子、沿链扫描即可，不必反复回到根。叶子分裂时把中间关键字「复制」一份上提到父结点（自己仍在叶子里），而内部结点分裂时则是把中间关键字「移动」上去。查找 O(log_m n)，范围查询 O(log_m n + k)。',
    viewBox: '0 0 1000 660',
    code: [
      '// 阶数 m：内部结点最多 m 个孩子 / m-1 个关键字，只做导航；数据全部在叶子',
      '// 叶子之间用单向链表相连，范围查询沿这条链扫描即可',
      'insert(T, x):',
      '  if root == null: root = 新建叶子 [x]; return',
      '  leaf = 从根按「x >= key 就往右」的规则一路走到的叶子',
      '  把 x 按有序位置插入 leaf',
      '  while 当前结点上溢（关键字数 > m-1）:',
      '    mid = floor(m / 2)；右半另建新叶子，把它的第一个关键字「复制」一份上提到父结点',
      '    新叶子插入叶子链表：leaf.next = 新叶子',
      '    if 没有父结点: 新建一个内部根结点',
      '    继续向上检查父结点（内部结点上溢时，中间关键字是「移动」上去的）',
      '',
      'find(T, x):',
      '  p = root',
      '  while p 不是叶子:',
      '    i = 第一个满足 keys[i] > x 的下标（没有就取最后一个孩子）',
      '    p = p.children[i]',
      '  if x 在 leaf 的关键字里: 命中（B+ 树的查找一定走到叶子）',
      '  else: return 未找到',
      '',
      'range(T, lo, hi):',
      '  用 find 走到 lo 应该落入的叶子',
      '  while 当前叶子存在:',
      '    收集该叶子中所有落在 [lo, hi] 内的关键字；遇到 > hi 就停止',
      '    沿 next 指针走到右兄弟叶子',
      '  return 结果',
      '',
      'delete(T, x):',
      '  按 find 的路线走到叶子，从叶子里删掉 x',
      '  while 叶子下溢（关键字数 < ceil(m/2)-1）:',
      '    若兄弟有富余: 借一个关键字，并更新父结点中的分界关键字',
      '    else: 与兄弟合并（丢弃父结点中对应的分界关键字）',
      '    继续检查父结点是否下溢',
      '  if 根是内部结点且没有关键字: root = 唯一的孩子'
    ],
    inputs: [
      { key: 'init', label: '初始序列', def: '1,2,3,4,5,6,7', hint: '逗号分隔的整数' },
      { key: 'm', label: '阶数 m', def: '4', hint: '3-6，每结点最多 m-1 个关键字' }
    ],
    samples: [
      { label: '示例：触发结点分裂（1..7，m=4，叶子分裂后 Colleges 上提）', values: { init: '1,2,3,4,5,6,7', m: '4' } },
      { label: '示例：分裂后再范围查询 4~9', values: { init: '1,2,3,4,5,6,7,8,9,10', m: '4' } },
      { label: '示例：乱序插入（内部结点也会分裂）', values: { init: '10,4,17,25,31,2,8,13,20', m: '3' } }
    ],
    random: function () {
      var m = DSV.ri(3, 5), n = DSV.ri(5, 8), o = [];
      for (var i = 0; i < n; i++) { o.push(DSV.ri(1, 99)); }
      return { init: o.join(','), m: String(m) };
    },
    actions: [
      { key: 'build', label: '按序列建树', primary: true },
      { key: 'insert', label: '插入', arg: { key: 'x', label: '关键字', def: '8' } },
      { key: 'find', label: '查找', arg: { key: 'x', label: '关键字', def: '5' } },
      { key: 'delete', label: '删除', arg: { key: 'x', label: '关键字', def: '4' } },
      { key: 'range', label: '范围查询', arg: { key: 'x', label: '区间 lo,hi', def: '4,9' } }
    ],
    run: function (v, a, state) {
      var m = toInt(v.m, 4, 3, 6);
      var tr = state;
      if (!tr || tr.__kind !== 'bplustree' || tr.m !== m) { tr = { __kind: 'bplustree', m: m, root: null, cnt: 1 }; }
      var maxK = m - 1, minK = Math.ceil(m / 2) - 1;
      var steps = [];

      function sn(h) {
        h = h || {};
        h.note = h.note || ('阶数 m = ' + m + '：每个结点最多 ' + maxK + ' 个关键字；内部结点只存索引，数据全在叶子，叶子用链表相连');
        return makeTreeSnap(tr.root, m, 'B+', h);
      }
      function mkNode(keys, children, leaf) {
        var n = { id: tr.cnt++, keys: keys, children: children || [], leaf: !!leaf, next: null };
        return n;
      }
      /** 收集所有叶子（从左到右） */
      function leafList() {
        var out = [];
        (function dfs(n) {
          if (!n) { return; }
          if (n.leaf) { out.push(n); return; }
          for (var i = 0; i < n.children.length; i++) { dfs(n.children[i]); }
        })(tr.root);
        return out;
      }
      /** 子树里的最小关键字（一直走到最左叶子） */
      function minKeyOf(n) {
        while (!n.leaf) { n = n.children[0]; }
        return n.keys[0];
      }
      /** 沿祖先链自底向上刷新失效的分界关键字（B+ 树索引是叶子的拷贝，min 变化必须同步） */
      function refreshSep(chain) {
        for (var i = chain.length - 2; i >= 0; i--) {
          var par = chain[i], kid = chain[i + 1];
          if (!par || !kid || !par.children || par.leaf) { continue; }
          var ci0 = par.children.indexOf(kid);
          if (ci0 > 0) { par.keys[ci0 - 1] = minKeyOf(kid); }
        }
      }

      /** 把 (upKey, rightNode) 插到父结点中 leftNode 之后 */
      function insertIntoParent(parent, left, upKey, right, T, pfx, isLeafSplit) {
        if (!parent) {
          tr.root = mkNode([upKey], [left, right], false);
          push(steps, [9], pfx + '没有父结点：新建一个内部根结点 #' + tr.root.id + '，把它上提的索引关键字 ' + upKey +
            ' 放进去，两个孩子分别是 #' + left.id + ' 与 #' + right.id + '，树高 +1',
            sn({ title: T, sub: '新建内部根 #' + tr.root.id, n: (function () { var g = hmap(); hNode(g, tr.root.id, 'swap'); hKey(g, tr.root.id, 0, 'swap'); return g; })() }));
          return;
        }
        var ci = parent.children.indexOf(left);
        if (ci < 0) { ci = parent.children.length - 1; }
        parent.keys.splice(ci, 0, upKey);
        parent.children.splice(ci + 1, 0, right);
        push(steps, [8], pfx + '把索引关键字 ' + upKey + ' 插入父结点 #' + parent.id + ' 的第 ' + (ci + 1) +
          ' 个位置，新结点 #' + right.id + ' 挂在它的右边' + (isLeafSplit ? '（注意 ' + upKey + ' 只是「复制」上来的，叶子里的 ' + upKey + ' 仍然保留）' : '（内部结点的关键字是被「移动」上去的）'),
          sn({
            title: T, sub: '上提到父结点 #' + parent.id,
            n: (function () { var g = hmap(); hNode(g, parent.id, 'compare'); hKey(g, parent.id, ci, 'swap'); return g; })()
          }));
      }

      /* ---------------- 插入 ---------------- */
      function ins(x, pfx) {
        pfx = pfx || '';
        var T = pfx + '插入 ' + x + '（m = ' + m + '）';
        if (!tr.root || !tr.root.keys.length) {
          tr.root = mkNode([x], [], true);
          push(steps, [3], pfx + '树为空：新建一个叶子根结点 #' + tr.root.id + '，把 ' + x + ' 放进去（B+ 树的数据永远只在叶子）',
            sn({ title: T, sub: '新建叶子根 #' + tr.root.id, n: (function () { var g = hmap(); hNode(g, tr.root.id, 'swap'); hKey(g, tr.root.id, 0, 'swap'); return g; })() }));
          return;
        }
        push(steps, [4], pfx + '从根开始向下选路（规则：x ≥ 索引关键字就往右走，一直走到叶子）',
          sn({ title: T, sub: '开始向下选路', n: (function () { var g = hmap(); hNode(g, tr.root.id, 'compare'); return g; })() }));
        var path = [];
        var p = tr.root;
        while (!p.leaf) {
          var i = 0;
          while (i < p.keys.length && x >= p.keys[i]) { i++; }
          push(steps, [4], '在内部结点 #' + p.id + ' 里比较：' + (i < p.keys.length ? x + ' < ' + p.keys[i] +
            '，走进第 ' + (i + 1) + ' 个孩子' : x + ' ≥ 所有索引关键字，走进最右边的孩子'),
            sn({ title: T, sub: '比较内部结点 #' + p.id, n: (function () { var g = hmap(); hNode(g, p.id, 'compare'); if (i < p.keys.length) { hKey(g, p.id, i, 'compare'); } return g; })() }));
          path.push(p);
          p = p.children[i];
        }
        if (p.keys.indexOf(x) >= 0) {
          push(steps, [4], pfx + '叶子 #' + p.id + ' 里已经有 ' + x + '，B+ 树不允许重复关键字，插入结束',
            sn({ title: T, sub: '重复关键字', n: (function () { var g = hmap(); hNode(g, p.id, 'compare'); hKey(g, p.id, p.keys.indexOf(x), 'active'); return g; })() }));
          return;
        }
        var pos = 0;
        while (pos < p.keys.length && p.keys[pos] < x) { pos++; }
        p.keys.splice(pos, 0, x);
        push(steps, [5], pfx + '到达叶子 #' + p.id + '，把 ' + x + ' 按序插到第 ' + (pos + 1) + ' 个位置 → [' + p.keys.join(' | ') + ']',
          sn({ title: T, sub: '写入叶子 #' + p.id, n: (function () { var g = hmap(); hNode(g, p.id, 'swap'); hKey(g, p.id, pos, 'swap'); return g; })() }));

        var cur = p, splitOnce = false;
        while (cur.keys.length > maxK) {
          var parent = path.length ? path.pop() : null;
          var hOv = hmap();
          hNode(hOv, cur.id, 'swap');
          for (var q = 0; q < cur.keys.length; q++) { hKey(hOv, cur.id, q, 'swap'); }
          if (cur.leaf) {
            push(steps, [7], pfx + '叶子 #' + cur.id + ' 有 ' + cur.keys.length + ' 个关键字，超过上限 m-1 = ' + maxK +
              '，发生上溢：叶子必须分裂（而且要维护叶子链表）',
              sn({ title: T, sub: '叶子 #' + cur.id + ' 上溢', n: hOv }));
          } else {
            push(steps, [7], pfx + '内部结点 #' + cur.id + ' 也有 ' + cur.keys.length + ' 个关键字，超过了上限 m-1 = ' + maxK +
              '：内部结点同样要分裂',
              sn({ title: T, sub: '内部结点 #' + cur.id + ' 上溢', n: hOv }));
          }
          var mid = Math.floor(m / 2);
          if (cur.leaf) {
            var lk = cur.keys.slice(0, mid);
            var rk = cur.keys.slice(mid);
            var upKey = rk[0];
            var right = mkNode(rk, [], true);
            var oldNext = cur.next;
            cur.keys = lk;
            cur.next = right.id;
            right.next = oldNext;
            push(steps, [7, 8], '取 mid = ' + mid + '：左半 [' + lk.join(', ') + '] 留在 #' + cur.id + '，右半 [' + rk.join(', ') +
              '] 放进新建的叶子 #' + right.id + '，并把叶子链表接好（#' + cur.id + '.next = #' + right.id +
              (oldNext ? '，#' + right.id + '.next = #' + oldNext : '，' + right.id + ' 成为链尾') + '）',
              sn({ title: T, sub: '叶子分裂完成', n: (function () { var g = hmap(); hNode(g, cur.id, 'done'); hNode(g, right.id, 'done'); return g; })() }));
            push(steps, [7, 8], '把新叶子的第一个关键字 ' + upKey + ' 「复制」一份上提到父结点作为索引——' +
              '注意它与 B 树不同：' + upKey + ' 并不会从叶子里消失，叶子仍然完整地保存着所有数据',
              sn({ title: T, sub: '复制 ' + upKey + ' 上提', n: (function () { var g = hmap(); hNode(g, right.id, 'path'); hKey(g, right.id, 0, 'swap'); return g; })() }));
            insertIntoParent(parent, cur, upKey, right, T, pfx, true);
            cur = parent;
            splitOnce = true;
            if (!parent) { break; }
          } else {
            var upKey2 = cur.keys[mid];
            var lk2 = cur.keys.slice(0, mid);
            var rk2 = cur.keys.slice(mid + 1);
            var lch = cur.children.slice(0, mid + 1);
            var rch = cur.children.slice(mid + 1);
            var right2 = mkNode(rk2, rch, false);
            cur.keys = lk2; cur.children = lch;
            push(steps, [7], '取 mid = ' + mid + '：把下标 ' + mid + ' 的索引关键字 ' + upKey2 + ' 「移动」到父结点（自己不再保留），' +
              '左半 [' + lk2.join(', ') + '] 留在 #' + cur.id + '，右半 [' + rk2.join(', ') + '] 连同后一半孩子放进新结点 #' + right2.id,
              sn({ title: T, sub: '内部结点分裂', n: (function () { var g = hmap(); hNode(g, cur.id, 'done'); hNode(g, right2.id, 'done'); return g; })() }));
            insertIntoParent(parent, cur, upKey2, right2, T, pfx, false);
            cur = parent;
            splitOnce = true;
            if (!parent) { break; }
          }
        }
        push(steps, [10], pfx + '插入 ' + x + ' 完成' + (splitOnce ? '（过程中发生了分裂，注意它总是自底向上、逐层把索引上提）' : '（没有结点上溢）'),
          sn({ title: T, sub: '插入完成' }));
      }

      /* ---------------- 查找 ---------------- */
      function fnd(x) {
        var T = '查找 ' + x + '（m = ' + m + '）';
        if (!tr.root || !tr.root.keys.length) {
          push(steps, [12], '树为空，查找失败', sn({ title: T, sub: '空树' }));
          return;
        }
        push(steps, [12, 13, 14], '开始查找 ' + x + '：B+ 树的内部结点只是路标，真正的判断一定发生在叶子层，' +
          '所以查找必须先沿索引一路下降到某个叶子，再到叶子里比较（这一点与 B 树不同）',
          sn({ title: T, sub: '从根开始导航到叶子', n: (function () { var g = hmap(); hNode(g, tr.root.id, 'compare'); return g; })() }));
        var p = tr.root, lv = 0;
        while (!p.leaf) {
          var i = 0;
          while (i < p.keys.length && x >= p.keys[i]) { i++; }
          push(steps, [13, 14], '在内部结点 #' + p.id + '（第 ' + (lv + 1) + ' 层）里导航：索引关键字 [' + p.keys.join(' | ') +
            ']，' + (i < p.keys.length ? x + ' < ' + p.keys[i] + '，走第 ' + (i + 1) + ' 个孩子' : x + ' ≥ 全部索引，走最右孩子'),
            sn({ title: T, sub: '内部结点 #' + p.id, n: (function () { var g = hmap(); hNode(g, p.id, 'compare'); return g; })() }));
          p = p.children[i];
          lv++;
        }
        var idx = p.keys.indexOf(x);
        if (idx >= 0) {
          push(steps, [17], '走到叶子 #' + p.id + '：B+ 树的查找一定要到达叶子层。叶子里有 ' + x +
            '（第 ' + (idx + 1) + ' 个位置），查找成功（共经过 ' + (lv + 1) + ' 层）',
            sn({ title: T, sub: '查找成功（在叶子 #' + p.id + '）', n: (function () { var g = hmap(); hNode(g, p.id, 'active'); hKey(g, p.id, idx, 'active'); return g; })() }));
        } else {
          push(steps, [18], '走到叶子 #' + p.id + '：叶子里的关键字 [' + p.keys.join(' | ') + '] 中没有 ' + x + '，查找失败',
            sn({ title: T, sub: '查找失败', n: (function () { var g = hmap(); hNode(g, p.id, 'dead'); return g; })() }));
        }
      }

      /* ---------------- 范围查询 ---------------- */
      function range(lo, hi) {
        var T = '范围查询 [' + lo + ', ' + hi + ']（m = ' + m + '）';
        if (!tr.root || !tr.root.keys.length) {
          push(steps, [20], '树为空，范围查询没有结果', sn({ title: T, sub: '空树' }));
          return;
        }
        if (lo > hi) { var tmp = lo; lo = hi; hi = tmp; }
        push(steps, [20], 'B+ 树做范围查询非常有优势：先用普通查找走到 lo = ' + lo +
          ' 应该落入的叶子，之后就不需要再回根，沿叶子链表一路向右扫到超过 hi = ' + hi + ' 为止',
          sn({ title: T, sub: '定位起点叶子', n: (function () { var g = hmap(); hNode(g, tr.root.id, 'compare'); return g; })() }));
        var path = [];
        var p = tr.root;
        while (!p.leaf) {
          var i = 0;
          while (i < p.keys.length && lo >= p.keys[i]) { i++; }
          push(steps, [21], '在内部结点 #' + p.id + ' 里导航：' + (i < p.keys.length ? lo + ' < ' + p.keys[i] + '，走第 ' + (i + 1) + ' 个孩子' : lo + ' ≥ 全部索引，走最右孩子'),
            sn({ title: T, sub: '导航 #' + p.id, n: (function () { var g = hmap(); hNode(g, p.id, 'compare'); return g; })() }));
          path.push(p);
          p = p.children[i];
        }
        var byId = {}, leaves = leafList();
        for (var z = 0; z < leaves.length; z++) { byId[leaves[z].id] = leaves[z]; }
        var res = [], cur = p, guard = 0;
        while (cur && guard < 40) {
          guard++;
          var hl = hmap(), any = false, stop = false, rk = [];
          for (var j = 0; j < cur.keys.length; j++) {
            var v = cur.keys[j];
            if (v >= lo && v <= hi) { hKey(hl, cur.id, j, 'active'); res.push(v); rk.push(v); any = true; }
            else if (v > hi) { stop = true; }
            else { hKey(hl, cur.id, j, 'compare'); }
          }
          hNode(hl, cur.id, any ? 'path' : 'compare');
          var nextNode = cur.next ? byId[cur.next] : null;
          push(steps, [23], '扫描叶子 #' + cur.id + '：关键字 [' + cur.keys.join(' | ') + ']' +
            (rk.length ? ' → 命中 ' + rk.join(', ') : ' → 本次没有命中的关键字') +
            (stop ? '，其中已有关键字 > ' + hi + '，扫描可以在这里结束' : (nextNode ? '，继续沿 next 指针走到右兄弟 #' + nextNode.id : '，已经是链尾')),
            sn({ title: T, sub: '已收集 ' + res.length + ' 个：' + (res.join(', ') || '（空）'), n: hl }));
          if (stop || !nextNode) { break; }
          cur = nextNode;
        }
        push(steps, [25], '范围查询完成：[' + lo + ', ' + hi + '] 内的关键字共 ' + res.length + ' 个 → ' + (res.join(', ') || '（无）'),
          sn({ title: T, sub: '查询完成：' + (res.join(', ') || '（无）'), n: (function () { var g = hmap(); return g; })() }));
      }

      /* ---------------- 删除 ---------------- */
      function del(x) {
        var T = '删除 ' + x + '（m = ' + m + '，叶子至少 ' + minK + ' 个关键字）';
        if (!tr.root || !tr.root.keys.length) {
          push(steps, [27], '树为空，无法删除', sn({ title: T, sub: '空树' }));
          return;
        }
        push(steps, [27, 28], '开始删除 ' + x + '：B+ 树的数据只存在叶子里，所以一定要先走到叶子再删；' +
          '删完若叶子太「空」（下溢）就向兄弟借，借不到就合并，并同步刷新父结点里那份「拷贝索引」',
          sn({ title: T, sub: '沿索引下降到叶子', n: (function () { var g = hmap(); hNode(g, tr.root.id, 'compare'); return g; })() }));
        var anc = [];   // 祖先内部结点栈
        var p = tr.root;
        while (!p.leaf) {
          var i = 0;
          while (i < p.keys.length && x >= p.keys[i]) { i++; }
          push(steps, [28], '沿索引导航：在内部结点 #' + p.id + ' 里，' + (i < p.keys.length ? x + ' < ' + p.keys[i] + '，走第 ' + (i + 1) + ' 个孩子' : '走最右孩子'),
            sn({ title: T, sub: '导航 #' + p.id, n: (function () { var g = hmap(); hNode(g, p.id, 'compare'); return g; })() }));
          anc.push(p);
          p = p.children[i];
        }
        var idx = p.keys.indexOf(x);
        if (idx < 0) {
          push(steps, [28], '走到叶子 #' + p.id + '，其中没有 ' + x + '，删除失败',
            sn({ title: T, sub: '未找到，删除失败', n: (function () { var g = hmap(); hNode(g, p.id, 'dead'); return g; })() }));
          return;
        }
        p.keys.splice(idx, 1);
        anc.push(p);
        var chain = anc.slice();
        push(steps, [28], '在叶子 #' + p.id + ' 里找到 ' + x + '，把它删掉 → [' + p.keys.join(' | ') + ']',
          sn({ title: T, sub: '删除叶子中的 ' + x, n: (function () { var g = hmap(); hNode(g, p.id, 'swap'); return g; })() }));
        if (p.keys.length) {
          // 若删掉的是叶子的最小关键字，父结点里那个「复印件」索引必须同步更新（B+ 树的索引是叶子的拷贝）
          if (anc.length > 1) {
            refreshSep(chain);
            var pFix = anc[anc.length - 2];
            push(steps, [28], '同步父结点的索引关键字：父亲里的分界关键字只是叶子最小值的拷贝，删除后要保持它们一致',
              sn({ title: T, sub: '更新索引', n: (function () { var g = hmap(); hNode(g, p.id, 'compare'); hNode(g, pFix.id, 'swap'); hKey(g, pFix.id, Math.max(0, pFix.children.indexOf(p) - 1), 'swap'); return g; })() }));
          }
        }

        var merged = false;
        while (anc.length > 1) {
          var cur = anc[anc.length - 1];
          anc.pop();
          var parent = anc[anc.length - 1];
          if (cur.keys.length >= minK) { break; }
          var ci = parent.children.indexOf(cur);
          if (ci < 0) { break; }
          push(steps, [29], '结点 #' + cur.id + ' 只剩 ' + cur.keys.length + ' 个关键字，低于下限 ' + minK +
            '：先向兄弟借，借不到就与兄弟合并（并删掉父结点里对应的那个索引关键字）',
            sn({ title: T, sub: '#' + cur.id + ' 下溢', n: (function () { var g = hmap(); hNode(g, cur.id, 'swap'); hNode(g, parent.id, 'compare'); return g; })() }));
          var ls = ci > 0 ? parent.children[ci - 1] : null;
          var rs = ci + 1 < parent.children.length ? parent.children[ci + 1] : null;
          var borrowed = false;
          if (cur.leaf) {
            if (ls && ls.keys.length > minK) {
              var mvL = ls.keys.pop();
              cur.keys.unshift(mvL);
              parent.keys[ci - 1] = cur.keys[0];
              push(steps, [30], '左兄弟 #' + ls.id + ' 有富余：把它的最大关键字 ' + mvL + ' 借过来放到 #' + cur.id +
                ' 的开头，并把父结点里的分界索引改成新的最小值 ' + cur.keys[0] + '（父索引只是叶子的「复印件」，必须同步）',
                sn({ title: T, sub: '向左兄弟借 ' + mvL, n: (function () { var g = hmap(); hNode(g, cur.id, 'active'); hKey(g, cur.id, 0, 'swap'); return g; })() }));
              borrowed = true;
            } else if (rs && rs.keys.length > minK) {
              var mvR = rs.keys.shift();
              cur.keys.push(mvR);
              parent.keys[ci] = rs.keys[0];
              push(steps, [30], '右兄弟 #' + rs.id + ' 有富余：把它的最小关键字 ' + mvR + ' 借过来追加到 #' + cur.id +
                ' 末尾，并把父结点里的分界索引改成右兄弟新的最小值 ' + rs.keys[0],
                sn({ title: T, sub: '向右兄弟借 ' + mvR, n: (function () { var g = hmap(); hNode(g, cur.id, 'active'); hKey(g, cur.id, cur.keys.length - 1, 'swap'); return g; })() }));
              borrowed = true;
            } else if (ls) {
              ls.keys = ls.keys.concat(cur.keys);
              ls.next = cur.next;
              parent.keys.splice(ci - 1, 1);
              parent.children.splice(ci, 1);
              push(steps, [31], '两个兄弟都没有富余：把 #' + cur.id + ' 合并进左兄弟 #' + ls.id + ' → [' + ls.keys.join(' | ') +
                ']，同时删掉父结点中夹在中间的那个索引关键字（它是拷贝，不需要下移到叶子）',
                sn({ title: T, sub: '与左兄弟合并', n: (function () { var g = hmap(); hNode(g, ls.id, 'swap'); hNode(g, parent.id, 'compare'); return g; })() }));
              merged = true;
            } else if (rs) {
              cur.keys = cur.keys.concat(rs.keys);
              cur.next = rs.next;
              parent.keys.splice(ci, 1);
              parent.children.splice(ci + 1, 1);
              push(steps, [31], '没有左兄弟，右兄弟也没有富余：把右兄弟 #' + rs.id + ' 并进 #' + cur.id + ' → [' + cur.keys.join(' | ') +
                ']，并删掉父结点里对应的索引关键字',
                sn({ title: T, sub: '与右兄弟合并', n: (function () { var g = hmap(); hNode(g, cur.id, 'swap'); hNode(g, parent.id, 'compare'); return g; })() }));
              merged = true;
            } else { break; }
          } else {
            // 内部结点：借位 / 合并的规则与普通 B 树相同（关键字经父结点旋转）
            if (ls && ls.keys.length > minK) {
              // 经父结点旋转：把左兄弟的最后一个孩子搬给 cur，分界关键字同步刷新
              var oldFront = minKeyOf(cur.children[0]);
              var movedL = ls.children.pop();
              var mvIL = ls.keys.pop();
              var sepL = parent.keys[ci - 1];
              cur.keys.unshift(oldFront);
              cur.children.unshift(movedL);
              parent.keys[ci - 1] = minKeyOf(movedL);
              push(steps, [30], '左兄弟 #' + ls.id + ' 有富余：经父结点旋转——分界关键字 ' + sepL +
                ' 旋下来插到 #' + cur.id + ' 的开头，左兄弟的最大关键字 ' + mvIL +
                ' 旋上去补位（分界关键字始终取孩子子树里真实的最小值），并把对应的孩子指针一起搬过来',
                sn({
                  title: T, sub: '向左兄弟借 ' + mvIL,
                  n: (function () { var g = hmap(); hNode(g, cur.id, 'active'); hNode(g, parent.id, 'compare'); return g; })()
                }));
              borrowed = true;
            } else if (rs && rs.keys.length > minK) {
              // 把右兄弟的第一个孩子搬给 cur，两个分界关键字都要按真实最小值刷新
              var movedR = rs.children.shift();
              var sepR = parent.keys[ci];
              var mvIR = rs.keys.shift();
              cur.keys.push(minKeyOf(movedR));
              parent.keys[ci] = minKeyOf(rs);
              cur.children.push(movedR);
              push(steps, [30], '右兄弟 #' + rs.id + ' 有富余：它的第一个孩子连同分界关键字 ' + sepR +
                ' 一起旋转过来（' + mvIR + ' 旋上去接替分界关键字），并让分界关键字保持为子树的最小值',
                sn({
                  title: T, sub: '向右兄弟借 ' + mvIR,
                  n: (function () { var g = hmap(); hNode(g, cur.id, 'active'); hNode(g, parent.id, 'compare'); return g; })()
                }));
              borrowed = true;
            } else if (ls) {
              // B+ 树内部结点合并：中间的「分界关键字」取右半子树里真实的最小值（父结点里的那份可能已失效）
              var pkL = minKeyOf(cur.children[0]);
              ls.keys = ls.keys.concat([pkL], cur.keys);
              ls.children = ls.children.concat(cur.children);
              parent.keys.splice(ci - 1, 1);
              parent.children.splice(ci, 1);
              push(steps, [31], '兄弟都借不出来：内部结点 #' + cur.id + ' 与左兄弟 #' + ls.id +
                ' 合并，把两个结点夹在中间的索引关键字 ' + pkL + ' 一起合进来 → [' + ls.keys.join(' | ') + ']',
                sn({
                  title: T, sub: '与左兄弟合并',
                  n: (function () { var g = hmap(); hNode(g, ls.id, 'swap'); hNode(g, parent.id, 'compare'); return g; })()
                }));
              merged = true;
            } else if (rs) {
              var pkR = minKeyOf(rs.children[0]);
              cur.keys = cur.keys.concat([pkR], rs.keys);
              cur.children = cur.children.concat(rs.children);
              parent.keys.splice(ci, 1);
              parent.children.splice(ci + 1, 1);
              push(steps, [31], '没有左兄弟，右兄弟也没有富余：内部结点 #' + cur.id + ' 与右兄弟 #' + rs.id +
                ' 合并，夹在中间的索引关键字 ' + pkR + ' 一起合进来 → [' + cur.keys.join(' | ') + ']',
                sn({
                  title: T, sub: '与右兄弟合并',
                  n: (function () { var g = hmap(); hNode(g, cur.id, 'swap'); hNode(g, parent.id, 'compare'); return g; })()
                }));
              merged = true;
            } else { break; }
          }
          if (borrowed) { break; }
        }
        if (tr.root && !tr.root.leaf && tr.root.keys.length === 0) {
          tr.root = tr.root.children[0];
          push(steps, [33], '根结点被耗尽：把唯一的孩子 #' + tr.root.id + ' 提升为新根，树高 -1',
            sn({ title: T, sub: '降低树高', n: (function () { var g = hmap(); hNode(g, tr.root.id, 'active'); return g; })() }));
        }
        refreshSep(chain);
        push(steps, [33], '删除 ' + x + ' 完成' + (merged ? '（过程中合并了结点）' : ''),
          sn({ title: T, sub: '删除完成' }));
      }

      var act = (a && a.key) || 'build';
      if (act === 'build') {
        var ks = DSV.nums(v.init, 10);
        if (!ks.length) {
          return { steps: [msgStep('初始序列为空，请输入逗号分隔的整数序列（例如 1,2,3,4,5,6,7）来建树。')], state: tr };
        }
        tr = { __kind: 'bplustree', m: m, root: null, cnt: 1 };
        push(steps, [0, 1], '开始按序列 [' + ks.join(', ') + '] 逐个插入建 B+ 树：阶数 m = ' + m +
          '（叶子最多 ' + maxK + ' 个关键字；叶子分裂时把中间关键字「复制」上提到父结点做索引）',
          sn({ title: '建树：m = ' + m + '，序列 ' + ks.join(', '), sub: '准备插入第 1 个关键字', root: null }));
        for (var t = 0; t < ks.length; t++) { ins(ks[t], '建树第 ' + (t + 1) + '/' + ks.length + ' 步 · '); }
        push(steps, [0], '建树完成！数据全部落在同一层的叶子上，叶子之间有链表相连，可以直接做范围查询',
          sn({ title: '建树完成（m = ' + m + '）', sub: '可以继续插入 / 查找 / 删除 / 范围查询' }));
      } else {
        var x0 = null, y0 = null;
        if (act === 'range') {
          var rg = DSV.nums(a && a.arg, 2);
          if (!rg.length) {
            return { steps: [msgStep('范围查询请填写「起始,结束」两个整数，例如 4,9。')], state: tr };
          }
          x0 = rg[0]; y0 = rg.length > 1 ? rg[1] : rg[0];
          range(x0, y0);
        } else {
          x0 = firstNum(a && a.arg);
          if (x0 === null) {
            return { steps: [msgStep('请在操作按钮右侧的输入框里填写一个整数关键字。')], state: tr };
          }
          if (act === 'insert') { ins(x0, ''); }
          else if (act === 'find') { fnd(x0); }
          else { del(x0); }
        }
      }
      return { steps: steps, state: tr };
    },
    render: function (kr, s) { renderMultiway(kr, s); }
  });

})();
