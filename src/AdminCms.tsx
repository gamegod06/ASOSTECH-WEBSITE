import { useEffect, useState, type FormEvent } from 'react';
import type { User } from '@supabase/supabase-js';
import { Bell, Check, ChevronRight, Globe2, Headphones, Image as ImageIcon, LockKeyhole, Settings2, ShieldCheck, Sparkles, User as UserIcon, X } from 'lucide-react';
import { supabase } from './lib/supabase';
import { contentSections, defaultContent, type ContentFields } from './lib/siteContent';

type Notify = (message: string, tone?: 'success' | 'danger') => void;
type SettingsRecord = { id: boolean; company_name: string; contact_email: string; phone: string; website: string; address: string; business_hours: string; logo_url: string; notifications: Record<string, boolean> };
const defaultSettings: SettingsRecord = { id: true, company_name: 'ASOSTECH', contact_email: 'info@asostech.com', phone: '', website: '', address: '', business_hours: '', logo_url: '', notifications: { 'New lead': true, 'New quote': true, 'New message': true, 'Project updates': false, 'Service publishing': true } };

export function ContentPage({ notify }: { notify: Notify }) {
  const [content, setContent] = useState<Record<string, ContentFields>>(defaultContent);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    let active = true;
    if (!supabase) { setLoading(false); return; }
    void supabase.from('website_content').select('section,content').then(({ data, error }) => {
      if (!active) return;
      if (error) notify(`Could not load website content: ${error.message}`, 'danger');
      else if (data) setContent((current) => ({ ...current, ...Object.fromEntries(data.map((row) => [row.section, row.content as ContentFields])) }));
      setLoading(false);
    });
    return () => { active = false; };
  }, []);
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || !editing) return;
    setSaving(true);
    const form = new FormData(event.currentTarget);
    const fields = contentSections.find((item) => item.key === editing)?.fields ?? [];
    const values = Object.fromEntries(fields.map(({ key }) => [key, String(form.get(key) ?? '').trim()])) as ContentFields;
    if (editing === 'contact') {
      const { error: settingsError } = await supabase.from('site_settings').upsert({ id: true, contact_email: values.email, phone: values.phone, address: values.address, business_hours: values.business_hours }, { onConflict: 'id' });
      if (settingsError) { setSaving(false); notify(`Contact details were not saved: ${settingsError.message}`, 'danger'); return; }
    }
    const { error } = await supabase.from('website_content').upsert({ section: editing, content: values, updated_at: new Date().toISOString() }, { onConflict: 'section' });
    setSaving(false);
    if (error) { notify(`Content was not saved: ${error.message}`, 'danger'); return; }
    setContent((current) => ({ ...current, [editing]: values }));
    setEditing(null);
    notify('Website content saved. Refresh the public website to see the changes.');
  };
  return <>
    <PageHeader title="Website Content" description="Edit the words shown on the public ASOSTECH website." />
    {loading ? <div className="panel cms-loading">Loading saved website content…</div> : <div className="content-sections">
      {contentSections.map((section, index) => <button className="content-section" key={section.key} onClick={() => setEditing(section.key)}>
        <div className={`content-icon content-icon--${index % 4}`}>{index === 0 ? <Globe2 size={19}/> : index === 1 ? <UserIcon size={19}/> : index === 2 ? <Headphones size={19}/> : <Sparkles size={19}/>}</div>
        <div><strong>{section.name}</strong><span>{section.description}</span></div><span className="content-status">Editable</span><ChevronRight size={16}/>
      </button>)}
    </div>}
    {editing && <div className="overlay"><form className="modal live-editor" onSubmit={save}>
      <div className="panel-heading"><div><div className="section-kicker">PUBLIC WEBSITE</div><h2>Edit {contentSections.find((item) => item.key === editing)?.name}</h2></div><button type="button" className="row-action" onClick={() => setEditing(null)} aria-label="Close"><X size={17}/></button></div>
      <div className="form-grid">{(contentSections.find((item) => item.key === editing)?.fields ?? []).map((field) => <label className={`form-field ${field.multiline ? 'form-field--wide' : ''}`} key={field.key}><span>{field.label}</span>{field.multiline ? <textarea name={field.key} defaultValue={content[editing]?.[field.key] ?? defaultContent[editing]?.[field.key] ?? ''} rows={4}/> : <input name={field.key} defaultValue={content[editing]?.[field.key] ?? defaultContent[editing]?.[field.key] ?? ''}/>}</label>)}</div>
      <div className="modal-actions"><button type="button" className="button button--secondary" onClick={() => setEditing(null)}>Cancel</button><button className="button button--primary" disabled={saving}>{saving ? 'Saving…' : 'Save content'} <Check size={14}/></button></div>
    </form></div>}
  </>;
}

