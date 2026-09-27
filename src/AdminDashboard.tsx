import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import { ContentPage as SupabaseContentPage, SettingsPage as SupabaseSettingsPage } from './AdminCms';
import { MediaPage as LiveMediaPage, MessagesPage as LiveMessagesPage, NotificationPanel as LiveNotificationPanel } from './AdminOps';
import './admin.css';
import {
  Activity, Archive, ArrowLeft, ArrowUpRight, Bell, BriefcaseBusiness, CalendarDays, Check, ChevronDown, ChevronRight, CircleHelp, ClipboardList, Clock3, Copy, Download, Edit3, FileText, Filter, FolderKanban, Globe2, Grid2X2, Headphones, Image as ImageIcon, Inbox, Layers3, LayoutDashboard, List, LockKeyhole, LogOut, Mail, Menu, MessageSquare, MoreHorizontal, PanelLeftClose, Plus, Search, Send, Settings2, ShieldCheck, SlidersHorizontal, Sparkles, Tag, Trash2, TrendingUp, Upload, User, UserPlus, Users, X, Zap, Eye, EyeOff,
  type LucideIcon,
} from 'lucide-react';

type Page = 'dashboard' | 'leads' | 'projects' | 'services' | 'faqs' | 'messages' | 'content' | 'media' | 'settings';
type Status = 'New' | 'Reviewing' | 'Contacted' | 'Quoted' | 'Completed' | 'Archived';
type Service = { id: number; name: string; category: string; status: 'Published' | 'Draft'; order: number; updated: string; color: string };
type Toast = { message: string; tone?: 'success' | 'danger' };

type NavItem = { label: string; page?: Page; icon: LucideIcon };

const ASOSTECH_LOGO = '/asostech-logo.png';

const projectImages = [
  'https://images.pexels.com/photos/4254159/pexels-photo-4254159.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  'https://images.pexels.com/photos/35691079/pexels-photo-35691079.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  'https://images.pexels.com/photos/9875418/pexels-photo-9875418.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
];

const navGroups: { title: string; items: NavItem[] }[] = [
  { title: 'Overview', items: [{ label: 'Dashboard', page: 'dashboard', icon: LayoutDashboard }] },
  { title: 'Operations', items: [{ label: 'Leads & Quotes', page: 'leads', icon: Inbox }, { label: 'Projects', page: 'projects', icon: FolderKanban }, { label: 'Services', page: 'services', icon: Layers3 }, { label: 'Messages', page: 'messages', icon: MessageSquare }] },
  { title: 'Content', items: [{ label: 'FAQs', page: 'faqs', icon: CircleHelp }, { label: 'Website Content', page: 'content', icon: Globe2 }, { label: 'Media Library', page: 'media', icon: ImageIcon }] },
  { title: 'System', items: [{ label: 'Settings', page: 'settings', icon: Settings2 }] },
];

const initialServices: Service[] = [
  { id: 1, name: 'Electrical Installation & Repairs', category: 'Electrical', status: 'Published', order: 1, updated: '2 days ago', color: '#25e77d' },
  { id: 2, name: 'Home & Office Security Systems', category: 'Security', status: 'Published', order: 2, updated: '2 days ago', color: '#5d9dff' },
  { id: 3, name: 'CCTV & Alarm System Installation', category: 'Security', status: 'Published', order: 3, updated: '4 days ago', color: '#a278ff' },
  { id: 4, name: 'Solar Inverter Installation', category: 'Solar', status: 'Published', order: 4, updated: '6 days ago', color: '#f7b955' },
];

const leads = [
  { initials: 'JA', name: 'John Adeyemi', service: 'CCTV & Alarm', project: 'Office surveillance', location: 'Lekki', status: 'New' as Status, priority: 'High', received: '4 min ago' },
  { initials: 'SW', name: 'Sarah Williams', service: 'Solar & Inverter', project: 'Residential backup', location: 'Ikoyi', status: 'Reviewing' as Status, priority: 'Medium', received: '32 min ago' },
  { initials: 'MO', name: 'Michael Okoro', service: 'Electrical', project: 'Office rewiring', location: 'Victoria Island', status: 'Contacted' as Status, priority: 'Medium', received: '2 hrs ago' },
  { initials: 'DA', name: 'David Adebayo', service: 'Security', project: 'Home security', location: 'Ikeja', status: 'Quoted' as Status, priority: 'High', received: '3 hrs ago' },
  { initials: 'GJ', name: 'Grace Johnson', service: 'Solar & Inverter', project: 'Solar installation', location: 'Yaba', status: 'Completed' as Status, priority: 'Low', received: '5 hrs ago' },
];

const activity = [
  { icon: UserPlus, title: 'New quote request', body: 'John Adeyemi requested CCTV installation', time: '4 minutes ago', color: 'green' },
  { icon: FolderKanban, title: 'Project updated', body: 'Office Security Upgrade', time: '32 minutes ago', color: 'blue' },
  { icon: Layers3, title: 'Service published', body: 'Solar & Inverter', time: '1 hour ago', color: 'orange' },
  { icon: CircleHelp, title: 'FAQ updated', body: 'How long does installation take?', time: '2 hours ago', color: 'purple' },
];

function App() {
  const [authUser, setAuthUser] = useState<SupabaseUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState('');
  const [page, setPage] = useState<Page>('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [services, setServices] = useState<Service[]>(initialServices);
  const [showServiceEditor, setShowServiceEditor] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedLead, setSelectedLead] = useState<number | null>(null);
  const [settingsSection, setSettingsSection] = useState('General');

  useEffect(() => {
    if (!supabase) { setAuthReady(true); return; }
    supabase.auth.getSession().then(({ data }) => {
      setAuthUser(data.session?.user ?? null);
      setAuthReady(true);
    }).catch(() => setAuthReady(true));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user ?? null);
      setAuthReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (authUser && authUser.app_metadata?.role !== 'admin') {
      setAuthError('This account does not have ASOSTECH admin access. Ask your project owner to grant the admin role.');
      void supabase?.auth.signOut();
    }
  }, [authUser]);

  const notify = (message: string, tone: Toast['tone'] = 'success') => {
    setToast({ message, tone });
    window.setTimeout(() => setToast(null), 2800);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (event.key === 'Escape') {
        setSearchOpen(false);
        setProfileOpen(false);
        setNotificationsOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const isAuthenticated = authUser?.app_metadata?.role === 'admin';
  const onLogin = async (email: string, password: string) => {
    if (!supabase) throw new Error('Supabase is not configured. Copy .env.example to .env.local first.');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (data.user.app_metadata?.role !== 'admin') {
      await supabase.auth.signOut();
      throw new Error('This account does not have ASOSTECH admin access. Ask your project owner to grant the admin role.');
    }
    setAuthError('');
  };

  if (!authReady) return <div className="admin-root"><div className="admin-loading">Loading secure admin console…</div></div>;
  if (!isAuthenticated) return <div className="admin-root"><SupabaseLoginScreen onLogin={onLogin} message={authError} /></div>;

  const addService = (name: string, category: string) => {
    setServices((current) => [...current, { id: Date.now(), name, category, status: 'Draft', order: current.length + 1, updated: 'Just now', color: '#25e77d' }]);
    setShowServiceEditor(false);
    notify('Service saved as draft.');
  };

  const renderPage = () => {
    if (selectedLead !== null) return <LeadDetail onBack={() => setSelectedLead(null)} notify={notify} />;
    switch (page) {
      case 'dashboard': return <LiveDashboard onNavigate={setPage} notify={notify} />;
      case 'leads': return <LiveLeadsPage notify={notify} />;
      case 'projects': return <LiveProjectsPage notify={notify} />;
      case 'services': return <LiveServicesPage notify={notify} />;
      case 'faqs': return <LiveFaqsPage notify={notify} />;
      case 'messages': return <LiveMessagesPage notify={notify} />;
      case 'content': return <SupabaseContentPage notify={notify} />;
      case 'media': return <LiveMediaPage notify={notify} />;
      case 'settings': return <SupabaseSettingsPage notify={notify} user={authUser!} initialSection={settingsSection} />;
    }
  };

  return (
    <div className="admin-root"><div className="app-shell">
      <Sidebar page={page} setPage={(next) => { setPage(next); if (next === 'settings') setSettingsSection('General'); setSelectedLead(null); setMobileOpen(false); }} collapsed={sidebarCollapsed} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} onProfile={() => { setPage('settings'); setSettingsSection('Profile'); }} />
      {mobileOpen && <button className="sidebar-backdrop" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />}
      <main className={`main-shell ${sidebarCollapsed ? 'main-shell--collapsed' : ''}`}>
        <Topbar page={page} user={authUser!} onMenu={() => setMobileOpen(true)} onCollapse={() => setSidebarCollapsed((value) => !value)} onSearch={() => setSearchOpen(true)} onNotifications={() => setNotificationsOpen((value) => !value)} onProfile={() => setProfileOpen((value) => !value)} />
        <div className="page-wrap">{renderPage()}</div>
      </main>
      {searchOpen && <CommandPalette onClose={() => setSearchOpen(false)} onNavigate={(next) => { setPage(next); setSearchOpen(false); }} />}
      {notificationsOpen && <LiveNotificationPanel onClose={() => setNotificationsOpen(false)} onNavigate={() => { setPage('messages'); setNotificationsOpen(false); }} />}
      {profileOpen && <LiveProfileMenu user={authUser!} onLogout={() => { void supabase?.auth.signOut(); }} onProfile={() => { setPage('settings'); setSettingsSection('Profile'); setProfileOpen(false); }} onSettings={() => { setPage('settings'); setSettingsSection('General'); setProfileOpen(false); }} />}
      {showServiceEditor && <ServiceEditor onClose={() => setShowServiceEditor(false)} onSave={addService} />}
      {showConfirm && <ConfirmDialog onCancel={() => setShowConfirm(false)} onConfirm={() => { setShowConfirm(false); notify('Project deleted.', 'danger'); }} />}
      {toast && <div className={`toast ${toast.tone === 'danger' ? 'toast--danger' : ''}`}><span className="toast-icon"><Check size={15} /></span>{toast.message}<button onClick={() => setToast(null)} aria-label="Close notification"><X size={14} /></button></div>}
    </div></div>
  );
}

