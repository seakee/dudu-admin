<script setup lang="ts">
import { computed, useSlots } from 'vue'

const props = defineProps<{
  variant?: 'search' | 'table' | 'toolbar' | 'welcome' | 'stat'
}>()

const slots = useSlots()
const hasHeader = computed(() => Boolean(slots.header))

const cardClass = computed(() => [
  'page-card',
  props.variant ? `page-card--${props.variant}` : ''
])
</script>

<template>
  <el-card :class="cardClass">
    <template
      v-if="hasHeader"
      #header
    >
      <slot name="header" />
    </template>
    <slot />
  </el-card>
</template>
