export type ContentFields = Record<string, string>;

export const contentSections: { key: string; name: string; description: string; fields: { key: string; label: string; multiline?: boolean }[] }[] = [
  { key: 'homepage', name: 'Homepage', description: 'Hero heading, introduction and buttons', fields: [
    { key: 'eyebrow', label: 'Small heading' }, { key: 'title', label: 'Main heading' },
    { key: 'description', label: 'Introduction', multiline: true }, { key: 'primary_cta', label: 'Main button' },
    { key: 'secondary_cta', label: 'Second button' },
  ] },
  { key: 'about', name: 'About', description: 'Company story, mission and vision', fields: [
    { key: 'hero_title', label: 'Page heading' }, { key: 'hero_description', label: 'Page introduction', multiline: true },
    { key: 'story_one', label: 'Company story paragraph 1', multiline: true }, { key: 'story_two', label: 'Company story paragraph 2', multiline: true },
    { key: 'mission', label: 'Mission', multiline: true }, { key: 'vision', label: 'Vision', multiline: true },
  ] },
  { key: 'contact', name: 'Contact', description: 'Contact details shown on the public site', fields: [
    { key: 'email', label: 'Email' }, { key: 'phone', label: 'Phone' }, { key: 'address', label: 'Address', multiline: true },
    { key: 'business_hours', label: 'Business hours', multiline: true },
  ] },
  { key: 'call_to_action', name: 'Call to action', description: 'Site-wide closing section', fields: [
    { key: 'title', label: 'Heading' }, { key: 'description', label: 'Description', multiline: true }, { key: 'button', label: 'Button text' },
  ] },
];

export const defaultContent: Record<string, ContentFields> = {
  homepage: { eyebrow: 'SMARTER SYSTEMS. SAFER SPACES.', title: 'Advanced Electrical & Security Systems', description: 'Reliable electrical, security and power solutions for homes, offices and modern spaces.', primary_cta: 'Start a Conversation', secondary_cta: 'Explore Services' },
  about: { hero_title: 'Powering spaces. Protecting what matters.', hero_description: 'Practical electrical, security and power solutions for the places people live and work.', story_one: 'ASOSTECH delivers reliable electrical, security and power solutions for homes, offices and modern spaces. Our work is grounded in practical thinking, careful installation and a clear understanding of how each system needs to perform in the real world.', story_two: 'From an electrical repair to a new security installation or backup power solution, we help clients move from uncertainty to a setup they can rely on.', mission: 'To deliver dependable systems that make everyday spaces safer, more connected and more resilient.', vision: 'To be a trusted name for thoughtful electrical, security and power work.' },
  contact: { email: 'info@asostech.com', phone: '', address: '', business_hours: '' },
  call_to_action: { title: 'Let’s build a safer, smarter space.', description: 'Need electrical work, security installation, CCTV, alarm systems or solar/inverter solutions? We’re ready to help.', button: 'Start a Conversation' },
};
