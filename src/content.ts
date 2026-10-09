/**
 * All site copy lives here so it can be reviewed and edited in one place.
 *
 * REVIEW_MODE shows small "Needs approval" markers on anything listed in
 * CONTENT_REVIEW.md. Set it to false before publishing.
 */
export const REVIEW_MODE = true;

export const site = {
  name: 'Ryan Law',
  title: 'Vice President, RBC Capital Markets', // needs approval: employer named publicly
  roles: ['Capital Markets', 'Analytics', 'Automation', 'AI'],
  headline: { lead: 'Turning complex data into', em: 'intelligent', tail: 'decisions.' },
  intro:
    "I'm Ryan Law, a Capital Markets professional working at the intersection of financial markets, data intelligence, and emerging technology. I build analytical systems, automate complex workflows, and explore how artificial intelligence can change the way we understand information and make decisions.",
  url: 'https://lawryan.github.io/',
};

export const contact = {
  linkedin: 'https://www.linkedin.com/in/ryan-law-92a629104/', // from existing site
  github: 'https://github.com/lawryan', // owner of this repository
  email: '', // not in the existing repo — add the address you want public
  resume: '', // optional — add a PDF to /public and put its path here, e.g. '/ryan-law-resume.pdf'
};

export const focus = [
  {
    k: 'Professional',
    title: 'Reporting, data quality and analytics for Capital Markets',
    body: 'I build and modernize the reporting that markets teams rely on, with validation and controls so the numbers can be trusted.',
  },
  {
    k: 'Independent',
    title: 'L//IOS, an ecosystem of intelligent applications',
    body: 'Outside work I build software that explores AI-assisted research, personal analytics and analytics that explain themselves.',
  },
];

export const evolution = [
  { stage: 'Foundations', years: '2015', text: 'Business degree at Wilfrid Laurier University, then into banking and Capital Markets.' },
  { stage: 'Builder', years: '2018', text: 'Learned web development at HackerYou because I wanted to build tools, not only use them.' },
  { stage: 'Intelligence', years: '2021 →', text: 'Business intelligence, reporting, automation and data governance for Capital Markets.' },
  { stage: 'Systems', years: 'Now', text: 'Scalable analytical systems, and the shift from dashboards toward software that surfaces insight on its own.' },
];

export const about = [
  'My career started with curiosity about technology and how the web is built. Banking taught me how markets businesses actually run: the questions leaders ask, the pressure on the numbers, and how much depends on data being right.',
  'Since then my work has moved steadily toward the point where those two meet. I build reporting and analytical systems for Capital Markets, automate the repetitive parts of the workflow, and design the validation that makes the output trustworthy.',
  'What interests me most now is the next step for business intelligence: systems that don’t wait to be queried, but notice what changed and explain why it matters.',
];

export interface Role {
  id: string;
  when: string;
  title: string;
  org: string;
  summary: string;
  points: string[];
  flag?: string;
}

export const experience: Role[] = [
  {
    id: 'vp',
    when: 'Jan 2026 – Present',
    title: 'Vice President',
    org: 'RBC Capital Markets',
    summary: 'Bridging business requirements and technical execution across reporting, data quality and analytics.',
    points: [
      'Reporting and data quality',
      'Business intelligence and Capital Markets analytics',
      'Automation and operational efficiency',
      'Analytical solution development',
      'Data governance and controls',
      'Reporting modernization',
      'Cross-functional collaboration with business and technology partners',
    ],
    flag: 'Employer and title shown publicly',
  },
  {
    id: 'assoc',
    when: 'Dec 2021 – Dec 2025',
    title: 'Associate',
    org: 'RBC Capital Markets',
    summary: 'Built and modernized business intelligence for markets businesses, with automation and validation at the core.',
    points: [
      'Development and modernization of Tableau reporting',
      'Python and Excel-based automation',
      'Data quality validation frameworks',
      'Trade and client intelligence reporting',
      'Capital Markets analytics',
      'Operational process improvements',
    ],
    flag: 'Employer and title shown publicly',
  },
  {
    id: 'early',
    when: 'Before 2021',
    title: 'Banking & Capital Markets',
    org: 'Earlier roles',
    summary: 'Early career in banking and Capital Markets; my 2018 site described three-plus years of experience at the time.',
    points: ['Foundation in markets businesses and financial services', 'Self-taught and bootcamp-trained web development alongside work'],
    flag: 'Add titles, employers and dates, or keep general',
  },
  {
    id: 'hy',
    when: '2018',
    title: 'Web Development',
    org: 'HackerYou',
    summary: 'Immersive front-end development program.',
    points: ['HTML, CSS, Sass, JavaScript', 'Responsive builds from design files', 'Small JavaScript applications'],
  },
  {
    id: 'wlu',
    when: '2015',
    title: 'Bachelor of Business Administration',
    org: 'Wilfrid Laurier University',
    summary: 'BBA, 2015.',
    points: [],
  },
];

