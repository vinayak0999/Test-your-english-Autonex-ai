import React from 'react';

/**
 * Skeleton Components for Loading States
 * Shows grey animated placeholders instead of "Loading..." text
 */

// Base skeleton with shimmer animation
export const Skeleton = ({ className = "", width, height }) => (
    <div
        className={`animate-pulse bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:200%_100%] rounded ${className}`}
        style={{ width, height }}
    />
);

// Stats card skeleton
export const StatCardSkeleton = () => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <Skeleton className="h-4 w-24 mb-3" />
        <Skeleton className="h-8 w-16" />
    </div>
);

// Table row skeleton
export const TableRowSkeleton = ({ columns = 4 }) => (
    <tr className="border-b border-slate-100">
        {Array(columns).fill(0).map((_, i) => (
            <td key={i} className="px-6 py-4">
                <Skeleton className="h-5 w-full max-w-[120px]" />
            </td>
        ))}
    </tr>
);

// Test card skeleton
export const TestCardSkeleton = () => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex justify-between items-start mb-4">
            <Skeleton className="h-12 w-12 rounded-lg" />
            <Skeleton className="h-6 w-16 rounded-full" />
        </div>
        <Skeleton className="h-6 w-3/4 mb-2" />
        <Skeleton className="h-4 w-1/2 mb-4" />
        <div className="flex gap-4">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
        </div>
    </div>
);

// Organization table skeleton
export const OrganizationTableSkeleton = ({ rows = 5 }) => (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
            <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-4"><Skeleton className="h-4 w-24" /></th>
                    <th className="px-6 py-4"><Skeleton className="h-4 w-16" /></th>
                    <th className="px-6 py-4 text-center"><Skeleton className="h-4 w-16 mx-auto" /></th>
                    <th className="px-6 py-4 text-right"><Skeleton className="h-4 w-16 ml-auto" /></th>
                </tr>
            </thead>
            <tbody>
                {Array(rows).fill(0).map((_, i) => (
                    <TableRowSkeleton key={i} columns={4} />
                ))}
            </tbody>
        </table>
    </div>
);

// Full page skeleton for admin pages
export const AdminPageSkeleton = ({ title = "Loading..." }) => (
    <div className="max-w-5xl mx-auto pb-20 px-4">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
                <Skeleton className="h-8 w-64 mb-2" />
                <Skeleton className="h-4 w-48" />
            </div>
            <div className="flex gap-3">
                <Skeleton className="h-10 w-24 rounded-lg" />
                <Skeleton className="h-10 w-32 rounded-lg" />
            </div>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
        </div>

        {/* Table */}
        <OrganizationTableSkeleton rows={5} />
    </div>
);

export default Skeleton;
