import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion'
import api from '../api';
import useAuthStore from '../store/authStore';
import { CheckCircle, XCircle, AlertTriangle, ArrowLeft, Download, Play, Image as ImageIcon } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const ResultPage = () => {
    const { resultId } = useParams();
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(true);
    const { user } = useAuthStore();

    useEffect(() => {
        api.get(`/exam/results/${resultId}`)
            .then(res => setResult(res.data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, [resultId]);

    if (loading) return <div className="min-h-screen bg-slate-50" />;

    // Determine color based on score
    const getScoreColor = (score, max) => {
        const percentage = (score / max) * 100;
        if (percentage >= 80) return 'text-green-600 bg-green-50 border-green-200';
        if (percentage >= 50) return 'text-amber-600 bg-amber-50 border-amber-200';
        return 'text-red-600 bg-red-50 border-red-200';
    };

    // Dynamic back link based on role
    const backLink = user?.role === 'admin' ? '/admin/results' : '/dashboard';
    const backText = user?.role === 'admin' ? 'Back to Recruitment Results' : 'Back to Dashboard';

    // Helper to get media URL
    const getMediaUrl = (url) => {
        if (!url) return '';
        return url.startsWith('http') ? url : `${API_URL}${url}`;
    };

    return (
        <div className="min-h-screen bg-slate-50 py-10 px-4">
            <div className="max-w-4xl mx-auto">

                {/* Header / Back Button */}
                <Link to={backLink} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-6 transition-colors">
                    <ArrowLeft size={20} /> {backText}
                </Link>

                {/* --- SCORE CARD --- */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-8 text-center relative overflow-hidden"
                >
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />

                    <h1 className="text-2xl font-bold text-slate-800 mb-2">Assessment Complete</h1>
                    <p className="text-slate-500 mb-8">Here is your AI-generated performance report.</p>

                    <div className="flex justify-center items-center">
                        <div className="relative w-48 h-48 flex items-center justify-center">
                            <div className="w-full h-full rounded-full border-8 border-slate-100 absolute" />
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 100, delay: 0.2 }}
                                className="w-full h-full rounded-full border-8 border-blue-600 border-t-transparent absolute animate-spin-slow"
                            />
                            <div className="text-center z-10">
                                <span className="text-5xl font-extrabold text-slate-800 block">
                                    {Math.round(result.total_score)}
                                </span>
                                <span className="text-slate-400 font-medium">Total Score</span>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* --- DETAILED BREAKDOWN --- */}
                <h2 className="text-xl font-bold text-slate-800 mb-6">Question Analysis</h2>

                <div className="space-y-6">
                    {result.breakdown.map((item, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
                        >
                            {/* Card Header */}
                            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <span className="bg-white border border-slate-200 text-slate-500 font-bold px-2 py-1 rounded text-sm">
                                        Q{index + 1}
                                    </span>
                                    <span className="font-semibold text-slate-700 capitalize">{item.type} Task</span>
                                </div>
                                <div className={`px-4 py-1 rounded-full text-sm font-bold border ${getScoreColor(item.student_score, item.max_marks)}`}>
                                    {item.student_score} / {item.max_marks} Marks
                                </div>
                            </div>

                            {/* Card Body */}
                            <div className="p-6">

                                {/* ========== MEDIA SECTION (NEW) ========== */}
                                {(item.type === 'video' || item.type === 'image') && (
                                    <div className="mb-6 space-y-4">
                                        {/* Media Display */}
                                        {item.type === 'video' && item.content_url && (
                                            <div className="rounded-xl overflow-hidden bg-black aspect-video shadow-md">
                                                <video
                                                    controls
                                                    controlsList="nodownload"
                                                    className="w-full h-full object-contain"
                                                    src={getMediaUrl(item.content_url)}
                                                >
                                                    Your browser does not support the video tag.
                                                </video>
                                            </div>
                                        )}

                                        {item.type === 'image' && item.content_url && (
                                            <div className="rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                                                <img
                                                    src={getMediaUrl(item.content_url)}
                                                    alt="Question Visual"
                                                    className="w-full h-auto max-h-[350px] object-contain mx-auto"
                                                />
                                            </div>
                                        )}

                                        {/* Question Prompt */}
                                        {item.question_text && (
                                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                                <p className="text-sm font-bold text-blue-600 uppercase tracking-wider mb-2">Question</p>
                                                <p className="text-slate-700 font-medium">{item.question_text}</p>
                                            </div>
                                        )}

                                        {/* Correct Answer (Reference) */}
                                        {item.correct_answer && (
                                            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                                                <p className="text-sm font-bold text-green-600 uppercase tracking-wider mb-2">
                                                    <CheckCircle className="inline w-4 h-4 mr-1" /> Expected Answer
                                                </p>
                                                <p className="text-slate-700">{item.correct_answer}</p>
                                            </div>
                                        )}

                                        {/* User's Answer */}
                                        <div className="bg-slate-100 border border-slate-300 rounded-xl p-4">
                                            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Your Answer</p>
                                            <p className="text-slate-800 font-medium">
                                                {item.student_answer || <span className="text-slate-400 italic">No answer provided</span>}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* ========== READING SECTION ========== */}
                                {item.type === 'reading' && (
                                    <div className="mb-6 space-y-4">
                                        {/* Reading Passage */}
                                        {item.passage && (
                                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 max-h-48 overflow-y-auto">
                                                <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Passage</p>
                                                <p className="text-slate-700 text-sm leading-relaxed">{item.passage}</p>
                                            </div>
                                        )}

                                        {/* Question */}
                                        {item.question_text && (
                                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                                <p className="text-sm font-bold text-blue-600 uppercase tracking-wider mb-2">Question</p>
                                                <p className="text-slate-700 font-medium">{item.question_text}</p>
                                            </div>
                                        )}

                                        {/* Correct Answer */}
                                        {item.correct_answer && (
                                            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                                                <p className="text-sm font-bold text-green-600 uppercase tracking-wider mb-2">
                                                    <CheckCircle className="inline w-4 h-4 mr-1" /> Expected Answer
                                                </p>
                                                <p className="text-slate-700">{item.correct_answer}</p>
                                            </div>
                                        )}

                                        {/* User's Answer */}
                                        <div className="bg-slate-100 border border-slate-300 rounded-xl p-4">
                                            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Your Answer</p>
                                            <p className="text-slate-800 font-medium">
                                                {item.student_answer || <span className="text-slate-400 italic">No answer provided</span>}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* ========== JUMBLE / MCQ SIMPLE SECTION ========== */}
                                {(item.type === 'jumble' || item.type.includes('mcq')) && (
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Outcome</h4>
                                            <div className={`text-lg font-bold flex items-center gap-2 ${item.student_score > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {item.student_score > 0 ? <CheckCircle /> : <XCircle />}
                                                {item.student_score > 0 ? "Correct Answer" : "Incorrect Answer"}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Your Answer</h4>
                                            <p className="text-slate-700 font-mono bg-slate-100 px-3 py-1 rounded">
                                                {item.ai_feedback?.student_answer || item.ai_feedback?.selected || "No answer"}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* ========== AI EVALUATION SECTION (for video/image/reading) ========== */}
                                {(item.type === 'video' || item.type === 'image' || item.type === 'reading') && (
                                    <div className="border-t border-slate-200 pt-6 mt-2">
                                        <h4 className="text-sm font-bold text-indigo-600 uppercase tracking-wider mb-4 flex items-center gap-2">
                                            <AlertTriangle size={16} /> AI Evaluation
                                        </h4>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Metrics */}
                                            <div className="space-y-4">
                                                {/* Grammar & Structure Bar (4 marks) */}
                                                <div>
                                                    <div className="flex justify-between text-sm mb-1">
                                                        <span className="text-slate-600">Grammar & Structure</span>
                                                        <span className="font-bold text-slate-800">{item.ai_feedback?.grammar_structure_score || 0}/4</span>
                                                    </div>
                                                    <div className="w-full bg-slate-100 rounded-full h-2">
                                                        <div
                                                            className="bg-blue-600 h-2 rounded-full"
                                                            style={{ width: `${((item.ai_feedback?.grammar_structure_score || 0) / 4) * 100}%` }}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Vocabulary Bar (4 marks) */}
                                                <div>
                                                    <div className="flex justify-between text-sm mb-1">
                                                        <span className="text-slate-600">Vocabulary & Word Choice</span>
                                                        <span className="font-bold text-slate-800">{item.ai_feedback?.vocabulary_word_choice_score || 0}/4</span>
                                                    </div>
                                                    <div className="w-full bg-slate-100 rounded-full h-2">
                                                        <div
                                                            className="bg-purple-600 h-2 rounded-full"
                                                            style={{ width: `${((item.ai_feedback?.vocabulary_word_choice_score || 0) / 4) * 100}%` }}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Clarity & Meaning Bar (3 marks) */}
                                                <div>
                                                    <div className="flex justify-between text-sm mb-1">
                                                        <span className="text-slate-600">Clarity & Meaning</span>
                                                        <span className="font-bold text-slate-800">{item.ai_feedback?.clarity_meaning_score || 0}/3</span>
                                                    </div>
                                                    <div className="w-full bg-slate-100 rounded-full h-2">
                                                        <div
                                                            className="bg-amber-500 h-2 rounded-full"
                                                            style={{ width: `${((item.ai_feedback?.clarity_meaning_score || 0) / 3) * 100}%` }}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Instruction Compliance Bar (2 marks) */}
                                                <div>
                                                    <div className="flex justify-between text-sm mb-1">
                                                        <span className="text-slate-600">Instruction Compliance</span>
                                                        <span className="font-bold text-slate-800">{item.ai_feedback?.instruction_compliance_score || 0}/2</span>
                                                    </div>
                                                    <div className="w-full bg-slate-100 rounded-full h-2">
                                                        <div
                                                            className="bg-indigo-600 h-2 rounded-full"
                                                            style={{ width: `${((item.ai_feedback?.instruction_compliance_score || 0) / 2) * 100}%` }}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Spelling & Formatting Bar (2 marks) */}
                                                <div>
                                                    <div className="flex justify-between text-sm mb-1">
                                                        <span className="text-slate-600">Spelling & Formatting</span>
                                                        <span className="font-bold text-slate-800">{item.ai_feedback?.spelling_formatting_score || 0}/2</span>
                                                    </div>
                                                    <div className="w-full bg-slate-100 rounded-full h-2">
                                                        <div
                                                            className="bg-green-600 h-2 rounded-full"
                                                            style={{ width: `${((item.ai_feedback?.spelling_formatting_score || 0) / 2) * 100}%` }}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Pass/Fail Indicator */}
                                                <div className={`mt-4 p-3 rounded-lg text-center font-bold ${item.ai_feedback?.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                    {item.ai_feedback?.passed ? '✓ PASSED (≥11/15)' : '✗ FAILED (<11/15)'}
                                                </div>
                                            </div>

                                            {/* Qualitative Feedback */}
                                            <div className="bg-slate-50 p-4 rounded-lg">
                                                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">AI Reasoning</h4>
                                                <p className="text-slate-700 text-sm leading-relaxed">
                                                    {item.ai_feedback?.feedback || "No specific feedback provided."}
                                                </p>

                                                {item.ai_feedback?.key_ideas_matched && (
                                                    <div className="mt-4 pt-4 border-t border-slate-200">
                                                        <p className="text-xs font-bold text-green-600 flex items-center gap-1">
                                                            <CheckCircle size={14} /> Key Ideas Matched: {item.ai_feedback.key_ideas_matched}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                            </div>
                        </motion.div>
                    ))}
                </div>

            </div>
        </div>
    );
};

export default ResultPage;
