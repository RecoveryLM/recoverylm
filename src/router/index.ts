import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useVault } from '@/composables/useVault'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    children: [
      {
        path: '',
        name: 'dashboard',
        component: () => import('@/pages/DashboardPage.vue'),
        meta: { requiresAuth: true, requiresOnboarding: true }
      },
      {
        path: 'chat',
        name: 'chat',
        component: () => import('@/pages/ChatPage.vue'),
        meta: { requiresAuth: true, requiresOnboarding: true }
      },
      {
        path: 'activities',
        name: 'activities',
        component: () => import('@/pages/ActivitiesPage.vue'),
        meta: { requiresAuth: true, requiresOnboarding: true }
      },
      {
        path: 'metrics',
        name: 'metrics',
        component: () => import('@/pages/MetricsPage.vue'),
        meta: { requiresAuth: true, requiresOnboarding: true }
      },
      {
        path: 'journal',
        name: 'journal',
        component: () => import('@/pages/JournalPage.vue'),
        meta: { requiresAuth: true, requiresOnboarding: true }
      },
      {
        path: 'network',
        name: 'network',
        component: () => import('@/pages/NetworkPage.vue'),
        meta: { requiresAuth: true, requiresOnboarding: true }
      },
      {
        path: 'settings',
        name: 'settings',
        component: () => import('@/pages/SettingsPage.vue'),
        meta: { requiresAuth: true }
      }
    ]
  },
  {
    path: '/onboarding',
    name: 'onboarding',
    component: () => import('@/pages/OnboardingPage.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/unlock',
    name: 'unlock',
    component: () => import('@/pages/UnlockPage.vue')
  },
  {
    path: '/setup',
    name: 'setup',
    component: () => import('@/pages/SetupPage.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Navigation guards
router.beforeEach(async (to, _from, next) => {
  const { isUnlocked, needsSetup, getProfile } = useVault()

  // If vault is locked and route requires auth, redirect to unlock (which handles both new and returning users)
  if (to.meta.requiresAuth && !isUnlocked.value) {
    return next({ name: 'unlock' })
  }

  // If route requires onboarding, check if user has completed it
  if (to.meta.requiresOnboarding && isUnlocked.value) {
    const profile = await getProfile()
    if (!profile?.onboardingComplete) {
      return next({ name: 'onboarding' })
    }
  }

  // If user is unlocked and tries to go to unlock/setup, redirect to dashboard
  if (isUnlocked.value && (to.name === 'unlock' || to.name === 'setup')) {
    return next({ name: 'dashboard' })
  }

  // If user hasn't set up vault and tries to go somewhere other than unlock/setup, redirect to unlock
  if (needsSetup.value && to.name !== 'unlock' && to.name !== 'setup') {
    return next({ name: 'unlock' })
  }

  next()
})

export default router
