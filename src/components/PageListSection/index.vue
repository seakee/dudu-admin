<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    naked?: boolean
  }>(),
  {
    naked: false
  }
)
</script>

<template>
  <PageCard
    v-if="!props.naked"
    variant="table"
    class="page-list-section"
  >
    <slot name="table">
      <slot />
    </slot>
    <slot name="pagination" />
  </PageCard>

  <section
    v-else
    class="page-list-section page-list-section--naked"
  >
    <slot name="table">
      <slot />
    </slot>
    <slot name="pagination" />
  </section>
</template>

<style lang="scss" scoped>
.page-list-section {
  :deep(.el-table) {
    border-radius: 12px;
    overflow: hidden;
  }

  :deep(.el-table th.el-table__cell) {
    padding: 14px 0;
    font-size: 13px;
    font-weight: 600;
    color: var(--app-text-primary);
    letter-spacing: 0.2px;
  }

  :deep(.el-table .el-table__cell) {
    padding: 12px 0;
  }

  :deep(.el-table .cell) {
    line-height: 1.45;
  }

  :deep(.el-table .el-tag) {
    line-height: 1.15;
  }

  :deep(.pagination) {
    margin-top: var(--app-gap);
    display: flex;
    justify-content: flex-end;
  }
}

.page-list-section--naked {
  margin-bottom: 0;
}

@media (max-width: 992px) {
  .page-list-section {
    :deep(.el-table th.el-table__cell),
    :deep(.el-table .el-table__cell) {
      padding: 10px 0;
    }
  }
}
</style>
