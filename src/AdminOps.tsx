import { useEffect, useState, type ChangeEvent } from 'react';
import { ArrowUpRight, ChevronRight, Image as ImageIcon, Mail, Trash2, Upload, X } from 'lucide-react';
import { supabase } from './lib/supabase';

type Notify = (message: string, tone?: 'success' | 'danger') => void;
type Enquiry = { id: string; name: string; email: string; phone: string | null; service_required: string; project_type: string | null; project_details: string; status: string; created_at: string };
type StoredImage = { name: string; path: string; url: string; createdAt: string };

export function MessagesPage({ notify }: { notify: Notify }) {
  const [rows, setRows] = useState<Enquiry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const load = async () => {
    if (!supabase) { setLoading(false); return; }
    const { data, error } = await supabase.from('leads').select('id,name,email,phone,service_required,project_type,project_details,status,created_at').order('created_at', { ascending: false });
    if (error) notify(`Could not load enquiries: ${error.message}`, 'danger'); else { setRows((data ?? []) as Enquiry[]); setSelectedId((current) => current ?? data?.[0]?.id ?? null); }
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);
  const selected = rows.find((row) => row.id === selectedId) ?? rows[0];
  const updateStatus = async (status: string) => {
    if (!supabase || !selected) return;
    const { error } = await supabase.from('leads').update({ status, updated_at: new Date().toISOString() }).eq('id', selected.id);
    if (error) notify(`Status was not updated: ${error.message}`, 'danger'); else { notify('Enquiry status updated.'); await load(); }
  };
  return <><PageHeader title="Messages & Enquiries" description="Review messages submitted through the website and quote forms."/>
    {loading ? <div className="panel cms-loading">Loading customer enquiries…</div> : rows.length === 0 ? <section className="panel"><EmptyState title="No messages yet" description="Website contact and quote requests will appear here."/></section> : <div className="message-inbox">
      <section className="panel message-list"><div className="panel-heading"><h2>Inbox <span className="message-count">{rows.length}</span></h2></div>{rows.map((row) => <button key={row.id} className={`message-item ${selected?.id === row.id ? 'active' : ''}`} onClick={() => setSelectedId(row.id)}><span className="avatar avatar--small">{row.name.split(/\s+/).map((part) => part[0]).join('').slice(0,2).toUpperCase()}</span><span className="message-item-copy"><strong>{row.name}</strong><small>{row.service_required}</small><span>{row.project_details}</span></span><small>{new Date(row.created_at).toLocaleDateString()}</small></button>)}</section>
      {selected && <section className="panel message-detail"><div className="panel-heading"><div><div className="section-kicker">WEBSITE ENQUIRY</div><h2>{selected.name}</h2></div><select className="lead-status-select" value={selected.status} onChange={(event) => void updateStatus(event.target.value)}>{['New','Reviewing','Contacted','Quoted','Completed','Archived'].map((status) => <option key={status}>{status}</option>)}</select></div><div className="message-contact"><a href={`mailto:${selected.email}`}><Mail size={14}/>{selected.email}</a>{selected.phone && <span>{selected.phone}</span>}</div><h3>{selected.service_required}{selected.project_type ? ` · ${selected.project_type}` : ''}</h3><p className="message-body">{selected.project_details}</p><small>Received {new Date(selected.created_at).toLocaleString()}</small><div className="modal-actions"><a className="button button--primary" href={`mailto:${encodeURIComponent(selected.email)}?subject=${encodeURIComponent(`ASOSTECH enquiry: ${selected.service_required}`)}`}>Reply by email <ArrowUpRight size={15}/></a></div></section>}
    </div>}
  </>;
}

