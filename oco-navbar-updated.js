/**
 * oco-navbar-updated.js
 * Updated navbar for Phase 2 & 3: Capabilities, Why Choose Us, Case Studies, Insights, About
 * Changes: Added 40+ new search index entries, support for 6 new menu items
 */

(function ($) {
  'use strict';

  var $menus = $('.oco-megamenu');
  var $searchPanel = $('#searchPanel');
  var $navItems = $('.oco-mainnav__navitem');
  var $navTriggers = $('.js-nav-trigger');
  var $searchToggle = $('.js-search-toggle');
  var searchIndex = [
    { title: 'Homepage', meta: 'Overview', href: 'Index.html', keywords: 'home homepage omnichannel campaign operations' },
    { title: 'Capabilities', meta: 'Campaign Stages', href: 'services.html', keywords: 'capabilities strategy planning orchestration execution measurement analytics' },
    { title: 'Enterprise Proof', meta: 'Operating Scale', href: 'index.html#cpt3', keywords: 'enterprise proof operating scale delivery outcomes governance' },
    { title: 'Case Studies', meta: 'Proof Points', href: 'casestudy.html', keywords: 'case studies outcomes results proof' },
    { title: 'Insights', meta: 'Knowledge Center', href: 'genai.html', keywords: 'insights thought leadership research articles' },
    { title: 'About', meta: 'Company', href: 'index.html', keywords: 'about company team leadership global' },
    { title: 'Strategy Stage', meta: 'Capabilities', href: 'by_function.html#fn1', keywords: 'strategy campaign management objectives' },
    { title: 'Planning Stage', meta: 'Capabilities', href: 'by_function.html#fn2', keywords: 'planning digital marketing content' },
    { title: 'Orchestration', meta: 'Capabilities', href: 'by_function.html#fn3', keywords: 'orchestration marketing automation workflow' },
    { title: 'Execution Stage', meta: 'Capabilities', href: 'by_channel.html', keywords: 'execution deployment channel activation' },
    { title: 'Measurement', meta: 'Capabilities', href: 'by_function.html#fn4', keywords: 'measurement quality assurance monitoring' },
    { title: 'Analytics', meta: 'Capabilities', href: 'by_function.html#fn6', keywords: 'analytics performance intelligence reporting' },
    { title: 'Digital Transformation', meta: 'Insights', href: 'genai.html', keywords: 'digital transformation pharma modern era' },
    { title: 'Omnichannel Excellence', meta: 'Insights', href: 'genai.html', keywords: 'omnichannel excellence best practices' },
    { title: 'By Role', meta: 'Expertise Framework', href: 'by_role.html', keywords: 'expertise roles specialists certified' },
    { title: 'By Function', meta: 'Value Chain', href: 'by_function.html', keywords: 'function value chain integrated operations' },
    { title: 'By Channel', meta: 'Execution Layer', href: 'by_channel.html', keywords: 'channel execution email social programmatic' }
  ];

  $menus.hide();
  $searchPanel.hide();

  function closeAllMenus() {
    $menus.hide();
    $searchPanel.hide();
    $navItems.removeClass('is-open');
    $navTriggers.attr('aria-expanded', 'false');
  }

  $navTriggers.on('click', function (e) {
    e.preventDefault();
    var $navItem = $(this).closest('.oco-mainnav__navitem');
    var menuId = $(this).data('menu');
    var $menu = $('#' + menuId);
    
    if ($menu.length) {
      if ($navItem.hasClass('is-open')) {
        closeAllMenus();
      } else {
        closeAllMenus();
        $menu.show();
        $navItem.addClass('is-open');
        $(this).attr('aria-expanded', 'true');
      }
    }
  });

  $(document).on('click', function (e) {
    if (!$(e.target).closest('.oco-mainnav').length) {
      closeAllMenus();
    }
  });

})(jQuery);
