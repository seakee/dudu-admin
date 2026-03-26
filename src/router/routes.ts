import type { RouteRecordRaw } from 'vue-router'

// 静态路由
export const constantRoutes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
    meta: {
      title: '登录',
      titleKey: 'route.login',
      hidden: true
    }
  },
  {
    path: '/password/reset',
    name: 'PasswordReset',
    component: () => import('@/views/login/reset.vue'),
    meta: {
      title: '重置密码',
      titleKey: 'route.passwordReset',
      hidden: true
    }
  },
  {
    path: '/auth/callback',
    name: 'OAuthCallback',
    component: () => import('@/views/login/oauth.vue'),
    meta: {
      title: '第三方登录',
      titleKey: 'route.oauth',
      hidden: true
    }
  },
  {
    path: '/profile',
    component: () => import('@/layouts/default/index.vue'),
    meta: { title: '个人中心', titleKey: 'route.profile', hidden: true },
    children: [
      {
        path: '',
        name: 'Profile',
        component: () => import('@/views/profile/index.vue'),
        meta: {
          title: '个人中心',
          titleKey: 'route.profile',
          hidden: true
        }
      }
    ]
  },
  {
    path: '/redirect',
    component: () => import('@/layouts/default/index.vue'),
    meta: { hidden: true },
    children: [
      {
        path: '/redirect/:path(.*)',
        component: () => import('@/views/redirect/index.vue')
      }
    ]
  },
  {
    path: '/404',
    name: '404',
    component: () => import('@/views/error/404.vue'),
    meta: {
      title: '404',
      titleKey: 'route.notFound',
      hidden: true
    }
  }
]

// 动态路由（需要权限）
export const asyncRoutes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('@/layouts/default/index.vue'),
    redirect: '/home',
    children: [
      {
        path: 'home',
        name: 'Home',
        component: () => import('@/views/dashboard/index.vue'),
        meta: {
          title: '首页',
          titleKey: 'route.dashboard',
          icon: 'HomeFilled',
          affix: true
        }
      }
    ]
  },
  {
    path: '/system',
    component: () => import('@/layouts/default/index.vue'),
    redirect: '/system/user',
    meta: {
      title: '系统管理',
      titleKey: 'route.system',
      icon: 'Setting'
    },
    children: [
      {
        path: 'user',
        name: 'UserManagement',
        component: () => import('@/views/system/user/index.vue'),
        meta: {
          title: '用户管理',
          titleKey: 'route.user',
          icon: 'User',
          permissions: ['user:view']
        }
      },
      {
        path: 'role',
        name: 'RoleManagement',
        component: () => import('@/views/system/role/index.vue'),
        meta: {
          title: '角色管理',
          titleKey: 'route.role',
          icon: 'UserFilled',
          permissions: ['role:view']
        }
      },
      {
        path: 'permission',
        name: 'PermissionManagement',
        component: () => import('@/views/system/permission/index.vue'),
        meta: {
          title: '权限管理',
          titleKey: 'route.permission',
          icon: 'Lock',
          permissions: ['permission:view']
        }
      },
      {
        path: 'menu',
        name: 'MenuManagement',
        component: () => import('@/views/system/menu/index.vue'),
        meta: {
          title: '菜单管理',
          titleKey: 'route.menu',
          icon: 'Menu',
          permissions: ['menu:view']
        }
      },
      {
        path: 'operation',
        name: 'OperationLog',
        component: () => import('@/views/system/operation/index.vue'),
        meta: {
          title: '操作记录',
          titleKey: 'route.operation',
          icon: 'Document',
          permissions: ['operation:view']
        }
      }
    ]
  },
  // 404 页面必须放在最后
  {
    path: '/:pathMatch(.*)*',
    redirect: '/404',
    meta: { hidden: true }
  }
]

export function getBaseRoutes(): RouteRecordRaw[] {
  return [
    ...constantRoutes,
    {
      path: '/:pathMatch(.*)*',
      name: 'ProtectedRoutePlaceholder',
      component: () => import('@/layouts/default/index.vue'),
      meta: {
        hidden: true,
        requiresAuth: true,
        bootstrapPlaceholder: true
      }
    }
  ]
}
