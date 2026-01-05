import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import { Save, Sliders, CheckSquare, FileText, Video, Image as ImageIcon, BookOpen, Type, Layers } from 'lucide-react';
import { motion } from 'framer-motion';

const SectionCard = ({ type, icon: Icon, label, config, onUpdate }) => {
    return (
        <motion.div
            whileHover={{ scale: 1.01 }}
            className={`p-4 rounded-xl border-2 transition-all ${config.enabled ? 'border-indigo-500 bg-indigo-50/50' : 'border-gray-200 bg-white opacity-60'}`}
        >
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${config.enabled ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'}`}>
                        <Icon size={20} />
                    </div>
                    <span className="font-semibold text-gray-800">{label}</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input
                        type="checkbox"
                        checked={config.enabled}
                        onChange={(e) => onUpdate(type, 'enabled', e.target.checked)}
                        className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
            </div>

            {config.enabled && (
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Count</label>
                        <input
                            type="number"
                            min="1"
                            max="50"
                            value={config.count}
                            onChange={(e) => onUpdate(type, 'count', parseInt(e.target.value) || 0)}
                            className="w-full mt-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Marks Each</label>
                        <input
                            type="number"
                            min="1"
                            value={config.marks}
                            onChange={(e) => onUpdate(type, 'marks', parseInt(e.target.value) || 0)}
                            className="w-full mt-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                        />
                    </div>
                </div>
            )}
        </motion.div>
    );
};

const CreateTest = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    // Metadata
    const [meta, setMeta] = useState({
        title: '',
        duration_minutes: 60,
        instructions: 'Please answer all questions carefully. Do not switch tabs.',
    });

    // Generator Config State
    const [sections, setSections] = useState({
        video: { enabled: true, count: 1, marks: 15, label: "Video Analysis", icon: Video },
        image: { enabled: true, count: 1, marks: 15, label: "Image Description", icon: ImageIcon },
        reading: { enabled: true, count: 1, marks: 15, label: "Reading Summary", icon: BookOpen },
        jumble: { enabled: true, count: 20, marks: 1, label: "Jumble Sentences", icon: Type },
        'mcq-grammar': { enabled: true, count: 12, marks: 1, label: "MCQ: Grammar", icon: CheckSquare },
        'mcq-context': { enabled: true, count: 12, marks: 1, label: "MCQ: Context", icon: Layers },
        'mcq-reading': { enabled: true, count: 11, marks: 1, label: "MCQ: Reading", icon: FileText },
    });

    // Calculated Total Marks
    const totalMarks = Object.values(sections).reduce((acc, curr) =>
        curr.enabled ? acc + (curr.count * curr.marks) : acc, 0
    );

    const updateSection = (type, field, value) => {
        setSections(prev => ({
            ...prev,
            [type]: { ...prev[type], [field]: value }
        }));
    };

    const handleGenerate = async () => {
        if (!meta.title) return alert("Please enter a test title");

        setLoading(true);

        // Build Payload according to TestTemplateConfig schema
        const sectionPayload = Object.entries(sections)
            .filter(([_, config]) => config.enabled)
            .map(([type, config]) => ({
                type: type,
                count: config.count,
                marks: config.marks
            }));

        const payload = {
            title: meta.title,
            duration_minutes: meta.duration_minutes,
            total_marks: totalMarks,
            instructions: meta.instructions,
            sections: sectionPayload
        };

        try {
            await api.post('/admin/generate-test', payload);
            navigate('/admin/dashboard');
        } catch (err) {
            console.error(err);
            alert("Failed to generate test. Check console.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto pb-20 px-4">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                    <Sliders className="text-indigo-600" />
                    Test Generator
                </h1>
                <p className="text-gray-500 mt-2">Configure the structure and let AI generate the paper.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Configuration */}
                <div className="lg:col-span-2 space-y-6">

                    {/* 1. Basic Info */}
                    <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h2 className="text-lg font-semibold mb-4 text-gray-800">1. Basic Details</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Test Title</label>
                                <input
                                    value={meta.title}
                                    onChange={e => setMeta({ ...meta, title: e.target.value })}
                                    type="text"
                                    placeholder="e.g. Standard English Proficiency Test - Set A"
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Duration (mins)</label>
                                    <input
                                        value={meta.duration_minutes}
                                        onChange={e => setMeta({ ...meta, duration_minutes: parseInt(e.target.value) || 0 })}
                                        type="number"
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Total Marks</label>
                                    <div className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-600 font-bold">
                                        {totalMarks}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* 2. Section Configuration */}
                    <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h2 className="text-lg font-semibold mb-4 text-gray-800">2. Paper Structure</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {Object.entries(sections).map(([type, config]) => (
                                <SectionCard
                                    key={type}
                                    type={type}
                                    icon={config.icon}
                                    label={config.label}
                                    config={config}
                                    onUpdate={updateSection}
                                />
                            ))}
                        </div>
                    </section>
                </div>

                {/* Right Column: Preview & Action */}
                <div className="lg:col-span-1">
                    <div className="sticky top-8 space-y-6">
                        <section className="bg-gradient-to-br from-indigo-900 to-purple-900 text-white p-6 rounded-2xl shadow-xl">
                            <h3 className="text-xl font-bold mb-2">Summary</h3>
                            <div className="space-y-3 mb-6">
                                <div className="flex justify-between text-indigo-100">
                                    <span>Sections</span>
                                    <span className="font-mono">{Object.values(sections).filter(s => s.enabled).length}</span>
                                </div>
                                <div className="flex justify-between text-indigo-100">
                                    <span>Questions</span>
                                    <span className="font-mono">
                                        {Object.values(sections).reduce((acc, s) => s.enabled ? acc + s.count : acc, 0)}
                                    </span>
                                </div>
                                <div className="h-px bg-white/20 my-2"></div>
                                <div className="flex justify-between text-xl font-bold">
                                    <span>Total Marks</span>
                                    <span>{totalMarks}</span>
                                </div>
                            </div>

                            <button
                                onClick={handleGenerate}
                                disabled={loading}
                                className="w-full bg-white text-indigo-900 font-bold py-4 rounded-xl hover:bg-indigo-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <span>Generating...</span>
                                ) : (
                                    <>
                                        <Save size={20} />
                                        Generate Paper
                                    </>
                                )}
                            </button>
                        </section>

                        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl text-yellow-800 text-sm">
                            <p className="font-semibold mb-1">Note:</p>
                            Questions will be randomly selected from the data banks at the time of generation.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateTest;
