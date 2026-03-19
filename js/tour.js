/* ===== Guided Tour ===== */
(function () {
  'use strict';

  var steps = [
    {
      target: '.header',
      title: 'The Parent Portal',
      body: 'A single-page concierge for EUSD families. Everything a parent needs — without navigating away. Not a brochure. Not a landing page. A utility.',
      research: 'Research: 74% of parents who can easily find school information are highly likely to recommend their school, vs. only 20% of those who can\'t. <strong>— GreatSchools, 2025 National Survey</strong>'
    },
    {
      target: '.alert-banner',
      title: 'Dynamic Alert Banner',
      body: 'Auto-populates from calendar data — always shows the next upcoming event. Cycles with prev/next. Can be overridden with urgent alerts (closures, weather) via a single config change.',
      research: 'Parents\' #1 request is knowing what\'s coming up. This removes the need to check a separate calendar for basic schedule awareness.'
    },
    {
      target: '#searchInput',
      title: 'Search Everything',
      body: 'Powered by Fuse.js — indexes all schools, tasks, apps, and content. Fuzzy matching handles misspellings. Results scroll directly to the answer and open the tray. Arrow keys, Tab, and Enter all work.',
      research: 'Research: The findability of information is one of the strongest predictors of overall parent satisfaction. <strong>— GreatSchools, 2025</strong>'
    },
    {
      target: '#newToEusdBtn',
      title: 'New Family Onboarding',
      body: 'A step-by-step guide for families new to Escondido. Find your school → enroll → set up PowerSchool → download Rooms → know the basics. Designed for the "I just moved here and I\'m overwhelmed" parent.',
      research: 'New families don\'t know the difference between the district and their school. This gives them one clear path instead of 23 school websites and a district site.'
    },
    {
      target: '.school-type-tabs',
      title: 'Find Your School',
      body: 'Collapsed by type (Elementary, Intermediate, Middle, Specialty) to save space. Each school tile expands inline showing principal, phone, address, bell schedule, staff directory, and quick links — all without leaving the page.',
      research: 'Research: A school selector is among the most requested features on district homepages. Parents\' mental model starts at their school, not the district. <strong>— Edlio, Finalsite, CampusPress</strong>'
    },
    {
      target: '.school-tile',
      title: 'School Colors & Identity',
      body: 'Each tile is tinted with the school\'s actual colors, scraped from their Thrillshare site. When tapped, the tile fills with the school color. Small detail, big identity signal — parents see their school represented.',
      research: 'Design decision: Reinforces that each school has its own identity within the district. Parents associate with their school, not "EUSD."'
    },
    {
      target: null,
      title: 'School Tray — Everything in One Place',
      body: 'Tap a school and a tray expands inline with principal, phone, address, bell schedule (with Thursday and minimum day callouts), Google Maps link, SARC report card, promo video, and 10 quick-link tiles — Grades, Calendar, Lunch, Staff, Report Absence, Forms, Live Feed, News, Parents, Students. All without leaving the page.',
      research: 'Research: Parents want to get to their school\'s information fast. This eliminates the need to navigate to 23 separate school websites. <strong>— SchoolWebmasters, Finalsite</strong>',
      action: function () {
        // Open Elementary tab if not already open
        var elemTab = document.querySelector('.school-type-tab');
        if (elemTab && elemTab.getAttribute('aria-expanded') !== 'true') elemTab.click();
        // Click Bernardo after a moment
        setTimeout(function () {
          var tile = document.querySelector('[data-school-id="bernardo"]');
          if (tile) tile.click();
        }, 400);
      }
    },
    {
      target: null,
      title: 'Staff Directory — Right Here',
      body: 'The Staff button opens an inline sub-tray showing staff names and roles — scraped directly from the school\'s Thrillshare page. Parents can see who teaches what without leaving this page. A "View all staff" link goes to the full directory.',
      research: 'Research: Faculty and staff directory is one of the most visited pages by both prospective and current families. <strong>— Gradelink Analytics Study</strong>',
      action: function () {
        // Click the staff toggle in the open Bernardo tray
        setTimeout(function () {
          var staffBtn = document.querySelector('.staff-toggle');
          if (staffBtn) staffBtn.click();
        }, 300);
      }
    },
    {
      target: '#tasksHeading',
      title: '"I Need To..." Task Tiles',
      body: 'Organized by what parents are trying to DO — not by department or org chart. Each tray gives the 80% answer inline so parents rarely need to click through to eusd.org. Grouped: Daily Life, Stay Connected, Enrollment, Programs, Support, Get Involved.',
      research: 'Research: Parents think in tasks ("how do I report an absence?"), not in bureaucratic categories ("Student Services"). Organizing by intent, not structure, is the key UX insight. <strong>— K-12 web design research, SchoolStatus</strong>'
    },
    {
      target: null,
      title: 'Forms & Documents',
      body: 'All parent-facing forms and documents scraped from eusd.org, categorized and searchable in one place — testing guides, health forms, enrollment docs, safety resources. PDFs are tagged. Categories can be updated by editing a simple JSON file.',
      research: 'Design decision: Parents shouldn\'t have to hunt across 23 school sites and the district site to find a form. One inventory, always current.',
      action: function () {
        var tile = document.querySelector('[data-task-id="forms"]');
        if (tile) {
          tile.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(function () { tile.click(); }, 400);
        }
      }
    },
    {
      target: '#appsHeading',
      title: 'Apps & Logins',
      body: 'Every tech platform parents need — what it is, how to access it, and where to go when it doesn\'t work. PowerSchool, Rooms, EZSchoolLunch. Each with a "Having trouble?" help link.',
      research: 'Research: Parents are overwhelmed by too many platforms and want a single, user-friendly solution. Only 2% prefer social media for school communication. <strong>— SchoolStatus National Survey, SchoolCEO</strong>'
    },
    {
      target: '#langToggle',
      title: 'Spanish Translation',
      body: 'One-tap translation via Google Translate with notranslate protection on proper nouns (school names, PowerSchool, EUSD, etc.). Data structure is ready for hand-translated Spanish content later.',
      research: 'Escondido\'s significant Spanish-speaking population makes bilingual support essential from day one — not a nice-to-have.'
    },
    {
      target: '.contact-section',
      title: 'Always a Way Out',
      body: 'Phone number, address, social media. "Still can\'t find it?" acknowledges that no page covers everything. The phone number is prominent and tappable. Sometimes the best UX is a human.',
      research: 'Design principle: Every dead end should have an escape hatch. A visible phone number builds trust even if parents never call.'
    },
    {
      target: null,
      title: 'Built for Phones',
      body: 'Mobile-first from line one. 44px touch targets, tap-to-call phone numbers, no hover interactions, compact layout. Designed at 375px, enhanced for desktop. Static HTML/CSS/JS — no framework, no build tools, loads fast on budget phones and slow connections.',
      research: 'Research: 95% of K-12 parents have smartphones. Many EUSD families may have older or budget devices. Performance is an equity issue. <strong>— SchoolCEO</strong>'
    }
  ];

  var currentStep = -1;
  var overlay = null;
  var tooltip = null;
  var prevHighlight = null;

  function startTour() {
    currentStep = -1;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(function () { goToStep(0); }, 400);
  }

  function goToStep(index) {
    // Clean up previous
    if (prevHighlight) {
      prevHighlight.classList.remove('tour-highlight');
      prevHighlight = null;
    }
    if (overlay) overlay.remove();
    if (tooltip) tooltip.remove();

    if (index < 0 || index >= steps.length) {
      endTour();
      return;
    }

    currentStep = index;
    var step = steps[index];

    // Create overlay
    overlay = document.createElement('div');
    overlay.className = 'tour-overlay';
    overlay.addEventListener('click', endTour);
    document.body.appendChild(overlay);

    // Run action if defined (opens trays, clicks buttons, etc.)
    if (step.action) {
      step.action();
    }

    // Highlight target
    var targetEl = null;
    if (step.target) {
      targetEl = document.querySelector(step.target);
      if (targetEl) {
        targetEl.classList.add('tour-highlight');
        prevHighlight = targetEl;
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

    // Create tooltip
    tooltip = document.createElement('div');
    tooltip.className = 'tour-tooltip';
    tooltip.setAttribute('role', 'dialog');
    tooltip.setAttribute('aria-label', 'Tour step ' + (index + 1));

    var dotsHtml = '<div class="tour-tooltip__dots">';
    for (var i = 0; i < steps.length; i++) {
      dotsHtml += '<span class="tour-tooltip__dot' + (i === index ? ' active' : '') + '"></span>';
    }
    dotsHtml += '</div>';

    tooltip.innerHTML =
      '<button class="tour-tooltip__btn--close" aria-label="Close tour">&times;</button>' +
      '<div class="tour-tooltip__step">Step ' + (index + 1) + ' of ' + steps.length + '</div>' +
      '<div class="tour-tooltip__title">' + step.title + '</div>' +
      '<div class="tour-tooltip__body">' + step.body + '</div>' +
      (step.research ? '<div class="tour-tooltip__research">' + step.research + '</div>' : '') +
      '<div class="tour-tooltip__nav">' +
        (index > 0 ? '<button class="tour-tooltip__btn tour-tooltip__btn--prev">← Back</button>' : '<span></span>') +
        dotsHtml +
        (index < steps.length - 1 ?
          '<button class="tour-tooltip__btn tour-tooltip__btn--next">Next →</button>' :
          '<button class="tour-tooltip__btn tour-tooltip__btn--next">Done ✓</button>') +
      '</div>';

    document.body.appendChild(tooltip);

    // Position tooltip
    setTimeout(function () { positionTooltip(targetEl); }, 350);

    // Wire buttons
    var closeBtn = tooltip.querySelector('.tour-tooltip__btn--close');
    closeBtn.addEventListener('click', endTour);

    var nextBtn = tooltip.querySelector('.tour-tooltip__btn--next');
    nextBtn.addEventListener('click', function () {
      if (index < steps.length - 1) {
        goToStep(index + 1);
      } else {
        endTour();
      }
    });

    var prevBtn = tooltip.querySelector('.tour-tooltip__btn--prev');
    if (prevBtn) {
      prevBtn.addEventListener('click', function () { goToStep(index - 1); });
    }

    // Keyboard
    tooltip.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') endTour();
      if (e.key === 'ArrowRight') nextBtn.click();
      if (e.key === 'ArrowLeft' && prevBtn) prevBtn.click();
    });
    nextBtn.focus();
  }

  function positionTooltip(targetEl) {
    if (!tooltip) return;

    var margin = 16;
    var viewW = window.innerWidth;
    var viewH = window.innerHeight;
    var ttRect = tooltip.getBoundingClientRect();

    // Center horizontally
    var left = Math.max(margin, (viewW - ttRect.width) / 2);

    if (targetEl) {
      var rect = targetEl.getBoundingClientRect();
      var spaceBelow = viewH - rect.bottom;
      var spaceAbove = rect.top;

      if (spaceBelow > ttRect.height + margin * 2) {
        // Below target
        tooltip.style.top = (rect.bottom + margin) + 'px';
      } else if (spaceAbove > ttRect.height + margin * 2) {
        // Above target
        tooltip.style.top = (rect.top - ttRect.height - margin) + 'px';
      } else {
        // Center in viewport
        tooltip.style.top = Math.max(margin, (viewH - ttRect.height) / 2) + 'px';
      }
    } else {
      // No target — center in viewport
      tooltip.style.top = Math.max(margin, (viewH - ttRect.height) / 2) + 'px';
    }

    tooltip.style.left = left + 'px';
  }

  function endTour() {
    if (prevHighlight) {
      prevHighlight.classList.remove('tour-highlight');
      prevHighlight = null;
    }
    if (overlay) { overlay.remove(); overlay = null; }
    if (tooltip) { tooltip.remove(); tooltip = null; }
    currentStep = -1;
  }

  // ===== Welcome Modal =====
  function getCookie(name) {
    var match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : null;
  }

  function setCookie(name, value, days) {
    var d = new Date();
    d.setTime(d.getTime() + days * 86400000);
    document.cookie = name + '=' + value + ';expires=' + d.toUTCString() + ';path=/';
  }

  function showWelcome() {
    var welcome = document.createElement('div');
    welcome.className = 'tour-welcome';
    welcome.innerHTML =
      '<div class="tour-welcome__card">' +
        '<div class="tour-welcome__icon">👋</div>' +
        '<div class="tour-welcome__title">Welcome to the EUSD Parent Portal</div>' +
        '<div class="tour-welcome__body">This is a new way for families to find everything they need from the district — all in one page. Take a quick guided tour to see how it works.</div>' +
        '<button class="tour-welcome__start" id="tourStart">Take the tour</button>' +
        '<button class="tour-welcome__skip" id="tourSkip">Skip for now</button>' +
        '<label class="tour-welcome__noshow"><input type="checkbox" id="tourNoShow"> Don\'t show this again</label>' +
      '</div>';

    document.body.appendChild(welcome);

    document.getElementById('tourStart').addEventListener('click', function () {
      if (document.getElementById('tourNoShow').checked) {
        setCookie('eusd_tour_done', '1', 365);
      }
      welcome.remove();
      startTour();
    });

    document.getElementById('tourSkip').addEventListener('click', function () {
      if (document.getElementById('tourNoShow').checked) {
        setCookie('eusd_tour_done', '1', 365);
      }
      welcome.remove();
    });
  }

  // Init — show welcome on first visit, or if no cookie
  if (!getCookie('eusd_tour_done')) {
    // Wait for page to fully render
    setTimeout(showWelcome, 800);
  }
})();
