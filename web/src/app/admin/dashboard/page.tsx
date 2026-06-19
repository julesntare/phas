'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface Platform {
  id: string; name: string; category: string; base_url: string;
  authority_id: string; authority_name: string;
  contact_email: string | null; contact_name: string | null; avatar_url: string | null;
  webhook_url: string | null;
}
interface AuthorityAccount {
  id: string; name: string; remit_description: string | null;
  contact_email: string | null; contact_name: string | null; avatar_url: string | null;
}
interface AuthorityMeta { id: string; name: string }

type AccountType = 'platform' | 'authority';
type ModalMode = 'create' | 'edit';
type Tab = 'platforms' | 'authorities';

function Avatar({ url, name }: { url: string | null; name: string | null }) {
  if (url) return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="avatar" className="w-9 h-9 rounded-xl object-cover border border-gray-200 shrink-0" />
  );
  return (
    <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-400 shrink-0">
      {(name ?? '?')[0]?.toUpperCase()}
    </div>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [authoritiesData, setAuthoritiesData] = useState<AuthorityAccount[]>([]);
  const [authoritiesMeta, setAuthoritiesMeta] = useState<AuthorityMeta[]>([]);
  const [tab, setTab] = useState<Tab>('platforms');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modal, setModal] = useState<{ mode: ModalMode; type: AccountType; item?: Platform | AuthorityAccount } | null>(null);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');

  // Platform form fields
  const [fName, setFName] = useState('');
  const [fBaseUrl, setFBaseUrl] = useState('');
  const [fCategory, setFCategory] = useState('');
  const [fAuthorityId, setFAuthorityId] = useState('');
  const [fContactEmail, setFContactEmail] = useState('');
  const [fContactName, setFContactName] = useState('');
  const [fWebhookUrl, setFWebhookUrl] = useState('');
  const [fAvatarUrl, setFAvatarUrl] = useState<string | null>(null);
  const [fPassword, setFPassword] = useState('');

  // Authority form fields
  const [aName, setAName] = useState('');
  const [aRemitDescription, setARemitDescription] = useState('');
  const [aContactEmail, setAContactEmail] = useState('');
  const [aContactName, setAContactName] = useState('');
  const [aAvatarUrl, setAAvatarUrl] = useState<string | null>(null);
  const [aPassword, setAPassword] = useState('');

  const [avatarUploading, setAvatarUploading] = useState(false);

  function getSecret() { return sessionStorage.getItem('admin_secret') ?? ''; }

  const load = useCallback(async () => {
    const secret = getSecret();
    if (!secret) { router.replace('/admin'); return; }
    setLoading(true); setError('');
    try {
      const [accountsRes, metaRes] = await Promise.all([
        fetch('/api/admin/accounts', { headers: { Authorization: `Bearer ${secret}` } }),
        fetch('/api/admin/meta',     { headers: { Authorization: `Bearer ${secret}` } }),
      ]);
      if (accountsRes.status === 401) { sessionStorage.removeItem('admin_secret'); router.replace('/admin'); return; }
      const accounts = await accountsRes.json();
      const meta = await metaRes.json();
      setPlatforms(accounts.platforms ?? []);
      setAuthoritiesData(accounts.authorities ?? []);
      setAuthoritiesMeta(meta.authorities ?? []);
    } catch { setError('Failed to load data'); }
    finally { setLoading(false); }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  function openCreatePlatform() {
    setFName(''); setFBaseUrl(''); setFCategory(''); setFContactEmail('');
    setFContactName(''); setFWebhookUrl(''); setFPassword(''); setFAvatarUrl(null);
    setFAuthorityId(authoritiesMeta[0]?.id ?? '');
    setModalError('');
    setModal({ mode: 'create', type: 'platform' });
  }

  function openEditPlatform(p: Platform) {
    setFName(p.name); setFBaseUrl(p.base_url); setFCategory(p.category);
    setFAuthorityId(p.authority_id);
    setFContactEmail(p.contact_email ?? '');
    setFContactName(p.contact_name ?? '');
    setFWebhookUrl(p.webhook_url ?? '');
    setFAvatarUrl(p.avatar_url);
    setFPassword('');
    setModalError('');
    setModal({ mode: 'edit', type: 'platform', item: p });
  }

  function openCreateAuthority() {
    setAName(''); setARemitDescription(''); setAContactEmail(''); setAContactName('');
    setAAvatarUrl(null); setAPassword('');
    setModalError('');
    setModal({ mode: 'create', type: 'authority' });
  }

  function openEditAuthority(a: AuthorityAccount) {
    setAName(a.name); setARemitDescription(a.remit_description ?? '');
    setAContactEmail(a.contact_email ?? ''); setAContactName(a.contact_name ?? '');
    setAAvatarUrl(a.avatar_url); setAPassword('');
    setModalError('');
    setModal({ mode: 'edit', type: 'authority', item: a });
  }

  async function submitCreatePlatform() {
    if (!fName || !fBaseUrl || !fCategory || !fAuthorityId || !fContactEmail) {
      setModalError('Name, URL, category, authority, and contact email are required'); return;
    }
    setSaving(true); setModalError('');
    try {
      const res = await fetch('/api/admin/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getSecret()}` },
        body: JSON.stringify({
          type: 'platform', name: fName, baseUrl: fBaseUrl, category: fCategory,
          authorityId: fAuthorityId, contactEmail: fContactEmail,
          ...(fContactName && { contactName: fContactName }),
          ...(fWebhookUrl && { webhookUrl: fWebhookUrl }),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setModalError(data.error ?? 'Failed'); return; }
      setModal(null); load();
    } catch { setModalError('Network error'); }
    finally { setSaving(false); }
  }

  async function submitEditPlatform() {
    if (!modal?.item) return;
    const orig = modal.item as Platform;
    setSaving(true); setModalError('');
    const body: Record<string, string | null> = { type: 'platform' };
    if (fName !== orig.name) body.name = fName;
    if (fBaseUrl !== orig.base_url) body.baseUrl = fBaseUrl;
    if (fCategory !== orig.category) body.category = fCategory;
    if (fAuthorityId !== orig.authority_id) body.authorityId = fAuthorityId;
    if (fContactEmail !== (orig.contact_email ?? '')) body.contactEmail = fContactEmail;
    if (fContactName !== (orig.contact_name ?? '')) body.contactName = fContactName;
    if (fWebhookUrl !== (orig.webhook_url ?? '')) body.webhookUrl = fWebhookUrl || null;
    if (fAvatarUrl !== orig.avatar_url && fAvatarUrl !== null) body.avatarUrl = fAvatarUrl;
    if (fPassword) {
      if (fPassword.length < 8) { setModalError('Password must be at least 8 characters'); setSaving(false); return; }
      body.password = fPassword;
    }
    try {
      const res = await fetch(`/api/admin/accounts/${orig.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getSecret()}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setModalError(data.error ?? 'Failed'); return; }
      setModal(null); load();
    } catch { setModalError('Network error'); }
    finally { setSaving(false); }
  }

  async function submitCreateAuthority() {
    if (!aName || !aContactEmail) { setModalError('Name and contact email are required'); return; }
    setSaving(true); setModalError('');
    try {
      const res = await fetch('/api/admin/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getSecret()}` },
        body: JSON.stringify({
          type: 'authority', name: aName,
          ...(aRemitDescription && { remitDescription: aRemitDescription }),
          contactEmail: aContactEmail,
          ...(aContactName && { contactName: aContactName }),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setModalError(data.error ?? 'Failed'); return; }
      setModal(null); load();
    } catch { setModalError('Network error'); }
    finally { setSaving(false); }
  }

  async function submitEditAuthority() {
    if (!modal?.item) return;
    const orig = modal.item as AuthorityAccount;
    setSaving(true); setModalError('');
    const body: Record<string, string | null> = { type: 'authority' };
    if (aName !== orig.name) body.name = aName;
    if (aRemitDescription !== (orig.remit_description ?? '')) body.remitDescription = aRemitDescription || null;
    if (aContactEmail !== (orig.contact_email ?? '')) body.contactEmail = aContactEmail;
    if (aContactName !== (orig.contact_name ?? '')) body.contactName = aContactName;
    if (aAvatarUrl !== orig.avatar_url && aAvatarUrl !== null) body.avatarUrl = aAvatarUrl;
    if (aPassword) {
      if (aPassword.length < 8) { setModalError('Password must be at least 8 characters'); setSaving(false); return; }
      body.password = aPassword;
    }
    try {
      const res = await fetch(`/api/admin/accounts/${orig.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getSecret()}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setModalError(data.error ?? 'Failed'); return; }
      setModal(null); load();
    } catch { setModalError('Network error'); }
    finally { setSaving(false); }
  }

  async function uploadAvatar(file: File, forType: 'platform' | 'authority') {
    setAvatarUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getSecret()}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Upload failed');
      if (forType === 'platform') setFAvatarUrl(data.url);
      else setAAvatarUrl(data.url);
    } catch (e: unknown) {
      setModalError(e instanceof Error ? e.message : 'Upload failed');
    } finally { setAvatarUploading(false); }
  }

  function signOut() { sessionStorage.removeItem('admin_secret'); router.replace('/admin'); }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/phas-icon.png" alt="PHAS" width={28} height={28} className="rounded-lg" />
            <div>
              <p className="text-sm font-bold text-gray-900 leading-none">PHAS Admin</p>
              <p className="text-xs text-gray-400 leading-none mt-0.5">Account management</p>
            </div>
          </div>
          <button onClick={signOut}
            className="text-xs text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
            Sign out
          </button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {error && <div className="bg-red-50 border border-red-100 text-red-700 rounded-xl px-4 py-3 text-sm mb-6">{error}</div>}

        <div className="flex items-center gap-1 mb-6 bg-white border border-gray-100 rounded-xl p-1 shadow-sm w-fit">
          {([
            { key: 'platforms',   label: 'Platforms',   count: platforms.length },
            { key: 'authorities', label: 'Authorities', count: authoritiesData.length },
          ] as { key: Tab; label: string; count: number }[]).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                tab === t.key ? 'bg-brand text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'
              }`}>
              {t.label}
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                tab === t.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
              }`}>{t.count}</span>
            </button>
          ))}
        </div>

        {/* Platforms tab */}
        {tab === 'platforms' && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-gray-400">{platforms.length} platform{platforms.length !== 1 ? 's' : ''}</p>
              <button onClick={openCreatePlatform}
                className="flex items-center gap-1.5 px-4 py-2 bg-brand text-white text-sm font-semibold rounded-xl hover:bg-brand-dark transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add platform
              </button>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {platforms.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-10">No platforms yet</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs text-gray-400 font-semibold uppercase tracking-wide">
                      <th className="text-left px-5 py-3">Platform</th>
                      <th className="text-left px-4 py-3 hidden sm:table-cell">Authority</th>
                      <th className="text-left px-4 py-3 hidden md:table-cell">Contact</th>
                      <th className="px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {platforms.map(p => (
                      <tr key={p.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar url={p.avatar_url} name={p.name} />
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-900 truncate">{p.name}</p>
                              <p className="text-xs text-gray-400 truncate">{p.category}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell text-gray-600 text-xs">{p.authority_name}</td>
                        <td className="px-4 py-3 hidden md:table-cell text-xs text-gray-500">
                          {p.contact_email
                            ? <span>{p.contact_name ? `${p.contact_name} · ` : ''}{p.contact_email}</span>
                            : <span className="italic text-gray-300">No contact set</span>}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <button onClick={() => openEditPlatform(p)}
                            className="text-xs text-gray-500 border border-gray-200 px-3 py-1 rounded-lg hover:bg-gray-50 transition-colors">
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        )}

        {/* Authorities tab */}
        {tab === 'authorities' && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-gray-400">{authoritiesData.length} authorit{authoritiesData.length !== 1 ? 'ies' : 'y'}</p>
              <button onClick={openCreateAuthority}
                className="flex items-center gap-1.5 px-4 py-2 bg-brand text-white text-sm font-semibold rounded-xl hover:bg-brand-dark transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add authority
              </button>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {authoritiesData.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-10">No authorities yet</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs text-gray-400 font-semibold uppercase tracking-wide">
                      <th className="text-left px-5 py-3">Authority</th>
                      <th className="text-left px-4 py-3 hidden md:table-cell">Remit</th>
                      <th className="text-left px-4 py-3 hidden sm:table-cell">Contact</th>
                      <th className="px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {authoritiesData.map(a => (
                      <tr key={a.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar url={a.avatar_url} name={a.name} />
                            <p className="font-semibold text-gray-900 truncate">{a.name}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell text-xs text-gray-400 max-w-55 truncate">
                          {a.remit_description ?? <span className="italic">—</span>}
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell text-xs text-gray-500">
                          {a.contact_email
                            ? <span>{a.contact_name ? `${a.contact_name} · ` : ''}{a.contact_email}</span>
                            : <span className="italic text-gray-300">No contact set</span>}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <button onClick={() => openEditAuthority(a)}
                            className="text-xs text-gray-500 border border-gray-200 px-3 py-1 rounded-lg hover:bg-gray-50 transition-colors">
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-gray-900">
                {modal.mode === 'create'
                  ? `Add ${modal.type}`
                  : `Edit ${modal.type}`}
              </h3>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* ── PLATFORM MODAL ── */}
              {modal.type === 'platform' && (
                <>
                  {modal.mode === 'edit' && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-2">Logo</label>
                      <div className="flex items-center gap-3">
                        {fAvatarUrl
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={fAvatarUrl} alt="logo" className="w-14 h-14 rounded-xl object-cover border border-gray-200" />
                          : <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center text-xl text-gray-400 font-bold">{(fName || '?')[0]?.toUpperCase()}</div>
                        }
                        <label className={`cursor-pointer px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors ${avatarUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                          {avatarUploading ? 'Uploading…' : 'Upload logo'}
                          <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                            onChange={e => { const f = e.target.files?.[0]; if (f) uploadAvatar(f, 'platform'); e.target.value = ''; }} />
                        </label>
                        {fAvatarUrl && <button onClick={() => setFAvatarUrl(null)} className="text-xs text-red-400 hover:text-red-600">Remove</button>}
                      </div>
                    </div>
                  )}

                  <Field label="Platform name *">
                    <input value={fName} onChange={e => setFName(e.target.value)} placeholder="e.g. MTN Rwanda" className={inputCls} />
                  </Field>
                  <Field label="Base URL *">
                    <input value={fBaseUrl} onChange={e => setFBaseUrl(e.target.value)} placeholder="https://mtn.rw" type="url" className={inputCls} />
                  </Field>
                  <Field label="Category *">
                    <input value={fCategory} onChange={e => setFCategory(e.target.value)} placeholder="e.g. telecom, banking, government" className={inputCls} />
                  </Field>
                  <Field label="Authority *">
                    <select value={fAuthorityId} onChange={e => setFAuthorityId(e.target.value)} className={selectCls}>
                      <option value="">— Select authority —</option>
                      {authoritiesMeta.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Contact email *">
                    <input value={fContactEmail} onChange={e => setFContactEmail(e.target.value)} type="email" placeholder="support@platform.rw" className={inputCls} />
                  </Field>
                  <Field label="Contact name">
                    <input value={fContactName} onChange={e => setFContactName(e.target.value)} placeholder="e.g. MTN Helpdesk Team" className={inputCls} />
                  </Field>
                  <Field label="Webhook URL">
                    <input value={fWebhookUrl} onChange={e => setFWebhookUrl(e.target.value)} type="url" placeholder="https://… (optional)" className={inputCls} />
                  </Field>

                  {modal.mode === 'create' ? (
                    <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-100 rounded-xl px-3.5 py-3">
                      <svg className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-xs text-blue-700 leading-relaxed">
                        No password is set yet. A setup code will be sent to the contact email automatically on their first sign-in attempt.
                      </p>
                    </div>
                  ) : (
                    <Field label="Reset password">
                      <input type="password" value={fPassword} onChange={e => setFPassword(e.target.value)} placeholder="Leave blank to keep current" className={inputCls} />
                    </Field>
                  )}
                </>
              )}

              {/* ── AUTHORITY MODAL ── */}
              {modal.type === 'authority' && (
                <>
                  {modal.mode === 'edit' && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-2">Avatar</label>
                      <div className="flex items-center gap-3">
                        {aAvatarUrl
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={aAvatarUrl} alt="avatar" className="w-14 h-14 rounded-xl object-cover border border-gray-200" />
                          : <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center text-xl text-gray-400 font-bold">{(aName || '?')[0]?.toUpperCase()}</div>
                        }
                        <label className={`cursor-pointer px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors ${avatarUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                          {avatarUploading ? 'Uploading…' : 'Upload avatar'}
                          <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                            onChange={e => { const f = e.target.files?.[0]; if (f) uploadAvatar(f, 'authority'); e.target.value = ''; }} />
                        </label>
                        {aAvatarUrl && <button onClick={() => setAAvatarUrl(null)} className="text-xs text-red-400 hover:text-red-600">Remove</button>}
                      </div>
                    </div>
                  )}

                  <Field label="Authority name *">
                    <input value={aName} onChange={e => setAName(e.target.value)} placeholder="e.g. RURA" className={inputCls} />
                  </Field>
                  <Field label="Remit description">
                    <input value={aRemitDescription} onChange={e => setARemitDescription(e.target.value)} placeholder="e.g. Telecom & internet regulation" className={inputCls} />
                  </Field>
                  <Field label="Contact email *">
                    <input value={aContactEmail} onChange={e => setAContactEmail(e.target.value)} type="email" placeholder="portal@authority.rw" className={inputCls} />
                  </Field>
                  <Field label="Contact name">
                    <input value={aContactName} onChange={e => setAContactName(e.target.value)} placeholder="e.g. RURA Oversight Team" className={inputCls} />
                  </Field>

                  {modal.mode === 'create' ? (
                    <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-100 rounded-xl px-3.5 py-3">
                      <svg className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-xs text-blue-700 leading-relaxed">
                        A setup code will be emailed to this address. They&apos;ll use it to set their own password on first sign-in.
                      </p>
                    </div>
                  ) : (
                    <Field label="Reset password">
                      <input type="password" value={aPassword} onChange={e => setAPassword(e.target.value)} placeholder="Leave blank to keep current" className={inputCls} />
                    </Field>
                  )}
                </>
              )}

              {modalError && <p className="text-xs text-red-600">{modalError}</p>}

              <div className="flex gap-2 pt-1">
                <button onClick={() => setModal(null)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button
                  onClick={
                    modal.type === 'platform'
                      ? (modal.mode === 'create' ? submitCreatePlatform : submitEditPlatform)
                      : (modal.mode === 'create' ? submitCreateAuthority : submitEditAuthority)
                  }
                  disabled={saving}
                  className="flex-1 py-2.5 bg-brand hover:bg-brand-dark disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-colors">
                  {saving ? 'Saving…' : modal.mode === 'create' ? 'Create' : 'Save changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputCls = 'w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition';
const selectCls = `${inputCls} bg-white`;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
