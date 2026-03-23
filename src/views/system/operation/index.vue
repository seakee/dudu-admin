<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getOperationList, getOperationDetail } from '@/api/operation'
import type { OperationDetailRaw, OperationListParams, OperationLogRaw } from '@/api/operation'
import { formatDateTime } from '@/utils/datetime'
import { useI18n } from 'vue-i18n'
import { useFormLabelWidth } from '@/composables/useFormLabelWidth'

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
const searchLabelWidth = useFormLabelWidth('88px', '110px')

const queryParams = reactive<OperationListParams>({
  page: 1,
  size: 10,
  path: '',
  user_id: undefined,
  ip: '',
  status: undefined,
  method: '',
  trace_id: ''
})

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

const userIdText = computed<string>({
  get: () => (queryParams.user_id === undefined ? '' : String(queryParams.user_id)),
  set: (value) => {
    queryParams.user_id = toOptionalInteger(value, 1)
  }
})

const statusText = computed<string>({
  get: () => (queryParams.status === undefined ? '' : String(queryParams.status)),
  set: (value) => {
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

function formatJson(value: unknown): string {
  if (value === undefined || value === null || value === '') {
    return ''
  }

  if (typeof value === 'string') {
    try {
      return JSON.stringify(JSON.parse(value), null, 2)
    } catch {
      return value
    }
  }

  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
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
    ElMessage.error(t('system.operation.message.copyFailed'))
    return
  }

  try {
    await navigator.clipboard.writeText(content)
    ElMessage.success(t(successMessageKey))
  } catch {
    ElMessage.error(t('system.operation.message.copyFailed'))
  }
}

function getMethodTagType(method: string): 'success' | 'primary' | 'warning' | 'danger' | 'info' {
  const types: Record<string, 'success' | 'primary' | 'warning' | 'danger' | 'info'> = {
    GET: 'success',
    POST: 'primary',
    PUT: 'warning',
    DELETE: 'danger'
  }
  return types[method.toUpperCase()] || 'info'
}

function getStatusTagType(status: number): 'success' | 'warning' | 'danger' | 'info' {
  if (status === 0) return 'success'
  if (status >= 200 && status < 300) return 'success'
  if (status >= 10000 || status >= 500) return 'danger'
  if (status >= 400) return 'warning'
  return 'info'
}

onMounted(() => {
  fetchData()
})
</script>

<template>
  <div class="operation-container">
    <PageSearchSection
      :model="queryParams"
      :label-width="searchLabelWidth"
      @submit="handleSearch"
    >
      <el-form-item :label="t('system.operation.table.traceId')">
        <el-input
          v-model="queryParams.trace_id"
          :placeholder="t('system.operation.table.traceId')"
          clearable
        />
      </el-form-item>
      <el-form-item :label="t('system.operation.search.path')">
        <el-input
          v-model="queryParams.path"
          :placeholder="t('system.operation.search.path')"
          clearable
        />
      </el-form-item>
      <el-form-item :label="t('system.operation.search.userId')">
        <el-input
          v-model="userIdText"
          type="number"
          :min="1"
          :placeholder="t('system.operation.search.userId')"
          clearable
        />
      </el-form-item>
      <el-form-item :label="t('system.operation.search.ip')">
        <el-input
          v-model="queryParams.ip"
          :placeholder="t('system.operation.search.ip')"
          clearable
        />
      </el-form-item>
      <el-form-item :label="t('system.operation.search.method')">
        <el-select
          v-model="queryParams.method"
          :placeholder="t('common.selectPlaceholder')"
          clearable
        >
          <el-option
            label="GET"
            value="GET"
          />
          <el-option
            label="POST"
            value="POST"
          />
          <el-option
            label="PUT"
            value="PUT"
          />
          <el-option
            label="DELETE"
            value="DELETE"
          />
        </el-select>
      </el-form-item>
      <el-form-item :label="t('system.operation.search.status')">
        <el-input
          v-model="statusText"
          type="number"
          :min="0"
          :placeholder="t('system.operation.search.status')"
          clearable
        />
      </el-form-item>

      <template #actions>
        <el-button
          type="primary"
          @click="handleSearch"
        >
          {{ t('common.search') }}
        </el-button>
        <el-button @click="handleReset">
          {{ t('common.reset') }}
        </el-button>
      </template>
    </PageSearchSection>

    <PageListSection>
      <template #table>
        <el-table
          :data="tableData"
          stripe
        >
          <el-table-column
            prop="id"
            label="ID"
            width="120"
          />
          <el-table-column
            prop="user_name"
            :label="t('system.operation.table.userName')"
            width="120"
          />
          <el-table-column
            prop="method"
            :label="t('system.operation.table.method')"
            width="90"
          >
            <template #default="{ row }">
              <el-tag
                :type="getMethodTagType(row.method)"
                size="small"
              >
                {{ row.method }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column
            prop="path"
            :label="t('system.operation.table.path')"
            min-width="220"
            show-overflow-tooltip
          />
          <el-table-column
            prop="status"
            :label="t('system.operation.table.status')"
            width="120"
          >
            <template #default="{ row }">
              <el-tag
                :type="getStatusTagType(row.status)"
                size="small"
              >
                {{ row.status }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column
            prop="ip"
            :label="t('system.operation.table.ip')"
            width="140"
          />
          <el-table-column
            prop="trace_id"
            :label="t('system.operation.table.traceId')"
            min-width="180"
            show-overflow-tooltip
          />
          <el-table-column
            prop="created_at"
            :label="t('system.operation.table.time')"
            width="180"
          >
            <template #default="{ row }">
              {{ formatDateTime(row.created_at) }}
            </template>
          </el-table-column>
          <TableActionColumn :width="100">
            <template #default="{ row }">
              <el-button
                type="text"
                size="small"
                @click="showDetail(row)"
              >
                {{ t('system.operation.action.detail') }}
              </el-button>
            </template>
          </TableActionColumn>
        </el-table>
      </template>

      <template #pagination>
        <el-pagination
          v-model:current-page="queryParams.page"
          v-model:page-size="queryParams.size"
          :total="total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          class="pagination"
          @size-change="fetchData"
          @current-change="fetchData"
        />
      </template>
    </PageListSection>

    <BaseDialog
      v-model="detailVisible"
      :title="t('system.operation.detail.title')"
      width="920px"
      class="operation-detail-dialog"
    >
      <div
        v-loading="detailLoading"
        class="detail-content"
      >
        <template v-if="detailData">
          <section class="detail-hero">
            <div class="detail-hero__main">
              <p class="detail-hero__label">
                {{ t('system.operation.detail.recordId') }}
              </p>
              <h3 class="detail-hero__title">
                #{{ detailData.id }}
              </h3>
              <p
                class="detail-hero__path"
                :title="detailData.path"
              >
                {{ detailData.path || '-' }}
              </p>
            </div>
            <div class="detail-hero__tags">
              <el-tag
                :type="getMethodTagType(detailData.method)"
                effect="dark"
                round
              >
                {{ detailData.method || '-' }}
              </el-tag>
              <el-tag
                :type="getStatusTagType(detailData.status)"
                round
              >
                {{ detailData.status }}
              </el-tag>
            </div>
          </section>

          <section class="detail-meta-grid">
            <div class="meta-item">
              <span class="meta-item__label">{{ t('system.operation.detail.user') }}</span>
              <span class="meta-item__value">{{ detailData.user_name || '-' }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-item__label">{{ t('system.operation.detail.userId') }}</span>
              <span class="meta-item__value">{{ detailData.user_id || '-' }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-item__label">{{ t('system.operation.detail.ip') }}</span>
              <span class="meta-item__value">{{ detailData.ip || '-' }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-item__label">{{ t('system.operation.detail.latency') }}</span>
              <span class="meta-item__value">{{ formatLatency(detailData.latency) }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-item__label">{{ t('system.operation.detail.time') }}</span>
              <span class="meta-item__value">{{ formatDateTime(detailData.created_at) }}</span>
            </div>
            <div class="meta-item">
              <div class="meta-item__header">
                <span class="meta-item__label">{{ t('system.operation.detail.traceId') }}</span>
                <el-button
                  link
                  type="primary"
                  size="small"
                  @click="handleCopy(detailData.trace_id, 'system.operation.message.copyTraceIdSuccess')"
                >
                  {{ t('common.copy') }}
                </el-button>
              </div>
              <span
                class="meta-item__value meta-item__value--break"
                :title="detailData.trace_id"
              >
                {{ detailData.trace_id || '-' }}
              </span>
            </div>
            <div class="meta-item meta-item--wide">
              <span class="meta-item__label">{{ t('system.operation.detail.agent') }}</span>
              <span
                class="meta-item__value meta-item__value--break"
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
            <article class="payload-card">
              <header class="payload-card__header">
                <h4>{{ t('system.operation.detail.request') }}</h4>
                <el-button
                  link
                  type="primary"
                  size="small"
                  @click="handleCopy(formatJson(detailData.params), 'system.operation.message.copyRequestSuccess')"
                >
                  {{ t('common.copy') }}
                </el-button>
              </header>
              <pre class="json-viewer">{{ formatJson(detailData.params) || '-' }}</pre>
            </article>
            <article class="payload-card">
              <header class="payload-card__header">
                <h4>{{ t('system.operation.detail.response') }}</h4>
                <el-button
                  link
                  type="primary"
                  size="small"
                  @click="handleCopy(formatJson(detailData.resp), 'system.operation.message.copyResponseSuccess')"
                >
                  {{ t('common.copy') }}
                </el-button>
              </header>
              <pre class="json-viewer">{{ formatJson(detailData.resp) || '-' }}</pre>
            </article>
          </section>
        </template>
        <el-empty
          v-else
          :description="t('system.operation.detail.empty')"
        />
      </div>
    </BaseDialog>
  </div>
</template>

<style lang="scss" scoped>
.detail-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: calc(100vh - 320px);
  overflow: auto;
  padding-right: 4px;

  .detail-hero {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    padding: 16px 18px;
    border: 1px solid var(--el-border-color-light);
    border-radius: 12px;
    background: linear-gradient(130deg, var(--el-color-primary-light-9) 0%, var(--el-fill-color-light) 100%);

    .detail-hero__main {
      min-width: 0;
    }

    .detail-hero__label {
      margin: 0;
      font-size: 12px;
      line-height: 1;
      color: var(--el-text-color-secondary);
    }

    .detail-hero__title {
      margin: 8px 0 10px;
      font-size: 22px;
      line-height: 1;
      color: var(--el-text-color-primary);
      font-weight: 600;
    }

    .detail-hero__path {
      margin: 0;
      color: var(--el-text-color-regular);
      font-size: 13px;
      line-height: 1.6;
      word-break: break-all;
    }

    .detail-hero__tags {
      display: flex;
      gap: 8px;
      align-items: center;
      flex-shrink: 0;
      padding-top: 2px;
    }
  }

  .detail-meta-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;

    .meta-item {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 12px 14px;
      border: 1px solid var(--el-border-color-lighter);
      border-radius: 10px;
      background: var(--el-fill-color-blank);

      &.meta-item--wide {
        grid-column: 1 / -1;
      }

      .meta-item__label {
        font-size: 12px;
        line-height: 1;
        color: var(--el-text-color-secondary);
      }

      .meta-item__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }

      .meta-item__value {
        font-size: 14px;
        line-height: 1.4;
        color: var(--el-text-color-primary);
      }

      .meta-item__value--break {
        word-break: break-all;
      }
    }
  }

  .detail-error {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px 14px;
    border: 1px solid var(--el-color-danger-light-5);
    border-radius: 10px;
    background: var(--el-color-danger-light-9);

    .detail-error__label {
      font-size: 12px;
      line-height: 1;
      color: var(--el-color-danger);
    }

    .detail-error__value {
      color: var(--el-text-color-primary);
      font-size: 13px;
      line-height: 1.5;
      word-break: break-all;
    }
  }

  .detail-payload-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;

    .payload-card {
      border: 1px solid var(--el-border-color-lighter);
      border-radius: 12px;
      background: var(--el-fill-color-blank);
      overflow: hidden;

      .payload-card__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 14px;
        border-bottom: 1px solid var(--el-border-color-lighter);
        background: var(--el-fill-color-light);

        h4 {
          margin: 0;
          color: var(--el-text-color-primary);
          font-size: 14px;
          font-weight: 600;
          line-height: 1;
        }
      }
    }
  }

  .json-viewer {
    margin: 0;
    padding: 14px;
    background: var(--el-bg-color-page);
    color: var(--el-text-color-primary);
    font-size: 12px;
    line-height: 1.6;
    min-height: 240px;
    max-height: 320px;
    overflow: auto;
    white-space: pre-wrap;
    word-break: break-word;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  }

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-thumb {
    border-radius: 999px;
    background: var(--el-border-color);
  }

  :deep(.el-empty) {
    padding: 36px 0;
  }
}

:deep(.operation-detail-dialog .el-dialog__body) {
  max-height: calc(100vh - 240px);
  overflow: hidden;
}

@media (max-width: 900px) {
  .detail-content {
    .detail-hero {
      flex-direction: column;

      .detail-hero__tags {
        width: 100%;
      }
    }

    .detail-meta-grid,
    .detail-payload-grid {
      grid-template-columns: 1fr;
    }
  }
}
</style>
