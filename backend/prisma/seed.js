import bcrypt from 'bcryptjs';
import { PrismaClient, PublishStatus, PageTemplate, UserRole } from '@prisma/client';
import { env } from '../src/config/env.js';
import { buildCaseStudyDetailOverrides, syncCaseStudyDetails } from './case-study-details.js';
import { syncCmsPages } from './site-pages.js';

const prisma = new PrismaClient();

async function upsertTags() {
  const tags = [
    'Orchestration',
    'Platform Integration',
    'Enablement',
    'Data & Analytics',
    'Automation',
    'Performance Marketing'
  ];

  for (const label of tags) {
    await prisma.tag.upsert({
      where: { slug: label.toLowerCase().replace(/[^a-z0-9]+/g, '-') },
      update: { label },
      create: {
        slug: label.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        label
      }
    });
  }
}

async function upsertMenus() {
  const menus = [
    {
      slug: 'header',
      title: 'Header Navigation',
      location: 'header',
      items: [
        { label: 'Who We Serve', url: '/biopharmaceuticals' },
        { label: 'What We Do', url: '/services' },
        { label: 'How We Deliver', url: '/why-choose-us' },
        { label: 'What We Think', url: '/case-studies' },
        { label: 'Contact Us', url: '/contact' }
      ]
    },
    {
      slug: 'footer',
      title: 'Footer Navigation',
      location: 'footer',
      items: [
        { label: 'About', url: '/' },
        { label: 'Services', url: '/services' },
        { label: 'Case Studies', url: '/case-studies' },
        { label: 'Contact', url: '/contact' }
      ]
    }
  ];

  for (const menu of menus) {
    const createdMenu = await prisma.navigationMenu.upsert({
      where: { slug: menu.slug },
      update: { title: menu.title, location: menu.location },
      create: { slug: menu.slug, title: menu.title, location: menu.location }
    });

    await prisma.navigationItem.deleteMany({ where: { menuId: createdMenu.id } });
    for (const [index, item] of menu.items.entries()) {
      await prisma.navigationItem.create({
        data: {
          menuId: createdMenu.id,
          label: item.label,
          url: item.url,
          sortOrder: index,
          isVisible: true
        }
      });
    }
  }
}

