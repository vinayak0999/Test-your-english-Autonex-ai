import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api';
import CandidateProfileModal from '../../components/CandidateProfileModal';
import {
    Search, Filter, ChevronDown, User, FileText, Calendar, Award, Eye,
    UserCircle, Building, ArrowLeft, AlertTriangle, Download, ArrowUpDown, ArrowUp, ArrowDown
} from 'lucide-react';

const RecruiterDashboard = () => {
    const [organizations, setOrganizations] = useState([]);
    const [selectedOrg, setSelectedOrg] = useState(null);
    const [submissions, setSubmissions] = useState([]);
    const [tests, setTests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchFilter, setSearchFilter] = useState('');
    const [testFilter, setTestFilter] = useState('all');
    const [selectedCandidate, setSelectedCandidate] = useState(null);
    const [sortOrder, setSortOrder] = useState('desc'); // 'asc' or 'desc'

    useEffect(() => {
        // First load: get organizations
        api.get('/admin/organizations')
            .then(res => {
                // Add "All Organizations" option
                setOrganizations([
                    { id: null, name: 'All Organizations', slug: 'all' },
                    ...res.data
                ]);
            })
            .catch(err => console.error("Failed to fetch organizations", err))
            .finally(() => setLoading(false));
    }, []);

    const loadResults = async (orgId) => {
        setLoading(true);
        try {
            const [resultsRes, testsRes] = await Promise.all([
                api.get('/admin/results'),
                api.get('/admin/tests')
            ]);

            let results = resultsRes.data;

            // Filter by organization if one is selected (not "All")
            if (orgId !== null) {
                // Need to filter by user's organization
                // Backend should ideally handle this, but we'll do client-side for now
                results = results.filter(r => {
                    // Check if result's test is for this org
                    const test = testsRes.data.find(t => t.id === r.test_id);
                    return test?.organization_id === orgId || test?.organization_id === null;
                });
            }

            setSubmissions(results);
            setTests(testsRes.data);
        } catch (err) {
            console.error("Failed to fetch data", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectOrg = (org) => {
        setSelectedOrg(org);
        loadResults(org.id);
    };

    const handleBack = () => {
        setSelectedOrg(null);
        setSubmissions([]);
    };

    // Toggle sort order
    const toggleSortOrder = () => {
        setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
    };

    // Filter Logic - search + test filter
    const filteredData = submissions
        .filter(sub => {
            const matchesSearch =
                sub.candidate_name.toLowerCase().includes(searchFilter.toLowerCase()) ||
                sub.candidate_email.toLowerCase().includes(searchFilter.toLowerCase());
            const matchesTest = testFilter === 'all' || sub.test_title === testFilter;
            return matchesSearch && matchesTest;
        })
        .sort((a, b) => {
            // Sort by score
            if (sortOrder === 'desc') {
                return b.percentage - a.percentage; // Highest first
            } else {
                return a.percentage - b.percentage; // Lowest first
            }
        });

    // Get unique test names for dropdown
    const uniqueTests = [...new Set(submissions.map(s => s.test_title))];

    // Excel Export Function
    const exportToExcel = () => {
        if (filteredData.length === 0) {
            alert('No data to export!');
            return;
        }

        // Prepare data for Excel
        const excelData = filteredData.map((sub, index) => ({
            'Rank': index + 1,
            'Candidate Name': sub.candidate_name,
            'Email': sub.candidate_email,
            'Test Name': sub.test_title,
            'Score': sub.total_score,
            'Max Marks': sub.max_marks,
            'Percentage': `${sub.percentage}%`,
            'Tab Switches': sub.tab_switches || 0,
            'Status': sub.percentage >= 50 ? 'Passed' : 'Failed',
            'Date': sub.date
        }));

        // Create CSV content (Excel-compatible)
        const headers = Object.keys(excelData[0]);
        const csvContent = [
            headers.join(','),
            ...excelData.map(row =>
                headers.map(header => {
                    const value = row[header];
                    // Escape values with commas or quotes
                    if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                        return `"${value.replace(/"/g, '""')}"`;
                    }
                    return value;
                }).join(',')
            )
        ].join('\n');

        // Create and download file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${selectedOrg.name.replace(/\s+/g, '_')}_Results_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // STEP 1: Show organization selection
    if (!selectedOrg) {
        return (
            <div className="max-w-5xl mx-auto pb-20 px-4">
                <header className="mb-10">
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                        <Building className="text-[#0F1A4D]" />
                        Recruitment Results
                    </h1>
                    <p className="text-slate-500 mt-2">Select an organization to view candidate results.</p>
                </header>

                {loading ? (
                    <div className="text-center py-12 text-slate-400">Loading organizations...</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {organizations.map((org) => (
                            <button
                                key={org.id || 'all'}
                                onClick={() => handleSelectOrg(org)}
                                className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 text-left hover:shadow-lg hover:border-[#0F1A4D]/30 transition-all group"
                            >
                                <div className="flex items-center gap-4 mb-3">
                                    <div className="w-12 h-12 rounded-full bg-[#0F1A4D]/10 flex items-center justify-center group-hover:bg-[#0F1A4D] transition-colors">
                                        <Building className="text-[#0F1A4D] group-hover:text-white transition-colors" size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800 text-lg">{org.name}</h3>
                                        <p className="text-xs text-slate-400 uppercase">{org.slug}</p>
                                    </div>
                                </div>
                                <p className="text-sm text-slate-500">
                                    Click to view candidates for this organization
                                </p>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // STEP 2: Show results for selected organization
    return (
        <div className="max-w-7xl mx-auto pb-20 px-4">
            {/* Header with Back button */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <button
                        onClick={handleBack}
                        className="flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-3 transition-colors"
                    >
                        <ArrowLeft size={18} /> Back to Organizations
                    </button>
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                        <User className="text-[#0F1A4D]" />
                        {selectedOrg.name} - Results
                    </h1>
                    <p className="text-slate-500 mt-1">View and manage candidate assessments.</p>
                </div>

                {/* Filters & Actions */}
                <div className="flex flex-col md:flex-row gap-3">
                    {/* Sort Button */}
                    <button
                        onClick={toggleSortOrder}
                        className="px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center gap-2 font-medium text-slate-700"
                    >
                        {sortOrder === 'desc' ? <ArrowDown size={16} /> : <ArrowUp size={16} />}
                        Score: {sortOrder === 'desc' ? 'High → Low' : 'Low → High'}
                    </button>

                    {/* Export Button */}
                    <button
                        onClick={exportToExcel}
                        className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 flex items-center gap-2 font-medium shadow-sm"
                    >
                        <Download size={16} /> Export Excel
                    </button>

                    <select
                        value={testFilter}
                        onChange={(e) => setTestFilter(e.target.value)}
                        className="px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-[#0F1A4D] outline-none transition-all bg-white"
                    >
                        <option value="all">All Tests</option>
                        {uniqueTests.map(t => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search candidate..."
                            value={searchFilter}
                            onChange={(e) => setSearchFilter(e.target.value)}
                            className="pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-[#0F1A4D] w-full md:w-64 outline-none transition-all"
                        />
                    </div>
                </div>
            </header>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <h3 className="text-slate-500 text-sm font-bold uppercase tracking-wider">Total Candidates</h3>
                    <p className="text-3xl font-extrabold text-slate-800 mt-2">{filteredData.length}</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <h3 className="text-slate-500 text-sm font-bold uppercase tracking-wider">Passed (&gt;50%)</h3>
                    <p className="text-3xl font-extrabold text-green-600 mt-2">
                        {filteredData.filter(s => s.percentage >= 50).length}
                    </p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <h3 className="text-slate-500 text-sm font-bold uppercase tracking-wider">Avg Score</h3>
                    <p className="text-3xl font-extrabold text-[#0F1A4D] mt-2">
                        {filteredData.length > 0
                            ? Math.round(filteredData.reduce((acc, curr) => acc + curr.percentage, 0) / filteredData.length) + '%'
                            : 'N/A'}
                    </p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <h3 className="text-slate-500 text-sm font-bold uppercase tracking-wider flex items-center gap-1">
                        <AlertTriangle size={14} className="text-amber-500" /> High Tab Switches
                    </h3>
                    <p className="text-3xl font-extrabold text-amber-600 mt-2">
                        {filteredData.filter(s => (s.tab_switches || 0) > 3).length}
                    </p>
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-bold tracking-wider">
                            <th className="px-6 py-4 w-12">#</th>
                            <th className="px-6 py-4">Candidate</th>
                            <th className="px-6 py-4">Test Name</th>
                            <th className="px-6 py-4">Date</th>
                            <th className="px-6 py-4 cursor-pointer hover:text-[#0F1A4D]" onClick={toggleSortOrder}>
                                <div className="flex items-center gap-1">
                                    Score
                                    {sortOrder === 'desc' ? <ArrowDown size={14} /> : <ArrowUp size={14} />}
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
                                <td className="px-6 py-4 text-slate-400 font-mono text-sm">
                                    {index + 1}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-slate-800">{sub.candidate_name}</span>
                                        <span className="text-xs text-slate-500">{sub.candidate_email}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-slate-700 font-medium">
                                    {sub.test_title}
                                </td>
                                <td className="px-6 py-4 text-slate-500 text-sm">
                                    {sub.date}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono font-bold text-slate-800">
                                            {sub.total_score}
                                        </span>
                                        <span className="text-xs text-slate-400">/ {sub.max_marks}</span>
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${sub.percentage >= 50 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {sub.percentage}%
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${(sub.tab_switches || 0) > 3
                                        ? 'bg-amber-100 text-amber-700'
                                        : 'bg-green-100 text-green-700'
                                        }`}>
                                        {sub.tab_switches || 0}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    {sub.percentage >= 50 ? (
                                        <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-bold">Passed</span>
                                    ) : (
                                        <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full font-bold">Failed</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <button
                                            onClick={() => setSelectedCandidate(sub)}
                                            className="text-slate-500 hover:text-[#0F1A4D] p-2 rounded-lg hover:bg-[#0F1A4D]/10 transition-colors"
                                            title="View Profile"
                                        >
                                            <UserCircle size={18} />
                                        </button>
                                        <Link
                                            to={`/admin/results/${sub.id}`}
                                            className="inline-flex items-center gap-2 text-[#0F1A4D] hover:text-[#1E3A8A] font-medium text-sm transition-colors"
                                        >
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

            {/* Profile Modal */}
            {selectedCandidate && (
                <CandidateProfileModal
                    candidate={selectedCandidate}
                    onClose={() => setSelectedCandidate(null)}
                />
            )}
        </div>
    );
};

export default RecruiterDashboard;

