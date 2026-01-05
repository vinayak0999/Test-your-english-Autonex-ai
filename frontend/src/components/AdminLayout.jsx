import React from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import Logo from './Logo';
import { LayoutDashboard, PlusCircle, Users, LogOut, FileText, Building } from 'lucide-react';

const AdminLayout = () => {
    const { logout } = useAuthStore();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        logout();
        navigate('/admin/login');
    };

    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/dashboard' },
        { icon: Building, label: 'Organizations', path: '/admin/organizations' },
        { icon: FileText, label: 'Manage Tests', path: '/admin/tests' },
        { icon: PlusCircle, label: 'Create Test', path: '/admin/create-test' },
        { icon: Users, label: 'Recruitment Results', path: '/admin/results' },
    ];

    return (
        <div className="min-h-screen bg-slate-100 flex">
            {/* Sidebar */}
            <aside className="w-64 bg-slate-900 text-white hidden md:flex flex-col fixed h-full z-10">
                <div className="p-6 border-b border-slate-800">
                    <Logo textClass="text-white text-lg" />
                    <span className="text-xs text-slate-400 mt-2 block uppercase tracking-widest">Admin Panel</span>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${isActive
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50'
                                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                    }`}
                            >
                                <item.icon size={20} />
                                <span className="font-medium">{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-3 w-full text-slate-400 hover:text-red-400 hover:bg-red-900/10 rounded-lg transition-colors"
                    >
                        <LogOut size={20} />
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 md:ml-64 p-8 overflow-y-auto">
                <Outlet />
            </main>
        </div>
    );
};

export default AdminLayout;
