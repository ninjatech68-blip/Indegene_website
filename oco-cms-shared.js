(function (window, document) {
  'use strict';

  function setFeedbackMessage(node, text, stateClass) {
    if (!node) {
      return;
    }

    node.textContent = text || '';
    node.classList.remove('is-error', 'is-success');
    if (stateClass) {
      node.classList.add(stateClass);
    }
  }

  function slugifyTag(label) {
    return String(label || '')
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/^data-and-analytics$/, 'data-analytics');
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

  function setText(selector, value) {
    var node = document.querySelector(selector);
    if (node && typeof value === 'string' && value.trim()) {
      node.textContent = value;
    }
  }

  function setHtml(selector, value) {
    var node = document.querySelector(selector);
    if (node && typeof value === 'string' && value.trim()) {
      node.innerHTML = value;
    }
  }

  function setMetaContent(selector, value, attribute) {
    var node = document.querySelector(selector);
    if (node && typeof value === 'string' && value.trim()) {
      node.setAttribute(attribute || 'content', value);
    }
  }

  function updateDocumentTitle(value) {
    if (typeof value === 'string' && value.trim()) {
      document.title = value;
    }
  }

  function setLink(selector, label, href) {
    var node = document.querySelector(selector);
    if (!node) {
      return;
    }
    var icon = node.querySelector('i');
    if (label) {
      node.textContent = label;
      if (icon) {
        node.appendChild(document.createTextNode(' '));
        node.appendChild(icon);
      }
    }
    if (href) {
      node.setAttribute('href', href);
    }
  }

  function setScopedText(scope, selector, value) {
    if (!scope) return;
    var node = scope.querySelector(selector);
    if (node && typeof value === 'string' && value.trim()) {
      node.textContent = value;
    }
  }

  function setScopedHtml(scope, selector, value) {
    if (!scope) return;
    var node = scope.querySelector(selector);
    if (node && typeof value === 'string' && value.trim()) {
      node.innerHTML = value;
    }
  }

  function getSections(payload) {
    return (payload?.page?.sections || []).reduce(function (acc, section) {
      acc[section.sectionKey] = section;
      return acc;
    }, {});
  }

  function renderChips(container, chips) {
    if (!container || !Array.isArray(chips)) return;
    container.innerHTML = chips.map(function (chip) {
      return '<span class="oco-chip">' + escapeHtml(chip) + '</span>';
    }).join('');
  }

  function renderParagraphs(container, paragraphs) {
    if (!container || !Array.isArray(paragraphs)) return;
    container.innerHTML = paragraphs.map(function (paragraph) {
      return '<p>' + paragraph + '</p>';
    }).join('');
  }

  function renderWidgetLinks(container, links) {
    if (!container || !Array.isArray(links)) return;
    container.innerHTML = links.map(function (link) {
      return '<a class="oco-sidebar__link" href="' + escapeHtml(link.url) + '"><i class="bi bi-arrow-up-right"></i> ' + escapeHtml(link.label) + '</a>';
    }).join('');
  }

  function renderTextWithBreaks(value) {
    return escapeHtml(String(value || '')).replace(/\n/g, '<br>');
  }

  function renderFooterColumns(columns, cta) {
    if (!Array.isArray(columns)) return;
    var colNodes = document.querySelectorAll('.oco-footer__col');
    Array.prototype.forEach.call(colNodes, function (colNode, index) {
      var column = columns[index];
      if (!column) return;
      var title = colNode.querySelector('h5');
      var list = colNode.querySelector('ul');
      if (title) title.textContent = column.title;
      if (list) {
        list.innerHTML = (column.links || []).map(function (link) {
          return '<li><a href="' + escapeHtml(link.url) + '">' + escapeHtml(link.label) + '</a></li>';
        }).join('');
      }
    });

    if (cta) {
      Array.prototype.forEach.call(document.querySelectorAll('.oco-footer__cta'), function (node) {
        node.textContent = cta.label;
        node.setAttribute('href', cta.url);
      });
    }
  }

  function renderTopbarLinks(links) {
    if (!Array.isArray(links)) return;
    var wrap = document.querySelector('.oco-topbar__links');
    if (!wrap) return;
    wrap.innerHTML = links.map(function (link) {
      return '<a href="' + escapeHtml(link.url) + '" class="oco-topbar__link">' + escapeHtml(link.label) + '</a>';
    }).join('');
  }

  function renderHeaderMenu(items) {
    if (!Array.isArray(items)) return;
    var linkNodes = document.querySelectorAll('.oco-mainnav__nav .oco-mainnav__navlink');
    Array.prototype.forEach.call(linkNodes, function (node, index) {
      var item = items[index];
      if (!item) return;
      node.setAttribute('href', item.url);
      var hasChevron = !!node.querySelector('.bi-chevron-down');
      node.textContent = item.label;
      if (hasChevron) {
        node.insertAdjacentHTML('beforeend', ' <i class="bi bi-chevron-down" aria-hidden="true"></i>');
      }
    });
  }

  function renderHeaderCta(cta) {
    if (!cta || !cta.url) return;
    Array.prototype.forEach.call(document.querySelectorAll('.oco-mainnav__cta'), function (node) {
      node.setAttribute('href', cta.url);
      node.textContent = cta.label || node.textContent;
    });
  }

  function renderMobileNav(groups) {
    if (!Array.isArray(groups)) return;
    var accordion = document.getElementById('mobileAccordion');
    if (!accordion) return;
    accordion.innerHTML = groups.map(function (group, index) {
      var collapseId = 'mobCms' + index;
      return [
        '<div class="accordion-item">',
        '  <h2 class="accordion-header"><button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#' + collapseId + '">' + escapeHtml(group.label) + '</button></h2>',
        '  <div id="' + collapseId + '" class="accordion-collapse collapse" data-bs-parent="#mobileAccordion">',
        '    <div class="accordion-body">',
        (group.items || []).map(function (item) {
          return '<a href="' + escapeHtml(item.url) + '">' + escapeHtml(item.label) + '</a>';
        }).join(''),
        '    </div>',
        '  </div>',
        '</div>'
      ].join('');
    }).join('');
  }

  function logoSourceForClient(slug) {
    var map = {
      salesforce: 'https://www.salesforce.com/content/dam/web/en_us/www/images/home/bimi-salesforce-logo.svg',
      jira: 'https://commons.wikimedia.org/wiki/Special:FilePath/Jira%20Logo.svg',
      adobe: 'https://main--cc--adobecom.aem.live/cc-shared/assets/img/product-icons/svg/adobe-corp-logo-2024.svg',
      microsoft: 'https://commons.wikimedia.org/wiki/Special:FilePath/Microsoft%20logo.svg',
      infobip: 'https://cdn-web.infobip.com/uploads/2023/01/infobip-logo.svg',
      cvent: 'https://commons.wikimedia.org/wiki/Special:FilePath/Cvent-logo-2.png',
      on24: 'https://commons.wikimedia.org/wiki/Special:FilePath/ON24%20logo.png',
      spotme: 'https://spotme.com/wp-content/themes/spotme/assets/images/spotme-logo-color.svg'
    };
    return map[slug] || '';
  }

  function renderHomeTrustLogos(items) {
    var wrap = document.getElementById('homeTrustLogos');
    if (!wrap) return;
    var wall = wrap.querySelector('.oco-home-trust__logo-wall');
    if (!wall || !Array.isArray(items) || !items.length) {
      wrap.setAttribute('hidden', 'hidden');
      return;
    }

    wall.innerHTML = items.map(function (item) {
      var imageSrc = item.logo?.publicUrl || logoSourceForClient(item.slug);
      if (!imageSrc) return '';
      var logo = [
        '<img loading="lazy" decoding="async" src="' + escapeHtml(imageSrc) + '" alt="' + escapeHtml(item.name || 'Portfolio logo') + '">'
      ].join('');
      var content = item.websiteUrl
        ? '<a class="oco-home-trust__logo-item oco-partner-item--' + escapeHtml(item.slug || 'partner') + '" href="' + escapeHtml(item.websiteUrl) + '" target="_blank" rel="noreferrer">' + logo + '</a>'
        : '<div class="oco-home-trust__logo-item oco-partner-item--' + escapeHtml(item.slug || 'partner') + '">' + logo + '</div>';
      return content;
    }).join('');

    if (wall.innerHTML.trim()) {
      wrap.removeAttribute('hidden');
    } else {
      wrap.setAttribute('hidden', 'hidden');
    }
  }

  function renderTestimonials(items) {
    var track = document.querySelector('#clientTestimonials .oco-testimonial-band__track');
    if (!track || !Array.isArray(items) || !items.length) {
      return;
    }

    track.innerHTML = items.map(function (item) {
      var meta = [item.role, item.company].filter(Boolean).join(', ');
      return [
        '<article class="oco-testimonial-card" data-testimonial-card>',
        '  <span class="oco-testimonial-card__mark" aria-hidden="true">"</span>',
        '  <p class="oco-testimonial-card__body">' + escapeHtml(item.quote) + '</p>',
        '  <div class="oco-testimonial-card__meta">',
        '    <strong>' + escapeHtml(item.clientName) + '</strong>',
        '    <span>' + escapeHtml(meta) + '</span>',
        '  </div>',
        '</article>'
      ].join('');
    }).join('');
  }

  function iconForCaseStudy(tags) {
    var joined = (tags || []).join(' ').toLowerCase();
    if (joined.indexOf('integration') !== -1) return 'bi-plug';
    if (joined.indexOf('automation') !== -1) return 'bi-arrow-repeat';
    if (joined.indexOf('analytics') !== -1) return 'bi-bar-chart-line';
    if (joined.indexOf('enablement') !== -1) return 'bi-diagram-3';
    if (joined.indexOf('performance') !== -1) return 'bi-graph-up-arrow';
    return 'bi-bullseye';
  }

  function renderCaseStudies(items) {
    var grid = document.getElementById('caseStudyGrid');
    if (!grid || !Array.isArray(items) || !items.length) {
      return;
    }

    grid.innerHTML = items.map(function (item) {
      var tags = (item.tags || []).map(function (tagRef) {
        return tagRef.tag?.label || '';
      }).filter(Boolean);
      var tagSlugs = tags.map(slugifyTag).join(' ');
      var pageFile = item?.structuredData?.pageFile;
      var link = (pageFile && /\.html?$/i.test(pageFile) ? pageFile : '')
        || (item.sourceUrl && /\.html?$/i.test(item.sourceUrl) ? item.sourceUrl : '')
        || ('casestudy.html?case=' + encodeURIComponent(item.slug));

      return [
        '<article class="oco-case-card" data-tags="' + escapeHtml(tagSlugs) + '">',
        '  <div class="oco-case-card__icon"><i class="bi ' + iconForCaseStudy(tags) + '" aria-hidden="true"></i></div>',
        '  <h3 class="oco-case-card__title">' + escapeHtml(item.title) + '</h3>',
        '  <p class="oco-case-card__desc">' + escapeHtml(item.excerpt) + '</p>',
        '  <div class="oco-case-card__tags">',
        tags.map(function (tag) {
          return '<span class="oco-case-card__tag">' + escapeHtml(tag) + '</span>';
        }).join(''),
        '  </div>',
        '  <div class="oco-case-card__footer">',
        '    <a class="oco-link-arrow" href="' + escapeHtml(link) + '">View Case Study <i class="bi bi-arrow-right"></i></a>',
        '  </div>',
        '</article>'
      ].join('');
    }).join('');
  }

  function activateRevealNodes(scope) {
    var root = scope || document;
    Array.prototype.forEach.call(root.querySelectorAll('.js-reveal'), function (node) {
      node.classList.add('is-visible');
    });
  }

  function renderRelatedCaseStudies(items) {
    if (!Array.isArray(items) || !items.length) return;
    var widget = document.querySelector('.oco-sidebar__widget');
    if (!widget) return;
    var title = widget.querySelector('.oco-sidebar__widget-title');
    if (title) {
      title.textContent = 'Related Case Studies';
    }
    widget.innerHTML = [
      title ? title.outerHTML : '<p class="oco-sidebar__widget-title">Related Case Studies</p>',
      items.map(function (item) {
        var pageFile = item?.structuredData?.pageFile;
        var href = (pageFile && /\.html?$/i.test(pageFile) ? pageFile : '')
          || (item.sourceUrl && /\.html?$/i.test(item.sourceUrl) ? item.sourceUrl : '')
          || 'casestudy.html';
        return [
          '<a class="oco-sidebar__link" href="' + escapeHtml(href) + '">',
          '  <i class="bi bi-arrow-up-right"></i>',
          '  ' + escapeHtml(item.title),
          '</a>'
        ].join('');
      }).join('')
    ].join('');
    activateRevealNodes(widget);
  }

  window.OCOCMSShared = {
    activateRevealNodes: activateRevealNodes,
    escapeHtml: escapeHtml,
    getSections: getSections,
    logoSourceForClient: logoSourceForClient,
    renderCaseStudies: renderCaseStudies,
    renderChips: renderChips,
    renderFooterColumns: renderFooterColumns,
    renderHeaderCta: renderHeaderCta,
    renderHeaderMenu: renderHeaderMenu,
    renderHomeTrustLogos: renderHomeTrustLogos,
    renderMobileNav: renderMobileNav,
    renderParagraphs: renderParagraphs,
    renderRelatedCaseStudies: renderRelatedCaseStudies,
    renderTestimonials: renderTestimonials,
    renderTextWithBreaks: renderTextWithBreaks,
    renderTopbarLinks: renderTopbarLinks,
    renderWidgetLinks: renderWidgetLinks,
    setFeedbackMessage: setFeedbackMessage,
    setHtml: setHtml,
    setLink: setLink,
    setMetaContent: setMetaContent,
    setScopedHtml: setScopedHtml,
    setScopedText: setScopedText,
    setText: setText,
    slugifyTag: slugifyTag,
    updateDocumentTitle: updateDocumentTitle
  };
}(window, document));