async function upsertPages() {
  const pages = [
    {
      slug: 'home',
      title: 'Homepage',
      template: PageTemplate.HOME,
      status: PublishStatus.PUBLISHED,
      heroKicker: 'Life Sciences Commercial Operations',
      heroTitle: 'Make commercial execution easier to scale, govern, and prove',
      heroSubtitle: 'Indegene helps life sciences organizations improve launch readiness, content flow, approval discipline, channel activation, and performance visibility through one accountable delivery model.',
      heroPrimaryLabel: 'Start an execution assessment',
      heroPrimaryUrl: 'contactus.html',
      heroSecondaryLabel: 'Review outcome stories',
      heroSecondaryUrl: 'casestudy.html',
      sections: [
        {
          sectionKey: 'hero',
          sectionLabel: 'Homepage Hero',
          heading: 'Homepage Hero',
          subheading: 'Text, CTAs, capability pills, and highlight stats',
          body: {
            pills: [
              { icon: 'bi-diagram-3', label: 'Campaign orchestration' },
              { icon: 'bi-layers', label: 'Modular content operations' },
              { icon: 'bi-activity', label: 'Performance intelligence' }
            ],
            stats: [
              { value: '20,000', suffix: '+', label: 'Campaigns<br>Executed' },
              { value: '35', suffix: '+', label: 'Global Pharma<br>Clients' },
              { value: '300', suffix: '+', label: 'Certified<br>Specialists' },
              { value: '80', suffix: '+', label: 'Countries<br>Supported' }
            ]
          },
          config: {
            visualHeadingLeft: 'Omnichannel operating layer',
            visualHeadingRight: 'Live orchestration',
            cards: [
              { position: 'top-left', label: 'Channel execution', value: 'Email, media, CRM' },
              { position: 'top-right', label: 'Content operations', value: 'Modular workflows' },
              { position: 'bottom-left', label: 'Audience logic', value: 'HCP and patient journeys' },
              { position: 'bottom-right', label: 'Performance loop', value: 'Measure and optimise' }
            ],
            stack: ['Workflow stream', 'Connected signals', 'Delivery rhythm']
          },
          visibility: true
        },
        {
          sectionKey: 'strategic-alliances',
          sectionLabel: 'Enterprise Proof at a Glance',
          eyebrow: 'Enterprise proof at a glance',
          heading: 'Trusted by enterprise teams that need delivery control, not more delivery noise.',
          subheading: 'The value is not another channel program. It is a clearer commercial system for governed execution across launches, mature brands, analytics, and omnichannel activation.',
          body: {
            signals: [
              'Global delivery footprint',
              'Regulated-market execution',
              'Launch and lifecycle support',
              'Embedded medical and review context'
            ]
          },
          config: {
            logosLabel: 'Selected platform and delivery ecosystem',
            cards: [
              {
                title: 'Delivery scale',
                body: 'Campaign experience across complex omnichannel programs, brands, and market models'
              },
              {
                title: 'Enterprise depth',
                body: 'Life sciences support across launch, engagement, analytics, and governed execution'
              },
              {
                title: 'Market coverage',
                body: 'Coordinated market activation, localization, and release control for multi-market teams'
              },
              {
                title: 'Localization support',
                body: 'Content flow and audience-ready deployment for multilingual engagement programs'
              }
            ]
          },
          visibility: true
        },
        {
          sectionKey: 'purpose',
          sectionLabel: 'Operating Reality',
          eyebrow: 'Operating reality',
          heading: 'The growth constraint is usually execution drag, not strategy shortage.',
          subheading: 'When strategy, content, approvals, activation, and measurement move on separate timelines, enterprise teams lose launch speed, operating confidence, and decision clarity.',
          body: {
            riskLabel: 'Where value breaks down',
            riskTitle: 'Handoffs, approvals, and reporting loops absorb the momentum leaders expect to reach the market.',
            riskBody: 'Brands, agencies, review teams, channel operators, and market stakeholders often execute against different readiness signals.',
            answerLabel: 'What changes with Indegene',
            answerTitle: 'One accountable delivery model makes execution more visible, more disciplined, and easier to optimize.',
            answerBody: 'Indegene connects operating design, campaign management, content flow, channel delivery, and performance intelligence around one commercial system.',
            chips: ['Launch readiness', 'MLR coordination', 'Modular content flow', 'Channel activation', 'Performance governance']
          },
          visibility: true
        },
        {
          sectionKey: 'services',
          sectionLabel: 'Why Choose Us',
          eyebrow: 'Why choose us',
          heading: 'Why enterprise teams trust Indegene with execution that has to hold.',
          subheading: 'Each proof path explains a different part of the enterprise value equation: domain judgment, embedded control, and coordinated activation at scale.',
          config: {
            cards: [
              {
                title: 'Pharma-Native Expertise',
                icon: 'bi-heart-pulse',
                body: 'Bring healthcare-native commercial, medical, launch, and review judgment into everyday execution decisions so teams ramp faster and escalate less.',
                ctaLabel: 'See executive value',
                ctaUrl: 'by_role.html'
              },
              {
                title: 'Compliance-by-Design',
                icon: 'bi-shield-check',
                body: 'Engineer review logic, release readiness, QA discipline, and auditability into the workflow early enough to protect both pace and control.',
                ctaLabel: 'See control model',
                ctaUrl: 'by_function.html'
              },
              {
                title: 'Omnichannel Execution at Scale',
                icon: 'bi-broadcast-pin',
                body: 'Run coordinated activation across email, CRM, paid media, search, events, mobile, and field-connected engagement without fragmenting ownership.',
                ctaLabel: 'See activation model',
                ctaUrl: 'by_channel.html'
              }
            ]
          },
          visibility: true
        },
        {
          sectionKey: 'track-record',
          sectionLabel: 'Enterprise Proof',
          eyebrow: 'Enterprise proof',
          heading: 'Proof that the model improves readiness, control, and commercial pace.',
          subheading: 'Built for global life sciences programs where launch speed, quality control, localization, and commercial performance have to improve together.',
          config: {
            items: [
              {
                value: '20K',
                suffix: '+',
                title: 'Campaigns delivered',
                body: 'Execution depth across regulated omnichannel programs with complex content, approval, and deployment needs.'
              },
              {
                value: '35',
                suffix: '+',
                title: 'Life sciences organizations',
                body: 'Supported across launches, mature brands, specialty portfolios, and enterprise modernization agendas.'
              },
              {
                value: '80',
                suffix: '+',
                title: 'Countries supported',
                body: 'Operational coverage for local-market adaptation, release discipline, and coordinated activation.'
              },
              {
                value: '40',
                suffix: '+',
                title: 'Languages Supported',
                body: 'Localization-ready content and channel execution for enterprise engagement programs.'
              }
            ]
          },
          visibility: true
        },
        {
          sectionKey: 'testimonials',
          sectionLabel: 'Client Proof',
          eyebrow: 'Client proof',
          heading: 'Curated outcome stories that show what changed in the operating system.',
          subheading: 'These summaries are designed for executive review: what pressure existed, what changed in delivery, and what business outcome improved.',
          visibility: true
        },
        {
          sectionKey: 'newsletter',
          sectionLabel: 'Next Step CTA',
          eyebrow: 'Next step',
          heading: 'Focus the first conversation on the execution issues that matter most.',
          subheading: 'We use the initial assessment to map where readiness, approvals, content flow, activation, and performance governance are constraining commercial results.',
          config: {
            successMessage: 'Best for commercial, medical, launch, analytics, and operations leaders assessing where execution quality is leaking value.'
          },
          visibility: true
        }
      ]
    },
    {
      slug: 'services',
      title: 'Services',
      template: PageTemplate.SERVICES,
      status: PublishStatus.PUBLISHED,
      heroTitle: 'Capability architecture for governed omnichannel execution',
      heroSubtitle: 'Indegene helps life sciences organizations structure commercial operations around the way work needs to move: by channel, by function, and by specialist role.',
      sections: [
        {
          sectionKey: 'service-architecture',
          sectionLabel: 'Service Architecture',
          eyebrow: 'Service Architecture',
          heading: 'A connected model for complex life sciences commercial operations',
          body: {
            chips: ['Channel Execution', 'Functional Delivery', 'Role-Based Enablement', 'Compliance Controls', 'Scalable Operations'],
            paragraphs: [
              '<strong>Our services connect strategy, execution, and governance across the omnichannel value chain.</strong> Rather than operating in isolated workstreams, we align channels, specialist functions, and delivery roles within one coordinated operating model.',
              'This structure enables commercial, marketing, and operations teams to improve launch readiness, execute more consistently, and strengthen visibility across programs, vendors, and markets. It also reduces the fragmentation that often slows progress in regulated environments.',
              'Whether clients need a focused capability or an end-to-end engagement model, our services are built to integrate with existing teams, platforms, and compliance processes without disrupting the current operating environment.'
            ]
          },
          visibility: true
        },
        {
          sectionKey: 'service-categories',
          sectionLabel: 'Service Categories',
          eyebrow: 'Explore Services',
          heading: 'Three entry points. One governed operating model.',
          subheading: 'Clients can engage by the pressure point they need to solve first, while keeping the work connected to the broader commercial operating model.',
          config: {
            cards: [
              {
                id: 'by-channel',
                title: 'By Channel',
                icon: 'bi-broadcast',
                body: 'Channel-specific services designed to improve reach, engagement, and performance without separating activation from governance and measurement.',
                points: [
                  'Search, social, email, programmatic, and mobile activation aligned to audience and business goals.',
                  'Execution models built for compliant delivery, operational consistency, and measurable optimisation.',
                  'Best suited for teams looking to strengthen performance within priority channels.'
                ],
                ctaLabel: 'Explore channel services',
                ctaUrl: 'by_channel.html'
              },
              {
                id: 'by-functionality',
                title: 'By Functionality',
                icon: 'bi-grid-3x3-gap',
                body: 'Integrated functions that connect planning, execution, governance, and reporting across the commercial operating model.',
                points: [
                  'Campaign management, digital marketing, automation, QA, project leadership, and account oversight.',
                  'Designed to reduce operational fragmentation and improve accountability across delivery teams.',
                  'Best suited for organisations seeking coordinated execution across multiple workstreams.'
                ],
                ctaLabel: 'Explore functional services',
                ctaUrl: 'by_function.html'
              },
              {
                id: 'by-role',
                title: 'By Role',
                icon: 'bi-people',
                body: 'Specialist roles that extend internal teams with targeted expertise across analytics, activation, delivery, automation, and QA.',
                points: [
                  'Access practitioners across search, social, programmatic, QA, project management, and MAP delivery.',
                  'Flexible role-based support that helps teams scale without compromising execution quality.',
                  'Best suited for organisations that need specialist capability embedded into existing teams.'
                ],
                ctaLabel: 'Explore role-based services',
                ctaUrl: 'by_role.html'
              }
            ]
          },
          visibility: true
        },
        {
          sectionKey: 'service-model',
          sectionLabel: 'Service Model',
          eyebrow: 'How We Structure Delivery',
          heading: 'How the delivery model reduces operating friction',
          subheading: 'Our service architecture helps life sciences organizations simplify execution across fragmented teams, technologies, and stakeholders while preserving governance and delivery quality.',
          config: {
            frames: [
              { number: '01', title: 'Prioritise The Right Work', body: 'We align service scope to business goals, campaign priorities, audience needs, and operating constraints so resources are directed where they create the greatest impact.' },
              { number: '02', title: 'Activate Through Integrated Teams', body: 'Channel specialists, functional experts, and delivery leads work as one coordinated team, reducing handoff friction and improving execution consistency.' },
              { number: '03', title: 'Embed Governance In Delivery', body: 'Quality, compliance, and workflow controls are built into the operating model to support execution discipline without slowing momentum.' },
              { number: '04', title: 'Continuously Improve Performance', body: 'We use campaign insights, delivery metrics, and operating feedback to optimise service outcomes and strengthen execution over time.' }
            ]
          },
          visibility: true
        },
        {
          sectionKey: 'service-outcomes',
          sectionLabel: 'Service Outcomes',
          config: {
            items: [
              { value: '3', suffix: 'x', label: 'Service entry points that let clients engage by channel, function, or role' },
              { value: '1', suffix: '', label: 'Coordinated operating model that connects strategy, execution, and governance' },
              { value: '6', suffix: '+', label: 'Core functional capabilities aligned to complex omnichannel program delivery' },
              { value: '10', suffix: '+', label: 'Specialist roles available to extend internal teams with targeted expertise' }
            ]
          },
          visibility: true
        },
        {
          sectionKey: 'newsletter',
          sectionLabel: 'Services Newsletter',
          heading: 'Use proof and advisory discussion to assess where the model should start.',
          config: {
            placeholder: 'Enter your email address',
            successMessage: 'Thanks for subscribing!'
          },
          visibility: true
        }
      ]
    },
    {
      slug: 'contact',
      title: 'Contact',
      template: PageTemplate.CONTACT,
      status: PublishStatus.PUBLISHED,
      heroTitle: 'Contact Us',
      heroSubtitle: 'Connect with our team to discuss partnership opportunities, omnichannel operations requirements, career conversations, or media enquiries. We will direct your request to the right specialists and respond promptly.',
      sections: [
        {
          sectionKey: 'contact-intro',
          sectionLabel: 'Contact Intro',
          eyebrow: 'Start The Conversation',
          heading: 'A clear route to the right team',
          body: {
            chips: ['Business Enquiries', 'Commercial Discussions', 'Careers', 'Media Requests', 'Global Delivery'],
            paragraphs: [
              '<strong>We have structured our contact process to make it easier for clients, candidates, and partners to reach the appropriate team quickly.</strong> Whether the requirement is strategic, operational, or informational, we ensure your enquiry reaches the right stakeholders without unnecessary delay.',
              'For business discussions, we focus on understanding objectives, delivery requirements, and operating context before aligning the conversation to the most relevant specialists. For careers and media requests, we route enquiries to the appropriate functions for a faster and more accurate response.'
            ]
          },
          visibility: true
        },
        {
          sectionKey: 'contact-cards',
          sectionLabel: 'Contact Cards',
          config: {
            cards: [
              {
                title: 'Business Inquiries',
                body: 'Speak with our team about omnichannel operations, delivery partnerships, and engagement models tailored to life sciences organisations.',
                ctaLabel: 'Get in touch',
                ctaUrl: '#contact-form'
              },
              {
                title: 'Career Opportunities',
                body: 'Explore opportunities to work with teams delivering strategic, operational, and digital excellence across healthcare engagement.',
                ctaLabel: 'Learn more',
                ctaUrl: '#contact-form'
              },
              {
                title: 'Media Inquiries',
                body: 'Contact our communications team for media requests, analyst conversations, and corporate information-related enquiries.',
                ctaLabel: 'Reach out',
                ctaUrl: '#contact-form'
              }
            ]
          },
          visibility: true
        },
        {
          sectionKey: 'contact-form',
          sectionLabel: 'Contact Form',
          eyebrow: 'Send Us a Message',
          heading: 'Tell us how we can help',
          subheading: '#FutureReadyHealthcare',
          body: {
            lead: 'Complete the form with a concise summary of your requirement and the appropriate team will respond within one business day. Fields marked with an asterisk (*) are required.'
          },
          config: {
            details: [
              { label: 'Email', value: 'oco@indegene.com' },
              { label: 'Website', value: 'www.indegene.com/oco' }
            ],
            successMessage: 'Thank you! Your message has been received. We\'ll be in touch within one business day.'
          },
          visibility: true
        }
      ]
    },
    {
      slug: 'case-studies',
      title: 'Case Studies',
      template: PageTemplate.CASE_STUDY_LIST,
      status: PublishStatus.PUBLISHED,
      heroTitle: 'Proof of governed omnichannel execution in the field',
      heroSubtitle: 'Review how life sciences teams have addressed launch, growth, activation, measurement, and optimization challenges through disciplined orchestration.',
      sections: [
        {
          sectionKey: 'library-intro',
          sectionLabel: 'Case Library Intro',
          eyebrow: 'Case Study Library',
          heading: 'Explore enterprise proof across launch, growth, brand revitalization, and specialty engagement.',
          body: {
            chips: ['Orchestration', 'Data & Analytics', 'Automation', 'Enablement', 'Platform Integration'],
            paragraphs: [
              'A curated view of business challenges, operating interventions, and outcome signals across orchestration, analytics, automation, enablement, and integrated engagement in life sciences.',
              'Use the library to identify comparable operating challenges and review the evidence before starting an advisory discussion.'
            ]
          },
          visibility: true
        }
      ]
    },
    {
      slug: 'resources',
      title: 'GenAI Services',
      template: PageTemplate.RESOURCE_LIST,
      status: PublishStatus.PUBLISHED,
      heroKicker: 'Generative AI Services',
      heroTitle: 'Bring GenAI into orchestration with control, speed, and enterprise confidence.',
      heroSubtitle: 'We help life sciences teams operationalise Generative AI across modular content production, insight generation, medical-review readiness, and workflow orchestration without compromising quality, compliance, or commercial control.',
      heroPrimaryLabel: 'Talk to a GenAI specialist',
      heroPrimaryUrl: 'contactus.html',
      heroSecondaryLabel: 'See interactive demo',
      heroSecondaryUrl: '#demo',
      sections: [
        {
          sectionKey: 'hero',
          sectionLabel: 'GenAI Hero',
          body: {
            pills: [
              { icon: 'bi-shield-check', label: 'Compliance-aware operating model' },
              { icon: 'bi-diagram-3', label: 'Modular content acceleration' },
              { icon: 'bi-bar-chart', label: 'Insight-led orchestration' }
            ]
          },
          visibility: true
        },
        {
          sectionKey: 'genai-overview',
          sectionLabel: 'GenAI Overview',
          eyebrow: 'What Is GenAI',
          heading: 'Where GenAI creates enterprise value in orchestration.',
          subheading: 'The value of GenAI does not come from isolated content generation. It comes from embedding AI within the operating model that governs prompts, source content, review logic, analytics, and release control.',
          body: {
            secondary: 'Our approach centers on the operating layer around GenAI: grounded source use, prompt design, workflow orchestration, human checkpoints, and measurable deployment across omnichannel programs.'
          },
          config: {
            cards: [
              {
                title: 'Grounded Generation',
                body: 'Outputs are anchored to approved source material, structured knowledge assets, and reusable components so teams can improve traceability, reuse, and review confidence.'
              },
              {
                title: 'Human-Governed Workflows',
                body: 'Workflows are designed around decision points so brand, medical, operations, and market teams retain authority over release decisions and execution quality.'
              },
              {
                title: 'Production-Ready Deployment',
                body: 'Generated outputs are connected to content operations, campaign calendars, activation workflows, and delivery platforms rather than treated as standalone experiments.'
              }
            ]
          },
          visibility: true
        },
        {
          sectionKey: 'genai-switcher',
          sectionLabel: 'GenAI Capability Switcher',
          eyebrow: 'Explore Capabilities',
          heading: 'Two enterprise deployment patterns.',
          subheading: 'Each capability addresses a different operating requirement, making it easier to identify where GenAI improves throughput, control, or decision support.',
          config: {
            cards: [
              {
                eyebrow: 'Capability One',
                title: 'Prompt Library',
                body: 'A centralized prompt layer for standardizing high-frequency campaign tasks across teams, markets, and recurring workflows.',
                meta: ['Reusable prompt frameworks', 'Reusable execution patterns'],
                url: '#prompt-library'
              },
              {
                eyebrow: 'Capability Two',
                title: 'Agentforce',
                body: 'An orchestration-led operating layer for routing work, guiding action, and preserving human control inside complex campaign workflows.',
                meta: ['Workflow-aware coordination', 'Connected execution support'],
                url: '#agentforce'
              }
            ]
          },
          visibility: true
        },
        {
          sectionKey: 'genai-prompt-library',
          sectionLabel: 'Prompt Library',
          eyebrow: 'Prompt Library',
          heading: 'A controlled prompt layer for repeatable campaign execution.',
          subheading: 'Prompt Library provides reusable, pre-validated prompts that help teams apply GenAI consistently across day-to-day orchestration without reinventing instructions or weakening controls.',
          body: {
            leftTitle: 'Why it matters',
            rightTitle: 'How it creates value'
          },
          config: {
            leftPoints: [
              {
                title: 'Faster execution without fragmented delivery',
                body: 'Reducing prompt creation time and repeat manual effort helps teams improve execution speed while maintaining common standards across markets, campaigns, and functions.'
              },
              {
                title: 'Consistency that scales',
                body: 'Reusable prompts support more consistent outputs across teams and campaigns, making AI usage easier to operationalize at enterprise scale.'
              },
              {
                title: 'Innovation inside the service model',
                body: 'Beyond efficiency, the model creates a controlled path for introducing AI into existing services through more disciplined workflows.'
              }
            ],
            tiles: [
              {
                title: 'Where it applies',
                body: 'Segmentation, content, QA, deployment, analytics, and reporting across the full campaign lifecycle.'
              },
              {
                title: 'Built for impact',
                body: 'Designed for enterprise orchestration, already in use across selected clients, and updated as additional use cases are introduced.'
              }
            ],
            rightPoints: [
              {
                title: 'Transforms repetitive work into AI-assisted workflows',
                body: 'Prompt patterns can be reused across high-frequency tasks, improving speed without increasing coordination overhead or review ambiguity.'
              },
              {
                title: 'Supports a shift from execution to decisions',
                body: 'Teams spend less time recreating instructions and more time evaluating output quality, business implications, and next-best actions.'
              },
              {
                title: 'Moves toward AI-augmented orchestration',
                body: 'This supports a more mature operating model in which efficiency, quality, and control improve together.'
              }
            ]
          },
          visibility: true
        },
        {
          sectionKey: 'genai-agentforce',
          sectionLabel: 'Agentforce',
          eyebrow: 'Agentforce',
          heading: 'An orchestration layer for workflow-driven AI support.',
          subheading: 'Agentforce connects workflow logic, routing rules, guided actions, and review checkpoints to support more coordinated execution across complex omnichannel programs.',
          config: {
            cards: [
              {
                title: 'Workflow-aware coordination',
                body: 'Connect tasks, dependencies, and operating checkpoints so AI support is embedded in the real flow of campaign work.',
                points: ['Task routing across delivery roles', 'Decision support tied to workflow state', 'Clear escalation and exception paths']
              },
              {
                title: 'Human-governed execution',
                body: 'Agentforce is designed to support teams inside operating structures that preserve review control, escalation logic, and release discipline.',
                points: ['Role-based checkpoints before activation', 'Operational visibility across handoffs', 'Governance aligned to commercial workflows']
              },
              {
                title: 'Connected operating value',
                body: 'By linking signals, prompts, workflow actions, and execution support, Agentforce helps teams move faster while keeping accountability visible.',
                points: ['Faster movement from signal to action', 'Less coordination overhead across teams', 'Stronger alignment between planning and delivery']
              }
            ]
          },
          visibility: true
        },
        {
          sectionKey: 'genai-demo',
          sectionLabel: 'Interactive Demo',
          eyebrow: 'Interactive Demo',
          heading: 'Illustrative operating scenarios for enterprise teams.',
          subheading: 'Use the selector to compare practical deployment patterns. The panel shows how reusable prompts, orchestration logic, and execution support change by objective.',
          config: {
            modes: [
              {
                key: 'content',
                mode: 'content',
                triggerTitle: 'Prompt Library',
                triggerBody: 'Apply pre-validated prompts to standardise execution across repeatable campaign tasks.',
                label: 'Use Case',
                title: 'Prompt Library for omnichannel campaign execution',
                body: 'A centralized prompt layer gives teams reusable, pre-validated instructions for high-frequency campaign tasks, reducing manual effort and improving consistency across distributed execution teams.',
                metricLabel: 'Execution acceleration',
                metricValue: 'Ready',
                metrics: ['72%', '61%', '54%'],
                points: [
                  'Standardise segmentation, content, QA, deployment, analytics, and reporting prompts.',
                  'Reduce prompt recreation across teams and campaign cycles.',
                  'Move faster with reusable frameworks that are ready for governed deployment.'
                ]
              },
              {
                key: 'segmentation',
                mode: 'segmentation',
                triggerTitle: 'Agentforce',
                triggerBody: 'Coordinate workflow logic, task routing, and guided action across teams and delivery checkpoints.',
                label: 'Use Case',
                title: 'Agentforce for coordinated workflow support',
                body: 'Workflow-aware AI support routes work to the right teams, surfaces the next best action, and keeps human checkpoints visible across distributed delivery models.',
                metricLabel: 'Workflow coordination',
                metricValue: 'Connected',
                metrics: ['78%', '64%', '58%'],
                points: [
                  'Connect task routing, workflow state, and review checkpoints inside one operating flow.',
                  'Improve visibility across handoffs, dependencies, and exceptions.',
                  'Preserve human control while increasing delivery speed.'
                ]
              },
              {
                key: 'review',
                mode: 'review',
                triggerTitle: 'Execution Support Layer',
                triggerBody: 'Support delivery teams with summaries, content lineage, and exception visibility across campaign workflows.',
                label: 'Use Case',
                title: 'Execution support across governed delivery',
                body: 'AI-assisted summaries, content lineage, and exception visibility help teams keep programs moving while preserving quality, accountability, and release readiness.',
                metricLabel: 'Control visibility',
                metricValue: 'Active',
                metrics: ['69%', '57%', '49%'],
                points: [
                  'Give teams faster access to context, summaries, and content history.',
                  'Surface exceptions before they slow downstream delivery.',
                  'Improve release confidence across regulated omnichannel workflows.'
                ]
              }
            ]
          },
          visibility: true
        },
        {
          sectionKey: 'genai-data-band',
          sectionLabel: 'Operating Priorities',
          eyebrow: 'Operating Priorities',
          heading: 'Enterprise priorities for GenAI deployment.',
          subheading: 'Effective GenAI programs are built around operating guardrails, ownership models, measurable business cases, and explicit release control. Our focus is on the orchestration layer around the model, not the model in isolation.',
          config: {
            items: [
              {
                value: '3',
                suffix: ' layers',
                label: 'Operating layers for enterprise GenAI adoption: governed prompts, workflow design, and AI-assisted delivery controls.'
              },
              {
                value: '2',
                suffix: '',
                label: 'Applied capabilities at the centre of this offer: Prompt Library for reusable prompt assets and Agentforce for orchestrated workflow support.'
              },
              {
                value: '1',
                suffix: '',
                label: 'Connected operating layer spanning prompts, review logic, workflow routing, delivery teams, and activation channels.'
              }
            ]
          },
          visibility: true
        },
        {
          sectionKey: 'genai-cta',
          sectionLabel: 'GenAI CTA',
          heading: 'Ready to design a more controlled GenAI operating model?',
          subheading: 'Discuss how GenAI can improve throughput, strengthen control, and support connected customer engagement across life sciences commercial orchestration.',
          ctaLabel: 'Speak to our GenAI team',
          ctaUrl: 'contactus.html',
          config: {
            secondaryLabel: 'See interactive demo',
            secondaryUrl: '#demo'
          },
          visibility: true
        }
      ]
    },
    {
      slug: 'biopharmaceuticals',
      title: 'Biopharmaceuticals',
      template: PageTemplate.STANDARD,
      status: PublishStatus.PUBLISHED,
      heroKicker: 'Who We Serve',
      heroTitle: 'Omnichannel operations built for enterprise-scale biopharma',
      heroSubtitle: 'We partner with the world\'s leading biopharmaceutical organisations to orchestrate compliant, data-driven engagement across every channel, powering HCP connections, patient programs, and commercial launches at global scale.',
      heroPrimaryLabel: 'Talk to an Expert',
      heroPrimaryUrl: 'contactus.html',
      heroSecondaryLabel: 'See Capabilities',
      heroSecondaryUrl: '#capabilities',
      sections: []
    },
    {
      slug: 'emerging-biotech',
      title: 'Emerging Biotech',
      template: PageTemplate.STANDARD,
      status: PublishStatus.PUBLISHED,
      heroKicker: 'Who We Serve',
      heroTitle: 'Launch-speed operations for ambitious biotech companies',
      heroSubtitle: 'We give emerging biotech organisations the commercial orchestration engine they need to punch above their weight, bringing enterprise-grade precision, speed, and specialist HCP engagement capability to high-growth companies at every stage of commercialisation.',
      heroPrimaryLabel: 'Talk to an Expert',
      heroPrimaryUrl: 'contactus.html',
      heroSecondaryLabel: 'See Capabilities',
      heroSecondaryUrl: '#capabilities',
      sections: []
    },
    {
      slug: 'by-role',
      title: 'By Role',
      template: PageTemplate.STANDARD,
      status: PublishStatus.PUBLISHED,
      heroTitle: 'By Role',
      heroSubtitle: 'We cover data analysis, strategy, operational leadership, marketing automation, multi-channel campaigns, and client relationship management to ensure seamless, data-driven, scalable pharma operations.',
      sections: []
    },
    {
      slug: 'by-channel',
      title: 'By Channel',
      template: PageTemplate.STANDARD,
      status: PublishStatus.PUBLISHED,
      heroTitle: 'By Channel',
      heroSubtitle: 'We provide end-to-end omnichannel campaign services across email, mobile, social media, and programmatic channels, delivering personalised, compliant, and measurable engagement that drives scalable growth.',
      sections: []
    },
    {
      slug: 'by-function',
      title: 'By Function',
      template: PageTemplate.STANDARD,
      status: PublishStatus.PUBLISHED,
      heroTitle: 'By Function',
      heroSubtitle: 'We empower pharma with integrated omnichannel solutions, from campaign management and digital marketing to MAP, QA, project management, and account management, ensuring seamless, data-driven operations at scale.',
      sections: []
    },
    {
      slug: 'indegene-revitalizes',
      title: 'Indegene Revitalizes Mature Brand Using Proprietary, Data-Driven Approach',
      template: PageTemplate.CASE_STUDY_DETAIL,
      status: PublishStatus.PUBLISHED,
      heroTitle: 'Indegene Revitalizes Mature Brand Using Proprietary, Data-Driven Approach',
      heroSubtitle: 'A featured case study demonstrating how data-driven omnichannel execution can restore momentum for a mature brand in a complex healthcare environment.',
      sections: []
    }
  ];

  for (const page of pages) {
    const createdPage = await prisma.page.upsert({
      where: { slug: page.slug },
      update: {
        title: page.title,
        template: page.template,
        status: page.status,
        heroKicker: page.heroKicker || null,
        heroTitle: page.heroTitle,
        heroSubtitle: page.heroSubtitle || null,
        heroPrimaryLabel: page.heroPrimaryLabel || null,
        heroPrimaryUrl: page.heroPrimaryUrl || null,
        heroSecondaryLabel: page.heroSecondaryLabel || null,
        heroSecondaryUrl: page.heroSecondaryUrl || null
      },
      create: {
        slug: page.slug,
        title: page.title,
        template: page.template,
        status: page.status,
        heroKicker: page.heroKicker || null,
        heroTitle: page.heroTitle,
        heroSubtitle: page.heroSubtitle || null,
        heroPrimaryLabel: page.heroPrimaryLabel || null,
        heroPrimaryUrl: page.heroPrimaryUrl || null,
        heroSecondaryLabel: page.heroSecondaryLabel || null,
        heroSecondaryUrl: page.heroSecondaryUrl || null
      }
    });

    for (const [index, section] of page.sections.entries()) {
      const key = {
        pageId_sectionKey: {
          pageId: createdPage.id,
          sectionKey: section.sectionKey
        }
      };
      const existing = await prisma.pageSection.findUnique({ where: key });

      if (existing) {
        // Preserve existing editorial content; only keep ordering/visibility/label aligned.
        await prisma.pageSection.update({
          where: key,
          data: {
            sectionLabel: section.sectionLabel,
            visibility: section.visibility,
            sortOrder: index
          }
        });
      } else {
        await prisma.pageSection.create({
          data: {
            pageId: createdPage.id,
            sectionKey: section.sectionKey,
            sectionLabel: section.sectionLabel,
            eyebrow: section.eyebrow || null,
            heading: section.heading,
            subheading: section.subheading || null,
            body: section.body || null,
            ctaLabel: section.ctaLabel || null,
            ctaUrl: section.ctaUrl || null,
            config: section.config || null,
            visibility: section.visibility,
            sortOrder: index
          }
        });
      }
    }
  }

  const homePage = await prisma.page.findUnique({
    where: { slug: 'home' },
    select: { id: true }
  });

  if (homePage) {
    await prisma.pageSection.deleteMany({
      where: {
        pageId: homePage.id,
        sectionKey: 'usp'
      }
    });
  }

  const capabilityLabelUpdates = [
    {
      slug: 'strategy',
      labels: {
        'workflow-title': 'Organizational Strengths',
        'focus-title': 'Business Impact'
      }
    },
    {
      slug: 'planning',
      labels: {
        'workflow-title': 'Organizational Strengths',
        'focus-title': 'Business Impact'
      }
    },
    {
      slug: 'orchestration',
      labels: {
        'workflow-title': 'Organizational Strengths',
        'focus-title': 'Business Impact'
      }
    },
    {
      slug: 'execution',
      labels: {
        'workflow-title': 'Organizational Strengths',
        'focus-title': 'Business Impact'
      }
    },
    {
      slug: 'measurement',
      labels: {
        'workflow-title': 'Organizational Strengths',
        'focus-title': 'Business Impact'
      }
    },
    {
      slug: 'analytics',
      labels: {
        'workflow-title': 'Organizational Strengths',
        'focus-title': 'Business Impact'
      }
    }
  ];

  for (const entry of capabilityLabelUpdates) {
    const page = await prisma.page.findUnique({
      where: { slug: entry.slug },
      select: { id: true }
    });

    if (!page) continue;

    for (const [sectionKey, sectionLabel] of Object.entries(entry.labels)) {
      await prisma.pageSection.updateMany({
        where: {
          pageId: page.id,
          sectionKey
        },
        data: {
          sectionLabel
        }
      });
    }
  }
}

