'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import ReportModal from './ReportModal';

interface IncidentSummary {
  id: string; state: string; opened_at: string; closed_at: string | null;
}
interface MaintenanceInfo {
  id: string; title: string; starts_at: string; ends_at: string;
}
export interface PlatformRow {
  id: string; name: string; category: string;
  authority_name: string; state: string | null;
  opened_at: string | null; uptime_7d: number | null;
  history: IncidentSummary[] | null;
  maintenance: MaintenanceInfo | null;
}

const STATE_LABEL: Record<string, string> = {
  detected: 'Investigating', confirmed: 'Confirmed issue',
  acknowledged: 'Acknowledged', partially_resolved: 'Partially resolved', recurred: 'Recurred',
};
const HIST_DOT: Record<string, string> = {
  resolved: 'bg-green-400', detected: 'bg-amber-400', confirmed: 'bg-red-500',
  acknowledged: 'bg-orange-400', partially_resolved: 'bg-violet-400', recurred: 'bg-red-700',
};
const STATE_COLOR: Record<string, { bg: string; text: string; border: string }> = {
  detected:           { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200'  },
  confirmed:          { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200'    },
  acknowledged:       { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  partially_resolved: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
  recurred:           { bg: 'bg-red-50',    text: 'text-red-800',    border: 'border-red-300'    },
};

const CATEGORY_LABEL: Record<string, string> = {
  telecom: 'Telecom', internet: 'Internet', finance: 'Finance',
  government: 'Government', business: 'Business',
};

function formatDuration(from: string, to: string) {
  const mins = Math.round((new Date(to).getTime() - new Date(from).getTime()) / 60000);
  if (mins < 60) return `${mins}m`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  return `${Math.floor(mins / 1440)}d ${Math.floor((mins % 1440) / 60)}h`;
}

function uptimeColor(u: number) {
  if (u >= 99) return 'text-green-600';
  if (u >= 95) return 'text-orange-500';
  return 'text-red-500';
}

export default function StatusBody({ platforms }: { platforms: PlatformRow[] }) {
  const issues      = useMemo(() => platforms.filter(p => p.state !== null), [platforms]);
  const operational = useMemo(() => platforms.filter(p => p.state === null), [platforms]);

  const [tab,      setTab]      = useState<'issues' | 'operational'>(issues.length > 0 ? 'issues' : 'operational');
  const [search,   setSearch]   = useState('');
  const [category, setCategory] = useState('');
  const [reportTarget, setReportTarget] = useState<{ id: string; name: string } | null>(null);

  const categories = useMemo(
    () => [...new Set(platforms.map(p => p.category))].sort(),
    [platforms],
  );

  const baseList = tab === 'issues' ? issues : operational;

  const displayed = useMemo(() => {
    let list = baseList;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.authority_name.toLowerCase().includes(q),
      );
    }
    if (category) list = list.filter(p => p.category === category);
    return list;
  }, [baseList, search, category]);

  const hasFilters = search !== '' || category !== '';

  function clearFilters() { setSearch(''); setCategory(''); }

  return (
    <>
      {/* Tab bar + Search */}
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <div className="flex items-center gap-1 bg-white border border-gray-100 rounded-xl p-1 shadow-sm">
          {/* Issues tab */}
          <button onClick={() => setTab('issues')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
              tab === 'issues' ? 'bg-red-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'
            }`}>
            Issues
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
              tab === 'issues'
                ? 'bg-white/20 text-white'
                : issues.length > 0 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-400'
            }`}>
              {issues.length}
            </span>
          </button>
          {/* Operational tab */}
          <button onClick={() => setTab('operational')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
              tab === 'operational' ? 'bg-green-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'
            }`}>
            Operational
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
              tab === 'operational' ? 'bg-white/20 text-white' : 'bg-green-100 text-green-600'
            }`}>
              {operational.length}
            </span>
          </button>
        </div>

        {/* Search */}
        <div className="flex-1 min-w-48 relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none"
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" placeholder="Search platforms or authority…"
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-sm bg-white border border-gray-100 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition placeholder-gray-300" />
          {search && (
            <button onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Category filter pills */}
      <div className="flex items-center gap-1.5 flex-wrap mb-6">
        <button onClick={clearFilters}
          className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
            !category ? 'bg-gray-800 text-white' : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-400'
          }`}>
          All
        </button>
        {categories.map(cat => (
          <button key={cat} onClick={() => setCategory(cat === category ? '' : cat)}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
              category === cat
                ? 'bg-brand text-white'
                : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-400'
            }`}>
            {CATEGORY_LABEL[cat] ?? cat}
          </button>
        ))}
        {hasFilters && (
          <button onClick={clearFilters}
            className="ml-auto text-xs text-gray-400 hover:text-gray-600 transition-colors px-2">
            Clear filters
          </button>
        )}
      </div>

      {/* Results meta */}
      {hasFilters && displayed.length > 0 && (
        <p className="text-xs text-gray-400 mb-3">
          Showing {displayed.length} of {baseList.length} {tab === 'issues' ? 'affected' : 'operational'} platforms
        </p>
      )}

      {/* Cards */}
      {displayed.length === 0 ? (
        <div className="text-center py-16">
          {hasFilters ? (
            <div>
              <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <p className="font-semibold text-gray-600 text-sm">No platforms match your filters</p>
              <button onClick={clearFilters} className="text-xs text-brand mt-2 hover:underline">
                Clear filters
              </button>
            </div>
          ) : tab === 'issues' ? (
            <div>
              <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="font-semibold text-gray-700 text-sm">No active incidents</p>
              <p className="text-xs text-gray-400 mt-1">All platforms are running normally</p>
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No operational platforms</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {displayed.map(p => (
            <PlatformCard key={p.id} platform={p} onReport={() => setReportTarget({ id: p.id, name: p.name })} />
          ))}
        </div>
      )}

      {reportTarget && (
        <ReportModal
          platformId={reportTarget.id}
          platformName={reportTarget.name}
          onClose={() => setReportTarget(null)}
        />
      )}
    </>
  );
}

