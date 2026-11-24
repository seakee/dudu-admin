<script setup lang="ts">
import PageCard from '@/components/PageCard/index.vue'
import ThemeSelect from '@/components/ThemeSelect/index.vue'
import LocaleSelect from '@/components/LocaleSelect/index.vue'
import AppFooter from '@/components/AppFooter/index.vue'

export type AuthCardPadding = 'default' | 'compact' | 'spacious'

const props = withDefaults(
  defineProps<{
    maxWidth?: string
    showTools?: boolean
    showFooter?: boolean
    cardPadding?: AuthCardPadding
    centered?: boolean
    cardClass?: string
  }>(),
  {
    maxWidth: '440px',
    showTools: true,
    showFooter: true,
    cardPadding: 'default',
    centered: true,
    cardClass: ''
  }
)
</script>

<template>
  <div
    class="auth-shell"
    :class="{
      'is-no-tools': !props.showTools,
      'is-no-footer': !props.showFooter
    }"
  >
    <div
      v-if="props.showTools"
      class="auth-shell__tools"
    >
      <slot name="tools">
        <ThemeSelect class="auth-shell__tool" />
        <LocaleSelect
          class="auth-shell__tool"
          icon-only
        />
      </slot>
    </div>

    <div class="auth-shell__main">
      <PageCard
        class="auth-shell__card"
        :class="[
          `auth-shell__card--${props.cardPadding}`,
          { 'is-centered': props.centered },
          props.cardClass
        ]"
        :style="{ maxWidth: props.maxWidth }"
      >
        <slot />
      </PageCard>
    </div>

    <AppFooter
      v-if="props.showFooter"
      compact
    />
  </div>
</template>

<style lang="scss" scoped>
.auth-shell {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  min-height: 100vh;
  width: 100%;
  padding: 64px 20px 16px;
  overflow-x: hidden;

  @supports (min-height: 100dvh) {
    min-height: 100dvh;
  }

  &.is-no-tools {
    padding-top: 24px;
  }

  &.is-no-footer {
    justify-content: center;
    padding-bottom: 24px;
  }
}

.auth-shell__tools {
  position: absolute;
  top: 20px;
  right: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 20;

  :deep(.theme-select-container),
  :deep(.locale-select-container),
  :deep(.locale-select-container.icon-only) {
    width: var(--control-height-md);
    height: var(--control-height-md);
    padding: 0;
    border-radius: var(--app-radius-sm);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    color: var(--text-secondary);
    box-shadow: var(--app-specular-highlight);
    transition:
      background-color $transition-fast,
      border-color $transition-fast,
      color $transition-fast;
  }

  :deep(.theme-select-container:hover),
  :deep(.locale-select-container:hover) {
    background: var(--app-accent-soft);
    border-color: var(--border-hover);
    color: var(--primary-text);
  }

  @include mobile {
    top: 14px;
    right: 14px;

    :deep(.theme-select-container),
    :deep(.locale-select-container),
    :deep(.locale-select-container.icon-only) {
      width: var(--control-height-sm);
      height: var(--control-height-sm);
    }
  }
}

.auth-shell__main {
  flex: 1 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  position: relative;
  z-index: 10;
}

.auth-shell__card {
  width: 100%;
  text-align: left;
  animation: auth-shell-fade-in 0.35s ease;
  transition: max-width $transition-normal;

  &.is-centered {
    text-align: center;
  }

  &--default :deep(.page-card__body) {
    padding: 36px 32px;

    @include mobile {
      padding: 28px 20px;
    }
  }

  &--compact :deep(.page-card__body) {
    padding: 32px 28px;

    @include mobile {
      padding: 24px 20px;
    }
  }

  &--spacious :deep(.page-card__body) {
    padding: 40px 32px 44px;

    @include mobile {
      padding: 32px 20px 36px;
    }
  }
}

:global([data-visual-effects='reduced']) .auth-shell__card {
  animation: none;
  transition: none;
}

@media (prefers-reduced-motion: reduce) {
  .auth-shell__card {
    animation: none;
    transition: none;
  }
}

@keyframes auth-shell-fade-in {
  from {
    opacity: 0;
    transform: translateY(12px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
