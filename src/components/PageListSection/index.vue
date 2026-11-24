<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    loading?: boolean
  }>(),
  {
    loading: false
  }
)

const slots = useSlots()
const hasPagination = computed(() => Boolean(slots.pagination))
const hasToolbar = computed(() => Boolean(slots.toolbar))
</script>

<template>
  <PageCard
    v-loading="props.loading"
    variant="table"
    class="page-list-section"
  >
    <template
      v-if="$slots.header"
      #header
    >
      <slot name="header" />
    </template>

    <div
      v-if="hasToolbar"
      class="page-list-section__toolbar"
    >
      <slot name="toolbar" />
    </div>

    <div
      class="page-list-section__body"
      :class="{ 'has-pagination': hasPagination }"
    >
      <slot name="table">
        <slot />
      </slot>
    </div>

    <slot name="pagination" />
  </PageCard>
</template>

<style lang="scss" scoped>
.page-list-section {
  min-width: 0;
  border-radius: var(--app-radius-lg);
  background: color-mix(in srgb, var(--surface-subtle) 65%, var(--bg-primary));
}

.page-list-section__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px 14px;
  padding: 12px 16px 6px;
}

.page-list-section__body {
  padding: 8px 12px 10px;

  &.has-pagination {
    padding-bottom: 4px;
  }
}

@include mobile {
  .page-list-section__toolbar {
    padding: 10px 12px 4px;
  }

  .page-list-section__body {
    padding: 6px 8px 8px;
  }
}
</style>