async function upsertSiteSettings() {
  const settings = [
    {
      key: 'brand.tagline',
      value: 'FutureReadyHealthcare',
      description: 'Shared utility-bar brand tagline'
    },
    {
      key: 'footer.copy',
      value: 'Delivering end-to-end omnichannel orchestration for life sciences organisations globally.',
      description: 'Shared footer brand summary'
    },
    {
      key: 'legal.copyright',
      value: '© 2026 Campaign OmniChannel. All rights reserved.',
      description: 'Shared copyright statement'
    },
    {
      key: 'contact.primaryEmail',
      value: 'oco@indegene.com',
      description: 'Primary contact email'
    },
    {
      key: 'topbar.links',
      value: [
        { label: 'About Us', url: 'index.html' },
        { label: 'Leadership', url: 'index.html' },
        { label: 'Our Services', url: 'services.html' },
        { label: 'Case Studies', url: 'casestudy.html' }
      ],
      description: 'Top utility bar links'
    },
    {
      key: 'header.links',
      value: [
        { label: 'Who We Serve', url: 'biopharmaceuticals.html' },
        { label: 'Capabilities', url: 'services.html' },
        { label: 'Why Choose Us', url: 'by_role.html' },
        { label: 'Case Studies', url: 'casestudy.html' },
        { label: 'GenAI', url: 'genai.html' },
        { label: 'Insights', url: 'https://www.indegene.com/what-we-think/blogs' },
        { label: 'About', url: 'https://www.indegene.com/who-we-are/about-us' }
      ],
      description: 'Desktop header navigation links'
    },
    {
      key: 'header.cta',
      value: { label: 'Contact Us', url: 'contactus.html' },
      description: 'Desktop header call to action'
    },
    {
      key: 'mobile.nav',
      value: [
        {
          label: 'Who We Serve',
          items: [
            { label: 'Biopharmaceuticals', url: 'biopharmaceuticals.html' },
            { label: 'Emerging Biotech', url: 'emerging-biotech.html' }
          ]
        },
        {
          label: 'What We Do',
          items: [
            { label: 'Services', url: 'services.html' },
            { label: 'By Role', url: 'by_role.html' },
            { label: 'By Channel', url: 'by_channel.html' },
            { label: 'By Function', url: 'by_function.html' },
            { label: 'GenAI Services', url: 'genai.html' }
          ]
        },
        {
          label: 'How We Deliver',
          items: [
            { label: 'Enterprise Proof', url: 'index.html#cpt3' },
            { label: 'Tool Partners', url: 'index.html#cpt1' },
            { label: 'Global Delivery Model', url: 'services.html#service-model-title' }
          ]
        },
        {
          label: 'What We Think',
          items: [
            { label: 'Case Studies', url: 'casestudy.html' },
            { label: 'GenAI Services', url: 'genai.html' }
          ]
        }
      ],
      description: 'Mobile navigation groups'
    },
    {
      key: 'footer.columns',
      value: [
        {
          title: 'Company',
          links: [
            { label: 'About', url: 'index.html' },
            { label: 'Leadership', url: 'index.html' },
            { label: 'Careers', url: 'contactus.html#contact-form' },
            { label: 'Contact', url: 'contactus.html' }
          ]
        },
        {
          title: 'Services',
          links: [
            { label: 'Orchestration', url: 'by_function.html#fn1' },
            { label: 'Platform Integration', url: 'services.html#by-functionality' },
            { label: 'GenAI Services', url: 'genai.html' },
            { label: 'Analytics & Data', url: 'by_function.html#fn3' }
          ]
        },
        {
          title: 'Resources',
          links: [
            { label: 'Case Studies', url: 'casestudy.html' },
            { label: 'Insights', url: 'genai.html' },
            { label: 'Thought Leadership', url: 'genai.html#demo' },
            { label: 'Services Overview', url: 'services.html' }
          ]
        },
        {
          title: 'Legal & Misc',
          links: [
            { label: 'Privacy Policy', url: 'contactus.html#consent2-wrap' },
            { label: 'Terms & Enquiries', url: 'contactus.html#contact-form' },
            { label: 'Global Reach', url: 'index.html#cpt3' },
            { label: 'Social Channels', url: 'by_channel.html#ch2' }
          ]
        }
      ],
      description: 'Footer columns'
    },
    {
      key: 'footer.cta',
      value: { label: 'Contact Us', url: 'contactus.html' },
      description: 'Footer CTA'
    },
    {
      key: 'search.placeholder',
      value: 'Search topics, services, insights...',
      description: 'Shared search placeholder'
    }
  ];

  for (const setting of settings) {
    await prisma.siteSetting.upsert({
      where: { key: setting.key },
      update: { value: setting.value, description: setting.description },
      create: setting
    });
  }
}

