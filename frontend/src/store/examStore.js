import { create } from 'zustand';

const useExamStore = create((set, get) => ({
    currentQuestionIndex: 0,
    answers: {}, // Stores { question_id: "student answer" }
    flags: 0, // Counts how many times they switched tabs
    timeLeft: 0,
    isSubmitted: false,

    // Actions
    setDuration: (minutes) => set({ timeLeft: minutes * 60 }),

    tick: () => set((state) => ({ timeLeft: Math.max(0, state.timeLeft - 1) })),

    nextQuestion: () => set((state) => ({ currentQuestionIndex: state.currentQuestionIndex + 1 })),

    prevQuestion: () => set((state) => ({ currentQuestionIndex: Math.max(0, state.currentQuestionIndex - 1) })),

    saveAnswer: (questionId, text) => set((state) => ({
        answers: { ...state.answers, [questionId]: text }
    })),

    incrementFlag: () => set((state) => ({ flags: state.flags + 1 })),

    resetExam: () => set({ currentQuestionIndex: 0, answers: {}, flags: 0, isSubmitted: false })
}));

export default useExamStore;
