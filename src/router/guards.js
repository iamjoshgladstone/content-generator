import { useUserStore } from '@/stores/userStore';
import supabase from '@/utils/supabase';

export async function setupAuthGuards(router) {
    // List of routes that don't require authentication
    const publicRoutes = ['/auth/login', '/auth/error', '/auth/access', '/landing'];

    router.beforeEach(async (to, from, next) => {
        const userStore = useUserStore();

        try {
            // Check current auth state
            const {
                data: { session },
                error
            } = await supabase.auth.getSession();

            if (error) throw error;

            if (!session && !publicRoutes.includes(to.path)) {
                // No session and trying to access protected route
                return next('/auth/login');
            }

            if (session && !userStore.isAuthenticated) {
                // We have a session but store isn't initialized
                await userStore.initializeUserState();
            }

            if (session && to.path === '/auth/login') {
                // Already authenticated, redirect to dashboard
                return next('/');
            }

            // Allow navigation
            next();
        } catch (error) {
            console.error('Navigation guard error:', error);
            next('/auth/error');
        }
    });
}
