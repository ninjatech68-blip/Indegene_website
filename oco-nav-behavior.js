/**
 * oco-nav-behavior.js
 * -----------------------------------------------------------
 * Supplemental shared navigation behavior.
 * Keeps only top utility bar scroll behavior so it does not
 * conflict with the interactive menu logic in oco-navbar.js.
 * -----------------------------------------------------------
 */

(function ($) {
  'use strict';

  var $topbar = $('.oco-topbar');
  var ticking = false;
  var hideThreshold = 60;

  if ($('.oco-header-sticky').length) {
    document.body.classList.add('has-sticky-header');
  }

  function handleTopbarScroll() {
    var currentScrollY = window.pageYOffset || document.documentElement.scrollTop;

    if (currentScrollY > hideThreshold) {
      $topbar.addClass('is-hidden');
    } else {
      $topbar.removeClass('is-hidden');
    }

    ticking = false;
  }

  window.addEventListener('scroll', function () {
    if (ticking) {
      return;
    }

    window.requestAnimationFrame(function () {
      handleTopbarScroll();
    });
    ticking = true;
  }, { passive: true });

}(jQuery));
