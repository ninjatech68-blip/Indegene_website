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
            copy: `Control the shared ${key === 'header.cta' ? 'header' : 'footer'} button label and destination.`,
            fields: [
              buildSectionField('settingLabel', 'Button label', value?.label || ''),
              buildSectionField('settingUrl', 'Button destination', value?.url || '', { type: 'text' })
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
            copy: 'Use one link per line in the format: Label | URL',
            fields: [
              buildSectionField('settingLinks', 'Links', formatLinkList(value), {
                type: 'textarea',
                full: true
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
            copy: 'Separate each group with a blank line. First line is the group title, following lines use: Label | URL',
            fields: [
              buildSectionField('settingGroupedLinks', 'Navigation groups', formatGroupedLinkBlocks(value), {
                type: 'textarea',
                full: true
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
            copy: 'Separate each column with a blank line. First line is the column title, following lines use: Label | URL',
            fields: [
              buildSectionField('settingGroupedLinks', 'Footer columns', formatGroupedLinkBlocks(value), {
                type: 'textarea',
                full: true
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
      next.value = {
        label: String(rawData.settingLabel || '').trim(),
        url: String(rawData.settingUrl || '').trim()
      };
      break;
    case 'topbar.links':
    case 'header.links':
      next.value = parseLinkList(rawData.settingLinks);
      break;
    case 'mobile.nav':
      next.value = parseGroupedLinkBlocks(rawData.settingGroupedLinks, 'items');
      break;
    case 'footer.columns':
      next.value = parseGroupedLinkBlocks(rawData.settingGroupedLinks, 'links');
      break;
    default:
      next.value = String(rawData.settingText || '').trim();
      break;
  }

  return next;
}
