// Client-replaceable public copy. UI validation/actions stay with their components.
export const siteCopy = {
  welcome: {
    title: 'How would you like to explore?',
    description:
      'Explore with cinematic motion and interactive 3D, or enjoy a calmer reading experience.',
    full: 'Experience full motion',
    calm: 'Plain website',
    systemReduced:
      'Your system requests reduced motion. Full is an explicit override for this website; a calm reading experience remains available.',
    websiteOnly:
      'This is a preference for this website, not a browser permission request.',
    changeLater: 'Change your choice at any time using Experience settings in the footer.',
  },
  hero: {
    eyebrow: 'India-US Cross Border Law · Disputes · Transactions',
    lines: ['Research across', 'borders.', 'Ideas in dialogue.'],
    introduction:
      'An independent research publication examining India–US cross-border disputes, corporate transactions, and regulatory frameworks. Read our work and contribute to the dialogue.',
    caption: 'The Corridor / Sample edition',
  },
  focus: {
    eyebrow: '01 / Fields of inquiry',
    title: 'Cross-border questions.',
    italic: 'Four research areas.',
    description:
      'Our research spans four areas of India–US cross-border disputes and transactions.',
  },
  featured: {
    eyebrow: '02 / Selected research',
    title: 'Ideas worth a closer look.',
    description:
      'A curated sample edition. Fictional articles, composed for the reading experience.',
  },
  supporting: {
    eyebrow: 'Further reading',
    title: 'Continue the conversation.',
  },
  repository: {
    eyebrow: '03 / The research archive',
    title: 'India–US disputes,',
    italic: 'in context.',
    description:
      'A repository for disputes involving India–US companies. The initial collection and case metadata are pending; the records below are fictional layout samples.',
    steps: ['Begin with a question.', 'Look closer at the record.'],
    notes: [
      'A starting point, with its context in view.',
      'Keep sources, limitations and interpretation together.',
    ],
  },
  about: {
    eyebrow: 'About The Corridor / Institutional mandate',
    title: 'Bridging two legal traditions.',
    italic: 'Rigorous cross-border inquiry.',
    lead: 'The Corridor is a dedicated forum for India–US cross-border legal scholarship, tracking how courts, arbitral tribunals, regulators, and corporate counsel navigate commercial activity between the two jurisdictions.',
    body: 'Structured for practitioners, scholars, and student researchers, the publication pairs doctrinal analysis with an indexed repository of cross-border disputes and transactional developments. Final institutional overview and founding note from the editorial board will be inserted here upon client sign-off.',
    pillars: [
      {
        index: 'I',
        title: 'Bilateral focus',
        detail:
          'Dedicated coverage of legal, regulatory, and arbitral developments connecting Indian and United States commercial jurisdictions.',
      },
      {
        index: 'II',
        title: 'Primary-source discipline',
        detail:
          'Every published note and case record separates primary filings and statutory text from editorial commentary.',
      },
      {
        index: 'III',
        title: 'Editorial review',
        detail:
          'Contributions undergo structured editorial review for doctrinal accuracy, citation completeness, and comparative clarity.',
      },
    ],
  },
  teamPreview: {
    eyebrow: '04 / People & perspectives',
    title: 'The editorial board & researchers.',
    description:
      'Structured editorial profiles ready for approved portraits, institutional titles, and biographical writeups.',
  },
  contribution: {
    eyebrow: 'An invitation, in preparation',
    title: 'Bring another',
    italic: 'perspective.',
    description:
      'We publish work by our editorial researchers and welcome contributions examining India–US cross-border law. Guidelines and the private review workflow are being prepared.',
  },
  articles: {
    eyebrow: 'The reading room / Sample edition',
    title: 'Articles',
    introduction:
      'Research and commentary on India–US cross-border disputes and transactions. Explore the four research areas; all current articles are clearly labelled layout samples.',
  },
  team: {
    eyebrow: 'About & Editorial Board · India-US Cross Border Law',
    title: 'The team',
    introduction:
      'Meet the editors and researchers behind The Corridor. Member photographs and biographical writeups are structured below for direct insertion upon final client confirmation.',
    note: 'No real team identities are represented here yet. Portrait frames and biographical slots are prepared for final team photos and writeups.',
  },
  cases: {
    eyebrow: 'Knowledge repository / Sample records',
    title: 'Cases & research notes',
    introduction:
      'Cases concerning disputes involving India–US companies. The initial collection, metadata, filters and documents await a real case example. Current records are fictional layout samples, not legal authorities.',
  },
  submit: {
    eyebrow: 'Contribute / Form preview',
    title: 'Submit an article',
    introduction:
      'Contributions on India–US cross-border law are welcome. PDF and Word versions are requested; submission guidelines and the double-blind review workflow await confirmation. Live intake remains disabled.',
    notice: 'Prototype — submissions are not sent',
    instructions:
      'Use fictional sample text only. Do not enter names, emails, contact details or other personal information.',
    privacy:
      'This form only checks required fields. Uploads and delivery are disabled, and it has no personal-data fields. Your text stays in this page and is discarded when you leave.',
    steps: [
      'Frame a clear question.',
      'Outline the context and approach.',
      'Identify the sources a full article would need.',
    ],
  },
  footer: {
    eyebrow: 'The Corridor · India-US Cross Border Law',
    lineOne: 'Space for research.',
    lineTwo: 'Room for perspective.',
    description:
      'The Corridor brings rigorous research and analysis to India–US cross-border disputes and transactions. Approved articles, editorial board profiles and contact information are being prepared.',
  },
  sampleNotice:
    'Demonstration content. Articles, profiles and repository records are fictional; the publication identity and four research areas are confirmed. Approved publication content is pending.',
} as const;
