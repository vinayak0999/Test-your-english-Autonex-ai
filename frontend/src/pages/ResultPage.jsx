import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../api';
import useAuthStore from '../store/authStore';
import {
    CheckCircle, XCircle, AlertTriangle, ArrowLeft,
    Gauge, Target, Star, ThumbsDown, Minus
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const VISUAL_TYPES  = ['video', 'video-robot', 'image'];
const TYPING_TYPES  = ['typing', 'typing-easy', 'typing-advanced'];

// ─── Rank badge ──────────────────────────────────────────────────────────────
const RankBadge = ({ rank }) => {
    const cfg = {
        Good:   { bg: 'bg-green-100',  border: 'border-green-400',  text: 'text-green-700',  icon: <Star    size={18} />, label: 'Good'   },
        Medium: { bg: 'bg-amber-100',  border: 'border-amber-400',  text: 'text-amber-700',  icon: <Minus   size={18} />, label: 'Medium' },
        Bad:    { bg: 'bg-red-100',    border: 'border-red-400',    text: 'text-red-700',    icon: <ThumbsDown size={18} />, label: 'Bad'    },
    };
    const c = cfg[rank] || cfg.Bad;
    return (
        <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold border ${c.bg} ${c.border} ${c.text}`}>
            {c.icon} {c.label}
        </span>
    );
};

// ─── Header score badge (only for MCQ/Jumble/Reading) ───────────────────────
const ScoreBadge = ({ score, max }) => {
    const pct = max > 0 ? (score / max) * 100 : 0;
    const cls = pct >= 80
        ? 'text-green-600 bg-green-50 border-green-200'
        : pct >= 50
            ? 'text-amber-600 bg-amber-50 border-amber-200'
            : 'text-red-600 bg-red-50 border-red-200';
    return (
        <span className={`px-4 py-1 rounded-full text-sm font-bold border ${cls}`}>
            {score} / {max} Marks
        </span>
    );
};

const ResultPage = () => {
    const { resultId } = useParams();
    const [result, setResult]   = useState(null);
    const [loading, setLoading] = useState(true);
    const { user } = useAuthStore();

    useEffect(() => {
        api.get(`/exam/results/${resultId}`)
            .then(res => setResult(res.data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, [resultId]);

    if (loading) return <div className="min-h-screen bg-slate-50" />;

    const backLink = user?.role === 'admin' ? '/admin/results' : '/dashboard';
    const backText = user?.role === 'admin' ? 'Back to Recruitment Results' : 'Back to Dashboard';

    const getMediaUrl = (url) => {
        if (!url) return '';
        return url.startsWith('http') ? url : `${API_URL}${url}`;
    };

    return (
        <div className="min-h-screen bg-slate-50 py-10 px-4">
            <div className="max-w-4xl mx-auto">

                {/* Back */}
                <Link to={backLink} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-6 transition-colors">
                    <ArrowLeft size={20} /> {backText}
                </Link>

                {/* Score Card */}
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
                                transition={{ type: 'spring', stiffness: 100, delay: 0.2 }}
                                className="w-full h-full rounded-full border-8 border-blue-600 border-t-transparent absolute animate-spin-slow"
                            />
                            <div className="text-center z-10">
                                <span className="text-5xl font-extrabold text-slate-800 block">
                                    {Math.round(result.total_score)}
                                </span>
                                <span className="text-slate-400 font-medium">MCQ Score %</span>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Question Analysis */}
                <h2 className="text-xl font-bold text-slate-800 mb-6">Question Analysis</h2>

                <div className="space-y-6">
                    {result.breakdown.map((item, index) => {
                        const isVisual = VISUAL_TYPES.includes(item.type);
                        const isTyping = TYPING_TYPES.includes(item.type);
                        const rank     = item.ai_feedback?.rank;
                        const fb       = item.ai_feedback || {};

                        return (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.08 }}
                                className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
                            >
                                {/* ── Card Header ── */}
                                <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <span className="bg-white border border-slate-200 text-slate-500 font-bold px-2 py-1 rounded text-sm">
                                            Q{index + 1}
                                        </span>
                                        <span className="font-semibold text-slate-700 capitalize">
                                            {item.type.replace('-', ' ')} Task
                                        </span>
                                    </div>

                                    {/* Header badge: rank for visual, pass/fail for typing, marks for rest */}
                                    {isVisual && rank && <RankBadge rank={rank} />}

                                    {isTyping && (
                                        <span className={`px-4 py-1 rounded-full text-sm font-bold border ${fb.passed ? 'text-green-600 bg-green-50 border-green-200' : 'text-red-600 bg-red-50 border-red-200'}`}>
                                            {fb.passed ? '✓ Pass' : '✗ Fail'}
                                        </span>
                                    )}

                                    {!isVisual && !isTyping && (
                                        <ScoreBadge score={item.student_score} max={item.max_marks} />
                                    )}
                                </div>

                                {/* ── Card Body ── */}
                                <div className="p-6">

                                    {/* ══ VISUAL (video / video-robot / image) ══ */}
                                    {isVisual && (
                                        <div className="space-y-4">
                                            {/* Media */}
                                            {(item.type === 'video' || item.type === 'video-robot') && item.content_url && (
                                                <div className="rounded-xl overflow-hidden bg-black aspect-video shadow-md">
                                                    <video controls controlsList="nodownload" className="w-full h-full object-contain" src={getMediaUrl(item.content_url)}>
                                                        Your browser does not support the video tag.
                                                    </video>
                                                </div>
                                            )}
                                            {item.type === 'image' && item.content_url && (
                                                <div className="rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                                                    <img src={getMediaUrl(item.content_url)} alt="Question Visual" className="w-full h-auto max-h-[350px] object-contain mx-auto" />
                                                </div>
                                            )}

                                            {/* Question prompt */}
                                            {item.question_text && (
                                                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                                    <p className="text-sm font-bold text-blue-600 uppercase tracking-wider mb-1">Task</p>
                                                    <p className="text-slate-700 font-medium">{item.question_text}</p>
                                                </div>
                                            )}

                                            {/* Student answer */}
                                            <div className="bg-slate-100 border border-slate-300 rounded-xl p-4">
                                                <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Your Answer</p>
                                                <p className="text-slate-800 font-medium">
                                                    {item.student_answer || <span className="text-slate-400 italic">No answer provided</span>}
                                                </p>
                                            </div>

                                            {/* AI Rank panel */}
                                            <div className="border border-slate-200 rounded-xl p-4">
                                                <p className="text-sm font-bold text-indigo-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                                                    <AlertTriangle size={15} /> AI Evaluation
                                                </p>
                                                <div className="flex items-center gap-4 mb-3">
                                                    <RankBadge rank={rank || 'Bad'} />
                                                    <span className="text-xs text-slate-400">Good ≥12 · Medium 7-11 · Bad &lt;7 (out of 15)</span>
                                                </div>
                                                {fb.feedback && (
                                                    <p className="text-sm text-slate-600 leading-relaxed">{fb.feedback}</p>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* ══ TYPING ══ */}
                                    {isTyping && (
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                <div className="bg-slate-50 rounded-xl p-4 text-center border border-slate-200">
                                                    <Gauge size={22} className="mx-auto mb-1 text-blue-500" />
                                                    <p className="text-2xl font-extrabold text-slate-800">{fb.net_wpm ?? '—'}</p>
                                                    <p className="text-xs text-slate-400 mt-0.5">Net WPM</p>
                                                </div>
                                                <div className="bg-slate-50 rounded-xl p-4 text-center border border-slate-200">
                                                    <Target size={22} className="mx-auto mb-1 text-indigo-500" />
                                                    <p className="text-2xl font-extrabold text-slate-800">{fb.accuracy != null ? `${fb.accuracy}%` : '—'}</p>
                                                    <p className="text-xs text-slate-400 mt-0.5">Accuracy</p>
                                                </div>
                                                <div className="bg-slate-50 rounded-xl p-4 text-center border border-slate-200">
                                                    <p className="text-xs text-slate-400 mb-1">Benchmark WPM</p>
                                                    <p className="text-2xl font-extrabold text-slate-500">30</p>
                                                    <p className="text-xs text-slate-400 mt-0.5">Target</p>
                                                </div>
                                                <div className={`rounded-xl p-4 text-center border ${fb.passed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                                    <p className={`text-2xl font-extrabold ${fb.passed ? 'text-green-600' : 'text-red-600'}`}>
                                                        {fb.passed ? 'PASS' : 'FAIL'}
                                                    </p>
                                                    <p className="text-xs text-slate-400 mt-0.5">Accuracy ≥ 80%</p>
                                                </div>
                                            </div>
                                            {fb.feedback && (
                                                <p className="text-sm text-slate-500 italic">{fb.feedback}</p>
                                            )}
                                        </div>
                                    )}

                                    {/* ══ READING ══ */}
                                    {item.type === 'reading' && (
                                        <div className="space-y-4">
                                            {item.passage && (
                                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 max-h-48 overflow-y-auto">
                                                    <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Passage</p>
                                                    <p className="text-slate-700 text-sm leading-relaxed">{item.passage}</p>
                                                </div>
                                            )}
                                            {item.correct_answer && (
                                                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                                                    <p className="text-sm font-bold text-green-600 uppercase tracking-wider mb-2"><CheckCircle className="inline w-4 h-4 mr-1" /> Expected Answer</p>
                                                    <p className="text-slate-700">{item.correct_answer}</p>
                                                </div>
                                            )}
                                            <div className="bg-slate-100 border border-slate-300 rounded-xl p-4">
                                                <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Your Answer</p>
                                                <p className="text-slate-800 font-medium">{item.student_answer || <span className="text-slate-400 italic">No answer provided</span>}</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* ══ MCQ-MULTI-IMAGE ══ */}
                                    {item.type === 'mcq-multi-image' && item.sub_images_breakdown && (
                                        <div className="space-y-4">
                                            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                                                <p className="text-sm font-semibold text-indigo-700">{item.question_text}</p>
                                            </div>
                                            {item.sub_images_breakdown.map((sub, si) => (
                                                <div key={si} className={`border rounded-xl overflow-hidden ${sub.is_correct ? 'border-green-300' : 'border-red-300'}`}>
                                                    <div className={`px-4 py-2 flex justify-between items-center ${sub.is_correct ? 'bg-green-50' : 'bg-red-50'}`}>
                                                        <span className="text-sm font-bold text-slate-600">Image {si + 1}</span>
                                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${sub.is_correct ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                                                            {sub.score}/{sub.max_marks} Marks
                                                        </span>
                                                    </div>
                                                    {sub.image_url && (
                                                        <div className="bg-slate-100 p-2">
                                                            <img src={getMediaUrl(sub.image_url)} alt={`Sub-image ${si+1}`} className="w-full max-h-48 object-contain rounded" />
                                                        </div>
                                                    )}
                                                    <div className="p-4 grid grid-cols-2 gap-3">
                                                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                                            <p className="text-xs font-bold text-green-600 uppercase mb-1">✓ Correct</p>
                                                            <p className="text-sm text-slate-700 font-medium">{sub.correct_answer_text} ({sub.correct_answer})</p>
                                                        </div>
                                                        <div className={`border rounded-lg p-3 ${sub.is_correct ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                                            <p className={`text-xs font-bold uppercase mb-1 ${sub.is_correct ? 'text-green-600' : 'text-red-600'}`}>Your Answer</p>
                                                            <p className="text-sm text-slate-700 font-medium">{sub.student_answer_text} ({sub.student_answer})</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* ══ MCQ / JUMBLE / IMAGE-COUNT (non-multi-image) ══ */}
                                    {item.type !== 'mcq-multi-image' && (item.type === 'jumble' || (item.type || '').includes('mcq') || item.type === 'image-count') && (
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Outcome</h4>
                                                <div className={`text-lg font-bold flex items-center gap-2 ${item.student_score > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                    {item.student_score > 0 ? <CheckCircle /> : <XCircle />}
                                                    {item.student_score > 0 ? 'Correct Answer' : 'Incorrect Answer'}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Your Answer</h4>
                                                <p className="text-slate-700 font-mono bg-slate-100 px-3 py-1 rounded">
                                                    {item.type === 'image-count'
                                                        ? (item.student_answer || <span className="text-slate-400 italic">No answer</span>)
                                                        : (fb.student_answer || fb.selected || item.student_answer || 'No answer')}
                                                </p>
                                                {item.type === 'image-count' && (
                                                    <p className="text-xs text-slate-400 mt-1">Correct count: {item.correct_answer}</p>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                </div>
                            </motion.div>
                        );
                    })}
                </div>

            </div>
        </div>
    );
};

export default ResultPage;
