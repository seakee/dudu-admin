<script setup lang="ts">
import type { StatusPillTone } from '@/components/types'

export interface ProfileOverviewStat {
  key?: string
  label: string
  value: string
  tone: StatusPillTone
}

const props = withDefaults(
  defineProps<{
    avatar?: string
    userName: string
    roleName: string
    identifierLabel: string
    identifierTitle: string
    stats: ProfileOverviewStat[]
    clickable?: boolean
  }>(),
  {
    avatar: '',
    clickable: true
  }
)

const emit = defineEmits<{
  'select-stat': [key?: string]
}>()

const initialLetter = computed(() => (
  props.userName.trim().slice(0, 1).toUpperCase() || 'A'
))
</script>

<template>
  <PageCard class="profile-overview-banner">
    <div class="profile-overview-banner__layout">
      <div class="profile-overview-banner__identity">
        <AppAvatar
          :size="56"
          :src="props.avatar || undefined"
          :fallback="initialLetter"
          class="profile-overview-banner__avatar"
        />

        <div class="profile-overview-banner__meta">
          <div class="profile-overview-banner__name-row">
            <h3 class="profile-overview-banner__name">
              {{ props.userName || '-' }}
            </h3>
            <StatusPill
              compact
              tone="info"
              :label="props.roleName"
            />
          </div>
          <div class="profile-overview-banner__identifier">
            <span class="profile-overview-banner__identifier-label">
              {{ props.identifierTitle }}
            </span>
            <span class="profile-overview-banner__identifier-value font-mono">
              {{ props.identifierLabel }}
            </span>
          </div>
        </div>
      </div>

      <div class="profile-overview-banner__stats">
        <button
          v-for="stat in props.stats"
          :key="stat.key || stat.label"
          type="button"
          class="profile-overview-banner__stat"
          :class="{ 'is-clickable': props.clickable }"
          @click="props.clickable && emit('select-stat', stat.key)"
        >
          <span class="profile-overview-banner__stat-label">{{ stat.label }}</span>
          <StatusPill
            compact
            :tone="stat.tone"
            :dot="stat.tone === 'success' || stat.tone === 'warning'"
            :label="stat.value"
          />
        </button>
      </div>
    </div>
  </PageCard>
</template>

<style lang="scss" scoped>
.profile-overview-banner {
  width: 100%;
}

.profile-overview-banner__layout {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px 28px;
}

.profile-overview-banner__identity {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
}

.profile-overview-banner__avatar {
  flex-shrink: 0;
  border: 1px solid var(--border-subtle);
  background: var(--surface-subtle);
}

.profile-overview-banner__meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.profile-overview-banner__name-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.profile-overview-banner__name {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: -0.015em;
  color: var(--text-primary);
}

.profile-overview-banner__identifier {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 0;
}

.profile-overview-banner__identifier-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-tertiary);
}

.profile-overview-banner__identifier-value {
  font-size: 13px;
  color: var(--text-secondary);
  word-break: break-all;
}

.profile-overview-banner__stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(112px, auto));
  gap: 10px;
  flex-shrink: 0;
}

.profile-overview-banner__stat {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  min-width: 112px;
  padding: 10px 14px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--app-radius-md);
  background: var(--surface-subtle);
  font: inherit;
  text-align: left;
  transition: border-color $transition-fast, background-color $transition-fast;

  &.is-clickable {
    cursor: pointer;

    &:hover {
      border-color: var(--border-hover);
      background: var(--bg-primary);
    }

    &:focus-visible {
      outline: none;
      border-color: var(--app-input-border-focus);
      box-shadow: 0 0 0 3px var(--primary-ring);
    }
  }
}

.profile-overview-banner__stat-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-tertiary);
}
@media (max-width: #{$breakpoint-tablet}) {
  .profile-overview-banner__layout {
    flex-direction: column;
    align-items: stretch;
  }

  .profile-overview-banner__stats {
    width: 100%;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@include mobile {
  .profile-overview-banner__stats {
    grid-template-columns: 1fr;
  }
}
</style>
