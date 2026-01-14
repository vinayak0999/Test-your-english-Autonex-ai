import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api';
import { ArrowLeft, User, FileText, AlertTriangle, CheckCircle, XCircle, Loader2, Image as ImageIcon, Video, List, Shuffle, Edit3, Save, X } from 'lucide-react';
import { motion } from 'framer-motion';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const AdminDetailedResult = () => {
    const { resultId } = useParams();
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Score editing state
    const [editingQuestion, setEditingQuestion] = useState(null);
    const [editScore, setEditScore] = useState('');
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState(null);

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

    // Helper to get media URL
    const getMediaUrl = (url) => {
        if (!url) return '';
        return url.startsWith('http') ? url : `${API_URL}${url}`;
    };

    // Helper to check if a string is a URL (for image/video)
    const isMediaUrl = (str) => {
        if (!str) return false;
        return str.startsWith('http://') || str.startsWith('https://') || str.startsWith('/static/');
    };

    // Helper to determine if URL is an image
    const isImageUrl = (url) => {
        if (!url) return false;
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
        const lowerUrl = url.toLowerCase();
        return imageExtensions.some(ext => lowerUrl.includes(ext)) ||
            lowerUrl.includes('unsplash') ||
            lowerUrl.includes('imgur') ||
            lowerUrl.includes('cloudinary');
    };

    // Helper to determine if URL is a video
    const isVideoUrl = (url) => {
        if (!url) return false;
        const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi'];
        const lowerUrl = url.toLowerCase();
        return videoExtensions.some(ext => lowerUrl.includes(ext));
    };

    // Start editing a question's score
    const startEditing = (questionId, currentScore) => {
        setEditingQuestion(questionId);
        setEditScore(currentScore.toString());
        setSaveError(null);
    };

    // Cancel editing
    const cancelEditing = () => {
        setEditingQuestion(null);
        setEditScore('');
        setSaveError(null);
    };

    // Save the override score
    const saveScore = async (questionId, maxMarks) => {
        // Round to 1 decimal place to avoid floating point issues
        const newScore = Math.round(parseFloat(editScore) * 10) / 10;

        if (isNaN(newScore)) {
            setSaveError('Please enter a valid number');
            return;
        }
        if (newScore < 0) {
            setSaveError('Score cannot be negative');
            return;
        }
        if (newScore > maxMarks) {
            setSaveError(`Score cannot exceed ${maxMarks}`);
            return;
        }

        setSaving(true);
        setSaveError(null);

        try {
            const res = await api.patch(`/admin/results/${resultId}/questions/${questionId}`, {
                new_score: newScore
            });

            // Update local state with new scores
            setResult(prev => ({
                ...prev,
                total_score: res.data.new_total,
                status: 'reviewed',  // Update status to show reviewed banner
                breakdown: prev.breakdown.map(item =>
                    item.question_id === questionId
                        ? { ...item, override_score: newScore, student_score: item.student_score }
                        : item
                )
            }));

            setEditingQuestion(null);
            setEditScore('');
        } catch (err) {
            setSaveError(err.response?.data?.detail || 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    // Get display score (override if exists, otherwise student score)
    const getDisplayScore = (item) => {
        const score = item.override_score !== undefined ? item.override_score : item.student_score;
        // Round to 1 decimal for display
        return Math.round(score * 10) / 10;
    };

    // Handle keyboard events for editing
    const handleKeyDown = (e, questionId, maxMarks) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveScore(questionId, maxMarks);
        } else if (e.key === 'Escape') {
            cancelEditing();
        }
    };

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
                            <p className={`text-2xl font-bold ${(result.total_score / result.max_marks * 100) >= 60 ? 'text-green-600' : 'text-red-600'}`}>
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
                {result.status === 'reviewed' && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2 text-blue-800">
                        <CheckCircle size={18} />
                        <span>This result has been reviewed manually.</span>
                    </div>
                )}
            </motion.div>

            {/* Detailed Question Breakdown */}
            <h2 className="text-xl font-bold text-slate-800 mb-6">Question-by-Question Analysis</h2>

            <div className="space-y-6">
                {result.breakdown?.map((item, index) => {
                    // Determine the media URL - check multiple possible fields
                    const mediaUrl = item.content_url ||
                        (isMediaUrl(item.question_text) ? item.question_text : null);

                    // Check if this is an image or video question (by type or by URL)
                    const hasImage = item.type === 'image' || (mediaUrl && isImageUrl(mediaUrl));
                    const hasVideo = item.type === 'video' || (mediaUrl && isVideoUrl(mediaUrl));

                    // Check if this is MCQ or Jumble
                    const isMCQ = item.type?.includes('mcq');
                    const isJumble = item.type === 'jumble';

                    // Get options and jumble parts
                    const options = item.options || {};
                    const jumbleParts = item.jumble || {};
                    const hasOptions = Object.keys(options).length > 0;
                    const hasJumbleParts = Object.keys(jumbleParts).length > 0;

                    // Score display
                    const displayScore = getDisplayScore(item);
                    const isOverridden = item.override_score !== undefined;
                    const isEditing = editingQuestion === item.question_id;

                    return (
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
                                    <span className="font-semibold text-slate-700 capitalize">{item.type?.replace('mcq_', 'MCQ ')} Question</span>
                                    {isOverridden && (
                                        <span className="bg-amber-100 text-amber-700 text-xs px-2 py-1 rounded-full">
                                            Reviewed
                                        </span>
                                    )}
                                </div>

                                {/* SCORE SECTION - Editable */}
                                <div className="flex items-center gap-2">
                                    {isEditing ? (
                                        // Edit Mode
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                value={editScore}
                                                onChange={(e) => setEditScore(e.target.value)}
                                                onKeyDown={(e) => handleKeyDown(e, item.question_id, item.max_marks)}
                                                className="w-20 px-2 py-1 border border-blue-300 rounded text-center font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                min="0"
                                                max={item.max_marks}
                                                step="0.5"
                                                autoFocus
                                                disabled={saving}
                                            />
                                            <span className="text-slate-500">/ {item.max_marks}</span>
                                            <button
                                                onClick={() => saveScore(item.question_id, item.max_marks)}
                                                disabled={saving}
                                                className="p-1 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                                                title="Save"
                                            >
                                                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                            </button>
                                            <button
                                                onClick={cancelEditing}
                                                disabled={saving}
                                                className="p-1 bg-slate-400 text-white rounded hover:bg-slate-500 disabled:opacity-50"
                                                title="Cancel (Esc)"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ) : (
                                        // Display Mode
                                        <div className="flex items-center gap-2">
                                            <div className={`px-4 py-1 rounded-full text-sm font-bold ${displayScore >= item.max_marks * 0.7
                                                ? 'bg-green-100 text-green-700 border border-green-200'
                                                : displayScore >= item.max_marks * 0.4
                                                    ? 'bg-amber-100 text-amber-700 border border-amber-200'
                                                    : 'bg-red-100 text-red-700 border border-red-200'
                                                }`}>
                                                {displayScore} / {item.max_marks} Marks
                                            </div>
                                            <button
                                                onClick={() => startEditing(item.question_id, displayScore)}
                                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                title="Edit Score"
                                            >
                                                <Edit3 size={16} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Save Error Message */}
                            {isEditing && saveError && (
                                <div className="px-6 py-2 bg-red-50 text-red-600 text-sm">
                                    {saveError}
                                </div>
                            )}

                            {/* Question Body */}
                            <div className="p-6">

                                {/* ========== IMAGE DISPLAY ========== */}
                                {hasImage && mediaUrl && (
                                    <div className="mb-6">
                                        <h4 className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-3 flex items-center gap-1">
                                            <ImageIcon size={14} /> Question Image
                                        </h4>
                                        <div className="rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                                            <img
                                                src={getMediaUrl(mediaUrl)}
                                                alt="Question Visual"
                                                className="w-full h-auto max-h-[400px] object-contain mx-auto"
                                                onError={(e) => {
                                                    e.target.style.display = 'none';
                                                }}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* ========== VIDEO DISPLAY ========== */}
                                {hasVideo && mediaUrl && (
                                    <div className="mb-6">
                                        <h4 className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-3 flex items-center gap-1">
                                            <Video size={14} /> Question Video
                                        </h4>
                                        <div className="rounded-xl overflow-hidden bg-black aspect-video shadow-md">
                                            <video
                                                controls
                                                controlsList="nodownload"
                                                className="w-full h-full object-contain"
                                                src={getMediaUrl(mediaUrl)}
                                            >
                                                Your browser does not support the video tag.
                                            </video>
                                        </div>
                                    </div>
                                )}

                                {/* ========== MCQ QUESTION WITH OPTIONS ========== */}
                                {isMCQ && (
                                    <div className="mb-6">
                                        {/* Question Text */}
                                        {item.question_text && !isMediaUrl(item.question_text) && (
                                            <div className="mb-4">
                                                <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                                                    <List size={14} /> Question
                                                </h4>
                                                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                                                    <p className="text-slate-700">{item.question_text}</p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Options */}
                                        {hasOptions && (
                                            <div className="mb-4">
                                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Options</h4>
                                                <div className="space-y-2">
                                                    {Object.entries(options).map(([key, value]) => {
                                                        const isCorrect = item.correct_answer === key;
                                                        const isSelected = item.student_answer === key;

                                                        return (
                                                            <div
                                                                key={key}
                                                                className={`p-3 rounded-lg border flex items-start gap-3
                                                                    ${isCorrect ? 'bg-green-50 border-green-300' : ''}
                                                                    ${isSelected && !isCorrect ? 'bg-red-50 border-red-300' : ''}
                                                                    ${!isCorrect && !isSelected ? 'bg-slate-50 border-slate-200' : ''}
                                                                `}
                                                            >
                                                                <span className={`font-bold px-2 py-0.5 rounded text-sm
                                                                    ${isCorrect ? 'bg-green-200 text-green-800' : ''}
                                                                    ${isSelected && !isCorrect ? 'bg-red-200 text-red-800' : ''}
                                                                    ${!isCorrect && !isSelected ? 'bg-slate-200 text-slate-600' : ''}
                                                                `}>
                                                                    {key}
                                                                </span>
                                                                <span className="text-slate-700 flex-1">{value}</span>
                                                                {isCorrect && <CheckCircle size={18} className="text-green-600 flex-shrink-0" />}
                                                                {isSelected && !isCorrect && <XCircle size={18} className="text-red-600 flex-shrink-0" />}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* ========== JUMBLE QUESTION WITH PARTS ========== */}
                                {isJumble && (
                                    <div className="mb-6">
                                        <h4 className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-3 flex items-center gap-1">
                                            <Shuffle size={14} /> Jumbled Sentence Parts
                                        </h4>

                                        {/* Jumble Parts */}
                                        {hasJumbleParts && (
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                                                {Object.entries(jumbleParts).map(([key, value]) => (
                                                    <div
                                                        key={key}
                                                        className="p-3 rounded-lg bg-orange-50 border border-orange-200"
                                                    >
                                                        <span className="font-bold text-orange-700 text-sm">{key}:</span>
                                                        <p className="text-slate-700 text-sm mt-1">{value}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* ========== QUESTION PROMPT (for non-MCQ, non-media types) ========== */}
                                {!isMCQ && !isJumble && item.question_text && !isMediaUrl(item.question_text) && (
                                    <div className="mb-6">
                                        <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                                            <FileText size={14} /> Question Prompt
                                        </h4>
                                        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                                            <p className="text-slate-700 text-sm">{item.question_text}</p>
                                        </div>
                                    </div>
                                )}

                                {/* ========== READING PASSAGE ========== */}
                                {item.type === 'reading' && item.passage && (
                                    <div className="mb-6">
                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                                            <FileText size={14} /> Reading Passage
                                        </h4>
                                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 max-h-48 overflow-y-auto">
                                            <p className="text-slate-700 text-sm leading-relaxed">{item.passage}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Answers Grid */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Correct Answer */}
                                    <div>
                                        <h4 className="text-xs font-bold text-green-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                                            <CheckCircle size={14} /> Correct Answer
                                        </h4>
                                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                            <p className="text-slate-700 text-sm whitespace-pre-wrap font-medium">{item.correct_answer || "N/A"}</p>
                                        </div>
                                    </div>

                                    {/* User's Answer */}
                                    <div>
                                        <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                                            <User size={14} /> User's Answer
                                        </h4>
                                        <div className={`border rounded-lg p-4 ${displayScore > 0
                                            ? 'bg-green-50 border-green-200'
                                            : 'bg-red-50 border-red-200'
                                            }`}>
                                            <p className="text-slate-700 text-sm whitespace-pre-wrap font-medium">{item.student_answer || "No answer provided"}</p>
                                        </div>
                                    </div>

                                    {/* AI Feedback (for image/video/reading) */}
                                    {item.ai_feedback && !isMCQ && !isJumble && (
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
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
};

export default AdminDetailedResult;
