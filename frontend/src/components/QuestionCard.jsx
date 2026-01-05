import React from 'react';
import { motion } from 'framer-motion';

const API_URL = 'http://localhost:8000';

const QuestionCard = ({ question, answer, onAnswerChange }) => {
    // Helper to safely get content fields (handles both legacy string and new object)
    const getContent = (field) => {
        if (typeof question.content === 'string') return question.content;
        return question.content[field] || question.content; // fallback or specific field
    };

    const contentData = typeof question.content === 'object' ? question.content : { url: question.content, text: question.content };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={question.id}
            className="glass-card bg-white p-6 md:p-8 rounded-2xl shadow-lg border border-slate-100"
        >
            <div className="mb-6 flex items-center justify-between">
                <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                    {question.type === 'mcq-grammar' ? 'Grammar' : question.type}
                </span>
                <span className="text-slate-400 text-sm font-medium">
                    {question.marks} Marks
                </span>
            </div>

            {/* --- CONTENT DISPLAY --- */}
            <div className="mb-8 space-y-4">

                {/* 1. VIDEO */}
                {question.type === 'video' && (
                    <div className="rounded-xl overflow-hidden bg-black aspect-video shadow-md relative group">
                        <video
                            controls
                            controlsList="nodownload"
                            className="w-full h-full object-contain"
                            src={contentData.url ? (contentData.url.startsWith('http') ? contentData.url : `${API_URL}${contentData.url}`) : ''}
                        >
                            Your browser does not support the video tag.
                        </video>
                    </div>
                )}

                {/* 2. IMAGE */}
                {question.type === 'image' && (
                    <div className="rounded-xl overflow-hidden bg-slate-50 border border-slate-200">
                        <img
                            src={contentData.url ? (contentData.url.startsWith('http') ? contentData.url : `${API_URL}${contentData.url}`) : ''}
                            alt="Question Visual"
                            className="w-full h-auto max-h-[400px] object-contain mx-auto"
                        />
                    </div>
                )}

                {/* 3. READING & JUMBLE & MCQ Text */}
                {(question.type === 'reading' || question.type === 'jumble' || question.type.includes('mcq')) && (
                    <div className="prose prose-slate max-w-none">
                        {contentData.title && <h3 className="text-xl font-bold text-slate-800">{contentData.title}</h3>}

                        {/* Reading Passage */}
                        {question.type === 'reading' && (
                            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 text-slate-700 leading-relaxed">
                                {contentData.passage || contentData.text}
                            </div>
                        )}

                        {/* Jumble Text */}
                        {question.type === 'jumble' && (
                            <div className="text-center p-8 bg-indigo-50 rounded-xl border-2 border-dashed border-indigo-200">
                                <p className="text-sm text-indigo-500 font-bold uppercase mb-2">Rearrange this:</p>
                                <p className="text-2xl font-mono text-indigo-900 tracking-wide">
                                    {contentData.sentence}
                                </p>
                            </div>
                        )}

                        {/* MCQ Question Text */}
                        {question.type.includes('mcq') && (
                            <p className="text-lg font-medium text-slate-800">
                                {contentData.question || contentData.text}
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* --- ANSWER INPUT AREA --- */}
            <div className="space-y-4">
                <label className="block text-sm font-bold text-slate-400 uppercase tracking-wider">
                    Your Answer
                </label>

                {/* A. TEXT INPUT (Video, Reading, Image, Jumble) */}
                {['video', 'image', 'reading', 'jumble'].includes(question.type) && (
                    <textarea
                        value={answer || ''}
                        onChange={(e) => onAnswerChange(e.target.value)}
                        placeholder={question.type === 'jumble' ? "Type the correct sentence order..." : "Type your detailed answer here..."}
                        className={`w-full p-4 rounded-xl border focus:ring-2 outline-none transition-all ${question.type === 'jumble'
                                ? 'h-24 font-mono text-lg border-indigo-200 focus:ring-indigo-500 focus:border-indigo-500'
                                : 'h-40 border-slate-300 focus:ring-blue-500 focus:border-blue-500'
                            }`}
                        spellCheck={false}
                        onPaste={(e) => {
                            e.preventDefault();
                            alert("Copy-Paste is disabled for this exam.");
                        }}
                    />
                )}

                {/* B. MCQ OPTIONS (Simple) */}
                {(question.type === 'mcq-grammar' || question.type === 'mcq-reading') && contentData.options && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {Object.entries(contentData.options).map(([key, value]) => (
                            <button
                                key={key}
                                onClick={() => onAnswerChange(key)}
                                className={`p-4 rounded-xl border-2 text-left transition-all flex items-center gap-3 ${answer === key
                                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900 shadow-sm'
                                        : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50 text-slate-600'
                                    }`}
                            >
                                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${answer === key ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
                                    }`}>
                                    {key}
                                </span>
                                <span className="font-medium">{value}</span>
                            </button>
                        ))}
                    </div>
                )}

                {/* C. MCQ CONTEXT (Contextual Blanks) */}
                {question.type === 'mcq-context' && contentData.options && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-xl border border-slate-200">
                        {Object.entries(contentData.options).map(([blankKey, choices]) => (
                            <div key={blankKey} className="space-y-2">
                                <label className="text-sm font-bold text-slate-500 uppercase">{blankKey}</label>
                                <div className="space-y-2">
                                    {Object.entries(choices).map(([optKey, optVal]) => {
                                        // Parse current answer JSON
                                        let currentAns = {};
                                        try { currentAns = answer ? JSON.parse(answer) : {}; } catch (e) { }
                                        const isSelected = currentAns[blankKey] === optKey;

                                        return (
                                            <button
                                                key={optKey}
                                                onClick={() => {
                                                    const newAns = { ...currentAns, [blankKey]: optKey };
                                                    onAnswerChange(JSON.stringify(newAns));
                                                }}
                                                className={`w-full p-3 rounded-lg border text-left text-sm transition-all ${isSelected
                                                        ? 'bg-indigo-600 text-white border-indigo-600'
                                                        : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-300'
                                                    }`}
                                            >
                                                <b>{optKey}.</b> {optVal}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default QuestionCard;
