<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import {
  getMyPasskeys,
  getOAuthAccounts,
  getTfaStatus,
  updateProfile
} from '@/api/auth'
import type { SegmentedTabItem } from '@/components/types'
import { useHeaderRefresh } from '@/composables/useHeaderRefresh'
import { useAuthStore } from '@/stores'
import type { OAuthAccount, PasskeyItem } from '@/types/api'
import type { FormInstance, FormRules } from '@/types/form'
import { isHandledHttpError } from '@/utils/httpError'
import { notify } from '@/utils/notify'
import { getOAuthProviderMeta } from '@/utils/oauthProvider'
import { isWebAuthnSupported } from '@/utils/webauthn'
import HighRiskReauthDialog, { type HighRiskAction } from './components/HighRiskReauthDialog.vue'
import ProfileOverviewCard, { type ProfileOverviewStat } from './components/ProfileOverviewCard.vue'
import ProfileSecurityWizardDialog, { type SecurityWizardAction } from './components/ProfileSecurityWizardDialog.vue'

type ProfileTab = 'profile' | 'security'

type SecurityWizardDialogInstance = {
  open: (action: SecurityWizardAction) => Promise<void>
}

type HighRiskReauthDialogInstance = {
  openOAuthUnbind: (account: OAuthAccount) => void
  openPasskeyDelete: (item: PasskeyItem) => void
  openPasskeyRegister: (displayName?: string) => Promise<void>
}

const reservedNameKeywords = [
  'admin',
  'root',
  'administrator',
  '管理员',
  '超级管理员',
  'seakee',
  'super_admin',
  'superAdmin'
]

const router = useRouter()
const authStore = useAuthStore()
const { t } = useI18n()

const activeTab = ref<ProfileTab>('profile')
const profileLoading = ref(false)
const workspaceRefreshing = ref(false)
const oauthAccountsLoading = ref(false)
const passkeysLoading = ref(false)
const passkeyDeletingId = ref<number | null>(null)
const passkeyRegisterBusy = ref(false)
const passkeySupported = ref(isWebAuthnSupported())
const tfaEnabled = ref(false)

const oauthAccounts = ref<OAuthAccount[]>([])
const passkeys = ref<PasskeyItem[]>([])
const passkeyDisplayName = ref('')

const profileFormRef = ref<FormInstance>()
const securityWizardRef = ref<SecurityWizardDialogInstance | null>(null)
const highRiskDialogRef = ref<HighRiskReauthDialogInstance | null>(null)

const profileForm = reactive({
  user_name: '',
  role_name: '',
  avatar: '',
  email: '',
  phone: ''
})
const initialProfileUserName = ref('')
const initialProfileAvatar = ref('')

const profileTabs = computed<SegmentedTabItem<ProfileTab>[]>(() => ([
  { id: 'profile', label: t('profile.tabProfile') },
  { id: 'security', label: t('profile.tabSecurity') }
]))

const isProfileDirty = computed(() => (
  profileForm.user_name.trim() !== initialProfileUserName.value.trim()
  || profileForm.avatar.trim() !== initialProfileAvatar.value.trim()
))

const profileRules = computed<FormRules>(() => ({
  user_name: [
    { required: true, message: t('profile.validation.userNameRequired'), trigger: 'blur' },
    {
      validator: (_rule, value, callback) => {
        const normalized = String(value || '').trim()
        const initialUserName = initialProfileUserName.value.trim()

        if (!normalized) {
          callback(new Error(t('profile.validation.userNameRequired')))
          return
        }

        if (normalized === initialUserName) {
          callback()
          return
        }

        const lowered = normalized.toLowerCase()
        const isReserved = reservedNameKeywords.some((keyword) => {
          const target = keyword.toLowerCase()
          return lowered.startsWith(target) || lowered.endsWith(target)
        })

        if (isReserved) {
          callback(new Error(t('profile.validation.userNameReserved')))
          return
        }

        callback()
      },
      trigger: ['blur', 'change']
    }
  ]
}))

const profileRoleName = computed(() => profileForm.role_name || t('profile.roleAdmin'))

const userIdentifierLabel = computed(() => {
  const values = [profileForm.email, profileForm.phone].filter((item) => !!item)
  return values.length ? values.join(' / ') : '-'
})

