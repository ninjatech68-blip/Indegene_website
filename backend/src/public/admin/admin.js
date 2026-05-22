document.addEventListener('DOMContentLoaded', () => {
  const inferInputGuidance = (input) => {
    if (!input) return 'Provide the value for this field.';
    const tag = (input.tagName || '').toLowerCase();
    const type = String(input.getAttribute('type') || '').toLowerCase();
    if (tag === 'textarea') return 'Enter clear plain-language content. Use line breaks for readability.';
    if (tag === 'select') return 'Select the most appropriate option from the list.';
    if (type === 'url') return 'Enter a full URL including https://';
    if (type === 'email') return 'Enter a valid email address.';
    if (type === 'number') return 'Enter a numeric value only.';
    if (type === 'datetime-local') return 'Select date and time in local format.';
    if (type === 'password') return 'Enter a strong password value.';
    return 'Enter concise, publish-ready text.';
  };

  document.querySelectorAll('.admin-form label[for]').forEach((label) => {
    if (label.querySelector('.admin-info-inline')) return;
    const fieldId = label.getAttribute('for');
    if (!fieldId) return;
    const input = document.getElementById(fieldId);
    if (!input) return;
    const fieldWrap = label.closest('div');
    const helpNode = fieldWrap?.querySelector('.admin-field-help');
    const helpText = (helpNode?.textContent || '').trim() || inferInputGuidance(input);
    const info = document.createElement('span');
    info.className = 'admin-info-inline';
    info.setAttribute('title', helpText);
    info.setAttribute('aria-label', helpText);
    info.textContent = '(i)';
    label.appendChild(document.createTextNode(' '));
    label.appendChild(info);
  });

  const guidedToggle = document.querySelector('[data-guided-toggle]');
  const guidedButton = guidedToggle?.querySelector('[data-guided-toggle-btn]');
  const guidedScope = document.querySelector('[data-guided-scope]');
  const advancedFieldCount = document.querySelectorAll('.admin-advanced-field').length;
  const guidedStorageKey = 'oco_cms_guided_mode';
  const setGuidedMode = (enabled) => {
    if (!guidedButton || !guidedScope) return;
    guidedScope.classList.toggle('is-guided', enabled);
    guidedButton.setAttribute('aria-pressed', enabled ? 'true' : 'false');
    guidedButton.textContent = enabled ? 'Advanced fields hidden' : 'Show guided fields';
  };

  if (guidedButton && guidedScope) {
    if (!advancedFieldCount) {
      guidedButton.textContent = 'No advanced fields';
      guidedButton.disabled = true;
      guidedButton.setAttribute('aria-pressed', 'false');
      return;
    }
    const saved = window.localStorage.getItem(guidedStorageKey);
    const isGuided = saved !== 'off';
    setGuidedMode(isGuided);
    guidedButton.addEventListener('click', () => {
      const enabled = !guidedScope.classList.contains('is-guided');
      setGuidedMode(enabled);
      window.localStorage.setItem(guidedStorageKey, enabled ? 'on' : 'off');
    });
  } else if (guidedButton && !guidedScope) {
    guidedButton.textContent = 'Advanced fields unavailable';
    guidedButton.disabled = true;
    guidedButton.setAttribute('aria-pressed', 'false');
  }

  document.querySelectorAll('[data-admin-tabs]').forEach((tabsRoot) => {
    const tabs = Array.from(tabsRoot.querySelectorAll('[data-tab-target]'));
    const panels = Array.from(tabsRoot.querySelectorAll('[data-tab-panel]'));
    if (!tabs.length || !panels.length) {
      return;
    }

    const activate = (target) => {
      tabs.forEach((tab) => {
        const isActive = tab.getAttribute('data-tab-target') === target;
        tab.classList.toggle('is-active', isActive);
        tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });

      panels.forEach((panel) => {
        const isActive = panel.getAttribute('data-tab-panel') === target;
        panel.classList.toggle('is-active', isActive);
      });
    };

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        activate(tab.getAttribute('data-tab-target'));
      });
    });

    const defaultTab = tabs.find((tab) => tab.classList.contains('is-active')) || tabs[0];
    activate(defaultTab.getAttribute('data-tab-target'));
  });

  document.querySelectorAll('[data-confirm]').forEach((node) => {
    node.addEventListener('click', (event) => {
      const message = node.getAttribute('data-confirm') || 'Are you sure?';
      if (!window.confirm(message)) {
        event.preventDefault();
      }
    });
  });

  document.querySelectorAll('textarea').forEach((textarea) => {
    const resize = () => {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.max(textarea.scrollHeight, 160)}px`;
    };
    resize();
    textarea.addEventListener('input', resize);
  });

  const uploadForm = document.querySelector('[data-media-upload-form]');
  if (uploadForm) {
    const fileInput = uploadForm.querySelector('input[type="file"]');
    const altInput = uploadForm.querySelector('input[name="altText"]');
    const submitButton = uploadForm.querySelector('button[type="submit"]');
    const resultNode = document.querySelector('[data-media-upload-result]');

    uploadForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!fileInput?.files?.length) {
        if (resultNode) {
          resultNode.className = 'admin-upload__result is-error';
          resultNode.textContent = 'Select a file before uploading.';
        }
        return;
      }

      const formData = new FormData();
      formData.append('file', fileInput.files[0]);
      if (altInput?.value) {
        formData.append('altText', altInput.value);
      }

      if (submitButton) submitButton.disabled = true;
      if (resultNode) {
        resultNode.className = 'admin-upload__result';
        resultNode.textContent = 'Uploading asset...';
      }

      try {
        const response = await fetch('/api/uploads', {
          method: 'POST',
          body: formData,
          credentials: 'same-origin'
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.message || 'Upload failed.');
        }
        if (resultNode) {
          resultNode.className = 'admin-upload__result is-success';
          resultNode.innerHTML = `Upload complete. Asset ID: <strong>${payload.data.id}</strong> · <a href="${payload.data.publicUrl}" target="_blank" rel="noreferrer">Open file</a>`;
        }
        uploadForm.reset();
        window.setTimeout(() => window.location.reload(), 900);
      } catch (error) {
        if (resultNode) {
          resultNode.className = 'admin-upload__result is-error';
          resultNode.textContent = error.message || 'Upload failed.';
        }
      } finally {
        if (submitButton) submitButton.disabled = false;
      }
    });
  }
});
