import { create } from 'zustand';
import api from '../api';

/**
 * Admin Data Store with Caching
 * Caches API responses to prevent repeated loading states
 */
const useAdminStore = create((set, get) => ({
    // Cache for tests
    tests: [],
    testsLoaded: false,
    testsLoading: false,

    // Cache for organizations
    organizations: [],
    orgsLoaded: false,
    orgsLoading: false,

    // Cache for stats
    stats: { total_tests: 0, total_students: 0, total_submissions: 0, active_tests: 0 },
    statsLoaded: false,

    // Last fetch timestamps
    testsLastFetch: 0,
    orgsLastFetch: 0,
    statsLastFetch: 0,

    // Cache duration: 2 minutes
    CACHE_TTL: 2 * 60 * 1000,

    /**
     * Fetch tests with caching
     * @param {boolean} force - Force refresh ignoring cache
     */
    fetchTests: async (force = false) => {
        const { testsLastFetch, CACHE_TTL, testsLoading, tests } = get();
        const now = Date.now();

        // Return cached data if still valid
        if (!force && tests.length > 0 && (now - testsLastFetch) < CACHE_TTL) {
            return tests;
        }

        // Already loading, don't duplicate request
        if (testsLoading) return tests;

        set({ testsLoading: true });

        try {
            const res = await api.get('/admin/tests');
            set({
                tests: res.data,
                testsLoaded: true,
                testsLoading: false,
                testsLastFetch: Date.now()
            });
            return res.data;
        } catch (err) {
            console.error("Failed to fetch tests", err);
            set({ testsLoading: false });
            return [];
        }
    },

    /**
     * Fetch organizations with caching
     */
    fetchOrganizations: async (force = false) => {
        const { orgsLastFetch, CACHE_TTL, orgsLoading, organizations } = get();
        const now = Date.now();

        if (!force && organizations.length > 0 && (now - orgsLastFetch) < CACHE_TTL) {
            return organizations;
        }

        if (orgsLoading) return organizations;

        set({ orgsLoading: true });

        try {
            const res = await api.get('/admin/organizations');
            set({
                organizations: res.data,
                orgsLoaded: true,
                orgsLoading: false,
                orgsLastFetch: Date.now()
            });
            return res.data;
        } catch (err) {
            console.error("Failed to fetch organizations", err);
            set({ orgsLoading: false });
            return [];
        }
    },

    /**
     * Fetch stats with caching
     */
    fetchStats: async (force = false) => {
        const { statsLastFetch, CACHE_TTL, stats } = get();
        const now = Date.now();

        if (!force && (now - statsLastFetch) < CACHE_TTL) {
            return stats;
        }

        try {
            const res = await api.get('/admin/stats');
            set({
                stats: res.data,
                statsLoaded: true,
                statsLastFetch: Date.now()
            });
            return res.data;
        } catch (err) {
            console.error("Failed to fetch stats", err);
            return stats;
        }
    },

    /**
     * Update a test locally (optimistic update)
     */
    updateTest: (testId, updates) => {
        set(state => ({
            tests: state.tests.map(t =>
                t.id === testId ? { ...t, ...updates } : t
            )
        }));
    },

    /**
     * Remove a test locally
     */
    removeTest: (testId) => {
        set(state => ({
            tests: state.tests.filter(t => t.id !== testId)
        }));
    },

    /**
     * Update an organization locally (optimistic update)
     */
    updateOrg: (orgId, updates) => {
        set(state => ({
            organizations: state.organizations.map(o =>
                o.id === orgId ? { ...o, ...updates } : o
            )
        }));
    },

    /**
     * Remove an organization locally
     */
    removeOrg: (orgId) => {
        set(state => ({
            organizations: state.organizations.filter(o => o.id !== orgId)
        }));
    },

    /**
     * Add a new organization
     */
    addOrg: (org) => {
        set(state => ({
            organizations: [...state.organizations, org]
        }));
    },

    /**
     * Invalidate all caches (after mutations)
     */
    invalidateAll: () => {
        set({
            testsLastFetch: 0,
            orgsLastFetch: 0,
            statsLastFetch: 0
        });
    }
}));

export default useAdminStore;