async function upsertTestimonials() {
  const testimonials = [
    ['Stevie Wills', 'Life Sciences Partner', 'Global Biopharma', 'Indegene brings a strong combination of strategic perspective and execution discipline. The team operates with transparency, accountability, and a clear focus on client outcomes.'],
    ['Jack Daniels', 'Marketing Director', 'Regional Pharma', 'The team combines deep domain expertise with a highly collaborative delivery model, ensuring that programmes move forward efficiently and to a consistently high standard.'],
    ['Maria Chen', 'VP Digital', 'Enterprise Life Sciences', 'The level of compliance understanding and operational precision OCO brings to the table is exceptional. They have become an indispensable extension of our global marketing team.'],
    ['Elena Novak', 'Regional Commercial Lead', 'Specialty Pharma', 'We value the consistency of delivery as much as the quality of thinking. Their operating model gives us confidence that execution will hold together across markets and teams.'],
    ['Rohan Mehta', 'Commercial Excellence Director', 'Healthcare Enterprise', 'OCO helped bring structure to a complex omnichannel programme. The team was responsive, organised, and consistently strong at connecting strategy with execution.'],
    ['Rachel Morgan', 'Omnichannel Lead', 'Global Healthcare', 'Their ability to work across stakeholders, workflows, and approval requirements has been a major advantage. We see a high level of ownership in the way they deliver.']
  ];

  await prisma.testimonial.deleteMany();
  for (const [index, row] of testimonials.entries()) {
    await prisma.testimonial.create({
      data: {
        clientName: row[0],
        role: row[1],
        company: row[2],
        quote: row[3],
        isVisible: true,
        sortOrder: index
      }
    });
  }
}

