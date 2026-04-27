import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Timer, Keyboard, Target, Gauge, RotateCcw } from 'lucide-react';

const TypingQuestion = ({ question, answer, onAnswerChange, onTypingComplete }) => {
    const passage = question.content?.passage || '';
    const timeLimit = question.content?.time_limit || 60;

    // Parse existing answer if resuming
    const parseExisting = () => {
        if (!answer) return { typed_text: '', time_seconds: 0 };
        try {
            return JSON.parse(answer);
        } catch {
            return { typed_text: answer, time_seconds: 0 };
        }
    };

    const existing = parseExisting();
    const alreadyAttempted = !!(existing.typed_text && existing.typed_text.length > 0);

    const [userInput, setUserInput] = useState(existing.typed_text || '');
    const [started, setStarted] = useState(alreadyAttempted);
    const [finished, setFinished] = useState(alreadyAttempted);
    const [startTime, setStartTime] = useState(null);
    const [elapsed, setElapsed] = useState(existing.time_seconds || 0);
    const [wpm, setWpm] = useState(0);
    const [accuracy, setAccuracy] = useState(100);
    const [completion, setCompletion] = useState(0);
    const inputRef = useRef(null);
    const timerRef = useRef(null);

    // Refs to avoid stale closures in the timer interval
    const userInputRef = useRef(existing.typed_text || '');
    const onAnswerChangeRef = useRef(onAnswerChange);

    // Keep refs in sync
    useEffect(() => { onAnswerChangeRef.current = onAnswerChange; }, [onAnswerChange]);

    // If already attempted (came back via Previous), compute stats immediately
    useEffect(() => {
        if (alreadyAttempted && existing.time_seconds > 0) {
            calculateStats(existing.typed_text, existing.time_seconds);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Calculate stats
    const calculateStats = useCallback((input, elapsedSec) => {
        if (!input || input.length === 0 || elapsedSec <= 0) {
            setWpm(0);
            setAccuracy(100);
            setCompletion(0);
            return;
        }
        const timeMin = elapsedSec / 60;
        const grossWpm = Math.round((input.length / 5) / timeMin);
        setWpm(grossWpm);

        let correct = 0;
        for (let i = 0; i < input.length; i++) {
            if (i < passage.length && input[i] === passage[i]) correct++;
        }
        setAccuracy(Math.round((correct / input.length) * 100));
        setCompletion(Math.min(Math.round((input.length / passage.length) * 100), 100));
    }, [passage]);

    // Timer — runs once on start, reads refs for latest values
    useEffect(() => {
        if (started && !finished) {
            timerRef.current = setInterval(() => {
                const sec = (Date.now() - startTime) / 1000;
                setElapsed(sec);
                calculateStats(userInputRef.current, sec);

                if (sec >= timeLimit) {
                    clearInterval(timerRef.current);
                    setFinished(true);
                    onAnswerChangeRef.current(JSON.stringify({
                        typed_text: userInputRef.current,
                        time_seconds: Math.round(sec * 10) / 10
                    }));
                    if (onTypingComplete) onTypingComplete();
                }
            }, 500);
        }
        return () => clearInterval(timerRef.current);
    }, [started, finished, startTime, timeLimit, calculateStats]);

    const handleStart = () => {
        setStarted(true);
        setStartTime(Date.now());
        setUserInput('');
        userInputRef.current = '';
        setFinished(false);
        setTimeout(() => inputRef.current?.focus(), 100);
    };

    const handleInputChange = (e) => {
        if (finished) return;
        const val = e.target.value;
        if (val.length > passage.length) return;

        setUserInput(val);
        userInputRef.current = val;

        const sec = (Date.now() - startTime) / 1000;
        calculateStats(val, sec);

        // Save answer
        onAnswerChange(JSON.stringify({
            typed_text: val,
            time_seconds: Math.round(sec * 10) / 10
        }));

        // Auto-finish if passage complete
        if (val.length >= passage.length) {
            setFinished(true);
            clearInterval(timerRef.current);
            if (onTypingComplete) onTypingComplete();
        }
    };

    const handleReset = () => {
        clearInterval(timerRef.current);
        setStarted(false);
        setFinished(false);
        setUserInput('');
        userInputRef.current = '';
        setElapsed(0);
        setWpm(0);
        setAccuracy(100);
        setCompletion(0);
        onAnswerChange('');
    };

    const formatTime = (sec) => {
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const remaining = Math.max(0, timeLimit - elapsed);

    const getStatColor = (value, good, great) => {
        if (value >= great) return 'text-green-600';
        if (value >= good) return 'text-amber-600';
        return 'text-red-600';
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Keyboard style={{ width: 20, height: 20, color: '#7c3aed' }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Typing Speed Test
                    </span>
                </div>
                {started && (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '8px 16px', borderRadius: 8,
                        fontFamily: 'monospace', fontSize: 18, fontWeight: 700,
                        background: remaining < 30 ? '#fef2f2' : '#f8fafc',
                        color: remaining < 30 ? '#dc2626' : '#334155'
                    }}>
                        <Timer size={18} />
                        {formatTime(remaining)}
                    </div>
                )}
            </div>

            {/* Instructions */}
            <div style={{
                background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: 12, padding: 16
            }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                    Instructions
                </p>
                <p style={{ fontSize: 14, color: '#334155' }}>
                    Type the passage below as quickly and accurately as you can.
                    <strong> Benchmark: 30 WPM with 90% accuracy.</strong>
                    {' '}Time limit: {timeLimit} seconds.
                </p>
            </div>

            {/* Passage Display — the key fix: simple inline spans that wrap naturally */}
            <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                padding: 24,
                fontSize: 17,
                lineHeight: 2,
                fontFamily: "'Courier New', Courier, monospace",
                userSelect: 'none',
                overflowWrap: 'break-word',
                wordBreak: 'break-word',
            }}>
                {passage.split('').map((char, i) => {
                    let style = { color: '#94a3b8' }; // pending — grey

                    if (i < userInput.length) {
                        if (userInput[i] === char) {
                            // correct
                            style = { color: '#16a34a', backgroundColor: '#f0fdf4' };
                        } else {
                            // wrong
                            style = { color: '#dc2626', backgroundColor: '#fef2f2', borderRadius: 2 };
                        }
                    } else if (i === userInput.length && started && !finished) {
                        // cursor position
                        style = { color: '#1e293b', backgroundColor: '#dbeafe', borderRadius: 2 };
                    }

                    return (
                        <span key={i} style={style}>
                            {char}
                        </span>
                    );
                })}
            </div>

            {/* Start / Input Area */}
            {!started ? (
                <motion.button
                    initial={{ scale: 0.95 }}
                    animate={{ scale: 1 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleStart}
                    style={{
                        width: '100%', padding: '16px 0',
                        background: '#7c3aed', color: 'white',
                        fontWeight: 700, fontSize: 18,
                        borderRadius: 12, border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
                        boxShadow: '0 4px 14px rgba(124, 58, 237, 0.3)'
                    }}
                >
                    <Keyboard size={22} />
                    Click to Start Typing
                </motion.button>
            ) : (
                <>
                    {/* Typing Input */}
                    <textarea
                        ref={inputRef}
                        value={userInput}
                        onChange={handleInputChange}
                        disabled={finished}
                        placeholder="Start typing the passage here..."
                        style={{
                            width: '100%',
                            minHeight: finished ? 80 : 140,
                            padding: 16,
                            borderRadius: 12,
                            border: `2px solid ${finished ? '#86efac' : '#c4b5fd'}`,
                            background: finished ? '#f0fdf4' : 'white',
                            color: '#334155',
                            fontFamily: "'Courier New', Courier, monospace",
                            fontSize: 15,
                            outline: 'none',
                            resize: 'none',
                            boxSizing: 'border-box',
                        }}
                        spellCheck={false}
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        onPaste={(e) => {
                            e.preventDefault();
                            alert("Copy-Paste is disabled for this test.");
                        }}
                    />

                    {/* Completion / Locked banner */}
                    {finished && (
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            padding: '10px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0',
                            borderRadius: 8
                        }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: '#16a34a' }}>
                                🔒 Typing Complete — Answer Saved. You cannot re-attempt this section.
                            </span>
                        </div>
                    )}

                    {/* Live Stats */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                        {[
                            { icon: <Gauge size={20} style={{ color: '#3b82f6' }} />, value: wpm, label: 'WPM', color: getStatColor(wpm, 20, 30) },
                            { icon: <Target size={20} style={{ color: '#22c55e' }} />, value: `${accuracy}%`, label: 'Accuracy', color: getStatColor(accuracy, 80, 90) },
                            { icon: <Timer size={20} style={{ color: '#f59e0b' }} />, value: formatTime(elapsed), label: 'Time', color: 'text-slate-700' },
                            { icon: <Keyboard size={20} style={{ color: '#7c3aed' }} />, value: `${completion}%`, label: 'Complete', color: 'text-slate-700' },
                        ].map((stat, idx) => (
                            <div key={idx} style={{
                                background: 'white', border: '1px solid #e2e8f0', borderRadius: 12,
                                padding: 14, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>{stat.icon}</div>
                                <div className={stat.color} style={{ fontSize: 22, fontWeight: 700 }}>{stat.value}</div>
                                <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>{stat.label}</div>
                            </div>
                        ))}
                    </div>


                </>
            )}
        </div>
    );
};

export default TypingQuestion;