function PlatformCard({ platform: p, onReport }: { platform: PlatformRow; onReport: () => void }) {
  const now = new Date();
  const mw = p.maintenance;
  const isUnderMaintenance = mw ? new Date(mw.starts_at) <= now : false;
  const isUpcomingMaintenance = mw && !isUnderMaintenance;

  const hasIssue = p.state !== null && !isUnderMaintenance;
  const sc = hasIssue ? (STATE_COLOR[p.state!] ?? STATE_COLOR.confirmed) : null;
  const label = isUnderMaintenance
    ? 'Maintenance'
    : hasIssue ? (STATE_LABEL[p.state!] ?? p.state!) : 'Operational';

  const pastIncidents = (p.history ?? []).filter(h => h.state === 'resolved');

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-4 py-3.5 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 text-sm truncate">{p.name}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {p.authority_name} · {CATEGORY_LABEL[p.category] ?? p.category}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {p.uptime_7d != null && (
            <span className={`text-xs font-semibold ${uptimeColor(p.uptime_7d)}`}>
              {p.uptime_7d}%
            </span>
          )}
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
            isUnderMaintenance
              ? 'bg-blue-50 text-blue-700 border-blue-200'
              : hasIssue
                ? `${sc!.bg} ${sc!.text} ${sc!.border}`
                : 'bg-green-50 text-green-700 border-green-200'
          }`}>
            {label}
          </span>
          <Link href={`/status/platforms/${p.id}`}
            className="text-gray-300 hover:text-brand transition-colors no-underline"
            title="View full history">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>

      {mw && (
        <div className={`px-4 py-2.5 border-t flex items-center gap-2 ${
          isUnderMaintenance ? 'border-blue-100 bg-blue-50/60' : 'border-gray-50 bg-gray-50/40'
        }`}>
          <svg className={`w-3.5 h-3.5 shrink-0 ${isUnderMaintenance ? 'text-blue-500' : 'text-gray-400'}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p className={`text-xs ${isUnderMaintenance ? 'text-blue-700 font-medium' : 'text-gray-500'}`}>
            {isUnderMaintenance ? `Maintenance: ${mw.title}` : `Upcoming: ${mw.title}`}
          </p>
          {isUpcomingMaintenance && (
            <span className="ml-auto text-xs text-gray-400 shrink-0">
              {new Date(mw.starts_at).toLocaleDateString('en-RW', { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>
      )}

      {pastIncidents.length > 0 && (
        <details className="group border-t border-gray-50">
          <summary className="flex items-center gap-1.5 px-4 py-2 text-xs text-gray-400 cursor-pointer hover:bg-gray-50/70 transition-colors select-none">
            <svg className="w-3 h-3 transition-transform duration-150 group-open:rotate-90 shrink-0"
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
            {pastIncidents.length} past incident{pastIncidents.length > 1 ? 's' : ''}
          </summary>
          <div className="divide-y divide-gray-50">
            {pastIncidents.map(inc => (
              <div key={inc.id} className="px-4 py-2.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${HIST_DOT[inc.state] ?? 'bg-gray-300'}`} />
                  <span className="text-xs text-gray-600">
                    {new Date(inc.opened_at).toLocaleDateString('en-RW', {
                      month: 'short', day: 'numeric', year: 'numeric',
                    })}
                  </span>
                </div>
                <span className="text-xs text-gray-400 font-medium shrink-0">
                  {inc.closed_at ? formatDuration(inc.opened_at, inc.closed_at) : 'Ongoing'}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}

      <div className="border-t border-gray-50">
        <button
          onClick={onReport}
          className="w-full flex items-center gap-1.5 px-4 py-2 text-xs text-gray-400 hover:text-brand hover:bg-gray-50/70 transition-colors"
        >
          <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3 21l1.9-5.7a8.5 8.5 0 113.8 3.8z" />
          </svg>
          Report issue
        </button>
      </div>
    </div>
  );
}