async function upsertClients() {
  const clients = [
    ['salesforce', 'Salesforce', 'Customer engagement and workflow infrastructure that supports compliant orchestration across complex life sciences journeys.', 'https://www.salesforce.com'],
    ['jira', 'Jira', 'Program governance and delivery coordination that strengthens operational visibility, auditability, and execution discipline.', 'https://www.atlassian.com/software/jira'],
    ['adobe', 'Adobe', 'Experience and content capabilities that help teams deliver modular, high-quality engagement across digital touchpoints.', 'https://www.adobe.com'],
    ['microsoft', 'Microsoft', 'Enterprise cloud and productivity services that enable secure collaboration, analytics, and scalable operating models.', 'https://www.microsoft.com'],
    ['infobip', 'Infobip', 'Messaging and communications infrastructure that supports timely, governed outreach across mobile engagement channels.', 'https://www.infobip.com'],
    ['cvent', 'Cvent', 'Event technology capabilities that strengthen audience management, field engagement, and professional meeting execution.', 'https://www.cvent.com'],
    ['on24', 'ON24', 'Digital event and webinar delivery that supports scalable education, audience insight, and measurable engagement outcomes.', 'https://www.on24.com'],
    ['spotme', 'SpotMe', 'Enterprise event engagement technology designed to support premium digital experiences and richer audience interaction.', 'https://spotme.com']
  ];

  await prisma.client.deleteMany();
  for (const [index, row] of clients.entries()) {
    await prisma.client.create({
      data: {
        slug: row[0],
        name: row[1],
        description: row[2],
        websiteUrl: row[3],
        isVisible: true,
        sortOrder: index
      }
    });
  }
}

