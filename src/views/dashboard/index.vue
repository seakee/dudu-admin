<script setup lang="ts">
import { useAuthStore } from '@/stores'
import { useI18n } from 'vue-i18n'

const authStore = useAuthStore()
const { t } = useI18n()
</script>

<template>
  <div class="dashboard-container">
    <el-row :gutter="20">
      <el-col :span="24">
        <PageCard
          variant="welcome"
          class="welcome-card"
        >
          <h2>{{ t('dashboard.welcome', { name: authStore.userName }) }}</h2>
          <p>{{ t('dashboard.subtitle') }}</p>
        </PageCard>
      </el-col>
    </el-row>

    <el-row
      :gutter="20"
      class="stat-row"
    >
      <el-col
        :xs="24"
        :sm="12"
        :lg="6"
      >
        <PageCard
          variant="stat"
          shadow="hover"
          class="stat-card"
        >
          <template #header>
            <div class="stat-header">
              <el-icon
                :size="24"
                color="#409eff"
              >
                <User />
              </el-icon>
              <span>{{ t('dashboard.userTotal') }}</span>
            </div>
          </template>
          <div class="stat-value">
            1,234
          </div>
        </PageCard>
      </el-col>
      <el-col
        :xs="24"
        :sm="12"
        :lg="6"
      >
        <PageCard
          variant="stat"
          shadow="hover"
          class="stat-card"
        >
          <template #header>
            <div class="stat-header">
              <el-icon
                :size="24"
                color="#67c23a"
              >
                <Document />
              </el-icon>
              <span>{{ t('dashboard.docs') }}</span>
            </div>
          </template>
          <div class="stat-value">
            5,678
          </div>
        </PageCard>
      </el-col>
      <el-col
        :xs="24"
        :sm="12"
        :lg="6"
      >
        <PageCard
          variant="stat"
          shadow="hover"
          class="stat-card"
        >
          <template #header>
            <div class="stat-header">
              <el-icon
                :size="24"
                color="#e6a23c"
              >
                <Message />
              </el-icon>
              <span>{{ t('dashboard.notices') }}</span>
            </div>
          </template>
          <div class="stat-value">
            99+
          </div>
        </PageCard>
      </el-col>
      <el-col
        :xs="24"
        :sm="12"
        :lg="6"
      >
        <PageCard
          variant="stat"
          shadow="hover"
          class="stat-card"
        >
          <template #header>
            <div class="stat-header">
              <el-icon
                :size="24"
                color="#f56c6c"
              >
                <TrendCharts />
              </el-icon>
              <span>{{ t('dashboard.visits') }}</span>
            </div>
          </template>
          <div class="stat-value">
            12,345
          </div>
        </PageCard>
      </el-col>
    </el-row>
  </div>
</template>

<style lang="scss" scoped>
.dashboard-container {
  .welcome-card {
    margin-bottom: 20px;

    h2 {
      margin: 0 0 10px;
      color: var(--app-text-primary);
    }

    p {
      margin: 0;
      color: var(--app-text-muted);
    }
  }

  .stat-row {
    .stat-card {
      margin-bottom: 20px;

      .stat-header {
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--app-text-regular);
      }

      .stat-value {
        font-size: 32px;
        font-weight: bold;
        color: var(--app-text-primary);
        text-align: center;
      }
    }
  }
}
</style>
