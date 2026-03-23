<script setup lang="ts">
import { useAppStore, useAuthStore } from '@/stores'
import { ElMessageBox } from 'element-plus'
import ThemeSelect from '@/components/ThemeSelect/index.vue'
import LocaleSelect from '@/components/LocaleSelect/index.vue'
import Breadcrumb from '@/components/Breadcrumb/index.vue'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const appStore = useAppStore()
const authStore = useAuthStore()
const { t } = useI18n()

function toggleSidebar() {
  appStore.toggleSidebar()
}

async function handleCommand(command: string) {
  switch (command) {
    case 'profile':
      router.push('/profile')
      break
    case 'logout':
      try {
        await ElMessageBox.confirm(t('navbar.logoutConfirm'), t('navbar.dialogTitle'), {
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
      <div
        class="hamburger-container"
        @click="toggleSidebar"
      >
        <el-icon :size="20">
          <Fold v-if="appStore.sidebar.opened" />
          <Expand v-else />
        </el-icon>
      </div>
      <Breadcrumb />
    </div>

    <div class="right-menu">
      <div class="nav-tools">
        <ThemeSelect />
        <LocaleSelect icon-only />
      </div>
      <el-dropdown
        class="avatar-container right-menu-item"
        trigger="click"
        @command="handleCommand"
      >
        <div class="avatar-wrapper">
          <el-avatar
            :size="30"
            :src="authStore.avatar"
            class="navbar-avatar"
            :class="{ 'is-generated': !authStore.avatar }"
          >
            {{ authStore.userName.charAt(0) }}
          </el-avatar>
          <span class="user-name">{{ authStore.userName }}</span>
          <el-icon><CaretBottom /></el-icon>
        </div>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="profile">
              <el-icon><User /></el-icon>
              {{ t('navbar.profile') }}
            </el-dropdown-item>
            <el-dropdown-item
              divided
              command="logout"
            >
              <el-icon><SwitchButton /></el-icon>
              {{ t('navbar.logout') }}
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.navbar {
  height: 50px;
  overflow: hidden;
  background: var(--app-surface);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--app-border);
  box-shadow: var(--app-shadow-soft);
  display: flex;
  justify-content: space-between;
  align-items: center;

  .left-menu {
    display: flex;
    align-items: center;

    .hamburger-container {
      padding: 0 15px;
      cursor: pointer;
      transition: background 0.3s;
      display: flex;
      align-items: center;

      &:hover {
        background: var(--app-accent-soft);
      }
    }
  }

  .right-menu {
    display: flex;
    align-items: center;
    padding-right: 20px;

    .nav-tools {
      display: flex;
      align-items: center;
      gap: 4px;
      height: 100%;
      margin-right: 6px;

      :deep(.theme-select-container),
      :deep(.locale-select-container) {
        padding: 0 6px;
        height: 100%;
        display: flex;
        align-items: center;
        background: transparent;
        border: 0;
        box-shadow: none;
        color: var(--app-text-regular);
        transition: color 0.2s ease;
      }

      :deep(.locale-select-container.icon-only) {
        padding: 0 6px;
      }

      :deep(.theme-select-container:hover),
      :deep(.locale-select-container:hover) {
        color: var(--el-color-primary);
      }
    }

    .right-menu-item {
      display: inline-block;
      padding: 0 8px;
      height: 100%;
      font-size: 18px;
      color: var(--app-text-regular);
      vertical-align: text-bottom;

      &.hover-effect {
        cursor: pointer;
        transition: background 0.3s;

        &:hover {
          background: var(--app-accent-soft);
        }
      }
    }

    .avatar-container {
      cursor: pointer;

      .avatar-wrapper {
        display: flex;
        align-items: center;
        gap: 8px;

        .navbar-avatar {
          transition: all 0.25s ease;

          &.is-generated {
            background: linear-gradient(145deg, #f2f8ff 0%, #deeeff 100%);
            border: 1px solid rgba(10, 126, 220, 0.25);
            color: #1d72d6;
            font-weight: 700;
            box-shadow:
              inset 0 0 0 1px rgba(255, 255, 255, 0.75),
              0 4px 10px rgba(10, 126, 220, 0.18);
          }
        }

        .user-name {
          font-size: 14px;
          color: var(--el-text-color-primary);
        }
      }

      &:hover {
        .navbar-avatar.is-generated {
          box-shadow:
            inset 0 0 0 1px rgba(255, 255, 255, 0.82),
            0 6px 14px rgba(10, 126, 220, 0.24);
          transform: translateY(-1px);
        }
      }
    }
  }
}

:global(html.dark) .navbar .right-menu .avatar-container .avatar-wrapper .navbar-avatar.is-generated {
  background: linear-gradient(145deg, rgba(56, 130, 246, 0.42) 0%, rgba(30, 64, 175, 0.45) 100%);
  border-color: rgba(114, 180, 255, 0.4);
  color: #edf4ff;
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.12),
    0 4px 12px rgba(14, 24, 55, 0.42);
}
</style>
