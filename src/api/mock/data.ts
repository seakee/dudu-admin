import type { LoginData, UserInfo, Menu, Role, Permission, OAuthAccount, PasskeyItem } from '@/types/api'

export interface MockPasskeyRecord extends PasskeyItem {
    credential_id: string
}

export const mockLoginData: LoginData = {
    token: 'mock-token-123456',
    expires_in: 7200
}

export const mockUserInfo: UserInfo = {
    id: 1,
    user_name: 'Admin User',
    role_name: '超级管理员',
    email: 'admin@example.com',
    phone: '+8613800000000',
    avatar: 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png',
    status: 1,
    created_at: '2023-01-01 00:00:00',
    totp_enabled: false,
    passkey_count: 0,
    // 添加完整的权限列表
    access: [
        'super_admin',
        // 用户管理权限
        'user:view', 'user:create', 'user:update', 'user:delete', 'user:role', 'user:password',
        // 角色管理权限
        'role:view', 'role:create', 'role:update', 'role:delete', 'role:permission',
        // 权限管理权限
        'permission:view', 'permission:create', 'permission:update', 'permission:delete',
        // 菜单管理权限
        'menu:view', 'menu:create', 'menu:update', 'menu:delete',
        // 操作记录权限
        'operation:view'
    ]
}

// 模拟后端返回的菜单结构
export const mockMenus: Menu[] = [
    {
        ID: 1,
        parent_id: 0,
        name: 'Dashboard',
        path: '/dashboard',
        icon: 'Odometer',
        sort: 1,
        hidden: false,
        permission_id: 0,
        children: [
            {
                ID: 2,
                parent_id: 1,
                name: 'DashboardIndex',
                path: 'index',
                icon: 'Odometer',
                sort: 1,
                hidden: false,
                permission_id: 0
            }
        ]
    },
    {
        ID: 3,
        parent_id: 0,
        name: 'System',
        path: '/system',
        icon: 'Setting',
        sort: 2,
        hidden: false,
        permission_id: 0,
        children: [
            {
                ID: 4,
                parent_id: 3,
                name: 'User',
                path: 'user',
                icon: 'User',
                sort: 1,
                hidden: false,
                permission_id: 0
            },
            {
                ID: 5,
                parent_id: 3,
                name: 'Role',
                path: 'role',
                icon: 'UserFilled',
                sort: 2,
                hidden: false,
                permission_id: 0
            },
            {
                ID: 6,
                parent_id: 3,
                name: 'Permission',
                path: 'permission',
                icon: 'Lock',
                sort: 3,
                hidden: false,
                permission_id: 0
            },
            {
                ID: 7,
                parent_id: 3,
                name: 'Menu',
                path: 'menu',
                icon: 'Menu',
                sort: 4,
                hidden: false,
                permission_id: 0
            },
            {
                ID: 8,
                parent_id: 3,
                name: 'Operation',
                path: 'operation',
                icon: 'Document',
                sort: 5,
                hidden: false,
                permission_id: 0
            }
        ]
    }
]

export const mockUserList: UserInfo[] = [
    mockUserInfo,
    {
        id: 2,
        user_name: 'Test User',
        email: 'test@example.com',
        phone: '+8613800000001',
        avatar: '',
        status: 1,
        created_at: '2023-01-02 00:00:00',
        totp_enabled: false,
        passkey_count: 0,
        access: ['user:view']
    }
]

export const mockOAuthAccounts: OAuthAccount[] = [
    {
        id: 1,
        provider: 'feishu',
        provider_tenant: 'tenant-a',
        display_name: '飞书管理员',
        avatar_url: 'https://example.com/avatar/feishu-admin.png',
        bound_at: '2025-01-15T10:30:00+08:00',
        last_login_at: '2026-03-10T09:20:00+08:00'
    }
]

// Passkey 凭证必须由当前浏览器真实注册，不能预置不可认证的假 credential_id。
export const mockPasskeysByUserId: Record<number, MockPasskeyRecord[]> = {
    1: [],
    2: []
}

// 模拟角色数据
export const mockRoles: Role[] = [
    {
        ID: 1,
        name: '超级管理员',
        description: '拥有系统所有权限',
        CreatedAt: '2023-01-01 00:00:00'
    },
    {
        ID: 2,
        name: '普通管理员',
        description: '拥有基本管理权限',
        CreatedAt: '2023-01-05 00:00:00'
    },
    {
        ID: 3,
        name: '访客',
        description: '只有查看权限',
        CreatedAt: '2023-01-10 00:00:00'
    }
]

