<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAppStore, useAuthStore } from '@/stores'
import { confirmDialog } from '@/utils/confirm'
import {
  hasHeaderRefreshHandler,
  isHeaderRefreshing,
  triggerHeaderRefresh
} from '@/composables/useHeaderRefresh'
import ThemeSelect from '@/components/ThemeSelect/index.vue'
import LocaleSelect from '@/components/LocaleSelect/index.vue'
import Breadcrumb from '@/components/Breadcrumb/index.vue'
import type { DropdownItem } from '@/components/types'

const router = useRouter()
const appStore = useAppStore()
const authStore = useAuthStore()
const { t } = useI18n()

const userInitial = computed(() => authStore.userName.charAt(0).toUpperCase() || 'U')

const userMenuItems = computed<DropdownItem[]>(() => [
  {
    key: 'profile',
    label: t('navbar.profile'),
    icon: 'User'
  },
  {
    key: 'logout',
    label: t('navbar.logout'),
    icon: 'LogOut',
    divided: true,
    tone: 'danger'
  }
])

function toggleSidebar() {
  appStore.toggleSidebar()
}

function handleHeaderRefresh() {
  if (isHeaderRefreshing.value) {
    return
  }
  void triggerHeaderRefresh()
}

async function handleCommand(command: string) {
  switch (command) {
    case 'profile':
      router.push('/profile')
      break
    case 'logout':
      try {
        await confirmDialog(t('navbar.logoutConfirm'), t('navbar.dialogTitle'), {
          confirmButtonText: t('common.confirm'),
          cancelButtonText: t('common.cancel'),
          type: 'warning'
        })
        await authStore.logout()
        router.push('/login')
      } catch {
        // 取消退出
      }
      break
  }
}
</script>

<template>
  <div class="navbar">
    <div class="left-menu">
      <button
        type="button"
        class="hamburger-container"
        :aria-expanded="appStore.sidebar.opened"
        aria-label="Toggle navigation"
        @click="toggleSidebar"
      >
        <AppIcon
          :name="appStore.sidebar.opened ? 'PanelLeftClose' : 'PanelLeftOpen'"
          :size="20"
        />
      </button>
      <Breadcrumb />
    </div>

    <div class="right-menu">
      <div class="nav-tools">
        <AppTooltip
          v-if="hasHeaderRefreshHandler"
          :content="t('common.refresh')"
          placement="bottom"
        >
          <button
            type="button"
            class="nav-icon-btn"
            :aria-label="t('common.refresh')"
            :disabled="isHeaderRefreshing"
            @click="handleHeaderRefresh"
          >
            <AppIcon
              name="RotateCw"
              :size="18"
              :spin="isHeaderRefreshing"
            />
          </button>
        </AppTooltip>
        <ThemeSelect />
        <LocaleSelect icon-only />
      </div>

      <AppDropdown
        class="avatar-container right-menu-item"
        :items="userMenuItems"
        placement="bottom-end"
        :aria-label="authStore.userName || t('navbar.profile')"
        @select="handleCommand"
      >
        <template #trigger>
          <button
            type="button"
            class="avatar-wrapper"
          >
            <AppAvatar
              :size="28"
              :src="authStore.avatar"
              :alt="authStore.userName"
              :fallback="userInitial"
              aria-hidden="true"
              class="navbar-avatar"
              :class="{ 'is-generated': !authStore.avatar }"
            />
            <span class="user-name">{{ authStore.userName }}</span>
            <AppIcon
              name="ChevronDown"
              :size="12"
              class="avatar-caret"
            />
          </button>
        </template>
      </AppDropdown>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.navbar {
  height: var(--navbar-height);
  background: var(--app-surface);
  backdrop-filter: var(--glass-backdrop-filter);
  -webkit-backdrop-filter: var(--glass-backdrop-filter);
  border-bottom: 1px solid var(--border-color);
  box-shadow: none;
  display: flex;
  justify-content: space-between;
  align-items: center;

  .left-menu {
    display: flex;
    align-items: center;
    flex: 1 1 auto;
    min-width: 0;
    height: 100%;

    .hamburger-container {
      @include button-reset;
      width: var(--navbar-height);
      height: var(--navbar-height);
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: var(--text-secondary);
      transition:
        background-color $transition-fast,
        color $transition-fast;

      &:hover {
        background: var(--app-accent-soft);
        color: var(--primary-text);
      }

      &:focus-visible {
        outline: 2px solid var(--app-input-border-focus);
        outline-offset: -2px;
        background: var(--focus-bg);
        color: var(--focus-text);
      }
    }
  }

  .right-menu {
    display: flex;
    align-items: center;
    flex: 0 0 auto;
    height: 100%;
    gap: 6px;
    padding-right: 20px;

    @include mobile {
      padding-right: 12px;
      gap: 4px;
    }

    .nav-tools {
      display: flex;
      align-items: center;
      gap: 4px;
      height: 100%;

      .nav-icon-btn,
      :deep(.theme-select-container),
      :deep(.locale-select-container),
      :deep(.locale-select-container.icon-only) {
        @include button-reset;
        width: var(--floating-control-size);
        height: var(--floating-control-size);
        min-width: var(--floating-control-size);
        padding: 0;
        border-radius: var(--app-radius-sm);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: transparent;
        color: var(--text-secondary);
        box-shadow: none;
        transition:
          background-color $transition-fast,
          color $transition-fast;

        &:hover:not(:disabled) {
          background: var(--app-accent-soft);
          color: var(--primary-text);
        }
      }

      .nav-icon-btn:disabled {
        cursor: progress;
        opacity: 0.65;
      }
    }

    .avatar-container {
      display: inline-flex;
      align-items: center;
      cursor: pointer;

      .avatar-wrapper {
        @include button-reset;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        height: var(--floating-control-size);
        padding: 0 8px;
        border-radius: var(--app-radius-sm);
        transition: background-color $transition-fast;

        &:hover {
          background: var(--app-accent-soft);
        }

        .navbar-avatar {
          flex-shrink: 0;

          &.is-generated {
            background: var(--primary-subtle);
            border: 1px solid var(--data-badge-info-border);
            color: var(--primary-text);
            font-weight: 700;
            font-size: 13px;
            box-shadow: none;
          }
        }

        .user-name {
          font-size: 13.5px;
          font-weight: 500;
          color: var(--text-primary);
          max-width: 120px;
          @include text-ellipsis;

          @include mobile {
            display: none;
          }
        }

        .avatar-caret {
          color: var(--text-tertiary);
        }
      }
    }
  }
}
</style>
