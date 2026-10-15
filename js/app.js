/* ============================================================
   app.js —— 应用主控：导航、输入区、播放器、伪代码高亮
   ============================================================ */
(function () {
  'use strict';

  var DSV = window.DSV;
  var $ = function (id) { return document.getElementById(id); };

  var DELAYS = [1500, 1200, 950, 780, 620, 480, 370, 280, 200, 130];

  var App = {
    cur: null,          // 当前算法定义
    steps: [],
    idx: -1,
    playing: false,
    timer: null,
    speed: 5,
    state: null,        // 有状态算法的持久状态
    values: {}          // 当前输入值
  };

  /* ---------------- 导航 ---------------- */
  function buildNav(filter) {
    var nav = $('nav');
    nav.innerHTML = '';
    var f = (filter || '').trim().toLowerCase();
    var any = false;

    DSV.categories.forEach(function (cat) {
      var ids = DSV.order.filter(function (id) {
        var d = DSV.defs[id];
        return d.category === cat && match(d, f);
      });
      if (!ids.length) { return; }
      any = true;

      var sec = document.createElement('div');
      sec.className = 'nav-cat' + (cat !== App.curCat ? '' : '');

      var h = document.createElement('div');
      h.className = 'nav-cat-h';
      h.innerHTML = '<span>' + DSV.esc(cat) + '</span><span class="caret">▼</span>';
      h.onclick = function () { sec.classList.toggle('collapsed'); };
      sec.appendChild(h);

      var ul = document.createElement('div');
      ul.className = 'nav-items';
      ids.forEach(function (id) {
        var d = DSV.defs[id];
        var a = document.createElement('div');
        a.className = 'nav-item' + (App.cur && App.cur.id === id ? ' active' : '');
        a.textContent = d.name;
        a.title = d.desc || '';
        a.onclick = function () {
          location.hash = '#' + id;
          if (isMobile()) { closeDrawer(); }
        };
        ul.appendChild(a);
      });
      sec.appendChild(ul);
      nav.appendChild(sec);
    });

    if (!any) {
      nav.innerHTML = '<div class="nav-empty">没有匹配 “' + DSV.esc(filter) + '” 的算法。</div>';
    }
    if (f) {
      var secs = nav.querySelectorAll('.nav-cat');
      for (var i = 0; i < secs.length; i++) { secs[i].classList.remove('collapsed'); }
    }
  }

  function match(d, f) {
    if (!f) { return true; }
    return (d.name + ' ' + d.category + ' ' + (d.desc || '') + ' ' + d.id).toLowerCase().indexOf(f) >= 0;
  }

  /* ---------------- 载入算法 ---------------- */
  function load(id) {
    var d = DSV.defs[id];
    if (!d) { id = DSV.order[0]; d = DSV.defs[id]; }
    if (!d) { return; }

    stop();
    App.cur = d;
    App.curCat = d.category;
    App.steps = [];
    App.idx = -1;
    App.state = null;

    $('vizTitle').textContent = d.name;
    $('vizDesc').textContent = d.desc || '';
    $('stage').setAttribute('viewBox', d.viewBox || '0 0 1000 520');
    $('stageEmpty').style.display = 'none';
    $('inputSection').hidden = false;
    $('animSection').hidden = false;
    $('pseudoSub').textContent = d.category || '';

    buildPseudo(d.code || []);
    $('pseudoTitleText').textContent = '伪代码';
    buildInputs(d);
    buildNav($('navSearch').value);
    updateControls();

    // 有默认动作则自动跑一次，否则等待用户点击
    var acts = d.actions || [{ key: 'run', label: '开始演示', primary: true }];
    if (d.autoStart !== false) {
      runAction(acts[0].key, true);
    } else {
      render();
      setDesc('数据已就绪，点击操作按钮开始演示。');
    }
  }

  function buildPseudo(code) {
    var body = $('pseudoBody');
    if (!code.length) { body.innerHTML = '<div class="pseudo-empty">该算法没有提供伪代码。</div>'; return; }
    var html = '';
    for (var i = 0; i < code.length; i++) {
      html += '<div class="pc-line" data-line="' + i + '"><span class="pc-no">' + (i + 1) + '</span>' +
        '<span class="pc-txt">' + DSV.esc(code[i]) + '</span></div>';
    }
    body.innerHTML = html;
  }

  /** 当前面板上展示的代码原文（供复制）——即该算法的伪代码 */
  function currentCodeText() {
    var d = App.cur;
    if (!d) { return ''; }
    return (d.code || []).join('\n');
  }

  /** 老浏览器兜底复制：用临时 textarea + execCommand */
  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
  }

  function buildInputs(d) {
    var fields = $('fields');
    fields.innerHTML = '';
    App.values = {};
    (d.inputs || []).forEach(function (inp) {
      App.values[inp.key] = inp.def == null ? '' : inp.def;
      var wrap = document.createElement('div');
      wrap.className = 'field' + (ml ? ' field-ml' : '');
      var lab = document.createElement('label');
      lab.textContent = inp.label + '：';
      // 多行输入（如边表、邻接表）必须用 textarea，单行 input 会丢弃换行符
      var ml = inp.multiline === true ||
        (inp.def != null && String(inp.def).indexOf('\n') >= 0);
      var input;
      if (ml) {
        input = document.createElement('textarea');
        input.rows = 4;
        input.className = 'field-ta';
      } else {
        input = document.createElement('input');
        input.type = 'text';
      }
      input.value = App.values[inp.key];
      input.placeholder = inp.hint || '';
      input.setAttribute('data-key', inp.key);
      input.addEventListener('keydown', function (e) {
        if (ml) { if (e.ctrlKey && e.key === 'Enter') { applyData(); } }
        else if (e.key === 'Enter') { applyData(); }
      });
      wrap.appendChild(lab); wrap.appendChild(input);
      fields.appendChild(wrap);
    });
    if (!(d.inputs || []).length) {
      fields.innerHTML = '<span class="hint-row">该算法无需额外数据输入，直接使用下方操作按钮。</span>';
    }

    // 示例下拉
    var sel = $('sampleSel');
    sel.innerHTML = '<option value="">— 典型示例 —</option>';
    (d.samples || []).forEach(function (s, i) {
      var o = document.createElement('option');
      o.value = String(i);
      o.textContent = s.label;
      sel.appendChild(o);
    });
    sel.onchange = function () {
      var s = (d.samples || [])[Number(sel.value)];
      if (!s) { return; }
      setValues(s.values || {});
      sel.value = '';
    };
    $('btnRandom').onclick = function () {
      if (typeof d.random === 'function') { setValues(d.random() || {}); }
    };
    $('btnRandom').style.display = typeof d.random === 'function' ? '' : 'none';

    // 操作按钮
    var row = $('actionRow');
    row.innerHTML = '';
    var acts = d.actions || [{ key: 'run', label: '开始演示', primary: true }];
    acts.forEach(function (a) {
      var btn = document.createElement('button');
      btn.className = 'btn' + (a.primary ? ' primary' : '');
      btn.type = 'button';
      btn.textContent = a.label;
      btn.onclick = function () { runAction(a.key); };
      row.appendChild(btn);

      if (a.arg) {
        var f = document.createElement('div');
        f.className = 'field';
        var l2 = document.createElement('label');
        l2.textContent = a.arg.label + '：';
        var ip = document.createElement('input');
        ip.type = 'text';
        ip.value = a.arg.def == null ? '' : a.arg.def;
        ip.setAttribute('data-arg', a.key);
        ip.addEventListener('keydown', function (e) { if (e.key === 'Enter') { runAction(a.key); } });
        f.appendChild(l2); f.appendChild(ip);
        row.appendChild(f);
      }
    });
  }

  function setValues(vals) {
    var d = App.cur;
    (d.inputs || []).forEach(function (inp) {
      var el = document.querySelector('#fields [data-key="' + inp.key + '"]');
      var v = vals[inp.key];
      if (v === undefined) { v = inp.def == null ? '' : inp.def; }
      App.values[inp.key] = v;
      if (el) { el.value = v; }
    });
    rebuild();
  }

  function readValues() {
    var d = App.cur;
    var vals = {};
    (d.inputs || []).forEach(function (inp) {
      var el = document.querySelector('#fields [data-key="' + inp.key + '"]');
      vals[inp.key] = el ? el.value : (App.values[inp.key] || '');
    });
    App.values = vals;
    return vals;
  }

  function applyData() {
    readValues();
    rebuild();
  }

  /** 清空结构后按当前输入重建（走默认动作） */
  function rebuild() {
    stop();
    App.steps = [];
    App.idx = -1;
    App.state = null;
    var d = App.cur;
    var acts = d.actions || [{ key: 'run', label: '开始演示', primary: true }];
    if (d.autoStart !== false) {
      runAction(acts[0].key, true);
    } else {
      render();
      setDesc('数据已就绪，点击操作按钮开始演示。');
    }
  }

  /* ---------------- 运行一个操作，生成步骤 ---------------- */
  function runAction(key, quiet) {
    var d = App.cur;
    if (!d) { return; }
    stop();
    var vals = readValues();
    var action = { key: key };
    var argEl = document.querySelector('#actionRow input[data-arg="' + key + '"]');
    if (argEl) { action.arg = argEl.value.trim(); }

    var res;
    try {
      res = d.run(vals, action, App.state);
    } catch (err) {
      console.error(err);
      setDesc('执行出错：' + (err && err.message ? err.message : err));
      return;
    }

    var steps, state = App.state, startIdx = 0;
    if (Array.isArray(res)) {
      // 无状态算法：每次运行整体替换步骤
      steps = res; App.steps = [];
    } else if (res && Array.isArray(res.steps)) {
      // 有状态算法：把新步骤追加到已有步骤之后
      steps = res.steps;
      state = res.state === undefined ? App.state : res.state;
      startIdx = App.steps.length;
    } else { steps = []; }

    if (!steps.length) {
      setDesc('没有产生任何动画步骤（请检查输入数据）。');
      render();
      return;
    }
    App.steps = App.steps.concat(steps);
    App.state = state;
    App.idx = startIdx;
    updateControls();
    goto(App.idx);
    if (!quiet) { play(); }
  }

  /* ---------------- 播放器 ---------------- */
  function goto(i) {
    if (!App.steps.length) { render(); return; }
    App.idx = Math.max(0, Math.min(App.steps.length - 1, i));
    render();
    updateControls();
  }

  function next() {
    if (!App.steps.length) { return false; }
    if (App.idx >= App.steps.length - 1) { stop(); return false; }
    goto(App.idx + 1);
    return true;
  }

  function prev() { if (App.idx > 0) { goto(App.idx - 1); } }

  function play() {
    if (!App.steps.length) { return; }
    if (App.idx >= App.steps.length - 1) { goto(0); }
    App.playing = true;
    updateControls();
    tick();
  }

  function tick() {
    clearTimeout(App.timer);
    if (!App.playing) { return; }
    App.timer = setTimeout(function () {
      if (!App.playing) { return; }
      if (!next()) { stop(); return; }
      tick();
    }, DELAYS[App.speed - 1]);
  }

  function stop() {
    App.playing = false;
    clearTimeout(App.timer);
    updateControls();
  }

  function reset() {
    stop();
    App.idx = 0;
    render();
    updateControls();
  }

  /* ---------------- 渲染 ---------------- */
  function render() {
    var d = App.cur;
    var svg = $('stage');
    if (!d) { return; }
    var kr = new DSV.KRender(svg);
    var step = App.steps[App.idx];
    var snap = step ? step.snap : null;

    // 伪代码高亮（仅伪代码视图）
    var lines = document.querySelectorAll('.pc-line');
    var hl = (step && step.code) ? step.code : [];
    for (var i = 0; i < lines.length; i++) {
      var n = Number(lines[i].getAttribute('data-line'));
      var on = hl.indexOf(n) >= 0;
      lines[i].className = 'pc-line' + (on ? ' hl' : '');
    }
    if (hl.length) {
      var first = document.querySelector('.pc-line[data-line="' + hl[0] + '"]');
      if (first) {
        var b = $('pseudoBody');
        var top = first.offsetTop - b.clientHeight / 2 + first.offsetHeight / 2;
        b.scrollTop = Math.max(0, top);
      }
    }

    // 说明
    if (step && step.desc) { setDesc(step.desc); }

    try {
      d.render(kr, snap, { W: 1000, H: 520, step: step, index: App.idx });
    } catch (err) {
      console.error('[render]', err);
      kr.html('__err', DSV.svg.textL(40, 40, '渲染出错：' + (err && err.message ? err.message : err), 'vwarn'));
    }
    kr.end();
  }

  function setDesc(txt) {
    $('descTxt').textContent = txt || '';
    $('descIdx').textContent = App.steps.length ? (App.idx + 1) + ' / ' + App.steps.length : '—';
  }

  function updateControls() {
    var n = App.steps.length;
    $('stepCount').textContent = (n ? App.idx + 1 : 0) + ' / ' + n;
    var pct = n > 1 ? (App.idx / (n - 1)) * 100 : (n ? 100 : 0);
    $('progressBar').style.width = pct + '%';
    $('btnPlay').textContent = App.playing ? '⏸ 暂停' : '▶ 自动播放';
    $('btnPrev').disabled = App.idx <= 0;
    $('btnNext').disabled = !n || App.idx >= n - 1;
    $('btnFirst').disabled = !n;
    $('btnLast').disabled = !n;
    if (App.cur && n) { setDesc((App.steps[App.idx] || {}).desc || ''); }
  }

  /* ---------------- 侧栏收起 / 移动端抽屉 ---------------- */
  var SIDEBAR_KEY = 'dsvSidebarCollapsed';
  var mqMobile = window.matchMedia('(max-width: 900px)');
  var wrapEl = document.querySelector('.wrap');

  function isMobile() { return mqMobile.matches; }

  function readCollapsed() {
    var v = '0';
    try { v = localStorage.getItem(SIDEBAR_KEY) || '0'; } catch (e) {}
    return v === '1';
  }

  function applyCollapsed(collapsed) {
    wrapEl.classList.toggle('collapsed', collapsed);
    try { localStorage.setItem(SIDEBAR_KEY, collapsed ? '1' : '0'); } catch (e) {}
    $('menuBtn').setAttribute('aria-expanded', collapsed ? 'false' : 'true');
  }

  function closeDrawer() { document.body.classList.remove('drawer-open'); }

  function toggleDrawer() { document.body.classList.toggle('drawer-open'); }

  function initSidebar() {
    if (isMobile()) {
      closeDrawer();
      wrapEl.classList.remove('collapsed');
      $('menuBtn').setAttribute('aria-expanded', 'false');
    } else {
      applyCollapsed(readCollapsed());
    }
  }

  /* ---------------- 事件绑定 ---------------- */
  function bind() {
    $('btnPlay').onclick = function () { App.playing ? stop() : play(); };
    $('btnNext').onclick = function () { stop(); next(); };
    $('btnPrev').onclick = function () { stop(); prev(); };
    $('btnFirst').onclick = function () { stop(); reset(); };
    $('btnLast').onclick = function () { stop(); goto(App.steps.length - 1); };
    $('btnApply').onclick = applyData;
    $('btnClear').onclick = function () { App.state = null; rebuild(); };

    $('speed').oninput = function () {
      App.speed = Number($('speed').value);
      $('speedTxt').textContent = (620 / DELAYS[App.speed - 1]).toFixed(1) + '×';
      if (App.playing) { tick(); }
    };
    $('speed').oninput();

    $('navSearch').oninput = function () { buildNav(this.value); };

    // 目录开关：桌面端收起/展开侧栏，移动端打开抽屉
    $('menuBtn').onclick = function () {
      if (isMobile()) { toggleDrawer(); }
      else { applyCollapsed(!wrapEl.classList.contains('collapsed')); }
    };
    $('sidebarToggle').onclick = function () {
      if (isMobile()) { closeDrawer(); }
      else { applyCollapsed(!wrapEl.classList.contains('collapsed')); }
    };
    $('sidebarBackdrop').onclick = closeDrawer;

    // 复制当前伪代码
    $('btnCopyCode').onclick = function () {
      var text = currentCodeText();
      var btn = $('btnCopyCode');
      var done = function () {
        var old = btn.textContent;
        btn.textContent = '✓ 已复制';
        setTimeout(function () { btn.textContent = old; }, 1200);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text); done(); });
      } else {
        fallbackCopy(text); done();
      }
    };

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { closeDrawer(); return; }
      if (e.target && /input|select|textarea/i.test(e.target.tagName)) { return; }
      if (e.code === 'Space') { e.preventDefault(); App.playing ? stop() : play(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); stop(); next(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); stop(); prev(); }
      else if (e.key === 'r' || e.key === 'R') { stop(); reset(); }
    });

    window.addEventListener('hashchange', function () {
      var id = location.hash.replace(/^#/, '');
      if (id && DSV.defs[id]) { load(id); }
    });

    window.addEventListener('resize', function () {
      // 桌面 ↔ 移动端切换时各自状态互不干扰
      if (isMobile()) {
        closeDrawer();
        wrapEl.classList.remove('collapsed');
      } else {
        wrapEl.classList.toggle('collapsed', readCollapsed());
      }
    });
  }

  /* ---------------- 启动 ---------------- */
  function boot() {
    bind();
    initSidebar();
    buildNav('');
    var id = location.hash.replace(/^#/, '');
    if (id && DSV.defs[id]) { load(id); }
    else if (DSV.order.length) {
      // 默认直接打开第一个算法，避免空屏
      load(DSV.order[0]);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else { boot(); }

  window.DSV.App = App;
})();
