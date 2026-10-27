import type { Agent, FeedGroup, FeedItem, Finding, Profile, Reply, Snapshot, Task } from './types';

const mail: Finding = {
  id: 'mail-2026-10-07',
  agentId: 'email-summariser',
  title: 'I summarized your mailbox',
  image: { asset: 'mail' },
  blocks: [{
    id: 'mail-summary', type: 'numbered-list', items: [
      { id: 'review', text: 'You got a design review confirmation from Jacob, it needs confirmation rsvp' },
      { id: 'transfer', text: 'Your request to transfer to Hyderabad was not approved' },
      { id: 'advertising', text: 'Got 4 other mails advertising house keeping assistance' },
    ],
  }],
  suggestions: [
    { id: 'reschedule', label: 'Reschedule task at evng', message: 'Reschedule my task to this evening' },
    { id: 'review-mail', label: 'Draft a reply to Jacob', message: 'Draft a reply to Jacob' },
    { id: 'mail-details', label: 'Show more details', message: 'Show more details about my mail' },
  ],
};

const flights: Finding = {
  id: 'flight-2027-01-22',
  agentId: 'flight-tracker',
  title: 'Flights I found for you',
  image: { asset: 'flight' },
  blocks: [{
    id: 'flight-table', type: 'table', title: 'Cochin (COK) → Dubai (DXB)', subtitle: '22 Jan 2027, Thursday',
    columns: [{ id: 'airline' }, { id: 'fare', align: 'right' }],
    previewRows: 2,
    rows: [
      { id: 'indigo', cells: ['Indigo', [{ text: '$1500', tone: 'highlight' }]] },
      { id: 'emirates', cells: ['Emirates', '$7500'] },
      { id: 'air-india', cells: ['Air India', '$4200'] },
      { id: 'etihad', cells: ['Etihad', '$5300'] },
    ],
  }],
  suggestions: [
    { id: 'change-date', label: 'Try another date', message: 'Find flights for the next day' },
    { id: 'find-route', label: 'Find prices for another route', message: 'Find prices for another route' },
  ],
};

const mixedContent: Finding = {
  id: 'mail-context', agentId: 'email-summariser', title: 'Today at a glance', image: { asset: 'brief' },
  navigationIcon: 'news', navigationLabel: 'Daily Brief',
  blocks: [
    { id: 'context-heading', type: 'heading', text: 'A little more context' },
    { id: 'context-text', type: 'paragraph', text: 'There are two updates that need your attention. Everything else can wait until later.' },
    {
      id: 'context-table', type: 'table', title: 'Today’s overview', subtitle: 'A summary from your inbox',
      columns: [{ id: 'key' }, { id: 'value', align: 'right' }], previewRows: 2,
      rows: [
        { id: 'important', cells: ['Needs a reply', [{ text: '2 messages', tone: 'highlight' }]] },
        { id: 'other', cells: ['Other updates', '4 messages'] },
        { id: 'archived', cells: ['Already handled', '3 messages'] },
      ],
    },
    { id: 'context-next', type: 'heading', text: 'What’s next' },
    { id: 'context-list', type: 'numbered-list', items: [
      { id: 'confirm', text: 'Confirm your availability for the design review with Jacob.' },
      { id: 'check', text: 'Check the update about your Hyderabad transfer request.' },
      { id: 'later', text: 'Leave the promotional messages for a quieter moment.' },
    ] },
    { id: 'context-actions', type: 'actions', actions: [
      { id: 'draft', label: 'Draft a reply', message: 'Draft a reply to Jacob' },
    ] },
  ],
  suggestions: [
    { id: 'help', label: 'Help me reply', message: 'Draft a reply to Jacob' },
    { id: 'priorities', label: 'What needs attention?', message: 'Show more details about my mail' },
  ],
};

export const demoTasks: Task[] = [
  { id: 'team-check-in', kind: 'calendar', title: 'Team check-in', due: 'Today, 10:30 AM' },
  { id: 'reply-jacob', kind: 'task', title: 'Reply to Jacob', due: 'Before 11:00 AM' },
  { id: 'design-review', kind: 'calendar', title: 'Design review', due: 'Today, 2:00 PM' },
  { id: 'gym-task', kind: 'task', title: 'Finish your workout', due: 'This evening' },
  { id: 'travel-call', kind: 'calendar', title: 'Call with travel agent', due: 'Today, 5:30 PM' },
  { id: 'review-flights', kind: 'task', title: 'Review flight options', due: 'Before tomorrow' },
];

export const demoSnapshots: Record<'empty' | 'single' | 'multiple' | 'calendar', Snapshot> = {
  empty: { tasks: [], findings: [] },
  single: { tasks: [], findings: [mail] },
  multiple: {
    tasks: demoTasks,
    findings: [flights, mixedContent, mail],
  },
  calendar: {
    tasks: demoTasks,
    findings: [mail],
  },
};

