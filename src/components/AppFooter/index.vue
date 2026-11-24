<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { getAppFooterMeta } from '@/utils/app'

const RELEASE_TAG_PATTERN =
  /^[vV]?(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/
const GIT_DESCRIBE_PATTERN = /-\d+-g[0-9a-f]+(?:-dirty)?$/i
const DEV_BUILD_PATTERN =
  /^[vV]?((?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*))-dev(?:\.[0-9A-Za-z-]+)?$/

const props = withDefaults(
  defineProps<{
    compact?: boolean
    version?: string
  }>(),
  {
    compact: false,
    version: undefined
  }
)

const { t } = useI18n()

const meta = computed(() => getAppFooterMeta(t('app.name')))

const versionMeta = computed(() => {
  const baseRepoUrl = meta.value.repoUrl.replace(/\/+$/, '')
  const releasesUrl = `${baseRepoUrl}/releases`
  const raw = props.version?.trim() || meta.value.version

  const devMatch = raw.match(DEV_BUILD_PATTERN)
  if (devMatch) {
    const fullTag = raw.startsWith('v') || raw.startsWith('V') ? `v${raw.slice(1)}` : `v${raw}`
    return {
      label: `v${devMatch[1]}`,
      href: releasesUrl,
      title: fullTag
    }
  }

  if (!GIT_DESCRIBE_PATTERN.test(raw) && RELEASE_TAG_PATTERN.test(raw)) {
    const tag = `v${raw.replace(/^[vV]/, '')}`
    return {
      label: tag,
      href: `${releasesUrl}/tag/${encodeURIComponent(tag)}`,
      title: undefined
    }
  }

  const normalized = raw.startsWith('v') || raw.startsWith('V') ? `v${raw.slice(1)}` : `v${raw}`
  return {
    label: normalized,
    href: releasesUrl,
    title: raw
  }
})
</script>

<template>
  <footer
    class="app-footer"
    :class="{ 'is-compact': props.compact }"
  >
    <p class="app-footer__text">
      <a
        class="app-footer__link"
        :href="meta.repoUrl"
        target="_blank"
        rel="noopener noreferrer"
      >
        {{ meta.name }}
      </a>
      {{ ' ' }}
      <a
        class="app-footer__link"
        :href="versionMeta.href"
        :title="versionMeta.title"
        target="_blank"
        rel="noopener noreferrer"
      >
        {{ versionMeta.label }}
      </a>
      {{ ' ' }}
      <span>{{ t('footer.designedBy') }}</span>
      {{ ' ' }}
      <a
        class="app-footer__link"
        :href="meta.authorUrl"
        target="_blank"
        rel="noopener noreferrer"
      >
        {{ meta.authorName }}
      </a>
    </p>
  </footer>
</template>

<style lang="scss" scoped>
.app-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  margin-top: auto;
  padding: 12px 12px 4px;
  text-align: center;
  flex-shrink: 0;

  &.is-compact {
    margin-top: 0;
    padding: 2px 8px 0;
  }
}

.app-footer__text {
  margin: 0;
  color: color-mix(in srgb, var(--text-tertiary) 72%, transparent);
  font-size: 11.5px;
  font-weight: 400;
  letter-spacing: 0.025em;
  line-height: 1.5;
  font-variant-numeric: tabular-nums;
}

.app-footer__link {
  color: inherit;
  text-decoration: none;
  cursor: pointer;
  transition: color $transition-fast;

  &:hover {
    color: var(--text-secondary);
    text-decoration: none;
  }

  &:focus-visible {
    outline: 1.5px solid var(--app-input-border-focus);
    outline-offset: 2px;
    border-radius: 6px;
  }
}
</style>
