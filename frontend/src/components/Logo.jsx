import React from 'react';
import { BrainCircuit } from 'lucide-react';

const Logo = ({ className = "h-8 w-8", textClass = "text-xl" }) => {
    return (
        <div className="flex items-center gap-2 select-none">
            <BrainCircuit className={`${className} text-[#0F1A4D]`} />
            <span className={`font-bold tracking-tight text-slate-800 ${textClass}`}>
                Test your English
            </span>
        </div>
    );
};

export default Logo;