function Sidebar({ page, setPage, collapsed, mobileOpen, onClose, onProfile }: { page: Page; setPage: (page: Page) => void; collapsed: boolean; mobileOpen: boolean; onClose: () => void; onProfile: () => void }) {
  return <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''} ${mobileOpen ? 'sidebar--mobile-open' : ''}`}>
    <div className="brand"><img className="admin-logo" src={ASOSTECH_LOGO} alt="ASOSTECH" /><img className="admin-logo-mark" src="/asostech-mark.png" alt="ASOSTECH mark" /><div className="brand-copy"><strong>ADMIN CONSOLE</strong><span>ASOSTECH</span></div><button className="mobile-close" onClick={onClose} aria-label="Close navigation"><X size={18} /></button></div>
    <div className="sidebar-scroll">
      {navGroups.map((group) => <div className="nav-group" key={group.title}><div className="nav-label">{group.title}</div>{group.items.map((item) => <button key={item.label} className={`nav-item ${page === item.page ? 'nav-item--active' : ''}`} onClick={() => item.page && setPage(item.page)}><item.icon size={17} strokeWidth={1.8} /><span>{item.label}</span>{item.label === 'Leads & Quotes' && <em>8</em>}</button>)}</div>)}
    </div>
    <div className="sidebar-footer"><button className="nav-item" onClick={() => window.location.assign('/')}><Globe2 size={17} /><span>View Website</span><ArrowUpRight className="external-icon" size={13} /></button><button className="nav-item" onClick={onProfile}><div className="mini-avatar">ME</div><span>Admin Profile</span></button></div>
  </aside>;
}

function Topbar({ page, user, onMenu, onCollapse, onSearch, onNotifications, onProfile }: { page: Page; user: SupabaseUser; onMenu: () => void; onCollapse: () => void; onSearch: () => void; onNotifications: () => void; onProfile: () => void }) {
  const title = page === 'leads' ? 'Leads & Quote Requests' : page === 'content' ? 'Website Content' : page === 'media' ? 'Media Library' : page[0].toUpperCase() + page.slice(1);
  const name = String(user.user_metadata?.full_name || user.email || 'Admin');
  const initials = name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  return <header className="topbar"><button className="mobile-menu" onClick={onMenu} aria-label="Open navigation"><Menu size={20} /></button><button className="collapse-button" onClick={onCollapse} aria-label="Collapse sidebar"><PanelLeftClose size={17} /></button><div className="crumb"><span>ASOSTECH</span><ChevronRight size={13} /><strong>{title}</strong></div><button className="global-search" onClick={onSearch}><Search size={15} /><span>Search anything...</span><kbd>Ctrl K</kbd></button><div className="top-actions"><button className="icon-button" onClick={onNotifications} aria-label="Notifications"><Bell size={17} /><i /></button><button className="help-button"><CircleHelp size={16} /><span>Help</span></button><button className="profile-trigger" onClick={onProfile}><div className="avatar">{initials}</div><span><strong>{name}</strong><small>Administrator</small></span><ChevronDown size={13} /></button></div></header>;
}

function PageHeader({ eyebrow, title, description, action, actionLabel, icon: Icon = Plus }: { eyebrow?: string; title: string; description?: string; action?: () => void; actionLabel?: string; icon?: LucideIcon }) {
  return <div className="page-header"><div><div className="eyebrow">{eyebrow || 'ASOSTECH OPERATIONS'}</div><h1>{title}</h1>{description && <p>{description}</p>}</div>{action && actionLabel && <button className="button button--primary" onClick={action}><Icon size={15} />{actionLabel}</button>}</div>;
}

function Dashboard({ onNavigate, notify }: { onNavigate: (page: Page) => void; notify: (message: string) => void }) {
  const [range, setRange] = useState('30 Days');
  return <>
    <div className="page-header dashboard-header"><div><div className="eyebrow">MONDAY, 27 SEPTEMBER 2026</div><h1>Dashboard</h1><p>Welcome back. Here&apos;s what&apos;s happening with ASOSTECH.</p></div><div className="range-tabs">{['Today', '7 Days', '30 Days', '90 Days', 'Custom'].map((item) => <button key={item} className={range === item ? 'active' : ''} onClick={() => setRange(item)}>{item}</button>)}</div></div>
    <div className="stats-grid"><StatCard title="New Leads" value="24" change="+18.2%" detail="vs previous period" icon={Users} tone="green" /><StatCard title="Pending Quotes" value="8" change="+6.4%" detail="vs previous period" icon={FileText} tone="blue" /><StatCard title="Active Projects" value="12" change="3 due this month" detail="" icon={BriefcaseBusiness} tone="orange" /><StatCard title="Published Services" value="4" change="Manage services" detail="" icon={Layers3} tone="purple" onClick={() => onNavigate('services')} /></div>
    <div className="dashboard-grid"><QuoteChart range={range} /><RequestsDonut /></div>
    <div className="lower-grid"><RecentRequests onNavigate={onNavigate} onSelect={() => onNavigate('leads')} /><ActivityFeed /></div>
    <div className="quick-row"><button onClick={() => onNavigate('leads')}><Inbox size={16} /> Review new leads <ArrowUpRight size={14} /></button><button onClick={() => onNavigate('projects')}><Plus size={16} /> Create a project <ArrowUpRight size={14} /></button><button onClick={() => notify('All reports are up to date.')}><Download size={16} /> Export monthly report <ArrowUpRight size={14} /></button></div>
  </>;
}

function StatCard({ title, value, change, detail, icon: Icon, tone, onClick }: { title: string; value: string; change: string; detail: string; icon: LucideIcon; tone: string; onClick?: () => void }) {
  return <button className="stat-card" onClick={onClick}><div className={`stat-icon stat-icon--${tone}`}><Icon size={18} /></div><div className="stat-meta"><span>{title}</span><strong>{value}</strong><small className={change.startsWith('+') ? 'positive' : ''}>{change}{detail && <i> {detail}</i>}</small></div><ArrowUpRight className="stat-arrow" size={15} /></button>;
}

function QuoteChart({ range }: { range: string }) {
  return <section className="panel chart-panel"><div className="panel-heading"><div><div className="section-kicker">PERFORMANCE</div><h2>Quote Requests</h2><div className="chart-total"><strong>184</strong><span>Total requests <b>+12.8%</b></span></div></div><div className="chart-controls"><span className="legend"><i className="legend-dot green" /> Requests <i className="legend-dot blue" /> Quoted <i className="legend-dot muted" /> Completed</span><div className="mini-tabs">{['7D', '30D', '90D', '1Y'].map((item) => <button className={(range === '30 Days' && item === '30D') || (range === '7 Days' && item === '7D') ? 'active' : ''} key={item}>{item}</button>)}</div></div></div><div className="chart-area"><svg viewBox="0 0 700 235" preserveAspectRatio="none" role="img" aria-label="Quote requests trend chart"><defs><linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#18c96e" stopOpacity=".3" /><stop offset="1" stopColor="#18c96e" stopOpacity="0" /></linearGradient></defs>{[30, 75, 120, 165, 210].map((y) => <line key={y} x1="0" x2="700" y1={y} y2={y} stroke="rgba(126,163,145,.12)" strokeDasharray="3 5" />)}<path d="M0 179 C40 175, 62 160, 90 164 S130 120, 160 143 S210 107, 240 128 S280 72, 315 94 S350 123, 378 112 S420 82, 450 91 S490 67, 525 86 S560 73, 595 97 S650 88, 700 103 L700 235 L0 235Z" fill="url(#chartFill)" /><path d="M0 179 C40 175, 62 160, 90 164 S130 120, 160 143 S210 107, 240 128 S280 72, 315 94 S350 123, 378 112 S420 82, 450 91 S490 67, 525 86 S560 73, 595 97 S650 88, 700 103" fill="none" stroke="#25e77d" strokeWidth="3" strokeLinecap="round" /><path d="M0 201 C80 190, 106 194, 160 174 S235 164, 290 170 S350 155, 402 167 S490 145, 550 154 S640 138, 700 146" fill="none" stroke="#5d9dff" strokeWidth="2" strokeDasharray="5 5" /><circle cx="315" cy="94" r="5" fill="#25e77d" stroke="#0d1b15" strokeWidth="3" /></svg><div className="chart-labels"><span>01 Sep</span><span>08 Sep</span><span>15 Sep</span><span>22 Sep</span><span>27 Sep</span></div></div></section>;
}

function RequestsDonut() {
  const items = [{ name: 'Electrical', value: 32, color: '#25e77d' }, { name: 'Security', value: 24, color: '#5d9dff' }, { name: 'CCTV & Alarm', value: 26, color: '#a278ff' }, { name: 'Solar & Inverter', value: 18, color: '#f7b955' }];
  return <section className="panel donut-panel"><div className="panel-heading"><div><div className="section-kicker">BREAKDOWN</div><h2>Requests by Service</h2></div><button className="more-button"><MoreHorizontal size={17} /></button></div><div className="donut-content"><div className="donut"><div><strong>100</strong><span>Total</span></div></div><div className="donut-list">{items.map((item) => <div key={item.name}><span><i style={{ background: item.color }} />{item.name}</span><b>{item.value}%</b></div>)}</div></div></section>;
}

function RecentRequests({ onNavigate, onSelect }: { onNavigate: (page: Page) => void; onSelect: () => void }) {
  return <section className="panel requests-panel"><div className="panel-heading"><div><div className="section-kicker">INBOX</div><h2>Recent Quote Requests</h2></div><button className="text-button" onClick={() => onNavigate('leads')}>View all <ArrowUpRight size={14} /></button></div><div className="table-scroll"><table><thead><tr><th>Customer</th><th>Service</th><th>Project</th><th>Status</th><th>Received</th><th /></tr></thead><tbody>{leads.slice(0, 4).map((lead, index) => <tr key={lead.name} onClick={onSelect}><td><div className="customer"><span className="avatar avatar--small">{lead.initials}</span><strong>{lead.name}</strong></div></td><td>{lead.service}</td><td>{lead.project}</td><td><StatusBadge status={lead.status} /></td><td className="muted-cell">{lead.received}</td><td><button className="row-action" onClick={(event) => { event.stopPropagation(); onNavigate(index === 0 ? 'leads' : 'projects'); }}><MoreHorizontal size={16} /></button></td></tr>)}</tbody></table></div></section>;
}

function ActivityFeed() {
  return <section className="panel activity-panel"><div className="panel-heading"><div><div className="section-kicker">LIVE FEED</div><h2>Recent Activity</h2></div><button className="more-button"><MoreHorizontal size={17} /></button></div><div className="activity-list">{activity.map((item) => <div className="activity-item" key={item.title}><div className={`activity-icon activity-icon--${item.color}`}><item.icon size={14} /></div><div><strong>{item.title}</strong><p>{item.body}</p><small>{item.time}</small></div></div>)}</div></section>;
}

function StatusBadge({ status }: { status: string }) { return <span className={`status status--${status.toLowerCase()}`}><i />{status}</span>; }

function LeadsPage({ onSelect, notify }: { onSelect: (index: number) => void; notify: (message: string) => void }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Status | 'All'>('All');
  const filtered = useMemo(() => leads.filter((lead) => (filter === 'All' || lead.status === filter) && `${lead.name} ${lead.project} ${lead.service}`.toLowerCase().includes(query.toLowerCase())), [filter, query]);
  return <><PageHeader title="Leads & Quote Requests" description="Manage incoming customer enquiries and project opportunities." /><div className="summary-strip">{[['All', leads.length], ['New', 1], ['Reviewing', 1], ['Contacted', 1], ['Quoted', 1], ['Completed', 1], ['Archived', 0]].map(([label, count]) => <button key={label} className={filter === label ? 'active' : ''} onClick={() => setFilter(label as Status | 'All')}><span>{label}</span><b>{count}</b></button>)}</div><section className="panel table-panel"><div className="toolbar"><div className="search-field"><Search size={15} /><input placeholder="Search leads, customers..." value={query} onChange={(event) => setQuery(event.target.value)} /></div><button className="button button--secondary"><Filter size={15} /> Filters</button><button className="button button--secondary" onClick={() => notify('Leads export prepared.')}><Download size={15} /> Export</button></div><div className="table-scroll"><table className="leads-table"><thead><tr><th><input type="checkbox" aria-label="Select all leads" /></th><th>Customer</th><th>Service</th><th>Project</th><th>Location</th><th>Status</th><th>Priority</th><th>Received</th><th>Assigned</th><th /></tr></thead><tbody>{filtered.map((lead, index) => <tr key={lead.name} onClick={() => onSelect(index)}><td><input type="checkbox" aria-label={`Select ${lead.name}`} onClick={(event) => event.stopPropagation()} /></td><td><div className="customer"><span className="avatar avatar--small">{lead.initials}</span><strong>{lead.name}</strong></div></td><td>{lead.service}</td><td>{lead.project}</td><td>{lead.location}</td><td><StatusBadge status={lead.status} /></td><td><span className={`priority priority--${lead.priority.toLowerCase()}`}>{lead.priority}</span></td><td className="muted-cell">{lead.received}</td><td className="assigned"><span className="avatar avatar--tiny">AU</span> Admin</td><td><button className="row-action"><MoreHorizontal size={16} /></button></td></tr>)}</tbody></table>{filtered.length === 0 && <EmptyState title="No leads found" description="Try changing your search or filters." />}</div><div className="pagination"><span>Showing {filtered.length} of {leads.length} requests</span><div><button disabled><ChevronRight size={15} className="rotate-180" /></button><button className="active">1</button><button>2</button><button>3</button><button><ChevronRight size={15} /></button></div></div></section></>;
}

function LeadDetail({ onBack, notify }: { onBack: () => void; notify: (message: string) => void }) {
  return <><button className="back-link" onClick={onBack}><ArrowLeft size={15} /> Leads & Quote Requests</button><div className="detail-title"><div><div className="eyebrow">QUOTE REQUEST <span className="status status--new">NEW</span></div><h1>Office surveillance</h1><p>Received 4 minutes ago from John Adeyemi</p></div><button className="button button--secondary"><MoreHorizontal size={16} /> More actions</button></div><div className="detail-grid"><div><section className="panel customer-card"><div className="customer-large"><span className="avatar avatar--large">JA</span><div><h2>John Adeyemi</h2><p>New customer</p></div></div><div className="contact-lines"><span><Mail size={14} /> john@example.com</span><span><Headphones size={14} /> +234 800 000 0000</span><span><Tag size={14} /> Lekki, Lagos</span></div></section><section className="panel"><div className="panel-heading"><h2>Request details</h2><button className="text-button">Edit <Edit3 size={13} /></button></div><div className="detail-fields"><InfoField label="Requested service" value="CCTV & Alarm" /><InfoField label="Project type" value="Office surveillance" /><InfoField label="Budget" value="₦1,500,000 – ₦3,000,000" /><InfoField label="Timeframe" value="2–4 weeks" /><InfoField label="Description" value="We need a 16-camera surveillance system for our new office location, with remote monitoring and night vision." /></div></section><section className="panel"><div className="panel-heading"><h2>Activity timeline</h2></div><div className="timeline"><TimelineItem title="Request received" time="4 minutes ago" done /><TimelineItem title="Request opened" time="Just now" done /><TimelineItem title="Customer contacted" time="Pending" /><TimelineItem title="Quote prepared" time="Pending" /></div></section></div><aside className="detail-side"><section className="panel"><div className="field-label">STATUS</div><select defaultValue="New"><option>New</option><option>Reviewing</option><option>Contacted</option><option>Quoted</option></select><div className="field-label spaced">PRIORITY</div><select defaultValue="High"><option>High</option><option>Medium</option><option>Low</option></select><div className="field-label spaced">ASSIGNED ADMIN</div><div className="assigned-select"><span className="avatar avatar--tiny">AU</span> Admin User <ChevronDown size={14} /></div></section><section className="panel"><div className="panel-heading"><h2>Internal notes</h2></div><textarea placeholder="Add an internal note..." /><div className="note"><span className="avatar avatar--tiny">AU</span><div><strong>Admin User <small>4 min ago</small></strong><p>Priority customer, needs night vision cameras.</p></div></div><button className="button button--secondary full" onClick={() => notify('Note added to request.')}>Add note</button></section><div className="action-stack"><button className="button button--primary" onClick={() => notify('Contact action started.')}>Contact customer</button><button className="button button--secondary" onClick={() => notify('Response composer opened.')}>Send response</button><button className="button button--secondary" onClick={() => notify('Project draft created.')}>Create project</button><button className="button button--danger" onClick={() => notify('Request archived.')}>Archive request</button></div></aside></div></>;
}

function InfoField({ label, value }: { label: string; value: string }) { return <div><span>{label}</span><strong>{value}</strong></div>; }
function TimelineItem({ title, time, done }: { title: string; time: string; done?: boolean }) { return <div className={`timeline-item ${done ? 'done' : ''}`}><span>{done ? <Check size={11} /> : ''}</span><div><strong>{title}</strong><small>{time}</small></div></div>; }

function ProjectsPage({ notify }: { notify: (message: string) => void }) {
  const [view, setView] = useState<'grid' | 'table'>('grid');
  const [status, setStatus] = useState('All');
  const projects = ['Office Security Upgrade', 'Residential Solar Backup', 'Commercial Electrical Rewiring', 'CCTV Installation', 'Home Security Installation', 'Generator Installation'];
  return <><PageHeader title="Projects" description="Manage ASOSTECH projects and case studies." action={() => notify('Project editor opened.')} actionLabel="Add Project" /><div className="content-toolbar"><div className="filter-pills">{['All', 'Draft', 'Active', 'Completed', 'Archived'].map((item) => <button className={status === item ? 'active' : ''} key={item} onClick={() => setStatus(item)}>{item}</button>)}</div><div className="view-toggle"><button className={view === 'grid' ? 'active' : ''} onClick={() => setView('grid')}><Grid2X2 size={15} /> Grid View</button><button className={view === 'table' ? 'active' : ''} onClick={() => setView('table')}><List size={15} /> Table View</button></div></div>{view === 'grid' ? <div className="project-grid">{projects.map((project, index) => <article className="project-card" key={project}><div className="project-image"><img src={projectImages[index % projectImages.length]} alt="" /><span className={`status status--${index === 0 || index === 1 || index === 3 ? 'active' : index === 2 ? 'completed' : 'draft'}`}>{index === 2 ? 'Completed' : index === 4 ? 'Draft' : 'Active'}</span><button className="image-more"><MoreHorizontal size={15} /></button></div><div className="project-info"><div className="eyebrow">{index % 2 ? 'SOLAR' : 'SECURITY'} · {['Lekki', 'Ikeja', 'Victoria Island', 'Yaba'][index % 4]}</div><h3>{project}</h3><div className="project-footer"><span>Updated {index + 1} days ago</span><button onClick={() => notify(`${project} opened.`)}>Edit <ArrowUpRight size={13} /></button></div></div></article>)}</div> : <section className="panel table-panel"><div className="table-scroll"><table><thead><tr><th>Project</th><th>Category</th><th>Location</th><th>Status</th><th>Updated</th><th /></tr></thead><tbody>{projects.map((project, index) => <tr key={project}><td><strong>{project}</strong></td><td>{index % 2 ? 'Solar' : 'Security'}</td><td>{['Lekki', 'Ikeja', 'Victoria Island', 'Yaba'][index % 4]}</td><td><StatusBadge status={index === 2 ? 'Completed' : index === 4 ? 'Draft' : 'Active'} /></td><td className="muted-cell">{index + 1} days ago</td><td><button className="row-action" onClick={() => notify(`${project} opened.`)}><MoreHorizontal size={16} /></button></td></tr>)}</tbody></table></div></section>}</>;
}

function ServicesPage({ services, onAdd, onUpdate, notify }: { services: Service[]; onAdd: () => void; onUpdate: (services: Service[]) => void; notify: (message: string) => void }) {
  const [query, setQuery] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('list');
  const filtered = services.filter((service) => service.name.toLowerCase().includes(query.toLowerCase()));
  const duplicate = (service: Service) => { onUpdate([...services, { ...service, id: Date.now(), name: `${service.name} (Copy)`, status: 'Draft', order: services.length + 1, updated: 'Just now' }]); notify('Service duplicated as a draft.'); };
  return <><PageHeader title="Services" description="Manage the services offered by ASOSTECH." action={onAdd} actionLabel="Add Service" /><section className="panel service-panel"><div className="toolbar"><div className="search-field"><Search size={15} /><input placeholder="Search services..." value={query} onChange={(event) => setQuery(event.target.value)} /></div><button className="button button--secondary"><SlidersHorizontal size={15} /> Filters</button><div className="view-toggle compact"><button className={view === 'grid' ? 'active' : ''} onClick={() => setView('grid')}><Grid2X2 size={15} /></button><button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}><List size={15} /></button></div></div><div className={`service-list ${view === 'grid' ? 'service-list--grid' : ''}`}>{filtered.map((service) => <div className="service-row" key={service.id}><div className="service-symbol" style={{ color: service.color }}><Zap size={20} /></div><div className="service-name"><strong>{service.name}</strong><span>{service.category} · Updated {service.updated}</span></div><span className="service-order">{String(service.order).padStart(2, '0')}</span><StatusBadge status={service.status} /><div className="service-actions"><button onClick={() => notify('Service editor opened.')} aria-label="Edit service"><Edit3 size={15} /></button><button onClick={() => duplicate(service)} aria-label="Duplicate service"><Copy size={15} /></button><button onClick={() => notify('Service preview opened.')} aria-label="Preview service"><Eye size={15} /></button><button onClick={() => notify('More service actions opened.')} aria-label="More actions"><MoreHorizontal size={16} /></button></div></div>)}{filtered.length === 0 && <EmptyState title="No services found" description="Create a service or change your search." action={onAdd} actionLabel="Add Service" />}</div></section><div className="cms-note"><Sparkles size={16} /><div><strong>Built for scale</strong><span>Add unlimited services, capabilities, benefits, process steps and FAQs without changing the application.</span></div><ArrowUpRight size={15} /></div></>;
}

function ServiceEditor({ onClose, onSave }: { onClose: () => void; onSave: (name: string, category: string) => void }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Electrical');
  const submit = (event: FormEvent) => { event.preventDefault(); if (name.trim()) onSave(name, category); };
  return <div className="overlay"><div className="modal modal--large"><div className="modal-header"><div><div className="eyebrow">SERVICE CMS</div><h2>Create Service</h2></div><button className="icon-button" onClick={onClose} aria-label="Close modal"><X size={18} /></button></div><div className="editor-tabs"><span className="active">General</span><span>Content</span><span>Capabilities</span><span>Benefits</span><span>Process</span><span>FAQs</span><span>SEO</span><span>Preview</span></div><form onSubmit={submit}><div className="form-grid"><label className="form-field form-field--wide"><span>Service name</span><input autoFocus required placeholder="e.g. Smart Home Automation" value={name} onChange={(event) => setName(event.target.value)} /></label><label className="form-field"><span>Slug</span><input placeholder="smart-home-automation" /></label><label className="form-field"><span>Category</span><select value={category} onChange={(event) => setCategory(event.target.value)}><option>Electrical</option><option>Security</option><option>CCTV</option><option>Solar</option><option>Automation</option><option>Networking</option></select></label><label className="form-field form-field--wide"><span>Short description</span><input placeholder="Describe this service in one sentence" /></label><label className="form-field form-field--wide"><span>Full description</span><textarea rows={5} placeholder="Add the full service description..." /></label><div className="upload-box form-field--wide"><Upload size={20} /><strong>Drop a hero image here</strong><span>or browse files · JPG, PNG, WEBP</span></div></div><div className="modal-actions"><button type="button" className="button button--secondary" onClick={onClose}>Cancel</button><button type="submit" className="button button--primary">Save as Draft <ArrowUpRight size={14} /></button></div></form></div></div>;
}

function FaqPage({ notify }: { notify: (message: string) => void }) { const [category, setCategory] = useState('All'); const faqs = [{ q: 'How long does installation take?', c: 'General', s: 'Published', u: '2 days ago' }, { q: 'Do you provide warranty?', c: 'Electrical', s: 'Published', u: '5 days ago' }, { q: 'Can I get CCTV installation outside Lagos?', c: 'Security', s: 'Published', u: '8 days ago' }, { q: 'What is the difference between on-grid and hybrid solar?', c: 'Solar', s: 'Draft', u: '12 days ago' }]; return <><PageHeader title="FAQs" description="Manage frequently asked questions." action={() => notify('FAQ editor opened.')} actionLabel="Add FAQ" /><div className="content-toolbar"><div className="filter-pills">{['All', 'General', 'Electrical', 'Security', 'CCTV', 'Solar', 'Other'].map((item) => <button className={category === item ? 'active' : ''} key={item} onClick={() => setCategory(item)}>{item}</button>)}</div></div><section className="panel table-panel"><div className="table-scroll"><table><thead><tr><th>Question</th><th>Category</th><th>Status</th><th>Updated</th><th /></tr></thead><tbody>{faqs.filter((faq) => category === 'All' || faq.c === category).map((faq) => <tr key={faq.q}><td><strong>{faq.q}</strong></td><td>{faq.c}</td><td><StatusBadge status={faq.s} /></td><td className="muted-cell">{faq.u}</td><td><button className="row-action" onClick={() => notify('FAQ editor opened.')}><Edit3 size={15} /></button><button className="row-action" onClick={() => notify('FAQ actions opened.')}><MoreHorizontal size={16} /></button></td></tr>)}</tbody></table></div></section></>; }

function MessagesPage({ notify }: { notify: (message: string) => void }) { const [selected, setSelected] = useState(0); const messages = [{ name: 'John Adeyemi', subject: 'CCTV installation enquiry', preview: 'Hi, I am interested in getting a quote for CCTV installation...', time: '4m', initials: 'JA' }, { name: 'Sarah Williams', subject: 'Solar quote follow-up', preview: 'Could you send through the updated proposal...', time: '32m', initials: 'SW' }, { name: 'Michael Okoro', subject: 'Project timeline', preview: 'Thanks for the update. When can we schedule...', time: '2h', initials: 'MO' }, { name: 'Grace Johnson', subject: 'Warranty question', preview: 'Does the installation include aftercare support?', time: 'Yesterday', initials: 'GJ' }]; const message = messages[selected]; return <><PageHeader title="Messages" description="Communicate with customers and manage enquiries." /><section className="message-inbox panel"><div className="message-list"><div className="message-list-head"><strong>Inbox</strong><span>12</span><button className="icon-button"><Plus size={16} /></button></div><div className="search-field"><Search size={14} /><input placeholder="Search messages..." /></div>{messages.map((item, index) => <button key={item.name} className={`message-item ${selected === index ? 'active' : ''}`} onClick={() => setSelected(index)}><span className="avatar avatar--small">{item.initials}</span><div><strong>{item.name}</strong><small>{item.subject}</small><p>{item.preview}</p></div><time>{item.time}</time>{index === 0 && <i className="unread-dot" />}</button>)}</div><div className="message-detail"><div className="message-detail-head"><div className="customer"><span className="avatar avatar--small">{message.initials}</span><div><strong>{message.name}</strong><small>john@example.com · {message.time} ago</small></div></div><div><button className="icon-button" onClick={() => notify('Message archived.')}><Archive size={16} /></button><button className="icon-button"><MoreHorizontal size={16} /></button></div></div><div className="message-body"><div className="eyebrow">{message.subject.toUpperCase()}</div><h2>Hello ASOSTECH team,</h2><p>Hi, I&apos;m interested in getting a quote for CCTV installation at my new office. Can you share your pricing and available dates? I&apos;d also like to know if remote monitoring is included.</p><p>Looking forward to hearing from you.</p><p>Regards,<br />{message.name}</p></div><div className="reply-box"><textarea placeholder="Type a reply..." /><div><button className="button button--secondary" onClick={() => notify('Message marked as read.')}>Mark Read</button><button className="button button--primary" onClick={() => notify('Reply sent successfully.')}><Send size={14} /> Reply</button></div></div></div></section></>; }

function LegacyContentPage({ notify }: { notify: (message: string) => void }) { const sections = [{ name: 'Homepage', description: 'Hero, benefits, featured projects and CTA', icon: Globe2 }, { name: 'About', description: 'Company story, mission, vision and values', icon: Users }, { name: 'Contact', description: 'Phone, email, address and business hours', icon: Headphones }, { name: 'CTA', description: 'Global call-to-action section', icon: ArrowUpRight }, { name: 'Statistics', description: 'Dynamic metrics displayed across the site', icon: TrendingUp }, { name: 'Process', description: 'How ASOSTECH works, step by step', icon: ClipboardList }]; return <><PageHeader title="Website Content" description="Keep the public ASOSTECH website accurate and up to date." /><div className="content-sections">{sections.map((section, index) => <button className="content-section" key={section.name} onClick={() => notify(`${section.name} content editor opened.`)}><div className={`content-icon content-icon--${index % 4}`}><section.icon size={19} /></div><div><strong>{section.name}</strong><span>{section.description}</span></div><span className="content-status">{index === 1 ? 'Draft' : 'Published'}</span><ChevronRight size={16} /></button>)}</div></>; }

function MediaPage({ notify }: { notify: (message: string) => void }) { const files = ['office-security.jpg', 'solar-panel.png', 'cctv-installation.webp', 'aso-logo.svg', 'hero-building.jpg', 'inverter-room.png']; return <><PageHeader title="Media Library" description="Store and organise images used across your website." action={() => notify('Upload dialog opened.')} actionLabel="Upload Media" icon={Upload} /><div className="media-toolbar"><div className="search-field"><Search size={15} /><input placeholder="Search media..." /></div><button className="button button--secondary"><Filter size={15} /> All types</button><button className="button button--secondary"><Grid2X2 size={15} /> Grid</button></div><div className="media-grid"><button className="upload-tile" onClick={() => notify('Upload dialog opened.')}><Upload size={22} /><strong>Upload files</strong><span>JPG, PNG, WEBP, SVG</span></button>{files.map((file, index) => <article className="media-card" key={file}><div className={`media-preview media-preview--${index % 4}`}>{index < 3 ? <img src={projectImages[index]} alt="" /> : <ImageIcon size={28} />}</div><div className="media-meta"><strong>{file}</strong><span>{index % 2 ? 'PNG · 1.4 MB' : 'JPG · 2.8 MB'}</span></div><button className="media-more" onClick={() => notify('Media actions opened.')}><MoreHorizontal size={16} /></button></article>)}</div></>; }

function LegacySettingsPage({ notify }: { notify: (message: string) => void }) { const [section, setSection] = useState('General'); const sections = [{ name: 'General', icon: Settings2 }, { name: 'Branding', icon: Sparkles }, { name: 'Notifications', icon: Bell }, { name: 'Profile', icon: User }, { name: 'Security', icon: ShieldCheck }]; return <><PageHeader title="Settings" description="Manage your ASOSTECH admin workspace." /><div className="settings-layout"><nav className="settings-nav">{sections.map((item) => <button className={section === item.name ? 'active' : ''} key={item.name} onClick={() => setSection(item.name)}><item.icon size={16} />{item.name}<ChevronRight size={14} /></button>)}</nav><section className="panel settings-panel"><div className="panel-heading"><div><div className="section-kicker">WORKSPACE</div><h2>{section} settings</h2></div></div>{section === 'Notifications' ? <div className="toggle-list">{['New lead', 'New quote', 'New message', 'Project updates', 'Service publishing'].map((item, index) => <label key={item}><span><strong>{item}</strong><small>Receive an alert when there is a new {item.toLowerCase()}.</small></span><input type="checkbox" defaultChecked={index !== 3} /><i /></label>)}</div> : section === 'Security' ? <div className="security-list"><div className="security-row"><LockKeyhole size={19} /><div><strong>Current session</strong><span>Chrome on macOS · Lagos, Nigeria</span></div><b>Active now</b></div><div className="security-row"><Clock3 size={19} /><div><strong>Last login</strong><span>Today at 09:42 · 197.210.54.18</span></div></div><button className="button button--danger" onClick={() => notify('All other sessions signed out.')}>Sign out all devices</button></div> : <div className="settings-form"><div className="form-grid"><label className="form-field"><span>Company name</span><input defaultValue="ASOSTECH" /></label><label className="form-field"><span>Contact email</span><input defaultValue="info@asostech.com" /></label><label className="form-field"><span>Phone</span><input defaultValue="+234 800 000 0000" /></label><label className="form-field"><span>Website</span><input defaultValue="asostech.com" /></label><label className="form-field form-field--wide"><span>Address</span><input defaultValue="Plot 12, Victoria Island, Lagos" /></label><label className="form-field form-field--wide"><span>Business hours</span><textarea defaultValue={'Mon - Fri  8:00 AM - 6:00 PM\nSat  9:00 AM - 2:00 PM'} /></label></div><button className="button button--primary" onClick={() => notify('Settings saved successfully.')}>Save changes <Check size={14} /></button></div>}</section></div></>; }

function LoginScreen({ onLogin }: { onLogin: () => void }) { const [showPassword, setShowPassword] = useState(false); const [loading, setLoading] = useState(false); const submit = (event: FormEvent) => { event.preventDefault(); setLoading(true); window.setTimeout(onLogin, 650); }; return <div className="login-screen"><div className="login-visual"><div className="login-brand"><img className="admin-logo login-logo" src={ASOSTECH_LOGO} alt="ASOSTECH" /><div className="brand-copy"><strong>ADMIN CONSOLE</strong><span>ASOSTECH</span></div></div><div className="login-statement"><div className="eyebrow">OPERATIONS CONSOLE</div><h1>SMARTER SYSTEMS.<br /><span>SAFER SPACES.</span></h1><p>Manage projects, enquiries, services and website operations from one place.</p></div><div className="login-visual-image"><img src={projectImages[0]} alt="Modern building with solar panels" /></div><div className="login-visual-footer"><span>Electrical · Security · Solar</span><span>© 2026 ASOSTECH</span></div></div><div className="login-panel"><div className="login-panel-inner"><div className="mobile-login-brand"><img className="admin-logo login-logo" src={ASOSTECH_LOGO} alt="ASOSTECH" /><div className="brand-copy"><strong>ADMIN CONSOLE</strong><span>ASOSTECH</span></div></div><div className="eyebrow">WELCOME BACK</div><h2>Sign in to console</h2><p className="login-copy">Enter your details to access the ASOSTECH admin console.</p><form onSubmit={submit}><label className="form-field"><span>Email address</span><input type="email" placeholder="admin@asostech.com" defaultValue="admin@asostech.com" required /></label><label className="form-field"><span>Password</span><div className="password-input"><input type={showPassword ? 'text' : 'password'} placeholder="Enter your password" defaultValue="password" required /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label="Toggle password visibility">{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></label><div className="login-options"><label><input type="checkbox" defaultChecked /> Remember me</label><button type="button">Forgot password?</button></div><button className="button button--primary login-submit" disabled={loading}>{loading ? 'Signing in...' : 'Sign in'} {!loading && <ArrowUpRight size={15} />}</button></form><div className="login-help"><span>Need help?</span> Contact your workspace administrator</div></div></div></div>; }

function CommandPalette({ onClose, onNavigate }: { onClose: () => void; onNavigate: (page: Page) => void }) { const commands: { label: string; page: Page; icon: LucideIcon }[] = [{ label: 'Dashboard', page: 'dashboard', icon: LayoutDashboard }, { label: 'Leads & Quotes', page: 'leads', icon: Inbox }, { label: 'Projects', page: 'projects', icon: FolderKanban }, { label: 'Services', page: 'services', icon: Layers3 }, { label: 'FAQs', page: 'faqs', icon: CircleHelp }, { label: 'Messages', page: 'messages', icon: MessageSquare }]; return <div className="overlay overlay--palette" onClick={onClose}><div className="command-palette" onClick={(event) => event.stopPropagation()}><div className="command-search"><Search size={17} /><input autoFocus placeholder="Search pages, leads, projects..." /><kbd>ESC</kbd></div><div className="command-section"><span>QUICK NAVIGATION</span>{commands.map((item) => <button key={item.label} onClick={() => onNavigate(item.page)}><item.icon size={16} />{item.label}<ArrowUpRight size={13} /></button>)}</div><div className="command-footer"><span><kbd>↑</kbd><kbd>↓</kbd> Navigate</span><span><kbd>↵</kbd> Select</span><span><kbd>ESC</kbd> Close</span></div></div></div>; }
function NotificationPanel({ onClose }: { onClose: () => void }) { return <div className="floating-panel notification-panel"><div className="floating-header"><strong>Notifications</strong><button onClick={onClose}><X size={15} /></button></div>{activity.slice(0, 3).map((item) => <div className="notification-item" key={item.title}><div className={`activity-icon activity-icon--${item.color}`}><item.icon size={13} /></div><div><strong>{item.title}</strong><span>{item.body}</span></div><small>{item.time.split(' ')[0]}{item.time.includes('hour') ? 'h' : 'm'}</small></div>)}<button className="text-button notification-view">View all notifications <ArrowUpRight size={13} /></button></div>; }
function ProfileMenu({ onLogout, onClose }: { onLogout: () => void; onClose: () => void }) { return <div className="floating-panel profile-menu"><div className="profile-menu-head"><div className="avatar">AU</div><div><strong>Admin User</strong><span>admin@asostech.com</span></div></div>{['My Profile', 'Settings', 'View Website'].map((item) => <button key={item} onClick={onClose}><User size={15} />{item}</button>)}<button className="danger-link" onClick={onLogout}><LogOut size={15} /> Sign out</button></div>; }

function LiveProfileMenu({ user, onLogout, onProfile, onSettings }: { user: SupabaseUser; onLogout: () => void; onProfile: () => void; onSettings: () => void }) {
  const name = String(user.user_metadata?.full_name || user.email || 'Admin');
  const initials = name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  return <div className="floating-panel profile-menu"><div className="profile-menu-head"><div className="avatar">{initials}</div><div><strong>{name}</strong><span>{user.email}</span></div></div><button onClick={onProfile}><User size={15}/>My Profile</button><button onClick={onSettings}><Settings2 size={15}/>Settings</button><button onClick={() => window.location.assign('/')}><Globe2 size={15}/>View Website</button><button className="danger-link" onClick={onLogout}><LogOut size={15}/>Sign out</button></div>;
}
function ConfirmDialog({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) { return <div className="overlay"><div className="modal confirm-modal"><div className="confirm-icon"><Trash2 size={20} /></div><h2>Delete project?</h2><p>This action cannot be undone. The project and all its content will be permanently removed.</p><div className="modal-actions"><button className="button button--secondary" onClick={onCancel}>Cancel</button><button className="button button--danger" onClick={onConfirm}>Delete project</button></div></div></div>; }
function EmptyState({ title, description, action, actionLabel }: { title: string; description: string; action?: () => void; actionLabel?: string }) { return <div className="empty-state"><FolderKanban size={24} /><strong>{title}</strong><span>{description}</span>{action && <button className="button button--primary" onClick={action}>{actionLabel || 'Create new'}</button>}</div>; }

type LeadRecord = { id: string; name: string; email: string; phone: string | null; service_required: string; project_type: string | null; project_details: string; status: Status; priority: 'Low' | 'Medium' | 'High'; created_at: string };
const leadStatuses: Status[] = ['New', 'Reviewing', 'Contacted', 'Quoted', 'Completed', 'Archived'];

function LiveDashboard({ onNavigate, notify }: { onNavigate: (page: Page) => void; notify: (message: string, tone?: Toast['tone']) => void }) {
  const [leadCount, setLeadCount] = useState(0);
  const [newCount, setNewCount] = useState(0);
  const [projectCount, setProjectCount] = useState(0);
  const [serviceCount, setServiceCount] = useState(0);
  const [recent, setRecent] = useState<LeadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    let active = true;
    Promise.all([
      supabase.from('leads').select('id,status', { count: 'exact' }),
      supabase.from('projects').select('id', { count: 'exact', head: true }).eq('status', 'Published'),
      supabase.from('services').select('id', { count: 'exact', head: true }).eq('status', 'Published'),
      supabase.from('leads').select('id,name,email,phone,service_required,project_type,project_details,status,priority,created_at').order('created_at', { ascending: false }).limit(5),
    ]).then(([leads, projects, servicesResult, recentLeads]) => {
      if (!active) return;
      if (leads.error || projects.error || servicesResult.error || recentLeads.error) { notify('Could not load live dashboard data. Check your Supabase setup and admin role.', 'danger'); return; }
      setLeadCount(leads.count ?? 0);
      setNewCount(leads.data?.filter(item => item.status === 'New').length ?? 0);
      setProjectCount(projects.count ?? 0);
      setServiceCount(servicesResult.count ?? 0);
      setRecent((recentLeads.data ?? []) as LeadRecord[]);
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  return <>
    <PageHeader eyebrow={new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()} title="Dashboard" description="A live view of ASOSTECH enquiries and published content." />
    <div className="stats-grid">
      <StatCard title="New Leads" value={loading ? '—' : String(newCount)} change="From website forms" detail="" icon={Users} tone="green" onClick={() => onNavigate('leads')} />
      <StatCard title="All Enquiries" value={loading ? '—' : String(leadCount)} change="Stored privately" detail="" icon={Inbox} tone="blue" onClick={() => onNavigate('leads')} />
      <StatCard title="Published Projects" value={loading ? '—' : String(projectCount)} change="Visible on website" detail="" icon={BriefcaseBusiness} tone="orange" onClick={() => onNavigate('projects')} />
      <StatCard title="Published Services" value={loading ? '—' : String(serviceCount)} change="Visible on website" detail="" icon={Layers3} tone="purple" onClick={() => onNavigate('services')} />
    </div>
    <section className="panel table-panel"><div className="panel-heading"><div><div className="section-kicker">LATEST ACTIVITY</div><h2>Recent enquiries</h2></div><button className="button button--secondary" onClick={() => onNavigate('leads')}>View all <ArrowUpRight size={14} /></button></div>
      {recent.length ? <div className="table-scroll"><table><thead><tr><th>Customer</th><th>Service</th><th>Project details</th><th>Status</th><th>Received</th></tr></thead><tbody>{recent.map(lead=><tr key={lead.id}><td><div className="customer"><span className="avatar avatar--small">{lead.name.split(/\s+/).map(part=>part[0]).join('').slice(0,2).toUpperCase()}</span><strong>{lead.name}</strong></div></td><td>{lead.service_required}</td><td>{lead.project_details.slice(0,72)}{lead.project_details.length>72?'…':''}</td><td><StatusBadge status={lead.status}/></td><td className="muted-cell">{new Date(lead.created_at).toLocaleDateString()}</td></tr>)}</tbody></table></div> : <EmptyState title={loading?'Loading enquiries…':'No enquiries yet'} description={loading?'':'Website and quote form submissions will appear here.'} action={!loading?()=>onNavigate('leads'):undefined} actionLabel="Open enquiries" />}
    </section>
  </>;
}

function LiveLeadsPage({ notify }: { notify: (message: string, tone?: Toast['tone']) => void }) {
  const [rows, setRows] = useState<LeadRecord[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Status | 'All'>('All');
  const [loading, setLoading] = useState(true);
  const load = async () => {
    if (!supabase) { setLoading(false); return; }
    const { data, error } = await supabase.from('leads').select('id,name,email,phone,service_required,project_type,project_details,status,priority,created_at').order('created_at', { ascending: false });
    if (error) notify('Could not load enquiries. Check your Supabase setup and admin role.', 'danger');
    else setRows((data ?? []) as LeadRecord[]);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);
  const updateStatus = async (id: string, status: Status) => {
    if (!supabase) return;
    const { error } = await supabase.from('leads').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) notify(error.message, 'danger');
    else { setRows(current => current.map(lead => lead.id === id ? { ...lead, status } : lead)); notify('Enquiry status updated.'); }
  };
  const filtered = rows.filter(lead => (filter === 'All' || lead.status === filter) && `${lead.name} ${lead.email} ${lead.service_required} ${lead.project_details}`.toLowerCase().includes(query.toLowerCase()));
  return <><PageHeader title="Leads & Quote Requests" description="Private website enquiries, stored in your Supabase project." />
    <div className="summary-strip">{(['All', ...leadStatuses] as const).map(status=><button key={status} className={filter===status?'active':''} onClick={()=>setFilter(status)}><span>{status}</span><b>{status==='All'?rows.length:rows.filter(lead=>lead.status===status).length}</b></button>)}</div>
    <section className="panel table-panel"><div className="toolbar"><div className="search-field"><Search size={15}/><input placeholder="Search enquiries…" value={query} onChange={event=>setQuery(event.target.value)}/></div><button className="button button--secondary" onClick={()=>{setLoading(true);void load()}}><Activity size={15}/> Refresh</button></div>
      {loading?<EmptyState title="Loading enquiries…" description="Fetching private requests from Supabase."/>:filtered.length===0?<EmptyState title="No enquiries found" description={rows.length?'Try changing your search or status filter.':'New website requests will appear here.'}/>:<div className="table-scroll"><table className="leads-table"><thead><tr><th>Customer</th><th>Service</th><th>Project details</th><th>Contact</th><th>Status</th><th>Received</th></tr></thead><tbody>{filtered.map(lead=><tr key={lead.id}><td><div className="customer"><span className="avatar avatar--small">{lead.name.split(/\s+/).map(part=>part[0]).join('').slice(0,2).toUpperCase()}</span><div><strong>{lead.name}</strong><small className="lead-email">{lead.email}</small></div></div></td><td>{lead.service_required}</td><td><strong>{lead.project_type||'Project enquiry'}</strong><div className="muted-cell lead-detail-copy">{lead.project_details}</div></td><td>{lead.phone?<a href={`tel:${lead.phone}`}>{lead.phone}</a>:'—'}</td><td><select className="lead-status-select" value={lead.status} onChange={event=>void updateStatus(lead.id,event.target.value as Status)} aria-label={`Status for ${lead.name}`}>{leadStatuses.map(status=><option key={status}>{status}</option>)}</select></td><td className="muted-cell">{new Date(lead.created_at).toLocaleString()}</td></tr>)}</tbody></table></div>}</section>
  </>;
}

type AdminService = { id: string; slug: string; number: string; short: string; title: string; description: string; subtitle: string; icon: string; image: string; items: string[]; benefits: string[]; process: string[]; status: 'Published'|'Draft'; sort_order: number };
type AdminProject = { id: string; slug: string; title: string; category: string; location: string; image: string; description: string; status: 'Published'|'Draft'; sort_order: number };
type AdminFaq = { id: string; category: string; question: string; answer: string; status: 'Published'|'Draft'; sort_order: number };
const splitLines = (value: FormDataEntryValue | null) => String(value ?? '').split('\n').map(item=>item.trim()).filter(Boolean);
const makeSlug = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');

function LiveServicesPage({ notify }: { notify: (message: string, tone?: Toast['tone']) => void }) {
  const [rows,setRows]=useState<AdminService[]>([]);const [editing,setEditing]=useState<AdminService|null>(null);const [loading,setLoading]=useState(true);
  const load=async()=>{if(!supabase){setLoading(false);return}const {data,error}=await supabase.from('services').select('*').order('sort_order');if(error)notify('Could not load services. Check your Supabase setup and admin role.','danger');else setRows((data??[]) as AdminService[]);setLoading(false)};
  useEffect(()=>{void load()},[]);
  const save=async(event:FormEvent<HTMLFormElement>)=>{event.preventDefault();if(!supabase)return;const form=new FormData(event.currentTarget);const title=String(form.get('title')||'');const record={slug:makeSlug(String(form.get('slug')||title)),number:String(form.get('number')||''),short:String(form.get('short')||''),title,description:String(form.get('description')||''),subtitle:String(form.get('subtitle')||''),icon:String(form.get('icon')||'Zap'),image:String(form.get('image')||''),items:splitLines(form.get('items')),benefits:splitLines(form.get('benefits')),process:splitLines(form.get('process')),status:String(form.get('status')||'Draft'),sort_order:Number(form.get('sort_order')||0),updated_at:new Date().toISOString()};const result=editing?await supabase.from('services').update(record).eq('id',editing.id):await supabase.from('services').insert(record);if(result.error){notify(result.error.message,'danger');return}setEditing(null);notify('Service saved.');void load()};
  const changeStatus=async(row:AdminService)=>{const status=row.status==='Published'?'Draft':'Published';const {error}=await supabase!.from('services').update({status,updated_at:new Date().toISOString()}).eq('id',row.id);if(error)notify(error.message,'danger');else{notify(`Service ${status.toLowerCase()}.`);void load()}};
  return <><PageHeader title="Services" description="Manage the service details displayed on the public website." action={()=>setEditing({id:'',slug:'',number:String(rows.length+1).padStart(2,'0'),short:'',title:'',description:'',subtitle:'',icon:'Zap',image:'',items:[],benefits:[],process:[],status:'Draft',sort_order:rows.length+1})} actionLabel="Add service"/>{loading?<div className="panel"><EmptyState title="Loading services…" description="Fetching content from Supabase."/></div>:<section className="panel table-panel"><div className="table-scroll"><table><thead><tr><th>Service</th><th>Short label</th><th>Status</th><th>Order</th><th/></tr></thead><tbody>{rows.map(row=><tr key={row.id}><td><strong>{row.title}</strong><div className="muted-cell">{row.description.slice(0,85)}{row.description.length>85?'…':''}</div></td><td>{row.short}</td><td><StatusBadge status={row.status}/></td><td>{row.sort_order}</td><td><button className="row-action" onClick={()=>setEditing(row)} aria-label={`Edit ${row.title}`}><Edit3 size={15}/></button><button className="row-action" onClick={()=>void changeStatus(row)} aria-label={`Toggle ${row.title} publication`}>{row.status==='Published'?<EyeOff size={15}/>:<Eye size={15}/>}</button></td></tr>)}</tbody></table></div>{!rows.length&&<EmptyState title="No services yet" description="Add a service to display it on the public website."/>}</section>}
    {editing&&<div className="overlay"><form className="modal live-editor" onSubmit={save}><div className="panel-heading"><h2>{editing.id?'Edit service':'Add service'}</h2><button type="button" className="row-action" onClick={()=>setEditing(null)}><X size={17}/></button></div><div className="form-grid"><label className="form-field"><span>Title</span><input name="title" defaultValue={editing.title} required/></label><label className="form-field"><span>Slug</span><input name="slug" defaultValue={editing.slug} placeholder="generated-from-title"/></label><label className="form-field"><span>Number</span><input name="number" defaultValue={editing.number}/></label><label className="form-field"><span>Short label</span><input name="short" defaultValue={editing.short} required/></label><label className="form-field form-field--wide"><span>Description</span><textarea name="description" defaultValue={editing.description} required/></label><label className="form-field form-field--wide"><span>Subtitle</span><input name="subtitle" defaultValue={editing.subtitle}/></label><label className="form-field"><span>Icon name</span><input name="icon" defaultValue={editing.icon}/></label><label className="form-field"><span>Image URL</span><input name="image" defaultValue={editing.image}/></label><label className="form-field"><span>Status</span><select name="status" defaultValue={editing.status}><option>Draft</option><option>Published</option></select></label><label className="form-field"><span>Sort order</span><input name="sort_order" type="number" defaultValue={editing.sort_order}/></label><label className="form-field"><span>Items (one per line)</span><textarea name="items" defaultValue={editing.items.join('\n')}/></label><label className="form-field"><span>Benefits (one per line)</span><textarea name="benefits" defaultValue={editing.benefits.join('\n')}/></label><label className="form-field form-field--wide"><span>Process steps (one per line)</span><textarea name="process" defaultValue={editing.process.join('\n')}/></label></div><div className="modal-actions"><button type="button" className="button button--secondary" onClick={()=>setEditing(null)}>Cancel</button><button className="button button--primary">Save service</button></div></form></div>}
  </>;
}

function LiveProjectsPage({ notify }: { notify: (message: string, tone?: Toast['tone']) => void }) {
  const [rows,setRows]=useState<AdminProject[]>([]);const [editing,setEditing]=useState<AdminProject|null>(null);const [loading,setLoading]=useState(true);
  const load=async()=>{if(!supabase){setLoading(false);return}const {data,error}=await supabase.from('projects').select('*').order('sort_order');if(error)notify('Could not load projects. Check your Supabase setup and admin role.','danger');else setRows((data??[]) as AdminProject[]);setLoading(false)};useEffect(()=>{void load()},[]);
  const save=async(event:FormEvent<HTMLFormElement>)=>{event.preventDefault();if(!supabase)return;const form=new FormData(event.currentTarget);const title=String(form.get('title')||'');let image=String(form.get('image')||'');const file=form.get('image_file');if(file instanceof File&&file.size>0){if(file.size>10*1024*1024){notify('Choose an image smaller than 10 MB.','danger');return}const path='projects/'+Date.now()+'-'+file.name.replace(/[^a-zA-Z0-9._-]/g,'-');const {data:uploadData,error:uploadError}=await supabase.storage.from('project-media').upload(path,file);if(uploadError){notify('Image upload failed: '+uploadError.message,'danger');return}image=supabase.storage.from('project-media').getPublicUrl(uploadData.path).data.publicUrl}const record={slug:makeSlug(String(form.get('slug')||title)),title,category:String(form.get('category')||''),location:String(form.get('location')||''),image,description:String(form.get('description')||''),status:String(form.get('status')||'Draft'),sort_order:Number(form.get('sort_order')||0),updated_at:new Date().toISOString()};const result=editing?await supabase.from('projects').update(record).eq('id',editing.id):await supabase.from('projects').insert(record);if(result.error){notify(result.error.message,'danger');return}setEditing(null);notify('Project saved.');void load()};
  const changeStatus=async(row:AdminProject)=>{const status=row.status==='Published'?'Draft':'Published';const {error}=await supabase!.from('projects').update({status,updated_at:new Date().toISOString()}).eq('id',row.id);if(error)notify(error.message,'danger');else{notify(`Project ${status.toLowerCase()}.`);void load()}};
  return <><PageHeader title="Projects" description="Manage featured work shown in the public portfolio." action={()=>setEditing({id:'',slug:'',title:'',category:'Electrical',location:'',image:'',description:'',status:'Draft',sort_order:rows.length+1})} actionLabel="Add project"/>{loading?<div className="panel"><EmptyState title="Loading projects…" description="Fetching content from Supabase."/></div>:<section className="panel table-panel"><div className="table-scroll"><table><thead><tr><th>Project</th><th>Category</th><th>Location</th><th>Status</th><th/></tr></thead><tbody>{rows.map(row=><tr key={row.id}><td><strong>{row.title}</strong><div className="muted-cell">{row.description.slice(0,75)}{row.description.length>75?'…':''}</div></td><td>{row.category}</td><td>{row.location}</td><td><StatusBadge status={row.status}/></td><td><button className="row-action" onClick={()=>setEditing(row)} aria-label={`Edit ${row.title}`}><Edit3 size={15}/></button><button className="row-action" onClick={()=>void changeStatus(row)} aria-label={`Toggle ${row.title} publication`}>{row.status==='Published'?<EyeOff size={15}/>:<Eye size={15}/>}</button></td></tr>)}</tbody></table></div>{!rows.length&&<EmptyState title="No projects yet" description="Add a project to display it on the public website."/>}</section>}
    {editing&&<div className="overlay"><form className="modal live-editor" onSubmit={save}><div className="panel-heading"><h2>{editing.id?'Edit project':'Add project'}</h2><button type="button" className="row-action" onClick={()=>setEditing(null)}><X size={17}/></button></div><div className="form-grid"><label className="form-field"><span>Title</span><input name="title" defaultValue={editing.title} required/></label><label className="form-field"><span>Slug</span><input name="slug" defaultValue={editing.slug}/></label><label className="form-field"><span>Category</span><input name="category" defaultValue={editing.category} required/></label><label className="form-field"><span>Location</span><input name="location" defaultValue={editing.location}/></label><label className="form-field form-field--wide"><span>Description</span><textarea name="description" defaultValue={editing.description} required/></label><div className="form-field form-field--wide"><span>Project image</span>{editing.image&&<img className="cms-image-preview" src={editing.image} alt="Current project"/>}<input type="hidden" name="image" value={editing.image}/><label className="button button--secondary cms-file-button"><Upload size={15}/>Choose image<input name="image_file" type="file" accept="image/png,image/jpeg,image/webp,image/gif"/></label><small>PNG, JPG, WEBP or GIF, up to 10 MB. Images upload securely to Supabase.</small></div><label className="form-field"><span>Status</span><select name="status" defaultValue={editing.status}><option>Draft</option><option>Published</option></select></label><label className="form-field"><span>Sort order</span><input name="sort_order" type="number" defaultValue={editing.sort_order}/></label></div><div className="modal-actions"><button type="button" className="button button--secondary" onClick={()=>setEditing(null)}>Cancel</button><button className="button button--primary">Save project</button></div></form></div>}
  </>;
}

function LiveFaqsPage({ notify }: { notify: (message: string, tone?: Toast['tone']) => void }) {
  const [rows,setRows]=useState<AdminFaq[]>([]);const [editing,setEditing]=useState<AdminFaq|null>(null);const [loading,setLoading]=useState(true);
  const load=async()=>{if(!supabase){setLoading(false);return}const {data,error}=await supabase.from('faqs').select('*').order('sort_order');if(error)notify('Could not load FAQs. Check your Supabase setup and admin role.','danger');else setRows((data??[]) as AdminFaq[]);setLoading(false)};useEffect(()=>{void load()},[]);
  const save=async(event:FormEvent<HTMLFormElement>)=>{event.preventDefault();if(!supabase)return;const form=new FormData(event.currentTarget);const record={category:String(form.get('category')||'General'),question:String(form.get('question')||''),answer:String(form.get('answer')||''),status:String(form.get('status')||'Draft'),sort_order:Number(form.get('sort_order')||0),updated_at:new Date().toISOString()};const result=editing?.id?await supabase.from('faqs').update(record).eq('id',editing.id):await supabase.from('faqs').insert(record);if(result.error){notify(result.error.message,'danger');return}setEditing(null);notify('FAQ saved.');void load()};
  const changeStatus=async(row:AdminFaq)=>{const status=row.status==='Published'?'Draft':'Published';const {error}=await supabase!.from('faqs').update({status,updated_at:new Date().toISOString()}).eq('id',row.id);if(error)notify(error.message,'danger');else{notify(`FAQ ${status.toLowerCase()}.`);void load()}};
  return <><PageHeader title="FAQs" description="Manage answers displayed on the public website." action={()=>setEditing({id:'',category:'General',question:'',answer:'',status:'Draft',sort_order:rows.length+1})} actionLabel="Add FAQ"/>{loading?<div className="panel"><EmptyState title="Loading FAQs…" description="Fetching content from Supabase."/></div>:<section className="panel table-panel"><div className="table-scroll"><table><thead><tr><th>Question</th><th>Category</th><th>Status</th><th/></tr></thead><tbody>{rows.map(row=><tr key={row.id}><td><strong>{row.question}</strong><div className="muted-cell">{row.answer.slice(0,95)}{row.answer.length>95?'…':''}</div></td><td>{row.category}</td><td><StatusBadge status={row.status}/></td><td><button className="row-action" onClick={()=>setEditing(row)} aria-label="Edit FAQ"><Edit3 size={15}/></button><button className="row-action" onClick={()=>void changeStatus(row)} aria-label="Toggle FAQ publication">{row.status==='Published'?<EyeOff size={15}/>:<Eye size={15}/>}</button></td></tr>)}</tbody></table></div>{!rows.length&&<EmptyState title="No FAQs yet" description="Add a frequently asked question to the public website."/>}</section>}
    {editing&&<div className="overlay"><form className="modal live-editor" onSubmit={save}><div className="panel-heading"><h2>{editing.id?'Edit FAQ':'Add FAQ'}</h2><button type="button" className="row-action" onClick={()=>setEditing(null)}><X size={17}/></button></div><div className="form-grid"><label className="form-field"><span>Category</span><input name="category" defaultValue={editing.category} required/></label><label className="form-field"><span>Status</span><select name="status" defaultValue={editing.status}><option>Draft</option><option>Published</option></select></label><label className="form-field form-field--wide"><span>Question</span><input name="question" defaultValue={editing.question} required/></label><label className="form-field form-field--wide"><span>Answer</span><textarea name="answer" defaultValue={editing.answer} required/></label><label className="form-field"><span>Sort order</span><input name="sort_order" type="number" defaultValue={editing.sort_order}/></label></div><div className="modal-actions"><button type="button" className="button button--secondary" onClick={()=>setEditing(null)}>Cancel</button><button className="button button--primary">Save FAQ</button></div></form></div>}
  </>;
}

function SupabaseLoginScreen({ onLogin, message }: { onLogin: (email: string, password: string) => Promise<void>; message: string }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setLoading(true); setError(''); setNotice('');
    try { await onLogin(email, password); } catch (err) { setError(err instanceof Error ? err.message : 'Sign in failed. Please try again.'); }
    finally { setLoading(false); }
  };
  const recover = async () => {
    setError(''); setNotice('');
    if (!email.trim()) { setError('Enter your email address first, then choose Forgot password.'); return; }
    if (!supabase) { setError('Supabase is not configured yet.'); return; }
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/admin/login` });
    if (resetError) setError(resetError.message); else setNotice('If an account exists for that email, a password reset link has been sent.');
  };
  return <div className="login-screen"><div className="login-visual"><div className="login-brand"><img className="admin-logo login-logo" src={ASOSTECH_LOGO} alt="ASOSTECH" /><div className="brand-copy"><strong>ADMIN CONSOLE</strong><span>ASOSTECH</span></div></div><div className="login-statement"><div className="eyebrow">OPERATIONS CONSOLE</div><h1>SMARTER SYSTEMS.<br /><span>SAFER SPACES.</span></h1><p>Manage projects, enquiries, services and website operations from one place.</p></div><div className="login-visual-image"><img src={projectImages[0]} alt="Modern building with solar panels" /></div><div className="login-visual-footer"><span>Electrical · Security · Solar</span><span>© 2026 ASOSTECH</span></div></div><div className="login-panel"><div className="login-panel-inner"><div className="mobile-login-brand"><img className="admin-logo login-logo" src={ASOSTECH_LOGO} alt="ASOSTECH" /><div className="brand-copy"><strong>ADMIN CONSOLE</strong><span>ASOSTECH</span></div></div><div className="eyebrow">WELCOME BACK</div><h2>Sign in to console</h2><p className="login-copy">Use your ASOSTECH administrator account.</p><form onSubmit={submit}><label className="form-field"><span>Email address</span><input type="email" autoComplete="username" value={email} onChange={event=>setEmail(event.target.value)} placeholder="admin@example.com" required /></label><label className="form-field"><span>Password</span><div className="password-input"><input type={showPassword?'text':'password'} autoComplete="current-password" value={password} onChange={event=>setPassword(event.target.value)} placeholder="Enter your password" required /><button type="button" onClick={()=>setShowPassword(value=>!value)} aria-label="Toggle password visibility">{showPassword?<EyeOff size={16}/>:<Eye size={16}/>}</button></div></label><div className="login-options"><span>Secure sign in</span><button type="button" onClick={recover}>Forgot password?</button></div>{(error||message)&&<p className="auth-error" role="alert">{error||message}</p>}{notice&&<p className="auth-notice" role="status">{notice}</p>}<button className="button button--primary login-submit" disabled={loading}>{loading?'Signing in…':'Sign in'} {!loading&&<ArrowUpRight size={15}/>}</button></form><div className="login-help"><span>Need help?</span> Contact your workspace administrator</div></div></div></div>;
}

export default App;



