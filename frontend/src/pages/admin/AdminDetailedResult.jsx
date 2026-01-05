import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api';
import { ArrowLeft, User, FileText, AlertTriangle, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

const AdminDetailedResult = () => {
    const { resultId } = useParams();
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchResult = async () => {
            try {
                const res = await api.get(`/admin/results/${resultId}`);
                setResult(res.data);
            } catch (err) {
                setError(err.response?.data?.detail || "Failed to load result");
            } finally {
                setLoading(false);
            }
        };
        fetchResult();
    }, [resultId]);

    if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
    if (error) return <div className="text-center py-20 text-red-600">{error}</div>;

    return (
        <div>
            {/* Header */}
            <Link to="/admin/results" className="flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-6 transition-colors">
                <ArrowLeft size={20} /> Back to Results
            </Link>

            {/* Candidate Info Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8"
            >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-800">{result.candidate?.name}</h1>
                            <p className="text-slate-500">{result.candidate?.email}</p>
                        </div>
                    </div>
                    <div className="flex gap-6 text-sm">
                        <div className="text-center">
                            <p className="text-slate-400 font-medium">Test</p>
                            <p className="text-slate-700 font-semibold">{result.test?.title}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-slate-400 font-medium">Score</p>
                            <p className={`text-2xl font-bold ${result.percentage >= 60 ? 'text-green-600' : 'text-red-600'}`}>
                                {result.total_score}/{result.max_marks}
                            </p>
                        </div>
                        <div className="text-center">
                            <p className="text-slate-400 font-medium">Tab Switches</p>
                            <p className={`text-2xl font-bold ${result.tab_switches > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                                {result.tab_switches}
                            </p>
                        </div>
                    </div>
                </div>
                {result.tab_switches > 0 && (
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-amber-800">
                        <AlertTriangle size={18} />
                        <span>This candidate switched tabs {result.tab_switches} times during the exam.</span>
                    </div>
                )}
            </motion.div>

            {/* Detailed Question Breakdown */}
            <h2 className="text-xl font-bold text-slate-800 mb-6">Question-by-Question Analysis</h2>

            <div className="space-y-6">
                {result.breakdown?.map((item, index) => (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
                    >
                        {/* Question Header */}
                        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <span className="bg-white border border-slate-200 text-slate-500 font-bold px-3 py-1 rounded text-sm">
                                    Q{index + 1}
                                </span>
                                <span className="font-semibold text-slate-700 capitalize">{item.type} Question</span>
                            </div>
                            <div className={`px-4 py-1 rounded-full text-sm font-bold ${item.student_score >= item.max_marks * 0.7
                                    ? 'bg-green-100 text-green-700 border border-green-200'
                                    : item.student_score >= item.max_marks * 0.4
                                        ? 'bg-amber-100 text-amber-700 border border-amber-200'
                                        : 'bg-red-100 text-red-700 border border-red-200'
                                }`}>
                                {item.student_score} / {item.max_marks} Marks
                            </div>
                        </div>

                        {/* Question Body */}
                        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Correct Answer */}
                            <div>
                                <h4 className="text-xs font-bold text-green-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                                    <CheckCircle size={14} /> Correct Answer
                                </h4>
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                    <p className="text-slate-700 text-sm whitespace-pre-wrap">{item.correct_answer || "N/A"}</p>
                                </div>
                            </div>

                            {/* User's Answer */}
                            <div>
                                <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                                    <User size={14} /> User's Answer
                                </h4>
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <p className="text-slate-700 text-sm whitespace-pre-wrap">{item.student_answer || "No answer provided"}</p>
                                </div>
                            </div>

                            {/* AI Feedback */}
                            {item.ai_feedback && (
                                <div className="lg:col-span-2">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">AI Evaluation</h4>
                                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                                        {/* Rubric Scores */}
                                        {item.ai_feedback.grammar_structure_score !== undefined && (
                                            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
                                                <div className="text-center p-2 bg-white rounded border">
                                                    <p className="text-xs text-slate-400">Grammar</p>
                                                    <p className="font-bold text-slate-700">{item.ai_feedback.grammar_structure_score}/4</p>
                                                </div>
                                                <div className="text-center p-2 bg-white rounded border">
                                                    <p className="text-xs text-slate-400">Vocabulary</p>
                                                    <p className="font-bold text-slate-700">{item.ai_feedback.vocabulary_word_choice_score}/4</p>
                                                </div>
                                                <div className="text-center p-2 bg-white rounded border">
                                                    <p className="text-xs text-slate-400">Clarity</p>
                                                    <p className="font-bold text-slate-700">{item.ai_feedback.clarity_meaning_score}/3</p>
                                                </div>
                                                <div className="text-center p-2 bg-white rounded border">
                                                    <p className="text-xs text-slate-400">Compliance</p>
                                                    <p className="font-bold text-slate-700">{item.ai_feedback.instruction_compliance_score}/2</p>
                                                </div>
                                                <div className="text-center p-2 bg-white rounded border">
                                                    <p className="text-xs text-slate-400">Spelling</p>
                                                    <p className="font-bold text-slate-700">{item.ai_feedback.spelling_formatting_score}/2</p>
                                                </div>
                                            </div>
                                        )}
                                        <p className="text-slate-600 text-sm">{item.ai_feedback.feedback || "No additional feedback."}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default AdminDetailedResult;
