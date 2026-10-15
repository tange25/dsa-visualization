/* ============================================================
   core.js —— 可视化引擎核心
   提供：算法注册表、SVG 关键渲染器（KRender，带过渡动画）、通用工具函数
   全局对象：window.DSV
   ============================================================ */
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var DSV = window.DSV = window.DSV || {};

  /* ---------------- 注册表 ---------------- */
  DSV.defs = {};        // id -> 算法定义
  DSV.order = [];       // 注册顺序
  DSV.categories = [];  // 章节顺序（首次出现时记录）

  /**
   * 注册一个可视化算法
   * def = {
   *   id, name, category, desc,
   *   code    : [伪代码行字符串, ...]   （前导空格表示缩进）
   *   inputs  : [{key,label,def,hint}]  自定义数据输入
   *   actions : [{key,label,arg:{key,label,def},primary:true}]  操作按钮
   *   samples : [{label, values:{key:value}}]                   典型示例
   *   random  : function() -> values                            随机数据
   *   viewBox : '0 0 1000 640'（可选，默认 0 0 1000 520）
   *   run     : function(values, action, state) -> steps  |  {steps, state}
   *   render  : function(kr, snap, ctx) -> void
   * }
   * step = { code:[行号,...], desc:'中文说明', snap:{任意状态} }
   */
  DSV.register = function (def) {
    if (DSV.defs[def.id]) { console.warn('[DSV] 重复注册 id：' + def.id); }
    DSV.defs[def.id] = def;
    DSV.order.push(def.id);
    if (DSV.categories.indexOf(def.category) < 0) { DSV.categories.push(def.category); }
    return def;
  };

  /* ---------------- 工具函数 ---------------- */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /** 解析 "1, 2, 3" / "1 2 3" / "1，2" 形式的数字数组 */
  function nums(s, max) {
    if (Array.isArray(s)) { s = s.join(','); }
    var out = [];
    String(s == null ? '' : s).split(/[\s,，;；、]+/).forEach(function (t) {
      if (!t) { return; }
      var v = Number(t);
      if (isFinite(v)) { out.push(v); }
    });
    return max ? out.slice(0, max) : out;
  }

  /** 解析为字符串数组 */
  function toks(s) {
    if (Array.isArray(s)) { return s.slice(); }
    return String(s == null ? '' : s).split(/[\s,，;；]+/).filter(function (t) { return t !== ''; });
  }

  function ri(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }

  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  function randArr(n, lo, hi) {
    var a = [];
    for (var i = 0; i < n; i++) { a.push(ri(lo == null ? 1 : lo, hi == null ? 99 : hi)); }
    return a;
  }

  /** 去重并保持顺序 */
  function uniq(a) {
    var seen = {}, out = [];
    a.forEach(function (x) { var k = String(x); if (!seen[k]) { seen[k] = 1; out.push(x); } });
    return out;
  }

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  DSV.esc = esc; DSV.nums = nums; DSV.toks = toks; DSV.ri = ri;
  DSV.shuffle = shuffle; DSV.randArr = randArr; DSV.uniq = uniq; DSV.clone = clone;

  /* ---------------- SVG 片段助手（返回字符串，用作 innerHTML） ---------------- */
  var S = DSV.svg = {};

  S.text = function (x, y, str, cls, extra) {
    return '<text x="' + x + '" y="' + y + '"' +
      (cls ? ' class="' + cls + '"' : '') +
      ' text-anchor="middle" dominant-baseline="middle"' +
      (extra || '') + '>' + esc(str) + '</text>';
  };
  /** 左对齐文本（不居中） */
  S.textL = function (x, y, str, cls, extra) {
    return '<text x="' + x + '" y="' + y + '"' +
      (cls ? ' class="' + cls + '"' : '') +
      ' text-anchor="start" dominant-baseline="middle"' +
      (extra || '') + '>' + esc(str) + '</text>';
  };
  S.rect = function (x, y, w, h, cls, extra) {
    return '<rect x="' + x + '" y="' + y + '" width="' + Math.max(0, w) + '" height="' + Math.max(0, h) + '"' +
      (cls ? ' class="' + cls + '"' : '') + ' rx="4"' + (extra || '') + '/>';
  };
  S.circle = function (cx, cy, r, cls, extra) {
    return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '"' +
      (cls ? ' class="' + cls + '"' : '') + (extra || '') + '/>';
  };
  S.ellipse = function (cx, cy, rx, ry, cls, extra) {
    return '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '"' +
      (cls ? ' class="' + cls + '"' : '') + (extra || '') + '/>';
  };
  S.line = function (x1, y1, x2, y2, cls, extra) {
    return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '"' +
      (cls ? ' class="' + cls + '"' : '') + (extra || '') + '/>';
  };
  /** 折线 / 路径 */
  S.path = function (d, cls, extra) {
    return '<path d="' + d + '"' + (cls ? ' class="' + cls + '"' : '') +
      ' fill="none"' + (extra || '') + '/>';
  };
  /** 实心多边形 */
  S.poly = function (pts, cls, extra) {
    return '<polygon points="' + pts + '"' + (cls ? ' class="' + cls + '"' : '') + (extra || '') + '/>';
  };
  /** 箭头标记 defs（只需要在画布中加入一次即可使用 marker-end="url(#arrow)"） */
  S.arrowDefs = function () {
    return '<defs>' +
      '<marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">' +
      '<path d="M 0 0 L 10 5 L 0 10 z" fill="#7f9c8a"/></marker>' +
      '<marker id="arrowHl" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">' +
      '<path d="M 0 0 L 10 5 L 0 10 z" fill="#e6ad10"/></marker>' +
      '</defs>';
  };

  /** 一个带文字的节点（居中于 0,0，配合外层 g 的 translate 使用） */
  S.box = function (w, h, label, cls, sub) {
    var s = '<g class="nd ' + (cls || '') + '">' +
      S.rect(-w / 2, -h / 2, w, h) +
      S.text(0, sub ? -4 : 0, label, '', '') +
      (sub ? S.text(0, 11, sub, 'nd-label') : '') +
      '</g>';
    return s;
  };
  S.circ = function (r, label, cls, sub) {
    return '<g class="nd ' + (cls || '') + '">' +
      S.circle(0, 0, r) +
      S.text(0, sub ? -4 : 0, label, '') +
      (sub ? S.text(0, 12, sub, 'nd-label') : '') +
      '</g>';
  };

  /* ---------------- 关键渲染器 KRender ----------------
     用法：
        var kr = new DSV.KRender(svgEl);
        var g = kr.el('n1','g',{class:'k nd', transform:'translate(100,50)'});
        kr.html(g, '<circle .../>');           // 直接写内容
        kr.end();                              // 清理消失的元素
     下次渲染时，同 key 的元素会被复用并更新 transform，从而产生 CSS 过渡动画。
  ------------------------------------------------------ */
  var TICK = 0;

  function KRender(svg) {
    this.svg = svg;
    this.tick = ++TICK;
  }

  /** 取得（或创建）一个带 key 的元素；tag/attrs/inner 变化会同步 */
  KRender.prototype.el = function (key, tag, attrs, inner, parent) {
    var p = parent || this.svg;
    if (!p.__k) { p.__k = {}; }
    var e = p.__k[key];
    // 复用条件：tag 一致 且 节点仍挂在文档上。若 end() 曾把它从 DOM 摘掉而 __k 残留引用，
    // 必须重建，否则会拿到一个 detached 节点，更新 innerHTML 却永远不显示。
    if (e && (e.tagName !== tag || !e.isConnected)) {
      if (e.parentNode) { e.parentNode.removeChild(e); }
      delete p.__k[key]; e = null;
    }
    if (!e) {
      e = document.createElementNS(NS, tag);
      e.setAttribute('data-k', key);
      e.__k = {};
      p.appendChild(e);
      p.__k[key] = e;
      e.classList.add('enter');
      (function (el) { setTimeout(function () { el.classList.remove('enter'); }, 30); })(e);
    }
    if (attrs) {
      for (var k in attrs) {
        if (!Object.prototype.hasOwnProperty.call(attrs, k)) { continue; }
        var v = attrs[k];
        if (v === null || v === undefined) { continue; }
        v = String(v);
        if (e.getAttribute(k) !== v) { e.setAttribute(k, v); }
      }
    }
    var html = inner === null || inner === undefined ? '' : inner;
    if (e.__h !== html) { e.innerHTML = html; e.__h = html; }
    e.__v = this.tick;
    return e;
  };

  /** 便捷：创建一个 g 节点 */
  KRender.prototype.g = function (key, transform, cls, inner, parent) {
    return this.el(key, 'g', { class: cls ? cls + ' k' : 'k', transform: transform || 'translate(0,0)' }, inner, parent);
  };

  /** 直接设置某 key 元素的 innerHTML */
  KRender.prototype.html = function (key, inner, parent) {
    return this.el(key, 'g', null, inner, parent);
  };

  /** 清理本轮未使用的元素 */
  KRender.prototype.end = function () {
    var all = this.svg.querySelectorAll('[data-k]');
    var t = this.tick;
    for (var i = 0; i < all.length; i++) {
      var e = all[i];
      if (e.__v !== t) {
        // 必须先记下 parent 并清掉 parent.__k 里的引用，再 removeChild——
        // removeChild 后 e.parentNode 立即变 null，原写法会让 __k 永久残留旧引用。
        var p = e.parentNode;
        if (p) {
          if (p.__k) {
            for (var k in p.__k) { if (p.__k[k] === e) { delete p.__k[k]; } }
          }
          p.removeChild(e);
        }
      }
    }
  };

  /** 清空画布 */
  KRender.prototype.clear = function () {
    this.tick = ++TICK;
    this.end();
  };

  DSV.KRender = KRender;

  /* ---------------- 画布尺寸 ---------------- */
  DSV.VW = 1000;
  DSV.VH = 520;

  /* ---------------- 常用布局助手 ---------------- */

  /** 二叉树布局：返回 {x,y} 映射（按层级），data 为 {id, left, right} 结构
   *  采用「按子树宽度分配」的紧凑布局：
   *  - nodeSize：结点横向占位（直径 + 安全余量），默认 52，保证相邻结点互不重叠
   *  - gap：左右兄弟子树之间的最小间隙，默认 8
   *  - 单子结点不占间隙（其子树直接居中于父跨度，链式退化树呈竖直排列）
   *  - 当整棵树超过可用宽度时自动压缩间隙（间隙最小为 0，结点可紧贴但绝不重叠）
   */
  DSV.treeLayout = function (root, opt) {
    opt = opt || {};
    var W = opt.w || DSV.VW, top = (opt.top == null) ? 60 : opt.top;
    var dx = opt.dx || 46, dy = opt.dy || 76;
    var nodeSize = opt.nodeSize || 52, gap = (opt.gap == null) ? 8 : opt.gap;
    var minX = 40, maxX = W - 40, avail = Math.max(0, maxX - minX);
    var wsub = {}, dep = {}, depth = 0, leafCnt = 0, intCnt = 0;

    // 第一遍：后序计算每棵子树需要的宽度
    function measure(n, d) {
      if (!n) { return 0; }
      dep[n.id] = d;
      depth = Math.max(depth, d);
      if (!n.left && !n.right) { leafCnt++; wsub[n.id] = nodeSize; }
      else if (n.left && n.right) { intCnt++; wsub[n.id] = measure(n.left, d + 1) + gap + measure(n.right, d + 1); }
      else if (n.left) { wsub[n.id] = measure(n.left, d + 1); }
      else { wsub[n.id] = measure(n.right, d + 1); }
      return wsub[n.id];
    }
    var total = root ? measure(root, 0) : 0;

    // 树太宽时压缩兄弟间隙（≥0：结点可紧贴但互不重叠）
    var g2 = gap;
    if (total > avail && intCnt > 0) {
      g2 = Math.max(0, Math.min(gap, (avail - leafCnt * nodeSize) / intCnt));
      wsub = {}; leafCnt = 0; intCnt = 0;
      (function re(n) {
        if (!n) { return 0; }
        var wl = n.left ? re(n.left) : 0, wr = n.right ? re(n.right) : 0;
        if (!n.left && !n.right) { leafCnt++; wsub[n.id] = nodeSize; }
        else if (n.left && n.right) { intCnt++; wsub[n.id] = wl + g2 + wr; }
        else if (n.left) { wsub[n.id] = wl; }
        else { wsub[n.id] = wr; }
        return wsub[n.id];
      })(root);
      total = root ? wsub[root.id] : 0;
    }

    // 第二遍：分配 x——双子结点居两子树之间，单子结点与其子树同中心，叶子居跨度中心
    var pos = {};
    (function place(n, L, R) {
      if (!n) { return; }
      var d = dep[n.id], x;
      if (!n.left && !n.right) { x = (L + R) / 2; }
      else if (n.left && n.right) {
        x = L + wsub[n.left.id] + g2 / 2;
        place(n.left, L, x - g2 / 2);
        place(n.right, x + g2 / 2, R);
      } else if (n.left) {
        x = L + wsub[n.left.id] / 2;
        place(n.left, L, L + wsub[n.left.id]);
      } else {
        x = R - wsub[n.right.id] / 2;
        place(n.right, R - wsub[n.right.id], R);
      }
      pos[n.id] = { x: x, y: top + d * dy };
    })(root, (W - total) / 2, (W + total) / 2);

    return { pos: pos, depth: depth, width: total };
  };

  /** 数组布局：n 个元素，返回每个的 {x,y,w,h}；用于柱状图/格子 */
  DSV.barLayout = function (n, opt) {
    opt = opt || {};
    var W = DSV.VW, baseY = opt.baseY || 430, topY = opt.topY || 90;
    var maxW = opt.maxW || (W - 80);
    var w = Math.min(opt.cw || 54, (maxW - (n - 1) * 6) / Math.max(1, n));
    var gap = Math.min(6, Math.max(2, (maxW - w * n) / Math.max(1, n)));
    var total = w * n + gap * (n - 1);
    var x0 = (W - total) / 2;
    var arr = [];
    for (var i = 0; i < n; i++) {
      arr.push({ x: x0 + i * (w + gap), w: w, gap: gap, baseY: baseY, topY: topY, cx: x0 + i * (w + gap) + w / 2 });
    }
    return arr;
  };

  /**
   * 通用二叉树绘制
   * kr    : KRender
   * root  : {id, left, right, ...}（id 必须唯一）
   * opt   : {dx, dy, top, r, w, node(n,pos)->{inner, cls}, edge(parent,child)->class,
   *          edgeKeys(parent,child)->key 前缀, nullNode(n)->boolean}
   */
  DSV.drawTree = function (kr, root, opt) {
    opt = opt || {};
    var ge = kr.g('__edges', 'translate(0,0)', 'k');
    var gn = kr.g('__nodes', 'translate(0,0)', 'k');
    if (!root) { return {}; }
    var lay = DSV.treeLayout(root, {
      dx: opt.dx || 46, dy: opt.dy || 78, top: opt.top || 60, w: opt.w || DSV.VW,
      nodeSize: opt.nodeSize, gap: opt.gap
    });
    var pos = lay.pos;

    (function walk(n) {
      if (!n) { return; }
      var p = pos[n.id];
      if (!p) { return; }
      ['left', 'right'].forEach(function (side) {
        var c = n[side];
        if (!c || !pos[c.id]) { return; }
        var cp = pos[c.id];
        var ecls = opt.edge ? opt.edge(n, c, side) : 'edge tree';
        kr.html('e_' + n.id + '_' + side, S.line(p.x, p.y, cp.x, cp.y, 'edge ' + (ecls || 'tree')), ge);
      });
      walk(n.left); walk(n.right);
    })(root);

    (function walk2(n) {
      if (!n) { return; }
      var p = pos[n.id];
      if (p) {
        var d = opt.node ? opt.node(n, p) : { inner: S.text(0, 0, n.id, ''), cls: '' };
        kr.g('n_' + n.id, 'translate(' + p.x + ',' + p.y + ')', 'k nd ' + (d.cls || ''), d.inner, gn);
      }
      walk2(n.left); walk2(n.right);
    })(root);

    return lay;
  };

  /** 值显示（保留小数） */
  DSV.fmt = function (v) {
    if (v === Infinity) { return '∞'; }
    if (v === -Infinity) { return '-∞'; }
    if (typeof v === 'number' && Math.abs(v - Math.round(v)) > 1e-9) { return v.toFixed(2); }
    return String(v);
  };

})();
