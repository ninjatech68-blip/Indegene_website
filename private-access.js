(function (window, document) {
  'use strict';

  var pageKey = document.body?.dataset?.privatePageKey || 'partner-access';
  var resourceTypeMeta = {
    PRESENTATION_DECK: { label: 'Presentation Decks', icon: 'bi-easel2' },
    LIVE_DEMO: { label: 'Live Demos', icon: 'bi-display' },
    DOCUMENT: { label: 'Documents', icon: 'bi-file-earmark-text' },
    OTHER: { label: 'Other Links', icon: 'bi-link-45deg' }
  };

  function getApiBase() {
    var queryValue = '';
    try {
      queryValue = new URLSearchParams(window.location.search).get('apiBase') || '';
    } catch (error) {
      queryValue = '';
    }

    if (queryValue && window.localStorage) {
      window.localStorage.setItem('oco-cms-api-base', queryValue);
    }

    var explicit = queryValue
      || document.body?.dataset?.cmsApiBase
      || document.querySelector('meta[name="oco-cms-api-base"]')?.getAttribute('content')
      || window.localStorage?.getItem('oco-cms-api-base');

    if (explicit) {
      return explicit.replace(/\/$/, '');
    }

    if (window.location.hostname === 'localhost' && window.location.port === '8080') {
      return 'http://localhost:4000/api/public';
    }

    if (window.location.protocol.indexOf('http') === 0) {
      return window.location.origin.replace(/\/$/, '') + '/api/public';
    }

    return '';
  }

  function request(path, options) {
    return fetch(apiBase + path, Object.assign({
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    }, options || {})).then(function (response) {
      if (response.status === 204) {
        return null;
      }

      return response.json().catch(function () {
        return {};
      }).then(function (payload) {
        if (!response.ok) {
          var error = new Error(payload.message || 'Request failed');
          error.status = response.status;
          throw error;
        }
        return payload;
      });
    });
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, function (character) {
      return ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      })[character];
    });
  }

  function titleCase(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, function (char) { return char.toUpperCase(); });
  }

  function groupResources(items) {
    return items.reduce(function (acc, item) {
      var key = item.resourceType || 'OTHER';
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(item);
      return acc;
    }, {});
  }

  function setLoadingState(isLoading) {
    if (shell) {
      shell.classList.toggle('is-loading', isLoading);
    }
    if (submitButton) {
      submitButton.disabled = isLoading;
      submitButton.textContent = isLoading ? 'Checking...' : 'Unlock access';
    }
  }

  function setMessage(text, kind) {
    if (!messageNode) return;
    messageNode.textContent = text || '';
    messageNode.className = 'private-access__message' + (kind ? ' is-' + kind : '');
    messageNode.hidden = !text;
  }

  function renderResources(items, username) {
    var grouped = groupResources(items);
    var groups = Object.keys(grouped).sort(function (left, right) {
      var order = ['PRESENTATION_DECK', 'LIVE_DEMO', 'DOCUMENT', 'OTHER'];
      return order.indexOf(left) - order.indexOf(right);
    });

    usernameNode.textContent = username ? 'Signed in as ' + username : 'Access granted';
    authPanel.hidden = true;
    contentPanel.hidden = false;

    if (!items.length) {
      resourcesRoot.innerHTML = '<div class="private-access__empty">No links have been published for this page yet.</div>';
      return;
    }

    resourcesRoot.innerHTML = groups.map(function (groupKey) {
      var meta = resourceTypeMeta[groupKey] || { label: titleCase(groupKey), icon: 'bi-link-45deg' };
      return [
        '<section class="private-access__group">',
        '  <div class="private-access__group-head">',
        '    <h2><i class="bi ' + escapeHtml(meta.icon) + '" aria-hidden="true"></i> ' + escapeHtml(meta.label) + '</h2>',
        '  </div>',
        '  <div class="private-access__grid">',
        grouped[groupKey].map(function (item) {
          return [
            '<article class="private-access__card">',
            '  <div class="private-access__card-top">',
            '    <span class="private-access__badge">' + escapeHtml(meta.label) + '</span>',
            '    <h3>' + escapeHtml(item.title) + '</h3>',
            (item.description ? '    <p>' + escapeHtml(item.description) + '</p>' : ''),
            '  </div>',
            '  <a class="private-access__link" href="' + escapeHtml(item.url) + '" target="_blank" rel="noreferrer">',
            '    ' + escapeHtml(item.ctaLabel || 'Open resource'),
            '    <i class="bi bi-arrow-up-right" aria-hidden="true"></i>',
            '  </a>',
            '</article>'
          ].join('');
        }).join(''),
        '  </div>',
        '</section>'
      ].join('');
    }).join('');
  }

  function resetToLogin() {
    authPanel.hidden = false;
    contentPanel.hidden = true;
    resourcesRoot.innerHTML = '';
    loginForm.reset();
  }

  function loadResources(sessionPayload) {
    return request('/private-pages/' + encodeURIComponent(pageKey) + '/resources').then(function (payload) {
      renderResources(payload?.data || [], sessionPayload?.data?.username || '');
      setMessage('', '');
    }).catch(function (error) {
      if (error.status === 401) {
        resetToLogin();
      }
      throw error;
    });
  }

  var apiBase = getApiBase();
  var shell = document.querySelector('[data-private-shell]');
  var authPanel = document.querySelector('[data-private-auth]');
  var contentPanel = document.querySelector('[data-private-content]');
  var resourcesRoot = document.querySelector('[data-private-resources]');
  var loginForm = document.querySelector('[data-private-login-form]');
  var logoutButton = document.querySelector('[data-private-logout]');
  var submitButton = loginForm ? loginForm.querySelector('button[type="submit"]') : null;
  var messageNode = document.querySelector('[data-private-message]');
  var usernameNode = document.querySelector('[data-private-username]');

  if (!apiBase || !loginForm || !authPanel || !contentPanel || !resourcesRoot) {
    return;
  }

  request('/private-pages/' + encodeURIComponent(pageKey) + '/session').then(function (payload) {
    if (payload?.data?.authenticated) {
      return loadResources(payload);
    }
    resetToLogin();
  }).catch(function () {
    setMessage('The protected-content service is not available right now.', 'error');
  });

  loginForm.addEventListener('submit', function (event) {
    event.preventDefault();
    var formData = new FormData(loginForm);
    var username = String(formData.get('username') || '').trim();
    var password = String(formData.get('password') || '');

    if (!username || !password) {
      setMessage('Enter both username and password to continue.', 'error');
      return;
    }

    setLoadingState(true);
    setMessage('', '');

    request('/private-pages/' + encodeURIComponent(pageKey) + '/login', {
      method: 'POST',
      body: JSON.stringify({
        username: username,
        password: password
      })
    }).then(function (payload) {
      return loadResources(payload);
    }).catch(function (error) {
      setMessage(error.message || 'Unable to unlock the page right now.', 'error');
      resetToLogin();
    }).finally(function () {
      setLoadingState(false);
    });
  });

  if (logoutButton) {
    logoutButton.addEventListener('click', function () {
      request('/private-pages/' + encodeURIComponent(pageKey) + '/logout', {
        method: 'POST'
      }).finally(function () {
        setMessage('You have been signed out of this protected page.', 'success');
        resetToLogin();
      });
    });
  }
}(window, document));
