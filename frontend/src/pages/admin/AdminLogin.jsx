import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import Logo from '../../components/Logo';
import { Loader2, ShieldCheck, Lock, BrainCircuit } from 'lucide-react';

const AdminLogin = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [localError, setLocalError] = useState(null);

    const navigate = useNavigate();
    const { adminLogin, isLoading, logout } = useAuthStore();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLocalError(null);

        // 1. Perform Admin Login (uses /auth/admin-login)
        const success = await adminLogin(email, password);

        if (success) {
            // 2. CHECK ROLE IMMEDIATELY
            const user = useAuthStore.getState().user;

            if (user?.role === 'admin') {
                navigate('/admin/dashboard');
            } else {
                // If a student tries to login here, kick them out
                logout();
                setLocalError("Access Denied. You do not have Admin privileges.");
            }
        }
    };

    return (
        <div className="min-h-screen bg-[#0A1230] flex items-center justify-center p-4">
            {/* Background Decor */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#1E3A8A] rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
                <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-[#0F1A4D] rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
                <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-white rounded-full mix-blend-multiply filter blur-3xl opacity-5 animate-blob animation-delay-4000"></div>
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md bg-[#0F1A4D]/80 backdrop-blur-sm border border-[#1E3A8A] p-8 rounded-2xl shadow-2xl relative z-10"
            >
                <div className="flex flex-col items-center mb-8">
                    <div className="h-16 w-16 rounded-xl mb-4 shadow-lg bg-white/10 flex items-center justify-center">
                        <BrainCircuit className="h-10 w-10 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">Admin Portal</h1>
                    <p className="text-slate-400 text-sm mt-1">Restricted Access Only</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="text-sm font-medium text-slate-400 mb-1 block">Admin Email</label>
                        <div className="relative">
                            <input
                                type="email"
                                required
                                className="w-full bg-[#0A1230] border border-[#1E3A8A] text-white px-4 py-3 rounded-lg focus:ring-2 focus:ring-white/20 focus:border-white/30 outline-none transition-all"
                                placeholder="admin@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-medium text-slate-400 mb-1 block">Security Key</label>
                        <div className="relative">
                            <input
                                type="password"
                                required
                                className="w-full bg-[#0A1230] border border-[#1E3A8A] text-white px-4 py-3 rounded-lg focus:ring-2 focus:ring-white/20 focus:border-white/30 outline-none transition-all"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <Lock className="absolute right-3 top-3.5 text-slate-500 w-4 h-4" />
                        </div>
                    </div>

                    {localError && (
                        <div className="p-3 bg-red-900/30 border border-red-800 text-red-400 text-sm rounded-lg text-center">
                            {localError}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-white text-[#0F1A4D] hover:bg-slate-100 font-bold py-3 rounded-lg transition-all shadow-lg flex justify-center items-center gap-2"
                    >
                        {isLoading ? <Loader2 className="animate-spin" /> : 'Authenticate'}
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-[#1E3A8A] text-center">
                    <a href="/login" className="text-slate-400 text-xs hover:text-white transition-colors">
                        Are you a student? Switch to Student Login
                    </a>
                </div>
            </motion.div>
        </div>
    );
};

export default AdminLogin;