export interface Metric {
  value: string;
  label: string;
  note: string;
}
/** Every metric below is employer-specific and needs approval before publishing. */
export const metrics: Metric[] = [
  { value: '300+', label: 'validation rules', note: 'in a data quality framework supporting control processes' },
  { value: '100–150K', label: 'trade records', note: 'covered by validation processes' },
  { value: '~40', label: 'BI reports', note: 'migrated and modernized' },
  { value: '~30 hrs', label: 'saved each month', note: 'through reporting modernization' },
];

export const cases = [
  {
    k: 'Data quality',
    title: 'A validation framework people can trust',
    body: 'Designed a rules-based validation framework that checks large trade datasets before they reach reporting, with clear exception handling and controls.',
    tags: ['Python', 'Validation', 'Controls'],
  },
  {
    k: 'Modernization',
    title: 'Reporting rebuilt for speed and clarity',
    body: 'Helped migrate and modernize a suite of business intelligence reports, removing manual steps and making the outputs easier to read and maintain.',
    tags: ['Tableau', 'Automation', 'BI'],
  },
  {
    k: 'Markets analytics',
    title: 'Fixed income client intelligence',
    body: 'Built analytical reporting on fixed income client activity and RFQ flow, giving teams a clearer view of client engagement.',
    tags: ['Fixed income', 'RFQ', 'Client intelligence'],
  },
  {
    k: 'Integration',
    title: 'From ingestion to certified output',
    body: 'Worked across data ingestion, reconciliation, validation and reporting controls, so each stage has a check before the next one starts.',
    tags: ['Ingestion', 'Reconciliation', 'Lineage'],
  },
];

export type Level = 'Established' | 'Building' | 'Exploring';
export const expertise: { group: string; items: [string, Level][] }[] = [
  {
    group: 'Markets & Business',
    items: [['Capital Markets', 'Established'], ['Client Intelligence', 'Established'], ['Business Intelligence', 'Established'], ['Stakeholder Collaboration', 'Established'], ['Operational Efficiency', 'Established']],
  },
  {
    group: 'Analytics & Data',
    items: [['Tableau', 'Established'], ['Python', 'Established'], ['Excel', 'Established'], ['SQL', 'Established'], ['Data Quality & Validation', 'Established'], ['Data Visualization', 'Established']],
  },
  {
    group: 'Engineering & Automation',
    items: [['Workflow Automation', 'Established'], ['Data Integration', 'Established'], ['Process Optimization', 'Established'], ['Application Development', 'Building'], ['Analytical Systems', 'Building']],
  },
  {
    group: 'Artificial Intelligence',
    items: [['AI-Assisted Development', 'Building'], ['LLM Applications', 'Building'], ['Intelligent Analytics', 'Building'], ['Natural-Language Interfaces', 'Exploring'], ['Agentic Workflows', 'Exploring']],
  },
];

export const principles = [
  { t: 'Clarity over complexity.', d: 'Technology should make complex information easier to understand.' },
  { t: 'Intelligence over information.', d: 'Good analytics explains what matters instead of simply displaying data.' },
  { t: 'Automation over repetition.', d: 'Repetitive work should be redesigned wherever practical.' },
  { t: 'Trust through validation.', d: 'Reliable data and transparent calculations come first.' },
  { t: 'Continuous evolution.', d: 'New technology is a chance to rethink how the work gets done.' },
];

export type Status = 'In development' | 'Prototype' | 'Planned' | 'Concept';
export interface Pillar {
  id: string;
  name: string;
  short: string;
  line: string;
  body: string;
  status: Status;
  capabilities: { name: string; status: Status }[];
  stack: string[];
  extra?: string;
}

/**
 * L//IOS statuses and stacks are placeholders until Ryan confirms them.
 * Every capability is marked conservatively; nothing is presented as released.
 */
