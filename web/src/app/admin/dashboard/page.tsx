'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface Operator {
  id: string; email: string; name: string | null; avatar_url: string | null;
  platform_id: string; platform_name: string; role: string;
}
interface Regulator {
  id: string; email: string; name: string | null; avatar_url: string | null;
  authority_id: string | null; authority_name: string | null; role: string;
}
interface Platform { id: string; name: string; authority_name: string }
interface Authority { id: string; name: string }

type AccountType = 'operator' | 'regulator';
type ModalMode = 'create' | 'edit';
type Tab = 'operators' | 'regulators';

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
  const [operators, setOperators] = useState<Operator[]>([]);
  const [regulators, setRegulators] = useState<Regulator[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [authorities, setAuthorities] = useState<Authority[]>([]);
  const [tab, setTab] = useState<Tab>('operators');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal state
  const [modal, setModal] = useState<{ mode: ModalMode; type: AccountType; account?: Operator | Regulator } | null>(null);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');

  // Create form
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPlatformId, setNewPlatformId] = useState('');
  const [newAuthorityId, setNewAuthorityId] = useState('');

  // Edit form
  const [editName, setEditName] = useState('');
  const [editPlatformId, setEditPlatformId] = useState('');
  const [editAuthorityId, setEditAuthorityId] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [editAvatarUrl, setEditAvatarUrl] = useState<string | null>(null);

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
      setOperators(accounts.operators ?? []);
      setRegulators(accounts.regulators ?? []);
      setPlatforms(meta.platforms ?? []);
      setAuthorities(meta.authorities ?? []);
    } catch { setError('Failed to load data'); }
    finally { setLoading(false); }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  function openCreate(type: AccountType) {
    setNewEmail(''); setNewName(''); setNewPassword('');
    setNewPlatformId(platforms[0]?.id ?? '');
    setNewAuthorityId(authorities[0]?.id ?? '');
    setModalError('');
    setModal({ mode: 'create', type });
  }

  function openEdit(type: AccountType, account: Operator | Regulator) {
    setEditName(account.name ?? '');
    setEditAvatarUrl(account.avatar_url);
    setEditPassword('');
    if (type === 'operator') setEditPlatformId((account as Operator).platform_id);
    if (type === 'regulator') setEditAuthorityId((account as Regulator).authority_id ?? '');
    setModalError('');
    setModal({ mode: 'edit', type, account });
  }

  async function submitCreate() {
    if (!newEmail || !newPassword) { setModalError('Email and password are required'); return; }
    if (newPassword.length < 8) { setModalError('Password must be at least 8 characters'); return; }
    setSaving(true); setModalError('');
    const body: Record<string, string> = {
      type: modal!.type, email: newEmail, password: newPassword,
    };
    if (newName) body.name = newName;
    if (modal!.type === 'operator') {
      if (!newPlatformId) { setModalError('Platform is required'); setSaving(false); return; }
      body.platformId = newPlatformId;
    } else {
      if (newAuthorityId) body.authorityId = newAuthorityId;
    }
    try {
      const res = await fetch('/api/admin/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getSecret()}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setModalError(data.error ?? 'Failed'); return; }
      setModal(null);
      load();
    } catch { setModalError('Network error'); }
    finally { setSaving(false); }
  }

  async function submitEdit() {
    if (!modal?.account) return;
    setSaving(true); setModalError('');
    const body: Record<string, string> = { type: modal.type };
    if (editName !== (modal.account.name ?? '')) body.name = editName;
    if (editAvatarUrl !== modal.account.avatar_url && editAvatarUrl !== null) body.avatarUrl = editAvatarUrl;
    if (editPassword) {
      if (editPassword.length < 8) { setModalError('Password must be at least 8 characters'); setSaving(false); return; }
      body.password = editPassword;
    }
    if (modal.type === 'operator') body.platformId = editPlatformId;
    if (modal.type === 'regulator' && editAuthorityId) body.authorityId = editAuthorityId;

    try {
      const res = await fetch(`/api/admin/accounts/${modal.account.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getSecret()}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setModalError(data.error ?? 'Failed'); return; }
      setModal(null);
      load();
    } catch { setModalError('Network error'); }
    finally { setSaving(false); }
  }

  async function uploadAvatar(file: File) {
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
      setEditAvatarUrl(data.url);
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
      {/* Nav */}
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

        {/* Tab bar */}
        <div className="flex items-center gap-1 mb-6 bg-white border border-gray-100 rounded-xl p-1 shadow-sm w-fit">
          {([
            { key: 'operators',  label: 'Operators',  count: operators.length },
            { key: 'regulators', label: 'Regulators', count: regulators.length },
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

        {/* Operators tab */}
        {tab === 'operators' && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-gray-400">{operators.length} account{operators.length !== 1 ? 's' : ''}</p>
              <button onClick={() => openCreate('operator')}
                className="flex items-center gap-1.5 px-4 py-2 bg-brand text-white text-sm font-semibold rounded-xl hover:bg-brand-dark transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add operator
              </button>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {operators.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-10">No operators yet</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs text-gray-400 font-semibold uppercase tracking-wide">
                      <th className="text-left px-5 py-3">Account</th>
                      <th className="text-left px-4 py-3 hidden sm:table-cell">Platform</th>
                      <th className="text-left px-4 py-3 hidden md:table-cell">Role</th>
                      <th className="px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {operators.map(op => (
                      <tr key={op.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar url={op.avatar_url} name={op.name ?? op.email} />
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-900 truncate">{op.name ?? <span className="text-gray-400 italic">No name</span>}</p>
                              <p className="text-xs text-gray-400 truncate">{op.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell text-gray-600 text-xs">{op.platform_name}</td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 capitalize">{op.role}</span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <button onClick={() => openEdit('operator', op)}
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

        {/* Regulators tab */}
        {tab === 'regulators' && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-gray-400">{regulators.length} account{regulators.length !== 1 ? 's' : ''}</p>
              <button onClick={() => openCreate('regulator')}
                className="flex items-center gap-1.5 px-4 py-2 bg-brand text-white text-sm font-semibold rounded-xl hover:bg-brand-dark transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add regulator
              </button>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {regulators.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-10">No regulators yet</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs text-gray-400 font-semibold uppercase tracking-wide">
                      <th className="text-left px-5 py-3">Account</th>
                      <th className="text-left px-4 py-3 hidden sm:table-cell">Authority</th>
                      <th className="text-left px-4 py-3 hidden md:table-cell">Role</th>
                      <th className="px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {regulators.map(reg => (
                      <tr key={reg.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar url={reg.avatar_url} name={reg.name ?? reg.email} />
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-900 truncate">{reg.name ?? <span className="text-gray-400 italic">No name</span>}</p>
                              <p className="text-xs text-gray-400 truncate">{reg.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell text-gray-600 text-xs">{reg.authority_name ?? '—'}</td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 capitalize">{reg.role}</span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <button onClick={() => openEdit('regulator', reg)}
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
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
              {/* Avatar (edit only) */}
              {modal.mode === 'edit' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-2">Logo / Avatar</label>
                  <div className="flex items-center gap-3">
                    {editAvatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={editAvatarUrl} alt="avatar" className="w-14 h-14 rounded-xl object-cover border border-gray-200" />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center text-xl text-gray-400 font-bold">
                        {(editName || '?')[0]?.toUpperCase()}
                      </div>
                    )}
                    <label className={`cursor-pointer px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors ${avatarUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                      {avatarUploading ? 'Uploading…' : 'Upload logo'}
                      <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) uploadAvatar(f); e.target.value = ''; }} />
                    </label>
                    {editAvatarUrl && (
                      <button onClick={() => setEditAvatarUrl(null)} className="text-xs text-red-400 hover:text-red-600">Remove</button>
                    )}
                  </div>
                </div>
              )}

              {/* Email (create only) */}
              {modal.mode === 'create' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Email *</label>
                  <input value={newEmail} onChange={e => setNewEmail(e.target.value)}
                    type="email" placeholder="name@organization.rw"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition" />
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Display name</label>
                {modal.mode === 'create' ? (
                  <input value={newName} onChange={e => setNewName(e.target.value)}
                    placeholder="e.g. MTN Rwanda Helpdesk"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition" />
                ) : (
                  <input value={editName} onChange={e => setEditName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition" />
                )}
              </div>

              {/* Platform (operator only) */}
              {modal.type === 'operator' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Platform *</label>
                  <select
                    value={modal.mode === 'create' ? newPlatformId : editPlatformId}
                    onChange={e => modal.mode === 'create' ? setNewPlatformId(e.target.value) : setEditPlatformId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition bg-white">
                    {platforms.map(p => (
                      <option key={p.id} value={p.id}>{p.name} — {p.authority_name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Authority (regulator only) */}
              {modal.type === 'regulator' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Authority</label>
                  <select
                    value={modal.mode === 'create' ? newAuthorityId : editAuthorityId}
                    onChange={e => modal.mode === 'create' ? setNewAuthorityId(e.target.value) : setEditAuthorityId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition bg-white">
                    <option value="">— None (cross-authority) —</option>
                    {authorities.map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                  {modal.mode === 'create' ? 'Password *' : 'Reset password'}
                </label>
                <input
                  type="password"
                  value={modal.mode === 'create' ? newPassword : editPassword}
                  onChange={e => modal.mode === 'create' ? setNewPassword(e.target.value) : setEditPassword(e.target.value)}
                  placeholder={modal.mode === 'edit' ? 'Leave blank to keep current' : 'Min. 8 characters'}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition" />
              </div>

              {modalError && <p className="text-xs text-red-600">{modalError}</p>}

              <div className="flex gap-2 pt-1">
                <button onClick={() => setModal(null)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button
                  onClick={modal.mode === 'create' ? submitCreate : submitEdit}
                  disabled={saving}
                  className="flex-1 py-2.5 bg-brand hover:bg-brand-dark disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-colors">
                  {saving ? 'Saving…' : modal.mode === 'create' ? 'Create account' : 'Save changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
