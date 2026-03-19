/* ===== EUSD Parent Portal — Main App ===== */

(function () {
  'use strict';

  // Data stores
  let schoolsData = [];
  let tasksData = [];
  let calendarData = {};
  let appsData = [];
  let configData = {};
  let fuseInstance = null;

  // GA4 helper
  function trackEvent(name, params) {
    if (typeof gtag === 'function') {
      gtag('event', name, params);
    }
  }

  // ===== Data Loading =====
  async function loadData() {
    const [schools, tasks, calendar, apps, config] = await Promise.all([
      fetch('data/schools.json').then(r => r.json()),
      fetch('data/tasks.json').then(r => r.json()),
      fetch('data/calendar.json').then(r => r.json()),
      fetch('data/apps.json').then(r => r.json()),
      fetch('data/config.json').then(r => r.json()),
    ]);
    schoolsData = schools;
    tasksData = tasks;
    calendarData = calendar;
    appsData = apps;
    configData = config;
  }

  // ===== Tray Manager =====
  // Handles the expand/collapse pattern for both school and task grids.
  // Uses a single tray element per grid, repositioned after the clicked tile's row.
  function createTrayManager(grid, trayClass) {
    let activeTile = null;
    const trayEl = document.createElement('div');
    trayEl.className = trayClass + ' tray-container';
    trayEl.style.display = 'none';
    trayEl.setAttribute('aria-hidden', 'true');

    function getColumnsCount() {
      const style = window.getComputedStyle(grid);
      return style.gridTemplateColumns.split(' ').length;
    }

    function close(returnFocus) {
      if (activeTile) {
        activeTile.setAttribute('aria-expanded', 'false');
      }
      trayEl.style.display = 'none';
      trayEl.setAttribute('aria-hidden', 'true');
      trayEl.style.maxHeight = '0';
      trayEl.style.opacity = '0';
      if (returnFocus && activeTile) {
        activeTile.focus();
      }
      activeTile = null;
    }

    function open(tile, html, id) {
      const wasOpen = activeTile === tile;
      close(false);

      if (wasOpen) {
        tile.focus();
        return;
      }

      activeTile = tile;
      tile.setAttribute('aria-expanded', 'true');
      trayEl.id = id;
      trayEl.innerHTML = html;
      trayEl.style.display = 'block';
      trayEl.setAttribute('aria-hidden', 'false');

      // Insert tray after the correct row
      var cols = getColumnsCount();
      var tiles = Array.from(grid.querySelectorAll(':scope > button'));
      var tileIndex = tiles.indexOf(tile);
      var rowEnd = tileIndex - (tileIndex % cols) + cols;
      var insertAfter = tiles[rowEnd - 1] || tiles[tiles.length - 1];

      // Remove tray from current position, insert after row
      if (trayEl.parentNode) trayEl.remove();
      insertAfter.insertAdjacentElement('afterend', trayEl);

      // Animate open
      requestAnimationFrame(function () {
        trayEl.style.maxHeight = trayEl.scrollHeight + 200 + 'px';
        trayEl.style.opacity = '1';
      });

      // Scroll into view
      setTimeout(function () {
        trayEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);

      // Focus first link in tray
      setTimeout(function () {
        var firstLink = trayEl.querySelector('a, button');
        if (firstLink) firstLink.focus();
      }, 350);
    }

    // Escape key handler on the tray itself
    trayEl.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        close(true);
      }
    });

    return { open: open, close: close, element: trayEl };
  }

  // ===== Alert Banner =====
  function initAlertBanner() {
    var banner = document.getElementById('alertBanner');
    var textEl = document.getElementById('alertText');
    var prevBtn = document.getElementById('alertPrev');
    var nextBtn = document.getElementById('alertNext');

    // Check for urgent alert
    if (configData.urgentAlert) {
      banner.classList.add('alert-banner--urgent');
      banner.setAttribute('role', 'alert');
      textEl.textContent = configData.urgentAlert;
      prevBtn.hidden = true;
      nextBtn.hidden = true;
      return;
    }

    // Get upcoming events from current school year
    var currentYear = configData.currentSchoolYear;
    var yearData = calendarData.schoolYears && calendarData.schoolYears.find(function (y) { return y.year === currentYear; });
    if (!yearData) return;

    var today = new Date();
    today.setHours(0, 0, 0, 0);

    var upcoming = yearData.dates
      .filter(function (d) {
        var eventDate = new Date(d.endDate || d.date);
        return eventDate >= today;
      })
      .slice(0, 5);

    if (upcoming.length === 0) return;

    var currentIndex = 0;

    function showEvent(index) {
      var evt = upcoming[index];
      var date = new Date(evt.date + 'T00:00:00');
      var options = { month: 'short', day: 'numeric' };
      var dateStr = date.toLocaleDateString('en-US', options);

      if (evt.endDate) {
        var end = new Date(evt.endDate + 'T00:00:00');
        dateStr += ' – ' + end.toLocaleDateString('en-US', options);
      }

      textEl.textContent = dateStr + ': ' + evt.label;
    }

    showEvent(0);

    prevBtn.addEventListener('click', function () {
      currentIndex = (currentIndex - 1 + upcoming.length) % upcoming.length;
      showEvent(currentIndex);
      trackEvent('alert_banner_next', {});
    });

    nextBtn.addEventListener('click', function () {
      currentIndex = (currentIndex + 1) % upcoming.length;
      showEvent(currentIndex);
      trackEvent('alert_banner_next', {});
    });
  }

  // ===== Schools =====
  function renderSchools() {
    var container = document.getElementById('schoolsContainer');
    var groups = {
      elementary: { label: 'Elementary schools', schools: [] },
      intermediate: { label: 'Intermediate school', schools: [] },
      middle: { label: 'Middle schools', schools: [] },
      specialty: { label: 'Specialty', schools: [] },
    };

    schoolsData.forEach(function (s) {
      var type = s.type || 'elementary';
      if (groups[type]) groups[type].schools.push(s);
    });

    Object.keys(groups).forEach(function (type) {
      var group = groups[type];
      if (group.schools.length === 0) return;

      var groupEl = document.createElement('div');
      groupEl.className = 'school-group';
      groupEl.innerHTML = '<div class="school-group__label">' + group.label + '</div>';

      var grid = document.createElement('div');
      grid.className = 'school-grid';

      var trayMgr = createTrayManager(grid, 'school-tray');

      group.schools.forEach(function (school) {
        var tile = document.createElement('button');
        tile.className = 'school-tile notranslate';
        tile.setAttribute('aria-expanded', 'false');
        tile.setAttribute('aria-controls', 'school-tray-' + school.id);
        tile.textContent = school.shortName;
        tile.dataset.schoolId = school.id;

        tile.addEventListener('click', function () {
          // Deactivate all tiles visually
          grid.querySelectorAll('.school-tile').forEach(function (t) {
            if (t !== tile) t.setAttribute('aria-expanded', 'false');
          });

          trayMgr.open(tile, buildSchoolTray(school), 'school-tray-' + school.id);
          trackEvent('school_tray_open', { school_name: school.name });
        });

        tile.addEventListener('keydown', function (e) {
          if (e.key === 'Escape') trayMgr.close(true);
        });

        grid.appendChild(tile);
      });

      groupEl.appendChild(grid);
      container.appendChild(groupEl);
    });
  }

  function buildSchoolTray(school) {
    var bell = school.bellSchedule || {};
    var links = school.trayLinks || {};

    var extrasHtml = '';
    if (school.sarcUrl) {
      extrasHtml += '<a href="' + school.sarcUrl + '" target="_blank" rel="noopener" class="school-tray__extra-link">Report Card (SARC) <span class="visually-hidden">(opens in new tab)</span></a>';
    }
    if (school.promoVideoUrl) {
      extrasHtml += '<a href="' + school.promoVideoUrl + '" target="_blank" rel="noopener" class="school-tray__extra-link">Watch our video <span class="visually-hidden">(opens in new tab)</span></a>';
    }

    return '<div class="school-tray__inner">' +
      '<div class="school-tray__name notranslate">' + school.name + '</div>' +
      '<div class="school-tray__info">' +
        (school.principal ? '<span>👤 <span class="notranslate">' + school.principal + '</span></span>' : '') +
        '<span>📞 <a href="tel:' + (school.phone || '').replace(/\./g, '-') + '">' + (school.phone || '') + '</a></span>' +
        '<span>🕐 ' + (bell.regularStart || '') + ' – ' + (bell.regularEnd || '') + '</span>' +
      '</div>' +
      '<div class="school-tray__links">' +
        buildTrayLink('📊', 'Grades', links.grades) +
        buildTrayLink('📅', 'Calendar', links.calendar || school.siteUrl) +
        buildTrayLink('🍽️', 'Lunch menu', links.lunchMenu) +
        buildTrayLink('👥', 'Staff', links.staffDirectory || school.siteUrl) +
        buildTrayLink('📞', 'Report absence', links.reportAbsence) +
        buildTrayLink('📄', 'Forms', links.forms || school.siteUrl) +
      '</div>' +
      (extrasHtml ? '<div class="school-tray__extras">' + extrasHtml + '</div>' : '') +
      '<a href="' + school.siteUrl + '" target="_blank" rel="noopener" class="school-tray__visit">Visit full <span class="notranslate">' + school.shortName + '</span> site → <span class="visually-hidden">(opens in new tab)</span></a>' +
    '</div>';
  }

  function buildTrayLink(icon, label, url) {
    if (!url) return '';
    var isExternal = url.startsWith('http');
    var target = isExternal ? ' target="_blank" rel="noopener"' : '';
    var srText = isExternal ? '<span class="visually-hidden">(opens in new tab)</span>' : '';
    return '<a href="' + url + '"' + target + ' class="school-tray__link">' +
      '<span class="school-tray__link-icon">' + icon + '</span>' +
      label + srText +
    '</a>';
  }

  // ===== Tasks =====
  function renderTasks() {
    var container = document.getElementById('tasksContainer');
    var categoryLabels = {
      daily: 'Daily life',
      connected: 'Stay connected',
      enrollment: 'Enrollment',
      explore: 'Programs',
      support: 'Support',
      'new-parent': 'New to EUSD?',
      involved: 'Get involved',
    };

    var grouped = {};
    tasksData.forEach(function (task) {
      var cat = task.category || 'daily';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(task);
    });

    Object.keys(categoryLabels).forEach(function (cat) {
      var label = categoryLabels[cat];
      var tasks = grouped[cat];
      if (!tasks || tasks.length === 0) return;

      var groupEl = document.createElement('div');
      groupEl.className = 'task-group';
      groupEl.innerHTML = '<div class="task-group__label">' + label + '</div>';

      var grid = document.createElement('div');
      grid.className = 'task-grid';

      var trayMgr = createTrayManager(grid, 'task-tray');

      tasks.forEach(function (task) {
        var tile = document.createElement('button');
        tile.className = 'task-tile';
        tile.setAttribute('aria-expanded', 'false');
        tile.setAttribute('aria-controls', 'task-tray-' + task.id);
        tile.dataset.taskId = task.id;

        var iconSpan = document.createElement('span');
        iconSpan.className = 'task-tile__icon';
        if (task.iconBg) iconSpan.style.background = task.iconBg;
        iconSpan.textContent = task.icon || '📌';
        tile.appendChild(iconSpan);

        var textSpan = document.createElement('span');
        textSpan.textContent = (task.title && task.title.en) || task.title || '';
        tile.appendChild(textSpan);

        tile.addEventListener('click', function () {
          grid.querySelectorAll('.task-tile').forEach(function (t) {
            if (t !== tile) t.setAttribute('aria-expanded', 'false');
          });

          trayMgr.open(tile, buildTaskTray(task), 'task-tray-' + task.id);
          trackEvent('task_tray_open', { task_id: task.id });
        });

        tile.addEventListener('keydown', function (e) {
          if (e.key === 'Escape') trayMgr.close(true);
        });

        grid.appendChild(tile);
      });

      groupEl.appendChild(grid);
      container.appendChild(groupEl);
    });
  }

  function buildTaskTray(task) {
    var title = (task.title && task.title.en) || task.title || '';
    var trayHtml = (task.trayHtml && task.trayHtml.en) || task.trayHtml || '';
    var actionLabel = (task.actionLabel && task.actionLabel.en) || task.actionLabel || '';
    var actionUrl = task.actionUrl || '';
    var moreUrl = task.moreUrl || '';

    var linksHtml = '';
    if (task.links && task.links.length > 0) {
      linksHtml = '<div class="task-tray__links">';
      task.links.forEach(function (link) {
        var label = (link.label && link.label.en) || link.label || '';
        var url = link.url || '#';
        var isExternal = url.startsWith('http');
        var target = isExternal ? ' target="_blank" rel="noopener"' : '';
        linksHtml += '<a href="' + url + '"' + target + ' class="task-tray__pill">' + label + '</a>';
      });
      linksHtml += '</div>';
    }

    var actionHtml = '';
    if (actionUrl && actionLabel) {
      var isExternal = actionUrl.startsWith('http');
      var target = isExternal ? ' target="_blank" rel="noopener"' : '';
      var outbound = isExternal ? ' data-outbound="' + actionUrl + '"' : '';
      actionHtml = '<a href="' + actionUrl + '"' + target + outbound + ' class="task-tray__action">' + actionLabel + '</a>';
    }

    var moreHtml = '';
    if (moreUrl) {
      moreHtml = '<a href="' + moreUrl + '" target="_blank" rel="noopener" class="task-tray__more">Full details on eusd.org → <span class="visually-hidden">(opens in new tab)</span></a>';
    }

    return '<div class="task-tray__inner">' +
      '<div class="task-tray__title">' + title + '</div>' +
      '<div class="task-tray__content">' + trayHtml + '</div>' +
      actionHtml +
      linksHtml +
      moreHtml +
    '</div>';
  }

  // ===== Apps =====
  function renderApps() {
    var container = document.getElementById('appsContainer');
    var groupEl = document.createElement('div');
    groupEl.className = 'task-group';

    var grid = document.createElement('div');
    grid.className = 'task-grid';

    var trayMgr = createTrayManager(grid, 'task-tray');

    appsData.forEach(function (app) {
      var tile = document.createElement('button');
      tile.className = 'task-tile';
      tile.setAttribute('aria-expanded', 'false');
      tile.setAttribute('aria-controls', 'app-tray-' + app.id);

      var iconSpan = document.createElement('span');
      iconSpan.className = 'task-tile__icon';
      if (app.iconBg) iconSpan.style.background = app.iconBg;
      iconSpan.textContent = app.icon || '📱';
      tile.appendChild(iconSpan);

      var textSpan = document.createElement('span');
      textSpan.className = 'notranslate';
      textSpan.textContent = (app.name && app.name.en) || app.name || '';
      tile.appendChild(textSpan);

      tile.addEventListener('click', function () {
        grid.querySelectorAll('.task-tile').forEach(function (t) {
          if (t !== tile) t.setAttribute('aria-expanded', 'false');
        });

        trayMgr.open(tile, buildAppTray(app), 'app-tray-' + app.id);
        trackEvent('task_tray_open', { task_id: app.id });
      });

      tile.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') trayMgr.close(true);
      });

      grid.appendChild(tile);
    });

    groupEl.appendChild(grid);
    container.appendChild(groupEl);
  }

  function buildAppTray(app) {
    var name = (app.name && app.name.en) || app.name || '';
    var desc = (app.description && app.description.en) || app.description || '';
    var access = (app.accessHtml && app.accessHtml.en) || app.accessHtml || '';

    var storeLinks = '';
    if (app.appStoreUrl || app.playStoreUrl) {
      storeLinks = '<div class="task-tray__links">';
      if (app.appStoreUrl) {
        storeLinks += '<a href="' + app.appStoreUrl + '" target="_blank" rel="noopener" class="task-tray__pill" data-outbound="' + app.appStoreUrl + '">📱 App Store</a>';
      }
      if (app.playStoreUrl) {
        storeLinks += '<a href="' + app.playStoreUrl + '" target="_blank" rel="noopener" class="task-tray__pill" data-outbound="' + app.playStoreUrl + '">🤖 Google Play</a>';
      }
      storeLinks += '</div>';
    }

    var loginHtml = '';
    if (app.loginUrl) {
      loginHtml = '<a href="' + app.loginUrl + '" target="_blank" rel="noopener" class="task-tray__action" data-outbound="' + app.loginUrl + '">Open <span class="notranslate">' + name + '</span> →</a>';
    }

    var helpHtml = '';
    if (app.hasHelpLink && app.helpUrl) {
      helpHtml = '<a href="' + app.helpUrl + '" class="task-tray__more">Having trouble with <span class="notranslate">' + name + '</span>?</a>';
    }

    return '<div class="task-tray__inner">' +
      '<div class="task-tray__title notranslate">' + name + '</div>' +
      '<div class="task-tray__content">' +
        '<p>' + desc + '</p>' +
        access +
      '</div>' +
      storeLinks +
      loginHtml +
      helpHtml +
    '</div>';
  }

  // ===== Search =====
  function initSearch() {
    var input = document.getElementById('searchInput');
    var resultsEl = document.getElementById('searchResults');

    // Build search index
    var searchItems = [];

    schoolsData.forEach(function (s) {
      searchItems.push({
        type: 'school',
        id: s.id,
        title: s.name,
        subtitle: s.type + ' school',
        icon: '🏫',
        keywords: [s.name, s.shortName, s.principal, s.address].filter(Boolean).join(' '),
      });
    });

    tasksData.forEach(function (t) {
      var title = (t.title && t.title.en) || t.title || '';
      var subtitle = (t.subtitle && t.subtitle.en) || t.subtitle || '';
      var trayText = ((t.trayHtml && t.trayHtml.en) || '').replace(/<[^>]+>/g, '');
      searchItems.push({
        type: 'task',
        id: t.id,
        title: title,
        subtitle: subtitle,
        icon: t.icon || '📌',
        keywords: [title, subtitle, trayText].join(' '),
      });
    });

    appsData.forEach(function (a) {
      var name = (a.name && a.name.en) || a.name || '';
      var desc = (a.description && a.description.en) || a.description || '';
      searchItems.push({
        type: 'app',
        id: a.id,
        title: name,
        subtitle: 'App',
        icon: a.icon || '📱',
        keywords: [name, desc].join(' '),
      });
    });

    if (typeof Fuse !== 'undefined') {
      fuseInstance = new Fuse(searchItems, {
        keys: ['title', 'keywords'],
        threshold: 0.4,
        includeScore: true,
      });
    }

    input.addEventListener('input', function () {
      var query = input.value.trim();
      if (query.length < 2 || !fuseInstance) {
        resultsEl.hidden = true;
        resultsEl.innerHTML = '';
        return;
      }

      var results = fuseInstance.search(query).slice(0, 8);
      if (results.length === 0) {
        resultsEl.hidden = true;
        resultsEl.innerHTML = '';
        return;
      }

      resultsEl.innerHTML = results.map(function (r) {
        var item = r.item;
        return '<div class="search-result" role="option" data-type="' + item.type + '" data-id="' + item.id + '" tabindex="0">' +
          '<span class="search-result__icon">' + item.icon + '</span>' +
          '<span class="search-result__text">' + item.title + '</span>' +
          '<span class="search-result__category">' + item.subtitle + '</span>' +
        '</div>';
      }).join('');

      resultsEl.hidden = false;
      trackEvent('search_query', { query_text: query });
    });

    resultsEl.addEventListener('click', function (e) {
      var result = e.target.closest('.search-result');
      if (!result) return;
      navigateToResult(result.dataset.type, result.dataset.id);
      resultsEl.hidden = true;
      input.value = '';
    });

    resultsEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        var result = e.target.closest('.search-result');
        if (result) {
          navigateToResult(result.dataset.type, result.dataset.id);
          resultsEl.hidden = true;
          input.value = '';
        }
      }
    });

    document.addEventListener('click', function (e) {
      if (!e.target.closest('.search-section__bar')) {
        resultsEl.hidden = true;
      }
    });
  }

  function navigateToResult(type, id) {
    var tile;
    if (type === 'school') {
      tile = document.querySelector('.school-tile[data-school-id="' + id + '"]');
    } else if (type === 'task') {
      tile = document.querySelector('.task-tile[data-task-id="' + id + '"]');
    } else if (type === 'app') {
      tile = document.querySelector('[aria-controls="app-tray-' + id + '"]');
    }

    if (tile) {
      tile.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(function () { tile.click(); }, 400);
    }
  }

  // ===== Chips =====
  function initChips() {
    document.querySelectorAll('.chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        var target = chip.dataset.target;
        trackEvent('chip_click', { chip_label: chip.textContent });
        navigateToResult('task', target);
      });
    });
  }

  // ===== Outbound link tracking =====
  function initOutboundTracking() {
    document.addEventListener('click', function (e) {
      var link = e.target.closest('a[data-outbound]');
      if (link) {
        trackEvent('outbound_link', { destination_url: link.dataset.outbound });
      }

      var appLink = e.target.closest('.task-tray__pill[data-outbound]');
      if (appLink) {
        var url = appLink.dataset.outbound;
        var platform = 'web';
        if (url.indexOf('apple.co') !== -1 || url.indexOf('apps.apple.com') !== -1) platform = 'iOS';
        if (url.indexOf('play.google.com') !== -1) platform = 'Android';
        var trayInner = appLink.closest('.task-tray__inner');
        var titleEl = trayInner && trayInner.querySelector('.task-tray__title');
        trackEvent('app_download_click', {
          app_name: titleEl ? titleEl.textContent : '',
          platform: platform,
        });
      }
    });
  }

  // ===== Footer =====
  function initFooter() {
    var el = document.getElementById('lastUpdated');
    if (el && configData.lastUpdated) {
      var date = new Date(configData.lastUpdated + 'T00:00:00');
      el.textContent = 'Last updated: ' + date.toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
      });
    }
  }

  // ===== Init =====
  async function init() {
    try {
      await loadData();
      initAlertBanner();
      renderSchools();
      renderTasks();
      renderApps();
      initSearch();
      initChips();
      initOutboundTracking();
      initFooter();
    } catch (err) {
      console.error('Failed to initialize Parent Portal:', err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
