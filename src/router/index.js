import { useUserStore } from '@/stores/userStore';
import { createRouter, createWebHistory } from 'vue-router';
import { setupAuthGuards } from './guards';

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: '/',
            redirect: (to) => {
                const userStore = useUserStore();
                return `/${userStore.userDetails?.user_id || ''}`;
            }
        },
        {
            path: '/:user_id',
            component: () => import('@/layout/AppLayout.vue'),
            children: [
                {
                    path: '',
                    name: 'dashboard',
                    component: () => import('@/views/Dashboard.vue')
                },
                {
                    path: 'configure',
                    name: 'configure',
                    component: () => import('@/views/ConfigureCompetitors.vue')
                },
                {
                    path: 'settings',
                    name: 'settings',
                    component: () => import('@/views/pages/Settings.vue')
                },
                {
                    path: ':competitor_uuid',
                    name: 'generate',
                    component: () => import('@/views/GenerateBattlecard.vue')
                },
                {
                    path: 'battlecard/:battlecard_uuid',
                    name: 'battlecard',
                    component: () => import('@/views/BattlecardView.vue')
                }
            ]
        },
        {
            path: '/landing',
            name: 'landing',
            component: () => import('@/views/pages/Landing.vue')
        },
        {
            path: '/pages/notfound',
            name: 'notfound',
            component: () => import('@/views/pages/NotFound.vue')
        },

        {
            path: '/auth/login',
            name: 'login',
            component: () => import('@/views/pages/auth/Login.vue')
        },
        {
            path: '/auth/access',
            name: 'accessDenied',
            component: () => import('@/views/pages/auth/Access.vue')
        },
        {
            path: '/auth/error',
            name: 'error',
            component: () => import('@/views/pages/auth/Error.vue')
        }
    ]
});

// Setup authentication guards
setupAuthGuards(router);

export default router;
