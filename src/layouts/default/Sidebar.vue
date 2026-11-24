<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore, useAuthStore, usePermissionStore } from '@/stores'
import type { Menu } from '@/types/api'
import { useI18n } from 'vue-i18n'
import { resolveRouteTitleKeyByPath } from '@/router/routeTitleKey'
import { notify } from '@/utils/notify'
import type { DropdownItem } from '@/components/types'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const authStore = useAuthStore()
const permissionStore = usePermissionStore()
const { t } = useI18n()

const isCollapse = computed(() => appStore.device !== 'mobile' && !appStore.sidebar.opened)
const openedGroupPath = ref<string>('')

// 使用后端菜单或前端路由生成菜单
const menuList = computed(() => {
  if (authStore.menus.length > 0) {
    return authStore.menus
  }
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

function isPathActive(targetPath: string): boolean {
  return activeMenu.value === targetPath
}

function isGroupActive(menu: Menu): boolean {
  if (!menu.children?.length) return false
  return menu.children.some((child) => isPathActive(resolvePath(child, menu.path)))
}

function isGroupOpen(groupPath: string): boolean {
  return openedGroupPath.value === groupPath
}

function toggleGroup(groupPath: string) {
  openedGroupPath.value = openedGroupPath.value === groupPath ? '' : groupPath
}

function getChildDropdownItems(menu: Menu): DropdownItem[] {
  if (!menu.children?.length) return []
  return menu.children.map((child) => {
    const fullPath = resolvePath(child, menu.path)
    return {
      key: fullPath,
      label: getMenuTitle(child, fullPath),
      icon: child.icon || undefined,
      active: isPathActive(fullPath)
    }
  })
}

function handleSelect(index: string) {
  if (index.startsWith('http')) {
    window.open(index)
    return
  }
  const routeLocation = router.resolve(index)
  if (routeLocation.matched.length === 0) {
    notify.warning(t('error.notFound'))
    return
  }
  router.push(index)
}

watch(
  [activeMenu, menuList],
  () => {
    const activeParent = menuList.value.find((menu) => isGroupActive(menu))
    if (activeParent) {
      openedGroupPath.value = activeParent.path
    }
  },
  { immediate: true }
)
</script>

<template>
  <aside
    class="sidebar"
    :class="{ 'is-collapse': isCollapse }"
  >
    <div
      class="logo-container"
      :class="{ 'is-collapse': isCollapse }"
    >
      <router-link
        to="/"
        class="logo-link"
      >
        <AppBrandMark
          layout="inline"
          :collapsed="isCollapse"
        />
      </router-link>
    </div>

    <div class="sidebar-scroll">
      <nav
        class="sidebar-nav"
        aria-label="Primary navigation"
      >
        <ul class="sidebar-menu">
          <li
            v-for="menu in menuList"
            :key="menu.path"
            class="sidebar-menu__entry"
          >
            <!-- 单级菜单 -->
            <template v-if="!menu.children || menu.children.length === 0">
              <AppTooltip
                v-if="isCollapse"
                :content="getMenuTitle(menu, resolvePath(menu))"
                placement="right"
              >
                <button
                  type="button"
                  class="sidebar-item is-collapsed"
                  :class="{ 'is-active': isPathActive(resolvePath(menu)) }"
                  :aria-label="getMenuTitle(menu, resolvePath(menu))"
                  :aria-current="isPathActive(resolvePath(menu)) ? 'page' : undefined"
                  @click="handleSelect(resolvePath(menu))"
                >
                  <AppIcon
                    :name="menu.icon || 'LayoutGrid'"
                    :size="18"
                    class="sidebar-item__icon"
                  />
                </button>
              </AppTooltip>

              <button
                v-else
                type="button"
                class="sidebar-item"
                :class="{ 'is-active': isPathActive(resolvePath(menu)) }"
                :aria-current="isPathActive(resolvePath(menu)) ? 'page' : undefined"
                @click="handleSelect(resolvePath(menu))"
              >
                <AppIcon
                  v-if="menu.icon"
                  :name="menu.icon"
                  :size="17"
                  class="sidebar-item__icon"
                />
                <span class="sidebar-item__label">
                  {{ getMenuTitle(menu, resolvePath(menu)) }}
                </span>
              </button>
            </template>

            <!-- 多级菜单 -->
            <template v-else>
              <AppDropdown
                v-if="isCollapse"
                :items="getChildDropdownItems(menu)"
                placement="bottom-start"
                :aria-label="getMenuTitle(menu, resolvePath(menu))"
                @select="handleSelect"
              >
                <template #trigger>
                  <AppTooltip
                    :content="getMenuTitle(menu, resolvePath(menu))"
                    placement="right"
                  >
                    <button
                      type="button"
                      class="sidebar-item is-collapsed"
                      :class="{ 'is-active': isGroupActive(menu) }"
                      :aria-label="getMenuTitle(menu, resolvePath(menu))"
                    >
                      <AppIcon
                        :name="menu.icon || 'Folder'"
                        :size="18"
                        class="sidebar-item__icon"
                      />
                    </button>
                  </AppTooltip>
                </template>
              </AppDropdown>

              <div
                v-else
                class="sidebar-group"
                :class="{ 'is-active': isGroupActive(menu), 'is-open': isGroupOpen(menu.path) }"
              >
                <button
                  type="button"
                  class="sidebar-item sidebar-group__trigger"
                  :class="{ 'is-group-active': isGroupActive(menu) }"
                  :aria-expanded="isGroupOpen(menu.path)"
                  @click="toggleGroup(menu.path)"
                >
                  <AppIcon
                    v-if="menu.icon"
                    :name="menu.icon"
                    :size="17"
                    class="sidebar-item__icon"
                  />
                  <span class="sidebar-item__label">
                    {{ getMenuTitle(menu, resolvePath(menu)) }}
                  </span>
                  <AppIcon
                    name="ChevronRight"
                    :size="14"
                    class="sidebar-group__arrow"
                  />
                </button>

                <ul
                  v-show="isGroupOpen(menu.path)"
                  class="sidebar-subnav"
                >
                  <li
                    v-for="child in menu.children"
                    :key="child.path"
                  >
                    <button
                      type="button"
                      class="sidebar-item sidebar-subitem"
                      :class="{ 'is-active': isPathActive(resolvePath(child, menu.path)) }"
                      :aria-current="isPathActive(resolvePath(child, menu.path)) ? 'page' : undefined"
                      @click="handleSelect(resolvePath(child, menu.path))"
                    >
                      <AppIcon
                        v-if="child.icon"
                        :name="child.icon"
                        :size="16"
                        class="sidebar-item__icon"
                      />
                      <span class="sidebar-item__label">
                        {{ getMenuTitle(child, resolvePath(child, menu.path)) }}
                      </span>
                    </button>
                  </li>
                </ul>
              </div>
            </template>
          </li>
        </ul>
      </nav>
    </div>
  </aside>
</template>

<style lang="scss" scoped>
.sidebar {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--sidebar-bg-color);
  border-right: 1px solid var(--border-color);

  .logo-container {
    height: var(--navbar-height);
    min-height: var(--navbar-height);
    flex-shrink: 0;
    background-color: var(--sidebar-logo-bg-color);
    border-bottom: 1px solid var(--border-color);
    overflow: hidden;

    .logo-link {
      display: flex;
      align-items: center;
      height: 100%;
      padding: 0 14px;
      text-decoration: none;
      min-width: 0;
    }

    &.is-collapse {
      .logo-link {
        padding: 0;
        justify-content: center;
      }
    }
  }
}

.sidebar-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: var(--border-primary) transparent;
}

