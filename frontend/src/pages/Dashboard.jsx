import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import useAuthStore from '../store/authStore';
import Logo from '../components/Logo';
import { Clock, Award, PlayCircle, LogOut, Loader2, CheckCircle, Eye } from 'lucide-react';

const Dashboard = () => {
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();
    const [tests, setTests] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTests();
    }, []);

    const fetchTests = async () => {
        try {
            const res = await api.get('/exam/available-tests');
            setTests(res.data);
        } catch (err) {
            console.error("Failed to load tests", err);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // Animation variants for the card grid
    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const item = {
        hidden: { y: 20, opacity: 0 },
        show: { y: 0, opacity: 1 }
    };

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Navbar */}
            <nav className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm sticky top-0 z-10">
                <Logo />
                <div className="flex items-center gap-4">
                    <div className="hidden md:block text-right">
                        <p className="text-sm font-bold text-slate-800">{user?.name}</p>
                        <p className="text-xs text-slate-500 uppercase">{user?.role}</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                        title="Logout"
                    >
                        <LogOut size={20} />
                    </button>
                </div>
            </nav>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 py-10">
                <header className="mb-10">
                    <h1 className="text-3xl font-bold text-slate-800">Available Tests</h1>
                    <p className="text-slate-500 mt-2">Select a test module to verify your English proficiency.</p>
                </header>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="animate-spin text-[#0F1A4D] h-10 w-10" />
                    </div>
                ) : tests.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-slate-200">
                        <h3 className="text-xl font-semibold text-slate-600">No Tests Available</h3>
                        <p className="text-slate-400 mt-2">Please ask your admin to assign a test.</p>
                    </div>
                ) : (
                    <motion.div
                        variants={container}
                        initial="hidden"
                        animate="show"
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                    >
                        {tests.map((test) => (
                            <motion.div
                                key={test.id}
                                variants={item}
                                whileHover={{ y: -5 }}
                                className={`glass-card bg-white rounded-2xl p-6 border shadow-sm hover:shadow-xl transition-all duration-300 group ${test.completed ? 'border-green-200' : 'border-slate-100'}`}
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`p-3 rounded-xl transition-colors duration-300 ${test.completed ? 'bg-green-100 text-green-700' : 'bg-[#0F1A4D]/10 text-[#0F1A4D] group-hover:bg-[#0F1A4D] group-hover:text-white'}`}>
                                        {test.completed ? <CheckCircle size={24} /> : <Award size={24} />}
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <span className="bg-slate-100 text-slate-600 text-xs font-bold px-3 py-1 rounded-full">
                                            {test.total_marks} Marks
                                        </span>
                                        {test.completed && (
                                            <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full">
                                                ✓ Completed
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <h3 className="text-xl font-bold text-slate-800 mb-2">{test.title}</h3>

                                <div className="flex items-center gap-4 text-sm text-slate-500 mb-6">
                                    <div className="flex items-center gap-1">
                                        <Clock size={16} />
                                        <span>{test.duration} mins</span>
                                    </div>
                                    <div className="w-1 h-1 bg-slate-300 rounded-full" />
                                    <span>Interactive AI</span>
                                </div>

                                {test.completed ? (
                                    <button
                                        onClick={() => navigate(`/results/${test.result_id}`)}
                                        className="w-full py-3 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Eye size={18} />
                                        View Results
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => navigate(`/exam/${test.id}/intro`)}
                                        className="w-full py-3 rounded-lg border-2 border-[#0F1A4D] text-[#0F1A4D] font-semibold hover:bg-[#0F1A4D] hover:text-white transition-all flex items-center justify-center gap-2"
                                    >
                                        <PlayCircle size={18} />
                                        Start Assessment
                                    </button>
                                )}
                            </motion.div>
                        ))}
                    </motion.div>
                )}

                {/* My Past Results Section - Shows all results including inactive tests */}
                <MyResultsSection />
            </main>
        </div>
    );
};

// Separate component for My Results Section
const MyResultsSection = () => {
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchResults = async () => {
            try {
                const res = await api.get('/exam/my-results');
                setResults(res.data);
            } catch (err) {
                console.error("Failed to load results", err);
            } finally {
                setLoading(false);
            }
        };
        fetchResults();
    }, []);

    if (loading || results.length === 0) return null;

    return (
        <div className="mt-12">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">My Past Results</h2>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr className="text-xs uppercase text-slate-500 font-bold tracking-wider">
                            <th className="px-6 py-4 text-left">Test</th>
                            <th className="px-6 py-4 text-left">Date</th>
                            <th className="px-6 py-4 text-center">Score</th>
                            <th className="px-6 py-4 text-center">Status</th>
                            <th className="px-6 py-4 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {results.map((r) => (
                            <tr key={r.result_id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className="font-semibold text-slate-800">{r.test_title}</span>
                                        {!r.test_active && (
                                            <span className="text-xs text-amber-600">Test is now inactive</span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-slate-500 text-sm">{r.completed_at}</td>
                                <td className="px-6 py-4 text-center">
                                    <span className={`font-bold ${r.percentage >= 60 ? 'text-green-600' : 'text-red-600'}`}>
                                        {r.total_score}/{r.max_marks}
                                    </span>
                                    <span className="text-xs text-slate-400 ml-1">({r.percentage}%)</span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    {r.percentage >= 60 ? (
                                        <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full">Passed</span>
                                    ) : (
                                        <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-full">Failed</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button
                                        onClick={() => navigate(`/results/${r.result_id}`)}
                                        className="text-[#0F1A4D] hover:text-[#1E3A8A] font-medium text-sm flex items-center gap-1 ml-auto"
                                    >
                                        <Eye size={16} /> View
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Dashboard;
