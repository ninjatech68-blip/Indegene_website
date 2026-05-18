const WEBSITE_PAGE_GROUPS = [
  {
    id: 'core',
    label: 'Core Pages',
    description: 'Primary public pages that define the main website journey.',
    pages: [
      {
        slug: 'home',
        title: 'Homepage',
        file: 'index.html',
        editorCollection: 'pages',
        summary: 'Hero banner, proof, services overview, testimonials, and newsletter strip.',
        sections: ['hero', 'strategic-alliances', 'purpose', 'services', 'track-record', 'testimonials', 'newsletter']
      },
      {
        slug: 'services',
        title: 'Services',
        file: 'services.html',
        editorCollection: 'pages',
        summary: 'Service architecture, capability entry points, delivery model, and outcomes.',
        sections: ['service-architecture', 'service-categories', 'service-model', 'service-outcomes', 'newsletter']
      },
      {
        slug: 'contact',
        title: 'Contact Us',
        file: 'contactus.html',
        editorCollection: 'pages',
        summary: 'Contact intro, contact cards, and the contact form experience.',
        sections: ['contact-intro', 'contact-cards', 'contact-form']
      },
      {
        slug: 'case-studies',
        title: 'Case Study Library',
        file: 'casestudy.html',
        editorCollection: 'pages',
        summary: 'Archive page for proof stories and case study discovery.',
        sections: ['library-intro']
      },
      {
        slug: 'resources',
        title: 'GenAI Services',
        file: 'genai.html',
        editorCollection: 'pages',
        summary: 'GenAI services landing page and related operating-model sections.',
        sections: ['hero', 'genai-overview', 'genai-switcher', 'genai-prompt-library', 'genai-agentforce', 'genai-demo', 'genai-data-band', 'genai-cta']
      }
    ]
  },
  {
    id: 'audiences',
    label: 'Who We Serve',
    description: 'Audience-specific pages for industry segments.',
    pages: [
      {
        slug: 'biopharmaceuticals',
        title: 'Biopharmaceuticals',
        file: 'biopharmaceuticals.html',
        editorCollection: 'pages',
        summary: 'Audience page covering enterprise biopharma operating realities and priorities.',
        sections: ['operating-reality', 'commercial-context', 'execution-friction', 'operating-priorities', 'business-outcomes', 'next-step']
      },
      {
        slug: 'emerging-biotech',
        title: 'Emerging Biotech',
        file: 'emerging-biotech.html',
        editorCollection: 'pages',
        summary: 'Audience page for commercialisation-stage biotech teams.',
        sections: ['operating-reality', 'commercial-context', 'execution-friction', 'operating-priorities', 'business-outcomes', 'next-step']
      },
      {
        slug: 'medical-devices',
        title: 'Medical Devices',
        file: 'medical-devices.html',
        editorCollection: 'pages',
        summary: 'Audience page for device and diagnostics commercial operations.',
        sections: ['operating-reality', 'commercial-context', 'execution-friction', 'operating-priorities', 'business-outcomes', 'next-step']
      },
      {
        slug: 'animal-health',
        title: 'Animal Health',
        file: 'animal-health.html',
        editorCollection: 'pages',
        summary: 'Audience page for veterinary and animal-health operating teams.',
        sections: ['operating-reality', 'commercial-context', 'execution-friction', 'operating-priorities', 'business-outcomes', 'next-step']
      }
    ]
  },
  {
    id: 'capabilities',
    label: 'Capabilities',
    description: 'Capability and service entry pages linked from the primary navigation.',
    pages: [
      {
        slug: 'strategy',
        title: 'Strategy',
        file: 'strategy.html',
        editorCollection: 'pages',
        summary: 'Capability page for strategic operating design and commercial planning.',
        sections: ['capability-summary', 'capability-thesis', 'overview-title', 'workflow-title', 'focus-title', 'next-step']
      },
      {
        slug: 'planning',
        title: 'Planning',
        file: 'planning.html',
        editorCollection: 'pages',
        summary: 'Capability page for planning and pre-launch orchestration.',
        sections: ['capability-summary', 'capability-thesis', 'overview-title', 'workflow-title', 'focus-title', 'next-step']
      },
      {
        slug: 'orchestration',
        title: 'Orchestration',
        file: 'orchestration.html',
        editorCollection: 'pages',
        summary: 'Capability page for operating-model coordination and execution control.',
        sections: ['capability-summary', 'capability-thesis', 'overview-title', 'workflow-title', 'focus-title', 'next-step']
      },
      {
        slug: 'execution',
        title: 'Execution',
        file: 'execution.html',
        editorCollection: 'pages',
        summary: 'Capability page for activation and program delivery.',
        sections: ['capability-summary', 'capability-thesis', 'overview-title', 'workflow-title', 'focus-title', 'next-step']
      },
      {
        slug: 'measurement',
        title: 'Measurement',
        file: 'measurement.html',
        editorCollection: 'pages',
        summary: 'Capability page for reporting, analytics, and optimization visibility.',
        sections: ['capability-summary', 'capability-thesis', 'overview-title', 'workflow-title', 'focus-title', 'next-step']
      },
      {
        slug: 'analytics',
        title: 'Analytics',
        file: 'analytics.html',
        editorCollection: 'pages',
        summary: 'Capability page for analytics operations and performance intelligence.',
        sections: ['capability-summary', 'capability-thesis', 'overview-title', 'workflow-title', 'focus-title', 'next-step']
      },
      {
        slug: 'by-role',
        title: 'By Role',
        file: 'by_role.html',
        editorCollection: 'pages',
        summary: 'Role-based service page for specialist operating support.',
        sections: ['capability-summary', 'expertise-overview', 'expertise-teams', 'expertise-impact', 'next-step']
      },
      {
        slug: 'by-function',
        title: 'By Function',
        file: 'by_function.html',
        editorCollection: 'pages',
        summary: 'Functional service page for integrated delivery capabilities.',
        sections: ['capability-summary', 'compliance-overview', 'compliance-controls', 'compliance-impact', 'next-step']
      },
      {
        slug: 'by-channel',
        title: 'By Channel',
        file: 'by_channel.html',
        editorCollection: 'pages',
        summary: 'Channel-specific service page for activation programs.',
        sections: ['capability-summary', 'execution-overview', 'execution-orchestration', 'execution-impact', 'next-step']
      }
    ]
  }
];