const agents: Agent[] = [
  { id: 'flight-tracker', name: 'Flight Tracker', description: 'Tracks flight prices even when you are sleeping', icon: 'flight', image: { asset: 'flight' }, document: '# Flight Tracker\n\n## Purpose\nWatch the routes I care about and surface useful fare changes.\n\n## Instructions\n- Compare fares in the same currency.\n- Tell me when a price falls meaningfully.\n- Ask before booking anything.\n' },
  { id: 'email-summariser', name: 'Email Summariser', description: 'Summarises your daily emails', icon: 'mail', image: { asset: 'mail' }, document: '# Email Summariser\n\n## Purpose\nHelp me keep up with my inbox.\n\n## Instructions\n- Summarise messages that need my attention.\n- Use short numbered points.\n- Highlight deadlines and requests for a reply.\n- Ask before sending an email.\n' },
  { id: 'gym-buddy', name: 'Gym Buddy', description: 'A little help with your everyday fitness routine', icon: 'gym', image: { asset: 'gym' }, document: '# Gym Buddy\n\n## Purpose\nHelp me stay consistent with my routine.\n\n## Instructions\n- Respect my planned rest days.\n- Keep reminders brief.\n- Check in after a scheduled session.\n' },
  { id: 'video-playlist', name: 'Video Playlist', description: 'Finds something worth watching for you', icon: 'video', image: { asset: 'video' }, document: '# Video Playlist\n\n## Purpose\nCollect videos about my interests.\n\n## Instructions\n- Prefer relevant, useful videos.\n- Explain why a video is worth my time.\n- Avoid repeated recommendations.\n' },
];

const profile: Profile = {
  name: 'Karunakaran', email: 'karunkaran@kerala.gov.in', dob: '11/13/2002', avatar: { asset: 'avatar' },
  interests: ['Rugby', 'Arcade games', 'Soccer', 'Travel', 'Technology', 'Fitness'],
  preferences: ['Never interfere during work hours', 'Pass minimum informations', 'Ask before taking an action', 'Keep my evenings free'],
};

const phoneDetails = {
  body: 'A phone upgrade is worth a closer look when it improves the things you use every day: taking photos, getting through a busy afternoon, and keeping your favourite apps close at hand.',
  sections: [
    { id: 'look-for', title: 'What to look for', points: ['Compare camera samples from everyday scenes, not just studio shots.', 'Check the size and weight against the phone you already carry.', 'Think about storage, charging, and the apps you use most.'] },
    { id: 'closer-look', title: 'Take a closer look', paragraphs: ['Start with the official product range, then compare a few options side by side. The best fit is the one that makes your usual routine easier, rather than the one with the longest specification list.'] },
  ],
  links: [
    { id: 'phones', label: 'Explore Xiaomi phones', caption: 'Official product range', url: 'https://www.mi.com/global/phone/' },
    { id: 'support', label: 'Xiaomi guides and support', caption: 'Setup, warranty, and help', url: 'https://www.mi.com/global/support/' },
  ],
} satisfies Pick<FeedItem, 'body' | 'sections' | 'links'>;

const maybachDetails = {
  body: 'Take a moment to explore the Maybach S-Class through the details that matter on a journey: the cabin, seating, finish, and the experience of travelling as a passenger.',
  sections: [
    { id: 'cabin', title: 'A closer look at the cabin', points: ['Explore the seating layout and available interior finishes.', 'Look at how the controls and screens fit into the cabin.', 'Compare the features offered in your region and chosen model.'] },
    { id: 'explore', title: 'Explore in your own time', paragraphs: ['Use the official overview for a first impression, then open the S-Class page for a more focused look. Keep a short list of the details you would like to see in person.'] },
  ],
  links: [
    { id: 's-class', label: 'Discover the Maybach S-Class', caption: 'Official model overview', url: 'https://www.mercedes-benz.com/en/vehicles/mercedes-maybach/mercedes-maybach-s-class/' },
    { id: 'maybach', label: 'Explore Mercedes-Maybach', caption: 'Design, models, and stories', url: 'https://www.mercedes-benz.com/en/vehicles/mercedes-maybach/' },
  ],
} satisfies Pick<FeedItem, 'body' | 'sections' | 'links'>;

const skodaDetails = {
  body: 'Here is a closer look at the Slavia, with a few useful things to compare before you explore further. Focus on how a sedan would fit into your everyday drives and longer trips.',
  sections: [
    { id: 'compare', title: 'A few things to compare', points: ['Check the cabin space, seating position, and luggage space.', 'Compare the equipment offered across the different variants.', 'Look at the available engine and transmission combinations.'] },
    { id: 'next', title: 'Where to go next', paragraphs: ['The official model page brings the range together in one place. Use it to narrow down the variants you would like to explore, then compare them with the rest of the Škoda range.'] },
  ],
  links: [
    { id: 'slavia', label: 'Explore the Škoda Slavia', caption: 'Official model and variant details', url: 'https://www.skoda-auto.co.in/models/slavia/slavia' },
    { id: 'range', label: 'See the Škoda range', caption: 'More models to explore', url: 'https://www.skoda-auto.co.in/' },
  ],
} satisfies Pick<FeedItem, 'body' | 'sections' | 'links'>;