export const lios = {
  tagline: 'An Operating System for Insight.',
  statement: 'A growing ecosystem of intelligent applications designed to turn information into understanding, action, and better decisions.',
  thesis: "The future of analytics isn't more dashboards. It's systems that understand the data and tell us what matters.",
  vision: [
    'Modern software asks people to move between fragmented systems, interpret information by hand, and repeat the same analytical steps again and again.',
    'L//IOS explores a different approach: applications that do more of the interpreting, keep context across tasks, and help people act with less friction.',
  ],
  disclaimer: 'L//IOS is an independent personal technology project and is not affiliated with or endorsed by RBC Capital Markets.',
  pillars: [
    {
      id: 'intelligence',
      name: 'L//IOS Intelligence',
      short: 'Intelligence',
      line: 'Markets and research intelligence',
      body: 'One interface for understanding market developments, sectors, companies and emerging themes, with AI-assisted research you can question and follow up.',
      status: 'In development',
      capabilities: [
        { name: 'Sector intelligence', status: 'In development' },
        { name: 'Company comparisons', status: 'In development' },
        { name: 'Performance analysis', status: 'In development' },
        { name: 'Market visualization', status: 'In development' },
        { name: 'News and narrative analysis', status: 'Planned' },
        { name: 'Natural-language queries with follow-ups', status: 'In development' },
        { name: 'Insight generation', status: 'Planned' },
      ],
      stack: ['React', 'TypeScript', 'Node.js', 'LLM integration', 'Data visualization'],
      extra: 'Themes: AI infrastructure · Semiconductors · Nuclear energy · Robotics · Cybersecurity · Large-cap technology',
    },
    {
      id: 'health',
      name: 'L//IOS Health',
      short: 'Health',
      line: 'Personal health and performance',
      body: 'A mobile-first app for tracking, understanding and improving personal performance, from strength and running to nutrition and body composition.',
      status: 'In development',
      capabilities: [
        { name: 'Workout logging and strength progression', status: 'In development' },
        { name: 'Running performance and activity', status: 'In development' },
        { name: 'Nutrition logging', status: 'In development' },
        { name: 'Food-photo calorie and macro estimates', status: 'Prototype' },
        { name: 'Weight and body-composition trends', status: 'In development' },
        { name: 'Conversational assistant', status: 'Planned' },
        { name: 'Health Connect / Samsung Health integration', status: 'Planned' },
      ],
      stack: ['Android', 'TypeScript', 'SQLite', 'LLM integration', 'Health Connect (planned)'],
    },
    {
      id: 'data',
      name: 'L//IOS Data Intelligence',
      short: 'Data Intelligence',
      line: 'Analytics that explains itself',
      body: 'Load spreadsheets and files, and the platform profiles them, finds relationships, checks quality, builds the views and explains what matters, with every calculation traceable to its records.',
      status: 'In development',
      capabilities: [
        { name: 'Excel and CSV ingestion', status: 'In development' },
        { name: 'Automated profiling and quality checks', status: 'In development' },
        { name: 'Relationship discovery and suggested joins', status: 'Prototype' },
        { name: 'Generated dashboards', status: 'Prototype' },
        { name: 'Natural-language analysis', status: 'Planned' },
        { name: 'Anomaly detection and insight generation', status: 'Prototype' },
        { name: 'Drill-down, lineage and transparent calculations', status: 'In development' },
      ],
      stack: ['React', 'TypeScript', 'Node.js', 'SQLite', 'Python', 'Data visualization'],
    },
  ] as Pillar[],
  roadmap: [
    { t: 'Natural-language interaction', d: 'Ask questions in plain language and keep the context across follow-ups.' },
    { t: 'Automated insight discovery', d: 'Surface changes and outliers before anyone goes looking for them.' },
    { t: 'Better data integration', d: 'Connect more sources with less manual preparation.' },
    { t: 'Agentic workflows', d: 'Let the software carry multi-step analysis through to a result.' },
    { t: 'Cross-device experience', d: 'One context shared across desktop and mobile.' },
    { t: 'Context-aware assistance', d: 'Help that understands what you are working on right now.' },
  ],
  techNote: 'Technologies used across the ecosystem. Not every application uses every one.',
  tech: ['React', 'TypeScript', 'Node.js', 'SQLite', 'Python', 'LLM integrations', 'Data visualization', 'Android', 'API integration'],
};

export interface Project {
  name: string;
  cat: 'Flagship' | 'Data Analytics' | 'Web Development' | 'Experimental' | 'Earlier';
  year: string;
  body: string;
  tags: string[];
  href?: string;
  img?: string;
  internal?: boolean;
}
export const projects: Project[] = [
  { name: 'L//IOS', cat: 'Flagship', year: 'Ongoing', body: 'An ecosystem of intelligent applications for markets research, personal performance and self-explaining analytics.', tags: ['AI', 'React', 'TypeScript'], href: '/lios/', internal: true },
  { name: 'Intelligence Lab', cat: 'Experimental', year: '2026', body: 'A working, in-browser analytics demo with rule-based insights and drill-down to the records behind every number.', tags: ['TypeScript', 'Analytics', 'Synthetic data'], href: '#lab', internal: true },
  { name: 'JavaScript chart studies', cat: 'Data Analytics', year: 'Earlier', body: 'Early experiments visualizing data in the browser with D3 and C3.', tags: ['D3', 'C3', 'JavaScript'], href: '/line.html' },
  { name: 'ShipSimple', cat: 'Web Development', year: 'Earlier', body: 'Front end for an e-commerce shipping startup.', tags: ['HTML', 'Sass', 'JavaScript', 'Bootstrap'], href: 'http://www.shipsimple.io/', img: '/legacy-assets/shipsimple-white.JPG' },
  { name: 'Responsive travel site', cat: 'Web Development', year: '2018', body: 'A single-page site built from a PSD design, fully responsive across screen sizes.', tags: ['HTML', 'CSS', 'JavaScript'], img: '/legacy-assets/p2-white.JPG' },
  { name: 'Pig dice game', cat: 'Earlier', year: '2018', body: 'A two-player browser dice game built while learning JavaScript.', tags: ['JavaScript'], href: '/starter/index.html' },
  { name: 'To-do app', cat: 'Earlier', year: '2018', body: 'A simple task list with add, complete and remove.', tags: ['JavaScript'], href: '/to-do-app/to-do-app.html' },
  { name: 'Break timer', cat: 'Earlier', year: '2018', body: 'A study and break timer.', tags: ['JavaScript'], href: '/timer/index.html' },
];
