<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAppStore, useAuthStore, usePermissionStore } from '@/stores'
import type { Menu } from '@/types/api'
import { useI18n } from 'vue-i18n'
import { resolveRouteTitleKeyByPath } from '@/router/routeTitleKey'
import { getAppName } from '@/utils/app'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const authStore = useAuthStore()
const permissionStore = usePermissionStore()
const { t } = useI18n()

const isCollapse = computed(() => !appStore.sidebar.opened)
const appName = computed(() => getAppName(t('app.name')))
const appNameShort = computed(() => appName.value.charAt(0) || 'A')

// 使用后端菜单或前端路由生成菜单
const menuList = computed(() => {
  if (authStore.menus.length > 0) {
    return authStore.menus
  }
  // 从路由生成菜单
  return permissionStore.routes
    .filter((r) => !r.meta?.hidden)
    .map((r) => ({
      ID: 0,
      parent_id: 0,
      name: String(r.meta?.title || r.name || ''),
      i18n_key: r.meta?.titleKey as string | undefined,
      path: r.path,
      icon: r.meta?.icon as string | undefined,
      sort: 0,
      hidden: false,
      permission_id: 0,
      children: r.children
        ?.filter((c) => !c.meta?.hidden)
        .map((c) => ({
          ID: 0,
          parent_id: 0,
          name: String(c.meta?.title || c.name || ''),
          i18n_key: c.meta?.titleKey as string | undefined,
          path: c.path.startsWith('/') ? c.path : `${r.path}/${c.path}`,
          icon: c.meta?.icon as string | undefined,
          sort: 0,
          hidden: false,
          permission_id: 0
        }))
    })) as Menu[]
})

const activeMenu = computed(() => {
  const { path, meta } = route
  if (meta?.activeMenu) {
    return meta.activeMenu
  }
  return path
})

function handleSelect(index: string) {
  if (index.startsWith('http')) {
    window.open(index)
  } else {
    const routeLocation = router.resolve(index)
    if (routeLocation.matched.length === 0) {
      ElMessage.warning(t('error.notFound'))
      return
    }

    router.push(index)
  }
}

function resolvePath(menu: Menu, parentPath?: string): string {
  if (menu.path.startsWith('http')) {
    return menu.path
  }
  if (menu.path.startsWith('/')) {
    return menu.path
  }
  if (parentPath) {
    const base = parentPath.endsWith('/') ? parentPath.slice(0, -1) : parentPath
    return `${base}/${menu.path}`
  }
  return menu.path
}

function getMenuTitle(menu: Menu, fullPath: string): string {
  const titleKey = menu.i18n_key || resolveRouteTitleKeyByPath(fullPath)
  return titleKey ? t(titleKey) : menu.name
}

function isElementPlusIcon(icon?: string): boolean {
  return !!icon && !icon.includes(' ') && !icon.includes(':')
}

function isFontAwesomeIcon(icon?: string): boolean {
  if (!icon) return false
  return icon.split(/\s+/).some((className) => className.startsWith('fa-'))
}

function getFontAwesomeClassList(icon?: string): string[] {
  if (!icon) return []

  const iconClassList = icon.split(/\s+/).filter(Boolean)
  if (!iconClassList.some((className) => className.startsWith('fa-'))) {
    return []
  }

  const hasStyleClass = iconClassList.some((className) => {
    return ['fa-solid', 'fa-regular', 'fa-brands', 'fa-light', 'fa-thin', 'fa-duotone'].includes(className)
  })

  if (!hasStyleClass) {
    iconClassList.unshift('fa-solid')
  }

  return Array.from(new Set(iconClassList))
}

function getCustomIconClassList(icon?: string): string[] {
  if (!icon) return []

  const iconClassList = icon.split(/\s+/).filter(Boolean)
  if (iconClassList.includes('iconfont')) {
    return iconClassList
  }

  return ['iconfont', ...iconClassList]
}
</script>

