/**
 * All site copy lives here so it can be reviewed and edited in one place.
 *
 * REVIEW_MODE shows small "Needs approval" markers on anything listed in
 * CONTENT_REVIEW.md. Set it to false before publishing.
 */
export const REVIEW_MODE = false;

export const site = {
  name: 'Ryan Law',
  title: 'Vice President, Client Intelligence · RBC Capital Markets',
  roles: ['Capital Markets', 'Data & Analytics', 'AI Innovation'],
  headline: { lead: 'Turning complex data into', em: 'intelligent', tail: 'decisions.' },
  intro:
    "I'm Ryan Law, Vice President of Client Intelligence at RBC Capital Markets, where I've spent eleven years turning markets data into decisions. I build analytical systems, automate complex workflows, and explore how artificial intelligence can change the way we understand information and make decisions.",
  url: 'https://lawryan.github.io/',
};

export const contact = {
  linkedin: 'https://www.linkedin.com/in/ryan-law-92a629104/', // from existing site
  github: 'https://github.com/lawryan', // owner of this repository
  email: 'ryanlaw@live.com',
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

/** The career arc, in the order it happened. Years are only shown where they're verified. */
export const arc = [
  { stage: 'Capital Markets', when: '2015 →', text: 'BBA from Wilfrid Laurier, then Tax Operations at RBC Capital Markets: FATCA, CRS and a new regulatory compliance system.' },
  { stage: 'Data & onboarding', when: '2017 →', text: 'Client implementation and onboarding data: margin rules, KYC, credit and trading documentation.' },
  { stage: 'Automation', when: '2017 →', text: 'Learned to code at HackerYou and used it at work: VBA, JavaScript, bots and an API-driven LEI validator.' },
  { stage: 'Leading analytics', when: '2019 →', text: 'Team lead for KYC data and reporting, then client management and analytics.' },
  { stage: 'Client intelligence', when: '2021 →', text: 'Client intelligence for Capital Markets; Vice President since December 2025.' },
  { stage: 'AI innovation', when: 'Now', text: 'Exploring software that understands data and explains it, through L//IOS.' },
];

export const story = {
  statement: 'I’ve spent my career where markets meet data.',
  paragraphs: [
    'Banking taught me how markets businesses actually run: the questions leaders ask, the pressure on the numbers, and how much depends on data being right.',
    'From my first role I looked for the repetitive work that could be automated. Today I design reporting and analytical systems for Capital Markets, automate the repetitive parts of the workflow, and build the validation that makes the output trustworthy.',
  ],
  why: {
    lead: 'After years of building reporting, dashboards and validation frameworks, I kept coming back to one question:',
    q: 'What if software could do more than display information?',
    tail: 'What if it could understand the data, surface what matters, and help people decide? L//IOS is my exploration of that.',
  },
};

export interface Role {
  id: string;
  when: string;
  /** timeline position in fractional years; end omitted = point, null = present */
  from: number;
  to?: number | null;
  kind: 'role' | 'education' | 'earlier';
  title: string;
  org: string;
  summary: string;
  points: string[];
  flag?: string;
}

const RBC = 'RBC Capital Markets';
/** Career history as published on Ryan's LinkedIn profile (Oct 2026). */
export const experience: Role[] = [
  {
    id: 'vp', when: 'Dec 2025 – Present', from: 2025.92, to: null, kind: 'role',
    title: 'Vice President, Client Intelligence', org: RBC,
    summary: 'Leads reporting, data quality and business intelligence for Capital Markets, turning complex business requirements into practical solutions.',
    points: [
      'Manage an offshore analytics and reporting team: work allocation, deliverables and capability building',
      'Oversee validation frameworks, data integrity controls and reconciliations',
      'Drive automation, and align priorities with business leaders, technology partners and teams across regions',
    ],
  },
  {
    id: 'assoc', when: 'Dec 2021 – Dec 2025', from: 2021.92, to: 2025.92, kind: 'role',
    title: 'Client Intelligence Associate', org: RBC,
    summary: 'Built the Tableau reporting for Global Markets business heads and Global Business Management across all regions.',
    points: [
      'Cut manual reporting effort by 95% by automating and moving Excel reports into Tableau',
      'Designed a revenue methodology for the Energy sector',
      'Added new performance metrics, including hit rates and capital analysis',
    ],
  },
  {
    id: 'cmlead', when: 'Aug 2020 – Dec 2021', from: 2020.58, to: 2021.92, kind: 'role',
    title: 'Client Management & Analytics Team Lead', org: RBC,
    summary: 'Led a team producing KPIs and KRIs for the COO and Global Markets business heads.',
    points: [
      'Productionized a reporting framework that protected high-revenue products',
      'KYC refresh bots that cut human error by 97%',
      'Data migration validation and remediation of regulatory client data',
    ],
  },
  {
    id: 'kyclead', when: 'Dec 2019 – Aug 2020', from: 2019.92, to: 2020.58, kind: 'role',
    title: 'KYC Data & Reporting Team Lead', org: RBC,
    summary: 'Led KYC data and reporting, owning data quality and the reports senior management relied on.',
    points: [
      'Rolled out a KYC onboarding and refresh tool that standardized client requests',
      'Built a framework to track and escalate key accounts',
      'Wrote the KYC data standards and guidelines',
    ],
  },
  {
    id: 'onboarding', when: 'Nov 2018 – Dec 2019', from: 2018.83, to: 2019.92, kind: 'role',
    title: 'Global Client Onboarding Data Analyst', org: RBC,
    summary: 'Lead liaison between Global Markets and the back office for the data quality of 20,000+ clients in KYC refresh.',
    points: [
      'Key metrics for the Director and Global Head of Data Management',
      'A bot that determined KYC requirements and handled client outreach',
      'A macro that remediated 4,000+ PDFs, saving 300+ hours',
    ],
  },
  {
    id: 'implementation', when: 'Nov 2017 – Nov 2018', from: 2017.83, to: 2018.83, kind: 'role',
    title: 'Client Implementation Analyst', org: RBC,
    summary: 'Helped clients and internal teams comply with regulatory margin requirements.',
    points: [
      'A framework to track onboarding metrics across KYC, credit and trading documentation',
      'Automation of reports and outreach that saved 100+ hours',
      'A Legal Entity Identifier validator using the GLEIF API',
    ],
  },
  {
    id: 'tax', when: 'Nov 2015 – Nov 2017', from: 2015.83, to: 2017.83, kind: 'role',
    title: 'Tax Operations Analyst', org: RBC,
    summary: 'Tax compliance across FATCA, OECD CRS, Chapter 3/61 and HIRE Act (871m).',
    points: [
      'Classification and certification of high-priority clients',
      'Helped build a new Tax Operations regulatory compliance system',
      'User acceptance testing and a production defect log',
    ],
  },
  {
    id: 'hy', when: '2018', from: 2018.3, kind: 'education',
    title: 'Web Development', org: 'HackerYou',
    summary: 'Immersive front-end development program.',
    points: ['HTML, CSS, Sass, JavaScript', 'Responsive builds from design files', 'Small JavaScript applications'],
  },
  {
    id: 'wlu-dip', when: '2015', from: 2015.3, kind: 'education',
    title: 'Diploma in Accounting', org: 'Wilfrid Laurier University',
    summary: 'Went back to Laurier for accounting after the BBA.', points: [],
  },
  {
    id: 'wlu', when: '2013', from: 2013.3, kind: 'education',
    title: 'Bachelor of Business Administration, Finance', org: 'Wilfrid Laurier University',
    summary: 'BBA with a focus on finance.', points: [],
  },
];

export interface Metric {
  value: string;
  label: string;
  note: string;
}
/** Every metric below is employer-specific and needs approval before publishing. */
export const metrics: Metric[] = [
  { value: '95%', label: 'less manual reporting', note: 'by automating and moving Excel reports into Tableau' },
  { value: '97%', label: 'fewer KYC errors', note: 'with bots for client outreach and document uploads' },
  { value: '20,000+', label: 'clients', note: 'kept accurate through a global KYC refresh' },
  { value: '300+', label: 'validation rules', note: 'in a data quality framework supporting control processes' },
];

/**
 * Case studies in executive form. Wording is generalized: no system names, clients,
 * data or architecture. Metrics referenced here are the approved figures above.
 */
export const cases = [
  {
    id: 'validation',
    k: 'Data quality',
    title: 'A validation framework people can trust',
    problem: 'Large trade datasets fed downstream reporting, and errors were found late, by the people reading the reports.',
    contribution: 'Designed and built a rules-based validation framework that checks the data before it reaches reporting.',
    approach: 'Python-driven rules with clear exception handling, so each break is visible, owned and resolved.',
    impact: '300+ rules applied across roughly 100–150K trade records, supporting the control process.',
    tags: ['Python', 'Validation', 'Controls'],
  },
  {
    id: 'modernization',
    k: 'Modernization',
    title: 'Reporting rebuilt for speed and clarity',
    problem: 'A large suite of BI reports relied on manual steps that took time every month and were hard to maintain.',
    contribution: 'Helped migrate and modernize the reports, removing manual work along the way.',
    approach: 'Rebuilt in Tableau with automated preparation in Python and Excel, designed to be easier to read and maintain.',
    impact: 'About 40 reports modernized and roughly 30 hours a month saved.',
    tags: ['Tableau', 'Automation', 'BI'],
  },
  {
    id: 'fixed-income',
    k: 'Markets analytics',
    title: 'Fixed income client intelligence',
    problem: 'Teams needed a clearer view of how clients engage across fixed income activity and RFQ flow.',
    contribution: 'Built the analytical reporting that brings that activity together.',
    approach: 'Client and RFQ activity modelled into views that answer the questions coverage teams ask.',
    impact: 'A clearer, shared picture of client engagement for the business.',
    tags: ['Fixed income', 'RFQ', 'Client intelligence'],
  },
  {
    id: 'integration',
    k: 'Integration',
    title: 'From ingestion to certified output',
    problem: 'Data passes through many hands between source and report, and each hand-off is a place for errors.',
    contribution: 'Worked across ingestion, reconciliation, validation and reporting controls.',
    approach: 'A check at every stage before the next one starts, with lineage back to the source.',
    impact: 'Reporting that can be traced and defended.',
    tags: ['Ingestion', 'Reconciliation', 'Lineage'],
  },
  {
    id: 'kyc',
    k: 'Earlier · KYC at scale',
    title: 'Data quality for 20,000+ clients in KYC refresh',
    problem: 'A global KYC refresh depended on accurate client data across front and back office, with reporting that was built by hand.',
    contribution: 'Acted as the link between every line of business on data quality, and rebuilt the reporting.',
    approach: 'Legacy reports rebuilt to feed from source data; a bot to determine KYC requirements and handle outreach; a macro to remediate missed documents.',
    impact: '20,000+ clients covered, 4,000 PDF files remediated, and an estimated 300 hours saved.',
    tags: ['KYC', 'Automation', 'VBA'],
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

export type Status = 'Working' | 'In development' | 'Prototype' | 'Planned' | 'Concept';

export interface Shot { src: string; alt: string; caption: string; device: 'desktop' | 'phone' }
export interface Pillar {
  id: string;
  name: string;
  short: string;
  product: string;            // the real app name
  line: string;
  body: string;
  flow: string;               // the app's own pipeline, from its README
  status: Status;
  capabilities: { name: string; status: Status }[];
  stack: string[];
  proof: string[];            // verifiable facts from the repo
  shots: Shot[];
  extra?: string;
}

/**
 * L//IOS content is taken from each app's README, ARCHITECTURE notes and test suites
 * (Desktop\Claude\lios, lios-analyst, lios-mobile, read Oct 2026). Screenshots are real:
 * produced by running each app's own QA scripts on demo or synthetic sample data.
 * "Working" = present in the current build and covered by the app's tests or QA run.
 */
const ANALYST_NOTE = 'Real screenshot · L//IOS Analyst on its synthetic “Global Markets” sample (fictional firms)';
const MARKETS_NOTE = 'Real screenshot · L//IOS in demo mode (the app labels every value DEMO DATA)';
const MOBILE_NOTE = 'Real screen · rendered by the app’s own UI tests with sample data';

export const lios = {
  tagline: 'An Operating System for Insight.',
  statement: 'Three applications built on one idea: software that understands the data, says what matters, and shows its working.',
  thesis: "The future of analytics isn't more dashboards. It's systems that understand the data and tell us what matters.",
  vision: [
    'Modern software asks people to move between fragmented systems, interpret information by hand, and repeat the same analytical steps again and again.',
    'L//IOS explores a different approach: applications that do more of the interpreting, keep context across questions, and help people act with less friction, without ever inventing a number.',
  ],
  disclaimer: 'L//IOS is an independent personal technology project and is not affiliated with or endorsed by RBC Capital Markets.',
  pillars: [
    {
      id: 'data',
      name: 'L//IOS Analyst',
      short: 'Analyst',
      product: 'L//IOS Analyst',
      line: 'Data intelligence · autonomous analysis',
      body: 'Give it files it has never seen. It works out the structure, connects the datasets safely, checks quality, builds the dashboard and investigates what changed. Every number traces back to source rows.',
      flow: 'Drop data → Initialize → Understand → Dashboard → Insights → Investigate',
      status: 'Working',
      capabilities: [
        { name: 'Excel, CSV, JSON, Parquet and SQLite ingestion, including messy sheets', status: 'Working' },
        { name: 'Schema and meaning detection: measures, dimensions, dates, hierarchies', status: 'Working' },
        { name: 'Relationship discovery with match rates; joins can never multiply rows', status: 'Working' },
        { name: 'Data quality checks with stated methods and affected rows', status: 'Working' },
        { name: 'Generated dashboard, driver trees and ranked findings', status: 'Working' },
        { name: 'Plain-language questions answered by deterministic tools', status: 'Working' },
        { name: 'Version refresh: what changed between data drops', status: 'Working' },
        { name: 'PostgreSQL / SQL Server snapshots', status: 'Prototype' },
        { name: 'Optional AI rephrasing and summaries, numerically guarded', status: 'Prototype' },
      ],
      stack: ['TypeScript', 'React 19', 'Node.js', 'SQLite (node:sqlite)', 'esbuild', 'Custom SVG charts', 'Playwright QA'],
      proof: [
        '166,286 synthetic trades, 5 files, 9 data regions understood in under 25 seconds',
        'Engine totals checked against an independent recomputation from the raw workbook',
        'Measured on a 72 MB workbook: 831,430 rows ready to explore in about 87 s',
        'Raw data never leaves the computer; AI is off by default',
      ],
      shots: [
        { src: '/lios-shots/analyst-dashboard', alt: 'L//IOS Analyst dashboard showing KPIs, revenue by month, and a ranked list of findings', caption: ANALYST_NOTE, device: 'desktop' },
        { src: '/lios-shots/analyst-init', alt: 'L//IOS Analyst initialization: seven engines online, files, data regions, relationships and quality issues found', caption: ANALYST_NOTE, device: 'desktop' },
        { src: '/lios-shots/analyst-investigation', alt: 'An investigation into a finding, with data checks, a weekly chart and a driver tree', caption: ANALYST_NOTE, device: 'desktop' },
        { src: '/lios-shots/analyst-quality', alt: 'Data quality page with five scores and seven checks, each with its method', caption: ANALYST_NOTE, device: 'desktop' },
        { src: '/lios-shots/analyst-ask', alt: 'Ask L//IOS answering with FACT and INTERPRETATION labels and a driver tree', caption: ANALYST_NOTE, device: 'desktop' },
      ],
    },
    {
      id: 'markets',
      name: 'L//IOS Markets',
      short: 'Markets',
      product: 'L//IOS (desktop)',
      line: 'Markets and research intelligence',
      body: 'Ask a question and the question builds the workspace: market data, deterministic analytics, coverage, internet-attention signals, evidence with labels, and research that remembers what changed.',
      flow: 'Ask → Research → Connect → Visualize → Investigate → Remember',
      status: 'Working',
      capabilities: [
        { name: 'Sector and company analysis with follow-ups (“Change this to YTD”, “Remove Intel”)', status: 'Working' },
        { name: 'Relative performance, drawdown, volatility and correlation, recomputed in Verify', status: 'Working' },
        { name: 'News coverage and Hacker News attention signals', status: 'Working' },
        { name: 'Saved research with “What changed?” and // TODAY', status: 'Working' },
        { name: 'Private datasets alongside public data', status: 'Working' },
        { name: 'SEC filings and FRED macro adapters', status: 'Prototype' },
        { name: 'AI research agent (off by default, evidence-guarded)', status: 'Prototype' },
        { name: 'More attention sources and a knowledge graph', status: 'Planned' },
      ],
      stack: ['TypeScript', 'React', 'Node.js', 'SQLite (node:sqlite)', 'esbuild', 'Anthropic API (optional)', 'Playwright QA'],
      proof: [
        '87 automated tests across analytics, providers, schemas and AI contracts',
        'Market data is never labelled real-time; demo data is always badged',
        'Every chart has Verify: returns and drawdowns recomputed from the closes',
        'Runs locally on 127.0.0.1; secrets stay on the server',
      ],
      shots: [
        { src: '/lios-shots/markets-semis', alt: 'L//IOS semiconductors workspace: year-to-date performance, leaders and laggards, with DEMO DATA badges', caption: MARKETS_NOTE, device: 'desktop' },
        { src: '/lios-shots/markets-home', alt: 'L//IOS home: “What do you want to understand?” with a command bar and suggested investigations', caption: MARKETS_NOTE, device: 'desktop' },
        { src: '/lios-shots/markets-evidence', alt: 'Evidence panel recomputing every return and drawdown, all matching', caption: MARKETS_NOTE, device: 'desktop' },
      ],
      extra: 'Themes it follows: AI infrastructure · Semiconductors · Nuclear energy · Robotics · Cybersecurity · Large-cap technology',
    },
    {
      id: 'health',
      name: 'L//IOS Health',
      short: 'Health',
      product: 'L//IOS Mobile (Android)',
      line: 'Personal health and training intelligence',
      body: 'A native Android app that reads Health Connect, interprets messy workout notes, tracks strength, running and body composition, and tells you what changed and what to do next, labelling every value as measured, calculated or interpreted.',
      flow: 'Open → // Today → Understand → Investigate → Verify',
      status: 'In development',
      capabilities: [
        { name: 'Workout capture by paste, voice or photo, interpreted on-device', status: 'Working' },
        { name: 'Strength progression, estimated 1RM and personal records', status: 'Working' },
        { name: 'Running, pickleball and training load', status: 'Working' },
        { name: 'Health Connect: Samsung Health and RENPHO body data (read-only)', status: 'Working' },
        { name: 'Next-session planning that adapts to time, fatigue and equipment', status: 'Working' },
        { name: 'Nutrition logging and food-photo estimates', status: 'In development' },
        { name: 'AI assistant (off by default; key stays on the phone or a paired backend)', status: 'Prototype' },
        { name: 'Link to desktop L//IOS', status: 'Planned' },
      ],
      stack: ['Kotlin 2.1', 'Jetpack Compose', 'SQLite', 'Health Connect', 'ML Kit (on-device OCR)', 'Robolectric + Roborazzi'],
      proof: [
        'Pure Kotlin analytics module, unit-tested on the JVM',
        'Golden journeys run on the real UI in automated tests',
        'A single privacy gate for any outbound data',
        'Health data stays on the phone',
      ],
      shots: [
        { src: '/lios-shots/mobile-today', alt: 'L//IOS Mobile Today screen with readiness rings and the next session, labelled demo data', caption: MOBILE_NOTE, device: 'phone' },
        { src: '/lios-shots/mobile-brief', alt: 'Brief: three things deserve your attention today', caption: MOBILE_NOTE, device: 'phone' },
        { src: '/lios-shots/mobile-interpreted', alt: 'An interpreted workout read from pasted text, before saving', caption: MOBILE_NOTE, device: 'phone' },
        { src: '/lios-shots/mobile-health', alt: 'Health readiness score with what moved it', caption: MOBILE_NOTE, device: 'phone' },
        { src: '/lios-shots/mobile-next', alt: 'Next session: a suggested lower-body strength workout and why', caption: MOBILE_NOTE, device: 'phone' },
        { src: '/lios-shots/mobile-food', alt: 'A meal-photo estimate broken into foods with calorie ranges', caption: MOBILE_NOTE, device: 'phone' },
      ],
    },
  ] as Pillar[],
  roadmap: [
    { t: 'Desktop and phone, one context', d: 'Link L//IOS Mobile to desktop L//IOS so the brief follows you.' },
    { t: 'More data sources', d: 'Fundamentals, more attention sources, and live database connections for Analyst.' },
    { t: 'Research that stays current', d: 'Scheduled revisits of saved research: “What changed today?”' },
    { t: 'Guarded AI, everywhere', d: 'Models that plan and explain, never calculate, with every number checked against evidence.' },
    { t: 'Knowledge graph', d: 'Questions across entities, relationships and themes the research has already found.' },
    { t: 'Nutrition, complete', d: 'Finish nutrition in L//IOS Health and connect it to training and recovery.' },
  ],
  techNote: 'Technologies in the current builds. Not every application uses every one.',
  tech: ['TypeScript', 'React', 'Node.js', 'SQLite', 'esbuild', 'Kotlin', 'Jetpack Compose', 'Health Connect', 'Anthropic API', 'Playwright'],
  /** The shared principles, drawn from the apps' architecture notes. */
  philosophy: [
    { t: 'Code calculates. Models interpret.', d: 'Arithmetic is deterministic and tested. A model may explain, but every number it writes must already be in the evidence.' },
    { t: 'Show the working.', d: 'Every KPI, bar and finding opens Explain, Drill down and View data, back to the source row.' },
    { t: 'Check the data first.', d: 'Before a change is called a business event, the data explanations are tested: missing loads, duplicates, mapping changes.' },
    { t: 'Private by default.', d: 'Raw data stays on the device. AI is off until you turn it on, and you can see exactly what it would be sent.' },
  ],
  loop: [
    { k: 'Collect', d: 'Bring the data in, from files, feeds or devices.' },
    { k: 'Validate', d: 'Check it before trusting it.' },
    { k: 'Understand', d: 'Find what changed and why.' },
    { k: 'Explain', d: 'Say it plainly, with the evidence attached.' },
    { k: 'Act', d: 'Help decide what to do next.' },
  ],
  domains: {
    data: { Collect: 'Excel, CSV, Parquet, SQLite', Validate: 'Quality checks with stated methods', Understand: 'Meanings, relationships, driver trees', Explain: 'FACT / INTERPRETATION labels', Act: 'Watches, saved views, exported reports' },
    markets: { Collect: 'Market data, news, attention signals', Validate: 'Freshness labels, schema checks', Understand: 'Relative performance and what changed', Explain: 'Evidence with citations', Act: 'Watches, theses, saved research' },
    health: { Collect: 'Health Connect, workout notes, meals', Validate: 'Measured vs calculated vs interpreted', Understand: 'Progression, recovery, trends', Explain: 'What moved today and why', Act: 'The next session, adapted' },
  } as Record<string, Record<string, string>>,
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
  { name: 'L//IOS', cat: 'Flagship', year: 'Ongoing', body: 'Three applications: L//IOS Analyst for data intelligence, L//IOS Markets for research, and L//IOS Health on Android.', tags: ['TypeScript', 'React', 'Kotlin', 'SQLite'], href: '/lios/', internal: true },
  { name: 'Intelligence Lab', cat: 'Experimental', year: '2026', body: 'A browser-sized version of L//IOS Analyst: it reads a set of synthetic files, checks them, and investigates what changed.', tags: ['TypeScript', 'Analytics', 'Synthetic data'], href: '#lab', internal: true },
  { name: 'LEI validator', cat: 'Data Analytics', year: '2018', body: 'At work: a Legal Entity Identifier validator that checks entities against the GLEIF API and flags invalid ones.', tags: ['JavaScript', 'API', 'Data quality'] },
  { name: 'JavaScript chart studies', cat: 'Data Analytics', year: 'Earlier', body: 'Early experiments visualizing data in the browser with D3 and C3.', tags: ['D3', 'C3', 'JavaScript'], href: '/line.html' },
  { name: 'ShipSimple', cat: 'Web Development', year: 'Earlier', body: 'Front end for an e-commerce shipping startup.', tags: ['HTML', 'Sass', 'JavaScript', 'Bootstrap'], href: 'http://www.shipsimple.io/', img: '/legacy-assets/shipsimple-white.JPG' },
  { name: 'Responsive travel site', cat: 'Web Development', year: '2018', body: 'A single-page site built from a PSD design, fully responsive across screen sizes.', tags: ['HTML', 'CSS', 'JavaScript'], img: '/legacy-assets/p2-white.JPG' },
  { name: 'Pig dice game', cat: 'Earlier', year: '2018', body: 'A two-player browser dice game built while learning JavaScript.', tags: ['JavaScript'], href: '/starter/index.html' },
  { name: 'To-do app', cat: 'Earlier', year: '2018', body: 'A simple task list with add, complete and remove.', tags: ['JavaScript'], href: '/to-do-app/to-do-app.html' },
  { name: 'Break timer', cat: 'Earlier', year: '2018', body: 'A study and break timer.', tags: ['JavaScript'], href: '/timer/index.html' },
];
