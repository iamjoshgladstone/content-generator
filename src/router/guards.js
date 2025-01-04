import { useUserStore } from '@/stores/userStore';
import supabase from '@/utils/supabase';

export async function setupAuthGuards(router) {
    // List of routes that don't require authentication
    const publicRoutes = ['/auth/login', '/auth/error', '/auth/access', '/landing'];

    router.beforeEach(async (to, from, next) => {
        const userStore = useUserStore();
        console.log('Auth Guard - Current path:', to.path);
        console.log('Auth Guard - Store state:', userStore.isAuthenticated, userStore.userDetails);

        try {
            // Check current auth state
            const {
                data: { session },
                error
            } = await supabase.auth.getSession();

            if (error) throw error;

            console.log('Auth Guard - Session state:', !!session);

            if (!session && !publicRoutes.includes(to.path)) {
                // No session and trying to access protected route
                console.log('Auth Guard - Redirecting to login (no session)');
                return next('/auth/login');
            }

            if (session && !userStore.isAuthenticated) {
                // We have a session but store isn't initialized
                console.log('Auth Guard - Initializing user state');
                await userStore.initializeUserState();
                console.log('Auth Guard - User state initialized:', userStore.userDetails);
            }

            if (session && to.path === '/auth/login') {
                // Already authenticated, redirect to dashboard
                console.log('Auth Guard - Redirecting to home (already authenticated)');
                return next('/');
            }

            // Allow navigation
            console.log('Auth Guard - Allowing navigation');
            next();
        } catch (error) {
            console.error('Navigation guard error:', error);
            next('/auth/error');
        }
    });
}
