import React from 'react';

const Logo = ({ className = "h-8 w-8", textClass = "text-xl" }) => {
    return (
        <div className="flex items-center gap-2 select-none">
            <img
                src="/logo.jpg"
                alt="Autonex Logo"
                className={`${className} rounded-lg object-cover`}
            />
            <span className={`font-bold tracking-tight text-slate-800 ${textClass}`}>
                Autonex<span className="text-[#0F1A4D]">.AI</span>
            </span>
        </div>
    );
};

export default Logo;
