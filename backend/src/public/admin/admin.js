document.addEventListener('DOMContentLoaded', () => {
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
