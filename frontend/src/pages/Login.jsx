import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import Logo from '../components/Logo';
import { Loader2, ArrowRight } from 'lucide-react';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();
    const { login, isLoading, error } = useAuthStore();

    const handleSubmit = async (e) => {
        e.preventDefault();
        const success = await login(email, password);
        if (success) navigate('/dashboard');
    };

    return (
        <div className="min-h-screen flex bg-slate-50">
            {/* Left Side - Visuals */}
            <div className="hidden lg:flex w-1/2 bg-[#0F1A4D] relative overflow-hidden items-center justify-center p-12">
                <div className="absolute inset-0 bg-gradient-to-br from-[#0F1A4D] to-[#0A1230] opacity-90" />
                <div className="relative z-10 text-white max-w-lg">
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-5xl font-bold mb-6"
                    >
                        Test Your English with AUTONEX AI.
                    </motion.h1>
                    <p className="text-slate-300 text-xl leading-relaxed">
                        Take tests, get instant AI grading, and track your progress with our advanced evaluation engine.
                    </p>
                </div>
                {/* Abstract Shapes */}
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-white opacity-5 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-[#1E3A8A] opacity-20 rounded-full blur-3xl" />
            </div>

            {/* Right Side - Form */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8">
                <div className="w-full max-w-md">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mb-8"
                    >
                        <Logo className="h-12 w-12" textClass="text-3xl" />
                        <h2 className="mt-8 text-2xl font-bold text-slate-800">Welcome back</h2>
                        <p className="text-slate-500 mt-2">Please enter your details to sign in.</p>
                    </motion.div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="text-sm font-medium text-slate-700">Email Address</label>
                            <input
                                type="email"
                                required
                                className="input-field mt-1"
                                placeholder="student@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium text-slate-700">Password</label>
                            <input
                                type="password"
                                required
                                className="input-field mt-1"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="btn-primary w-full flex justify-center items-center gap-2 py-3"
                        >
                            {isLoading ? <Loader2 className="animate-spin" /> : 'Sign In'}
                            {!isLoading && <ArrowRight size={18} />}
                        </button>
                    </form>

                    <p className="mt-8 text-center text-sm text-slate-500">
                        Don't have an account?{' '}
                        <Link to="/register" className="text-[#0F1A4D] font-semibold hover:underline">
                            Create account
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
