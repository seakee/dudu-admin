<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const { t } = useI18n()

function goHome() {
  router.push('/')
}
</script>

<template>
  <div class="error-page">
    <PageCard class="error-card">
      <div class="error-content">
        <h1 class="error-code">
          404
        </h1>
        <p class="error-message">
          {{ t('error.notFound') }}
        </p>
        <el-button
          type="primary"
          @click="goHome"
        >
          {{ t('error.backHome') }}
        </el-button>
      </div>
    </PageCard>
  </div>
</template>

<style lang="scss" scoped>
.error-page {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;

}

.error-card {
  width: min(520px, 92vw);
  text-align: center;
}

.error-card :deep(.el-card__body) {
  padding: 40px 32px 48px;
}

.error-content {
  text-align: center;

  .error-code {
    font-size: 120px;
    font-weight: bold;
    color: var(--app-accent);
    margin: 0;
  }

  .error-message {
    font-size: 18px;
    color: var(--app-text-muted);
    margin: 20px 0 40px;
  }
}
</style>
