<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import AuthPageShell from '@/components/AuthPageShell/index.vue'

const router = useRouter()
const { t } = useI18n()

function goHome() {
  router.push('/')
}
</script>

<template>
  <AuthPageShell
    max-width="520px"
    card-padding="spacious"
  >
    <div class="error-content">
      <h1 class="error-code">
        404
      </h1>
      <p class="error-message">
        {{ t('error.notFound') }}
      </p>
      <AppButton
        variant="primary"
        @click="goHome"
      >
        {{ t('error.backHome') }}
      </AppButton>
    </div>
  </AuthPageShell>
</template>

<style lang="scss" scoped>
.error-content {
  text-align: center;

  .error-code {
    font-size: clamp(72px, 16vw, 112px);
    line-height: 1;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: var(--primary-text);
    margin: 0;
  }

  .error-message {
    font-size: 16px;
    line-height: 1.6;
    color: var(--text-secondary);
    margin: 16px 0 32px;
  }
}
</style>