export function SettingsPage({ notify, user, initialSection = 'General' }: { notify: Notify; user: User; initialSection?: string }) {
  const [section, setSection] = useState(initialSection);
  const [settings, setSettings] = useState<SettingsRecord>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileName, setProfileName] = useState(String(user.user_metadata?.full_name ?? ''));
  const [profilePhone, setProfilePhone] = useState(String(user.user_metadata?.phone ?? ''));
  const navSections = [{ name: 'General', icon: Settings2 }, { name: 'Branding', icon: Sparkles }, { name: 'Notifications', icon: Bell }, { name: 'Profile', icon: UserIcon }, { name: 'Security', icon: ShieldCheck }];
  useEffect(() => { setSection(initialSection); }, [initialSection]);
  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    void supabase.from('site_settings').select('*').eq('id', true).maybeSingle().then(({ data, error }) => {
      if (error) notify(`Could not load settings: ${error.message}`, 'danger');
      else if (data) setSettings({ ...defaultSettings, ...data, notifications: { ...defaultSettings.notifications, ...(data.notifications ?? {}) } });
      setLoading(false);
    });
  }, []);
  const saveSettings = async () => {
    if (!supabase) return;
    setSaving(true);
    const { id: _id, ...values } = settings;
    const { error } = await supabase.from('site_settings').upsert({ id: true, ...values, updated_at: new Date().toISOString() }, { onConflict: 'id' });
    setSaving(false);
    if (error) notify(`Settings were not saved: ${error.message}`, 'danger');
    else notify('Settings saved.');
  };
  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ data: { ...user.user_metadata, full_name: profileName.trim(), phone: profilePhone.trim() } });
    setSaving(false);
    if (error) notify(`Profile was not saved: ${error.message}`, 'danger'); else notify('Your profile was saved.');
  };
  const uploadLogo = async (file?: File) => {
    if (!file || !supabase) return;
    if (!file.type.startsWith('image/')) { notify('Choose an image file.', 'danger'); return; }
    if (file.size > 10 * 1024 * 1024) { notify('Choose an image smaller than 10 MB.', 'danger'); return; }
    const path = `branding/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`;
    const { data, error } = await supabase.storage.from('project-media').upload(path, file);
    if (error) { notify(`Logo upload failed: ${error.message}`, 'danger'); return; }
    const { data: url } = supabase.storage.from('project-media').getPublicUrl(data.path);
    setSettings((current) => ({ ...current, logo_url: url.publicUrl }));
    notify('Logo uploaded. Save changes to keep it.');
  };
  const savePasswordReset = async () => {
    if (!supabase || !user.email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, { redirectTo: `${window.location.origin}/admin/login` });
    if (error) notify(`Password reset could not be sent: ${error.message}`, 'danger'); else notify('Password reset instructions were sent to your email.');
  };
  const saveOtherSessions = async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut({ scope: 'others' });
    if (error) notify(`Could not sign out other sessions: ${error.message}`, 'danger'); else notify('Other sessions were signed out.');
  };
  const field = (label: string, name: keyof SettingsRecord, wide = false) => <label className={`form-field ${wide ? 'form-field--wide' : ''}`} key={name}><span>{label}</span>{name === 'address' || name === 'business_hours' ? <textarea value={String(settings[name])} onChange={(event) => setSettings((current) => ({ ...current, [name]: event.target.value }))} rows={3}/> : <input value={String(settings[name])} onChange={(event) => setSettings((current) => ({ ...current, [name]: event.target.value }))}/>}</label>;
  return <><PageHeader title="Settings" description="Manage the company website and your administrator profile."/><div className="settings-layout"><nav className="settings-nav">{navSections.map((item) => <button className={section === item.name ? 'active' : ''} key={item.name} onClick={() => setSection(item.name)}><item.icon size={16}/>{item.name}<ChevronRight size={14}/></button>)}</nav><section className="panel settings-panel"><div className="panel-heading"><div><div className="section-kicker">ASOSTECH WORKSPACE</div><h2>{section} settings</h2></div></div>
    {loading ? <div className="cms-loading">Loading saved settings…</div> : section === 'Profile' ? <form className="settings-form" onSubmit={saveProfile}><div className="profile-settings-card"><div className="avatar profile-settings-avatar">{(profileName || user.email || 'A').slice(0, 1).toUpperCase()}</div><div><strong>{profileName || 'Administrator profile'}</strong><span>{user.email}</span><small>Admin access</small></div></div><div className="form-grid"><label className="form-field"><span>Full name</span><input value={profileName} onChange={(event) => setProfileName(event.target.value)} required/></label><label className="form-field"><span>Email address</span><input value={user.email ?? ''} disabled/></label><label className="form-field"><span>Phone number</span><input value={profilePhone} onChange={(event) => setProfilePhone(event.target.value)}/></label></div><button className="button button--primary" disabled={saving}>{saving ? 'Saving…' : 'Save profile'} <Check size={14}/></button></form>
    : section === 'Notifications' ? <div className="settings-form"><div className="toggle-list">{Object.entries(settings.notifications).map(([name, checked]) => <label key={name}><span><strong>{name}</strong><small>Save your notification preference for {name.toLowerCase()} updates.</small></span><input type="checkbox" checked={checked} onChange={(event) => setSettings((current) => ({ ...current, notifications: { ...current.notifications, [name]: event.target.checked } }))}/><i/></label>)}</div><button className="button button--primary" onClick={() => void saveSettings()} disabled={saving}>{saving ? 'Saving…' : 'Save preferences'} <Check size={14}/></button></div>
    : section === 'Security' ? <div className="security-list"><div className="security-row"><LockKeyhole size={19}/><div><strong>Signed in as</strong><span>{user.email}</span></div><b>Admin</b></div><div className="security-row"><div><strong>Password</strong><span>Send a secure password reset link to your email.</span></div><button className="button button--secondary" onClick={() => void savePasswordReset()}>Reset password</button></div><button className="button button--danger" onClick={() => void saveOtherSessions()}>Sign out other sessions</button></div>
    : <div className="settings-form"><div className="form-grid">{section === 'General' ? <>{field('Company name','company_name')}{field('Contact email','contact_email')}{field('Phone','phone')}{field('Website','website')}{field('Address','address',true)}{field('Business hours','business_hours',true)}</> : <div className="form-field form-field--wide"><span>Company logo</span><div className="logo-upload-row">{settings.logo_url && <img src={settings.logo_url} alt="Company logo preview"/>}<label className="button button--secondary logo-file-button"><ImageIcon size={15}/>Choose logo<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => void uploadLogo(event.target.files?.[0])}/></label></div><small>PNG, JPG, WEBP or GIF, up to 10 MB.</small></div>}</div><button className="button button--primary" onClick={() => void saveSettings()} disabled={saving}>{saving ? 'Saving…' : 'Save changes'} <Check size={14}/></button></div>}
  </section></div></>;
}

function PageHeader({ title, description }: { title: string; description: string }) { return <div className="page-header"><div><div className="eyebrow">ASOSTECH ADMIN</div><h1>{title}</h1><p>{description}</p></div></div>; }
