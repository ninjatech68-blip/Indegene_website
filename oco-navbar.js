/**
 * oco-navbar.js
 * -----------------------------------------------------------
 * Shared navbar behavior for OCO pages.
 * Handles:
 *   - Mega menu open / close
 *   - Hover and focus activation on desktop
 *   - Tap / click fallback on touch devices
 *   - Mega menu pane switching
 *   - Search panel toggle
 *   - Escape and outside-click close
 * -----------------------------------------------------------
 */

(function ($) {
  'use strict';

  var $menus = $('.oco-megamenu');
  var $searchPanel = $('#searchPanel');
  var $navItems = $('.oco-mainnav__navitem');
  var $navTriggers = $('.js-nav-trigger');
  var $searchToggle = $('.js-search-toggle');
  var $searchInput = $searchPanel.find('.oco-searchpanel__input');
  var $searchSubmit = $searchPanel.find('.oco-searchpanel__btn');
  var desktopHoverQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
  var closeTimer = null;
  var activeSearchIndex = -1;
  var searchResults = [];
  var searchIndex = [
    { title: 'Homepage', meta: 'Overview', href: 'Index.html', keywords: 'home homepage omnichannel orchestration commercial operations strategic alliances partners services' },
    { title: 'Capabilities', meta: 'Homepage section', href: 'services.html', keywords: 'capabilities strategy planning orchestration execution measurement analytics omnichannel engagement solutions integrated engagement' },
    { title: 'Strategic Alliances', meta: 'Homepage section', href: 'Index.html#cpt1', keywords: 'partners alliances salesforce jira adobe microsoft infobip cvent on24 spotme technology platform partners' },
    { title: 'Global Reach', meta: 'Homepage section', href: 'Index.html#cpt3', keywords: 'global reach pharma segments global presence clients delivery regions operational reach' },
    { title: 'Testimonials', meta: 'Homepage section', href: 'Index.html#cpt2', keywords: 'testimonials client perspectives what our clients say' },
    { title: 'Pharmaceuticals', meta: 'Who We Serve', href: 'biopharmaceuticals.html', keywords: 'pharmaceuticals pharma commercial teams brand teams medical affairs who we serve' },
    { title: 'Sales and Commercial Teams', meta: 'Pharmaceuticals', href: 'biopharmaceuticals.html#enterprise', keywords: 'sales commercial teams pharmaceutical leadership field effectiveness omnichannel execution' },
    { title: 'Marketing and Brand Teams', meta: 'Pharmaceuticals', href: 'biopharmaceuticals.html#hcp', keywords: 'marketing brand teams hcp engagement launch campaigns omnichannel' },
    { title: 'Medical Affairs', meta: 'Pharmaceuticals', href: 'biopharmaceuticals.html#patient', keywords: 'medical affairs scientific communication evidence engagement' },
    
    
    { title: 'Emerging Biotech', meta: 'Who We Serve', href: 'emerging-biotech.html', keywords: 'emerging biotech launch speed pre-commercial biotech who we serve' },
    { title: 'Launch-Ready Orchestration', meta: 'Emerging Biotech', href: 'emerging-biotech.html#launch', keywords: 'launch ready campaigns commercialisation first launch' },
    { title: 'Agile Omnichannel Delivery', meta: 'Emerging Biotech', href: 'emerging-biotech.html#agile', keywords: 'agile omnichannel lean delivery speed precision' },
    { title: 'KOL and Specialist Outreach', meta: 'Emerging Biotech', href: 'emerging-biotech.html#kol', keywords: 'kol outreach specialist hcp rare disease niche' },
    { title: 'Marketing Automation Setup', meta: 'Emerging Biotech', href: 'emerging-biotech.html#map', keywords: 'marketing automation map setup integration journeys' },
    { title: 'Insights and Performance Reporting', meta: 'Emerging Biotech', href: 'emerging-biotech.html#insights', keywords: 'insights reporting dashboards performance data' },
    { title: 'Medical Devices', meta: 'Who We Serve', href: 'medical-devices.html', keywords: 'medical devices medtech diagnostics who we serve connected commercialization provider education compliance analytics' },
    { title: 'Animal Healthcare', meta: 'Who We Serve', href: 'animal-health.html', keywords: 'animal healthcare veterinary marketing commercial teams analytics who we serve' },
    { title: 'Expertise', meta: 'Why Choose Us', href: 'by_role.html', keywords: 'expertise specialists seo sem social media programmatic qa map account manager ceso project manager' },
    { title: 'Execution Layer', meta: 'Why Choose Us', href: 'by_channel.html', keywords: 'execution layer channels seo sem ppc social media programmatic email whatsapp sms' },
    { title: 'Value Chain', meta: 'Why Choose Us', href: 'by_function.html', keywords: 'value chain campaign management digital marketing marketing automation qa project management account management' },
    { title: 'Capabilities Overview', meta: 'Services page', href: 'services.html', keywords: 'capabilities omnichannel strategy planning orchestration execution measurement analytics delivery' },
    { title: 'GenAI Services', meta: 'Capabilities', href: 'genai.html', keywords: 'genai generative ai ai copilots agents prompts llm workflow automation content intelligence' },
    { title: 'Contact Us', meta: 'Get in touch', href: 'contactus.html', keywords: 'contact contact us get in touch enquire enquiry partnership' },
    { title: 'Case Studies', meta: 'Customer Proof', href: 'casestudy.html', keywords: 'case studies proof outcomes examples client work customer proof' },
    { title: 'Insights', meta: 'Thought Leadership', href: 'https://www.indegene.com/what-we-think/blogs', keywords: 'insights blogs thought leadership articles commercialization omnichannel' },
    { title: 'About', meta: 'Company', href: 'https://www.indegene.com/who-we-are/about-us', keywords: 'about company indegene who we are leadership culture' },
    { title: 'Indegene Revitalizes Mature Brand', meta: 'Case Study', href: 'Indegene Revitalizes.html', keywords: 'indegene revitalizes mature brand case study data driven approach' },
    { title: 'Enterprise Proof', meta: 'Homepage', href: 'index.html#cpt3', keywords: 'enterprise proof outcomes delivery scale operating model results' }
  ];
  var $searchResults = $();

  if ($searchPanel.length && !$searchPanel.find('.oco-searchpanel__results').length) {
    $searchPanel.find('.oco-container').append('<div class="oco-searchpanel__results" hidden></div>');
  }

  $searchResults = $searchPanel.find('.oco-searchpanel__results');

  $menus.hide();
  $searchPanel.hide();
  $searchResults.attr('hidden', true);

  function normalizeMobileNav() {
    var accordion = document.getElementById('mobileAccordion');
    if (!accordion) {
      return;
    }

    var sections = [
      {
        key: 'serve',
        label: 'Who We Serve',
        links: [
          { label: 'Pharmaceuticals', href: 'biopharmaceuticals.html' },
          { label: 'Emerging Biotech', href: 'emerging-biotech.html' },
          { label: 'Medical Devices', href: 'medical-devices.html' },
          { label: 'Animal Healthcare', href: 'animal-health.html' }
        ]
      },
      {
        key: 'capabilities',
        label: 'Capabilities',
        links: [
          { label: 'Strategy', href: 'strategy.html' },
          { label: 'Planning', href: 'planning.html' },
          { label: 'Orchestration', href: 'orchestration.html' },
          { label: 'Execution', href: 'execution.html' },
          { label: 'Measurement', href: 'measurement.html' },
          { label: 'Analytics', href: 'analytics.html' }
        ]
      },
      {
        key: 'why',
        label: 'Why Choose Us',
        links: [
          { label: 'Pharma-Native Expertise', href: 'by_role.html' },
          { label: 'Compliance-by-Design', href: 'by_function.html' },
          { label: 'Omnichannel Execution at Scale', href: 'by_channel.html' }
        ]
      },
      {
        key: 'more',
        label: 'About & Insights',
        links: [
          { label: 'Case Studies', href: 'casestudy.html' },
          { label: 'GenAI', href: 'genai.html' },
          { label: 'Insights', href: 'https://www.indegene.com/what-we-think/blogs' },
          { label: 'About', href: 'https://www.indegene.com/who-we-are/about-us' },
          { label: 'Contact Us', href: 'contactus.html' }
        ]
      }
    ];

    accordion.innerHTML = sections.map(function (section, index) {
      var collapseId = 'mobileSection-' + section.key;
      var headingId = 'mobileHeading-' + section.key;
      var expanded = index === 0;
      return [
        '<div class="accordion-item">',
        '  <h2 class="accordion-header" id="' + headingId + '">',
        '    <button class="accordion-button' + (expanded ? '' : ' collapsed') + '" type="button" data-bs-toggle="collapse" data-bs-target="#' + collapseId + '" aria-expanded="' + (expanded ? 'true' : 'false') + '" aria-controls="' + collapseId + '">',
        section.label,
        '    </button>',
        '  </h2>',
        '  <div id="' + collapseId + '" class="accordion-collapse collapse' + (expanded ? ' show' : '') + '" aria-labelledby="' + headingId + '" data-bs-parent="#mobileAccordion">',
        '    <div class="accordion-body">' +
          section.links.map(function (link) {
            var target = /^https?:\/\//i.test(link.href) ? ' target="_blank" rel="noopener noreferrer"' : '';
            return '<a href="' + link.href + '"' + target + '>' + link.label + '</a>';
          }).join('') +
        '</div>',
        '  </div>',
        '</div>'
      ].join('');
    }).join('');
  }

  normalizeMobileNav();

  function isDesktopHoverMode() {
    return desktopHoverQuery.matches;
  }

  function clearCloseTimer() {
    if (closeTimer) {
      window.clearTimeout(closeTimer);
      closeTimer = null;
    }
  }

  function getFirstTab($menu) {
    return $menu.find('.js-mm-tab').first();
  }

  function activatePane($tab) {
    if (!$tab.length) {
      return;
    }

    var paneId = $tab.data('pane');
    var $menu = $tab.closest('.oco-megamenu');

    if (!paneId || !$menu.length) {
      return;
    }

    $menu.find('.js-mm-tab').removeClass('is-active').attr('aria-current', 'false');
    $tab.addClass('is-active').attr('aria-current', 'page');
    $menu.find('.oco-megamenu__pane').removeClass('is-active');
    $('#' + paneId).addClass('is-active');
  }

  function closeAllMenus() {
    clearCloseTimer();
    $menus.hide();
    $searchPanel.hide();
    $navItems.removeClass('is-open');
    $navTriggers.attr('aria-expanded', 'false');
    $searchToggle.attr('aria-expanded', 'false');
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (character) {
      return ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      })[character];
    });
  }

  function clearSearchResults() {
    activeSearchIndex = -1;
    searchResults = [];
    if ($searchResults.length) {
      $searchResults.empty().attr('hidden', true);
    }
  }

  function normalizeToken(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function tokenize(value) {
    return normalizeToken(value).split(/\s+/).filter(Boolean);
  }

  function startsWithWord(haystack, needle) {
    var pattern = new RegExp('(?:^|\\s)' + needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    return pattern.test(haystack);
  }

  function levenshteinDistance(a, b) {
    var left = String(a || '');
    var right = String(b || '');
    if (left === right) return 0;
    if (!left.length) return right.length;
    if (!right.length) return left.length;

    var prev = new Array(right.length + 1);
    var curr = new Array(right.length + 1);
    var i;
    var j;

    for (j = 0; j <= right.length; j += 1) {
      prev[j] = j;
    }

    for (i = 1; i <= left.length; i += 1) {
      curr[0] = i;
      for (j = 1; j <= right.length; j += 1) {
        var cost = left.charAt(i - 1) === right.charAt(j - 1) ? 0 : 1;
        curr[j] = Math.min(
          curr[j - 1] + 1,
          prev[j] + 1,
          prev[j - 1] + cost
        );
      }
      for (j = 0; j <= right.length; j += 1) {
        prev[j] = curr[j];
      }
    }

    return prev[right.length];
  }

  function isNearMatch(term, candidate) {
    if (!term || !candidate) return false;
    var len = Math.max(term.length, candidate.length);
    if (len <= 4) return false;
    var distance = levenshteinDistance(term, candidate);
    return distance <= (len >= 8 ? 2 : 1);
  }

  function buildExpandedTerms(rawQuery) {
    var aliasMap = {
      ai: ['genai', 'artificial intelligence'],
      genai: ['ai', 'generative ai'],
      cases: ['case', 'case study', 'case studies'],
      pharma: ['pharmaceuticals', 'biopharmaceuticals'],
      biopharma: ['biopharmaceuticals', 'pharma'],
      biotech: ['emerging biotech'],
      medtech: ['medical devices'],
      contact: ['contact us', 'get in touch'],
      testimonial: ['testimonials', 'client proof'],
      proof: ['outcomes', 'enterprise proof'],
      analytics: ['measurement', 'insights']
    };

    var base = tokenize(rawQuery);
    var expanded = [];
    base.forEach(function (term) {
      expanded.push(term);
      (aliasMap[term] || []).forEach(function (alias) {
        tokenize(alias).forEach(function (token) {
          expanded.push(token);
        });
      });
    });
    return Array.from(new Set(expanded));
  }

  function normalizeHref(href) {
    var value = String(href || '').trim();
    if (!value) return '';
    return value.replace(/^Index\.html$/i, 'index.html');
  }

  function scoreSearchEntry(entry, rawQuery, expandedTerms) {
    var title = normalizeToken(entry.title);
    var meta = normalizeToken(entry.meta);
    var keywords = normalizeToken(entry.keywords);
    var haystack = (title + ' ' + meta + ' ' + keywords).trim();
    var titleTokens = tokenize(entry.title);
    var metaTokens = tokenize(entry.meta);
    var keywordTokens = tokenize(entry.keywords);
    var score = 0;
    var exactHits = 0;

    if (!expandedTerms.length) {
      return { score: 0, exactHits: 0 };
    }

    expandedTerms.forEach(function (term) {
      if (!term) return;
      var termHit = false;
      var shortToken = term.length <= 2;

      if (title === term) {
        score += 180;
        termHit = true;
      }

      if (shortToken ? titleTokens.indexOf(term) !== -1 : startsWithWord(title, term)) {
        score += 80;
        termHit = true;
      } else if (!shortToken && term.length >= 4 && title.indexOf(term) !== -1) {
        score += 45;
        termHit = true;
      }

      if (shortToken ? metaTokens.indexOf(term) !== -1 : startsWithWord(meta, term)) {
        score += 28;
        termHit = true;
      } else if (!shortToken && term.length >= 4 && meta.indexOf(term) !== -1) {
        score += 16;
        termHit = true;
      }

      if (shortToken ? keywordTokens.indexOf(term) !== -1 : keywords.indexOf(term) !== -1) {
        score += 12;
        termHit = true;
      }

      if (!termHit) {
        var fuzzy = titleTokens.some(function (token) {
          return isNearMatch(term, token);
        });
        if (!fuzzy) {
          fuzzy = tokenize(meta + ' ' + keywords).some(function (token) {
            return isNearMatch(term, token);
          });
        }
        if (fuzzy) {
          score += 9;
          termHit = true;
        }
      }

      if (termHit) {
        exactHits += 1;
      }
    });

    var normalizedQuery = normalizeToken(rawQuery);
    if (normalizedQuery && title.indexOf(normalizedQuery) !== -1) {
      score += 65;
    }
    if (normalizedQuery && haystack.indexOf(normalizedQuery) !== -1) {
      score += 40;
    }

    if (!exactHits) {
      score = 0;
    } else {
      score += Math.min(24, exactHits * 6);
    }

    return {
      score: score,
      exactHits: exactHits
    };
  }

  function performSearch(query) {
    var expandedTerms = buildExpandedTerms(query);
    var dedupeByHref = new Map();

    searchIndex.forEach(function (entry) {
      var href = normalizeHref(entry.href);
      if (!href) return;
      var metrics = scoreSearchEntry(entry, query, expandedTerms);
      if (metrics.score <= 0) return;

      var candidate = {
        title: entry.title,
        meta: entry.meta,
        href: href,
        score: metrics.score,
        exactHits: metrics.exactHits
      };

      var existing = dedupeByHref.get(href);
      if (!existing || candidate.score > existing.score) {
        dedupeByHref.set(href, candidate);
      }
    });

    return Array.from(dedupeByHref.values())
      .sort(function (a, b) {
        return b.score - a.score || b.exactHits - a.exactHits || a.title.localeCompare(b.title);
      })
      .slice(0, 8);
  }

  function renderSearchResults(query) {
    if (!$searchResults.length) {
      return;
    }

    if (!query || query.trim().length < 2) {
      clearSearchResults();
      return;
    }

    searchResults = performSearch(query);
    activeSearchIndex = searchResults.length ? 0 : -1;

    if (!searchResults.length) {
      $searchResults.html('<div class="oco-searchpanel__empty">No matching pages found. Try a broader keyword.</div>').attr('hidden', false);
      return;
    }

    $searchResults.html(searchResults.map(function (result, index) {
      return (
        '<a class="oco-searchpanel__result' + (index === activeSearchIndex ? ' is-active' : '') + '"' +
        ' href="' + escapeHtml(result.href) + '"' +
        ' data-search-result="' + index + '">' +
        '<span class="oco-searchpanel__result-title">' + escapeHtml(result.title) + '</span>' +
        '<span class="oco-searchpanel__result-meta">' + escapeHtml(result.meta) + '</span>' +
        '</a>'
      );
    }).join('')).attr('hidden', false);
  }

  function updateActiveSearchResult() {
    if (!$searchResults.length) {
      return;
    }

    $searchResults.find('.oco-searchpanel__result').removeClass('is-active');
    if (activeSearchIndex >= 0) {
      $searchResults.find('.oco-searchpanel__result').eq(activeSearchIndex).addClass('is-active');
    }
  }

  function navigateToSearchResult(index) {
    if (index < 0 || index >= searchResults.length) {
      return;
    }

    window.location.href = searchResults[index].href;
  }

  function openMenu($trigger) {
    var menuId = $trigger.data('menu');
    var $menu = $('#' + menuId);
    var $item = $trigger.closest('.oco-mainnav__navitem');

    if (!$menu.length || !$item.length) {
      return;
    }

    clearCloseTimer();
    $searchPanel.hide();
    $searchToggle.attr('aria-expanded', 'false');
    $menus.hide();
    $navItems.removeClass('is-open');
    $navTriggers.attr('aria-expanded', 'false');

    $menu.show();
    $item.addClass('is-open');
    $trigger.attr('aria-expanded', 'true');

    activatePane(getFirstTab($menu));
  }

  function scheduleDesktopClose() {
    if (!isDesktopHoverMode()) {
      return;
    }

    clearCloseTimer();
    closeTimer = window.setTimeout(function () {
      closeAllMenus();
    }, 120);
  }

  $navTriggers.on('click', function (e) {
    var $trigger = $(this);
    var $item = $trigger.closest('.oco-mainnav__navitem');
    var isOpen = $item.hasClass('is-open');

    e.preventDefault();

    if (isOpen) {
      closeAllMenus();
      return;
    }

    openMenu($trigger);
  });

  $navTriggers.on('mouseenter focusin', function () {
    if (!isDesktopHoverMode()) {
      return;
    }
    openMenu($(this));
  });

  // Plain nav items (no mega menu) must close any open menu when hovered.
  // Without this, moving from a trigger item (e.g. "Why Choose Us") to a
  // plain item (e.g. "Case Studies") keeps the previous is-open highlight
  // because neither the close timer nor openMenu() ever fires.
  $navItems.filter(function () {
    return !$(this).find('.js-nav-trigger').length;
  }).on('mouseenter', function () {
    if (!isDesktopHoverMode()) {
      return;
    }
    closeAllMenus();
  });

  $('.oco-header-sticky, .oco-megamenu').on('mouseenter', function () {
    clearCloseTimer();
  });

  $('.oco-header-sticky').on('mouseleave', function () {
    scheduleDesktopClose();
  });

  $(document).on('focusin', function (e) {
    var $target = $(e.target);
    if ($target.closest('.oco-header-sticky').length || $target.closest('.oco-megamenu').length) {
      return;
    }
    closeAllMenus();
  });

  $(document).on('mouseenter focusin', '.js-mm-tab', function () {
    if (!isDesktopHoverMode() && eTypeIsMouseEnter(arguments[0])) {
      return;
    }
    activatePane($(this));
  });

  function eTypeIsMouseEnter(event) {
    return event && event.type === 'mouseenter';
  }

  $(document).on('click', '.js-mm-tab', function (e) {
    var $tab = $(this);
    var href = $tab.attr('href') || '#';
    var hasRealHref = href !== '#';
    var isActive = $tab.hasClass('is-active');

    if (!hasRealHref) {
      e.preventDefault();
      activatePane($tab);
      return;
    }

    if (!isDesktopHoverMode() && !isActive) {
      e.preventDefault();
      activatePane($tab);
    }
  });

  $searchToggle.on('click', function (e) {
    var isVisible = $searchPanel.is(':visible');
    var $btn = $(this);

    e.preventDefault();
    closeAllMenus();

    if (!isVisible) {
      $searchPanel.show();
      $btn.attr('aria-expanded', 'true');
      window.setTimeout(function () {
        $searchInput.trigger('focus');
      }, 50);
    }
  });

  $searchInput.on('input', function () {
    renderSearchResults($(this).val());
  });

  $searchInput.on('keydown', function (e) {
    if (e.key === 'ArrowDown') {
      if (searchResults.length) {
        e.preventDefault();
        activeSearchIndex = (activeSearchIndex + 1) % searchResults.length;
        updateActiveSearchResult();
      }
      return;
    }

    if (e.key === 'ArrowUp') {
      if (searchResults.length) {
        e.preventDefault();
        activeSearchIndex = (activeSearchIndex - 1 + searchResults.length) % searchResults.length;
        updateActiveSearchResult();
      }
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (activeSearchIndex >= 0) {
        navigateToSearchResult(activeSearchIndex);
      } else {
        renderSearchResults($(this).val());
        if (searchResults.length) {
          navigateToSearchResult(0);
        }
      }
    }
  });

  $searchInput.on('search', function () {
    renderSearchResults($(this).val());
    if (searchResults.length) {
      navigateToSearchResult(activeSearchIndex >= 0 ? activeSearchIndex : 0);
    }
  });

  $searchSubmit.on('click', function () {
    renderSearchResults($searchInput.val());
    if (searchResults.length) {
      navigateToSearchResult(activeSearchIndex >= 0 ? activeSearchIndex : 0);
    }
  });

  $(document).on('mouseenter focusin', '[data-search-result]', function () {
    activeSearchIndex = Number($(this).attr('data-search-result'));
    updateActiveSearchResult();
  });

  $(document).on('mousedown', function (e) {
    var $target = $(e.target);
    if ($target.closest('.oco-mainnav').length || $target.closest('.oco-megamenu').length) {
      return;
    }
    closeAllMenus();
    clearSearchResults();
  });

  $(document).on('keydown', function (e) {
    if (e.key !== 'Escape' && e.keyCode !== 27) {
      return;
    }

    var $openItem = $('.oco-mainnav__navitem.is-open');
    if ($openItem.length) {
      var $trigger = $openItem.find('.js-nav-trigger').first();
      closeAllMenus();
      $trigger.trigger('focus');
      return;
    }

    if ($searchPanel.is(':visible')) {
      closeAllMenus();
      clearSearchResults();
      $searchToggle.trigger('focus');
    }
  });

}(jQuery));
