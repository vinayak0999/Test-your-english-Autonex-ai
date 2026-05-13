import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import api from '../../api';
import CandidateProfileModal from '../../components/CandidateProfileModal';
import {
    Search, ChevronDown, User, Calendar, Eye,
    UserCircle, Building, ArrowLeft, AlertTriangle, Download, ArrowUp, ArrowDown, X
} from 'lucide-react';

// ─── Rank chip ────────────────────────────────────────────────────────────────
const RankChip = ({ rank }) => {
    const cfg = {
        Good:   'bg-green-100 text-green-700 border-green-300',
        Medium: 'bg-amber-100 text-amber-700 border-amber-300',
        Bad:    'bg-red-100   text-red-700   border-red-300',
    };
    return (
        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold border ${cfg[rank] ?? cfg.Bad}`}>
            {rank}
        </span>
    );
};

// ─── Score Detail Popup ────────────────────────────────────────────────────────
const ScorePopup = ({ sub, style, onClose }) => {
    const ref = useRef();

    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [onClose]);

    const hasVisual  = sub.visual_questions?.length > 0;
    const hasTyping  = sub.typing_tasks?.length > 0;
    const imgCount   = sub.visual_questions?.filter(q => q.type === 'image').length ?? 0;
    const vidCount   = sub.visual_questions?.filter(q => q.type !== 'image').length ?? 0;
    let imgIdx = 0, vidIdx = 0;

    return (
        <div ref={ref}
            style={style}
            className="z-[9999] w-80 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
        >
            {/* Sticky header */}
            <div className="flex justify-between items-center px-4 py-3 border-b border-slate-100 bg-white sticky top-0">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Section Breakdown</p>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={14} /></button>
            </div>
            {/* Scrollable body */}
            <div className="overflow-y-auto p-4" style={{ maxHeight: '70vh' }}>

            {/* MCQ */}
            <div className="mb-3 pb-3 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase mb-1">MCQ / Jumble</p>
                <div className="flex items-center gap-2">
                    <span className="text-xl font-extrabold text-slate-800">{sub.total_score}</span>
                    <span className="text-slate-400 text-sm">/ {sub.max_marks} pts</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${sub.percentage >= 50 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {sub.percentage}%
                    </span>
                </div>
            </div>

            {/* Visual */}
            {hasVisual && (
                <div className="mb-3 pb-3 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-400 uppercase mb-2">Image / Video</p>
                    <div className="space-y-1.5">
                        {sub.visual_questions.map((q, i) => {
                            const isImg = q.type === 'image';
                            const num   = isImg ? ++imgIdx : ++vidIdx;
                            const label = isImg ? `Image ${num}` : `Video ${num}`;
                            return (
                                <div key={i} className="flex items-center justify-between">
                                    <span className="text-sm text-slate-600 font-medium">{label}</span>
                                    <RankChip rank={q.rank} />
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Typing */}
            {hasTyping && (
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase mb-2">Typing</p>
                    <div className="space-y-2">
                        {sub.typing_tasks.map((t, i) => {
                            const label = t.type === 'typing-advanced' ? 'Typing Advanced' : 'Typing Easy';
                            const autoFail = t.accuracy < 80;
                            return (
                                <div key={i} className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-sm font-semibold text-slate-700">{label}</span>
                                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${t.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {t.passed ? '✓ Pass' : '✗ Fail'}
                                        </span>
                                    </div>
                                    <div className="flex gap-3 text-xs text-slate-500">
                                        <span><strong className="text-slate-700">{t.wpm}</strong> WPM <span className="text-slate-300">(target 30)</span></span>
                                        <span><strong className={autoFail ? 'text-red-600' : 'text-slate-700'}>{t.accuracy}%</strong> acc</span>
                                    </div>
                                    {autoFail && (
                                        <p className="text-xs text-red-500 mt-1">⚠ Auto-fail: accuracy below 80%</p>
                                    )}
                                </div>
                            );
                        })}
                        {/* Average row */}
                        <div className="flex justify-between text-xs text-slate-500 px-1 pt-1">
                            <span>Avg WPM: <strong className={sub.typing_avg_wpm >= 30 ? 'text-green-600' : 'text-amber-600'}>{sub.typing_avg_wpm}</strong></span>
                            <span>Avg Acc: <strong className={sub.typing_avg_acc >= 80 ? 'text-green-600' : 'text-red-600'}>{sub.typing_avg_acc}%</strong></span>
                        </div>
                    </div>
                </div>
            )}

            {!hasVisual && !hasTyping && (
                <p className="text-xs text-slate-400 text-center py-2">MCQ only — no visual or typing questions</p>
            )}
            </div>{/* end scrollable body */}
        </div>
    );
};

// ─── Main Component ────────────────────────────────────────────────────────────
const RecruiterDashboard = () => {
    const [organizations, setOrganizations]     = useState([]);
    const [selectedOrg, setSelectedOrg]         = useState(null);
    const [submissions, setSubmissions]         = useState([]);
    const [tests, setTests]                     = useState([]);
    const [loading, setLoading]                 = useState(true);
    const [searchFilter, setSearchFilter]       = useState('');
    const [testFilter, setTestFilter]           = useState('all');
    const [selectedCandidate, setSelectedCandidate] = useState(null);
    const [sortOrder, setSortOrder]             = useState('desc');
    const [openPopup, setOpenPopup]             = useState(null); // {id, sub, top, left}

    useEffect(() => {
        api.get('/admin/organizations')
            .then(res => setOrganizations([{ id: null, name: 'All Organizations', slug: 'all' }, ...res.data]))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    const loadResults = async (orgId) => {
        setLoading(true);
        try {
            const [resultsRes, testsRes] = await Promise.all([api.get('/admin/results'), api.get('/admin/tests')]);
            let results = resultsRes.data;
            if (orgId !== null) {
                results = results.filter(r => {
                    const test = testsRes.data.find(t => t.id === r.test_id);
                    return test?.organization_id === orgId || test?.organization_id === null;
                });
            }
            setSubmissions(results);
            setTests(testsRes.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectOrg = (org) => { setSelectedOrg(org); loadResults(org.id); };
    const handleBack = () => { setSelectedOrg(null); setSubmissions([]); };
    const toggleSortOrder = () => setSortOrder(p => p === 'desc' ? 'asc' : 'desc');

    const filteredData = submissions
        .filter(sub => {
            const matchSearch = sub.candidate_name.toLowerCase().includes(searchFilter.toLowerCase())
                || sub.candidate_email.toLowerCase().includes(searchFilter.toLowerCase());
            const matchTest = testFilter === 'all' || sub.test_title === testFilter;
            return matchSearch && matchTest;
        })
        .sort((a, b) => sortOrder === 'desc' ? b.percentage - a.percentage : a.percentage - b.percentage);

    const uniqueTests = [...new Set(submissions.map(s => s.test_title))];

    const exportToExcel = () => {
        if (!filteredData.length) { alert('No data to export!'); return; }
        const rows = filteredData.map((sub, i) => ({
            'Rank': i + 1,
            'Candidate': sub.candidate_name,
            'Email': sub.candidate_email,
            'Test': sub.test_title,
            'MCQ Score': sub.total_score,
            'MCQ Max': sub.max_marks,
            'MCQ %': `${sub.percentage}%`,
            'Tab Switches': sub.tab_switches || 0,
            'Status': sub.percentage >= 50 ? 'Passed' : 'Failed',
            'Date': sub.date
        }));
        const headers = Object.keys(rows[0]);
        const csv = [headers.join(','), ...rows.map(r => headers.map(h => {
            const v = r[h];
            return typeof v === 'string' && (v.includes(',') || v.includes('"')) ? `"${v.replace(/"/g, '""')}"` : v;
        }).join(','))].join('\n');
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
        a.download = `${selectedOrg.name.replace(/\s+/g,'_')}_Results_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
    };

    // ── Org selection screen ──────────────────────────────────────────────────
    if (!selectedOrg) {
        return (
            <div className="max-w-5xl mx-auto pb-20 px-4">
                <header className="mb-10">
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                        <Building className="text-[#0F1A4D]" /> Recruitment Results
                    </h1>
                    <p className="text-slate-500 mt-2">Select an organization to view candidate results.</p>
                </header>
                {loading ? (
                    <div className="text-center py-12 text-slate-400">Loading…</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {organizations.map(org => (
                            <button key={org.id || 'all'} onClick={() => handleSelectOrg(org)}
                                className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 text-left hover:shadow-lg hover:border-[#0F1A4D]/30 transition-all group">
                                <div className="flex items-center gap-4 mb-3">
                                    <div className="w-12 h-12 rounded-full bg-[#0F1A4D]/10 flex items-center justify-center group-hover:bg-[#0F1A4D] transition-colors">
                                        <Building className="text-[#0F1A4D] group-hover:text-white transition-colors" size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800 text-lg">{org.name}</h3>
                                        <p className="text-xs text-slate-400 uppercase">{org.slug}</p>
                                    </div>
                                </div>
                                <p className="text-sm text-slate-500">Click to view candidates</p>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // ── Results table ─────────────────────────────────────────────────────────
    return (
        <div className="max-w-7xl mx-auto pb-20 px-4">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <button onClick={handleBack}
                        className="flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-3 transition-colors">
                        <ArrowLeft size={18} /> Back to Organizations
                    </button>
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                        <User className="text-[#0F1A4D]" /> {selectedOrg.name} — Results
                    </h1>
                    <p className="text-slate-500 mt-1">View and manage candidate assessments.</p>
                </div>
                <div className="flex flex-col md:flex-row gap-3">
                    <button onClick={toggleSortOrder}
                        className="px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center gap-2 font-medium text-slate-700">
                        {sortOrder === 'desc' ? <ArrowDown size={16} /> : <ArrowUp size={16} />}
                        Score: {sortOrder === 'desc' ? 'High → Low' : 'Low → High'}
                    </button>
                    <button onClick={exportToExcel}
                        className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 flex items-center gap-2 font-medium shadow-sm">
                        <Download size={16} /> Export Excel
                    </button>
                    <select value={testFilter} onChange={e => setTestFilter(e.target.value)}
                        className="px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-[#0F1A4D] outline-none bg-white">
                        <option value="all">All Tests</option>
                        {uniqueTests.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input type="text" placeholder="Search candidate…" value={searchFilter}
                            onChange={e => setSearchFilter(e.target.value)}
                            className="pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-[#0F1A4D] w-full md:w-64 outline-none" />
                    </div>
                </div>
            </header>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                {[
                    { label: 'Total Candidates', value: filteredData.length, color: 'text-slate-800' },
                    { label: 'Passed (>50%)',    value: filteredData.filter(s => s.percentage >= 50).length, color: 'text-green-600' },
                    { label: 'Avg MCQ Score',    value: filteredData.length ? Math.round(filteredData.reduce((a,c) => a + c.percentage, 0) / filteredData.length) + '%' : 'N/A', color: 'text-[#0F1A4D]' },
                    { label: 'High Tab Switches', value: filteredData.filter(s => (s.tab_switches||0) > 3).length, color: 'text-amber-600', icon: true },
                ].map(({ label, value, color, icon }) => (
                    <div key={label} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                        <h3 className="text-slate-500 text-sm font-bold uppercase tracking-wider flex items-center gap-1">
                            {icon && <AlertTriangle size={14} className="text-amber-500" />} {label}
                        </h3>
                        <p className={`text-3xl font-extrabold mt-2 ${color}`}>{value}</p>
                    </div>
                ))}
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-bold tracking-wider">
                            <th className="px-6 py-4 w-10">#</th>
                            <th className="px-6 py-4">Candidate</th>
                            <th className="px-6 py-4">Test Name</th>
                            <th className="px-6 py-4">Date</th>
                            <th className="px-6 py-4 cursor-pointer hover:text-[#0F1A4D]" onClick={toggleSortOrder}>
                                <div className="flex items-center gap-1">
                                    Score {sortOrder === 'desc' ? <ArrowDown size={14} /> : <ArrowUp size={14} />}
                                </div>
                            </th>
                            <th className="px-6 py-4 text-center">Tab Switches</th>
                            <th className="px-6 py-4 text-center">Status</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredData.map((sub, index) => (
                            <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 text-slate-400 font-mono text-sm">{index + 1}</td>

                                {/* Candidate */}
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-slate-800">{sub.candidate_name}</span>
                                        <span className="text-xs text-slate-500">{sub.candidate_email}</span>
                                    </div>
                                </td>

                                <td className="px-6 py-4 text-slate-700 font-medium">{sub.test_title}</td>
                                <td className="px-6 py-4 text-slate-500 text-sm">{sub.date}</td>

                                {/* Score cell with popup */}
                                <td className="px-6 py-4">
                                    <div className="inline-block">
                                        {/* Main score display */}
                                        <div className="flex items-end gap-1 leading-none mb-1">
                                            <span className="text-2xl font-extrabold text-slate-800">{sub.total_score}</span>
                                            <span className="text-slate-400 text-sm mb-0.5">/ {sub.max_marks}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${sub.percentage >= 50 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {sub.percentage}%
                                            </span>
                                            {/* Click to expand button */}
                                            {(sub.visual_questions?.length > 0 || sub.typing_tasks?.length > 0) && (
                                                <button
                                                    onClick={(e) => {
                                                        if (openPopup?.id === sub.id) { setOpenPopup(null); return; }
                                                        const rect = e.currentTarget.getBoundingClientRect();
                                                        const POPUP_H = 420; // approx max height
                                                        const spaceBelow = window.innerHeight - rect.bottom;
                                                        const top = spaceBelow >= POPUP_H
                                                            ? rect.bottom + 6                          // fits below
                                                            : Math.max(8, rect.top - POPUP_H - 6);    // flip above
                                                        // clamp left so it doesn't go off right edge
                                                        const left = Math.min(rect.left, window.innerWidth - 320 - 8);
                                                        setOpenPopup({ id: sub.id, sub, top, left });
                                                    }}
                                                    className="flex items-center gap-1 text-xs text-[#0F1A4D] font-semibold bg-[#0F1A4D]/8 hover:bg-[#0F1A4D]/15 px-2 py-0.5 rounded-full transition-colors border border-[#0F1A4D]/20"
                                                >
                                                    Details <ChevronDown size={11} className={`transition-transform ${openPopup?.id === sub.id ? 'rotate-180' : ''}`} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </td>

                                {/* Tab switches */}
                                <td className="px-6 py-4 text-center">
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${(sub.tab_switches||0) > 3 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                                        {sub.tab_switches || 0}
                                    </span>
                                </td>

                                {/* Status */}
                                <td className="px-6 py-4 text-center">
                                    {sub.percentage >= 50
                                        ? <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-bold">Passed</span>
                                        : <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full font-bold">Failed</span>}
                                </td>

                                {/* Actions */}
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <button onClick={() => setSelectedCandidate(sub)}
                                            className="text-slate-500 hover:text-[#0F1A4D] p-2 rounded-lg hover:bg-[#0F1A4D]/10 transition-colors" title="View Profile">
                                            <UserCircle size={18} />
                                        </button>
                                        <Link to={`/admin/results/${sub.id}`}
                                            className="inline-flex items-center gap-2 text-[#0F1A4D] hover:text-[#1E3A8A] font-medium text-sm transition-colors">
                                            <Eye size={16} /> Report
                                        </Link>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredData.length === 0 && !loading && (
                            <tr>
                                <td colSpan="8" className="px-6 py-12 text-center text-slate-400">
                                    No results found for this organization.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {selectedCandidate && (
                <CandidateProfileModal candidate={selectedCandidate} onClose={() => setSelectedCandidate(null)} />
            )}

            {/* Score popup — rendered via portal so it's never clipped by table overflow */}
            {openPopup && createPortal(
                <ScorePopup
                    sub={openPopup.sub}
                    style={{ position: 'fixed', top: openPopup.top, left: openPopup.left }}
                    onClose={() => setOpenPopup(null)}
                />,
                document.body
            )}
        </div>
    );
};

export default RecruiterDashboard;
