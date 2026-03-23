<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    model?: object
    labelWidth?: string | number
    minColumnWidth?: string
  }>(),
  {
    model: undefined,
    labelWidth: undefined,
    minColumnWidth: '280px'
  }
)

const emit = defineEmits<{
  submit: []
}>()

function handleSubmit() {
  emit('submit')
}
</script>

<template>
  <PageCard variant="search">
    <el-form
      class="page-search-section"
      :model="props.model"
      :label-width="props.labelWidth"
      @submit.prevent="handleSubmit"
    >
      <div
        class="page-search-grid"
        :style="{ '--page-search-min-column-width': props.minColumnWidth }"
      >
        <slot />
        <div
          v-if="$slots.actions"
          class="page-search-grid__actions"
        >
          <el-form-item class="page-search-actions">
            <slot name="actions" />
          </el-form-item>
        </div>
      </div>
    </el-form>
  </PageCard>
</template>

<style lang="scss" scoped>
.page-search-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(var(--page-search-min-column-width), 1fr));
  gap: 12px 16px;
  align-items: start;
}

.page-search-grid__actions {
  grid-column: 1 / -1;
}

.page-search-section {
  :deep(.el-form-item) {
    margin-bottom: 0;
  }

  :deep(.el-form-item__content) {
    width: 100%;
    min-width: 0;
  }

  :deep(.el-input),
  :deep(.el-select),
  :deep(.el-date-editor),
  :deep(.el-input-number),
  :deep(.el-cascader) {
    width: 100%;
  }

  :deep(.page-search-actions .el-form-item__content) {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    flex-wrap: wrap;
  }

  :deep(.page-search-actions .el-button) {
    margin-left: 0;
  }
}

@media (max-width: 768px) {
  .page-search-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .page-search-section {
    :deep(.page-search-actions .el-form-item__content) {
      justify-content: flex-start;
    }
  }
}
</style>
