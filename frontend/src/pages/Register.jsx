import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';
import Logo from '../components/Logo';
import { Loader2, CheckCircle, XCircle, Building } from 'lucide-react';

const Register = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        password: '',
        confirm_password: '',
        organization_id: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [organizations, setOrganizations] = useState([]);
    const [loadingOrgs, setLoadingOrgs] = useState(true);

    // Fetch organizations from API
    useEffect(() => {
        api.get('/auth/organizations')
            .then(res => setOrganizations(res.data))
            .catch(err => console.error("Failed to load organizations", err))
            .finally(() => setLoadingOrgs(false));
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (formData.password !== formData.confirm_password) {
            setError("Passwords do not match");
            return;
        }

        if (!formData.organization_id) {
            setError("Please select an organization");
            return;
        }

        setLoading(true);
        try {
            await api.post('/auth/register', {
                email: formData.email,
                password: formData.password,
                full_name: formData.full_name,
                organization_id: parseInt(formData.organization_id),
                organization_name: organizations.find(o => o.id == formData.organization_id)?.name || ''
            });
            navigate('/login');
        } catch (err) {
            setError(err.response?.data?.detail || "Registration failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-card w-full max-w-lg p-8 rounded-2xl bg-white shadow-xl"
            >
                <div className="flex justify-center mb-6">
                    <Logo className="h-12 w-12" textClass="text-3xl" />
                </div>

                <h2 className="text-center text-2xl font-bold text-slate-800 mb-2">Create your account</h2>
                <p className="text-center text-slate-500 mb-8">Join the platform to start testing.</p>

                <form onSubmit={handleSubmit} className="space-y-4">

                    {/* Full Name */}
                    <div>
                        <label className="text-sm font-medium text-slate-700">Full Name</label>
                        <input
                            name="full_name"
                            required
                            className="input-field mt-1"
                            placeholder="John Doe"
                            onChange={handleChange}
                        />
                    </div>

                    {/* Email */}
                    <div>
                        <label className="text-sm font-medium text-slate-700">Email Address</label>
                        <input
                            name="email"
                            type="email"
                            required
                            className="input-field mt-1"
                            placeholder="student@example.com"
                            onChange={handleChange}
                        />
                    </div>

                    {/* Organization Dropdown - From API */}
                    <div>
                        <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
                            <Building size={14} /> Organization
                        </label>
                        <div className="relative mt-1">
                            <select
                                name="organization_id"
                                required
                                className="input-field appearance-none cursor-pointer bg-white"
                                value={formData.organization_id}
                                onChange={handleChange}
                                disabled={loadingOrgs}
                            >
                                <option value="" disabled>
                                    {loadingOrgs ? 'Loading organizations...' : 'Select your organization...'}
                                </option>
                                {organizations.map((org) => (
                                    <option key={org.id} value={org.id}>{org.name}</option>
                                ))}
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                            </div>
                        </div>
                    </div>

                    {/* Password Group */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-slate-700">Password</label>
                            <input
                                name="password"
                                type="password"
                                required
                                className="input-field mt-1"
                                placeholder="••••••"
                                onChange={handleChange}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-slate-700">Verify</label>
                            <input
                                name="confirm_password"
                                type="password"
                                required
                                className="input-field mt-1"
                                placeholder="••••••"
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 text-sm rounded-lg">
                            <XCircle size={16} /> {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary w-full mt-6 py-3 font-semibold text-lg shadow-blue-200 shadow-xl"
                    >
                        {loading ? <Loader2 className="animate-spin mx-auto" /> : 'Create Account'}
                    </button>
                </form>

                <p className="mt-6 text-center text-sm text-slate-500">
                    Already have an account?{' '}
                    <Link to="/login" className="text-blue-600 font-semibold hover:underline">
                        Login here
                    </Link>
                </p>
            </motion.div>
        </div>
    );
};

export default Register;