export function MediaPage({ notify }: { notify: Notify }) {
  const [images, setImages] = useState<StoredImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const load = async () => {
    if (!supabase) { setLoading(false); return; }
    const bucket = supabase.storage.from('project-media');
    const [projects, branding, gallery] = await Promise.all([bucket.list('projects', { limit: 100, sortBy: { column: 'created_at', order: 'desc' } }), bucket.list('branding', { limit: 100, sortBy: { column: 'created_at', order: 'desc' } }), bucket.list('gallery', { limit: 100, sortBy: { column: 'created_at', order: 'desc' } })]);
    const error = projects.error || branding.error || gallery.error;
    if (error) notify(`Could not load media: ${error.message}`, 'danger');
    else {
      const all = [...(projects.data ?? []).map((file) => ({ file, folder: 'projects' })), ...(branding.data ?? []).map((file) => ({ file, folder: 'branding' })), ...(gallery.data ?? []).map((file) => ({ file, folder: 'gallery' }))].filter(({ file }) => file.metadata?.mimetype?.startsWith('image/'));
      setImages(all.map(({ file, folder }) => ({ name: file.name, path: `${folder}/${file.name}`, url: bucket.getPublicUrl(`${folder}/${file.name}`).data.publicUrl, createdAt: file.created_at ?? '' })));
    }
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);
  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (!supabase || files.length === 0) return;
    const invalid = files.find((file) => !file.type.startsWith('image/') || file.size > 10 * 1024 * 1024);
    if (invalid) { notify(`${invalid.name} is not an accepted image or is over 10 MB.`, 'danger'); return; }
    setBusy(true);
    for (const file of files) {
      const path = `gallery/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`;
      const { error } = await supabase.storage.from('project-media').upload(path, file);
      if (error) { notify(`Upload failed for ${file.name}: ${error.message}`, 'danger'); setBusy(false); return; }
    }
    setBusy(false); notify('Images uploaded.'); await load();
  };
  const remove = async (image: StoredImage) => {
    if (!supabase) return;
    const { error } = await supabase.storage.from('project-media').remove([image.path]);
    if (error) notify(`Image was not deleted: ${error.message}`, 'danger'); else { notify('Image deleted.'); await load(); }
  };
  return <><PageHeader title="Media Library" description="Upload and manage images stored in Supabase." action={() => document.getElementById('media-upload-input')?.click()} actionLabel={busy ? 'Uploading…' : 'Upload images'} icon={Upload}/>
    <input id="media-upload-input" className="visually-hidden-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple disabled={busy} onChange={(event) => void upload(event)}/>
    <div className="media-toolbar"><span>{images.length} image{images.length === 1 ? '' : 's'} in Supabase</span></div>
    {loading ? <div className="panel cms-loading">Loading media…</div> : <div className="media-grid">{images.map((image) => <article className="media-card" key={image.path}><a href={image.url} target="_blank" rel="noreferrer"><img src={image.url} alt={image.name}/></a><div><span title={image.name}>{image.name}</span><button className="row-action" onClick={() => void remove(image)} aria-label={`Delete ${image.name}`}><Trash2 size={15}/></button></div></article>)}{!images.length && <div className="panel media-empty"><ImageIcon size={22}/><strong>No uploaded images yet</strong><span>Upload images here, or add a project image from the Projects editor.</span></div>}</div>}
  </>;
}

export function NotificationPanel({ onClose, onNavigate }: { onClose: () => void; onNavigate: () => void }) {
  const [rows, setRows] = useState<Enquiry[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!supabase) return;
    void supabase.from('leads').select('id,name,email,phone,service_required,project_type,project_details,status,created_at').order('created_at', { ascending: false }).limit(5).then(({ data, error: queryError }) => {
      if (queryError) setError(queryError.message); else setRows((data ?? []) as Enquiry[]);
    });
  }, []);
  return <div className="floating-panel notification-panel"><div className="floating-header"><strong>Recent enquiries</strong><button onClick={onClose}><X size={15}/></button></div>{error ? <p className="notification-empty">Could not load enquiries.</p> : rows.length ? rows.map((row) => <button className="notification-item live-notification" key={row.id} onClick={onNavigate}><div className="activity-icon activity-icon--green"><Mail size={13}/></div><div><strong>{row.name}</strong><span>{row.service_required}</span></div><small>{new Date(row.created_at).toLocaleDateString()}</small></button>) : <p className="notification-empty">No enquiries have arrived yet.</p>}<button className="text-button notification-view" onClick={onNavigate}>Open enquiries <ArrowUpRight size={13}/></button></div>;
}

function PageHeader({ title, description, action, actionLabel, icon: Icon = ChevronRight }: { title: string; description: string; action?: () => void; actionLabel?: string; icon?: typeof ChevronRight }) { return <div className="page-header"><div><div className="eyebrow">ASOSTECH ADMIN</div><h1>{title}</h1><p>{description}</p></div>{action && <button className="button button--primary" onClick={action}><Icon size={15}/>{actionLabel}</button>}</div>; }
function EmptyState({ title, description }: { title: string; description: string }) { return <div className="empty-state"><ImageIcon size={24}/><strong>{title}</strong><span>{description}</span></div>; }
