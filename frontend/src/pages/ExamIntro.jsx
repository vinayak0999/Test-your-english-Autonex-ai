import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../api';
import { Clock, AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react';

const ExamIntro = () => {
    const { testId } = useParams();
    const navigate = useNavigate();
    const [test, setTest] = useState(null);

    useEffect(() => {
        // We reuse the single test fetch endpoint here
        api.get(`/exam/tests/${testId}`).then(res => setTest(res.data));
    }, [testId]);

    if (!test) return <div className="min-h-screen bg-slate-50" />;

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-card bg-white w-full max-w-3xl rounded-2xl shadow-xl overflow-hidden"
            >
                <div className="bg-blue-600 p-8 text-white">
                    <h1 className="text-3xl font-bold">{test.title}</h1>
                    <p className="opacity-90 mt-2">Please read the instructions carefully before starting.</p>
                </div>

                <div className="p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div className="bg-blue-50 p-4 rounded-xl flex items-center gap-4">
                            <div className="bg-blue-200 p-2 rounded-lg text-blue-800"><Clock /></div>
                            <div>
                                <p className="text-sm text-slate-500">Duration</p>
                                <p className="font-bold text-slate-800">{test.duration} Minutes</p>
                            </div>
                        </div>
                        <div className="bg-emerald-50 p-4 rounded-xl flex items-center gap-4">
                            <div className="bg-emerald-200 p-2 rounded-lg text-emerald-800"><CheckCircle /></div>
                            <div>
                                <p className="text-sm text-slate-500">Total Marks</p>
                                <p className="font-bold text-slate-800">100 Marks</p>
                            </div>
                        </div>
                    </div>

                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <AlertTriangle className="text-amber-500" size={20} />
                        Important Rules
                    </h3>
                    <ul className="space-y-3 text-slate-600 mb-8 ml-1">
                        <li className="flex items-start gap-2">
                            <span className="mt-2 w-1.5 h-1.5 bg-slate-400 rounded-full flex-shrink-0" />
                            <span>Do not switch tabs or minimize the window. The AI tracks focus loss.</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="mt-2 w-1.5 h-1.5 bg-slate-400 rounded-full flex-shrink-0" />
                            <span>Copy-pasting answers is disabled and will be flagged as plagiarism.</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="mt-2 w-1.5 h-1.5 bg-slate-400 rounded-full flex-shrink-0" />
                            <span>Ensure your internet connection is stable.</span>
                        </li>
                    </ul>

                    <div className="flex justify-end gap-4 border-t pt-6">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="px-6 py-3 text-slate-500 font-medium hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => navigate(`/exam/${testId}/start`)}
                            className="btn-primary flex items-center gap-2 text-lg shadow-blue-300 shadow-lg hover:shadow-xl"
                        >
                            Start Assessment <ArrowRight size={20} />
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default ExamIntro;
