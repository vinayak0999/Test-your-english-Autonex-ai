import React, { useEffect, useState } from 'react';
import api from '../../api';
import {
    Building, Plus, Edit2, Trash2, ToggleLeft, ToggleRight,
    RefreshCw, X, Check, AlertTriangle
} from 'lucide-react';

const OrganizationManagement = () => {
    const [organizations, setOrganizations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingOrg, setEditingOrg] = useState(null);
    const [formData, setFormData] = useState({ name: '', slug: '' });
    const [error, setError] = useState('');

    useEffect(() => {
        fetchOrganizations();
    }, []);

    const fetchOrganizations = async () => {
        try {
            const res = await api.get('/admin/organizations');
            setOrganizations(res.data);
        } catch (err) {
            console.error("Failed to fetch organizations", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            if (editingOrg) {
                await api.patch(`/admin/organizations/${editingOrg.id}`, formData);
            } else {
                await api.post('/admin/organizations', formData);
            }
            fetchOrganizations();
            closeModal();
        } catch (err) {
            setError(err.response?.data?.detail || 'Operation failed');
        }
    };

    const toggleActive = async (org) => {
        try {
            await api.patch(`/admin/organizations/${org.id}`, { is_active: !org.is_active });
            setOrganizations(orgs => orgs.map(o =>
                o.id === org.id ? { ...o, is_active: !o.is_active } : o
            ));
        } catch (err) {
            console.error("Toggle failed", err);
        }
    };

    const deleteOrg = async (org) => {
        if (!confirm(`Delete "${org.name}"? This cannot be undone.`)) return;
        try {
            await api.delete(`/admin/organizations/${org.id}`);
            setOrganizations(orgs => orgs.filter(o => o.id !== org.id));
        } catch (err) {
            alert(err.response?.data?.detail || 'Delete failed');
        }
    };

    const openEditModal = (org) => {
        setEditingOrg(org);
        setFormData({ name: org.name, slug: org.slug });
        setShowModal(true);
    };

    const openCreateModal = () => {
        setEditingOrg(null);
        setFormData({ name: '', slug: '' });
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingOrg(null);
        setFormData({ name: '', slug: '' });
        setError('');
    };

    const generateSlug = (name) => {
        return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Loading organizations...</div>;

    return (
        <div className="max-w-5xl mx-auto pb-20 px-4">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                        <Building className="text-indigo-600" />
                        Organization Management
                    </h1>
                    <p className="text-slate-500 mt-1">Create and manage organizations.</p>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={fetchOrganizations}
                        className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                        <RefreshCw size={18} /> Refresh
                    </button>
                    <button
                        onClick={openCreateModal}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                        <Plus size={18} /> Add Organization
                    </button>
                </div>
            </header>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <h3 className="text-slate-500 text-sm font-bold uppercase tracking-wider">Total Organizations</h3>
                    <p className="text-3xl font-extrabold text-slate-800 mt-2">{organizations.length}</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <h3 className="text-slate-500 text-sm font-bold uppercase tracking-wider">Active</h3>
                    <p className="text-3xl font-extrabold text-green-600 mt-2">
                        {organizations.filter(o => o.is_active).length}
                    </p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <h3 className="text-slate-500 text-sm font-bold uppercase tracking-wider">Inactive</h3>
                    <p className="text-3xl font-extrabold text-slate-400 mt-2">
                        {organizations.filter(o => !o.is_active).length}
                    </p>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-bold tracking-wider">
                            <th className="px-6 py-4">Organization</th>
                            <th className="px-6 py-4">Slug</th>
                            <th className="px-6 py-4 text-center">Status</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {organizations.map((org) => (
                            <tr key={org.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4">
                                    <span className="font-bold text-slate-800">{org.name}</span>
                                </td>
                                <td className="px-6 py-4 text-slate-500 font-mono text-sm">
                                    {org.slug}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <button
                                        onClick={() => toggleActive(org)}
                                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold transition-colors ${org.is_active
                                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                            }`}
                                    >
                                        {org.is_active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                                        {org.is_active ? 'Active' : 'Inactive'}
                                    </button>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <button
                                            onClick={() => openEditModal(org)}
                                            className="text-slate-500 hover:text-indigo-600 p-2 rounded-lg hover:bg-indigo-50 transition-colors"
                                            title="Edit"
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                        <button
                                            onClick={() => deleteOrg(org)}
                                            className="text-slate-500 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {organizations.length === 0 && (
                            <tr>
                                <td colSpan="4" className="px-6 py-12 text-center text-slate-400">
                                    No organizations created yet. Click "Add Organization" to get started.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
                        <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-slate-800">
                                {editingOrg ? 'Edit Organization' : 'Create Organization'}
                            </h2>
                            <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {error && (
                                <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
                                    <AlertTriangle size={18} />
                                    {error}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Organization Name
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => {
                                        const name = e.target.value;
                                        setFormData({
                                            name,
                                            slug: editingOrg ? formData.slug : generateSlug(name)
                                        });
                                    }}
                                    placeholder="e.g. Acme Corporation"
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Slug (URL-friendly)
                                </label>
                                <input
                                    type="text"
                                    value={formData.slug}
                                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                                    placeholder="e.g. acme-corp"
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                                    required
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="flex-1 py-3 border border-slate-200 rounded-lg font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Check size={18} />
                                    {editingOrg ? 'Update' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrganizationManagement;
