<script setup lang="ts">
defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<{
  appendToBody?: boolean
}>(), {
  appendToBody: true
})
</script>

<template>
  <el-dialog
    v-bind="$attrs"
    class="base-dialog"
    :append-to-body="props.appendToBody"
  >
    <slot />
    <template
      v-if="$slots.footer"
      #footer
    >
      <slot name="footer" />
    </template>
  </el-dialog>
</template>

<style lang="scss">
.base-dialog {
  // --- Dialog Panel ---
  .el-dialog {
    --el-dialog-border-radius: var(--app-radius-lg);
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    backdrop-filter: blur(calc(var(--app-blur) + 4px));
    -webkit-backdrop-filter: blur(calc(var(--app-blur) + 4px));
    border-radius: var(--el-dialog-border-radius);
    box-shadow: var(--glass-shadow);
    overflow: hidden;
  }

  // --- Header ---
  .el-dialog__header {
    padding: 20px 24px 16px;
    margin-right: 0;
    border-bottom: 1px solid var(--app-border-strong);
  }

  .el-dialog__title {
    font-weight: 700;
    font-size: 16px;
    color: var(--app-text-primary);
    letter-spacing: 0.2px;
  }

  .el-dialog__headerbtn {
    top: 18px;
    right: 18px;
  }

  // --- Body ---
  .el-dialog__body {
    padding: 20px 24px;
  }

  // --- Footer ---
  .el-dialog__footer {
    padding: 16px 24px;
    border-top: 1px solid var(--app-border-strong);
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  }

  // --- Form Labels ---
  .el-form-item__label {
    color: var(--app-text-regular);
    font-weight: 600;
  }

  // --- Form Controls ---
  .el-input__wrapper {
    background-color: var(--app-input-bg);
    border: 1px solid var(--app-input-border);
    box-shadow: none;
  }

  .el-input__wrapper.is-focus {
    background: var(--app-input-bg-focus);
    box-shadow: 0 0 0 1px var(--app-input-border-focus) inset;
  }

  .el-textarea__inner {
    background-color: var(--app-input-bg);
    border: 1px solid var(--app-input-border);
    box-shadow: none;
  }

  .el-textarea__inner:focus {
    border-color: var(--app-input-border-focus);
    box-shadow: 0 0 0 1px var(--app-input-border-focus) inset;
  }

  .el-select__wrapper {
    background-color: var(--app-input-bg);
    border: 1px solid var(--app-input-border);
    box-shadow: none;
  }

  .el-select__wrapper.is-focused {
    border-color: var(--app-input-border-focus);
    box-shadow: 0 0 0 1px var(--app-input-border-focus) inset;
  }

  // --- Steps ---
  .el-step__title {
    font-size: 12px;
    font-weight: 600;
    color: var(--app-text-muted);
  }

  .el-step__head.is-process .el-step__icon,
  .el-step__head.is-finish .el-step__icon {
    background: var(--app-surface-strong);
    color: var(--el-color-primary);
  }

  .el-step__line {
    background-color: var(--app-border-strong);
  }
}

// --- Dark Mode ---
html.dark .base-dialog {
  .el-dialog {
    background: var(--glass-bg);
    border-color: var(--glass-border);
    box-shadow: var(--glass-shadow);
  }

  .el-dialog__header {
    border-bottom-color: var(--glass-border);
  }

  .el-dialog__title {
    color: var(--app-text-primary);
  }

  .el-dialog__body {
    color: var(--app-text-regular);
  }

  .el-dialog__footer {
    border-top-color: var(--glass-border);
  }

  .el-form-item__label {
    color: var(--app-text-regular);
  }

  .el-input__wrapper {
    background-color: var(--app-input-bg);
    border-color: var(--app-input-border);
  }

  .el-input__wrapper.is-focus {
    background-color: var(--app-input-bg-focus);
  }

  .el-textarea__inner {
    background-color: var(--app-input-bg);
    border-color: var(--app-input-border);
  }

  .el-select__wrapper {
    background-color: var(--app-input-bg);
    border-color: var(--app-input-border);
  }

  .el-step__title {
    color: var(--app-text-regular);
  }

  .el-step__line {
    background-color: rgba(255, 255, 255, 0.12);
  }

  .el-step__head.is-process .el-step__icon,
  .el-step__head.is-finish .el-step__icon {
    background: var(--app-surface-strong);
  }
}
</style>
