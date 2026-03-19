/* ===== EUSD Parent Portal — Main App ===== */

(function () {
  'use strict';

  // Data stores
  let schoolsData = [];
  let tasksData = [];
  let calendarData = {};
  let appsData = [];
  let formsData = [];
  let staffData = {};
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
    const [schools, tasks, calendar, apps, forms, staff, config] = await Promise.all([
      fetch('data/schools.json').then(r => r.json()),
      fetch('data/tasks.json').then(r => r.json()),
      fetch('data/calendar.json').then(r => r.json()),
      fetch('data/apps.json').then(r => r.json()),
      fetch('data/forms.json').then(r => r.json()).catch(function () { return []; }),
      fetch('data/staff.json').then(r => r.json()).catch(function () { return {}; }),
      fetch('data/config.json').then(r => r.json()),
    ]);
    schoolsData = schools;
    tasksData = tasks;
    calendarData = calendar;
    appsData = apps;
    formsData = forms;
    staffData = staff;
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

      // Scroll after tray animation completes
      setTimeout(function () {
        var rect = trayEl.getBoundingClientRect();
        var offset = window.scrollY + rect.top - 80;
        window.scrollTo({ top: offset, behavior: 'smooth' });

        // Focus first link in tray
        setTimeout(function () {
          var firstLink = trayEl.querySelector('a, button');
          if (firstLink) firstLink.focus();
        }, 300);
      }, 420);
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

    textEl.addEventListener('click', function () {
      navigateToResult('task', 'calendar');
    });

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
      elementary: { label: 'Elementary', shortLabel: 'Elementary', icon: '🏫', schools: [] },
      intermediate: { label: 'Intermediate', shortLabel: 'Intermediate', icon: '🏫', schools: [] },
      middle: { label: 'Middle', shortLabel: 'Middle', icon: '🏫', schools: [] },
      specialty: { label: 'Specialty', shortLabel: 'Specialty', icon: '⭐', schools: [] },
    };

    schoolsData.forEach(function (s) {
      var type = s.type || 'elementary';
      if (groups[type]) groups[type].schools.push(s);
    });

    // Build category tabs row
    var tabsRow = document.createElement('div');
    tabsRow.className = 'school-type-tabs';

    var activeType = null;
    var groupEls = {};

    Object.keys(groups).forEach(function (type) {
      var group = groups[type];
      if (group.schools.length === 0) return;

      // Category tab button
      var tab = document.createElement('button');
      tab.className = 'school-type-tab';
      tab.setAttribute('aria-expanded', 'false');
      tab.innerHTML = '<span class="school-type-tab__label">' + group.label + '</span>' +
        '<span class="school-type-tab__count">' + group.schools.length + '</span>';
      tab.dataset.type = type;
      tabsRow.appendChild(tab);

      // The expandable group (hidden by default)
      var groupEl = document.createElement('div');
      groupEl.className = 'school-group school-group--collapsed';
      groupEl.dataset.type = type;

      var grid = document.createElement('div');
      grid.className = 'school-grid';

      var trayMgr = createTrayManager(grid, 'school-tray');

      // Store reference for tab click handler
      groupEls[type] = { el: groupEl, tab: tab, grid: grid, trayMgr: trayMgr };

      group.schools.forEach(function (school) {
        var tile = document.createElement('button');
        tile.className = 'school-tile notranslate';
        tile.setAttribute('aria-expanded', 'false');
        tile.setAttribute('aria-controls', 'school-tray-' + school.id);
        tile.textContent = school.shortName;
        tile.dataset.schoolId = school.id;

        // Apply school color gradient
        if (school.color) {
          tile._schoolColor = school.color;
          tile.style.borderColor = school.color + '40';
          tile.style.background = 'linear-gradient(135deg, ' + school.color + '14, ' + school.color + '06)';
          tile.style.borderLeftWidth = '3px';
          tile.style.borderLeftColor = school.color;
        }

        tile.addEventListener('click', function () {
          // Reset ALL tiles to their gradient state
          grid.querySelectorAll('.school-tile').forEach(function (t) {
            t.setAttribute('aria-expanded', 'false');
            var c = t._schoolColor;
            if (c) {
              t.style.background = 'linear-gradient(135deg, ' + c + '14, ' + c + '06)';
              t.style.borderColor = c + '40';
              t.style.borderLeftWidth = '3px';
              t.style.borderLeftColor = c;
            } else {
              t.style.background = '';
              t.style.borderColor = '';
            }
          });

          trayMgr.open(tile, buildSchoolTray(school), 'school-tray-' + school.id);

          // If tray opened, apply school color as solid active background
          if (tile.getAttribute('aria-expanded') === 'true') {
            var activeColor = school.color || '#1031A3';
            tile.style.background = activeColor;
            tile.style.borderColor = activeColor;
            tile.style.borderLeftWidth = '1px';
          }

          trackEvent('school_tray_open', { school_name: school.name });

          // Wire staff sub-tray toggle
          var staffBtn = document.querySelector('[data-staff-target="staff-sub-' + school.id + '"]');
          if (staffBtn) {
            staffBtn.onclick = function () {
              var targetId = staffBtn.dataset.staffTarget;
              var existing = document.getElementById(targetId);
              if (existing) {
                existing.remove();
                staffBtn.setAttribute('aria-expanded', 'false');
              } else {
                var subTray = document.createElement('div');
                subTray.id = targetId;
                subTray.innerHTML = getStaffSubTrayHtml(school.id);
                staffBtn.closest('.school-tray__links').insertAdjacentElement('afterend', subTray);
                staffBtn.setAttribute('aria-expanded', 'true');
              }
            };
          }
        });

        tile.addEventListener('keydown', function (e) {
          if (e.key === 'Escape') trayMgr.close(true);
        });

        grid.appendChild(tile);
      });

      groupEl.appendChild(grid);

      // Tab click handler
      tab.addEventListener('click', function () {
        var isOpen = tab.getAttribute('aria-expanded') === 'true';

        // Close all groups and deactivate all tabs
        Object.keys(groupEls).forEach(function (t) {
          groupEls[t].tab.setAttribute('aria-expanded', 'false');
          groupEls[t].el.classList.add('school-group--collapsed');
          groupEls[t].trayMgr.close(false);
        });

        if (!isOpen) {
          tab.setAttribute('aria-expanded', 'true');
          groupEl.classList.remove('school-group--collapsed');
          activeType = type;

          setTimeout(function () {
            groupEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }, 100);
        } else {
          activeType = null;
        }
      });
    });

    // Insert tabs row, then all group containers
    container.appendChild(tabsRow);
    Object.keys(groups).forEach(function (type) {
      if (groupEls[type]) container.appendChild(groupEls[type].el);
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

    var mapsUrl = school.address ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(school.address) : '';

    var principalHtml = '';
    if (school.principal) {
      principalHtml = '<div class="school-tray__detail">👤 <strong><span class="notranslate">' + school.principal + '</span></strong>';
      if (school.principalEmail) {
        principalHtml += ' · <a href="mailto:' + school.principalEmail + '">' + school.principalEmail + '</a>';
      }
      principalHtml += '</div>';
    }

    var addressHtml = '';
    if (school.address) {
      addressHtml = '<div class="school-tray__detail">📍 ' + school.address;
      if (mapsUrl) {
        addressHtml += ' · <a href="' + mapsUrl + '" target="_blank" rel="noopener">Map <span class="visually-hidden">(opens in new tab)</span></a>';
      }
      addressHtml += '</div>';
    }

    return '<div class="school-tray__inner">' +
      '<div class="school-tray__name notranslate">' + school.name + '</div>' +
      '<div class="school-tray__info">' +
        principalHtml +
        addressHtml +
        '<div class="school-tray__detail">📞 <a href="tel:' + (school.phone || '').replace(/\./g, '-') + '">' + (school.phone || '') + '</a></div>' +
        '<div class="school-tray__detail">🕐 ' + (bell.regularStart || '') + ' – ' + (bell.regularEnd || '') + '</div>' +
        (bell.thursdayEnd || bell.minimumEnd ?
          '<div class="school-tray__bell-extras">' +
            (bell.thursdayEnd ? '<span class="bell-tag bell-tag--thu">Thu dismissal: ' + bell.thursdayEnd + '</span>' : '') +
            (bell.minimumEnd ? '<span class="bell-tag bell-tag--min">Min day: ' + bell.minimumEnd + '</span>' : '') +
          '</div>' : '') +
      '</div>' +
      '<div class="school-tray__links">' +
        buildTrayLink('📊', 'Grades', links.grades) +
        buildTrayLink('📅', 'Calendar', links.calendar || school.siteUrl) +
        buildTrayLink('🍽️', 'Lunch menu', links.lunchMenu) +
        buildStaffLink(school) +
        buildTrayLink('📞', 'Report absence', links.reportAbsence) +
        buildTrayLink('📄', 'Forms', links.forms || school.siteUrl) +
        buildTrayLink('📰', 'Live Feed', school.siteUrl + '/live-feed') +
        buildTrayLink('📢', 'News', school.siteUrl + '/news') +
        buildTrayLink('👨‍👩‍👧', 'Parents', school.siteUrl + '/page/parents-and-families') +
        buildTrayLink('🎒', 'Students', school.siteUrl + '/page/students') +
      '</div>' +
      (extrasHtml ? '<div class="school-tray__extras">' + extrasHtml + '</div>' : '') +
      '<a href="' + school.siteUrl + '" target="_blank" rel="noopener" class="school-tray__visit">Visit full <span class="notranslate">' + school.shortName + '</span> site → <span class="visually-hidden">(opens in new tab)</span></a>' +
    '</div>';
  }

  function buildStaffLink(school) {
    var members = staffData[school.id] || [];
    if (members.length === 0) {
      return buildTrayLink('👥', 'Staff', school.siteUrl + '/staff');
    }
    var staffId = 'staff-sub-' + school.id;
    var html = '<button class="school-tray__link staff-toggle" aria-expanded="false" data-staff-target="' + staffId + '">' +
      '<span class="school-tray__link-icon">👥</span>Staff' +
    '</button>';
    return html;
  }

  function getStaffSubTrayHtml(schoolId) {
    var members = staffData[schoolId] || [];
    var siteUrl = '';
    schoolsData.forEach(function (s) { if (s.id === schoolId) siteUrl = s.siteUrl; });

    var html = '<div class="staff-subtray">';
    members.forEach(function (m) {
      html += '<div class="staff-member">' +
        '<strong class="notranslate">' + m.name + '</strong>' +
        '<span class="staff-member__role">' + m.role + '</span>' +
      '</div>';
    });
    html += '<a href="' + siteUrl + '/staff" target="_blank" rel="noopener" class="task-tray__more" style="margin-top:8px">View all staff on school site → <span class="visually-hidden">(opens in new tab)</span></a>';
    html += '</div>';
    return html;
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

          var html = task.id === 'calendar' ? buildCalendarTray() :
                     task.id === 'forms' ? buildFormsTray() : buildTaskTray(task);
          trayMgr.open(tile, html, 'task-tray-' + task.id);

          // Wire up calendar filters after tray is in the DOM
          if (task.id === 'calendar') {
            setTimeout(initCalendarFilters, 50);
          }

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

  // ===== Calendar =====
  function buildCalendarTray() {
    var years = calendarData.schoolYears || [];
    var currentYear = configData.currentSchoolYear || (years[0] && years[0].year) || '';

    // Year tabs
    var yearTabsHtml = '<div class="calendar-year-tabs">';
    years.forEach(function (y) {
      var active = y.year === currentYear ? ' active' : '';
      yearTabsHtml += '<button class="calendar-year-tab' + active + '" data-year="' + y.year + '">' + y.year + '</button>';
    });
    yearTabsHtml += '</div>';

    // Filter toggles
    var filters = [
      { type: 'holiday', label: 'Holidays' },
      { type: 'break', label: 'Breaks' },
      { type: 'minimum-day', label: 'Early dismissal' },
      { type: 'non-student-day', label: 'No school' },
      { type: 'first-last-day', label: 'First/Last day' },
    ];
    var filtersHtml = '<div class="calendar-filters" role="group" aria-label="Filter calendar events">';
    filters.forEach(function (f) {
      filtersHtml += '<button class="calendar-filter active" data-filter="' + f.type + '" aria-pressed="true">' + f.label + '</button>';
    });
    filtersHtml += '</div>';

    // Date list (rendered for current year initially)
    var datesHtml = renderCalendarDates(currentYear, null);

    // PDF links
    var pdfHtml = '<div class="calendar-pdfs">';
    years.forEach(function (y) {
      if (y.pdfUrl) {
        pdfHtml += '<a href="' + y.pdfUrl + '" target="_blank" rel="noopener" class="task-tray__pill">📄 ' + y.year + ' PDF</a> ';
      }
    });
    pdfHtml += '</div>';

    return '<div class="task-tray__inner">' +
      '<div class="task-tray__title">School calendar</div>' +
      yearTabsHtml +
      filtersHtml +
      '<div id="calendarDateList">' + datesHtml + '</div>' +
      (pdfHtml.indexOf('href') !== -1 ? '<div class="task-tray__links" style="margin-top:12px">' + pdfHtml + '</div>' : '') +
      '<a href="https://www.eusd.org/page/school-year-calendars" target="_blank" rel="noopener" class="task-tray__more">Full details on eusd.org → <span class="visually-hidden">(opens in new tab)</span></a>' +
    '</div>';
  }

  function renderCalendarDates(yearStr, hiddenTypes) {
    var years = calendarData.schoolYears || [];
    var yearData = years.find(function (y) { return y.year === yearStr; });
    if (!yearData) return '<p>No dates available.</p>';

    var typeIcons = {
      'holiday': '🏖️',
      'break': '🌴',
      'minimum-day': '⏰',
      'non-student-day': '📋',
      'first-last-day': '🎒',
    };

    var html = '<ul class="calendar-list">';
    yearData.dates.forEach(function (d) {
      var hidden = hiddenTypes && hiddenTypes.indexOf(d.type) !== -1;
      var date = new Date(d.date + 'T00:00:00');
      var opts = { month: 'short', day: 'numeric' };
      var dateStr = date.toLocaleDateString('en-US', opts);
      if (d.endDate) {
        var end = new Date(d.endDate + 'T00:00:00');
        dateStr += ' – ' + end.toLocaleDateString('en-US', opts);
      }
      var icon = typeIcons[d.type] || '📌';
      html += '<li class="calendar-item' + (hidden ? ' calendar-item--hidden' : '') + '" data-type="' + d.type + '">' +
        '<span>' + icon + ' ' + d.label + '</span>' +
        '<span class="calendar-item__date">' + dateStr + '</span>' +
      '</li>';
    });
    html += '</ul>';
    return html;
  }

  function initCalendarFilters() {
    var container = document.getElementById('calendarDateList');
    if (!container) return;

    var trayInner = container.closest('.task-tray__inner');
    if (!trayInner) return;

    // Year tabs
    var yearTabs = trayInner.querySelectorAll('.calendar-year-tab');
    yearTabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        yearTabs.forEach(function (t) { t.classList.remove('active'); });
        tab.classList.add('active');
        var hiddenTypes = getHiddenTypes(trayInner);
        container.innerHTML = renderCalendarDates(tab.dataset.year, hiddenTypes);
        trackEvent('calendar_filter', { filter_type: 'year_' + tab.dataset.year });
      });
    });

    // Filter toggles
    var filterBtns = trayInner.querySelectorAll('.calendar-filter');
    filterBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        btn.classList.toggle('active');
        btn.setAttribute('aria-pressed', btn.classList.contains('active'));
        var activeYear = trayInner.querySelector('.calendar-year-tab.active');
        var yearStr = activeYear ? activeYear.dataset.year : configData.currentSchoolYear;
        var hiddenTypes = getHiddenTypes(trayInner);
        container.innerHTML = renderCalendarDates(yearStr, hiddenTypes);
        trackEvent('calendar_filter', { filter_type: btn.dataset.filter });
      });
    });
  }

  function getHiddenTypes(trayInner) {
    var hidden = [];
    trayInner.querySelectorAll('.calendar-filter').forEach(function (btn) {
      if (!btn.classList.contains('active')) {
        hidden.push(btn.dataset.filter);
      }
    });
    return hidden;
  }

  // ===== Forms =====
  function buildFormsTray() {
    var visible = formsData.filter(function (f) {
      return f.category !== 'hide' && f.title.indexOf('Page Not Found') === -1;
    });

    // Group by category
    var grouped = {};
    var uncategorized = [];
    visible.forEach(function (f) {
      if (f.category) {
        if (!grouped[f.category]) grouped[f.category] = [];
        grouped[f.category].push(f);
      } else {
        uncategorized.push(f);
      }
    });

    var html = '<div class="task-tray__inner">' +
      '<div class="task-tray__title">Forms &amp; documents</div>' +
      '<div class="task-tray__content">' +
      '<p>Documents and forms available from <span class="notranslate">EUSD</span>. ' +
      '<em>(' + visible.length + ' items)</em></p>';

    // Render categorized groups first
    var catLabels = Object.keys(grouped).sort();
    catLabels.forEach(function (cat) {
      html += '<h4 style="margin-top:16px;text-transform:capitalize">' + cat + '</h4>';
      html += '<ul class="forms-list">';
      grouped[cat].forEach(function (f) {
        var isPdf = f.url.endsWith('.pdf');
        var icon = isPdf ? '📄' : '🔗';
        var badge = isPdf ? ' <span class="forms-badge">PDF</span>' : '';
        html += '<li class="forms-item"><a href="' + f.url + '" target="_blank" rel="noopener">' +
          icon + ' ' + f.title + badge + '</a></li>';
      });
      html += '</ul>';
    });

    // Render uncategorized
    if (uncategorized.length > 0) {
      if (catLabels.length > 0) {
        html += '<h4 style="margin-top:16px">Other</h4>';
      }
      html += '<ul class="forms-list">';
      uncategorized.forEach(function (f) {
        var isPdf = f.url.endsWith('.pdf');
        var icon = isPdf ? '📄' : '🔗';
        var badge = isPdf ? ' <span class="forms-badge">PDF</span>' : '';
        html += '<li class="forms-item"><a href="' + f.url + '" target="_blank" rel="noopener">' +
          icon + ' ' + f.title + badge + '</a></li>';
      });
      html += '</ul>';
    }

    html += '</div>' +
      '<a href="https://www.eusd.org" target="_blank" rel="noopener" class="task-tray__more">Full details on eusd.org → <span class="visually-hidden">(opens in new tab)</span></a>' +
      '</div>';

    return html;
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

    // Click on result
    resultsEl.addEventListener('click', function (e) {
      var result = e.target.closest('.search-result');
      if (!result) return;
      navigateToResult(result.dataset.type, result.dataset.id);
      resultsEl.hidden = true;
      input.value = '';
    });

    // Keyboard navigation in search
    var activeIndex = -1;

    input.addEventListener('keydown', function (e) {
      var items = resultsEl.querySelectorAll('.search-result');
      if (!items.length || resultsEl.hidden) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeIndex = Math.min(activeIndex + 1, items.length - 1);
        updateActiveResult(items);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeIndex = Math.max(activeIndex - 1, 0);
        updateActiveResult(items);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (activeIndex >= 0 && items[activeIndex]) {
          var item = items[activeIndex];
          navigateToResult(item.dataset.type, item.dataset.id);
          resultsEl.hidden = true;
          input.value = '';
          activeIndex = -1;
        }
      } else if (e.key === 'Escape') {
        resultsEl.hidden = true;
        activeIndex = -1;
      } else if (e.key === 'Tab' && !e.shiftKey) {
        if (activeIndex < 0 && items.length > 0) {
          e.preventDefault();
          activeIndex = 0;
          updateActiveResult(items);
        } else if (activeIndex >= 0 && activeIndex < items.length - 1) {
          e.preventDefault();
          activeIndex++;
          updateActiveResult(items);
        } else {
          resultsEl.hidden = true;
          activeIndex = -1;
        }
      }
    });

    // Reset active index when input changes
    input.addEventListener('input', function () { activeIndex = -1; });

    function updateActiveResult(items) {
      items.forEach(function (item, i) {
        if (i === activeIndex) {
          item.classList.add('search-result--active');
          item.scrollIntoView({ block: 'nearest' });
        } else {
          item.classList.remove('search-result--active');
        }
      });
    }

    // Enter on focused result
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
        activeIndex = -1;
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
    // Popular links toggle
    var toggle = document.getElementById('popularToggle');
    var chips = document.getElementById('popularChips');
    if (toggle && chips) {
      toggle.addEventListener('click', function () {
        var isOpen = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', String(!isOpen));
        chips.hidden = isOpen;
        toggle.textContent = isOpen ? 'Popular links ▾' : 'Popular links ▴';
      });
    }

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

  // ===== New to EUSD Onramp =====
  function initNewToEusd() {
    var btn = document.getElementById('newToEusdBtn');
    var tray = document.getElementById('newToEusdTray');
    if (!btn || !tray) return;

    var html = '<div class="onramp-tray__inner">' +
      '<h3>Welcome! Here\'s how to get started</h3>' +
      '<div class="onramp-step">' +
        '<span class="onramp-step__number">1</span>' +
        '<div class="onramp-step__content"><strong>Find your school</strong><br>' +
          'Use the <a href="https://www.schoolsitelocator.com/apps/escondidounion/accessibilityFocused.html" target="_blank" rel="noopener">School Site Locator</a> to find which school your child is assigned to based on your home address.</div>' +
      '</div>' +
      '<div class="onramp-step">' +
        '<span class="onramp-step__number">2</span>' +
        '<div class="onramp-step__content"><strong>Enroll your child</strong><br>' +
          'Visit <a href="https://www.eusd.org/page/registration-enrollment" target="_blank" rel="noopener">Registration &amp; Enrollment</a> on eusd.org. You\'ll need: proof of residency, birth certificate, immunization records, and previous school records (if transferring).</div>' +
      '</div>' +
      '<div class="onramp-step">' +
        '<span class="onramp-step__number">3</span>' +
        '<div class="onramp-step__content"><strong>Get your <span class="notranslate">PowerSchool</span> account</strong><br>' +
          'Once enrolled, your school office will give you login credentials for <span class="notranslate">PowerSchool</span> — this is where you check grades, attendance, and report cards.</div>' +
      '</div>' +
      '<div class="onramp-step">' +
        '<span class="onramp-step__number">4</span>' +
        '<div class="onramp-step__content"><strong>Download the <span class="notranslate">Rooms</span> app</strong><br>' +
          'This is how <span class="notranslate">EUSD</span> sends you news, alerts, and push notifications. Get it on <a href="https://apps.apple.com/us/app/thrillshare/id1024147876" target="_blank" rel="noopener">App Store</a> or <a href="https://play.google.com/store/apps/details?id=com.apptegy.thrillshare" target="_blank" rel="noopener">Google Play</a>.</div>' +
      '</div>' +
      '<div class="onramp-step">' +
        '<span class="onramp-step__number">5</span>' +
        '<div class="onramp-step__content"><strong>Know the basics</strong><br>' +
          'All <span class="notranslate">EUSD</span> students eat breakfast and lunch <strong>free</strong> — no application needed. Check your school\'s bell schedule on this page for start and end times.</div>' +
      '</div>' +
      '<div class="onramp-step">' +
        '<span class="onramp-step__number">6</span>' +
        '<div class="onramp-step__content"><strong>Explore programs</strong><br>' +
          '<span class="notranslate">EUSD</span> offers dual language programs (at <span class="notranslate">Farr, Glen View, Lincoln, Pioneer</span> — 90/10 model), the <span class="notranslate">EXPLORE</span> after-school program, and more. Browse the sections below to learn about everything available.</div>' +
      '</div>' +
    '</div>';

    tray.innerHTML = html;

    btn.addEventListener('click', function () {
      var isOpen = btn.getAttribute('aria-expanded') === 'true';
      if (isOpen) {
        btn.setAttribute('aria-expanded', 'false');
        tray.classList.remove('open');
        tray.setAttribute('aria-hidden', 'true');
      } else {
        btn.setAttribute('aria-expanded', 'true');
        tray.classList.add('open');
        tray.setAttribute('aria-hidden', 'false');
        trackEvent('task_tray_open', { task_id: 'new-to-eusd-onramp' });
      }
    });
  }

  // ===== Find by Address =====
  function initFindByAddress() {
    var btn = document.getElementById('findByAddressBtn');
    var tray = document.getElementById('findByAddressTray');
    if (!btn || !tray) return;

    var loaded = false;

    btn.addEventListener('click', function () {
      var isOpen = btn.getAttribute('aria-expanded') === 'true';
      if (isOpen) {
        btn.setAttribute('aria-expanded', 'false');
        tray.classList.remove('open');
        tray.setAttribute('aria-hidden', 'true');
      } else {
        if (!loaded) {
          tray.innerHTML = '<div class="onramp-tray__inner" style="padding:0;overflow:hidden;">' +
            '<iframe src="https://www.schoolsitelocator.com/apps/escondidounion/accessibilityFocused.html" ' +
              'title="School Site Locator" ' +
              'style="width:100%;height:500px;border:none;border-radius:0 0 10px 10px;" ' +
              'loading="lazy"></iframe>' +
          '</div>';
          loaded = true;
        }
        btn.setAttribute('aria-expanded', 'true');
        tray.classList.add('open');
        tray.setAttribute('aria-hidden', 'false');
        trackEvent('task_tray_open', { task_id: 'find-by-address' });
      }
    });
  }

  // ===== Back to Top =====
  function initBackToTop() {
    var btn = document.getElementById('backToTop');
    if (!btn) return;

    window.addEventListener('scroll', function () {
      if (window.scrollY > 400) {
        btn.classList.add('visible');
      } else {
        btn.classList.remove('visible');
      }
    }, { passive: true });

    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
      initNewToEusd();
      initFindByAddress();
      initBackToTop();
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