.sidebar-nav {
  width: 100%;
  padding: 6px 0;
}

.sidebar-menu,
.sidebar-subnav {
  margin: 0;
  padding: 0;
  list-style: none;
}

.sidebar-item {
  @include button-reset;
  width: calc(100% - 24px);
  height: 44px;
  margin: 4px 12px;
  padding: 0 12px;
  border-radius: var(--app-radius-sm);
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--sidebar-text-color);
  background: transparent;
  text-align: left;
  transition:
    background-color $transition-fast,
    color $transition-fast,
    box-shadow $transition-fast;

  &:hover {
    background: var(--sidebar-hover-bg-color);
    color: var(--sidebar-active-text-color);
  }

  &.is-group-active {
    color: var(--primary-text);
    font-weight: 600;
  }

  &.is-active {
    font-weight: 600;
    background: var(--app-accent-soft);
    color: var(--primary-text);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--primary-color) 18%, transparent);

    &:hover {
      background: var(--app-accent-soft);
      color: var(--primary-text);
    }
  }

  &.is-collapsed {
    width: 38px;
    height: 38px;
    margin: 4px auto;
    padding: 0;
    justify-content: center;
    gap: 0;

    .sidebar-item__icon {
      width: 20px;
      height: 20px;
    }
  }
}

.sidebar-subitem {
  height: 38px;
  padding-left: 32px;
}

.sidebar-item__icon {
  width: 20px;
  min-width: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: currentColor;
}

.sidebar-item__label {
  flex: 1;
  min-width: 0;
  @include text-ellipsis;
}

.sidebar-group__arrow {
  flex-shrink: 0;
  color: var(--text-tertiary);
  transition: transform $transition-fast;
}

.sidebar-group.is-open .sidebar-group__arrow {
  transform: rotate(90deg);
}
</style>
