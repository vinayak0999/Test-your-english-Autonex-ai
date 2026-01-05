import React, { useEffect, useState } from 'react';
import api from '../api';
import { X, Mail, Building, Award, Calendar, User } from 'lucide-react';

const CandidateProfileModal = ({ candidate, onClose }) => {
    const [testHistory, setTestHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // In a real app, you'd fetch all results for this candidate
        // For now, we'll just show the current result info
        setLoading(false);
    }, [candidate]);

    if (!candidate) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white relative">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-white/80 hover:text-white"
                    >
                        <X size={24} />
                    </button>
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                            <User size={32} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">{candidate.candidate_name}</h2>
                            <p className="text-indigo-200 text-sm flex items-center gap-1">
                                <Mail size={14} /> {candidate.candidate_email}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 rounded-xl p-4 text-center">
                            <Award className="w-8 h-8 text-green-600 mx-auto mb-2" />
                            <p className="text-2xl font-bold text-slate-800">{candidate.total_score}</p>
                            <p className="text-xs text-slate-500">Score ({candidate.max_marks} max)</p>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-4 text-center">
                            <Calendar className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                            <p className="text-sm font-bold text-slate-800">{candidate.date}</p>
                            <p className="text-xs text-slate-500">Submission Date</p>
                        </div>
                    </div>

                    {/* Test Info */}
                    <div className="border-t border-slate-100 pt-4">
                        <h3 className="font-bold text-slate-800 mb-3">Test Details</h3>
                        <div className="bg-slate-50 rounded-xl p-4">
                            <p className="font-semibold text-indigo-700">{candidate.test_title}</p>
                            <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${candidate.percentage >= 50
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-red-100 text-red-700'
                                    }`}>
                                    {candidate.percentage}% - {candidate.percentage >= 50 ? 'Passed' : 'Failed'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <a
                            href={`/results/${candidate.id}`}
                            target="_blank"
                            className="flex-1 bg-indigo-600 text-white text-center py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
                        >
                            View Full Report
                        </a>
                        <button
                            onClick={onClose}
                            className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-semibold hover:bg-slate-200 transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CandidateProfileModal;