const overviewStats = computed<ProfileOverviewStat[]>(() => ([
  {
    key: 'tfa',
    label: t('profile.sectionTfa'),
    value: tfaEnabled.value ? t('profile.tfaEnabled') : t('profile.tfaDisabled'),
    tone: tfaEnabled.value ? 'success' : 'warning'
  },
  {
    key: 'passkey',
    label: t('profile.sectionPasskey'),
    value: String(passkeys.value.length),
    tone: passkeys.value.length > 0 ? 'info' : 'neutral'
  },
  {
    key: 'oauth',
    label: t('profile.sectionOAuth'),
    value: String(oauthAccounts.value.length),
    tone: oauthAccounts.value.length > 0 ? 'info' : 'neutral'
  }
]))

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : ''
}

function getOAuthProviderLabel(provider?: string) {
  if (!provider) return '-'
  const meta = getOAuthProviderMeta(provider)
  return meta.i18nKey ? t(meta.i18nKey) : provider
}

function getOAuthProviderTone(provider?: string) {
  return getOAuthProviderMeta(provider).tone
}

async function reloadProfileWorkspace() {
  if (workspaceRefreshing.value) return

  workspaceRefreshing.value = true
  try {
    await Promise.all([
      refreshProfile(),
      refreshTfaStatus(),
      fetchOAuthAccounts(),
      fetchPasskeys()
    ])
  } finally {
    workspaceRefreshing.value = false
  }
}

const { isHeaderRefreshing } = useHeaderRefresh(reloadProfileWorkspace)

onMounted(async () => {
  await reloadProfileWorkspace()
})

async function refreshProfile() {
  try {
    const data = await authStore.getProfile()
    profileForm.user_name = data.user_name || ''
    profileForm.role_name = data.role_name || ''
    profileForm.avatar = data.avatar || ''
    profileForm.email = data.email || ''
    profileForm.phone = data.phone || ''
    initialProfileUserName.value = data.user_name || ''
    initialProfileAvatar.value = data.avatar || ''
  } catch {
    // ignore
  }
}

async function refreshTfaStatus() {
  try {
    const { data } = await getTfaStatus()
    tfaEnabled.value = data.data.enable
  } catch {
    // ignore
  }
}

async function fetchOAuthAccounts() {
  oauthAccountsLoading.value = true
  try {
    const { data } = await getOAuthAccounts()
    oauthAccounts.value = data.data
  } catch {
    // 请求层已处理提示
  } finally {
    oauthAccountsLoading.value = false
  }
}

async function fetchPasskeys() {
  passkeysLoading.value = true
  try {
    const { data } = await getMyPasskeys()
    passkeys.value = data.data
  } catch {
    // 请求层已处理提示
  } finally {
    passkeysLoading.value = false
  }
}

async function handleUpdateProfile() {
  if (!isProfileDirty.value) return

  const valid = await profileFormRef.value?.validate()
  if (valid === false) return

  profileLoading.value = true
  try {
    const trimmedUserName = profileForm.user_name.trim()
    const initialUserName = initialProfileUserName.value.trim()
    const trimmedAvatar = profileForm.avatar.trim()
    const payload: {
      user_name?: string
      avatar?: string
    } = {
      avatar: trimmedAvatar || undefined
    }

    if (trimmedUserName !== initialUserName) {
      payload.user_name = trimmedUserName
    }

    const { data } = await updateProfile({ ...payload })

    if (data.code !== 0) {
      throw new Error(data.msg || t('profile.message.updateFailed'))
    }

    initialProfileUserName.value = trimmedUserName
    initialProfileAvatar.value = trimmedAvatar
    notify.success(t('profile.message.profileUpdated'))
    await refreshProfile()
  } catch (error: unknown) {
    if (!isHandledHttpError(error)) {
      notify.error(getErrorMessage(error) || t('profile.message.updateFailed'))
    }
  } finally {
    profileLoading.value = false
  }
}

function openDialog(action: SecurityWizardAction) {
  void securityWizardRef.value?.open(action)
}

async function handleSecurityWizardSuccess(action: SecurityWizardAction) {
  if (action === 'password') {
    await authStore.logout()
    await router.replace('/login')
    return
  }

  if (action === 'account') {
    await refreshProfile()
    return
  }

  await refreshTfaStatus()
}

function handleRegisterPasskey() {
  if (passkeyRegisterBusy.value) return

  if (!passkeySupported.value) {
    notify.warning(t('passkey.unsupported'))
    return
  }

  void highRiskDialogRef.value?.openPasskeyRegister(passkeyDisplayName.value)
}

