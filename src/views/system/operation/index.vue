<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { HTTP_METHOD_OPTIONS, getHttpMethodTone } from '@/utils/httpMethod'
import { notify } from '@/utils/notify'
import { getOperationList, getOperationDetail } from '@/api/operation'
import type { OperationDetailRaw, OperationListParams, OperationLogRaw } from '@/api/operation'
import { formatDateTime } from '@/utils/datetime'
import { useI18n } from 'vue-i18n'
import { useHeaderRefresh } from '@/composables/useHeaderRefresh'
import CodePayloadCard from '@/components/CodePayloadCard/index.vue'
import type { TableActionItem } from '@/components/types'

interface OperationLog {
  id: string
  method: string
  path: string
  ip: string
  status: number
  user_name: string
  trace_id: string
  created_at: string
}

interface OperationDetailData extends OperationLog {
  user_id: number
  latency: number
  agent: string
  error_message: string
  params: unknown
  resp: unknown
}

const loading = ref(false)
const tableData = ref<OperationLog[]>([])
const total = ref(0)
const detailVisible = ref(false)
const detailLoading = ref(false)
const detailData = ref<OperationDetailData | null>(null)
const { t } = useI18n()

const methodOptions = HTTP_METHOD_OPTIONS

const queryParams = reactive<OperationListParams & Required<Pick<OperationListParams, 'page' | 'size'>>>({
  page: 1,
  size: 10,
  path: '',
  user_id: undefined,
  ip: '',
  status: undefined,
  method: '',
  trace_id: ''
})

const hasActiveFilters = computed(() => Boolean(
  queryParams.path || queryParams.user_id != null || queryParams.ip ||
  queryParams.status != null || queryParams.method || queryParams.trace_id
))

function toStringValue(...values: Array<string | number | null | undefined>): string {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') {
      return String(value)
    }
  }
  return ''
}

function toNumberValue(...values: Array<string | number | null | undefined>): number {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') {
      const numberValue = Number(value)
      if (Number.isFinite(numberValue)) {
        return numberValue
      }
    }
  }
  return 0
}

function toOptionalInteger(value: string | number | null | undefined, minimum: number): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined
  }

  const numberValue = Number(value)
  if (!Number.isInteger(numberValue) || numberValue < minimum) {
    return undefined
  }

  return numberValue
}

const userIdText = computed({
  get: () => (queryParams.user_id === undefined ? '' : String(queryParams.user_id)),
  set: (value: string | number | undefined) => {
    queryParams.user_id = toOptionalInteger(value, 1)
  }
})

const statusText = computed({
  get: () => (queryParams.status === undefined ? '' : String(queryParams.status)),
  set: (value: string | number | undefined) => {
    queryParams.status = toOptionalInteger(value, 0)
  }
})

function normalizeLog(record: OperationLogRaw): OperationLog {
  return {
    id: toStringValue(record.id, record.ID),
    method: toStringValue(record.method, record.Method),
    path: toStringValue(record.path, record.Path),
    ip: toStringValue(record.ip, record.IP),
    status: toNumberValue(record.status, record.Status),
    user_name: toStringValue(record.user_name, record.UserName),
    trace_id: toStringValue(record.trace_id, record.TraceID),
    created_at: toStringValue(record.created_at, record.create_at, record.CreatedAt)
  }
}

function normalizeDetail(detail: OperationDetailRaw): OperationDetailData {
  const base = normalizeLog(detail)
  return {
    ...base,
    user_id: toNumberValue(detail.user_id, detail.UserID),
    latency: toNumberValue(detail.latency),
    agent: toStringValue(detail.agent),
    error_message: toStringValue(detail.error_message),
    params: detail.params,
    resp: detail.resp
  }
}

