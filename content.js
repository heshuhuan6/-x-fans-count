/* X 粉丝数显示 —— 内容脚本（ISOLATED world）
 *
 * 接收 inject.js 从页面请求里提取到的 {screen_name, followers_count}，
 * 用 MutationObserver 监听动态加载的推文 / 用户列表，
 * 在用户名下方插入一行蓝色小字「粉丝 X万」。
 */
(function () {
  'use strict';

  var fans = new Map(); // screen_name(小写) -> followers_count
  var BADGE_CLASS = 'xfc-badge';
  var DONE_ATTR = 'data-xfc-done';
  var SCREEN_ATTR = 'data-xfc-screen';

  // X 的保留路径，避免把 /home 这类链接误判成用户名
  var RESERVED = {
    home: 1, explore: 1, notifications: 1, messages: 1, bookmarks: 1,
    lists: 1, communities: 1, premium: 1, verified: 1, jobs: 1,
    i: 1, search: 1, settings: 1, compose: 1, tos: 1, privacy: 1,
    about: 1, login: 1, signup: 1, logout: 1, download: 1, share: 1
  };

  function renderBadge(badge, screen) {
    var count = fans.get(screen);
    badge.textContent = '粉丝 ' + formatCount(count);
    badge.title = count.toLocaleString('en-US') + ' 位粉丝';
  }

  function formatCount(n) {
    if (typeof n !== 'number' || !isFinite(n) || n < 0) return '';
    if (n >= 10000) {
      var w = (n / 10000).toFixed(1);
      if (w.slice(-2) === '.0') w = w.slice(0, -2);
      return w + '万';
    }
    return n.toLocaleString('en-US');
  }

  function validUser(u) {
    return u && typeof u.screen_name === 'string' &&
      /^[A-Za-z0-9_]{1,15}$/.test(u.screen_name) &&
      typeof u.followers_count === 'number' && isFinite(u.followers_count);
  }

  window.addEventListener('message', function (e) {
    var d = e.data;
    if (!d || d.__x_fans_count__ !== true || !Array.isArray(d.users)) return;
    var changed = false;
    for (var i = 0; i < d.users.length; i++) {
      var u = d.users[i];
      if (!validUser(u)) continue;
      var key = u.screen_name.toLowerCase();
      if (fans.get(key) !== u.followers_count) {
        fans.set(key, u.followers_count);
        changed = true;
      }
    }
    if (changed) refreshAll();
  });

  function injectStyle() {
    if (document.getElementById('xfc-style')) return;
    var style = document.createElement('style');
    style.id = 'xfc-style';
    style.textContent =
      '.' + BADGE_CLASS + ' {' +
        'color: #1d9bf0 !important;' +
        'font-size: 13px !important;' +
        'line-height: 20px !important;' +
        'margin-top: 2px !important;' +
        'font-weight: 400 !important;' +
        'font-variant-numeric: tabular-nums;' +
        'white-space: nowrap;' +
        'overflow: hidden;' +
        'text-overflow: ellipsis;' +
      '}';
    (document.head || document.documentElement).appendChild(style);
  }

  // 从一条推文 / 一个用户卡片里找出用户名容器和 screen_name
  function extractTarget(root) {
    var box = root.querySelector('div[data-testid="User-Name"]');
    if (!box || box.hasAttribute(DONE_ATTR)) return null;
    var links = box.querySelectorAll('a[href]');
    for (var i = 0; i < links.length; i++) {
      var href = links[i].getAttribute('href');
      var m = href && href.match(/^\/([A-Za-z0-9_]{1,15})$/);
      if (m && !RESERVED[m[1].toLowerCase()]) {
        return { box: box, screen: m[1].toLowerCase() };
      }
    }
    return null;
  }

  function paint(root) {
    var t = extractTarget(root);
    if (!t) return;
    if (!fans.has(t.screen)) return; // 粉丝数还没到，不渲染，等数据到了再画
    t.box.setAttribute(DONE_ATTR, '1');
    t.box.setAttribute(SCREEN_ATTR, t.screen);
    var badge = document.createElement('div');
    badge.className = BADGE_CLASS;
    renderBadge(badge, t.screen);
    t.box.appendChild(badge);
  }

  function refreshAll() {
    // 已有徽标的：用最新数字刷新
    var boxes = document.querySelectorAll('div[data-testid="User-Name"][' + DONE_ATTR + ']');
    for (var i = 0; i < boxes.length; i++) {
      var box = boxes[i];
      var screen = box.getAttribute(SCREEN_ATTR);
      var badge = box.querySelector(':scope > .' + BADGE_CLASS);
      if (screen && badge && fans.has(screen)) {
        renderBadge(badge, screen);
      }
    }
    // 还没处理过的节点补画
    scan(document);
  }

  function scan(scope) {
    if (!scope.querySelectorAll) return;
    var roots = scope.querySelectorAll('article[data-testid="tweet"], div[data-testid="UserCell"]');
    for (var i = 0; i < roots.length; i++) paint(roots[i]);
  }

  var observer = new MutationObserver(function (mutations) {
    for (var i = 0; i < mutations.length; i++) {
      var added = mutations[i].addedNodes;
      for (var j = 0; j < added.length; j++) {
        var n = added[j];
        if (!n || n.nodeType !== 1) continue;
        if (n.matches && (n.matches('article[data-testid="tweet"]') || n.matches('div[data-testid="UserCell"]'))) {
          paint(n);
        } else if (n.querySelectorAll) {
          scan(n);
        }
      }
    }
  });

  function start() {
    injectStyle();
    scan(document);
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
