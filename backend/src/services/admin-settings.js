function formatLinkList(value = []) {
  return (Array.isArray(value) ? value : [])
    .map((item) => `${String(item?.label || '').trim()} | ${String(item?.url || '').trim()}`.trim())
    .filter((line) => line && line !== '|')
    .join('\n');
}

function parseLineList(value) {
  return String(value || '')
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseLinkList(value) {
  return parseLineList(value)
    .map((line) => {
      const [label, url] = line.split('|').map((item) => String(item || '').trim());
      return { label, url };
    })
    .filter((item) => item.label && item.url);
}

function formatGroupedLinkBlocks(value = []) {
  return (Array.isArray(value) ? value : [])
    .map((group) => {
      const title = String(group?.title || group?.label || '').trim();
      const items = Array.isArray(group?.links) ? group.links : Array.isArray(group?.items) ? group.items : [];
      const lines = items
        .map((item) => `${String(item?.label || '').trim()} | ${String(item?.url || '').trim()}`.trim())
        .filter((line) => line && line !== '|');
      return [title, ...lines].filter(Boolean).join('\n');
    })
    .filter(Boolean)
    .join('\n\n');
}

function parseGroupedLinkBlocks(value, childKey = 'links') {
  return String(value || '')
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const [titleLine, ...rest] = block.split('\n');
      const title = String(titleLine || '').trim();
      const items = rest
        .map((line) => {
          const [label, url] = line.split('|').map((item) => String(item || '').trim());
          return { label, url };
        })
        .filter((item) => item.label && item.url);
      return title ? { title, [childKey]: items } : null;
    })
    .filter(Boolean)
    .map((group) => {
      if (childKey === 'items') {
        return {
          label: group.title,
          items: group.items
        };
      }
      return group;
    });
}

export function buildSettingEditorState(item = {}, buildSectionField) {
  const key = String(item.key || '').trim();
  const value = item.value;

  switch (key) {
    case 'footer.cta':
    case 'header.cta':
      return {
        mode: 'cta',
        groups: [
          {
            title: key === 'header.cta' ? 'Header call to action' : 'Footer call to action',
            copy: `Edit the shared ${key === 'header.cta' ? 'header' : 'footer'} button label. Its link target is fixed by the site structure and is not editable here.`,
            fields: [
              buildSectionField('settingLabel', 'Button label', value?.label || ''),
              buildSectionField('settingUrl', 'Button destination (fixed)', value?.url || '', { type: 'text', readOnly: true })
            ]
          }
        ]
      };
    case 'topbar.links':
    case 'header.links':
      return {
        mode: 'link-list',
        groups: [
          {
            title: key === 'header.links' ? 'Desktop header links' : 'Top utility links',
            copy: 'These navigation links are fixed by the site structure and are shown here for reference only — they are not editable in the CMS.',
            fields: [
              buildSectionField('settingLinks', 'Links (fixed)', formatLinkList(value), {
                type: 'textarea',
                full: true,
                readOnly: true
              })
            ]
          }
        ]
      };
    case 'mobile.nav':
      return {
        mode: 'grouped-items',
        groups: [
          {
            title: 'Mobile navigation groups',
            copy: 'The mobile navigation is fixed by the site structure and is shown here for reference only — it is not editable in the CMS.',
            fields: [
              buildSectionField('settingGroupedLinks', 'Navigation groups (fixed)', formatGroupedLinkBlocks(value), {
                type: 'textarea',
                full: true,
                readOnly: true
              })
            ]
          }
        ]
      };
    case 'footer.columns':
      return {
        mode: 'grouped-links',
        groups: [
          {
            title: 'Footer columns',
            copy: 'The footer navigation columns are fixed by the site structure and are shown here for reference only — they are not editable in the CMS.',
            fields: [
              buildSectionField('settingGroupedLinks', 'Footer columns (fixed)', formatGroupedLinkBlocks(value), {
                type: 'textarea',
                full: true,
                readOnly: true
              })
            ]
          }
        ]
      };
    default:
      return {
        mode: 'text',
        groups: [
          {
            title: 'Shared copy',
            copy: 'Use plain language content for this shared website setting.',
            fields: [
              buildSectionField(
                'settingText',
                'Value',
                Array.isArray(value) || (value && typeof value === 'object')
                  ? formatGroupedLinkBlocks(value)
                  : String(value || ''),
                {
                  type: 'textarea',
                  full: true
                }
              )
            ]
          }
        ]
      };
  }
}

export function buildSettingAdminData(rawData, existingItem = {}) {
  const key = String(existingItem.key || rawData.key || '').trim();
  const next = {
    key,
    description: typeof rawData.description === 'string' ? rawData.description : existingItem.description
  };

  switch (key) {
    case 'footer.cta':
    case 'header.cta':
      // Button label is editable; the link target is fixed — preserve it.
      next.value = {
        label: String(rawData.settingLabel || '').trim(),
        url: String(existingItem.value?.url || '').trim()
      };
      break;
    case 'topbar.links':
    case 'header.links':
    case 'mobile.nav':
    case 'footer.columns':
      // Navigation/footer link structures are fixed by the site structure and
      // are not editable in the CMS — always keep the stored value.
      next.value = existingItem.value;
      break;
    default:
      next.value = String(rawData.settingText || '').trim();
      break;
  }

  return next;
}