async function upsertServices() {
  const services = [
    ['campaign-operations', 'Orchestration', 'Channel Execution', 'Execution models that connect planning, launch, optimisation, and governance across omnichannel programmes.', 'Operational delivery spanning briefing, activation, measurement, and continuous optimisation.'],
    ['platform-integration', 'Platform Integration', 'Functional Delivery', 'Integration support that connects CRM, automation, reporting, and workflow systems into a coordinated operating model.', 'Integration design and delivery aligned to martech, data, and campaign execution workflows.'],
    ['analytics-and-data', 'Analytics & Data', 'Functional Delivery', 'Measurement and analytics services that improve visibility, control, and performance across life sciences engagement programmes.', 'Data pipelines, dashboards, insight generation, and performance intelligence support.'],
    ['enablement', 'Enablement', 'Role-Based Enablement', 'Specialist capability that extends internal teams with targeted delivery, governance, and martech expertise.', 'Embedded specialists across QA, MAP, project management, and execution leadership.']
  ];

  await prisma.service.deleteMany();
  for (const [index, row] of services.entries()) {
    await prisma.service.create({
      data: {
        slug: row[0],
        name: row[1],
        category: row[2],
        summary: row[3],
        content: row[4],
        isVisible: true,
        sortOrder: index
      }
    });
  }
}