function handleDeletePasskey(item: PasskeyItem) {
  highRiskDialogRef.value?.openPasskeyDelete(item)
}

function handleUnbindOAuth(account: OAuthAccount) {
  highRiskDialogRef.value?.openOAuthUnbind(account)
}

async function handleHighRiskSuccess(action: HighRiskAction) {
  if (action === 'oauth-unbind') {
    await fetchOAuthAccounts()
    return
  }

  if (action === 'passkey-register') {
    passkeyDisplayName.value = ''
  }

  await fetchPasskeys()
}
</script>

<template>
  <div class="page-workspace profile-page">
    <PageControlBar>
      <template #leading>
        <SegmentedTabs
          v-model="activeTab"
          :items="profileTabs"
          size="md"
        />
      </template>

      <template #actions>
        <AppButton
          variant="secondary"
          size="sm"
          icon="RotateCw"
          :loading="workspaceRefreshing || isHeaderRefreshing"
          @click="reloadProfileWorkspace"
        >
          {{ t('common.refresh') }}
        </AppButton>
      </template>
    </PageControlBar>

    <!-- Tab 1: Profile Overview + Editor -->
    <div
      v-if="activeTab === 'profile'"
      class="profile-stack"
    >
      <ProfileOverviewCard
        :avatar="profileForm.avatar"
        :user-name="profileForm.user_name"
        :role-name="profileRoleName"
        :identifier-label="userIdentifierLabel"
        :identifier-title="t('profile.account')"
        :stats="overviewStats"
        @select-stat="activeTab = 'security'"
      />

      <PageCard class="profile-editor-card">
        <template #header>
          <div class="profile-section-header">
            <div class="profile-section-header__text">
              <h3 class="profile-section-header__title">
                {{ t('profile.sectionProfile') }}
              </h3>
              <p class="profile-section-header__desc">
                {{ t('profile.editorSubtitle') }}
              </p>
            </div>
          </div>
        </template>

        <AppForm
          ref="profileFormRef"
          :model="profileForm"
          :rules="profileRules"
          label-position="top"
          class="profile-editor-form"
          @submit.prevent="handleUpdateProfile"
        >
          <div class="profile-editor-grid">
            <AppFormItem
              :label="t('profile.userName')"
              prop="user_name"
              :help="t('profile.userNameHint')"
            >
              <AppInput
                v-model="profileForm.user_name"
                prefix-icon="User"
                :placeholder="t('common.placeholder')"
                clearable
              />
            </AppFormItem>

            <AppFormItem
              :label="t('profile.avatarUrl')"
              prop="avatar"
              :help="t('profile.avatarTip')"
            >
              <div class="profile-avatar-input-row">
                <AppInput
                  v-model="profileForm.avatar"
                  prefix-icon="Image"
                  :placeholder="t('common.placeholder')"
                  clearable
                />
                <AppAvatar
                  :size="40"
                  :src="profileForm.avatar || undefined"
                  :fallback="profileForm.user_name.trim().slice(0, 1).toUpperCase() || 'A'"
                  class="profile-avatar-preview"
                />
              </div>
            </AppFormItem>
          </div>

          <SectionActionFooter
            class="profile-editor-footer"
            :dirty="isProfileDirty"
            :dirty-text="t('common.unsavedChanges')"
            :saved-text="t('common.allSaved')"
          >
            <AppButton
              variant="primary"
              size="sm"
              :loading="profileLoading"
              :disabled="!isProfileDirty"
              @click="handleUpdateProfile"
            >
              {{ t('common.save') }}
            </AppButton>
          </SectionActionFooter>
        </AppForm>
      </PageCard>
    </div>

    <!-- Tab 2: Security & Credentials (Flat Settings Rows + Inline Passkey & OAuth) -->
    <div
      v-else
      class="profile-stack"
    >
      <!-- Section 1: Password, Identifier, 2FA -->
      <PageCard flush>
        <template #header>
          <div class="profile-section-header">
            <div class="profile-section-header__text">
              <h3 class="profile-section-header__title">
                {{ t('profile.securityTitle') }}
              </h3>
              <p class="profile-section-header__desc">
                {{ t('profile.securitySubtitle') }}
              </p>
            </div>
          </div>
        </template>

        <SettingItemRow
          :title="t('profile.sectionPassword')"
          :description="t('profile.setting.passwordDesc')"
          :badge="t('profile.securityStatusSafe')"
          badge-tone="success"
          badge-dot
        >
          <template #action>
            <AppButton
              variant="secondary"
              size="sm"
              @click="openDialog('password')"
            >
              {{ t('profile.actionChange') }}
            </AppButton>
          </template>
        </SettingItemRow>

        <SettingItemRow
          :title="t('profile.sectionAccount')"
          :description="t('profile.setting.accountDesc')"
          :badge="userIdentifierLabel"
          badge-tone="info"
          badge-mono
        >
          <template #action>
            <AppButton
              variant="secondary"
              size="sm"
              @click="openDialog('account')"
            >
              {{ t('common.edit') }}
            </AppButton>
          </template>
        </SettingItemRow>

        <SettingItemRow
          :title="t('profile.sectionTfa')"
          :description="tfaEnabled ? t('profile.setting.tfaEnabledDesc') : t('profile.setting.tfaDisabledDesc')"
          :badge="tfaEnabled ? t('profile.tfaEnabled') : t('profile.tfaDisabled')"
          :badge-tone="tfaEnabled ? 'success' : 'warning'"
          badge-dot
        >
          <template #action>
            <AppButton
              :variant="tfaEnabled ? 'danger' : 'primary'"
              size="sm"
              @click="openDialog(tfaEnabled ? 'tfa-disable' : 'tfa-enable')"
            >
              {{ tfaEnabled ? t('common.disable') : t('common.enable') }}
            </AppButton>
          </template>
        </SettingItemRow>
      </PageCard>

      <!-- Section 2: Inline Passkey Management -->
      <PageCard>
        <template #header>
          <div class="profile-section-header profile-section-header--split">
            <div class="profile-section-header__text">
              <div class="profile-section-header__title-row">
                <h3 class="profile-section-header__title">
                  {{ t('profile.sectionPasskey') }}
                </h3>
                <StatusPill
                  compact
                  :tone="passkeys.length > 0 ? 'info' : 'neutral'"
                  :label="passkeys.length > 0 ? t('passkey.summary', { count: passkeys.length }) : t('passkey.empty')"
                />
              </div>
              <p class="profile-section-header__desc">
                {{ t('profile.setting.passkeyDesc') }}
              </p>
            </div>

            <div class="profile-passkey-create">
              <AppInput
                v-model="passkeyDisplayName"
                size="sm"
                prefix-icon="KeyRound"
                :placeholder="t('passkey.displayNamePlaceholder')"
                :disabled="!passkeySupported || passkeyRegisterBusy"
                clearable
                class="profile-passkey-create__input"
                @enter="handleRegisterPasskey"
              />
              <AppButton
                variant="primary"
                size="sm"
                icon="Plus"
                :loading="passkeyRegisterBusy"
                :disabled="!passkeySupported"
                @click="handleRegisterPasskey"
              >
                {{ t('passkey.startRegister') }}
              </AppButton>
            </div>
          </div>
        </template>

        <div
          v-loading="passkeysLoading"
          class="profile-credential-body"
        >
          <AppAlert
            v-if="!passkeySupported"
            type="warning"
            :title="t('passkey.unsupported')"
            show-icon
            :closable="false"
          />

          <EmptyState
            v-if="!passkeysLoading && passkeys.length === 0"
            variant="inline"
            :title="t('passkey.empty')"
            :description="t('profile.setting.passkeyDesc')"
          />

          <div
            v-else
            class="profile-credential-list"
          >
            <CredentialItemCard
              v-for="item in passkeys"
              :key="item.id"
              icon-variant="passkey"
              :title="item.display_name || t('passkey.displayName')"
              :badge="`#${item.id}`"
              badge-tone="neutral"
            >
              <template #icon>
                <AppIcon
                  name="KeyRound"
                  :size="18"
                />
              </template>
              <template #meta>
                <span class="tabular-nums">{{ t('passkey.createdAt') }}: {{ item.created_at || '-' }}</span>
                <span class="tabular-nums">{{ t('passkey.lastUsedAt') }}: {{ item.last_used_at || t('passkey.notUsed') }}</span>
              </template>
              <template #action>
                <AppButton
                  variant="danger"
                  size="sm"
                  :loading="passkeyDeletingId === item.id"
                  @click="handleDeletePasskey(item)"
                >
                  {{ t('common.delete') }}
                </AppButton>
              </template>
            </CredentialItemCard>
          </div>
        </div>
      </PageCard>

      <!-- Section 3: Inline OAuth Connections -->
      <PageCard>
        <template #header>
          <div class="profile-section-header profile-section-header--split">
            <div class="profile-section-header__text">
              <div class="profile-section-header__title-row">
                <h3 class="profile-section-header__title">
                  {{ t('profile.sectionOAuth') }}
                </h3>
                <StatusPill
                  compact
                  :tone="oauthAccounts.length > 0 ? 'info' : 'neutral'"
                  :label="oauthAccounts.length > 0 ? t('profile.oauth.summary', { count: oauthAccounts.length }) : t('profile.oauth.empty')"
                />
              </div>
              <p class="profile-section-header__desc">
                {{ t('profile.setting.oauthDesc') }}
              </p>
            </div>
          </div>
        </template>

        <div
          v-loading="oauthAccountsLoading"
          class="profile-credential-body"
        >
          <EmptyState
            v-if="!oauthAccountsLoading && oauthAccounts.length === 0"
            variant="inline"
            :title="t('profile.oauth.empty')"
            :description="t('profile.setting.oauthDesc')"
          />

          <div
            v-else
            class="profile-credential-list"
          >
            <CredentialItemCard
              v-for="account in oauthAccounts"
              :key="account.id"
              :icon-variant="account.provider === 'feishu' || account.provider === 'wechat' ? account.provider : 'default'"
              :title="getOAuthProviderLabel(account.provider)"
              :badge="account.display_name || '-'"
              :badge-tone="getOAuthProviderTone(account.provider)"
              :badge-mono="false"
            >
              <template #icon>
                <AppAvatar
                  :size="36"
                  :src="account.avatar_url"
                  :alt="account.display_name || getOAuthProviderLabel(account.provider)"
                >
                  <OAuthProviderIcon
                    :provider="account.provider"
                    :size="20"
                  />
                </AppAvatar>
              </template>
              <template #meta>
                <span class="tabular-nums">{{ t('profile.oauth.boundAt') }}: {{ account.bound_at || '-' }}</span>
                <span class="tabular-nums">{{ t('profile.oauth.lastLoginAt') }}: {{ account.last_login_at || '-' }}</span>
              </template>
              <template #action>
                <AppButton
                  variant="danger"
                  size="sm"
                  @click="handleUnbindOAuth(account)"
                >
                  {{ t('profile.oauth.unbind') }}
                </AppButton>
              </template>
            </CredentialItemCard>
          </div>
        </div>
      </PageCard>
    </div>

    <!-- Security Wizards (Password / Account / 2FA) -->
    <ProfileSecurityWizardDialog
      ref="securityWizardRef"
      :email="profileForm.email"
      :phone="profileForm.phone"
      :tfa-enabled="tfaEnabled"
      @success="handleSecurityWizardSuccess"
    />

    <!-- Single-layer High-Risk Confirmation & Reauth Dialog -->
    <HighRiskReauthDialog
      ref="highRiskDialogRef"
      @success="handleHighRiskSuccess"
      @deleting-id-change="passkeyDeletingId = $event"
      @register-busy-change="passkeyRegisterBusy = $event"
    />
  </div>
</template>

<style lang="scss" scoped>
.profile-stack {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.profile-section-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.profile-section-header__text {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.profile-section-header__title-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.profile-section-header__title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--text-primary);
}

.profile-section-header__desc {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-secondary);
}

.profile-editor-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.profile-editor-form {
  :deep(.app-form-item) {
    margin-bottom: 0;
  }
}

.profile-avatar-input-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.profile-avatar-preview {
  flex-shrink: 0;
  border: 1px solid var(--border-subtle);
  background: var(--surface-subtle);
}

.profile-editor-footer {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--border-subtle);
}

.profile-passkey-create {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.profile-passkey-create__input {
  width: 220px;
}

.profile-credential-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 72px;
}

.profile-credential-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

@media (max-width: #{$breakpoint-tablet}) {
  .profile-section-header--split {
    flex-direction: column;
    align-items: stretch;
  }

  .profile-passkey-create {
    width: 100%;
  }

  .profile-passkey-create__input {
    flex: 1;
    width: auto;
  }
}

@include mobile {
  .profile-editor-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .profile-passkey-create {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
