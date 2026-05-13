import React from 'react';
import { motion } from 'framer-motion';
import TypingQuestion from './TypingQuestion';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const QuestionCard = ({ question, answer, onAnswerChange, onTypingComplete, onAutoNext }) => {
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
                    {question.type === 'mcq-grammar' ? 'Grammar'
                        : question.type === 'typing-easy' ? '⌨️ Typing — Easy'
                        : question.type === 'typing-advanced' ? '⌨️ Typing — Advanced'
                        : question.type === 'mcq-multi-image' ? '🖼️ Multi-Image MCQ'
                        : question.type === 'mcq-annotation' ? '📋 Annotation MCQ'
                        : question.type === 'mcq-image' ? '🖼️ Image MCQ'
                        : question.type === 'image-count' ? '🔢 Count'
                        : question.type}
                </span>
                <span className="text-slate-400 text-sm font-medium">
                    {question.marks} Marks
                </span>
            </div>

            {/* --- CONTENT DISPLAY --- */}
            <div className="mb-8 space-y-4">

                {/* 1. VIDEO (both legacy and robot episode types) */}
                {['video', 'video-robot'].includes(question.type) && (
                    <>
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
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                            <p className="text-sm font-bold text-blue-600 uppercase tracking-wider mb-2">Question</p>
                            <p className="text-slate-700 font-medium">
                                {contentData.title || 'Assign a label to the video clip above.'}
                            </p>
                        </div>
                    </>
                )}

                {/* 2. IMAGE (description) */}
                {question.type === 'image' && (
                    <>
                        <div className="rounded-xl overflow-hidden bg-slate-50 border border-slate-200">
                            <img
                                src={contentData.url ? (contentData.url.startsWith('http') ? contentData.url : `${API_URL}${contentData.url}`) : ''}
                                alt="Question Visual"
                                className="w-full h-auto max-h-[400px] object-contain mx-auto"
                            />
                        </div>
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                            <p className="text-sm font-bold text-amber-600 uppercase tracking-wider mb-2">Question</p>
                            <p className="text-slate-700 font-medium">
                                Analyze the image shown above and provide a detailed explanation of all visible elements.
                            </p>
                        </div>
                    </>
                )}

                {/* 2b. IMAGE-COUNT — show image + bold question title */}
                {question.type === 'image-count' && (
                    <>
                        <div className="rounded-xl overflow-hidden bg-slate-50 border border-slate-200">
                            <img
                                src={contentData.url ? (contentData.url.startsWith('http') ? contentData.url : `${API_URL}${contentData.url}`) : ''}
                                alt="Count the items"
                                className="w-full h-auto max-h-[480px] object-contain mx-auto"
                            />
                        </div>
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                            <p className="text-sm font-bold text-blue-600 uppercase tracking-wider mb-1">Question</p>
                            <p className="text-slate-800 font-semibold text-lg">{contentData.question || contentData.title || 'Count the specified items in the image.'}</p>
                            <p className="text-xs text-slate-400 mt-1">Type only the number (e.g. 7)</p>
                        </div>
                    </>
                )}

                {/* 2c. MCQ-IMAGE / MCQ-ANNOTATION — show image if URL present */}
                {(question.type === 'mcq-image' || question.type === 'mcq-annotation') && contentData.url && (
                    <div className="rounded-xl overflow-hidden bg-slate-50 border border-slate-200">
                        <img
                            src={contentData.url.startsWith('http') ? contentData.url : `${API_URL}${contentData.url}`}
                            alt="Question Image"
                            className="w-full h-auto max-h-[400px] object-contain mx-auto"
                        />
                    </div>
                )}

                {/* 3. READING & JUMBLE & MCQ Text (& mcq-image question text) */}
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
                                <p className="text-sm text-indigo-500 font-bold uppercase mb-4">Rearrange these parts in correct order:</p>
                                {/* Show individual parts if jumble object exists */}
                                {contentData.jumble && Object.keys(contentData.jumble).length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
                                        {Object.entries(contentData.jumble).sort().map(([key, value]) => (
                                            <div key={key} className="bg-white border border-indigo-200 rounded-lg p-3 text-left shadow-sm">
                                                <span className="font-bold text-indigo-600 mr-2">{key}:</span>
                                                <span className="text-slate-700">{value}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-2xl font-mono text-indigo-900 tracking-wide">
                                        {contentData.sentence}
                                    </p>
                                )}
                                <p className="text-xs text-slate-500 mt-4">Type the correct order (e.g., "B A C D")</p>
                            </div>
                        )}

                        {/* MCQ-Reading: Show passage first, then question */}
                        {question.type === 'mcq-reading' && contentData.passage && (
                            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 text-slate-700 leading-relaxed mb-4">
                                {contentData.passage}
                            </div>
                        )}

                        {/* Guideline box — for annotation MCQ questions (not multi-image, which renders its own header) */}
                        {(question.type === 'mcq-image' || question.type === 'mcq-annotation') && !contentData.sub_images?.length && contentData.guideline && (
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-2">
                                <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-1">📋 Guideline</p>
                                <p className="text-sm text-amber-900">{contentData.guideline}</p>
                            </div>
                        )}

                        {/* Scenario box */}
                        {(question.type === 'mcq-image' || question.type === 'mcq-annotation') && !contentData.sub_images?.length && contentData.scenario && (
                            <div className="bg-slate-100 border border-slate-200 rounded-xl p-4 mb-2">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">📍 Scenario</p>
                                <p className="text-sm text-slate-700">{contentData.scenario}</p>
                            </div>
                        )}

                        {/* MCQ Question Text — skip for multi-image (header handles it) */}
                        {(question.type.includes('mcq') || question.type === 'mcq-annotation') && !contentData.sub_images?.length && (
                            <p className="text-lg font-semibold text-slate-800">
                                {contentData.question || contentData.text || contentData.content}
                            </p>
                        )}
                    </div>
                )}

                {/* 4. TYPING (all variants) */}
                {['typing', 'typing-easy', 'typing-advanced'].includes(question.type) && (
                    <TypingQuestion
                        question={question}
                        answer={answer}
                        onAnswerChange={onAnswerChange}
                        onTypingComplete={onTypingComplete}
                    />
                )}

                {/* 5. MCQ-MULTI-IMAGE */}
                {contentData.sub_images && contentData.sub_images.length > 0 && (() => {
                    const subImages = contentData.sub_images || [];
                    const options   = contentData.options || {};

                    // Detect if all images share the same answer (Q8 style) or each is independent (Q3 style)
                    const uniqueAnswers = new Set(subImages.map(s => s.correct_answer));
                    const isSingleAnswer = uniqueAnswers.size === 1;

                    // Parse current answers JSON: {"0": "c", "1": "d"}
                    let answers = {};
                    try { answers = answer ? JSON.parse(answer) : {}; } catch {}

                    // Q8: set same answer for ALL images at once
                    const setSharedAnswer = (key) => {
                        const next = {};
                        subImages.forEach((_, i) => { next[String(i)] = key; });
                        onAnswerChange(JSON.stringify(next));
                    };

                    // Q3: set answer for one specific image
                    const setSubAnswer = (idx, key) => {
                        const next = { ...answers, [String(idx)]: key };
                        onAnswerChange(JSON.stringify(next));
                    };

                    // Shared header (guideline, scenario, question) — shown ONCE
                    const Header = () => (
                        <div className="space-y-3">
                            {contentData.guideline && (
                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                                    <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-1">📋 Guideline</p>
                                    <p className="text-sm text-amber-900">{contentData.guideline}</p>
                                </div>
                            )}
                            {contentData.scenario && (
                                <div className="bg-slate-100 border border-slate-200 rounded-xl p-4">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">📍 Scenario</p>
                                    <p className="text-sm text-slate-700">{contentData.scenario}</p>
                                </div>
                            )}
                            {contentData.question && (
                                <p className="text-lg font-semibold text-slate-800">{contentData.question}</p>
                            )}
                            {contentData.note && <p className="text-xs text-slate-400 italic">{contentData.note}</p>}
                        </div>
                    );

                    const OptionButtons = ({ chosen, onPick }) => (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {Object.entries(options).map(([key, val]) => (
                                <button
                                    key={key}
                                    onClick={() => onPick(key)}
                                    className={`p-3 rounded-xl border-2 text-left transition-all flex items-center gap-3 ${chosen === key
                                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900 shadow-sm'
                                        : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50 text-slate-600'}`}
                                >
                                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${chosen === key ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                        {key.toUpperCase()}
                                    </span>
                                    <span className="font-medium text-sm">{val}</span>
                                </button>
                            ))}
                        </div>
                    );

                    if (isSingleAnswer) {
                        // ── Q8 layout: all images stacked, ONE MCQ at the bottom ──
                        const sharedChosen = answers["0"] || null;
                        return (
                            <div className="space-y-4">
                                <Header />
                                {/* All images stacked */}
                                <div className="space-y-3">
                                    {subImages.map((sub, idx) => {
                                        const imgSrc = sub.url ? (sub.url.startsWith('http') ? sub.url : `${API_URL}${sub.url}`) : '';
                                        return (
                                            <div key={idx} className="rounded-xl overflow-hidden bg-slate-50 border border-slate-200">
                                                <p className="text-xs font-bold text-slate-400 uppercase px-4 pt-3 pb-1">Image {idx + 1}</p>
                                                <img src={imgSrc} alt={`Image ${idx+1}`} className="w-full h-auto max-h-[360px] object-contain mx-auto pb-2" />
                                            </div>
                                        );
                                    })}
                                </div>
                                {/* Single MCQ below all images */}
                                <div className="border border-slate-200 rounded-xl p-4">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Your Answer (applies to all images above)</p>
                                    <OptionButtons chosen={sharedChosen} onPick={setSharedAnswer} />
                                </div>
                            </div>
                        );
                    } else {
                        // ── Q3 layout: header once, then image + MCQ per image ──
                        return (
                            <div className="space-y-4">
                                <Header />
                                {subImages.map((sub, idx) => {
                                    const chosen = answers[String(idx)];
                                    const imgSrc = sub.url ? (sub.url.startsWith('http') ? sub.url : `${API_URL}${sub.url}`) : '';
                                    return (
                                        <div key={idx} className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                                            <div className="bg-slate-50 border-b border-slate-200">
                                                <p className="text-xs font-bold text-slate-400 uppercase px-4 pt-3 pb-1">Image {idx + 1}</p>
                                                <img src={imgSrc} alt={`Image ${idx+1}`} className="w-full h-auto max-h-[360px] object-contain mx-auto" />
                                            </div>
                                            <div className="p-4">
                                                <OptionButtons chosen={chosen} onPick={(key) => setSubAnswer(idx, key)} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    }
                })()}
            </div>

            {/* --- ANSWER INPUT AREA (not shown for typing or multi-image) --- */}
            {!['typing', 'typing-easy', 'typing-advanced'].includes(question.type) && !(contentData.sub_images && contentData.sub_images.length > 0) && (
            <div className="space-y-4">
                <label className="block text-sm font-bold text-slate-400 uppercase tracking-wider">
                    Your Answer
                </label>

                {/* A. TEXT INPUT (Video, Reading, Image, Jumble) */}
                {['video', 'video-robot', 'image', 'reading', 'jumble'].includes(question.type) && (
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

                {/* A2. NUMBER INPUT (image-count) */}
                {question.type === 'image-count' && (
                    <div className="flex items-center gap-4">
                        <input
                            type="number"
                            min="0"
                            max="999"
                            value={answer || ''}
                            onChange={(e) => onAnswerChange(e.target.value)}
                            placeholder="0"
                            className="w-40 p-4 text-3xl font-bold text-center rounded-xl border-2 border-blue-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                        <p className="text-slate-400 text-sm">Enter the count you see in the image</p>
                    </div>
                )}

                {/* B. MCQ OPTIONS — auto-advance to next question on click */}
                {question.type.includes('mcq') && contentData.options && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {Object.entries(contentData.options).map(([key, value]) => (
                            <button
                                key={key}
                                onClick={() => {
                                    onAnswerChange(key);
                                    if (onAutoNext) setTimeout(onAutoNext, 400);
                                }}
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


            </div>
            )}
        </motion.div>
    );
};

export default QuestionCard;
