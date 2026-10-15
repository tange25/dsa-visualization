/* ============================================================
   drag.js —— 画布节点自由拖拽
   功能：
     1. 树 / 图算法中的节点（g.nd）可用鼠标或触摸自由拖动；
     2. 节点上的文字、子标签随节点一起移动；
     3. 与该节点相连的边、边上的权值标签实时跟随；
     4. 拖拽位置按算法分组记忆：切换步骤 / 播放动画后布局保持，
        切换到其他算法自动隔离，切回来恢复。
   实现：不改动各算法的渲染函数；渲染结束后由 apply() 把用户
        覆盖位置写回节点 transform，再按几何关系重算边端点。
   ============================================================ */
(function () {
  'use strict';

  var DSV = window.DSV = window.DSV || {};
  var svg = document.getElementById('stage');

  // 当前算法 id；位置覆盖按算法分组存储，互不干扰
  var algoId = null;
  // overrides = { [algoId]: { [nodeKey]: {x, y} } }
  var overrides = {};

  // 边 -> 两端节点 的稳定映射（拖拽前 / 渲染后重建）：
  // [{ key, a, b, isTree, hasArrow }]
  var edgeLinks = [];

  var DRAG_R = 25;        // 图边从圆心起算的收缩距离（与 viz-graph.js 中 R+2 对齐）
  var ARROW_R = 34;       // 有向图箭头端收缩距离（R+9）
  var MATCH_TOL = 48;     // 边端点匹配节点圆心的容差（px，viewBox 坐标）

  /* ---------------- 工具 ---------------- */

  /** 把事件坐标转为 SVG viewBox 坐标 */
  function toSVG(evt) {
    var src = evt.touches && evt.touches.length ? evt.touches[0] : evt;
    var pt = svg.createSVGPoint();
    pt.x = src.clientX; pt.y = src.clientY;
    var ctm = svg.getScreenCTM();
    if (!ctm) { return { x: 0, y: 0 }; }
    var p = pt.matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  }

  /** 解析 g 元素的 translate(x,y) */
  function readPos(el) {
    var t = el.getAttribute('transform') || '';
    var m = /translate\(\s*([-\d.]+)[ ,]\s*([-\d.]+)\s*\)/.exec(t);
    if (m) { return { x: parseFloat(m[1]), y: parseFloat(m[2]) }; }
    return { x: 0, y: 0 };
  }

  function vw() { return svg.viewBox.baseVal.width || 1000; }
  function vh() { return svg.viewBox.baseVal.height || 520; }

  /** 收集画布上所有节点当前位置：key -> {el, x, y} */
  function collectNodePos() {
    var out = {};
    var els = svg.querySelectorAll('g.nd[data-k]');
    for (var i = 0; i < els.length; i++) {
      var key = els[i].getAttribute('data-k');
      var p = readPos(els[i]);
      out[key] = { el: els[i], x: p.x, y: p.y };
    }
    return out;
  }

  function nearestNode(x, y, nodePos) {
    var best = null, bestD = MATCH_TOL * MATCH_TOL;
    for (var k in nodePos) {
      if (!Object.prototype.hasOwnProperty.call(nodePos, k)) { continue; }
      var n = nodePos[k];
      var dx = n.x - x, dy = n.y - y;
      var d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; best = k; }
    }
    return best;
  }

  /**
   * 收集所有「包着 line 的 data-k 元素」。
   * 注意：边由 kr.html('e0', '<line .../>') 生成，data-k 在外层 g 上，
   * line 本身没有 data-k，必须先取外层 g 再找内部 line。
   */
  function collectEdgeEls() {
    var out = [];
    var els = svg.querySelectorAll('[data-k]');
    for (var i = 0; i < els.length; i++) {
      var ln = els[i].querySelector('line');
      if (ln) {
        out.push({ g: els[i], line: ln, key: els[i].getAttribute('data-k') });
      }
    }
    return out;
  }

  /**
   * 用「边端点坐标 ↔ 节点圆心」的几何关系，建立稳定的边连接映射。
   * 必须在节点位置与边端点一致时调用（渲染刚结束 / 拖拽刚按下时）。
   */
  function buildEdgeLinks(nodePos) {
    edgeLinks = [];
    var edges = collectEdgeEls();
    for (var i = 0; i < edges.length; i++) {
      var ln = edges[i].line;
      var key = edges[i].key;
      var x1 = parseFloat(ln.getAttribute('x1')) || 0;
      var y1 = parseFloat(ln.getAttribute('y1')) || 0;
      var x2 = parseFloat(ln.getAttribute('x2')) || 0;
      var y2 = parseFloat(ln.getAttribute('y2')) || 0;
      var a = nearestNode(x1, y1, nodePos);
      var b = nearestNode(x2, y2, nodePos);
      if (!a || !b || a === b) { continue; }
      edgeLinks.push({
        key: key,
        line: ln,
        a: a, b: b,
        isTree: /^e_/.test(key),
        hasArrow: ln.hasAttribute('marker-end')
      });
    }
  }

  /** 根据 edgeLinks 与节点当前位置，重算所有边端点与边权标签 */
  function relayoutEdges(nodePos) {
    var i;
    for (i = 0; i < edgeLinks.length; i++) {
      var L = edgeLinks[i];
      var na = nodePos[L.a], nb = nodePos[L.b];
      if (!na || !nb) { continue; }
      var ax = na.x, ay = na.y, bx = nb.x, by = nb.y;
      var dx = bx - ax, dy = by - ay;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 1) { continue; }
      var ux = dx / dist, uy = dy / dist;

      var nx1, ny1, nx2, ny2;
      if (L.isTree) {
        nx1 = ax; ny1 = ay; nx2 = bx; ny2 = by;
      } else {
        nx1 = ax + ux * DRAG_R; ny1 = ay + uy * DRAG_R;
        nx2 = bx - ux * (L.hasArrow ? ARROW_R : DRAG_R);
        ny2 = by - uy * (L.hasArrow ? ARROW_R : DRAG_R);
      }

      var line = L.line;
      line.setAttribute('x1', nx1); line.setAttribute('y1', ny1);
      line.setAttribute('x2', nx2); line.setAttribute('y2', ny2);

      // 边权标签：w<索引>（图算法）——按原布局公式重算位置，保留原权值文字
      var wi = /^e(\d+)$/.exec(L.key);
      if (wi) {
        var wKey = 'w' + wi[1];
        var wEl = svg.querySelector('[data-k="' + wKey + '"]');
        if (wEl) {
          var txtEl = wEl.querySelector('text');
          var weight = txtEl ? txtEl.textContent : '';
          var tail = DRAG_R, head = L.hasArrow ? ARROW_R : DRAG_R;
          var seg = Math.max(0, dist - tail - head);
          var mx = ax + ux * (tail + seg / 2);
          var my = ay + uy * (tail + seg / 2);
          var off = (seg >= 34) ? 0 : 31;   // R+6，与 drawGraph 一致
          var lx = mx - uy * off, ly = my + ux * off;
          wEl.innerHTML =
            '<rect class="cell" x="' + (lx - 14) + '" y="' + (ly - 11) +
            '" width="28" height="22" rx="3"/>' +
            '<text x="' + lx + '" y="' + ly + '" class="cell-txt" text-anchor="middle" dominant-baseline="middle">' +
            weight + '</text>';
        }
      }
    }
  }

  /* ---------------- 渲染后应用覆盖 ---------------- */

  /**
   * 每次算法 render() 结束后调用：
   *  1. 读节点默认位置，建立边连接映射（此时边端点还是默认位置，匹配准确）；
   *  2. 对被用户拖过的节点，把 transform 写回覆盖位置；
   *  3. 按最终位置重算所有边与边权标签。
   */
  function apply() {
    if (!svg) { return; }
    var ov = overrides[algoId] || {};

    // 1. 默认位置
    var nodePos = collectNodePos();

    // 2. 建立边映射（用默认位置，边端点此时与默认位置一致）
    buildEdgeLinks(nodePos);

    // 3. 应用覆盖位置
    var els = svg.querySelectorAll('g.nd[data-k]');
    for (var i = 0; i < els.length; i++) {
      var key = els[i].getAttribute('data-k');
      if (ov[key]) {
        els[i].setAttribute('transform', 'translate(' + ov[key].x + ',' + ov[key].y + ')');
        nodePos[key].x = ov[key].x;
        nodePos[key].y = ov[key].y;
      }
    }

    // 4. 重算边
    relayoutEdges(nodePos);
  }

  /* ---------------- 拖拽交互 ---------------- */

  var dragging = null;  // {key, el, dx, dy}

  function onDown(evt) {
    if (evt.button !== undefined && evt.button !== 0) { return; }
    var t = evt.target;
    var node = t && t.closest ? t.closest('g.nd[data-k]') : null;
    if (!node || !svg.contains(node)) { return; }

    evt.preventDefault();
    var key = node.getAttribute('data-k');
    var pos = readPos(node);

    // 拖拽开始时节点与边位置一致，先建立稳定映射
    var nodePos = collectNodePos();
    buildEdgeLinks(nodePos);

    var m = toSVG(evt);
    dragging = {
      key: key,
      el: node,
      dx: m.x - pos.x,
      dy: m.y - pos.y
    };
    svg.classList.add('dragging');
    // 提升层级：拖拽节点画在最上层
    if (node.parentNode) { node.parentNode.appendChild(node); }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onUp);
  }

  function onMove(evt) {
    if (!dragging) { return; }
    evt.preventDefault();
    var m = toSVG(evt);
    var x = m.x - dragging.dx;
    var y = m.y - dragging.dy;
    var pad = 28;
    x = Math.max(pad, Math.min(vw() - pad, x));
    y = Math.max(pad, Math.min(vh() - pad, y));

    dragging.el.setAttribute('transform', 'translate(' + x + ',' + y + ')');

    var ov = overrides[algoId] || (overrides[algoId] = {});
    ov[dragging.key] = { x: x, y: y };

    // 用当前 DOM 真实位置重算边
    var nodePos = collectNodePos();
    relayoutEdges(nodePos);
  }

  function onUp() {
    if (!dragging) { return; }
    dragging = null;
    svg.classList.remove('dragging');
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    document.removeEventListener('touchmove', onMove);
    document.removeEventListener('touchend', onUp);
  }

  /* ---------------- 对外 API ---------------- */
  DSV.drag = {
    /** 切换当前算法：之后的覆盖记录到新算法名下 */
    setAlgo: function (id) { algoId = id; edgeLinks = []; },
    /** 渲染结束后调用（app.js render 末尾） */
    apply: apply,
    /** 清空当前算法的拖拽布局覆盖 */
    reset: function () { if (algoId) { delete overrides[algoId]; } apply(); }
  };

  svg.addEventListener('mousedown', onDown);
  svg.addEventListener('touchstart', onDown, { passive: false });
})();
