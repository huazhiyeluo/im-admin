import { createRouter, createWebHashHistory } from 'vue-router'
import NProgress from 'nprogress';
import { Session } from '@/utils/storage';
import { staticRoutes} from '@/router/route';

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: '/',
      component: () => import('@/views/chat.vue'),
    },
    ...staticRoutes
  ]
})

router.beforeEach((to, from, next) => {
  const token = Session.get('token');
  if (to.path === '/login' && !token) {
    next()
  } else {
    if (!token) {
      next('/login')
      Session.clear();
    } else if (token && to.path === '/login') {
      next('/')
    } else {
      next()
    }
  }
})

// 路由加载后
router.afterEach(() => {
	NProgress.done();
});


export default router
