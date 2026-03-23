export default {
  locale: 'en-US',
  app: {
    name: 'Admin'
  },
  common: {
    confirm: 'Confirm',
    cancel: 'Cancel',
    submit: 'Submit',
    reset: 'Reset',
    search: 'Search',
    add: 'Add',
    edit: 'Edit',
    delete: 'Delete',
    detail: 'Detail',
    save: 'Save',
    close: 'Close',
    back: 'Back',
    next: 'Next',
    actions: 'Actions',
    status: 'Status',
    enabled: 'Enabled',
    disabled: 'Disabled',
    enable: 'Enable',
    disable: 'Disable',
    yes: 'Yes',
    no: 'No',
    copy: 'Copy',
    manage: 'Manage',
    placeholder: 'Please enter',
    selectPlaceholder: 'Please select',
    loading: 'Loading...',
    view: 'View'
  },
  route: {
    login: 'Login',
    passwordReset: 'Reset Password',
    oauth: 'Third-Party Login',
    profile: 'Profile',
    dashboard: 'Dashboard',
    system: 'System',
    user: 'User',
    role: 'Role',
    permission: 'Permission',
    menu: 'Menu',
    operation: 'Operation Logs',
    notFound: '404'
  },
  navbar: {
    profile: 'Profile',
    logout: 'Log Out',
    logoutConfirm: 'Are you sure you want to log out?',
    dialogTitle: 'Notice'
  },
  theme: {
    light: 'Light',
    dark: 'Dark',
    auto: 'System',
    tooltip: 'Theme'
  },
  localeSwitch: {
    tooltip: 'Language',
    en: 'English',
    zh: '简体中文'
  },
  login: {
    slogan: 'Build an efficient, elegant admin console',
    identifierPlaceholder: 'Identifier (email/phone)',
    passwordPlaceholder: 'Password',
    totpPlaceholder: '6-digit code',
    submit: 'Sign In',
    submitTotp: 'Verify & Sign In',
    otherLogin: 'Other sign-in methods',
    oauthFeishu: 'Feishu',
    oauthWechat: 'WeCom',
    validation: {
      identifierRequired: 'Please enter identifier (email/phone)',
      passwordRequired: 'Please enter password',
      codeRequired: 'Please enter the code',
      codeInvalid: 'Please enter a 6-digit verification code'
    },
    error: {
      safeCodeMissing: 'Safe code missing, please log in again',
      failed: 'Login failed',
      exception: 'Login error'
    }
  },
  reset: {
    title: 'Reset Password',
    tips: 'Please enter a new password to complete the reset',
    password: 'New Password',
    confirmPassword: 'Confirm Password',
    backLogin: 'Back to Login',
    confirm: 'Confirm',
    validation: {
      passwordRequired: 'Please enter a new password',
      confirmRequired: 'Please confirm the new password',
      passwordMismatch: 'Passwords do not match'
    },
    error: {
      safeCodeMissing: 'Safe code missing, please log in again',
      failed: 'Reset failed'
    },
    success: 'Password reset successful, please log in again'
  },
  oauth: {
    loading: 'Signing in, please wait...',
    missingParams: 'Missing required parameters',
    success: 'Login successful',
    failed: 'Login failed',
    exception: 'Login error',
    accountNotBound: 'OAuth account is not bound to an admin user',
    bind: {
      title: 'Bind OAuth Account',
      identifier: 'Identifier',
      identifierPlaceholder: 'Enter email or phone',
      reauthTitle: 'Verify Local Account',
      reauthTip: 'Enter your local account password. If TFA is enabled, provide the TOTP code as well.',
      totpTitle: 'Enter TOTP Code',
      totpStepTip: 'This local account has TFA enabled. Complete the second verification step.',
      password: 'Current Password',
      totpCode: 'TOTP Code',
      totpOptional: 'TOTP Code (required when TFA is enabled)',
      profilePreview: 'OAuth Profile Preview',
      syncFields: 'Fields to sync on first bind',
      syncEmpty: 'No syncable fields available',
      syncUserName: 'Sync username',
      syncAvatar: 'Sync avatar',
      ticketMissing: 'Bind ticket is missing. Please restart OAuth login.',
      success: 'Bind successful, signing you in',
      validation: {
        identifierRequired: 'Please enter identifier',
        passwordRequired: 'Please enter current password',
        totpInvalid: 'Please enter a 6-digit TOTP code'
      },
      step1Title: 'Start Account Binding',
      step1Desc: 'Please confirm the following third-party account information and select the fields you wish to sync.',
      step2Title: 'Confirm Account Binding',
      step2Desc: 'Please enter your account identifier and password to confirm your binding.',
      step3Title: 'Complete Secondary Authentication',
      step3Desc: 'Please enter the 6-digit verification code to complete the binding process.'
    }
  },
  error: {
    notFound: 'Sorry, the page you visited does not exist',
    backHome: 'Back to Home'
  },
  dashboard: {
    welcome: 'Welcome back, {name}!',
    subtitle: 'This is your admin home page',
    userTotal: 'Total Users',
    docs: 'Documents',
    notices: 'Notifications',
    visits: 'Visits Today'
  },
  profile: {
    title: 'Profile',
    pageSubtitle: 'Manage profile details, login identifiers, and high-risk verification methods in one place.',
    overviewTitle: 'Account Overview',
    overviewSubtitle: 'Identity details and security readiness for the current account are summarized here.',
    sectionProfile: 'Profile',
    sectionPassword: 'Change Password',
    sectionAccount: 'Change Login Identifier',
    sectionOAuth: 'OAuth Accounts',
    sectionPasskey: 'Passkeys',
    sectionTfa: 'Two-Factor Authentication',
    enableTfa: 'Enable Two-Factor Authentication',
    disableTfa: 'Disable Two-Factor Authentication',
    stepInfo: 'Info',
    tfaStepInfo: '2FA Info',
    tfaStepCode: 'Verification Code',
    stepVerify: 'Verify',
    enterCodeDesc: 'Enter the 2FA code to continue',
    enterOldPasswordDesc: 'Enter your current password to continue',
    enterPasswordDesc: 'Enter your password to continue',
    roleAdmin: 'Admin',
    securityTitle: 'Security Center',
    securitySubtitle: 'Security settings & 2FA',
    securityStatusSafe: 'Secure',
    actionChange: 'Change',
    editorSubtitle: 'Update display name and avatar URL with lightweight validation before submission.',
    tfaSetupTitle: 'Bind an Authenticator App',
    tfaSetupDesc: 'Scan the QR code with an authenticator app, or enter the key below manually.',
    scanTip: 'Scan with Google Authenticator or similar app',
    tfaKeyTip: 'If scanning is unavailable, enter this key manually in your authenticator app.',
    tfaCodeTitle: 'Enter the 6-digit Code',
    tfaCodeDesc: 'After scanning, enter the current code shown in your authenticator app.',
    codePlaceholder: '000000',
    disableConfirm: 'Are you sure you want to disable 2FA?',
    verifyCodeLabel: 'Verification Code',
    userName: 'Username',
    userNameHint: 'Avoid reserved prefixes or suffixes such as admin, root, or super_admin.',
    avatarUrl: 'Avatar URL',
    avatarPreview: 'Avatar Preview',
    avatarTip: 'Only preview avatar from URL',
    avatarFallback: 'U',
    account: 'Identifier',
    totpCode: 'Verification Code',
    password: 'Password',
    oldPassword: 'Current Password',
    newPassword: 'New Password',
    confirmNewPassword: 'Confirm New Password',
    newAccount: 'New Identifier',
    newEmail: 'New Email',
    newPhone: 'New Phone',
    save: 'Save',
    confirmChange: 'Confirm',
    tfaEnabled: 'Enabled',
    tfaDisabled: 'Disabled',
    tfaKey: 'TOTP Key',
    qrCode: 'QR Code',
    getKey: 'Get Key',
    enable: 'Enable',
    disable: 'Disable',
    copyKey: 'Copy',
    qrPlaceholder: 'Please get the key first',
    message: {
      profileUpdated: 'Profile updated',
      updateSuccess: 'Update successful',
      passwordUpdated: 'Password updated',
      accountUpdated: 'Account updated',
      oauthUnbindSuccess: 'OAuth account unbound',
      getFailed: 'Failed to fetch',
      updateFailed: 'Update failed',
      enableSuccess: 'Two-factor authentication enabled',
      enableFailed: 'Enable failed',
      disableSuccess: 'Two-factor authentication disabled',
      disableFailed: 'Disable failed',
      keyRequired: 'Please get the key first',
      keyEmpty: 'No key to copy',
      keyCopied: 'Key copied',
      copyFailed: 'Copy failed'
    },
    validation: {
      codeRequired: 'Please enter the code',
      codeInvalid: 'Please enter a 6-digit verification code',
      passwordRequired: 'Please enter a new password',
      passwordConfirmRequired: 'Please confirm the new password',
      passwordMismatch: 'Passwords do not match',
      oldPasswordRequired: 'Please enter your current password',
      accountPasswordRequired: 'Please enter your password',
      accountRequired: 'Please enter a new identifier',
      userNameRequired: 'Please enter a username',
      userNameReserved: 'This username uses a reserved prefix or suffix. Please choose another one.',
      identifierRequired: 'Email or phone is required',
      emailInvalid: 'Invalid email format',
      phoneInvalid: 'Invalid phone format'
    },
    setting: {
      passwordDesc: 'Changing the password invalidates the current session and requires signing in again.',
      accountDesc: 'Email and phone together define the available local login identifiers. Keep at least one.',
      oauthDesc: 'Review bound third-party accounts and unbind a specific account after high-risk verification.',
      passkeyDesc: 'Manage registered Passkey devices, add a new authenticator, or remove an outdated credential.',
      tfaEnabledDesc: 'Two-factor authentication is enabled. Sensitive actions will require an extra verification step.',
      tfaDisabledDesc: 'Enable two-factor authentication to reduce the risk of direct access after password exposure.'
    },
    reauth: {
      title: 'Security Verification',
      loading: 'Loading available verification methods...',
      chooseMethod: 'Choose a verification method',
      description: 'Please verify your identity before continuing with this sensitive action.',
      passkeyTitle: 'Verify with Passkey',
      passkeyDesc: 'Use a passkey already bound to this account to continue.',
      passwordTitle: 'Verify with Password',
      passwordDesc: 'Enter your current password. If TFA is enabled, a TOTP code will be required next.',
      passwordPlaceholder: 'Current Password',
      totpTitle: 'Enter TOTP Code',
      totpDesc: 'Enter the 6-digit code to complete verification.',
      passkeyBtn: 'Use Passkey',
      passwordBtn: 'Verify Password',
      totpBtn: 'Verify and Continue',
      switchToPasskey: 'Use Passkey Instead',
      switchToPassword: 'Use Password Instead',
      unavailable: 'No verification method is currently available'
    },
    oauth: {
      title: 'OAuth Account Management',
      summary: '{count} OAuth accounts bound',
      empty: 'No OAuth accounts bound yet',
      provider: 'Provider',
      tenant: 'Tenant',
      boundAt: 'Bound At',
      lastLoginAt: 'Last Login',
      unbind: 'Unbind',
      unbindConfirm: 'Unbind this OAuth account? Local account ownership will be re-verified first.',
      unbindConfirmTitle: 'Confirm Unbinding',
      unbindConfirmDesc: 'Are you sure you want to unbind the {provider} account {account}?',
      unbindWarning: 'You will no longer be able to sign in with this third-party account after unbinding.',
      reauthTitle: 'Re-authenticate Before Unbind',
      reauthPasswordTitle: 'Enter your password to verify your identity',
      reauthTotpTitle: 'Enter TOTP Code',
      reauthIdentifier: 'Identifier',
      reauthPassword: 'Current Password',
      reauthTotp: 'TOTP Code',
      reauthTip: 'If TFA is enabled on the local account, also provide the TOTP code.',
      reauthTotpTip: 'This local account has TFA enabled. Complete the second verification step.',
      providerFeishu: 'Feishu',
      providerWechat: 'WeCom',
      unbindConfirmBtn: 'Confirm Unbind',
      verifyAccountTitle: 'Verify Your Account',
      verifyBtn: 'Verify',
      completeTotpTitle: 'Complete Secondary Verification',
      completeUnbindBtn: 'Complete Unbinding'
    },
    passkey: {
      title: 'Passkey Management',
      deleteConfirmTitle: 'Re-authenticate Before Deletion',
      deleteConfirmDesc: 'Are you sure you want to delete the passkey "{name}"?',
      deleteWarning: 'This device will no longer be able to sign in to the current account after deletion.',
      verifyAccountTitle: 'Verify Your Account',
      reauthPasswordTitle: 'Enter your password to verify your identity',
      reauthTotpTip: 'This local account has TFA enabled. Complete the second verification step.',
      deleteConfirmBtn: 'Continue',
      verifyBtn: 'Verify',
      completeTotpTitle: 'Complete Secondary Verification',
      completeDeleteBtn: 'Confirm Delete'
    }
  },
  passkey: {
    startLogin: 'Sign in with Passkey',
    loginHint: 'Use a saved passkey directly without entering an email or phone number',
    startRegister: 'Add Passkey',
    manage: 'Manage',
    unsupported: 'Passkey is not supported in this browser or environment',
    unsupportedTip: 'Passkeys require a secure environment and WebAuthn support',
    displayName: 'Device Name',
    displayNamePlaceholder: 'For example: MacBook Pro / iPhone',
    registerHint: 'Device name is optional. The server will generate one if left blank.',
    summary: '{count} passkeys bound',
    empty: 'No passkeys yet',
    transports: 'Transports',
    lastUsedAt: 'Last Used',
    createdAt: 'Created At',
    aaguid: 'AAGUID',
    delete: 'Delete',
    deleteAll: 'Delete All',
    deleteConfirm: 'Delete this passkey?',
    notUsed: 'Never used',
    registered: 'Passkey added successfully',
    deleted: 'Passkey deleted',
    cancelled: 'Passkey operation was cancelled',
    invalidState: 'Invalid passkey state. Check the device or existing credential.',
    security: 'This page is not allowed to use Passkey',
    failed: 'Passkey operation failed'
  },
  system: {
    user: {
      title: 'User Management',
      search: {
        email: 'Email',
        phone: 'Phone',
        userName: 'Username',
        status: 'Status'
      },
      table: {
        email: 'Email',
        phone: 'Phone',
        userName: 'Username',
        status: 'Status',
        avatar: 'Avatar',
        tfa: '2FA',
        passkeyCount: 'Passkeys',
        createdAt: 'Created At'
      },
      dialog: {
        create: 'Create User',
        edit: 'Edit User',
        detail: 'User Details',
        role: 'Assign Roles',
        resetPassword: 'Reset Password',
        passkey: 'Passkey Management'
      },
      form: {
        email: 'Email',
        phone: 'Phone',
        userName: 'Username',
        password: 'Password',
        passwordOptional: 'Leave blank to keep unchanged',
        passwordRequiredHint: 'An initial password is required when creating a user',
        status: 'Status',
        avatar: 'Avatar',
        newPassword: 'New Password'
      },
      action: {
        create: 'Create',
        edit: 'Edit',
        delete: 'Delete',
        detail: 'Detail',
        more: 'More',
        role: 'Assign Roles',
        password: 'Reset Password',
        disableTfa: 'Disable TFA',
        passkey: 'Passkey'
      },
      message: {
        createSuccess: 'Created successfully',
        updateSuccess: 'Updated successfully',
        deleteSuccess: 'Deleted successfully',
        deleteConfirm: 'Are you sure you want to delete this user?',
        resetSuccess: 'Password reset successfully',
        roleSuccess: 'Roles updated successfully',
        disableTfaConfirm: 'Are you sure you want to disable this user’s 2FA?',
        disableTfaSuccess: '2FA disabled',
        passkeyDeleteConfirm: 'Delete this passkey for the user?',
        passkeyDeleteSuccess: 'Passkey deleted successfully',
        passkeyDeleteAllConfirm: 'Delete all passkeys for this user?',
        passkeyDeleteAllSuccess: 'All user passkeys deleted successfully'
      },
      validation: {
        accountRequired: 'Please enter account',
        identifierRequired: 'Email or phone is required',
        emailInvalid: 'Invalid email format',
        phoneInvalid: 'Invalid phone format',
        userNameRequired: 'Please enter username',
        statusRequired: 'Please select status',
        passwordRequired: 'Please enter password',
        newPasswordRequired: 'Please enter new password'
      }
    },
    role: {
      title: 'Role Management',
      search: {
        name: 'Role Name'
      },
      table: {
        name: 'Role Name',
        description: 'Description',
        createdAt: 'Created At',
        updatedAt: 'Updated At'
      },
      dialog: {
        create: 'Create Role',
        edit: 'Edit Role',
        permission: 'Assign Permissions',
        detail: 'Role Details'
      },
      form: {
        name: 'Role Name',
        description: 'Description'
      },
      action: {
        create: 'Create',
        edit: 'Edit',
        delete: 'Delete',
        permission: 'Assign Permissions',
        detail: 'Detail'
      },
      permissionPanel: {
        title: 'Permission Assignment Panel',
        subtitle: 'Filter by type, group, and keyword to assign permissions efficiently',
        typeApi: 'API Permissions',
        typeMenu: 'Menu Permissions',
        searchPlaceholder: 'Search by name / description / path',
        onlySelected: 'Only selected',
        selectCurrentType: 'Select Current Type',
        clearCurrentType: 'Clear Current Type',
        expandCurrentType: 'Expand Current Type',
        collapseCurrentType: 'Collapse Current Type',
        expandGroup: 'Expand',
        collapseGroup: 'Collapse',
        typeSelectedSummary: 'Selected in current type: {checked}/{total}',
        filteredSummary: 'Current view: {checked}/{total}',
        clearAll: 'Clear All',
        empty: 'No permissions match the current filter',
        selectedSummary: '{count} permissions selected',
        groupSummary: '{count} groups shown in current type'
      },
      message: {
        createSuccess: 'Created successfully',
        updateSuccess: 'Updated successfully',
        deleteSuccess: 'Deleted successfully',
        deleteConfirm: 'Are you sure you want to delete this role?',
        permissionSuccess: 'Permissions updated'
      },
      validation: {
        nameRequired: 'Please enter role name',
        nameFormat: 'Use letters/underscores; start with a letter.',
        descriptionRequired: 'Please enter description'
      }
    },
    permission: {
      title: 'Permission Management',
      typeMenu: 'Menu',
      typeButton: 'Button',
      typeApi: 'API',
      otherGroup: 'Other',
      search: {
        name: 'Permission Name',
        type: 'Type',
        group: 'Group',
        method: 'Method'
      },
      table: {
        name: 'Permission Name',
        description: 'Description',
        type: 'Type',
        method: 'Method',
        path: 'Path',
        group: 'Group',
        createdAt: 'Created At',
        updatedAt: 'Updated At'
      },
      dialog: {
        create: 'Create Permission',
        edit: 'Edit Permission',
        detail: 'Permission Details'
      },
      form: {
        route: 'Available Routes',
        routePlaceholder: 'Select a route to auto-fill',
        name: 'Permission Name',
        type: 'Type',
        method: 'HTTP Method',
        path: 'Path',
        group: 'Group',
        groupPlaceholder: 'Select or input a group',
        description: 'Description'
      },
      action: {
        create: 'Create',
        edit: 'Edit',
        delete: 'Delete',
        detail: 'Detail'
      },
      message: {
        deleteConfirm: 'Are you sure you want to delete this permission?',
        deleteSuccess: 'Deleted successfully',
        updateSuccess: 'Updated successfully',
        createSuccess: 'Created successfully',
        selectType: 'Please select permission type'
      },
      validation: {
        nameRequired: 'Please enter permission name',
        typeRequired: 'Please select permission type',
        methodRequired: 'Please select HTTP method',
        pathRequired: 'Please select available route',
        descriptionRequired: 'Please enter description',
        groupRequired: 'Please enter group'
      }
    },
    menu: {
      title: 'Menu Management',
      search: {
        name: 'Menu Name',
        path: 'Path',
        status: 'Status'
      },
      table: {
        name: 'Menu Name',
        path: 'Path',
        icon: 'Icon',
        sort: 'Sort',
        status: 'Status',
        hidden: 'Hidden',
        createdAt: 'Created At'
      },
      dialog: {
        create: 'Create Menu',
        edit: 'Edit Menu',
        createChild: 'Create Submenu',
        detail: 'Menu Details'
      },
      form: {
        name: 'Menu Name',
        path: 'Path',
        icon: 'Icon',
        sort: 'Sort',
        status: 'Status',
        hidden: 'Hidden',
        parent: 'Parent Menu',
        noParent: 'No Parent',
        permission: 'Permission ID',
        iconPlaceholder: 'Element Plus icon name',
        permissionPlaceholder: 'Select permission'
      },
      detail: {
        parentId: 'Parent ID',
        permissionId: 'Permission ID'
      },
      action: {
        create: 'Create Menu',
        createChild: 'Add Submenu',
        edit: 'Edit',
        delete: 'Delete',
        detail: 'Detail'
      },
      message: {
        deleteConfirm: 'Are you sure you want to delete this menu?',
        deleteSuccess: 'Deleted successfully',
        updateSuccess: 'Updated successfully',
        createSuccess: 'Created successfully'
      },
      validation: {
        nameRequired: 'Please enter menu name',
        pathRequired: 'Please enter path'
      }
    },
    operation: {
      title: 'Operation Logs',
      search: {
        userName: 'Username',
        id: 'Record ID',
        path: 'Path',
        userId: 'User ID',
        ip: 'IP',
        method: 'Method',
        status: 'Status'
      },
      table: {
        userName: 'User',
        method: 'Method',
        path: 'Path',
        status: 'Status',
        ip: 'IP',
        agent: 'User-Agent',
        latency: 'Latency',
        traceId: 'Trace ID',
        error: 'Error',
        time: 'Time'
      },
      action: {
        detail: 'Detail'
      },
      detail: {
        title: 'Log Details',
        recordId: 'Record ID',
        user: 'User',
        userId: 'User ID',
        ip: 'IP',
        method: 'Method',
        path: 'Path',
        status: 'Status',
        latency: 'Latency',
        time: 'Time',
        traceId: 'Trace ID',
        agent: 'User-Agent',
        error: 'Error Message',
        request: 'Request Data',
        response: 'Response Data',
        empty: 'No detail data'
      },
      message: {
        copyTraceIdSuccess: 'Trace ID copied',
        copyRequestSuccess: 'Request data copied',
        copyResponseSuccess: 'Response data copied',
        copyFailed: 'Copy failed'
      }
    }
  },
  validation: {
    required: 'This field is required'
  },
  request: {
    failed: 'Request failed',
    code11000: 'Identifier or password is required',
    code11001: 'Invalid identifier or password',
    code11002: 'User does not exist',
    code11007: 'Identifier format is invalid',
    code11014: 'Identifier is required',
    code11015: 'Password reset is required',
    code11028: 'Secondary verification is required',
    code11029: 'Verification code is invalid or expired',
    code11032: 'New password is required',
    code11033: 'Verification code or current password is required',
    code11034: 'Safe code is required',
    code11035: 'TOTP key is required',
    code11040: 'OAuth provider is not supported',
    code11041: 'OAuth state is invalid or expired',
    code11042: 'OAuth account binding is required',
    code11043: 'Identifier conflict',
    code11044: 'Bind ticket is invalid or expired',
    code11045: 'Bind ticket does not match this request',
    code11046: 'Re-authentication ticket is invalid or expired',
    code11047: 'OAuth identity is already bound to another account',
    code11048: 'OAuth account not found',
    code11049: 'At least one login method must be kept',
    code11050: 'The Passkey challenge has expired. Please try again.',
    code11051: 'The Passkey challenge does not match. Please retry.',
    code11052: 'Passkey does not exist',
    code11053: 'Passkey already exists',
    code11054: 'Passkey verification failed',
    code11055: 'Unable to register another Passkey',
    code11056: 'No Passkey sign-in credential is currently available in this environment',
    sessionExpired: 'Session expired, please log in again',
    relogin: 'Re-login',
    network: 'Network error',
    timeout: 'Request timeout',
    badRequest: 'Invalid request',
    unauthorized: 'Unauthorized, please log in',
    forbidden: 'Access denied',
    notFound: 'Resource not found',
    serverError: 'Server error'
  }
}
