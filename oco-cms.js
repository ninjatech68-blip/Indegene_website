(function (window, document) {
  'use strict';

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
      || window.OCO_CMS_API_BASE
      || document.body?.dataset?.cmsApiBase
      || document.querySelector('meta[name="oco-cms-api-base"]')?.getAttribute('content')
      || window.localStorage?.getItem('oco-cms-api-base');

    if (explicit) {
      return explicit.replace(/\/$/, '');
    }

    if (window.location.hostname === 'localhost' && window.location.port === '8080') {
      return 'http://localhost:4000/api/public';
    }

    // Netlify review deployments should default to the hosted backend API.
    if (/\.netlify\.app$/i.test(window.location.hostname)) {
      return 'https://indegene-backend.onrender.com/api/public';
    }

    if (window.location.protocol.indexOf('http') === 0) {
      return window.location.origin.replace(/\/$/, '') + '/api/public';
    }

    return '';
  }

  var apiBase = getApiBase();
  var formsBase = apiBase ? apiBase.replace(/\/public$/, '/forms') : '';
  var bootstrapCache = {};
  var shared = window.OCOCMSShared || {};
  var activateRevealNodes = shared.activateRevealNodes;
  var escapeHtml = shared.escapeHtml;
  var getSections = shared.getSections;
  var renderCaseStudies = shared.renderCaseStudies;
  var renderChips = shared.renderChips;
  var renderFooterColumns = shared.renderFooterColumns;
  var renderHeaderCta = shared.renderHeaderCta;
  var renderHeaderMenu = shared.renderHeaderMenu;
  var renderHomeTrustLogos = shared.renderHomeTrustLogos;
  var renderMobileNav = shared.renderMobileNav;
  var renderParagraphs = shared.renderParagraphs;
  var renderRelatedCaseStudies = shared.renderRelatedCaseStudies;
  var renderTestimonials = shared.renderTestimonials;
  var renderTextWithBreaks = shared.renderTextWithBreaks;
  var renderTopbarLinks = shared.renderTopbarLinks;
  var renderWidgetLinks = shared.renderWidgetLinks;
  var setFeedbackMessage = shared.setFeedbackMessage;
  var setHtml = shared.setHtml;
  var setLink = shared.setLink;
  var setMetaContent = shared.setMetaContent;
  var setScopedHtml = shared.setScopedHtml;
  var setScopedText = shared.setScopedText;
  var setText = shared.setText;
  var updateDocumentTitle = shared.updateDocumentTitle;

  function getRecaptchaSiteKey() {
    return window.OCO_RECAPTCHA_SITE_KEY || '';
  }

  function runRecaptcha(action) {
    var siteKey = getRecaptchaSiteKey();
    if (!siteKey) {
      return Promise.resolve('');
    }

    if (!window.grecaptcha || typeof window.grecaptcha.execute !== 'function') {
      return Promise.reject(new Error('Spam protection is not available right now. Please try again shortly.'));
    }

    return new Promise(function (resolve, reject) {
      window.grecaptcha.ready(function () {
        window.grecaptcha.execute(siteKey, { action: action }).then(resolve).catch(function () {
          reject(new Error('Spam protection could not be completed. Please try again.'));
        });
      });
    });
  }

  function request(path, options) {
    if (!apiBase) {
      return Promise.reject(new Error('CMS API base is not configured'));
    }

    return fetch(apiBase + path, options).then(function (response) {
      if (!response.ok) {
        throw new Error('CMS request failed: ' + response.status);
      }
      return response.json();
    });
  }

  function postForm(path, payload) {
    if (!formsBase) {
      return Promise.reject(new Error('CMS forms base is not configured'));
    }

    return fetch(formsBase + path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    }).then(function (response) {
      if (!response.ok) {
        return response.json().catch(function () {
          return {};
        }).then(function (data) {
          throw new Error(data.message || 'Form submission failed');
        });
      }
      return response.json();
    });
  }

  function hydrateCommon(payload) {
    var settings = payload?.settings || {};

    if (settings['brand.tagline']) {
      Array.prototype.forEach.call(document.querySelectorAll('.oco-topbar__tag'), function (node) {
        node.textContent = settings['brand.tagline'];
      });
    }
    if (Array.isArray(settings['topbar.links'])) {
      renderTopbarLinks(settings['topbar.links']);
    }
    if (Array.isArray(settings['header.links'])) {
      renderHeaderMenu(settings['header.links']);
    }
    if (settings['header.cta'] && typeof settings['header.cta'] === 'object') {
      renderHeaderCta(settings['header.cta']);
    }
    if (Array.isArray(settings['mobile.nav'])) {
      renderMobileNav(settings['mobile.nav']);
    }
    if (Array.isArray(settings['footer.columns'])) {
      renderFooterColumns(settings['footer.columns'], settings['footer.cta']);
    }
    if (settings['footer.copy']) {
      setText('.oco-footer__brand p', settings['footer.copy']);
    }
    if (settings['legal.copyright']) {
      setText('.oco-footer__bottom p', settings['legal.copyright']);
    }
    if (settings['contact.primaryEmail']) {
      setText('.oco-contact-detail__value', settings['contact.primaryEmail']);
    }
    if (typeof settings['search.placeholder'] === 'string') {
      Array.prototype.forEach.call(document.querySelectorAll('.oco-searchpanel__input'), function (node) {
        node.setAttribute('placeholder', settings['search.placeholder']);
      });
    }
  }

  function hydrateHomepage(payload) {
    var page = payload?.page;
    var sections = getSections(payload);
    var hero = sections.hero || {};
    var alliances = sections['strategic-alliances'] || {};
    var purpose = sections.purpose || {};
    var services = sections.services || {};
    var genai = sections.genai || {};
    var cloudCatalogue = sections['cloud-services-catalogue'] || {};
    var trackRecord = sections['track-record'] || {};
    var testimonials = sections.testimonials || {};
    var newsletter = sections.newsletter || {};

    if (page) {
      setText('.oco-hero__eyebrow', page.heroKicker || page.title);
      setText('.oco-hero__title', page.heroTitle);
      setText('.oco-hero__sub', page.heroSubtitle);
      setLink('.oco-hero__actions .oco-btn-primary', page.heroPrimaryLabel, page.heroPrimaryUrl);
      setLink('.oco-hero__actions .oco-btn-ghost-white', page.heroSecondaryLabel, page.heroSecondaryUrl);
    }

    setText('#homeTrust .oco-overline', alliances.eyebrow);
    setText('#homeTrust .oco-section-title', alliances.heading);
    setText('#homeTrust .oco-section-sub', alliances.subheading);
    if (Array.isArray(alliances?.body?.signals)) {
      setHtml('#homeTrust .oco-home-trust__signals', alliances.body.signals.map(function (signal) {
        return '<span>' + escapeHtml(signal) + '</span>';
      }).join(''));
    }
    if (Array.isArray(alliances?.config?.cards)) {
      setHtml('#homeTrust .oco-home-trust__cards', alliances.config.cards.map(function (card) {
        return [
          '<article class="oco-home-trust__card">',
          '  <strong>' + escapeHtml(card.title || '') + '</strong>',
          '  <span>' + escapeHtml(card.body || '') + '</span>',
          '</article>'
        ].join('');
      }).join(''));
    }
    if (alliances?.config?.logosLabel) {
      setText('#homeTrust .oco-home-trust__logos-label', alliances.config.logosLabel);
    }

    if (Array.isArray(payload?.clients) && payload.clients.length) {
      renderHomeTrustLogos(payload.clients);
    } else {
      renderHomeTrustLogos([]);
    }

    setText('#homePurpose .oco-overline', purpose.eyebrow);
    setText('#homePurpose .oco-section-title', purpose.heading);
    setText('#homePurpose .oco-section-sub', purpose.subheading);
    renderChips(document.querySelector('#homePurpose .oco-chips'), purpose?.body?.chips);
    setText('#homePurpose .oco-home-reality__card--risk span', purpose?.body?.riskLabel);
    setText('#homePurpose .oco-home-reality__card--risk h3', purpose?.body?.riskTitle);
    setText('#homePurpose .oco-home-reality__card--risk p', purpose?.body?.riskBody || purpose?.body?.paragraphs?.[0]);
    setText('#homePurpose .oco-home-reality__card--answer span', purpose?.body?.answerLabel);
    setText('#homePurpose .oco-home-reality__card--answer h3', purpose?.body?.answerTitle);
    setText('#homePurpose .oco-home-reality__card--answer p', purpose?.body?.answerBody || purpose?.body?.paragraphs?.[1]);

    setText('#ourservices .oco-overline', services.eyebrow);
    setText('#ourservices .oco-section-title', services.heading);
    setText('#ourservices .oco-section-sub', services.subheading);
    if (Array.isArray(services?.config?.cards)) {
      setHtml('#ourservices .row.g-4', services.config.cards.map(function (card, index) {
        return [
          '<div class="col-12 col-lg-4 js-reveal is-d' + (index + 1) + '">',
          '  <div class="oco-service-card oco-home-path-card">',
          '    <div class="oco-service-card__icon"><i class="bi ' + escapeHtml(card.icon || '') + '"></i></div>',
          '    <h3>' + escapeHtml(card.title) + '</h3>',
          '    <p>' + escapeHtml(card.body) + '</p>',
          '    <a class="oco-link-arrow" href="' + escapeHtml(card.ctaUrl) + '">' + escapeHtml(card.ctaLabel) + ' <i class="bi bi-arrow-right" aria-hidden="true"></i></a>',
          '  </div>',
          '</div>'
        ].join('');
      }).join(''));
    }

    setText('#homeGenAI .oco-genai-eyebrow', genai.eyebrow);
    setText('#homeGenAI .oco-genai-title', genai.heading);
    setText('#homeGenAI .oco-genai-body', genai.subheading);
    setLink('#homeGenAI .genai-cta-btn-primary', genai.ctaLabel, genai.ctaUrl);
    setLink('#homeGenAI .genai-cta-btn-ghost', genai?.config?.secondaryCtaLabel, genai?.config?.secondaryCtaUrl);
    if (Array.isArray(genai?.config?.bullets)) {
      setHtml('#homeGenAI .genai-right-panel__list', genai.config.bullets.map(function (item) {
        return escapeHtml(item);
      }).join('<br>'));
    }

    setText('#cloudservicescatalogue .oco-overline', cloudCatalogue.eyebrow);
    setText('#cloudservicescatalogue .oco-section-title', cloudCatalogue.heading);
    setText('#cloudservicescatalogue .oco-section-sub', cloudCatalogue.subheading);
    if (Array.isArray(cloudCatalogue?.config?.tabs)) {
      Array.prototype.forEach.call(document.querySelectorAll('#cloudservicescatalogue .oco-cat-tab'), function (node, index) {
        var tab = cloudCatalogue.config.tabs[index];
        if (!tab) return;
        node.textContent = tab.tabLabel || tab.title || node.textContent;
      });
      Array.prototype.forEach.call(document.querySelectorAll('#cloudservicescatalogue .oco-cat-pane'), function (pane, index) {
        var tab = cloudCatalogue.config.tabs[index];
        if (!tab) return;
        var titleNode = pane.querySelector('.oco-cat-content h3');
        var bodyNode = pane.querySelector('.oco-cat-content p');
        var ctaNode = pane.querySelector('.oco-link-arrow');
        if (titleNode && tab.title) titleNode.textContent = tab.title;
        if (bodyNode && tab.body) bodyNode.textContent = tab.body;
        if (ctaNode) {
          setLink('#' + pane.id + ' .oco-link-arrow', tab.ctaLabel, tab.ctaUrl);
        }
      });
    }

    setText('#cpt3 .oco-overline', trackRecord.eyebrow);
    setText('#cpt3 .oco-section-title', trackRecord.heading);
    setText('#cpt3 .oco-section-sub', trackRecord.subheading);
    if (Array.isArray(trackRecord?.config?.items)) {
      Array.prototype.forEach.call(document.querySelectorAll('#cpt3 [data-home-result-card]'), function (cardNode, index) {
        var item = trackRecord.config.items[index];
        if (!item) return;
        var valueNode = cardNode.querySelector('.oco-stat-card__num');
        var titleNode = cardNode.querySelector('h3');
        var bodyNode = cardNode.querySelector('p');
        if (valueNode) {
          valueNode.innerHTML = escapeHtml(item.value || '') + (item.suffix ? '<span>' + escapeHtml(item.suffix) + '</span>' : '');
        }
        if (titleNode && item.title) titleNode.textContent = item.title;
        if (bodyNode && item.body) bodyNode.textContent = item.body;
      });
    }

    setText('#cpt2 .oco-overline', testimonials.eyebrow);
    setText('#cpt2 .oco-section-title', testimonials.heading);
    setText('#cpt2 .oco-section-sub', testimonials.subheading);
    if (Array.isArray(payload?.testimonials) && payload.testimonials.length) {
      renderTestimonials(payload.testimonials);
    }

    setText('#homeNewsletter .oco-overline', newsletter.eyebrow);
    setText('#homeNewsletter .oco-cta__title', newsletter.heading);
    setText('#homeNewsletter .oco-cta__sub', newsletter.subheading);
    if (newsletter?.config?.successMessage) {
      setText('#ctaEmailNote', newsletter.config.successMessage);
    }
  }

  function hydrateServices(payload) {
    var page = payload?.page;
    var sections = getSections(payload);
    var architecture = sections['service-architecture'] || {};
    var categories = sections['service-categories'] || {};
    var model = sections['service-model'] || {};
    var outcomes = sections['service-outcomes'] || {};
    var newsletter = sections.newsletter || {};

    if (page) {
      setText('.oco-page-banner__title', page.heroTitle);
      setText('.oco-page-banner__desc', page.heroSubtitle);
    }

    setText('#servicesArchitecture .oco-overline', architecture.eyebrow);
    setText('#servicesArchitecture .oco-wwd__lead', architecture.heading);
    renderChips(document.querySelector('#servicesArchitecture .oco-chips'), architecture?.body?.chips);
    renderParagraphs(document.querySelector('#servicesArchitecture .oco-wwd__body'), architecture?.body?.paragraphs);

    setText('#servicesCategories .oco-overline', categories.eyebrow);
    setText('#servicesCategories .oco-section-title', categories.heading);
    setText('#servicesCategories .oco-section-sub', categories.subheading);
    if (Array.isArray(categories?.config?.cards)) {
      setHtml('#servicesCategories .row.g-4', categories.config.cards.map(function (card) {
        return [
          '<div class="col-12 col-lg-4" id="' + escapeHtml(card.id || '') + '">',
          '  <div class="oco-service-card h-100">',
          '    <div class="oco-service-card__icon"><i class="bi ' + escapeHtml(card.icon || '') + '"></i></div>',
          '    <h3>' + escapeHtml(card.title) + '</h3>',
          '    <p>' + escapeHtml(card.body) + '</p>',
          '    <ul class="oco-service-card__list">',
          (card.points || []).map(function (point) {
            return '<li><i class="bi bi-check-circle-fill" aria-hidden="true"></i><span>' + escapeHtml(point) + '</span></li>';
          }).join(''),
          '    </ul>',
          '    <a class="oco-link-arrow" href="' + escapeHtml(card.ctaUrl) + '">' + escapeHtml(card.ctaLabel) + ' <i class="bi bi-arrow-right" aria-hidden="true"></i></a>',
          '  </div>',
          '</div>'
        ].join('');
      }).join(''));
    }

    setText('#servicesModel .oco-overline', model.eyebrow);
    setText('#servicesModel .oco-section-title', model.heading);
    setText('#servicesModel .oco-section-sub', model.subheading);
    if (Array.isArray(model?.config?.frames)) {
      setHtml('#servicesModel .row.g-4', model.config.frames.map(function (frame) {
        return [
          '<div class="col-12 col-md-6 col-xl-3">',
          '  <div class="oco-service-frame">',
          '    <div class="oco-service-frame__num">' + escapeHtml(frame.number) + '</div>',
          '    <h3>' + escapeHtml(frame.title) + '</h3>',
          '    <p>' + escapeHtml(frame.body) + '</p>',
          '  </div>',
          '</div>'
        ].join('');
      }).join(''));
    }

    if (Array.isArray(outcomes?.config?.items)) {
      setHtml('#servicesOutcomes .row.g-0', outcomes.config.items.map(function (item) {
        return [
          '<div class="col-12 col-md-3">',
          '  <div class="oco-service-band__item">',
          '    <div class="oco-service-band__num">' + escapeHtml(item.value) + (item.suffix ? '<span>' + escapeHtml(item.suffix) + '</span>' : '') + '</div>',
          '    <div class="oco-service-band__label">' + escapeHtml(item.label) + '</div>',
          '  </div>',
          '</div>'
        ].join('');
      }).join(''));
    }

    setText('#servicesNewsletter .oco-signup-strip__title', newsletter.heading);
    if (newsletter?.config?.placeholder) {
      var servicesNewsletterInput = document.querySelector('#servicesNewsletter .oco-signup-strip__input');
      if (servicesNewsletterInput) {
        servicesNewsletterInput.setAttribute('placeholder', newsletter.config.placeholder);
      }
    }
    if (newsletter?.config?.successMessage) {
      setText('#stripMsg', newsletter.config.successMessage);
    }
  }

  function hydrateEditorialPage(payload) {
    var page = payload?.page;
    var sections = getSections(payload);
    var overview = sections['editorial-overview'] || {};
    var listing = sections['editorial-listing'] || {};
    var related = sections['editorial-related'] || {};
    var sidebar = sections['editorial-sidebar'] || {};
    var signup = sections['editorial-signup'] || {};

    if (page) {
      setText('.oco-page-banner__title', page.heroTitle);
      setText('.oco-page-banner__desc', page.heroSubtitle);
    }

    setText('.oco-article__kicker', overview?.body?.kicker);
    setText('.oco-article__lead', overview.heading);
    setText('.oco-article__summary', overview.subheading);

    if (Array.isArray(listing?.config?.items)) {
      var validItems = listing.config.items.filter(function (item) {
        return item && (item.title || item.body);
      });
      Array.prototype.forEach.call(document.querySelectorAll('.oco-editorial-nav__item'), function (node, index) {
        var item = validItems[index];
        if (!item) return;
        node.textContent = item.navLabel || item.title;
        node.setAttribute('href', '#' + (item.anchor || ('item' + (index + 1))));
      });
      Array.prototype.forEach.call(document.querySelectorAll('.oco-editorial-item'), function (node, index) {
        var item = validItems[index];
        if (!item) return;
        setScopedText(node, '.oco-editorial-item__eyebrow', item.eyebrow);
        var heading = node.querySelector('h3');
        if (heading && item.title) {
          heading.textContent = item.title;
          if (item.anchor) heading.id = item.anchor;
        }
        setScopedText(node, 'p:last-child', item.body);
      });
      Array.prototype.forEach.call(document.querySelectorAll('.oco-usp-feature'), function (node, index) {
        var item = validItems[index];
        if (!item) return;
        var heading = node.querySelector('h5');
        if (heading && item.title) {
          heading.textContent = item.title;
          if (item.anchor) node.id = item.anchor;
        }
        setScopedText(node, '.oco-usp-feature__body p', item.body);
      });
    }

    if (related?.config) {
      setText('.oco-related-section__kicker', related.body?.kicker);
      setText('.oco-related-section__head h2', related.heading);
      setText('.oco-related-section__head p:last-child', related.subheading);
      Array.prototype.forEach.call(document.querySelectorAll('.oco-rel-card'), function (cardNode, index) {
        var card = related.config.cards?.[index];
        if (!card) return;
        setScopedText(cardNode, '.oco-rel-card__eyebrow', card.eyebrow);
        setScopedText(cardNode, 'h3', card.title);
        setScopedText(cardNode, '.oco-rel-card__body p:nth-of-type(2)', card.body);
        var linkNode = cardNode.querySelector('.oco-link-arrow');
        if (linkNode) {
          if (card.ctaLabel) {
            linkNode.innerHTML = escapeHtml(card.ctaLabel) + ' <i class="bi bi-arrow-right"></i>';
          }
          if (card.ctaUrl) {
            linkNode.setAttribute('href', card.ctaUrl);
          }
        }
      });
    }

    if (sidebar?.config) {
      setText('.oco-sidebar__cta-title', sidebar.heading);
      setText('.oco-sidebar__cta-text', sidebar.subheading);
      setLink('.oco-sidebar__cta .oco-btn-primary', sidebar.ctaLabel, sidebar.ctaUrl);
      setText('.oco-sidebar__widget-title', sidebar.body?.resourcesTitle);
      renderWidgetLinks(document.querySelector('.oco-sidebar__widget'), sidebar.config.resources);
      var widget = document.querySelector('.oco-sidebar__widget');
      if (widget && sidebar.body?.resourcesTitle) {
        widget.innerHTML = '<p class="oco-sidebar__widget-title">' + escapeHtml(sidebar.body.resourcesTitle) + '</p>' + widget.innerHTML;
      }
    }

    if (signup) {
      setText('.oco-signup__title', signup.heading);
      setText('.oco-signup__sub', signup.subheading);
      var input = document.querySelector('.oco-signup__input');
      if (input && signup?.config?.placeholder) {
        input.setAttribute('placeholder', signup.config.placeholder);
      }
    }
  }

  function hydrateSectionOverview(section) {
    if (!section) return;
    setText('.oco-wwd__grid .oco-overline', section.eyebrow);
    setText('.oco-wwd__grid .oco-wwd__lead', section.heading);
    renderChips(document.querySelector('.oco-wwd__grid .oco-chips'), section?.body?.chips);
    renderParagraphs(document.querySelector('.oco-wwd__grid .oco-wwd__body'), section?.body?.paragraphs);
  }

  function hydrateMetricBand(section) {
    if (!section) return;
    setText('.oco-outcome-band__title', section.heading);
    Array.prototype.forEach.call(document.querySelectorAll('.oco-outcome-stat'), function (statNode, index) {
      var item = section?.config?.items?.[index];
      if (!item) return;
      var numNode = statNode.querySelector('.oco-outcome-stat__num');
      if (numNode) {
        numNode.innerHTML = escapeHtml(item.value || '') + (item.suffix ? '<span>' + escapeHtml(item.suffix) + '</span>' : '');
      }
      setScopedText(statNode, '.oco-outcome-stat__label', item.label);
    });
  }

  function hydratePageCta(section) {
    if (!section) return;
    setText('.oco-page-cta__title', section.heading);
    setText('.oco-page-cta__sub', section.subheading);
    var links = document.querySelectorAll('.oco-page-cta a');
    if (links[0]) {
      links[0].setAttribute('href', section.ctaUrl || links[0].getAttribute('href'));
      if (section.ctaLabel) links[0].childNodes[0].nodeValue = section.ctaLabel + ' ';
    }
    if (links[1] && section?.config?.secondaryUrl) {
      links[1].setAttribute('href', section.config.secondaryUrl);
      if (section?.config?.secondaryLabel) links[1].childNodes[0].nodeValue = section.config.secondaryLabel + ' ';
    }
  }

  function hydrateGenericIndustryPage(payload) {
    var page = payload?.page;
    var sections = getSections(payload);
    var summary = sections['operating-reality'] || {};
    var context = sections['commercial-context'] || {};
    var challenges = sections['execution-friction'] || {};
    var priorities = sections['operating-priorities'] || {};
    var outcomes = sections['business-outcomes'] || {};
    var cta = sections['next-step'] || {};

    if (page) {
      setText('.oco-inner-hero__eyebrow', page.heroKicker);
      setText('.oco-inner-hero__title', page.heroTitle);
      setText('.oco-inner-hero__sub', page.heroSubtitle);
      setLink('.oco-hero__actions .oco-btn-primary', page.heroPrimaryLabel, page.heroPrimaryUrl);
      setLink('.oco-hero__actions .oco-btn-ghost-white', page.heroSecondaryLabel, page.heroSecondaryUrl);
    }

    var summaryRoot = document.querySelector('.oco-segment-summary');
    if (summaryRoot) {
      setScopedText(summaryRoot, '.oco-segment-summary__eyebrow', summary.eyebrow);
      setScopedText(summaryRoot, '.oco-segment-summary__title', summary.heading);
      setScopedText(summaryRoot, '.oco-segment-summary__copy', summary?.body?.lead);
      Array.prototype.forEach.call(summaryRoot.querySelectorAll('.oco-segment-summary__pill'), function (node, index) {
        if (summary?.body?.chips?.[index]) node.textContent = summary.body.chips[index];
      });
      Array.prototype.forEach.call(summaryRoot.querySelectorAll('.oco-segment-summary__card'), function (node, index) {
        var card = summary?.config?.cards?.[index];
        if (!card) return;
        setScopedText(node, 'strong', card.title);
        setScopedText(node, 'p', card.body);
      });
    }

    hydrateSectionOverview(context);

    var challengeRoot = document.querySelector('.oco-challenge-grid');
    if (challengeRoot) {
      var challengeSection = challengeRoot.closest('.oco-section');
      var groupedCards = (challenges?.config?.cards || []).reduce(function (acc, card) {
        var parts = String(card.title || '').split(':');
        var group = parts.length > 1 ? parts[0].trim() : '';
        var title = parts.length > 1 ? parts.slice(1).join(':').trim() : card.title;
        if (!acc[group]) acc[group] = [];
        acc[group].push({ title: title, body: card.body });
        return acc;
      }, {});
      var groupNames = Object.keys(groupedCards).filter(Boolean);
      var leftItems = groupedCards[groupNames[0]] || [];
      var rightItems = groupedCards[groupNames[1]] || [];

      setScopedText(challengeSection, '.text-center .oco-overline', challenges.eyebrow);
      setScopedText(challengeSection, '.text-center .oco-section-title', challenges.heading);
      setScopedText(challengeSection, '.text-center .oco-section-sub', challenges.subheading);
      if (challengeRoot.children[0] && groupNames[0]) setScopedText(challengeRoot.children[0], 'p', groupNames[0]);
      if (challengeRoot.children[1] && groupNames[1]) setScopedText(challengeRoot.children[1], 'p', groupNames[1]);
      Array.prototype.forEach.call(challengeRoot.children[0]?.querySelectorAll('.oco-challenge-item') || [], function (node, index) {
        var item = leftItems[index];
        if (!item) return;
        setScopedText(node, '.oco-h6', item.title);
        setScopedText(node, 'p', item.body);
      });
      Array.prototype.forEach.call(challengeRoot.children[1]?.querySelectorAll('.oco-challenge-item') || [], function (node, index) {
        var item = rightItems[index];
        if (!item) return;
        setScopedText(node, '.oco-h6', item.title);
        setScopedText(node, 'p', item.body);
      });
    }

    var prioritiesRoot = document.querySelector('.oco-industry-route-stack');
    if (prioritiesRoot) {
      var prioritiesSection = prioritiesRoot.closest('.oco-section');
      setScopedText(prioritiesSection, '.oco-overline', priorities.eyebrow);
      setScopedText(prioritiesSection, '.oco-section-title', priorities.heading);
      setScopedText(prioritiesSection, '.oco-section-sub', priorities.subheading);
      Array.prototype.forEach.call(prioritiesRoot.querySelectorAll('.oco-industry-route'), function (node, index) {
        var card = priorities?.config?.cards?.[index];
        if (!card) return;
        setScopedText(node, '.oco-industry-route__eyebrow', card.eyebrow);
        setScopedText(node, '.oco-industry-route__title', card.title);
        setScopedText(node, '.oco-industry-route__copy', card.body);
        Array.prototype.forEach.call(node.querySelectorAll('.oco-industry-route__item'), function (itemNode, itemIndex) {
          var point = card.points?.[itemIndex];
          if (!point) return;
          var parts = String(point).split(':');
          setScopedText(itemNode, 'strong', parts[0]?.trim());
          setScopedText(itemNode, 'span', parts.slice(1).join(':').trim());
        });
      });
    }

    hydrateMetricBand(outcomes);
    hydratePageCta(cta);

    var ctaLinks = document.querySelectorAll('.oco-page-cta a');
    var secondaryCard = cta?.config?.cards?.[0];
    if (ctaLinks[1] && secondaryCard?.ctaUrl) {
      ctaLinks[1].setAttribute('href', secondaryCard.ctaUrl);
      if (secondaryCard.ctaLabel) ctaLinks[1].childNodes[0].nodeValue = secondaryCard.ctaLabel + ' ';
    }
  }

  function hydrateGenericCapabilityPage(payload) {
    var page = payload?.page;
    var sections = getSections(payload);
    var summary = sections['capability-summary'] || {};
    var thesis = sections['capability-thesis'] || {};
    var nextStep = sections['next-step'] || {};
    var detailSections = Object.keys(sections).map(function (key) { return sections[key]; }).filter(function (section) {
      return section && ['capability-summary', 'capability-thesis', 'next-step'].indexOf(section.sectionKey) === -1;
    });

    if (page) {
      setText('.oco-page-banner__eyebrow', page.heroKicker);
      setText('.oco-page-banner__title', page.heroTitle);
      setText('.oco-page-banner__desc', page.heroSubtitle);
    }

    var bannerPanel = document.querySelector('.oco-page-banner__panel');
    if (bannerPanel) {
      setScopedText(bannerPanel, '.oco-page-banner__panel-kicker', summary.eyebrow);
      setScopedText(bannerPanel, '.oco-page-banner__panel-title', summary.heading);
      setScopedText(bannerPanel, '.oco-page-banner__panel-copy', summary?.body?.lead);
      Array.prototype.forEach.call(bannerPanel.querySelectorAll('.oco-page-banner__panel-chip'), function (node, index) {
        if (summary?.body?.chips?.[index]) node.textContent = summary.body.chips[index];
      });
      Array.prototype.forEach.call(bannerPanel.querySelectorAll('.oco-page-banner__panel-item'), function (node, index) {
        var card = summary?.config?.cards?.[index];
        if (!card) return;
        setScopedText(node, 'strong', card.title);
        setScopedText(node, 'p', card.body);
      });
    }

    var thesisRoot = document.querySelector('.oco-stage-strip');
    if (thesisRoot) {
      setScopedText(thesisRoot, '.oco-stage-strip__eyebrow', thesis.eyebrow);
      setScopedText(thesisRoot, '.oco-stage-strip__title', thesis.heading);
      setScopedText(thesisRoot, '.oco-stage-strip__copy', thesis?.body?.lead);
      Array.prototype.forEach.call(thesisRoot.querySelectorAll('.oco-stage-strip__card'), function (node, index) {
        var card = thesis?.config?.cards?.[index];
        if (!card) return;
        setScopedText(node, 'strong', card.title);
        setScopedText(node, 'p', card.body);
      });
    }

    Array.prototype.forEach.call(document.querySelectorAll('.oco-cap-stage__section'), function (node, index) {
      var section = detailSections[index];
      if (!section) return;
      setScopedText(node, '.oco-cap-stage__section-kicker', section.eyebrow);
      if (section.heading) setScopedText(node, '.oco-cap-stage__section-title', section.heading);
      if (section?.body?.lead) setScopedText(node, '.oco-cap-stage__section-copy', section.body.lead);
      Array.prototype.forEach.call(node.querySelectorAll('.oco-proof-column'), function (cardNode, cardIndex) {
        var card = section?.config?.cards?.[cardIndex];
        if (!card) return;
        setScopedText(cardNode, 'h3', card.title);
        setScopedText(cardNode, 'p', card.body);
      });
      Array.prototype.forEach.call(node.querySelectorAll('.oco-proof-list__item'), function (cardNode, cardIndex) {
        var card = section?.config?.cards?.[cardIndex];
        if (!card) return;
        setScopedText(cardNode, 'strong', card.title);
        setScopedText(cardNode, 'span', card.body);
      });
      if (section.ctaLabel) {
        var linkNode = node.querySelector('.oco-cap-stage__text-link');
        if (linkNode) {
          linkNode.innerHTML = escapeHtml(section.ctaLabel) + ' <i class="bi bi-arrow-right" aria-hidden="true"></i>';
          if (section.ctaUrl) linkNode.setAttribute('href', section.ctaUrl);
        }
      }
    });

    var nextStepRoot = document.querySelector('.oco-proof-cta-strip');
    if (nextStepRoot) {
      setScopedText(nextStepRoot, '.oco-overline', nextStep.eyebrow);
      setScopedText(nextStepRoot, '.oco-proof-cta-strip__title', nextStep.heading);
      var ctaLinks = nextStepRoot.querySelectorAll('a');
      if (ctaLinks[0] && nextStep.ctaUrl) {
        ctaLinks[0].setAttribute('href', nextStep.ctaUrl);
        if (nextStep.ctaLabel) ctaLinks[0].childNodes[0].nodeValue = nextStep.ctaLabel + ' ';
      }
      var secondaryCard = nextStep?.config?.cards?.[0];
      if (ctaLinks[1] && secondaryCard?.ctaUrl) {
        ctaLinks[1].setAttribute('href', secondaryCard.ctaUrl);
        if (secondaryCard.ctaLabel) ctaLinks[1].childNodes[0].nodeValue = secondaryCard.ctaLabel + ' ';
      }
    }
  }

  function hydrateContact(payload) {
    var page = payload?.page;
    var sections = getSections(payload);
    var intro = sections['contact-intro'] || {};
    var cards = sections['contact-cards'] || {};
    var form = sections['contact-form'] || {};

    if (page) {
      setText('.oco-page-banner__title', page.heroTitle);
      setText('.oco-page-banner__desc', page.heroSubtitle);
    }

    setText('#contactIntro .oco-overline', intro.eyebrow);
    setText('#contactIntro .oco-wwd__lead', intro.heading);
    renderChips(document.querySelector('#contactIntro .oco-chips'), intro?.body?.chips);
    renderParagraphs(document.querySelector('#contactIntro .oco-wwd__body'), intro?.body?.paragraphs);

    if (Array.isArray(cards?.config?.cards)) {
      var currentImages = Array.prototype.map.call(document.querySelectorAll('#contactCards .oco-inquiry-card__img'), function (node) {
        return { src: node.getAttribute('src'), alt: node.getAttribute('alt') };
      });
      setHtml('#contactCards .row.g-4', cards.config.cards.map(function (card, index) {
        var image = currentImages[index] || {};
        return [
          '<div class="col-12 col-md-4">',
          '  <div class="oco-inquiry-card">',
          image.src ? '    <img class="oco-inquiry-card__img" src="' + escapeHtml(image.src) + '" alt="' + escapeHtml(image.alt || card.title) + '">' : '',
          '    <div class="oco-inquiry-card__body">',
          '      <h3>' + escapeHtml(card.title) + '</h3>',
          '      <p>' + escapeHtml(card.body) + '</p>',
          '      <a class="oco-link-arrow" href="' + escapeHtml(card.ctaUrl) + '">' + escapeHtml(card.ctaLabel) + ' <i class="bi bi-arrow-right"></i></a>',
          '    </div>',
          '  </div>',
          '</div>'
        ].join('');
      }).join(''));
    }

    setText('#contact-form .oco-overline', form.eyebrow);
    setText('#contact-form .oco-section-title', form.heading);
    setText('#contact-form .oco-contact-section__sub', form.subheading);
    setText('#contact-form .oco-contact-page-form__lead', form?.body?.lead);
    if (Array.isArray(form?.config?.details)) {
      setHtml('#contact-form .oco-contact-detail-list', form.config.details.map(function (item, index) {
        var icons = ['bi-envelope', 'bi-globe', 'bi-telephone'];
        return [
          '<div class="oco-contact-detail">',
          '  <div class="oco-contact-detail__icon"><i class="bi ' + icons[index % icons.length] + '"></i></div>',
          '  <div>',
          '    <div class="oco-contact-detail__label">' + escapeHtml(item.label) + '</div>',
          '    <div class="oco-contact-detail__value">' + escapeHtml(item.value) + '</div>',
          '  </div>',
          '</div>'
        ].join('');
      }).join(''));
    }
    if (form?.config?.successMessage) {
      setText('#formSuccess', form.config.successMessage);
    }
  }

  function hydrateCaseStudyPage(payload) {
    var page = payload?.page;
    var sections = getSections(payload);
    var intro = sections['library-intro'] || {};

    if (page) {
      setText('.oco-page-banner__title', page.heroTitle);
      setText('.oco-page-banner__desc', page.heroSubtitle);
    }

    setText('#caseLibraryIntro .oco-overline', intro.eyebrow);
    setText('#caseLibraryIntro .oco-wwd__lead', intro.heading);
    renderChips(document.querySelector('#caseLibraryIntro .oco-chips'), intro?.body?.chips);
    if (Array.isArray(intro?.body?.paragraphs)) {
      setHtml('#caseLibraryIntro .oco-wwd__body', [
        intro.body.paragraphs[0] ? '<p>' + intro.body.paragraphs[0] + '</p>' : '',
        intro.body.paragraphs[1] ? '<p class="oco-case-library__summary">' + intro.body.paragraphs[1] + '</p>' : ''
      ].join(''));
    }

    if (Array.isArray(payload?.caseStudies) && payload.caseStudies.length) {
      renderCaseStudies(payload.caseStudies);
    }
  }

  function getCurrentPageFile() {
    return (window.location.pathname.split('/').pop() || '').trim();
  }

  function hydrateCaseStudyDetailChrome(payload) {
    var sections = getSections(payload);
    var sidebar = sections['detail-sidebar'] || {};
    var signup = sections['editorial-signup'] || {};
    if (sidebar) {
      setText('.oco-sidebar__cta-title', sidebar.heading);
      setText('.oco-sidebar__cta-text', sidebar.subheading);
      setLink('.oco-sidebar__cta .oco-btn-primary', sidebar.ctaLabel, sidebar.ctaUrl);
    }
    if (signup) {
      setText('.oco-signup__title', signup.heading);
      setText('.oco-signup__sub', signup.subheading);
      var input = document.querySelector('.oco-signup__input');
      if (input && signup?.config?.placeholder) {
        input.setAttribute('placeholder', signup.config.placeholder);
      }
    }
  }

  function hydrateCaseStudyDetail(item, meta) {
    if (!item) return;

    setText('.oco-page-banner__breadcrumb span:last-child', item.title);
    setText('.oco-page-banner__title', item.title);
    updateDocumentTitle(item.seoTitle || item.title);
    setMetaContent('meta[name="description"]', item.seoDescription || item.excerpt);
    setMetaContent('meta[property="og:title"]', item.seoTitle || item.title);
    setMetaContent('meta[property="og:description"]', item.seoDescription || item.excerpt);
    setMetaContent('meta[name="twitter:title"]', item.seoTitle || item.title);
    setMetaContent('meta[name="twitter:description"]', item.seoDescription || item.excerpt);

    if (typeof item.content === 'string' && item.content.trim().length > 500) {
      setHtml('.oco-inner-page__main', item.content);
      activateRevealNodes(document.querySelector('.oco-inner-page__main'));
    }

    if (Array.isArray(meta?.relatedCaseStudies) && meta.relatedCaseStudies.length) {
      renderRelatedCaseStudies(meta.relatedCaseStudies);
    }
  }

  function fetchCaseStudyBySource(pageFile) {
    if (!pageFile || !apiBase) {
      return Promise.resolve(null);
    }
    return request('/case-studies/by-source?source=' + encodeURIComponent(pageFile)).then(function (response) {
      return {
        item: response.data || null,
        meta: response.meta || {}
      };
    });
  }

  function hydrateResourcesPage(payload) {
    var page = payload?.page;
    var sections = getSections(payload);
    if (!page) return;
    setText('.oco-genai-hero__eyebrow', page.heroKicker || page.title);
    setHtml('.oco-genai-hero__title', escapeHtml(page.heroTitle).replace(/\bGenAI\b/, '<em>GenAI</em>'));
    setText('.oco-genai-hero__sub', page.heroSubtitle);
    setLink('.oco-genai-hero__actions .oco-btn-primary', page.heroPrimaryLabel, page.heroPrimaryUrl);
    setLink('.oco-genai-hero__actions .oco-btn-secondary-light', page.heroSecondaryLabel, page.heroSecondaryUrl);

    var hero = sections.hero || {};
    if (Array.isArray(hero?.body?.pills)) {
      setHtml('.oco-genai-hero__meta', hero.body.pills.map(function (pill) {
        return '<span class="oco-genai-pill"><i class="bi ' + escapeHtml(pill.icon || '') + '"></i> ' + escapeHtml(pill.label) + '</span>';
      }).join(''));
    }
  }

  function renderGenaiDemo(config) {
    if (!config || !Array.isArray(config.modes)) return;
    var modeMap = {};
    config.modes.forEach(function (mode) {
      modeMap[mode.key] = mode;
    });

    function applyMode(key) {
      var data = modeMap[key];
      if (!data) return;
      setText('#demoLabel', data.label);
      setText('#demoTitle', data.title);
      setText('#demoBody', data.body);
      setText('#demoMetricLabel', data.metricLabel);
      setText('#demoMetricValue', data.metricValue);
      var artboard = document.getElementById('demoArtboard');
      if (artboard && data.mode) artboard.setAttribute('data-mode', data.mode);
      setHtml('#demoPoints', (data.points || []).map(function (point) {
        return '<li><i class="bi bi-check-circle-fill" aria-hidden="true"></i><span>' + escapeHtml(point) + '</span></li>';
      }).join(''));
      Array.prototype.forEach.call(document.querySelectorAll('#demoArtboard .oco-genai-artboard__metric span'), function (node, index) {
        node.style.setProperty('--metric-width', data.metrics?.[index] || '50%');
      });
    }

    Array.prototype.forEach.call(document.querySelectorAll('.oco-genai-demo__trigger'), function (node, index) {
      var mode = config.modes[index];
      if (!mode) return;
      var strong = node.querySelector('strong');
      var span = node.querySelector('span');
      if (strong) strong.textContent = mode.triggerTitle;
      if (span) span.textContent = mode.triggerBody;
      node.dataset.demo = mode.key;
      node.addEventListener('click', function () {
        Array.prototype.forEach.call(document.querySelectorAll('.oco-genai-demo__trigger'), function (btn) {
          btn.classList.remove('is-active');
          btn.setAttribute('aria-pressed', 'false');
        });
        node.classList.add('is-active');
        node.setAttribute('aria-pressed', 'true');
        applyMode(mode.key);
      });
    });

    if (config.modes[0]) {
      applyMode(config.modes[0].key);
    }
  }

  function hydrateGenaiPage(payload) {
    hydrateResourcesPage(payload);
    var sections = getSections(payload);
    var overview = sections['genai-overview'] || {};
    var switcher = sections['genai-switcher'] || {};
    var prompt = sections['genai-prompt-library'] || {};
    var agentforce = sections['genai-agentforce'] || {};
    var demo = sections['genai-demo'] || {};
    var dataBand = sections['genai-data-band'] || {};
    var cta = sections['genai-cta'] || {};

    var overviewRoot = document.querySelector('.oco-genai-overview');
    if (overviewRoot) {
      setScopedText(overviewRoot, '.oco-overline', overview.eyebrow);
      setScopedText(overviewRoot, '.oco-section-title', overview.heading);
      var subs = overviewRoot.querySelectorAll('.oco-section-sub');
      if (subs[0] && overview.subheading) subs[0].textContent = overview.subheading;
      if (subs[1] && overview?.body?.secondary) subs[1].textContent = overview.body.secondary;
      Array.prototype.forEach.call(overviewRoot.querySelectorAll('.oco-genai-stack-card'), function (node, index) {
        var item = overview?.config?.cards?.[index];
        if (!item) return;
        setScopedText(node, 'h3', item.title);
        setScopedText(node, 'p', item.body);
      });
    }

    var switcherRoot = document.querySelector('.oco-genai-switcher');
    if (switcherRoot) {
      var switchWrap = switcherRoot.parentElement;
      setScopedText(switchWrap, '.oco-overline', switcher.eyebrow);
      setScopedText(switchWrap, '.oco-section-title', switcher.heading);
      setScopedText(switchWrap, '.oco-section-sub', switcher.subheading);
      Array.prototype.forEach.call(switcherRoot.querySelectorAll('.oco-genai-switcher__card'), function (node, index) {
        var item = switcher?.config?.cards?.[index];
        if (!item) return;
        setScopedText(node, '.oco-genai-switcher__eyebrow', item.eyebrow);
        setScopedText(node, 'h3', item.title);
        setScopedText(node, 'p', item.body);
        node.setAttribute('href', item.url || node.getAttribute('href'));
        Array.prototype.forEach.call(node.querySelectorAll('.oco-genai-switcher__meta span'), function (spanNode, metaIndex) {
          if (item.meta?.[metaIndex]) spanNode.textContent = item.meta[metaIndex];
        });
      });
    }

    var promptRoot = document.getElementById('prompt-library');
    if (promptRoot) {
      setScopedText(promptRoot, '.oco-overline', prompt.eyebrow);
      setScopedText(promptRoot, '.oco-section-title', prompt.heading);
      setScopedText(promptRoot, '.oco-section-sub', prompt.subheading);
      var promptPanels = promptRoot.querySelectorAll('.oco-genai-story__panel');
      if (promptPanels[0]) {
        setScopedText(promptPanels[0], 'h3', prompt?.body?.leftTitle);
        Array.prototype.forEach.call(promptPanels[0].querySelectorAll('.oco-genai-story__point'), function (node, index) {
          var item = prompt?.config?.leftPoints?.[index];
          if (!item) return;
          setScopedText(node, 'strong', item.title);
          setScopedText(node, 'p', item.body);
        });
        Array.prototype.forEach.call(promptPanels[0].querySelectorAll('.oco-genai-story__tile'), function (node, index) {
          var item = prompt?.config?.tiles?.[index];
          if (!item) return;
          setScopedText(node, 'strong', item.title);
          setScopedText(node, 'span', item.body);
        });
      }
      if (promptPanels[1]) {
        setScopedText(promptPanels[1], 'h3', prompt?.body?.rightTitle);
        Array.prototype.forEach.call(promptPanels[1].querySelectorAll('.oco-genai-story__point'), function (node, index) {
          var item = prompt?.config?.rightPoints?.[index];
          if (!item) return;
          setScopedText(node, 'strong', item.title);
          setScopedText(node, 'p', item.body);
        });
      }
    }

    var agentforceRoot = document.getElementById('agentforce');
    if (agentforceRoot) {
      setScopedText(agentforceRoot, '.oco-overline', agentforce.eyebrow);
      setScopedText(agentforceRoot, '.oco-section-title', agentforce.heading);
      setScopedText(agentforceRoot, '.oco-section-sub', agentforce.subheading);
      Array.prototype.forEach.call(agentforceRoot.querySelectorAll('.oco-genai-offer'), function (node, index) {
        var item = agentforce?.config?.cards?.[index];
        if (!item) return;
        setScopedText(node, 'h3', item.title);
        setScopedText(node, 'p', item.body);
        Array.prototype.forEach.call(node.querySelectorAll('.oco-genai-offer__list li span'), function (spanNode, pointIndex) {
          if (item.points?.[pointIndex]) spanNode.textContent = item.points[pointIndex];
        });
      });
    }

    var demoRoot = document.getElementById('demo');
    if (demoRoot) {
      setScopedText(demoRoot, '.oco-overline', demo.eyebrow);
      setScopedText(demoRoot, '.oco-section-title', demo.heading);
      setScopedText(demoRoot, '.oco-section-sub', demo.subheading);
      renderGenaiDemo(demo.config);
    }

    var dataRoot = document.querySelector('.oco-genai-data-band');
    if (dataRoot) {
      var dataWrap = dataRoot.closest('.oco-section');
      setScopedText(dataWrap, '.oco-overline', dataBand.eyebrow);
      setScopedText(dataWrap, '.oco-section-title', dataBand.heading);
      setScopedText(dataWrap, '.oco-section-sub', dataBand.subheading);
      Array.prototype.forEach.call(dataRoot.querySelectorAll('.oco-genai-data-band__item'), function (node, index) {
        var item = dataBand?.config?.items?.[index];
        if (!item) return;
        var numNode = node.querySelector('.oco-genai-data-band__num');
        if (numNode) {
          numNode.innerHTML = escapeHtml(item.value || '') + (item.suffix ? '<span>' + escapeHtml(item.suffix) + '</span>' : '');
        }
        setScopedText(node, '.oco-genai-data-band__label', item.label);
      });
    }

    if (cta) {
      setText('.oco-genai-cta__title', cta.heading);
      setText('.oco-genai-cta__sub', cta.subheading);
      setLink('.oco-genai-cta .oco-btn-primary', cta.ctaLabel, cta.ctaUrl);
    }
  }

  function bindNewsletterForm(config) {
    var input = document.querySelector(config.inputSelector);
    var button = document.querySelector(config.buttonSelector);
    var message = document.querySelector(config.messageSelector);
    if (!input || !button) {
      return;
    }

    function showMessage(text, isError) {
      if (!message) return;
      setFeedbackMessage(message, text, isError ? 'is-error' : 'is-success');
      message.style.display = 'block';
      message.style.color = isError ? '#ffd5d5' : '';
    }

    function submitNewsletter() {
      var value = String(input.value || '').trim();
      var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRe.test(value)) {
        input.setAttribute('aria-invalid', 'true');
        input.style.borderColor = '#dc3545';
        showMessage('Please enter a valid email address.', true);
        return;
      }

      input.removeAttribute('aria-invalid');
      input.style.borderColor = '';

      if (!formsBase) {
        input.value = '';
        showMessage('Thanks for subscribing!', false);
        return;
      }

      button.disabled = true;
      runRecaptcha('newsletter_submit').then(function (token) {
        return postForm('/newsletter', {
          email: value,
          sourcePage: config.sourcePage || window.location.pathname,
          recaptchaToken: token || undefined
        });
      }).then(function () {
        input.value = '';
        showMessage('Thanks for subscribing!', false);
      }).catch(function (error) {
        showMessage(error.message || 'Unable to submit right now.', true);
      }).finally(function () {
        button.disabled = false;
      });
    }

    button.addEventListener('click', function () {
      submitNewsletter();
    });

    if (input.form) {
      input.form.addEventListener('submit', function (event) {
        event.preventDefault();
        submitNewsletter();
      });
    }
  }

  function bindSiteShellForms() {
    var newsletterForm = document.querySelector('[data-site-newsletter-form]');
    if (newsletterForm && !newsletterForm.dataset.boundNewsletterForm) {
      newsletterForm.dataset.boundNewsletterForm = 'true';

      var newsletterInput = newsletterForm.querySelector('input[name="email"]');
      var newsletterButton = newsletterForm.querySelector('button[type="submit"]');
      var newsletterMessage = newsletterForm.parentElement && newsletterForm.parentElement.querySelector('[data-form-feedback]');

      if (newsletterInput && newsletterButton && newsletterMessage) {
        bindNewsletterForm({
          inputSelector: '#' + newsletterInput.id,
          buttonSelector: '[data-site-newsletter-form] button[type="submit"]',
          messageSelector: '[data-site-newsletter-form] + [data-form-feedback]',
          sourcePage: newsletterForm.querySelector('input[name="sourcePage"]')?.value || window.location.pathname
        });
      }
    }

    var contactForm = document.querySelector('[data-site-contact-form]');
    if (contactForm && !contactForm.dataset.boundContactForm) {
      contactForm.dataset.boundContactForm = 'true';

      var feedback = contactForm.parentElement && contactForm.parentElement.querySelector('[data-form-feedback]');
      var submit = contactForm.querySelector('button[type="submit"]');

      contactForm.addEventListener('submit', function (event) {
        var fullName = String(contactForm.querySelector('[name="fullName"]')?.value || '').trim();
        var email = String(contactForm.querySelector('[name="email"]')?.value || '').trim();
        var message = String(contactForm.querySelector('[name="message"]')?.value || '').trim();
        var phone = String(contactForm.querySelector('[name="phone"]')?.value || '').trim();
        var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        var phoneRe = /^[0-9+\-() ]{7,30}$/;

        event.preventDefault();

        if (!fullName || fullName.length < 2) {
          setFeedbackMessage(feedback, 'Please enter your full name.', 'is-error');
          return;
        }

        if (!emailRe.test(email)) {
          setFeedbackMessage(feedback, 'Please enter a valid work email address.', 'is-error');
          return;
        }

        if (!message || message.length < 10) {
          setFeedbackMessage(feedback, 'Please provide a little more detail so the inquiry can be routed correctly.', 'is-error');
          return;
        }

        if (phone && !phoneRe.test(phone)) {
          setFeedbackMessage(feedback, 'Please enter a valid phone number.', 'is-error');
          return;
        }

        if (submit) {
          submit.disabled = true;
        }
        setFeedbackMessage(feedback, 'Submitting your inquiry...', '');

        runRecaptcha('contact_submit').then(function (token) {
          return postForm('/contact', {
            fullName: fullName,
            email: email,
            company: String(contactForm.querySelector('[name="company"]')?.value || '').trim(),
            phone: phone,
            message: message,
            sourcePage: contactForm.querySelector('[name="sourcePage"]')?.value || window.location.pathname,
            recaptchaToken: token || undefined
          });
        }).then(function () {
          contactForm.reset();
          setFeedbackMessage(feedback, 'Thank you. Your inquiry has been received and will be routed to the relevant team.', 'is-success');
        }).catch(function (error) {
          setFeedbackMessage(feedback, error.message || 'Unable to submit your inquiry right now. Please try again shortly.', 'is-error');
        }).finally(function () {
          if (submit) {
            submit.disabled = false;
          }
        });
      });
    }
  }

  function fetchBootstrap(slug) {
    if (!apiBase) {
      return Promise.resolve(null);
    }
    if (!bootstrapCache[slug]) {
      bootstrapCache[slug] = request('/bootstrap/' + slug).then(function (response) {
        return response.data || null;
      });
    }
    return bootstrapCache[slug];
  }

  function detectPageSlug() {
    var path = (window.location.pathname.split('/').pop() || '').toLowerCase();
    var pageMap = {
      '': 'home',
      'index.html': 'home',
      'services.html': 'services',
      'casestudy.html': 'case-studies',
      'contactus.html': 'contact',
      'genai.html': 'resources',
      'biopharmaceuticals.html': 'biopharmaceuticals',
      'emerging-biotech.html': 'emerging-biotech',
      'medical-devices.html': 'medical-devices',
      'animal-health.html': 'animal-health',
      'strategy.html': 'strategy',
      'planning.html': 'planning',
      'orchestration.html': 'orchestration',
      'execution.html': 'execution',
      'measurement.html': 'measurement',
      'analytics.html': 'analytics',
      'by_role.html': 'by-role',
      'by_channel.html': 'by-channel',
      'by_function.html': 'by-function',
      'indegene revitalizes.html': 'indegene-revitalizes'
    };
    return document.body?.dataset?.cmsPage || pageMap[path] || '';
  }

  function detectCaseStudyDetailFile() {
    var pageFile = getCurrentPageFile();
    if (!pageFile || pageFile.toLowerCase() === 'casestudy.html') {
      return '';
    }
    if (/^case-study-.*\.html$/i.test(pageFile) || /^indegene revitalizes\.html$/i.test(pageFile)) {
      return pageFile;
    }
    return '';
  }

  function hydrateStandardPage(payload) {
    var page = payload?.page;
    if (!page) return;
    setText('.oco-page-banner__title', page.heroTitle);
    setText('.oco-page-banner__desc', page.heroSubtitle);
    setText('.oco-page-banner__label', page.heroKicker);
    setText('.oco-inner-hero__eyebrow', page.heroKicker);
    setText('.oco-inner-hero__title', page.heroTitle);
    setText('.oco-inner-hero__sub', page.heroSubtitle);
    setLink('.oco-hero__actions .oco-btn-primary', page.heroPrimaryLabel, page.heroPrimaryUrl);
    setLink('.oco-hero__actions .oco-btn-ghost-white', page.heroSecondaryLabel, page.heroSecondaryUrl);
  }

  function hydrateCurrentPage() {
    var detailFile = detectCaseStudyDetailFile();
    if (detailFile && apiBase) {
      return Promise.all([
        fetchCaseStudyBySource(detailFile),
        fetchBootstrap('indegene-revitalizes').catch(function () { return null; })
      ]).then(function (results) {
        var payload = results[0];
        var chromePayload = results[1];
        if (chromePayload) {
          hydrateCommon(chromePayload);
          hydrateCaseStudyDetailChrome(chromePayload);
        }
        if (!payload || !payload.item) return null;
        hydrateCaseStudyDetail(payload.item, payload.meta);
        return payload;
      }).catch(function (error) {
        console.warn('[OCO CMS] Case study detail hydration skipped:', error.message);
        return null;
      });
    }

    var slug = detectPageSlug();
    if (!slug || !apiBase) {
      return Promise.resolve(null);
    }

    return fetchBootstrap(slug).then(function (payload) {
      if (!payload) return null;
      hydrateCommon(payload);
      if (slug === 'home') hydrateHomepage(payload);
      if (slug === 'services') hydrateServices(payload);
      if (slug === 'contact') hydrateContact(payload);
      if (slug === 'case-studies') hydrateCaseStudyPage(payload);
      if (slug === 'resources') hydrateGenaiPage(payload);
      if ([
        'biopharmaceuticals',
        'emerging-biotech',
        'medical-devices',
        'animal-health'
      ].indexOf(slug) !== -1) {
        hydrateGenericIndustryPage(payload);
      }
      if ([
        'strategy',
        'planning',
        'orchestration',
        'execution',
        'measurement',
        'analytics',
        'by-role',
        'by-channel',
        'by-function'
      ].indexOf(slug) !== -1) {
        hydrateGenericCapabilityPage(payload);
      }
      if ([
        'indegene-revitalizes'
      ].indexOf(slug) !== -1) {
        hydrateStandardPage(payload);
      }
      return payload;
    }).catch(function (error) {
      console.warn('[OCO CMS] Hydration skipped:', error.message);
      return null;
    });
  }

  window.OCOCMS = {
    apiBase: apiBase,
    formsBase: formsBase,
    request: request,
    postForm: postForm,
    fetchBootstrap: fetchBootstrap,
    hydrateCurrentPage: hydrateCurrentPage,
    hydrateHomepage: hydrateHomepage,
    hydrateServices: hydrateServices,
    hydrateContact: hydrateContact,
    hydrateCaseStudyPage: hydrateCaseStudyPage,
    hydrateResourcesPage: hydrateResourcesPage,
    hydrateStandardPage: hydrateStandardPage,
    bindNewsletterForm: bindNewsletterForm,
    renderTestimonials: renderTestimonials,
    renderCaseStudies: renderCaseStudies,
    renderPartnerSpotlight: renderHomeTrustLogos
  };

  document.addEventListener('DOMContentLoaded', function () {
    hydrateCurrentPage();
    bindSiteShellForms();

    bindNewsletterForm({
      inputSelector: '#ctaEmail',
      buttonSelector: '.oco-email-wrap__btn',
      messageSelector: '.oco-cta__note',
      sourcePage: '/Index.html'
    });

    bindNewsletterForm({
      inputSelector: '#stripEmail',
      buttonSelector: '#stripSubmit',
      messageSelector: '#stripMsg',
      sourcePage: '/services.html'
    });

    if (document.querySelector('.oco-signup__form')) {
      var signupInput = document.querySelector('.oco-signup__input');
      var signupButton = document.querySelector('.oco-signup__btn');
      if (signupInput && signupButton) {
        var feedback = document.createElement('p');
        feedback.className = 'oco-feedback-note';
        feedback.style.marginTop = '12px';
        document.querySelector('.oco-signup').appendChild(feedback);
        bindNewsletterForm({
          inputSelector: '.oco-signup__input',
          buttonSelector: '.oco-signup__btn',
          messageSelector: '.oco-signup .oco-feedback-note',
          sourcePage: window.location.pathname
        });
      }
    }
  });
}(window, document));
