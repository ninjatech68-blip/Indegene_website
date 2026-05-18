/**
 * oco-contact-modal.js
 * -----------------------------------------------------------
 * Shared contact form validation and reusable contact modal.
 * - Enhances the full contact page form
 * - Injects a lightweight contact modal on non-contact pages
 * - Reuses the same validation patterns and success handling
 * -----------------------------------------------------------
 */

(function ($) {
  'use strict';

  var focusableSelector = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
  var modalId = 'ocoContactModal';
  var modalFormId = 'ocoContactQuickForm';
  var modalSuccessId = 'ocoContactQuickSuccess';
  var modalErrorId = 'ocoContactQuickError';
  var submitBusyLabel = 'Sending... <i class="bi bi-hourglass-split" aria-hidden="true"></i>';

  function trimValue(value) {
    return (value || '').trim();
  }

  function validateMinLength(value, min) {
    return trimValue(value).length >= min;
  }

  function validateEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimValue(value));
  }

  function validatePhone(value) {
    var cleaned = trimValue(value).replace(/[\s().-]/g, '');
    if (!cleaned) {
      return true;
    }
    return /^\+?[0-9]{7,15}$/.test(cleaned);
  }

  function setFieldError($field, $error, isInvalid) {
    if (!$field.length || !$error.length) {
      return;
    }

    $field.toggleClass('is-invalid', isInvalid);
    if (!isInvalid && trimValue($field.val())) {
      $field.addClass('is-valid');
    } else if (isInvalid) {
      $field.removeClass('is-valid');
    } else {
      $field.removeClass('is-valid');
    }
    $error.toggleClass('is-shown', isInvalid);
  }

  function toggleMessage($el, show) {
    if (!$el.length) {
      return;
    }
    $el.toggleClass('is-shown', show);
    $el.stop(true, true)[show ? 'fadeIn' : 'fadeOut'](show ? 200 : 160);
  }

  function resolveUrl(href) {
    try {
      return new URL(href, window.location.href);
    } catch (error) {
      return null;
    }
  }

  function isContactPageHref(href) {
    if (!href) {
      return false;
    }

    var url = resolveUrl(href);
    if (!url) {
      return false;
    }

    return /\/contactus(?:\.html)?$/i.test(url.pathname);
  }

  function shouldOpenContactModal($trigger) {
    if ($trigger.is('[data-contact-modal="true"], .js-contact-modal')) {
      return true;
    }

    var href = $trigger.attr('href') || $trigger.attr('data-href');
    if (!isContactPageHref(href)) {
      return false;
    }

    if ($trigger.closest('header, .oco-header, .oco-mainnav, .oco-footer, .oco-mobile-nav, .oco-contact-modal').length) {
      return false;
    }

    if (window.location && /\/contactus(?:\.html)?$/i.test(window.location.pathname)) {
      return false;
    }

    return $trigger.closest('main').length > 0;
  }

  function bindInputValidation($form, fieldConfigs) {
    fieldConfigs.forEach(function (config) {
      if (!config.id || !config.errId) {
        return;
      }

      var $field = $form.find('#' + config.id);
      var $error = $form.find('#' + config.errId);

      if (!$field.length || !$error.length) {
        return;
      }

      var eventName = $field.is('textarea, input[type="text"], input[type="email"], input[type="tel"]') ? 'input blur' : 'change blur';
      $field.on(eventName, function () {
        if (!trimValue($field.val()) && !config.required) {
          setFieldError($field, $error, false);
          return;
        }
        setFieldError($field, $error, !config.validate($field.val()));
      });
    });
  }

  function buildSubmitState($submitBtn) {
    if (!$submitBtn.length) {
      return {
        enable: function () {},
        disable: function () {}
      };
    }

    var defaultLabel = $submitBtn.html();
    return {
      disable: function () {
        $submitBtn.prop('disabled', true).html(submitBusyLabel);
      },
      enable: function () {
        $submitBtn.prop('disabled', false).html(defaultLabel);
      }
    };
  }

  function setupContactForm($form, config) {
    if (!$form.length || $form.data('contactBound')) {
      return;
    }

    var $success = $form.find(config.successSelector);
    var $error = $form.find(config.errorSelector);
    var submitState = buildSubmitState($form.find(config.submitSelector));
    var fieldConfigs = config.fields || [];
    var extraValidators = config.extraValidators || [];

    $form.data('contactBound', true);
    if ($success.length) {
      $success.hide().removeClass('is-shown');
    }
    if ($error.length) {
      $error.hide().removeClass('is-shown');
    }

    bindInputValidation($form, fieldConfigs);

    extraValidators.forEach(function (validator) {
      if (validator.bind) {
        validator.bind($form);
      }
    });

    $form.on('submit', function (e) {
      var isValid = true;
      e.preventDefault();

      toggleMessage($success, false);
      toggleMessage($error, false);

      fieldConfigs.forEach(function (fieldConfig) {
        var $field = $form.find('#' + fieldConfig.id);
        var $error = $form.find('#' + fieldConfig.errId);
        var fieldValid = fieldConfig.validate($field.val());

        setFieldError($field, $error, !fieldValid);
        if (!fieldValid) {
          isValid = false;
        }
      });

      extraValidators.forEach(function (validator) {
        if (!validator.validate($form)) {
          isValid = false;
        }
      });

      if (!isValid) {
        var $firstInvalid = $form.find('.oco-form-control.is-invalid').first();
        if ($firstInvalid.length && $form.closest('#' + modalId).length === 0) {
          $('html, body').animate({ scrollTop: $firstInvalid.offset().top - 120 }, 350);
        } else if ($firstInvalid.length) {
          $firstInvalid.trigger('focus');
        }
        return;
      }

      submitState.disable();

      var payload = typeof config.getPayload === 'function'
        ? config.getPayload($form)
        : null;
      var submitPromise = window.OCOCMS && typeof config.submitWithCms === 'function'
        ? config.submitWithCms(payload, $form)
        : Promise.resolve();

      submitPromise.then(function () {
        $form[0].reset();
        $form.find('.oco-form-control').removeClass('is-invalid is-valid');
        $form.find('.oco-field-error').removeClass('is-shown').hide();
        submitState.enable();
        toggleMessage($success, true);
        if (config.onSuccess) {
          config.onSuccess($form, $success);
        }
      }).catch(function (error) {
        submitState.enable();
        toggleMessage($success, false);
        if ($error.length) {
          $error.text(error && error.message ? error.message : 'We could not submit your enquiry right now. Please try again shortly.').show();
          toggleMessage($error, true);
        }
      });
    });
  }

  function createRadioValidator(groupName, errorId) {
    return {
      bind: function ($form) {
        $form.find('input[name="' + groupName + '"]').on('change', function () {
          $form.find('#' + errorId).removeClass('is-shown').hide();
        });
      },
      validate: function ($form) {
        var hasChecked = $form.find('input[name="' + groupName + '"]:checked').length > 0;
        $form.find('#' + errorId).toggleClass('is-shown', !hasChecked)[!hasChecked ? 'show' : 'hide']();
        return hasChecked;
      }
    };
  }

  function createCheckboxValidator(fieldId, errorId) {
    return {
      bind: function ($form) {
        $form.find('#' + fieldId).on('change', function () {
          if ($(this).is(':checked')) {
            $form.find('#' + errorId).removeClass('is-shown').hide();
          }
        });
      },
      validate: function ($form) {
        var isChecked = $form.find('#' + fieldId).is(':checked');
        $form.find('#' + errorId).toggleClass('is-shown', !isChecked)[!isChecked ? 'show' : 'hide']();
        return isChecked;
      }
    };
  }

  function injectModal() {
    if (document.getElementById(modalId)) {
      return $('#' + modalId);
    }

    var modalHtml = [
      '<div class="oco-contact-modal" id="' + modalId + '" aria-hidden="true">',
      '  <div class="oco-contact-modal__backdrop" data-contact-close="true"></div>',
      '  <div class="oco-contact-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="ocoContactModalTitle" aria-describedby="ocoContactModalSub">',
      '    <div class="oco-contact-modal__header">',
      '      <div>',
      '        <div class="oco-contact-modal__eyebrow">Contact Us</div>',
      '        <h2 class="oco-contact-modal__title" id="ocoContactModalTitle">Start a conversation with our team</h2>',
      '        <p class="oco-contact-modal__sub" id="ocoContactModalSub">Share a few details and we will connect you with the appropriate specialists.</p>',
      '      </div>',
      '      <button type="button" class="oco-contact-modal__close" aria-label="Close contact form" data-contact-close="true">',
      '        <i class="bi bi-x-lg" aria-hidden="true"></i>',
      '      </button>',
      '    </div>',
      '    <div class="oco-contact-modal__body">',
      '      <form class="oco-contact-modal__form" id="' + modalFormId + '" novalidate>',
      '        <div class="row">',
      '          <div class="col-12 col-md-6">',
      '            <label class="oco-form-label" for="contact-modal-name">Full Name <span class="oco-required oco-required--inline">*</span></label>',
      '            <input type="text" class="oco-form-control" id="contact-modal-name" placeholder="Your full name" autocomplete="name" aria-describedby="contact-modal-name-error">',
      '            <span class="oco-field-error" id="contact-modal-name-error">Please enter your full name using at least 2 characters.</span>',
      '          </div>',
      '          <div class="col-12 col-md-6">',
      '            <label class="oco-form-label" for="contact-modal-email">Email Address <span class="oco-required oco-required--inline">*</span></label>',
      '            <input type="email" class="oco-form-control" id="contact-modal-email" placeholder="name@example.com" autocomplete="email" inputmode="email" aria-describedby="contact-modal-email-error">',
      '            <span class="oco-field-error" id="contact-modal-email-error">Please enter a valid email address.</span>',
      '          </div>',
      '          <div class="col-12">',
      '            <label class="oco-form-label" for="contact-modal-message">Message <span class="oco-required oco-required--inline">*</span></label>',
      '            <textarea class="oco-form-control" id="contact-modal-message" rows="4" placeholder="Tell us how we can help." aria-describedby="contact-modal-message-error"></textarea>',
      '            <span class="oco-field-error" id="contact-modal-message-error">Please enter at least 10 characters so we can route your enquiry correctly.</span>',
      '          </div>',
      '          <div class="col-12">',
      '            <div class="oco-contact-modal__actions">',
      '              <button type="submit" class="oco-btn-primary" id="contact-modal-submit">Submit <i class="bi bi-arrow-right" aria-hidden="true"></i></button>',
      '            </div>',
      '            <div class="oco-form-success" id="' + modalSuccessId + '" role="alert" aria-live="polite">',
      '              <i class="bi bi-check-circle-fill oco-inline-icon" aria-hidden="true"></i>',
      '              Thank you. Your message has been received and our team will respond shortly.',
      '            </div>',
      '            <div class="oco-form-error" id="' + modalErrorId + '" role="alert" aria-live="polite">',
      '              <i class="bi bi-exclamation-circle-fill oco-inline-icon" aria-hidden="true"></i>',
      '              We could not submit your enquiry right now. Please try again shortly.',
      '            </div>',
      '            <p class="oco-contact-modal__note">By submitting this form, you agree to be contacted regarding your enquiry.</p>',
      '          </div>',
      '        </div>',
      '      </form>',
      '    </div>',
      '  </div>',
      '</div>'
    ].join('');

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    return $('#' + modalId);
  }

  function setupModalBehavior($modal) {
    if (!$modal.length || $modal.data('modalBound')) {
      return;
    }

    var lastFocusedElement = null;

    function getFocusableElements() {
      return $modal.find(focusableSelector).filter(':visible');
    }

    function closeModal() {
      $modal.removeClass('is-open').attr('aria-hidden', 'true');
      $('body').removeClass('oco-no-scroll');
      $(document).off('keydown.ocoContactModal');
      if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
        lastFocusedElement.focus();
      }
    }

    function handleTrapFocus(e) {
      if (e.key !== 'Tab') {
        return;
      }

      var $focusable = getFocusableElements();
      if (!$focusable.length) {
        e.preventDefault();
        return;
      }

      var first = $focusable.get(0);
      var last = $focusable.get($focusable.length - 1);

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    function openModal(triggerEl) {
      lastFocusedElement = triggerEl || document.activeElement;
      $modal.addClass('is-open').attr('aria-hidden', 'false');
      $('body').addClass('oco-no-scroll');
      window.setTimeout(function () {
        $modal.find('#contact-modal-name').trigger('focus');
      }, 30);
      $(document).on('keydown.ocoContactModal', function (e) {
        if (e.key === 'Escape' || e.keyCode === 27) {
          closeModal();
          return;
        }
        handleTrapFocus(e);
      });
    }

    $(document).on('click', 'a[href], button[data-href]', function (e) {
      var $trigger = $(this);
      var href = $trigger.attr('href') || $trigger.attr('data-href');

      if (!isContactPageHref(href) || !shouldOpenContactModal($trigger)) {
        return;
      }

      if (document.getElementById('contactForm')) {
        return;
      }
      e.preventDefault();

      if ($trigger.closest('#mobileNavModal').length && window.bootstrap) {
        var mobileNavEl = document.getElementById('mobileNavModal');
        var mobileNav = window.bootstrap.Modal.getInstance(mobileNavEl);

        if (mobileNav) {
          $(mobileNavEl).one('hidden.bs.modal', function () {
            openModal($trigger.get(0));
          });
          mobileNav.hide();
          return;
        }
      }

      openModal(this);
    });

    $modal.on('click', '[data-contact-close="true"]', function () {
      closeModal();
    });

    $modal.on('mousedown', function (e) {
      if ($(e.target).is('.oco-contact-modal__backdrop')) {
        closeModal();
      }
    });

    setupContactForm($('#' + modalFormId), {
      submitSelector: '#contact-modal-submit',
      successSelector: '#' + modalSuccessId,
      errorSelector: '#' + modalErrorId,
      getPayload: function ($form) {
        return {
          fullName: $form.find('#contact-modal-name').val(),
          email: $form.find('#contact-modal-email').val(),
          message: $form.find('#contact-modal-message').val(),
          sourcePage: window.location.pathname
        };
      },
      submitWithCms: function (payload) {
        if (!window.OCOCMS || typeof window.OCOCMS.postForm !== 'function') {
          return Promise.reject(new Error('The contact form service is not configured on this deployment.'));
        }
        return window.OCOCMS.postForm('/contact', payload).catch(function () {
          throw new Error('The contact form service is not connected on this deployment. Please connect the backend API or use the full contact page.');
        });
      },
      fields: [
        {
          id: 'contact-modal-name',
          errId: 'contact-modal-name-error',
          validate: function (value) { return validateMinLength(value, 2); }
        },
        {
          id: 'contact-modal-email',
          errId: 'contact-modal-email-error',
          validate: function (value) { return validateEmail(value); }
        },
        {
          id: 'contact-modal-message',
          errId: 'contact-modal-message-error',
          validate: function (value) { return validateMinLength(value, 10); }
        }
      ],
      onSuccess: function ($form, $success) {
        window.setTimeout(function () {
          toggleMessage($success, false);
          closeModal();
        }, 1800);
      }
    });

    $modal.data('modalBound', true);
  }

  function initFullContactPageForm() {
    var $fullForm = $('#contactForm');
    if (!$fullForm.length) {
      return;
    }

    setupContactForm($fullForm, {
      submitSelector: '#cf-submit',
      successSelector: '#formSuccess',
      getPayload: function ($form) {
        return {
          fullName: $form.find('#cf-fname').val(),
          email: $form.find('#cf-email').val(),
          company: $form.find('#cf-company').val(),
          phone: $form.find('#cf-phone').val(),
          message: $form.find('#cf-message').val(),
          sourcePage: window.location.pathname
        };
      },
      submitWithCms: function (payload) {
        return window.OCOCMS ? window.OCOCMS.postForm('/contact', payload) : Promise.resolve();
      },
      fields: [
        {
          id: 'cf-fname',
          errId: 'err-fname',
          validate: function (value) { return validateMinLength(value, 2); }
        },
        {
          id: 'cf-email',
          errId: 'err-email',
          validate: function (value) { return validateEmail(value); }
        },
        {
          id: 'cf-company',
          errId: 'err-company',
          validate: function (value) { return validateMinLength(value, 2); }
        },
        {
          id: 'cf-phone',
          errId: 'err-phone',
          validate: function (value) { return validatePhone(value); }
        },
        {
          id: 'cf-message',
          errId: 'err-message',
          validate: function (value) { return validateMinLength(value, 10); }
        }
      ],
      extraValidators: [
        createRadioValidator('enquiryType', 'err-enquiry'),
        createCheckboxValidator('cf-consent2', 'err-consent')
      ]
    });
  }

  $(function () {
    initFullContactPageForm();

    if (!document.getElementById('contactForm')) {
      setupModalBehavior(injectModal());
    }
  });

}(jQuery));


