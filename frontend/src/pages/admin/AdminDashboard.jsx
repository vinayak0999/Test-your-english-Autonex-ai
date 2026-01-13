import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import useAdminStore from '../../store/adminStore';
import { StatCardSkeleton, TestCardSkeleton } from '../../components/Skeleton';
import { Plus, Clock, FileText, Users, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';

const AdminDashboard = () => {
    // Use cached data from store
    const {
        tests,
        testsLoaded,
        testsLoading,
        stats,
        statsLoaded,
        fetchTests,
        fetchStats
    } = useAdminStore();

    useEffect(() => {
        // Fetch without force - will use cache if available
        fetchTests();
        fetchStats();
    }, []);

    const isLoading = !testsLoaded && tests.length === 0;

    return (
        <div>
            <header className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Dashboard</h1>
                    <p className="text-slate-500">Manage your tests and view results.</p>
                </div>
                <Link
                    to="/admin/create-test"
                    className="btn-primary flex items-center gap-2 shadow-lg shadow-blue-200"
                >
                    <Plus size={20} /> Create New Test
                </Link>
            </header>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                {!statsLoaded ? (
                    <>
                        <StatCardSkeleton />
                        <StatCardSkeleton />
                        <StatCardSkeleton />
                        <StatCardSkeleton />
                    </>
                ) : (
                    <>
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                            <div className="flex items-center gap-3 mb-2">
                                <FileText className="text-[#0F1A4D]" size={20} />
                                <p className="text-slate-500 text-sm font-medium">Total Tests</p>
                            </div>
                            <h3 className="text-3xl font-bold text-slate-800">{stats.total_tests}</h3>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                            <div className="flex items-center gap-3 mb-2">
                                <Users className="text-green-600" size={20} />
                                <p className="text-slate-500 text-sm font-medium">Total Students</p>
                            </div>
                            <h3 className="text-3xl font-bold text-green-600">{stats.total_students}</h3>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                            <div className="flex items-center gap-3 mb-2">
                                <BarChart3 className="text-[#0F1A4D]" size={20} />
                                <p className="text-slate-500 text-sm font-medium">Total Submissions</p>
                            </div>
                            <h3 className="text-3xl font-bold text-[#0F1A4D]">{stats.total_submissions}</h3>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                            <div className="flex items-center gap-3 mb-2">
                                <Clock className="text-amber-600" size={20} />
                                <p className="text-slate-500 text-sm font-medium">Active Tests</p>
                            </div>
                            <h3 className="text-3xl font-bold text-amber-600">{stats.active_tests}</h3>
                        </div>
                    </>
                )}
            </div>

            <h2 className="text-xl font-bold text-slate-800 mb-6">All Tests</h2>

            {isLoading ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <TestCardSkeleton />
                    <TestCardSkeleton />
                    <TestCardSkeleton />
                    <TestCardSkeleton />
                </div>
            ) : tests.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300">
                    <p className="text-slate-500 mb-4">You haven't created any tests yet.</p>
                    <Link to="/admin/create-test" className="text-blue-600 font-semibold hover:underline">Get started</Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {tests.map((test) => (
                        <motion.div
                            key={test.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow group"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                    <FileText size={24} />
                                </div>
                                <span className={`text-xs font-bold px-3 py-1 rounded-full ${test.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {test.is_active ? 'Active' : 'Inactive'}
                                </span>
                            </div>

                            <h3 className="text-lg font-bold text-slate-800 mb-2">{test.title}</h3>

                            <div className="flex items-center gap-6 text-sm text-slate-500 mt-4">
                                <span className="flex items-center gap-1"><Clock size={16} /> {test.duration_minutes || test.duration} mins</span>
                                <span>•</span>
                                <span>{test.total_marks} Marks</span>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
