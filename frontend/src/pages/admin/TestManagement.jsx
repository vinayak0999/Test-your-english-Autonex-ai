import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api';
import {
    Plus, Edit2, Trash2, Check, X,
    Clock, Award, Building, ToggleLeft, ToggleRight,
    RefreshCw, FileText
} from 'lucide-react';

const TestManagement = () => {
    const [tests, setTests] = useState([]);
    const [organizations, setOrganizations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingTest, setEditingTest] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [testsRes, orgsRes] = await Promise.all([
                api.get('/admin/tests'),
                api.get('/admin/organizations')
            ]);
            setTests(testsRes.data);
            setOrganizations(orgsRes.data);
        } catch (err) {
            console.error("Failed to fetch data", err);
        } finally {
            setLoading(false);
        }
    };

    const toggleActive = async (testId, currentStatus) => {
        try {
            await api.patch(`/admin/tests/${testId}`, { is_active: !currentStatus });
            setTests(tests.map(t =>
                t.id === testId ? { ...t, is_active: !currentStatus } : t
            ));
        } catch (err) {
            console.error("Toggle failed", err);
        }
    };

    const deleteTest = async (testId) => {
        if (!confirm("Are you sure you want to delete this test? This cannot be undone.")) return;
        try {
            await api.delete(`/admin/tests/${testId}`);
            setTests(tests.filter(t => t.id !== testId));
        } catch (err) {
            console.error("Delete failed", err);
        }
    };

    const updateOrg = async (testId, orgId) => {
        try {
            await api.patch(`/admin/tests/${testId}`, {
                organization_id: orgId === "all" ? 0 : parseInt(orgId)
            });
            fetchData(); // Refresh to get updated org name
        } catch (err) {
            console.error("Update failed", err);
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Loading tests...</div>;

    return (
        <div className="max-w-7xl mx-auto pb-20 px-4">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                        <FileText className="text-indigo-600" />
                        Test Management
                    </h1>
                    <p className="text-slate-500 mt-1">Create, edit, and manage your tests.</p>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={fetchData}
                        className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                        <RefreshCw size={18} /> Refresh
                    </button>
                    <Link
                        to="/admin/create-test"
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                        <Plus size={18} /> Create New Test
                    </Link>
                </div>
            </header>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <h3 className="text-slate-500 text-sm font-bold uppercase tracking-wider">Total Tests</h3>
                    <p className="text-3xl font-extrabold text-slate-800 mt-2">{tests.length}</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <h3 className="text-slate-500 text-sm font-bold uppercase tracking-wider">Active</h3>
                    <p className="text-3xl font-extrabold text-green-600 mt-2">
                        {tests.filter(t => t.is_active).length}
                    </p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <h3 className="text-slate-500 text-sm font-bold uppercase tracking-wider">Inactive</h3>
                    <p className="text-3xl font-extrabold text-slate-400 mt-2">
                        {tests.filter(t => !t.is_active).length}
                    </p>
                </div>
            </div>

            {/* Tests Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-bold tracking-wider">
                            <th className="px-6 py-4">Test Name</th>
                            <th className="px-6 py-4">Questions</th>
                            <th className="px-6 py-4">Duration</th>
                            <th className="px-6 py-4">Organization</th>
                            <th className="px-6 py-4 text-center">Status</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {tests.map((test) => (
                            <tr key={test.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-slate-800">{test.title}</span>
                                        <span className="text-xs text-slate-500">{test.total_marks} marks</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-slate-700">
                                    {test.question_count} questions
                                </td>
                                <td className="px-6 py-4 text-slate-500">
                                    <Clock size={14} className="inline mr-1" />
                                    {test.duration_minutes} min
                                </td>
                                <td className="px-6 py-4">
                                    <select
                                        value={test.organization_id || "all"}
                                        onChange={(e) => updateOrg(test.id, e.target.value)}
                                        className="text-sm border border-slate-200 rounded px-2 py-1"
                                    >
                                        <option value="all">All Organizations</option>
                                        {organizations.map(org => (
                                            <option key={org.id} value={org.id}>{org.name}</option>
                                        ))}
                                    </select>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <button
                                        onClick={() => toggleActive(test.id, test.is_active)}
                                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold transition-colors ${test.is_active
                                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                            }`}
                                    >
                                        {test.is_active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                                        {test.is_active ? 'Active' : 'Inactive'}
                                    </button>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button
                                        onClick={() => deleteTest(test.id)}
                                        className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors"
                                        title="Delete Test"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {tests.length === 0 && (
                            <tr>
                                <td colSpan="6" className="px-6 py-12 text-center text-slate-400">
                                    No tests created yet. Click "Create New Test" to get started.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default TestManagement;
