export type Service = { slug:string; number:string; short:string; title:string; description:string; subtitle:string; icon:string; image:string; items:string[]; benefits:string[]; process:string[] }
export const images = { hero:'https://images.pexels.com/photos/17842832/pexels-photo-17842832.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', electrical:'https://images.pexels.com/photos/10871929/pexels-photo-10871929.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', security:'https://images.pexels.com/photos/37591155/pexels-photo-37591155.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', cctv:'https://images.pexels.com/photos/5966513/pexels-photo-5966513.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', solar:'https://images.pexels.com/photos/38171111/pexels-photo-38171111.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', battery:'https://images.pexels.com/photos/39057090/pexels-photo-39057090.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' }
export let services:Service[] = [
 {slug:'electrical-installation-repairs',number:'01',short:'Electrical',title:'Electrical Installation & Repairs',description:'Professional electrical installation, troubleshooting, repairs, rewiring and maintenance for homes, offices and commercial spaces.',subtitle:'Reliable electrical solutions installed with care and precision.',icon:'Zap',image:images.electrical,items:['Electrical installation','Electrical repairs','Fault diagnosis','Rewiring','Lighting installation','Electrical maintenance','Residential electrical work','Office & commercial electrical work'],benefits:['Safety','Reliability','Efficiency','Professional workmanship'],process:['Assess','Plan','Install / repair','Test','Support']},
 {slug:'home-office-security',number:'02',short:'Security',title:'Home & Office Security Systems',description:'Reliable security system installation designed to protect homes, offices and commercial environments.',subtitle:'Protect the spaces that matter most.',icon:'ShieldCheck',image:images.security,items:['Home security systems','Office security systems','Security equipment installation','Security planning','System configuration','Security upgrades'],benefits:['Confidence','Clarity','Control','Peace of mind'],process:['Understand','Assess','Plan','Install','Support']},
 {slug:'cctv-alarm-systems',number:'03',short:'CCTV & Alarm',title:'CCTV & Alarm System Installation',description:'CCTV surveillance and alarm system installation for improved visibility, monitoring and protection.',subtitle:'Better visibility. Better protection.',icon:'Cctv',image:images.cctv,items:['CCTV installation','Camera positioning','Surveillance setup','Recording systems','Alarm installation','System configuration','Monitoring solutions'],benefits:['Visibility','Awareness','Protection','Control'],process:['Survey','Position','Install','Configure','Support']},
 {slug:'solar-inverter-installation',number:'04',short:'Solar & Inverter',title:'Solar Inverter Installation',description:'Solar and inverter installation solutions designed to provide reliable backup power and better energy independence.',subtitle:'Reliable backup power designed around your needs.',icon:'SunMedium',image:images.solar,items:['Solar inverter installation','Inverter setup','Backup power systems','Battery systems','Solar system integration','Maintenance and troubleshooting'],benefits:['Continuity','Efficiency','Independence','Preparedness'],process:['Assess','Plan','Install','Test','Support']}
]
export let projects = [
 {slug:'residential-electrical-installation',title:'Residential Electrical Installation',category:'Electrical',location:'Residential project',image:images.electrical,description:'A considered electrical installation and repair project for a modern home.'},
 {slug:'office-security-installation',title:'Office Security Installation',category:'Security',location:'Office environment',image:images.security,description:'Security equipment planning and installation for a professional workspace.'},
 {slug:'cctv-installation',title:'CCTV Installation',category:'CCTV & Alarm',location:'Commercial property',image:images.cctv,description:'A practical surveillance setup focused on visibility and monitoring.'},
 {slug:'solar-inverter-project',title:'Solar Inverter Project',category:'Solar & Inverter',location:'Residential project',image:images.solar,description:'Backup power installation planned around the needs of a modern space.'},
 {slug:'battery-backup-installation',title:'Battery Backup Installation',category:'Solar & Inverter',location:'Energy project',image:images.battery,description:'Battery system installation to support a more resilient power setup.'},
 {slug:'electrical-panel-repair',title:'Electrical Panel Repair',category:'Electrical',location:'Maintenance project',image:images.hero,description:'Professional troubleshooting and repair work on an existing electrical system.'}
]
export let faqs = [
 ['General','What services does ASOSTECH provide?','ASOSTECH focuses on electrical installation and repairs, home and office security systems, CCTV and alarm installation, and solar inverter installation.'],
 ['Electrical','Do you install electrical systems for homes?','Yes. We provide residential electrical installation, repairs, fault diagnosis, rewiring, lighting and maintenance.'],
 ['Electrical','Do you repair existing electrical systems?','Yes. We can assess existing systems and carry out appropriate repair and maintenance work.'],
 ['Security','Do you install security systems for offices?','Yes. We install and configure security systems for homes, offices and commercial environments.'],
 ['CCTV & Alarm','Can you install CCTV in an existing building?','Yes. We can review the space, recommend practical camera positions and install a suitable system.'],
 ['CCTV & Alarm','Do you install alarm systems?','Yes. Alarm installation and system configuration are part of our CCTV and alarm service.'],
 ['Solar & Inverter','Do you install solar inverters?','Yes. We install solar inverters, backup power systems and battery systems.'],
 ['General','Can I request a quote before installation?','Yes. Use the quote request form to share your needs and we will review the project details.']
]
export const nav = [{label:'Home',href:'/'},{label:'About',href:'/about'},{label:'Services',href:'/services'},{label:'Projects',href:'/projects'},{label:'Contact',href:'/contact'}]

export let websiteContent: Record<string, Record<string, string>> = {};
export let siteSettings = { company_name: 'ASOSTECH', contact_email: 'info@asostech.com', phone: '', website: '', address: '', business_hours: '', logo_url: '' };
export function replaceWebsiteContent(next: Record<string, Record<string, string>>, settings?: Partial<typeof siteSettings>) {
  websiteContent = next;
  if (settings) siteSettings = { ...siteSettings, ...settings };
}
export function contentValue(section: string, field: string, fallback: string) {
  return websiteContent[section]?.[field] || fallback;
}

export function replaceSiteData(next: { services?: Service[]; projects?: typeof projects; faqs?: typeof faqs }) {
  if (next.services) services = next.services;
  if (next.projects) projects = next.projects;
  if (next.faqs) faqs = next.faqs;
}