<template>
  <div class="sidebar">
    <div class="logo-container">
      <router-link
        to="/"
        class="logo-link"
      >
        <h1
          v-show="!isCollapse"
          class="sidebar-title"
        >
          {{ appName }}
        </h1>
        <h1
          v-show="isCollapse"
          class="sidebar-title"
        >
          {{ appNameShort }}
        </h1>
      </router-link>
    </div>
    <el-scrollbar wrap-class="scrollbar-wrapper">
      <el-menu
        :default-active="activeMenu"
        :collapse="isCollapse"
        :unique-opened="true"
        :collapse-transition="false"
        mode="vertical"
        background-color="var(--sidebar-bg-color)"
        text-color="var(--sidebar-text-color)"
        active-text-color="var(--sidebar-active-text-color)"
        @select="handleSelect"
      >
        <template
          v-for="menu in menuList"
          :key="menu.path"
        >
          <!-- 单级菜单 -->
          <template v-if="!menu.children || menu.children.length === 0">
            <el-menu-item :index="resolvePath(menu)">
              <el-icon v-if="isElementPlusIcon(menu.icon)">
                <component :is="menu.icon" />
              </el-icon>
              <i
                v-else-if="isFontAwesomeIcon(menu.icon)"
                :class="getFontAwesomeClassList(menu.icon)"
              />
              <i
                v-else-if="menu.icon"
                :class="getCustomIconClassList(menu.icon)"
              />
              <template #title>
                {{ getMenuTitle(menu, resolvePath(menu)) }}
              </template>
            </el-menu-item>
          </template>

          <!-- 多级菜单 -->
          <template v-else>
            <el-sub-menu :index="menu.path">
              <template #title>
                <el-icon v-if="isElementPlusIcon(menu.icon)">
                  <component :is="menu.icon" />
                </el-icon>
                <i
                  v-else-if="isFontAwesomeIcon(menu.icon)"
                  :class="getFontAwesomeClassList(menu.icon)"
                />
                <i
                  v-else-if="menu.icon"
                  :class="getCustomIconClassList(menu.icon)"
                />
                <span>{{ getMenuTitle(menu, resolvePath(menu)) }}</span>
              </template>
              <el-menu-item
                v-for="child in menu.children"
                :key="child.path"
                :index="resolvePath(child, menu.path)"
              >
                <el-icon v-if="isElementPlusIcon(child.icon)">
                  <component :is="child.icon" />
                </el-icon>
                <i
                  v-else-if="isFontAwesomeIcon(child.icon)"
                  :class="getFontAwesomeClassList(child.icon)"
                />
                <i
                  v-else-if="child.icon"
                  :class="getCustomIconClassList(child.icon)"
                />
                <template #title>
                  {{ getMenuTitle(child, resolvePath(child, menu.path)) }}
                </template>
              </el-menu-item>
            </el-sub-menu>
          </template>
        </template>
      </el-menu>
    </el-scrollbar>
  </div>
</template>

<style lang="scss" scoped>
.sidebar {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--sidebar-bg-color);
  border-right: 1px solid var(--app-border);

  .logo-container {
    height: 50px;
    line-height: 50px;
    background-color: var(--sidebar-logo-bg-color);
    text-align: center;
    overflow: hidden;

    .logo-link {
      display: block;
      height: 100%;

      .sidebar-title {
        display: inline-block;
        margin: 0;
        color: var(--sidebar-active-text-color);
        font-weight: 600;
        font-size: 14px;
        line-height: 50px;
        vertical-align: middle;
      }
    }
  }

  :deep(.el-scrollbar) {
    flex: 1;
    height: calc(100% - 50px);
    .el-scrollbar__view {
      height: 100%;
    }
  }

  :deep(.el-menu) {
    border: none;
    width: 100% !important;
  }
  
  :deep(.el-menu-item), :deep(.el-sub-menu__title) {
    &:hover {
      background-color: var(--sidebar-hover-bg-color) !important;
    }
  }

  :deep(.el-menu-item), :deep(.el-sub-menu__title) {
    > i:not(.el-sub-menu__icon-arrow) {
      margin-right: 5px;
      width: 24px;
      text-align: center;
      font-size: 14px;
      vertical-align: middle;
    }
  }

  :deep(.el-menu-item.is-active) {
    background-color: var(--sidebar-hover-bg-color) !important;
    color: var(--sidebar-active-text-color) !important;
  }

  :deep(.el-menu--collapse) {
    width: 54px;

    .el-menu-item,
    .el-sub-menu__title {
      padding: 0 !important;
      display: flex;
      justify-content: center;
      align-items: center;

      .el-icon {
        margin: 0;
        width: 1em;
        height: 1em;
      }
    }
  }
}
</style>
