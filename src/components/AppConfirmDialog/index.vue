<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useConfirmStore } from '@/stores/confirm'
import BaseDialog from '@/components/BaseDialog/index.vue'

const { t } = useI18n()
const confirmStore = useConfirmStore()

const isOpen = computed(() => Boolean(confirmStore.current))
const current = computed(() => confirmStore.current)

const iconName = computed(() => {
  switch (current.value?.variant) {
    case 'danger':
    case 'warning':
      return 'TriangleExclamationPoint'
    case 'info':
      return 'Info'
    default:
      return 'CircleQuestionMark'
  }
})

const iconToneClass = computed(() => `is-${current.value?.variant || 'primary'}`)

const confirmButtonVariant = computed<'primary' | 'danger'>(() =>
  current.value?.variant === 'danger' ? 'danger' : 'primary'
)

function handleVisibilityChange(nextVisible: boolean) {
  if (!nextVisible && confirmStore.current) {
    confirmStore.cancel()
  }
}

function handleCancel() {
  confirmStore.cancel()
}

function handleConfirm() {
  confirmStore.confirm()
}
</script>

<template>
  <BaseDialog
    :model-value="isOpen"
    :title="current?.title || t('navbar.dialogTitle')"
    width="440px"
    destroy-on-close
    @update:model-value="handleVisibilityChange"
  >
    <div
      v-if="current"
      class="confirm-dialog"
    >
      <div
        class="confirm-dialog__icon"
        :class="iconToneClass"
        aria-hidden="true"
      >
        <AppIcon
          :name="iconName"
          :size="20"
        />
      </div>
      <p class="confirm-dialog__message">
        {{ current.message }}
      </p>
    </div>

    <template #footer>
      <AppButton
        variant="secondary"
        @click="handleCancel"
      >
        {{ current?.cancelText || t('common.cancel') }}
      </AppButton>
      <AppButton
        :variant="confirmButtonVariant"
        @click="handleConfirm"
      >
        {{ current?.confirmText || t('common.confirm') }}
      </AppButton>
    </template>
  </BaseDialog>
</template>

<style lang="scss" scoped>
.confirm-dialog {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 4px 0;
}

.confirm-dialog__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: var(--app-radius-pill);
  border: 1px solid var(--border-subtle);
  flex-shrink: 0;

  &.is-danger {
    background: var(--data-badge-danger-bg);
    border-color: var(--data-badge-danger-border);
    color: var(--data-badge-danger-text);
  }

  &.is-warning {
    background: var(--data-badge-warning-bg);
    border-color: var(--data-badge-warning-border);
    color: var(--data-badge-warning-text);
  }

  &.is-info,
  &.is-primary {
    background: var(--data-badge-info-bg);
    border-color: var(--data-badge-info-border);
    color: var(--data-badge-info-text);
  }
}

.confirm-dialog__message {
  margin: 0;
  padding-top: 6px;
  font-size: 14px;
  line-height: 1.55;
  color: var(--text-primary);
  word-break: break-word;
}
</style>
