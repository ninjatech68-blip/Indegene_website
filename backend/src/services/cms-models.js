export const cmsCollections = {
  mediaAssets: {
    label: 'Media Library',
    model: 'mediaAsset',
    icon: 'bi-images',
    description: 'Upload, review, and reuse approved media assets for the website and CMS records.',
    searchableFields: ['fileName', 'publicUrl', 'altText'],
    orderBy: { updatedAt: 'desc' },
    readOnly: true,
    supportsUpload: true,
    sortOptions: [
      { value: 'updated-desc', label: 'Recently updated' },
      { value: 'updated-asc', label: 'Oldest updated' },
      { value: 'name-asc', label: 'File name A–Z' }
    ],
    fields: ['fileName', 'altText', 'mimeType', 'width', 'height', 'publicUrl', 'createdAt']
  },
  pages: {
    label: 'Website Pages',
    model: 'page',
    icon: 'bi-file-earmark-text',
    description: 'Manage page hero content and SEO metadata for the live website.',
    searchableFields: ['slug', 'title', 'heroTitle', 'heroSubtitle', 'seoTitle', 'seoDescription'],
    orderBy: { updatedAt: 'desc' },
    sortOptions: [
      { value: 'updated-desc', label: 'Recently updated' },
      { value: 'title-asc', label: 'Title A–Z' },
      { value: 'status-asc', label: 'Status' }
    ],
    fieldHelp: {
      heroTitle: 'Primary headline used in the page banner or hero.',
      seoTitle: 'Title used for search engines and sharing previews.'
    },
    fields: ['title', 'heroTitle', 'heroSubtitle', 'seoTitle', 'seoDescription']
  },
  caseStudies: {
    label: 'Case Studies',
    model: 'caseStudy',
    icon: 'bi-journal-richtext',
    description: 'Publish proof points, detailed case studies, SEO metadata, and featured content.',
    searchableFields: ['slug', 'title', 'excerpt', 'content', 'seoTitle', 'seoDescription'],
    orderBy: [{ updatedAt: 'desc' }],
    sortOptions: [
      { value: 'updated-desc', label: 'Recently updated' },
      { value: 'published-desc', label: 'Recently published' },
      { value: 'title-asc', label: 'Title A–Z' }
    ],
    fieldHelp: {
      excerpt: 'Short summary used in listings and cards.',
      content: 'Main case study body content.',
      sourceUrl: 'Optional external destination for the case study.',
      structuredData: 'Website placement and related-story settings are managed through the guided editor.',
      publishedAt: 'Publishing timestamp used for sorting and visibility.'
    },
    fields: ['title', 'excerpt', 'status', 'publishedAt', 'isFeatured', 'seoTitle', 'seoDescription'],
    editorFields: ['title', 'excerpt', 'status', 'publishedAt', 'isFeatured', 'seoTitle', 'seoDescription']
  },
  privatePageResources: {
    label: 'Private Page Resources',
    model: 'privatePageResource',
    icon: 'bi-link-45deg',
    description: 'Manage protected-page links such as presentation decks, live demos, and supporting assets.',
    searchableFields: ['pageKey', 'title', 'resourceType', 'description', 'url'],
    orderBy: [{ pageKey: 'asc' }, { sortOrder: 'asc' }, { updatedAt: 'desc' }],
    sortOptions: [
      { value: 'sort-asc', label: 'Sort order' },
      { value: 'updated-desc', label: 'Recently updated' },
      { value: 'title-asc', label: 'Title A–Z' }
    ],
    fieldHelp: {
      pageKey: 'Select which protected page should display this resource.',
      resourceType: 'Use a clear label so the frontend can group and badge each item consistently.',
      url: 'Direct link to the deck, demo, document, or related destination.',
      ctaLabel: 'Optional custom button label. Defaults to “Open resource” on the frontend.'
    },
    fields: ['pageKey', 'title', 'resourceType', 'description', 'url', 'ctaLabel', 'isVisible', 'sortOrder'],
    editorFields: ['pageKey', 'title', 'resourceType', 'description', 'url', 'ctaLabel', 'isVisible', 'sortOrder']
  },
  privatePageCredentials: {
    label: 'Private Page Credentials',
    model: 'privatePageCredential',
    icon: 'bi-shield-lock',
    description: 'Manage username/password access for protected pages without exposing stored password hashes.',
    searchableFields: ['pageKey', 'username', 'description'],
    orderBy: [{ pageKey: 'asc' }, { updatedAt: 'desc' }],
    sortOptions: [
      { value: 'updated-desc', label: 'Recently updated' },
      { value: 'username-asc', label: 'Username A–Z' }
    ],
    fieldHelp: {
      pageKey: 'Select which protected page this credential can unlock.',
      username: 'Username entered on the hidden-page login form.',
      description: 'Optional note for the admin team, such as owner, audience, or expiry context.',
      password: 'Set a password when creating a credential. On edits, leave blank to keep the existing password.',
      assignedResources: 'Choose exactly which protected resources this credential is allowed to view.'
    },
    fields: ['pageKey', 'username', 'description', 'isActive'],
    editorFields: ['pageKey', 'username', 'description', 'isActive']
  },
  testimonials: {
    label: 'Testimonials',
    model: 'testimonial',
    icon: 'bi-chat-quote',
    description: 'Curate client quotes, attribution, and homepage visibility.',
    searchableFields: ['clientName', 'role', 'company', 'quote'],
    orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
    sortOptions: [
      { value: 'sort-asc', label: 'Sort order' },
      { value: 'updated-desc', label: 'Recently updated' },
      { value: 'name-asc', label: 'Client name A–Z' }
    ],
    fieldHelp: {
      quote: 'Client-approved testimonial quote.',
      isVisible: 'Controls whether the testimonial can appear on the site.'
    },
    fields: ['clientName', 'role', 'company', 'quote', 'isVisible', 'sortOrder'],
    editorFields: ['clientName', 'role', 'company', 'quote', 'isVisible', 'sortOrder']
  },
  clients: {
    label: 'Trust & Platform Logos',
    model: 'client',
    icon: 'bi-buildings',
    description: 'Manage homepage trust logos, partner marks, ordering, and optional destination links.',
    searchableFields: ['name'],
    orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
    sortOptions: [
      { value: 'sort-asc', label: 'Sort order' },
      { value: 'updated-desc', label: 'Recently updated' },
      { value: 'name-asc', label: 'Client name A–Z' }
    ],
    fields: ['name', 'isVisible', 'sortOrder'],
    editorFields: ['name', 'isVisible', 'sortOrder']
  },
  settings: {
    label: 'Shared Site Copy',
    model: 'siteSetting',
    icon: 'bi-sliders',
    description: 'Global settings for taglines, footer content, navigation groups, and search copy.',
    searchableFields: ['key', 'description'],
    orderBy: { updatedAt: 'desc' },
    sortOptions: [
      { value: 'updated-desc', label: 'Recently updated' },
      { value: 'key-asc', label: 'Key A–Z' }
    ],
    fieldHelp: {
      value: 'Use plain language content for the shared website text shown in this setting.'
    },
    fields: ['key', 'value', 'description']
  },
  formSubmissions: {
    label: 'Contact Inbox',
    model: 'formSubmission',
    icon: 'bi-inboxes',
    description: 'Review contact enquiries, newsletter signups, source pages, and response status.',
    searchableFields: ['fullName', 'email', 'company', 'message', 'sourcePage'],
    orderBy: { createdAt: 'desc' },
    readOnly: true,
    sortOptions: [
      { value: 'created-desc', label: 'Newest first' },
      { value: 'created-asc', label: 'Oldest first' }
    ],
    fields: ['formType', 'fullName', 'email', 'company', 'message', 'sourcePage', 'createdAt']
  }
};

export function getCollectionConfig(key) {
  return cmsCollections[key] || null;
}