const watchDetails = {
  body: 'A watch can be a useful companion for the small moments throughout your day. Think about the notifications, activities, and everyday features you would actually want on your wrist.',
  sections: [
    { id: 'routine', title: 'Find a fit for your routine', points: ['Compare the case sizes and try to picture how each would feel.', 'Look at the features you would use during your usual activities.', 'Check phone compatibility and the charging routine before choosing.'] },
    { id: 'models', title: 'Compare the options', paragraphs: ['The official comparison page makes it easier to see differences between models. Start with the features you care about, then explore the finishes and bands that suit your style.'] },
  ],
  links: [
    { id: 'watch', label: 'Explore Apple Watch', caption: 'Official watch collection', url: 'https://www.apple.com/watch/' },
    { id: 'compare', label: 'Compare Apple Watch models', caption: 'See the differences side by side', url: 'https://www.apple.com/watch/compare/' },
  ],
} satisfies Pick<FeedItem, 'body' | 'sections' | 'links'>;

const feed: FeedGroup[] = [
  { id: 'oct-07', dateLabel: '07 Oct', items: [
    { id: 'xiaomi', title: 'New launch of Xiaomi 17', description: 'A closer look at design, cameras, and everyday essentials before your next upgrade.', image: { asset: 'phone' }, ...phoneDetails },
    { id: 'maybach', title: 'Introducing Maybach S580', description: 'Stay connected, explore more, and capture the moments that matter.', image: { asset: 'car' }, ...maybachDetails },
  ] },
  { id: 'oct-06', dateLabel: '06 Oct', items: [
    { id: 'skoda', title: 'New launch of Skoda Slavia', description: 'Explore the cabin, everyday comfort, and details worth comparing across variants.', image: { asset: 'skoda' }, ...skodaDetails },
    { id: 'watch', title: 'A closer look at Apple Watch', description: 'Find a watch that fits your everyday routine and the activities you enjoy.', image: { asset: 'watch' }, ...watchDetails },
    { id: 'maybach-2', title: 'Introducing Maybach S580', description: 'Stay connected, explore more, and capture the moments that matter.', image: { asset: 'car' }, ...maybachDetails },
    { id: 'phone-2', title: 'A closer look at what’s new', description: 'A few ideas for your next upgrade, collected in one place.', image: { asset: 'phone' }, ...phoneDetails },
  ] },
];

const requestedScenario = process.env.EXPO_PUBLIC_DEMO_SCENARIO as keyof typeof demoSnapshots | undefined;

export const demoData = {
  // Change just this payload to preview zero, one, or many published findings.
  snapshot: demoSnapshots[requestedScenario ?? 'multiple'] ?? demoSnapshots.multiple,
  agents,
  profile,
  feed,
  typingDelayMs: 1400,
  replies: {
    default: { highlights: ['local demo response'], text: 'I’ve noted that. This is a local demo response; your agents will provide the real answer when connected.', actions: [{ id: 'details', label: 'Show more details', message: 'Show more details about my mail' }] },
    draft: { highlights: ['Jacob', 'design review', 'confirm the time'], text: 'Hi Jacob, thanks for the invitation. I’m happy to join the design review. Could you confirm the time?', actions: [{ id: 'revise', label: 'Make it shorter', message: 'Make the draft shorter' }, { id: 'done', label: 'Looks good', message: 'The draft looks good' }] },
    shorter: { highlights: ['Jacob', 'design review', 'confirm the time'], text: 'Hi Jacob, I’m happy to join the design review. Please confirm the time.' },
    reschedule: { highlights: ['this evening', '6pm'], text: 'I can move your gym task to this evening. Does 6pm work for you?', actions: [{ id: 'confirm', label: 'Yes, 6pm', message: 'Confirm 6pm' }, { id: 'later', label: 'Try 7pm', message: 'Confirm 7pm' }] },
    confirm: { highlights: ['this evening'], text: 'Your demo task is set for this evening. You’re all set.' },
    details: { highlights: ['RSVP', 'design review', 'declined'], text: 'Jacob is waiting for an RSVP to the design review. Your transfer request was declined, and four promotional emails can wait.', actions: [{ id: 'draft', label: 'Draft a reply', message: 'Draft a reply to Jacob' }] },
    flights: { highlights: ['departure city', 'destination', 'dates'], text: 'Tell me your departure city, destination, and dates, and I’ll help compare the options.' },
    done: { highlights: ['draft is ready', 'before sending'], text: 'The draft is ready. In the connected app, you’ll be able to review it before sending.' },
  } satisfies Record<string, Reply>,
};