// 模拟权限数据
export const mockPermissions: Permission[] = [
    // 用户管理权限
    { ID: 1, name: 'user:view', description: '查看用户', type: 'menu', group: '用户管理' },
    { ID: 2, name: 'user:create', description: '创建用户', type: 'button', group: '用户管理' },
    { ID: 3, name: 'user:update', description: '编辑用户', type: 'button', group: '用户管理' },
    { ID: 4, name: 'user:delete', description: '删除用户', type: 'button', group: '用户管理' },
    { ID: 5, name: 'user:role', description: '分配角色', type: 'button', group: '用户管理' },
    { ID: 6, name: 'user:password', description: '重置密码', type: 'button', group: '用户管理' },
    // 角色管理权限
    { ID: 10, name: 'role:view', description: '查看角色', type: 'menu', group: '角色管理' },
    { ID: 11, name: 'role:create', description: '创建角色', type: 'button', group: '角色管理' },
    { ID: 12, name: 'role:update', description: '编辑角色', type: 'button', group: '角色管理' },
    { ID: 13, name: 'role:delete', description: '删除角色', type: 'button', group: '角色管理' },
    { ID: 14, name: 'role:permission', description: '分配权限', type: 'button', group: '角色管理' },
    // 权限管理权限
    { ID: 20, name: 'permission:view', description: '查看权限', type: 'menu', group: '权限管理' },
    { ID: 21, name: 'permission:create', description: '创建权限', type: 'button', group: '权限管理' },
    { ID: 22, name: 'permission:update', description: '编辑权限', type: 'button', group: '权限管理' },
    { ID: 23, name: 'permission:delete', description: '删除权限', type: 'button', group: '权限管理' },
    // 菜单管理权限
    { ID: 30, name: 'menu:view', description: '查看菜单', type: 'menu', group: '菜单管理' },
    { ID: 31, name: 'menu:create', description: '创建菜单', type: 'button', group: '菜单管理' },
    { ID: 32, name: 'menu:update', description: '编辑菜单', type: 'button', group: '菜单管理' },
    { ID: 33, name: 'menu:delete', description: '删除菜单', type: 'button', group: '菜单管理' },
    // 操作记录权限
    { ID: 40, name: 'operation:view', description: '查看操作记录', type: 'menu', group: '操作记录' }
]

// 模拟菜单树数据（用于菜单管理页面）
export const mockMenuTree: Menu[] = [
    {
        ID: 1,
        parent_id: 0,
        name: '首页',
        path: '/dashboard',
        icon: 'Odometer',
        sort: 1,
        hidden: false,
        permission_id: 0,
        children: [
            {
                ID: 2,
                parent_id: 1,
                name: '仪表盘',
                path: 'index',
                icon: 'Odometer',
                sort: 1,
                hidden: false,
                permission_id: 0
            }
        ]
    },
    {
        ID: 3,
        parent_id: 0,
        name: '系统管理',
        path: '/system',
        icon: 'Setting',
        sort: 2,
        hidden: false,
        permission_id: 0,
        children: [
            {
                ID: 4,
                parent_id: 3,
                name: '用户管理',
                path: 'user',
                icon: 'User',
                sort: 1,
                hidden: false,
                permission_id: 1
            },
            {
                ID: 5,
                parent_id: 3,
                name: '角色管理',
                path: 'role',
                icon: 'UserFilled',
                sort: 2,
                hidden: false,
                permission_id: 10
            },
            {
                ID: 6,
                parent_id: 3,
                name: '权限管理',
                path: 'permission',
                icon: 'Lock',
                sort: 3,
                hidden: false,
                permission_id: 20
            },
            {
                ID: 7,
                parent_id: 3,
                name: '菜单管理',
                path: 'menu',
                icon: 'Menu',
                sort: 4,
                hidden: false,
                permission_id: 30
            },
            {
                ID: 8,
                parent_id: 3,
                name: '操作记录',
                path: 'operation',
                icon: 'Document',
                sort: 5,
                hidden: false,
                permission_id: 40
            }
        ]
    }
]

// 角色权限映射
export const mockRolePermissions: Record<number, number[]> = {
    1: [1, 2, 3, 4, 5, 6, 10, 11, 12, 13, 14, 20, 21, 22, 23, 30, 31, 32, 33, 40], // 超级管理员拥有所有权限
    2: [1, 2, 3, 10, 20, 30, 40], // 普通管理员
    3: [1, 10, 20, 30, 40] // 访客只有查看权限
}
