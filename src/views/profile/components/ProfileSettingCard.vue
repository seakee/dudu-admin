<script setup lang="ts">
const props = withDefaults(defineProps<{
  title: string
  description: string
  status: string
  statusTone?: 'primary' | 'success' | 'warning' | 'danger' | 'info'
  accent?: 'brand' | 'success' | 'warning' | 'danger' | 'neutral'
  actionLabel?: string
  actionType?: 'primary' | 'default' | 'danger'
  disabled?: boolean
}>(), {
  statusTone: 'info',
  accent: 'neutral',
  actionLabel: '',
  actionType: 'default',
  disabled: false
})

const emit = defineEmits<{
  action: []
}>()

const tagType = computed(() => {
  switch (props.statusTone) {
    case 'primary':
      return 'primary'
    case 'success':
      return 'success'
    case 'warning':
      return 'warning'
    case 'danger':
      return 'danger'
    default:
      return 'info'
  }
})
</script>

<template>
  <PageCard class="profile-setting-card">
    <div class="profile-setting-card__body">
      <div class="profile-setting-card__head">
        <div
          class="profile-setting-card__icon"
          :class="`is-${props.accent}`"
        >
          <slot name="icon" />
        </div>

        <el-tag
          effect="plain"
          :type="tagType"
          class="profile-setting-card__status"
        >
          {{ status }}
        </el-tag>
      </div>

      <div class="profile-setting-card__content">
        <h3>{{ title }}</h3>
        <p>{{ description }}</p>
      </div>

      <div class="profile-setting-card__footer">
        <slot name="action">
          <el-button
            v-if="props.actionLabel"
            :type="props.actionType"
            :disabled="props.disabled"
            @click="emit('action')"
          >
            {{ props.actionLabel }}
          </el-button>
        </slot>
      </div>
    </div>
  </PageCard>
</template>

<style lang="scss" scoped>
.profile-setting-card {
  height: 100%;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  box-shadow: var(--app-shadow-soft);

  :deep(.el-card__body) {
    height: 100%;
  }

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.05);
    border-color: var(--el-color-primary-light-5);
  }
}

.profile-setting-card__body {
  display: flex;
  min-height: 220px;
  flex-direction: column;
  gap: 18px;
}

.profile-setting-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.profile-setting-card__icon {
  display: inline-flex;
  height: 48px;
  width: 48px;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  border: 1px solid transparent;
  color: var(--app-text-primary);
  font-size: 20px;

  &.is-brand {
    background: rgba(10, 126, 220, 0.12);
    border-color: rgba(10, 126, 220, 0.18);
    color: #0a7edc;
  }

  &.is-success {
    background: rgba(103, 194, 58, 0.12);
    border-color: rgba(103, 194, 58, 0.18);
    color: var(--el-color-success);
  }

  &.is-warning {
    background: rgba(230, 162, 60, 0.12);
    border-color: rgba(230, 162, 60, 0.18);
    color: var(--el-color-warning);
  }

  &.is-danger {
    background: rgba(245, 108, 108, 0.12);
    border-color: rgba(245, 108, 108, 0.18);
    color: var(--el-color-danger);
  }

  &.is-neutral {
    background: var(--app-surface-muted);
    border-color: var(--app-border);
    color: var(--app-text-regular);
  }
}

.profile-setting-card__status {
  flex-shrink: 0;
}

.profile-setting-card__content {
  display: flex;
  flex-direction: column;
  gap: 10px;

  h3 {
    margin: 0;
    font-size: 18px;
    color: var(--app-text-primary);
  }

  p {
    margin: 0;
    line-height: 1.6;
    color: var(--app-text-regular);
  }
}

.profile-setting-card__footer {
  margin-top: auto;
  display: flex;
  align-items: center;
  justify-content: flex-start;

  .el-button {
    height: 40px;
    border-radius: 10px;
    font-weight: 600;
    transition: all 0.25s ease;
    
    &--primary {
      background: var(--primary-gradient);
      border: none;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.25);
      
      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(102, 126, 234, 0.35);
      }
      
      &:active {
        transform: translateY(0);
      }
    }

    &--danger {
      box-shadow: 0 4px 12px rgba(245, 108, 108, 0.15);
      
      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(245, 108, 108, 0.25);
      }
      
      &:active {
        transform: translateY(0);
      }
    }
  }
}

@media (max-width: 768px) {
  .profile-setting-card__body {
    min-height: auto;
  }

  .profile-setting-card__footer {
    justify-content: stretch;

    :deep(.el-button) {
      width: 100%;
    }
  }
}
</style>