const SHARED_ADMIN_COLLECTIONS = [
  {
    key: 'caseStudies',
    title: 'Case Study Stories',
    summary: 'Detail-page content, proof stories, featured content, and sidebar relationships.'
  },
  {
    key: 'testimonials',
    title: 'Testimonials',
    summary: 'Client quotes and homepage/client-proof content.'
  },
  {
    key: 'clients',
    title: 'Trust & Platform Logos',
    summary: 'Homepage trust logos, partner marks, and visibility controls.'
  },
  {
    key: 'settings',
    title: 'Shared Site Copy',
    summary: 'Brand lines, footer copy, legal text, and other shared text snippets.'
  },
  {
    key: 'mediaAssets',
    title: 'Media Library',
    summary: 'Approved imagery, logos, and reusable media.'
  },
  {
    key: 'formSubmissions',
    title: 'Contact Inbox',
    summary: 'Contact enquiries and newsletter signups.'
  },
  {
    key: 'privatePageResources',
    title: 'Partner Resources',
    summary: 'Protected links and assets shown inside partner access.'
  },
  {
    key: 'privatePageCredentials',
    title: 'Partner Access',
    summary: 'Credentials used to unlock protected partner resources.'
  }
];

const HIDDEN_OR_PRIVATE_PAGES = [
  {
    file: 'partner-access.html',
    title: 'Partner Access',
    owner: 'privatePageResources',
    summary: 'Protected page managed through partner resource and credential records.'
  },
  {
    file: 'briefing-room.html',
    title: 'Briefing Room Alias',
    owner: 'privatePageResources',
    summary: 'Alias route that redirects into the protected partner-access page.'
  },
  {
    file: 'indegene revitalizes.html',
    title: 'Case Study Detail Chrome',
    owner: 'caseStudies',
    summary: 'Internal support page record used to hydrate shared chrome for case study detail pages.'
  },
];

export const frontendContentMap = {
  pageGroups: WEBSITE_PAGE_GROUPS,
  sharedCollections: SHARED_ADMIN_COLLECTIONS,
  hiddenPages: HIDDEN_OR_PRIVATE_PAGES
};

export function getWebsitePages() {
  return WEBSITE_PAGE_GROUPS.flatMap((group) =>
    group.pages.map((page) => ({
      ...page,
      groupId: group.id,
      groupLabel: group.label,
      editorPath: `/admin/pages/slug/${page.slug}`
    }))
  );
}

export function getPrimaryWebsitePages() {
  return WEBSITE_PAGE_GROUPS[0].pages.map((page) => ({
    ...page,
    groupId: WEBSITE_PAGE_GROUPS[0].id,
    groupLabel: WEBSITE_PAGE_GROUPS[0].label,
    editorPath: `/admin/pages/slug/${page.slug}`
  }));
}

export function getSharedAdminCollections() {
  return SHARED_ADMIN_COLLECTIONS.slice();
}

export function getHiddenOrPrivatePages() {
  return HIDDEN_OR_PRIVATE_PAGES.slice();
}
