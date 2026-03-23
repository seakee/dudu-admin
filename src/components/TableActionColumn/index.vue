<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const props = withDefaults(
  defineProps<{
    label?: string
    width?: number | string
  }>(),
  {
    label: '',
    width: 240
  }
)

const { t } = useI18n()
const columnLabel = computed(() => props.label || t('common.actions'))
</script>

<template>
  <el-table-column
    :label="columnLabel"
    :width="props.width"
    fixed="right"
    align="center"
    header-align="center"
    class-name="table-action-column"
    label-class-name="table-action-column"
  >
    <template #default="scope">
      <div class="action-buttons">
        <slot v-bind="scope" />
      </div>
    </template>
  </el-table-column>
</template>
