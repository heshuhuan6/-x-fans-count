/* X 粉丝数显示 —— 页面上下文脚本（MAIN world）
 *
 * 原理：X 网页自己的 GraphQL 请求返回里本来就带了每个用户的
 * followers_count 字段。本脚本在页面最早期（document_start）
 * 劫持 window.fetch / XMLHttpRequest，把响应里的用户粉丝数
 * 提取出来，通过 window.postMessage 交给内容脚本渲染。
 * 全程不调用任何外部 API，也不需要 API Key。
 */
(function () {
  'use strict';

  var lastCount = new Map(); // rest_id -> followers_count，只在数字变化时上报
  var MAX_DEPTH = 14;

  function isUserNode(o) {
    if (!o || typeof o !== 'object' || Array.isArray(o)) return false;
    var legacy = o.legacy;
    if (!legacy || typeof legacy.followers_count !== 'number') return false;
    if (o.__typename === 'User') return true;
    return typeof legacy.screen_name === 'string';
  }

  function collectUsers(node, out, depth) {
    if (!node || depth > MAX_DEPTH) return;
    if (Array.isArray(node)) {
      for (var i = 0; i < node.length; i++) collectUsers(node[i], out, depth + 1);
      return;
    }
    if (typeof node !== 'object') return;
    if (isUserNode(node)) {
      var legacy = node.legacy;
      var screen = legacy.screen_name || (node.core && node.core.screen_name);
      var count = legacy.followers_count;
      var id = node.rest_id || node.id_str || screen;
      if (screen && lastCount.get(id) !== count) {
        lastCount.set(id, count);
        out.push({ screen_name: screen, followers_count: count });
      }
      return; // 用户节点内部不再嵌套别的用户，可直接返回
    }
    for (var k in node) {
      if (Object.prototype.hasOwnProperty.call(node, k)) {
        collectUsers(node[k], out, depth + 1);
      }
    }
  }

  function handleJson(json) {
    try {
      var users = [];
      collectUsers(json, users, 0);
      if (users.length) {
        window.postMessage({ __x_fans_count__: true, users: users }, '*');
      }
    } catch (e) { /* 忽略解析异常 */ }
  }

  function isGraphql(url) {
    return typeof url === 'string' && url.indexOf('/graphql/') !== -1;
  }

  // ---- 劫持 fetch（X 网页主要用 fetch 拉 GraphQL）----
  var origFetch = window.fetch;
  window.fetch = function () {
    var args = arguments;
    var p = origFetch.apply(this, args);
    try {
      var input = args[0];
      var url = typeof input === 'string' ? input : (input && input.url);
      if (isGraphql(url)) {
        p.then(function (res) {
          if (res && res.ok) {
            // clone 出一份来读，原响应不受影响
            res.clone().json().then(handleJson).catch(function () {});
          }
        }).catch(function () {});
      }
    } catch (e) { /* ignore */ }
    return p;
  };

  // ---- 劫持 XHR（兜底）----
  var origOpen = XMLHttpRequest.prototype.open;
  var origSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url) {
    try { this.__xfc_url = url; } catch (e) {}
    return origOpen.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function () {
    var xhr = this;
    xhr.addEventListener('load', function () {
      try {
        if (isGraphql(xhr.__xfc_url) && xhr.status === 200 && xhr.responseText) {
          handleJson(JSON.parse(xhr.responseText));
        }
      } catch (e) { /* ignore */ }
    });
    return origSend.apply(this, arguments);
  };
})();
