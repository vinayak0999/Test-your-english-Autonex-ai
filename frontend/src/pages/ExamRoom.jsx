import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import useExamStore from '../store/examStore';
import QuestionCard from '../components/QuestionCard';
import { Loader2, AlertTriangle, ChevronRight, ChevronLeft, Save, Maximize, ShieldAlert } from 'lucide-react';

const MAX_VIOLATIONS = 3;

const ExamRoom = () => {
    const { testId } = useParams();
    const navigate = useNavigate();

    // Local state for fetching logic
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showFullscreenPrompt, setShowFullscreenPrompt] = useState(true);
    const [violations, setViolations] = useState(0);
    const [showViolationWarning, setShowViolationWarning] = useState(false);
    const [sessionId, setSessionId] = useState(null);  // For template-based random questions
    const violationRef = useRef(0);

    // Zustand Store
    const {
        currentQuestionIndex, answers, timeLeft, flags,
        setDuration, tick, nextQuestion, prevQuestion,
        saveAnswer, incrementFlag, resetExam
    } = useExamStore();

    // Enter Fullscreen
    const enterFullscreen = async () => {
        try {
            const elem = document.documentElement;
            if (elem.requestFullscreen) {
                await elem.requestFullscreen();
            } else if (elem.webkitRequestFullscreen) {
                await elem.webkitRequestFullscreen();
            } else if (elem.msRequestFullscreen) {
                await elem.msRequestFullscreen();
            }
            setIsFullscreen(true);
            setShowFullscreenPrompt(false);
        } catch (err) {
            console.error("Fullscreen failed:", err);
            // Allow proceeding even if fullscreen fails (some browsers block it)
            setShowFullscreenPrompt(false);
        }
    };

    // Handle violation (tab switch or fullscreen exit)
    const handleViolation = (reason) => {
        const newViolations = violationRef.current + 1;
        violationRef.current = newViolations;
        setViolations(newViolations);
        incrementFlag();

        if (newViolations >= MAX_VIOLATIONS) {
            // Auto-submit after 3 violations
            alert(`⚠️ DISQUALIFIED: You have ${newViolations} violations. Your test is being auto-submitted.`);
            handleSubmitExam(true); // Force submit with disqualification
        } else if (newViolations === MAX_VIOLATIONS - 1) {
            // Final warning before auto-submit
            setShowViolationWarning(true);
            alert(`🚨 FINAL WARNING: You have ${newViolations} violations. ONE MORE and your test will be auto-submitted!`);
        } else {
            alert(`⚠️ WARNING: ${reason}. Violation ${newViolations}/${MAX_VIOLATIONS}. Your test will be auto-submitted after ${MAX_VIOLATIONS} violations.`);
        }
    };

    // 1. Load Test Data
    useEffect(() => {
        resetExam(); // Clear old data
        api.get(`/exam/tests/${testId}`)
            .then(res => {
                if (res.data.already_completed) {
                    alert("You have already completed this test. Redirecting to your results.");
                    navigate(`/results/${res.data.result_id}`);
                    return;
                }
                setQuestions(res.data.questions);
                setDuration(res.data.duration);
                if (res.data.session_id) {
                    setSessionId(res.data.session_id);  // Save session_id for template-based tests
                }
                setLoading(false);
            })
            .catch(err => {
                const errorMsg = err.response?.data?.detail || "Failed to load test. Please contact admin.";
                alert(errorMsg);
                navigate('/dashboard');
            });
    }, [testId]);

    // 2. Timer Logic
    useEffect(() => {
        if (loading || showFullscreenPrompt) return;
        const timer = setInterval(() => {
            tick();
            if (useExamStore.getState().timeLeft <= 0) {
                handleSubmitExam();
            }
        }, 1000);
        return () => clearInterval(timer);
    }, [loading, showFullscreenPrompt]);

    // 3. Anti-Cheat: Tab Switching Detection
    useEffect(() => {
        if (showFullscreenPrompt) return;

        const handleVisibilityChange = () => {
            if (document.hidden) {
                handleViolation("Tab switch detected");
            }
        };
        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
    }, [showFullscreenPrompt]);

    // 4. Anti-Cheat: Fullscreen Exit Detection
    useEffect(() => {
        if (showFullscreenPrompt) return;

        const handleFullscreenChange = () => {
            const isCurrentlyFullscreen = !!(
                document.fullscreenElement ||
                document.webkitFullscreenElement ||
                document.msFullscreenElement
            );
            setIsFullscreen(isCurrentlyFullscreen);

            if (!isCurrentlyFullscreen && !showFullscreenPrompt) {
                handleViolation("Fullscreen exit detected");
            }
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('msfullscreenchange', handleFullscreenChange);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
            document.removeEventListener('msfullscreenchange', handleFullscreenChange);
        };
    }, [showFullscreenPrompt]);

    // 5. Disable Right-Click and Keyboard Shortcuts
    useEffect(() => {
        if (showFullscreenPrompt) return;

        const preventCheating = (e) => {
            // Disable right-click
            if (e.type === 'contextmenu') {
                e.preventDefault();
                return;
            }
            // Disable common shortcuts
            if (e.ctrlKey || e.metaKey) {
                const blockedKeys = ['c', 'v', 'u', 'p', 's', 'a', 'f', 'Tab'];
                if (blockedKeys.includes(e.key)) {
                    e.preventDefault();
                }
            }
            // Disable F12, F5
            if (['F12', 'F5', 'Escape'].includes(e.key)) {
                e.preventDefault();
            }
        };

        document.addEventListener('contextmenu', preventCheating);
        document.addEventListener('keydown', preventCheating);

        return () => {
            document.removeEventListener('contextmenu', preventCheating);
            document.removeEventListener('keydown', preventCheating);
        };
    }, [showFullscreenPrompt]);

    // Submit Logic
    const handleSubmitExam = async (isDisqualified = false) => {
        if (submitting) return;
        setSubmitting(true);

        // Exit fullscreen before submitting
        if (document.fullscreenElement) {
            try {
                await document.exitFullscreen();
            } catch (e) { }
        }

        const payload = {
            answers: answers,
            flags: violationRef.current,
            tab_switches: violationRef.current,
            disqualified: isDisqualified,
            session_id: sessionId  // Include session_id for template-based tests
        };

        try {
            const res = await api.post(`/exam/tests/${testId}/finish`, payload);
            resetExam();
            navigate(`/results/${res.data.result_id}`);
        } catch (err) {
            setSubmitting(false);
            alert("Submission Failed! Please check your connection.");
            console.error(err);
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    // Fullscreen Prompt Screen
    if (showFullscreenPrompt && !loading) {
        return (
            <div className="min-h-screen bg-[#0A1230] flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl p-10 shadow-2xl text-center max-w-lg">
                    <div className="w-20 h-20 bg-[#0F1A4D] rounded-full flex items-center justify-center mx-auto mb-6">
                        <Maximize className="w-10 h-10 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-4">Fullscreen Mode Required</h2>
                    <p className="text-slate-500 mb-6">
                        This exam requires fullscreen mode to prevent cheating.
                        <span className="block text-red-600 font-semibold mt-2">
                            ⚠️ Exiting fullscreen or switching tabs will count as a violation.
                        </span>
                        <span className="block text-red-600 font-bold mt-1">
                            After {MAX_VIOLATIONS} violations, your test will be auto-submitted!
                        </span>
                    </p>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-left">
                        <h4 className="font-bold text-amber-800 mb-2 flex items-center gap-2">
                            <ShieldAlert size={18} /> Anti-Cheating Measures Active:
                        </h4>
                        <ul className="text-amber-700 text-sm space-y-1">
                            <li>• Tab switching = Violation</li>
                            <li>• Exiting fullscreen = Violation</li>
                            <li>• Right-click disabled</li>
                            <li>• Copy/Paste disabled</li>
                            <li>• 3 violations = Auto-submit</li>
                        </ul>
                    </div>
                    <button
                        onClick={enterFullscreen}
                        className="w-full py-4 bg-[#0F1A4D] text-white font-bold rounded-lg hover:bg-[#1E3A8A] transition-all flex items-center justify-center gap-2"
                    >
                        <Maximize size={20} /> Enter Fullscreen & Start Test
                    </button>
                </div>
            </div>
        );
    }

    // Loading Overlay for submission
    if (submitting) {
        return (
            <div className="min-h-screen bg-slate-900/95 flex flex-col items-center justify-center fixed inset-0 z-50">
                <div className="bg-white rounded-2xl p-10 shadow-2xl text-center max-w-md mx-4">
                    <Loader2 className="w-16 h-16 text-[#0F1A4D] animate-spin mx-auto mb-6" />
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Grading Your Answers...</h2>
                    <p className="text-slate-500 mb-4">Our AI is evaluating your responses. This may take a few moments.</p>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-[#0F1A4D] via-[#1E3A8A] to-[#0F1A4D] animate-pulse" style={{ width: '100%' }} />
                    </div>
                    <p className="text-xs text-slate-400 mt-4">Please do not close this window</p>
                </div>
            </div>
        );
    }

    if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

    const currentQuestion = questions[currentQuestionIndex];
    const isLastQuestion = currentQuestionIndex === questions.length - 1;

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col">
            {/* --- VIOLATION BANNER --- */}
            {violations > 0 && (
                <div className={`px-6 py-3 text-center font-bold text-white ${violations >= MAX_VIOLATIONS - 1 ? 'bg-red-600' : 'bg-amber-600'}`}>
                    <ShieldAlert className="inline w-5 h-5 mr-2" />
                    {violations >= MAX_VIOLATIONS - 1
                        ? `🚨 FINAL WARNING: ${violations}/${MAX_VIOLATIONS} violations. ONE MORE = AUTO-SUBMIT!`
                        : `⚠️ Violations: ${violations}/${MAX_VIOLATIONS} - Tab switching or exiting fullscreen will disqualify you!`
                    }
                </div>
            )}

            {/* --- TOP BAR (Timer & Progress) --- */}
            <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-20 shadow-sm flex justify-between items-center">
                <div>
                    <h2 className="font-bold text-slate-800">Question {currentQuestionIndex + 1} / {questions.length}</h2>
                    <div className="w-32 h-2 bg-slate-100 rounded-full mt-1 overflow-hidden">
                        <div
                            className="h-full bg-[#0F1A4D] transition-all duration-500"
                            style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {!isFullscreen && (
                        <button
                            onClick={enterFullscreen}
                            className="px-3 py-1 bg-amber-100 text-amber-700 rounded text-sm font-medium flex items-center gap-1"
                        >
                            <Maximize size={14} /> Re-enter Fullscreen
                        </button>
                    )}
                    <div className={`flex items-center gap-3 px-5 py-2 rounded-lg font-mono font-bold text-xl ${timeLeft < 300 ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-700'}`}>
                        <span>{formatTime(timeLeft)}</span>
                    </div>
                </div>
            </header>

            {/* --- MAIN CONTENT --- */}
            <main className="flex-1 max-w-4xl mx-auto w-full p-6">
                <QuestionCard
                    question={currentQuestion}
                    answer={answers[currentQuestion.id]}
                    onAnswerChange={(text) => saveAnswer(currentQuestion.id, text)}
                />
            </main>

            {/* --- FOOTER (Navigation) --- */}
            <footer className="bg-white border-t border-slate-200 px-6 py-4 sticky bottom-0 z-20">
                <div className="max-w-4xl mx-auto flex justify-between items-center">
                    <button
                        onClick={prevQuestion}
                        disabled={currentQuestionIndex === 0}
                        className="px-6 py-2 rounded-lg font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:hover:bg-transparent transition-colors flex items-center gap-2"
                    >
                        <ChevronLeft size={20} /> Previous
                    </button>

                    {isLastQuestion ? (
                        <button
                            onClick={() => handleSubmitExam(false)}
                            className="px-8 py-2 rounded-lg font-bold bg-green-600 text-white hover:bg-green-700 shadow-lg shadow-green-200 transition-all flex items-center gap-2"
                        >
                            <Save size={18} /> Submit Exam
                        </button>
                    ) : (
                        <button
                            onClick={nextQuestion}
                            className="px-8 py-2 rounded-lg font-bold bg-[#0F1A4D] text-white hover:bg-[#1E3A8A] shadow-lg shadow-slate-200 transition-all flex items-center gap-2"
                        >
                            Next Question <ChevronRight size={20} />
                        </button>
                    )}
                </div>
            </footer>
        </div>
    );
};

export default ExamRoom;

