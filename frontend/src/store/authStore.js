import { create } from 'zustand';
import api from '../api';

// Helper to get stored user from localStorage
const getStoredUser = () => {
    try {
        const stored = localStorage.getItem('user');
        return stored ? JSON.parse(stored) : null;
    } catch {
        return null;
    }
};

const useAuthStore = create((set) => ({
    user: getStoredUser(),  // Restore user on init
    token: localStorage.getItem('token') || null,
    isAuthenticated: !!localStorage.getItem('token'),
    isLoading: false,
    error: null,

    login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
            const res = await api.post('/auth/login', { email, password });
            const { access_token, user_name, role } = res.data;

            const userData = { name: user_name, role };

            // Save BOTH token AND user to localStorage
            localStorage.setItem('token', access_token);
            localStorage.setItem('user', JSON.stringify(userData));

            set({
                token: access_token,
                isAuthenticated: true,
                user: userData,
                isLoading: false
            });

            return true;
        } catch (err) {
            set({
                error: err.response?.data?.detail || 'Login failed',
                isLoading: false
            });
            return false;
        }
    },

    // Separate admin login using /auth/admin-login
    adminLogin: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
            const res = await api.post('/auth/admin-login', { email, password });
            const { access_token, user_name, role } = res.data;

            const userData = { name: user_name, role };

            localStorage.setItem('token', access_token);
            localStorage.setItem('user', JSON.stringify(userData));

            set({
                token: access_token,
                isAuthenticated: true,
                user: userData,
                isLoading: false
            });

            return true;
        } catch (err) {
            set({
                error: err.response?.data?.detail || 'Admin login failed',
                isLoading: false
            });
            return false;
        }
    },

    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        set({ token: null, user: null, isAuthenticated: false });
    }
}));

export default useAuthStore;