async function fetchData() {
  loading.value = true
  try {
    const { data } = await getOperationList(queryParams)
    const items = data.data?.items || []
    tableData.value = items.map((item) => normalizeLog(item))
    total.value = Number(data.data?.total || 0)
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  queryParams.page = 1
  fetchData()
}

function handleReset() {
  queryParams.path = ''
  queryParams.user_id = undefined
  queryParams.ip = ''
  queryParams.status = undefined
  queryParams.method = ''
  queryParams.trace_id = ''
  handleSearch()
}

async function showDetail(row: OperationLog) {
  detailLoading.value = true
  detailVisible.value = true
  detailData.value = null
  try {
    const { data } = await getOperationDetail(row.id)
    detailData.value = normalizeDetail(data.data)
  } finally {
    detailLoading.value = false
  }
}

function formatLatency(seconds: number): string {
  if (!Number.isFinite(seconds)) {
    return '-'
  }
  if (seconds > 0 && seconds < 1) {
    return `${Math.round(seconds * 1000)}ms`
  }
  return `${seconds}s`
}

async function handleCopy(content: string, successMessageKey: string) {
  if (!content) {
    notify.error(t('system.operation.message.copyFailed'))
    return
  }

  try {
    await navigator.clipboard.writeText(content)
    notify.success(t(successMessageKey))
  } catch {
    notify.error(t('system.operation.message.copyFailed'))
  }
}

function getOperatorSecondary(row: OperationLog): string {
  if (!row.user_name && !row.ip) {
    return ''
  }
  return row.ip || '-'
}

function getStatusTone(status: number) {
  if (status >= 500) return 'danger'
  if (status >= 400) return 'warning'
  if (status >= 300) return 'info'
  if (status >= 200) return 'success'
  return 'neutral'
}

function getOperationActions(row: OperationLog): TableActionItem[] {
  return [
    {
      key: 'detail',
      label: t('system.operation.action.detail'),
      icon: 'Eye',
      onClick: () => showDetail(row)
    }
  ]
}

useHeaderRefresh(() => fetchData())

onMounted(() => {
  fetchData()
})
</script>

<template>
  <div>
    <div class="page-workspace">
      <PageControlBar>
        <template #toolbar>
          <PageFilterBar
            control-width="136px"
            search-variant="primary"
            @search="handleSearch"
            @reset="handleReset"
          >
            <AppInput
              v-model="queryParams.trace_id"
              size="sm"
              :suffix-icon="queryParams.trace_id ? undefined : 'Search'"
              :aria-label="t('system.operation.table.traceId')"
              :placeholder="t('system.operation.table.traceId')"
              clearable
              @enter="handleSearch"
            />
            <AppInput
              v-model="queryParams.path"
              size="sm"
              :aria-label="t('system.operation.search.path')"
              :placeholder="t('system.operation.search.path')"
              clearable
              @enter="handleSearch"
            />
            <AppInput
              v-model="userIdText"
              size="sm"
              :aria-label="t('system.operation.search.userId')"
              :placeholder="t('system.operation.search.userId')"
              type="number"
              :min="1"
              clearable
              @enter="handleSearch"
            />
            <AppInput
              v-model="queryParams.ip"
              size="sm"
              :aria-label="t('system.operation.search.ip')"
              :placeholder="t('system.operation.search.ip')"
              clearable
              @enter="handleSearch"
            />
            <AppSelect
              size="sm"
              :model-value="queryParams.method"
              :options="methodOptions"
              :aria-label="t('system.operation.search.method')"
              :placeholder="t('system.operation.search.method')"
              clearable
              @update:model-value="queryParams.method = typeof $event === 'string' ? $event : ''"
              @change="handleSearch"
            />
            <AppInput
              v-model="statusText"
              size="sm"
              :aria-label="t('system.operation.search.status')"
              :placeholder="t('system.operation.search.status')"
              type="number"
              :min="0"
              clearable
              @enter="handleSearch"
            />
            <template #actions>
              <AppButton
                variant="secondary"
                size="sm"
                icon="RotateCw"
                icon-only
                :aria-label="t('common.refresh')"
                :title="t('common.refresh')"
                :loading="loading"
                @click="fetchData"
              />
            </template>
          </PageFilterBar>
        </template>
      </PageControlBar>

      <PageListSection :loading="loading">
        <AppTable :data="tableData">
          <AppTableColumn
            prop="path"
            :label="`${t('system.operation.table.method')} / ${t('system.operation.table.path')}`"
            min-width="260"
          >
            <template #default="{ row }">
              <TableCellStack
                :secondary="row.id ? `#${row.id}` : '-'"
                mono-secondary
                tabular
                :truncate="false"
              >
                <template #primary>
                  <StatusPill
                    compact
                    mono
                    class="endpoint-method-pill"
                    :tone="getHttpMethodTone(row.method)"
                    :label="row.method || '-'"
                  />
                  <AppTooltip
                    :content="row.path || '-'"
                    placement="top"
                  >
                    <AppButton
                      variant="link"
                      size="sm"
                      class="endpoint-path-button font-mono"
                      @click="showDetail(row)"
                    >
                      <span class="endpoint-path-text">{{ row.path || '-' }}</span>
                    </AppButton>
                  </AppTooltip>
                </template>
              </TableCellStack>
            </template>
          </AppTableColumn>
          <AppTableColumn
            prop="user_name"
            :label="`${t('system.operation.table.userName')} / ${t('system.operation.table.ip')}`"
            min-width="150"
          >
            <template #default="{ row }">
              <TableCellStack
                :primary="row.user_name || '-'"
                :secondary="getOperatorSecondary(row)"
                mono-secondary
                tabular
              />
            </template>
          </AppTableColumn>
          <AppTableColumn
            prop="status"
            :label="t('system.operation.table.status')"
            width="92"
          >
            <template #default="{ row }">
              <StatusPill
                compact
                mono
                :tone="getStatusTone(row.status)"
                :label="String(row.status)"
              />
            </template>
          </AppTableColumn>
          <AppTableColumn
            class-name="font-mono"
            prop="trace_id"
            :label="t('system.operation.table.traceId')"
            min-width="160"
            show-overflow-tooltip
          >
            <template #default="{ row }">
              {{ row.trace_id || '-' }}
            </template>
          </AppTableColumn>
          <AppTableColumn
            class-name="tabular-nums"
            prop="created_at"
            :label="t('system.operation.table.time')"
            width="168"
          >
            <template #default="{ row }">
              {{ formatDateTime(row.created_at) }}
            </template>
          </AppTableColumn>
          <TableActionColumn
            :actions="getOperationActions"
            :max-visible="1"
            :compact-max-visible="1"
            :mobile-max-visible="1"
            :width="84"
            :mobile-width="64"
          />
          <template #empty>
            <TableEmptyState
              :filtered="hasActiveFilters"
              @reset="handleReset"
              @refresh="fetchData"
            />
          </template>
        </AppTable>
        <template #pagination>
          <PaginationFooter
            v-model:current-page="queryParams.page"
            v-model:page-size="queryParams.size"
            :total="total"
            variant="flush"
            show-page-jump
            @change="fetchData"
          />
        </template>
      </PageListSection>
    </div>

    <DetailDialog
      v-model="detailVisible"
      :title="t('system.operation.detail.title')"
      width="920px"
      :loading="detailLoading"
      :empty="!detailData"
      :empty-text="t('system.operation.detail.empty')"
    >
      <template #hero>
        <section
          v-if="detailData"
          class="detail-hero"
        >
          <div class="detail-hero__main">
            <p class="detail-hero__label">
              {{ t('system.operation.detail.recordId') }}
            </p>
            <h3 class="detail-hero__title font-mono tabular-nums">
              #{{ detailData.id }}
            </h3>
            <p
              class="detail-hero__path font-mono"
              :title="detailData.path"
            >
              {{ detailData.path || '-' }}
            </p>
          </div>
          <div class="detail-hero__tags">
            <StatusPill
              compact
              mono
              :tone="getHttpMethodTone(detailData.method)"
              :label="detailData.method || '-'"
            />
            <StatusPill
              compact
              mono
              :tone="getStatusTone(detailData.status)"
              :label="String(detailData.status)"
            />
          </div>
        </section>
      </template>

      <template v-if="detailData">
        <section class="detail-meta-grid">
          <div class="meta-item">
            <span class="meta-item__label">{{ t('system.operation.detail.user') }}</span>
            <span class="meta-item__value">{{ detailData.user_name || '-' }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-item__label">{{ t('system.operation.detail.userId') }}</span>
            <span class="meta-item__value font-mono tabular-nums">{{ detailData.user_id || '-' }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-item__label">{{ t('system.operation.detail.ip') }}</span>
            <span class="meta-item__value font-mono">{{ detailData.ip || '-' }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-item__label">{{ t('system.operation.detail.latency') }}</span>
            <span class="meta-item__value tabular-nums">{{ formatLatency(detailData.latency) }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-item__label">{{ t('system.operation.detail.time') }}</span>
            <span class="meta-item__value tabular-nums">{{ formatDateTime(detailData.created_at) }}</span>
          </div>
          <div class="meta-item">
            <div class="meta-item__header">
              <span class="meta-item__label">{{ t('system.operation.detail.traceId') }}</span>
              <AppButton
                variant="link"
                size="sm"
                @click="handleCopy(detailData.trace_id, 'system.operation.message.copyTraceIdSuccess')"
              >
                {{ t('common.copy') }}
              </AppButton>
            </div>
            <span
              class="meta-item__value font-mono"
              :title="detailData.trace_id"
            >
              {{ detailData.trace_id || '-' }}
            </span>
          </div>
          <div class="meta-item meta-item--wide">
            <span class="meta-item__label">{{ t('system.operation.detail.agent') }}</span>
            <span
              class="meta-item__value"
              :title="detailData.agent"
            >
              {{ detailData.agent || '-' }}
            </span>
          </div>
        </section>

        <section
          v-if="detailData.error_message"
          class="detail-error"
        >
          <span class="detail-error__label">{{ t('system.operation.detail.error') }}</span>
          <span class="detail-error__value">{{ detailData.error_message }}</span>
        </section>

        <section class="detail-payload-grid">
          <CodePayloadCard
            :title="t('system.operation.detail.request')"
            :payload="detailData.params"
            :copy-success-message="t('system.operation.message.copyRequestSuccess')"
          />
          <CodePayloadCard
            :title="t('system.operation.detail.response')"
            :payload="detailData.resp"
            :copy-success-message="t('system.operation.message.copyResponseSuccess')"
          />
        </section>
      </template>
    </DetailDialog>
  </div>
</template>

<style lang="scss" scoped>
.endpoint-method-pill {
  flex-shrink: 0;
}

.btn.endpoint-path-button {
  padding: 0;
  min-width: 0;
  max-width: 100%;
  height: auto;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--text-primary);
  justify-content: flex-start;
  overflow: hidden;

  &:hover:not(:disabled) {
    color: var(--primary-text);
  }
}

.endpoint-path-text {
  display: block;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
  color: inherit;
}

.detail-hero {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--app-radius-sm);
  background: var(--surface-subtle);
}

.detail-hero__main {
  flex: 1 1 240px;
  min-width: 0;
}

.detail-hero__label,
.meta-item__label {
  margin: 0;
  font-size: 12px;
  color: var(--text-secondary);
}

.detail-hero__title {
  margin: 4px 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  overflow-wrap: anywhere;
}

.detail-hero__path {
  margin: 0;
  color: var(--text-secondary);
  font-size: 13px;
  overflow-wrap: anywhere;
}

.detail-hero__tags {
  display: flex;
  align-items: center;
  gap: 8px;
}

.detail-meta-grid,
.detail-payload-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.detail-meta-grid {
  background: var(--surface-subtle);
  border: 1px solid var(--border-subtle);
  border-radius: var(--app-radius-sm);
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border-subtle);
}

.meta-item--wide {
  grid-column: 1 / -1;
  border-bottom: 0;
}

.meta-item__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.meta-item__value {
  font-size: 14px;
  color: var(--text-primary);
  overflow-wrap: anywhere;
}

.detail-error {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 14px;
  border: 1px solid var(--data-badge-danger-border);
  border-radius: var(--app-radius-sm);
  background: var(--data-badge-danger-bg);
}

.detail-error__label {
  font-size: 12px;
  color: var(--data-badge-danger-text);
}

.detail-error__value {
  color: var(--text-primary);
  overflow-wrap: anywhere;
}

.detail-payload-grid {
  gap: 14px;
}

@include mobile {
  .detail-meta-grid,
  .detail-payload-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
