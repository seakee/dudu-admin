<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useHeaderRefresh } from '@/composables/useHeaderRefresh'
import { useAuthStore } from '@/stores'
import { formatDateTime } from '@/utils/datetime'

const authStore = useAuthStore()
const { t } = useI18n()

const lastRefreshedAt = ref(formatDateTime(new Date()))

function handleRefresh() {
  lastRefreshedAt.value = formatDateTime(new Date())
}

const { isHeaderRefreshing } = useHeaderRefresh(handleRefresh)
</script>

<template>
  <div class="page-workspace">
    <PageControlBar>
      <template #leading>
        <div class="dashboard-leading">
          <StatusPill
            tone="success"
            dot
            :label="t('dashboard.welcome', { name: authStore.userName })"
          />
          <span class="dashboard-subtitle">{{ t('dashboard.subtitle') }}</span>
        </div>
      </template>

      <template #actions>
        <span class="dashboard-timestamp tabular-nums">{{ lastRefreshedAt }}</span>
        <AppButton
          size="sm"
          icon="RotateCw"
          :loading="isHeaderRefreshing"
          @click="handleRefresh"
        >
          {{ t('common.refresh') }}
        </AppButton>
      </template>
    </PageControlBar>

    <MetricSummaryGrid :columns="4">
      <MetricSummaryCard
        :label="t('dashboard.userTotal')"
        value="1,234"
        value-title="1,234"
        accent="blue"
        icon="User"
        :points="[42, 48, 51, 49, 56, 62, 68]"
      />
      <MetricSummaryCard
        :label="t('dashboard.docs')"
        value="5,678"
        value-title="5,678"
        accent="green"
        icon="Document"
        :points="[20, 26, 25, 31, 38, 42, 47]"
      />
      <MetricSummaryCard
        :label="t('dashboard.notices')"
        value="99+"
        value-title="99+"
        accent="amber"
        icon="Message"
        :points="[15, 18, 14, 19, 16, 12, 11]"
      />
      <MetricSummaryCard
        :label="t('dashboard.visits')"
        value="12,345"
        value-title="12,345"
        accent="violet"
        icon="TrendCharts"
        :points="[80, 95, 88, 112, 124, 131, 145]"
      />
    </MetricSummaryGrid>
  </div>
</template>

<style lang="scss" scoped>
.dashboard-leading {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  min-width: 0;
}

.dashboard-subtitle {
  color: var(--text-tertiary);
  font-size: 13px;
  line-height: 1.4;
}

.dashboard-timestamp {
  display: inline-flex;
  align-items: center;
  height: var(--control-height-md);
  padding: 0 12px;
  border: 1px solid transparent;
  border-radius: var(--app-radius-sm);
  background: var(--surface-subtle);
  color: var(--text-tertiary);
  font-size: 12.5px;
  white-space: nowrap;

  @include mobile {
    display: none;
  }
}
</style>