async function upsertCaseStudies() {
  const tags = await prisma.tag.findMany();
  const tagMap = Object.fromEntries(tags.map((tag) => [tag.label, tag.id]));
  const { overrides } = await buildCaseStudyDetailOverrides(process.cwd(), { rootDir: env.PUBLIC_ROOT });
  const caseStudies = [
    {
      slug: 'revitalising-mature-brand-data-led-omnichannel-model',
      title: 'Revitalising a mature brand with a data-led omnichannel operating model',
      excerpt: 'A mature brand was repositioned through sharper audience prioritisation, coordinated activation, and performance-led optimisation.',
      content: '<p>A mature brand was repositioned through sharper audience prioritisation, coordinated activation, and performance-led optimisation across commercial touchpoints.</p>',
      sourceUrl: 'Indegene Revitalizes.html',
      isFeatured: true,
      tagLabels: ['Orchestration', 'Data & Analytics', 'Performance Marketing']
    },
    {
      slug: 'improving-market-reach-and-incremental-roi',
      title: 'Improving market reach and incremental ROI for a urology brand',
      excerpt: 'An omnichannel engagement strategy improved market coverage and revenue contribution through better channel allocation.',
      content: '<p>An omnichannel engagement strategy improved market coverage and revenue contribution by combining execution discipline with sharper channel allocation.</p>',
      sourceUrl: 'https://mcnssw398ps7l596p7c82brp8tbm.pub.sfmc-content.com/eezmgbrnemq',
      tagLabels: ['Orchestration', 'Data & Analytics', 'Performance Marketing']
    },
    {
      slug: 'driving-awareness-demand-specialty-diagnostic-test',
      title: 'Driving awareness and demand for a specialty diagnostic test',
      excerpt: 'A lead generation programme improved brand visibility and response quality through coordinated digital activation and streamlined demand capture.',
      content: '<p>A lead generation programme improved brand visibility and response quality through coordinated digital activation and streamlined demand capture.</p>',
      sourceUrl: 'https://mcnssw398ps7l596p7c82brp8tbm.pub.sfmc-content.com/1n50nbirjfz',
      tagLabels: ['Orchestration', 'Automation', 'Performance Marketing']
    },
    {
      slug: 'raising-brand-performance-through-data-driven-optimisation',
      title: 'Raising brand performance through data-driven omnichannel optimisation',
      excerpt: 'Integrated performance intelligence helped refine channel orchestration, improve message relevance, and strengthen commercial impact.',
      content: '<p>Integrated performance intelligence helped refine channel orchestration, improve message relevance, and strengthen commercial impact across the brand journey.</p>',
      sourceUrl: 'https://mcnssw398ps7l596p7c82brp8tbm.pub.sfmc-content.com/dkzfjepbhf0',
      tagLabels: ['Data & Analytics', 'Orchestration']
    },
    {
      slug: 'extending-mature-brand-growth-with-digital-rep-equivalence',
      title: 'Extending mature brand growth with digital rep equivalence',
      excerpt: 'A digitally enabled field engagement model expanded reach and improved execution consistency for a mature therapy.',
      content: '<p>A digitally enabled field engagement model expanded reach and improved execution consistency for a mature therapy in a cost-conscious commercial environment.</p>',
      sourceUrl: 'https://mcnssw398ps7l596p7c82brp8tbm.pub.sfmc-content.com/jo2jcbvidqx',
      tagLabels: ['Enablement', 'Automation', 'Orchestration']
    },
    {
      slug: 'increasing-sales-impact-with-omnichannel-analytics',
      title: 'Increasing sales impact with omnichannel analytics',
      excerpt: 'Advanced measurement and optimisation created a more responsive commercial model and stronger sales outcomes.',
      content: '<p>Advanced measurement and optimisation created a more responsive commercial model, improving execution quality and strengthening brand sales outcomes.</p>',
      sourceUrl: 'https://mcnssw398ps7l596p7c82brp8tbm.pub.sfmc-content.com/rz50dzzmkfn',
      tagLabels: ['Data & Analytics', 'Performance Marketing', 'Orchestration']
    },
    {
      slug: 'unlocking-360-customer-insight-oncology-launch',
      title: 'Unlocking 360-degree customer insight for an oncology launch',
      excerpt: 'A launch programme combined data unification, audience insight, and cross-functional enablement.',
      content: '<p>A launch programme combined data unification, audience insight, and cross-functional enablement to support more informed decision-making and engagement planning.</p>',
      sourceUrl: 'https://mcnssw398ps7l596p7c82brp8tbm.pub.sfmc-content.com/awjswfjwvqj',
      tagLabels: ['Data & Analytics', 'Platform Integration', 'Enablement']
    },
    {
      slug: 'accelerating-awareness-and-diagnosis-in-rare-disease-pathways',
      title: 'Accelerating awareness and diagnosis in rare disease pathways',
      excerpt: 'Targeted omnichannel engagement improved awareness building and supported earlier diagnosis across a specialised treatment landscape.',
      content: '<p>Targeted omnichannel engagement improved awareness building and supported earlier diagnosis across a complex and highly specialised treatment landscape.</p>',
      sourceUrl: 'https://mcnssw398ps7l596p7c82brp8tbm.pub.sfmc-content.com/mt20mdc5ryw',
      tagLabels: ['Performance Marketing', 'Orchestration', 'Data & Analytics']
    },
    {
      slug: 'expanding-specialty-neurology-sales-in-whitespace-markets',
      title: 'Expanding specialty neurology product sales in whitespace markets',
      excerpt: 'A focused activation model helped address whitespace opportunity by improving territory prioritisation and orchestration.',
      content: '<p>A focused activation model helped address whitespace opportunity by improving territory prioritisation, orchestration, and field-facing support.</p>',
      sourceUrl: 'https://mcnssw398ps7l596p7c82brp8tbm.pub.sfmc-content.com/n0f3pq43hfn',
      tagLabels: ['Performance Marketing', 'Orchestration', 'Enablement']
    },
    {
      slug: 'reactivating-hcp-engagement-for-mature-oncology-brand',
      title: 'Reactivating HCP engagement for a mature oncology brand',
      excerpt: 'Dormant and inactive audiences were re-engaged through more targeted orchestration and refreshed content pathways.',
      content: '<p>Dormant and inactive audiences were re-engaged through more targeted orchestration, refreshed content pathways, and sharper activation sequencing.</p>',
      sourceUrl: 'https://mcnssw398ps7l596p7c82brp8tbm.pub.sfmc-content.com/sdry50jullf',
      tagLabels: ['Performance Marketing', 'Orchestration', 'Automation']
    },
    {
      slug: 'regaining-market-share-pain-relief-portfolio',
      title: 'Regaining market share across a mature pain relief portfolio',
      excerpt: 'Portfolio performance improved through targeted channel planning, execution discipline, and ongoing optimisation.',
      content: '<p>Portfolio performance improved through targeted channel planning, execution discipline, and ongoing optimisation across priority customer segments.</p>',
      sourceUrl: 'https://mcnssw398ps7l596p7c82brp8tbm.pub.sfmc-content.com/5enq5swni1n',
      tagLabels: ['Performance Marketing', 'Orchestration', 'Data & Analytics']
    },
    {
      slug: 'exceeding-co-promotion-forecasts-ophthalmology-brands',
      title: 'Exceeding co-promotion forecasts across three ophthalmology brands',
      excerpt: 'A coordinated commercial model aligned teams, channels, and execution workflows to support stronger co-promotion delivery.',
      content: '<p>A coordinated commercial model aligned teams, channels, and execution workflows to support stronger co-promotion delivery across multiple brands.</p>',
      sourceUrl: 'https://mcnssw398ps7l596p7c82brp8tbm.pub.sfmc-content.com/tzcb1e4o01j',
      tagLabels: ['Platform Integration', 'Enablement', 'Orchestration']
    },
    {
      slug: 'restoring-mature-brand-momentum-restless-legs-therapy',
      title: 'Restoring mature brand momentum for a restless legs syndrome therapy',
      excerpt: 'A targeted omnichannel approach supported renewed brand activity through segmentation, channel planning, and performance management.',
      content: '<p>A targeted omnichannel approach supported renewed brand activity by combining focused segmentation, channel planning, and ongoing performance management.</p>',
      sourceUrl: 'https://mcnssw398ps7l596p7c82brp8tbm.pub.sfmc-content.com/bfupxw5kpht',
      tagLabels: ['Performance Marketing', 'Orchestration', 'Data & Analytics']
    },
    {
      slug: 'reactivating-dormant-hcp-audiences-oncology-brand',
      title: 'Reactivating dormant HCP audiences for an oncology brand',
      excerpt: 'A reactivation programme improved engagement with previously inactive HCP segments through sharper content sequencing.',
      content: '<p>A reactivation programme improved engagement with previously inactive HCP segments through sharper content sequencing and better-timed outreach.</p>',
      sourceUrl: 'https://mcnssw398ps7l596p7c82brp8tbm.pub.sfmc-content.com/qmasbak4d2u',
      tagLabels: ['Automation', 'Performance Marketing', 'Orchestration']
    },
    {
      slug: 'driving-new-to-brand-prescriptions-whitespace-territories',
      title: 'Driving new-to-brand prescriptions in whitespace territories',
      excerpt: 'Whitespace opportunity was activated through structured campaign delivery, better field alignment, and sharper prioritisation.',
      content: '<p>Whitespace opportunity was activated through structured campaign delivery, better field alignment, and sharper prioritisation of high-value audiences.</p>',
      sourceUrl: 'https://mcnssw398ps7l596p7c82brp8tbm.pub.sfmc-content.com/xe5sm4fsuig',
      tagLabels: ['Performance Marketing', 'Orchestration', 'Enablement']
    }
  ];

  await prisma.caseStudyTag.deleteMany();
  await prisma.caseStudy.deleteMany();
  for (const item of caseStudies) {
    const detailOverride = overrides[item.sourceUrl] || {};
    const created = await prisma.caseStudy.create({
      data: {
        slug: item.slug,
        title: detailOverride.title || item.title,
        excerpt: detailOverride.excerpt || item.excerpt,
        content: detailOverride.content || item.content,
        sourceUrl: detailOverride.sourceUrl || item.sourceUrl,
        status: PublishStatus.PUBLISHED,
        seoTitle: detailOverride.seoTitle || null,
        seoDescription: detailOverride.seoDescription || null,
        structuredData: detailOverride.structuredData || null,
        publishedAt: new Date(),
        isFeatured: Boolean(item.isFeatured)
      }
    });

    for (const label of item.tagLabels) {
      if (tagMap[label]) {
        await prisma.caseStudyTag.create({
          data: {
            caseStudyId: created.id,
            tagId: tagMap[label]
          }
        });
      }
    }
  }
}

