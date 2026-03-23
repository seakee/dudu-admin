<script setup lang="ts">
interface OverviewStat {
  label: string
  value: string
  tone?: 'primary' | 'success' | 'warning' | 'neutral'
}

const props = withDefaults(defineProps<{
  title: string
  subtitle: string
  identifierLabel: string
  identifierValue: string
  userName: string
  roleName: string
  avatar?: string
  stats?: OverviewStat[]
}>(), {
  avatar: '',
  stats: () => []
})

const userInitial = computed(() => {
  const trimmed = props.userName.trim()
  if (!trimmed) return '#'

  const [firstChar] = Array.from(trimmed)
  if (!firstChar) return '#'

  return /[a-zA-Z]/.test(firstChar) ? firstChar.toUpperCase() : firstChar
})
</script>

<template>
  <PageCard class="profile-overview-card">
    <div class="profile-overview-card__header">
      <span class="profile-overview-card__eyebrow">{{ title }}</span>
      <p class="profile-overview-card__subtitle">
        {{ subtitle }}
      </p>
    </div>

    <div class="profile-overview-card__hero">
      <el-avatar
        :size="88"
        :src="props.avatar"
        class="profile-overview-card__avatar"
        :class="{ 'is-generated': !props.avatar }"
      >
        {{ userInitial }}
      </el-avatar>

      <div class="profile-overview-card__identity">
        <h2>{{ userName }}</h2>
        <span class="profile-overview-card__role">{{ roleName }}</span>
      </div>
    </div>

    <div class="profile-overview-card__identifier">
      <span class="profile-overview-card__identifier-label">{{ identifierLabel }}</span>
      <strong>{{ identifierValue }}</strong>
    </div>

    <div class="profile-overview-card__stats">
      <div
        v-for="stat in props.stats"
        :key="stat.label"
        class="profile-overview-card__stat"
      >
        <span class="profile-overview-card__stat-label">{{ stat.label }}</span>
        <strong
          class="profile-overview-card__stat-value"
          :class="stat.tone ? `is-${stat.tone}` : ''"
        >
          {{ stat.value }}
        </strong>
      </div>
    </div>
  </PageCard>
</template>

<style lang="scss" scoped>
.profile-overview-card {
  height: 100%;
  --profile-overview-stat-bg: var(--app-surface-muted);
  --profile-overview-stat-bg-hover: var(--app-surface-strong);
  --profile-overview-stat-border: var(--app-border);
  --profile-overview-stat-label: var(--app-text-muted);

  :deep(.el-card__body) {
    display: flex;
    flex-direction: column;
    gap: 24px;
    min-height: 100%;
  }
}

.profile-overview-card__header {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.profile-overview-card__eyebrow {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--el-color-primary);
}

.profile-overview-card__subtitle {
  margin: 0;
  line-height: 1.6;
  color: var(--app-text-regular);
}

.profile-overview-card__hero {
  display: flex;
  align-items: center;
  gap: 18px;
}

.profile-overview-card__avatar {
  flex-shrink: 0;
  border: 1px solid var(--glass-border);
  box-shadow: var(--app-shadow-soft);

  &.is-generated {
    background: linear-gradient(145deg, #f2f8ff 0%, #deeeff 100%);
    border-color: rgba(10, 126, 220, 0.24);
    color: #1d72d6;
    font-size: 30px;
    font-weight: 700;
    box-shadow:
      inset 0 0 0 1px rgba(255, 255, 255, 0.75),
      0 8px 18px rgba(10, 126, 220, 0.2);
  }
}

.profile-overview-card__identity {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 8px;

  h2 {
    margin: 0;
    font-size: 26px;
    line-height: 1.1;
    color: var(--app-text-primary);
  }
}

.profile-overview-card__role {
  display: inline-flex;
  width: fit-content;
  align-items: center;
  border-radius: 999px;
  background: var(--app-accent-soft);
  color: var(--el-color-primary);
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
}

.profile-overview-card__identifier {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px 18px;
  border-radius: 16px;
  background: var(--app-surface-muted);
  border: 1px solid var(--app-border);

  strong {
    color: var(--app-text-primary);
    font-size: 15px;
    line-height: 1.5;
    word-break: break-word;
  }
}

.profile-overview-card__identifier-label,
.profile-overview-card__stat-label {
  font-size: 12px;
  color: var(--profile-overview-stat-label);
}

.profile-overview-card__stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.profile-overview-card__stat {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px 16px;
  border-radius: 16px;
  background: var(--profile-overview-stat-bg);
  border: 1px solid var(--profile-overview-stat-border);
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
    background: var(--profile-overview-stat-bg-hover);
    box-shadow: var(--app-shadow-soft);
    border-color: var(--el-color-primary-light-7);
  }
}

.profile-overview-card__stat-value {
  font-size: 16px;
  font-weight: 700;
  color: var(--app-text-primary);

  &.is-primary {
    color: var(--el-color-primary);
  }

  &.is-success {
    color: var(--el-color-success);
  }

  &.is-warning {
    color: var(--el-color-warning);
  }
}

:global(html.dark) .profile-overview-card__avatar.is-generated {
  background: linear-gradient(145deg, rgba(56, 130, 246, 0.42) 0%, rgba(30, 64, 175, 0.46) 100%);
  border-color: rgba(114, 180, 255, 0.36);
  color: #edf4ff;
}

:global(html.dark) .profile-overview-card {
  --profile-overview-stat-bg: rgba(255, 255, 255, 0.06);
  --profile-overview-stat-bg-hover: rgba(255, 255, 255, 0.1);
  --profile-overview-stat-border: rgba(255, 255, 255, 0.12);
  --profile-overview-stat-label: var(--app-text-regular);
}

@media (max-width: 768px) {
  .profile-overview-card__hero {
    align-items: flex-start;
    flex-direction: column;
  }

  .profile-overview-card__stats {
    grid-template-columns: 1fr;
  }
}
</style>