async function upsertResources() {
  const tags = await prisma.tag.findMany();
  const tagMap = Object.fromEntries(tags.map((tag) => [tag.label, tag.id]));
  const resources = [
    {
      slug: 'future-ready-campaign-operations',
      title: 'Building a future-ready orchestration model',
      excerpt: 'A practical view of the operating model choices that improve consistency, control, and execution quality.',
      content: '<p>A practical view of the operating model choices that improve consistency, control, and execution quality across life sciences campaigns.</p>',
      sourceUrl: 'services.html',
      authorName: 'OCO Editorial Team',
      tagLabels: ['Orchestration', 'Enablement']
    },
    {
      slug: 'genai-in-martech-operations',
      title: 'Where GenAI fits into martech operations',
      excerpt: 'How teams can use GenAI to improve content adaptation, workflow speed, and execution support.',
      content: '<p>How teams can use GenAI to improve content adaptation, workflow speed, and execution support without adding operational noise.</p>',
      sourceUrl: 'genai.html',
      authorName: 'OCO Strategy Team',
      tagLabels: ['Automation', 'Data & Analytics']
    }
  ];

  await prisma.resourceTag.deleteMany();
  await prisma.resource.deleteMany();
  for (const item of resources) {
    const created = await prisma.resource.create({
      data: {
        slug: item.slug,
        title: item.title,
        excerpt: item.excerpt,
        content: item.content,
        sourceUrl: item.sourceUrl,
        authorName: item.authorName,
        status: PublishStatus.PUBLISHED,
        publishedAt: new Date()
      }
    });

    for (const label of item.tagLabels) {
      if (tagMap[label]) {
        await prisma.resourceTag.create({
          data: {
            resourceId: created.id,
            tagId: tagMap[label]
          }
        });
      }
    }
  }
}

async function upsertPrivatePageAccess() {
  const pageKey = 'partner-access';
  const passwordHash = await bcrypt.hash(env.PRIVATE_PAGE_DEFAULT_PASSWORD, 12);

  const credential = await prisma.privatePageCredential.upsert({
    where: {
      pageKey_username: {
        pageKey,
        username: env.PRIVATE_PAGE_DEFAULT_USERNAME
      }
    },
    update: {
      description: 'Starter seeded credential for the protected partner resource room.',
      passwordHash,
      isActive: true
    },
    create: {
      pageKey,
      username: env.PRIVATE_PAGE_DEFAULT_USERNAME,
      passwordHash,
      description: 'Starter seeded credential for the protected partner resource room.',
      isActive: true
    }
  });

  await prisma.privatePageResource.deleteMany({
    where: { pageKey }
  });

  const starterResources = [
    {
      title: 'Corporate overview deck',
      resourceType: 'PRESENTATION_DECK',
      description: 'Replace this starter link with the current partner-facing corporate presentation.',
      url: 'https://example.com/partner/corporate-overview-deck',
      ctaLabel: 'Open deck',
      sortOrder: 1
    },
    {
      title: 'Product walkthrough demo',
      resourceType: 'LIVE_DEMO',
      description: 'Starter demo link for a live walkthrough or sandbox experience.',
      url: 'https://example.com/partner/live-demo',
      ctaLabel: 'Launch demo',
      sortOrder: 2
    },
    {
      title: 'Solution one-pager',
      resourceType: 'DOCUMENT',
      description: 'Use this slot for PDF summaries, briefs, or implementation notes.',
      url: 'https://example.com/partner/solution-one-pager',
      ctaLabel: 'View document',
      sortOrder: 3
    }
  ];

  const createdResources = [];

  for (const resource of starterResources) {
    const created = await prisma.privatePageResource.create({
      data: {
        pageKey,
        title: resource.title,
        resourceType: resource.resourceType,
        description: resource.description,
        url: resource.url,
        ctaLabel: resource.ctaLabel,
        isVisible: true,
        sortOrder: resource.sortOrder
      }
    });
    createdResources.push(created);
  }

  await prisma.privatePageCredentialResource.deleteMany({
    where: {
      credentialId: credential.id
    }
  });

  await prisma.privatePageCredentialResource.createMany({
    data: createdResources.map((resource) => ({
      credentialId: credential.id,
      resourceId: resource.id
    })),
    skipDuplicates: true
  });
}

async function main() {
  const passwordHash = await bcrypt.hash(env.DEFAULT_ADMIN_PASSWORD, 12);

  await prisma.user.upsert({
    where: { email: env.DEFAULT_ADMIN_EMAIL },
    update: {
      fullName: 'Platform Administrator',
      passwordHash,
      role: UserRole.ADMIN,
      isActive: true
    },
    create: {
      email: env.DEFAULT_ADMIN_EMAIL,
      fullName: 'Platform Administrator',
      passwordHash,
      role: UserRole.ADMIN,
      isActive: true
    }
  });

  await prisma.analyticsSetting.upsert({
    where: { id: 'default-analytics-setting' },
    update: {
      ga4MeasurementId: env.GA4_MEASUREMENT_ID || null,
      isTrackingEnabled: Boolean(env.GA4_MEASUREMENT_ID),
      eventConfig: {
        trackCtaClicks: true,
        trackFormSubmissions: true
      }
    },
    create: {
      id: 'default-analytics-setting',
      ga4MeasurementId: env.GA4_MEASUREMENT_ID || null,
      isTrackingEnabled: Boolean(env.GA4_MEASUREMENT_ID),
      eventConfig: {
        trackCtaClicks: true,
        trackFormSubmissions: true
      }
    }
  });

  await upsertTags();
  await upsertMenus();
  await upsertPages();
  await syncCmsPages(prisma, { rootDir: env.PUBLIC_ROOT });
  await upsertSiteSettings();
  await upsertTestimonials();
  await upsertClients();
  await upsertServices();
  await upsertCaseStudies();
  await syncCaseStudyDetails(prisma, { rootDir: env.PUBLIC_ROOT });
  await upsertResources();
  await upsertPrivatePageAccess();
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
