export default {
  locale: 'zh-CN',
  app: {
    name: 'Admin'
  },
  common: {
    confirm: '确定',
    cancel: '取消',
    submit: '提交',
    reset: '重置',
    search: '搜索',
    add: '新增',
    edit: '编辑',
    delete: '删除',
    detail: '详情',
    save: '保存',
    close: '关闭',
    back: '返回',
    next: '下一步',
    actions: '操作',
    status: '状态',
    enabled: '启用',
    disabled: '禁用',
    enable: '启用',
    disable: '禁用',
    yes: '是',
    no: '否',
    copy: '复制',
    manage: '管理',
    placeholder: '请输入',
    selectPlaceholder: '请选择',
    loading: '加载中...',
    view: '查看'
  },
  route: {
    login: '登录',
    passwordReset: '重置密码',
    oauth: '第三方登录',
    profile: '个人中心',
    dashboard: '首页',
    system: '系统管理',
    user: '用户管理',
    role: '角色管理',
    permission: '权限管理',
    menu: '菜单管理',
    operation: '操作记录',
    notFound: '404'
  },
  navbar: {
    profile: '个人中心',
    logout: '退出登录',
    logoutConfirm: '确定要退出登录吗？',
    dialogTitle: '提示'
  },
  theme: {
    light: '浅色',
    dark: '深色',
    auto: '跟随系统',
    tooltip: '主题切换'
  },
  localeSwitch: {
    tooltip: '语言切换',
    en: 'English',
    zh: '简体中文'
  },
  login: {
    slogan: '构建高效、优雅的现代化管理后台',
    identifierPlaceholder: '邮箱/手机号',
    passwordPlaceholder: '密码',
    totpPlaceholder: '6位验证码',
    submit: '立即登录',
    submitTotp: '验证并登录',
    otherLogin: '其他方式登录',
    oauthFeishu: '飞书',
    oauthWechat: '微信',
    validation: {
      identifierRequired: '邮箱/手机号',
      passwordRequired: '请输入密码',
      codeRequired: '请输入验证码',
      codeInvalid: '请输入 6 位数字验证码'
    },
    error: {
      safeCodeMissing: '安全码缺失，请重新登录',
      failed: '登录失败',
      exception: '登录异常'
    }
  },
  reset: {
    title: '重置密码',
    tips: '请输入新密码完成重置',
    password: '新密码',
    confirmPassword: '确认新密码',
    backLogin: '返回登录',
    confirm: '确认重置',
    validation: {
      passwordRequired: '请输入新密码',
      confirmRequired: '请再次输入新密码',
      passwordMismatch: '两次输入的密码不一致'
    },
    error: {
      safeCodeMissing: '安全码缺失，请重新登录',
      failed: '重置失败'
    },
    success: '密码重置成功，请重新登录'
  },
  oauth: {
    loading: '正在登录中，请稍候...',
    missingParams: '缺少必要参数',
    success: '登录成功',
    failed: '登录失败',
    exception: '登录异常',
    accountNotBound: '第三方账号未绑定后台用户',
    bind: {
      title: '绑定第三方账号',
      identifier: '登录标识',
      identifierPlaceholder: '请输入邮箱或手机号',
      reauthTitle: '验证本地账号',
      reauthTip: '请输入本地账号密码；若该账号已开启 TFA，请一并填写验证码',
      totpTitle: '输入 TOTP 验证码',
      totpStepTip: '该本地账号已启用 TFA，请继续完成二次验证',
      password: '当前密码',
      totpCode: 'TOTP 验证码',
      totpOptional: 'TOTP 验证码（已启用 TFA 时必填）',
      profilePreview: '第三方资料预览',
      syncFields: '首次绑定时同步字段',
      syncEmpty: '当前无可同步字段',
      syncUserName: '同步用户名',
      syncAvatar: '同步头像',
      ticketMissing: '绑定票据缺失，请重新发起第三方登录',
      success: '绑定成功，正在登录',
      validation: {
        identifierRequired: '请输入登录标识',
        passwordRequired: '请输入当前密码',
        totpInvalid: '请输入 6 位 TOTP 验证码'
      },
      step1Title: '开始账号绑定',
      step1Desc: '请确认下面资料是您使用的第三方账号，然后选择需要同步的信息。',
      step2Title: '确认绑定账号',
      step2Desc: '请输入账号和密码以确认您要绑定的账号信息。',
      step3Title: '完成二次认证',
      step3Desc: '请输入 6 位验证码来完成绑定流程'
    }
  },
  error: {
    notFound: '抱歉，您访问的页面不存在',
    backHome: '返回首页'
  },
  dashboard: {
    welcome: '欢迎回来，{name}!',
    subtitle: '这是您的管理后台首页',
    userTotal: '用户总数',
    docs: '文档数量',
    notices: '消息通知',
    visits: '今日访问'
  },
  profile: {
    title: '个人中心',
    pageSubtitle: '统一管理个人资料、登录标识与高风险认证方式。',
    overviewTitle: '账户概览',
    overviewSubtitle: '当前账号的身份信息与安全摘要会集中展示在这里。',
    sectionProfile: '个人资料',
    sectionPassword: '修改密码',
    sectionAccount: '修改登录标识',
    sectionOAuth: '第三方账号',
    sectionPasskey: 'Passkey',
    sectionTfa: '双因素认证',
    enableTfa: '启用双因素认证',
    disableTfa: '关闭双因素认证',
    stepInfo: '信息确认',
    tfaStepInfo: '双因子信息',
    tfaStepCode: '输入验证码',
    stepVerify: '安全验证',
    enterCodeDesc: '请输入 2FA 验证码完成操作',
    enterOldPasswordDesc: '请输入旧密码完成验证',
    enterPasswordDesc: '请输入密码完成验证',
    roleAdmin: '管理员',
    securityTitle: '安全中心',
    securitySubtitle: '安全设置与双因素认证',
    securityStatusSafe: '安全',
    actionChange: '修改',
    editorSubtitle: '更新展示名称与头像地址，提交前会先做基础校验。',
    tfaSetupTitle: '绑定认证应用',
    tfaSetupDesc: '使用认证器应用扫描二维码，或手动录入下方密钥完成绑定。',
    scanTip: '使用 Google Authenticator 或类似应用扫描',
    tfaKeyTip: '若无法扫码，可在认证器应用中手动输入该密钥。',
    tfaCodeTitle: '输入 6 位验证码',
    tfaCodeDesc: '扫描完成后，请输入认证应用当前显示的动态验证码。',
    codePlaceholder: '000000',
    disableConfirm: '确定要关闭 2FA 吗？',
    verifyCodeLabel: '验证码',
    userName: '用户名',
    userNameHint: '避免使用 admin、root、super_admin 等保留前后缀。',
    avatarUrl: '头像 URL',
    avatarPreview: '头像预览',
    avatarTip: '仅展示 URL 对应的头像',
    avatarFallback: '用',
    account: '登录标识',
    totpCode: '验证码',
    password: '密码',
    oldPassword: '旧密码',
    newPassword: '新密码',
    confirmNewPassword: '确认新密码',
    newAccount: '新登录标识',
    newEmail: '新邮箱',
    newPhone: '新手机号',
    save: '保存',
    confirmChange: '确认修改',
    tfaEnabled: '已启用',
    tfaDisabled: '未启用',
    tfaKey: 'TOTP Key',
    qrCode: '二维码',
    getKey: '获取密钥',
    enable: '启用',
    disable: '关闭',
    copyKey: '复制',
    qrPlaceholder: '请先获取密钥',
    message: {
      profileUpdated: '资料已更新',
      updateSuccess: '更新成功',
      passwordUpdated: '密码修改成功',
      accountUpdated: '账号已更新',
      oauthUnbindSuccess: '第三方账号已解绑',
      getFailed: '获取失败',
      updateFailed: '更新失败',
      enableSuccess: '已启用双因素认证',
      enableFailed: '启用失败',
      disableSuccess: '已关闭双因素认证',
      disableFailed: '关闭失败',
      keyRequired: '请先获取密钥',
      keyEmpty: '暂无密钥可复制',
      keyCopied: '已复制密钥',
      copyFailed: '复制失败'
    },
    validation: {
      codeRequired: '请输入验证码',
      codeInvalid: '请输入 6 位数字验证码',
      passwordRequired: '请输入新密码',
      passwordConfirmRequired: '请再次输入新密码',
      passwordMismatch: '两次输入的密码不一致',
      oldPasswordRequired: '请输入旧密码',
      accountPasswordRequired: '请输入密码',
      accountRequired: '请输入新登录标识',
      userNameRequired: '请输入用户名',
      userNameReserved: '用户名包含系统保留前后缀，请更换后再试',
      identifierRequired: '邮箱或手机号至少填写一项',
      emailInvalid: '邮箱格式不正确',
      phoneInvalid: '手机号格式不正确'
    },
    setting: {
      passwordDesc: '密码变更后会立即使当前登录态失效，并要求重新登录。',
      accountDesc: '邮箱与手机号共同决定本地账号的可用登录标识，至少保留一项。',
      oauthDesc: '查看已绑定的第三方账号，并在高风险验证通过后解绑指定账号。',
      passkeyDesc: '管理已注册的 Passkey 设备，支持添加新设备或移除旧凭证。',
      tfaEnabledDesc: '当前账号已启用双因素认证，敏感操作会要求额外验证码。',
      tfaDisabledDesc: '建议开启双因素认证，降低密码泄露后直接登录的风险。'
    },
    reauth: {
      title: '安全验证',
      loading: '正在获取可用验证方式...',
      chooseMethod: '请选择验证方式',
      description: '敏感操作前需要先完成身份验证',
      passkeyTitle: '使用 Passkey 验证',
      passkeyDesc: '使用当前账号已绑定的 Passkey 完成验证',
      passwordTitle: '使用密码验证',
      passwordDesc: '请输入当前密码继续；若账号已开启 TFA，下一步还需要输入验证码',
      passwordPlaceholder: '当前密码',
      totpTitle: '输入 TOTP 验证码',
      totpDesc: '请输入 6 位验证码完成身份验证',
      passkeyBtn: '使用 Passkey 验证',
      passwordBtn: '验证密码',
      totpBtn: '验证并继续',
      switchToPasskey: '改用 Passkey',
      switchToPassword: '改用密码',
      unavailable: '当前没有可用的验证方式'
    },
    oauth: {
      title: '第三方账号管理',
      summary: '已绑定 {count} 个第三方账号',
      empty: '暂未绑定第三方账号',
      provider: '平台',
      tenant: '租户',
      boundAt: '绑定时间',
      lastLoginAt: '最近登录',
      unbind: '解绑',
      unbindConfirm: '确认解绑该第三方账号吗？解绑前会再次校验本地账号。',
      unbindConfirmTitle: '确认解绑账号',
      unbindConfirmDesc: '您确定要解绑 {provider} 账号 {account} 吗？',
      unbindWarning: '解绑后将无法使用该第三方账号登录',
      reauthTitle: '解绑前重认证',
      reauthPasswordTitle: '请输入密码验证您的身份',
      reauthTotpTitle: '输入 TOTP 验证码',
      reauthIdentifier: '登录标识',
      reauthPassword: '当前密码',
      reauthTotp: 'TOTP 验证码',
      reauthTip: '若本地账号已启用 TFA，请补充验证码',
      reauthTotpTip: '该本地账号已启用 TFA，请继续完成二次验证',
      providerFeishu: '飞书',
      providerWechat: '企业微信',
      unbindConfirmBtn: '确定解绑',
      verifyAccountTitle: '验证您的账号',
      verifyBtn: '验证',
      completeTotpTitle: '完成二次认证',
      completeUnbindBtn: '完成解绑'
    },
    passkey: {
      title: 'Passkey 管理',
      deleteConfirmTitle: '删除前重认证',
      deleteConfirmDesc: '您确定要删除 Passkey「{name}」吗？',
      deleteWarning: '删除后该设备将无法再用于当前账号登录',
      verifyAccountTitle: '验证您的账号',
      reauthPasswordTitle: '请输入密码验证您的身份',
      reauthTotpTip: '该本地账号已启用 TFA，请继续完成二次验证',
      deleteConfirmBtn: '继续删除',
      verifyBtn: '验证',
      completeTotpTitle: '完成二次认证',
      completeDeleteBtn: '确认删除'
    }
  },
  passkey: {
    startLogin: '使用 Passkey 登录',
    loginHint: '无需输入邮箱或手机号，可直接使用浏览器保存的 Passkey 登录',
    startRegister: '添加 Passkey',
    manage: '管理',
    unsupported: '当前浏览器或环境不支持 Passkey',
    unsupportedTip: 'Passkey 仅可在支持 WebAuthn 的安全环境中使用',
    displayName: '设备名称',
    displayNamePlaceholder: '例如：MacBook Pro / iPhone',
    registerHint: '设备名称选填，不填时由服务端自动生成',
    summary: '已绑定 {count} 个 Passkey',
    empty: '暂无 Passkey',
    transports: '传输方式',
    lastUsedAt: '最近使用',
    createdAt: '创建时间',
    aaguid: 'AAGUID',
    delete: '删除',
    deleteAll: '删除全部',
    deleteConfirm: '确认删除该 Passkey 吗？',
    notUsed: '未使用',
    registered: 'Passkey 添加成功',
    deleted: 'Passkey 已删除',
    cancelled: 'Passkey 操作已取消',
    invalidState: 'Passkey 状态无效，请确认设备或凭证状态',
    security: '当前页面环境不允许使用 Passkey',
    failed: 'Passkey 操作失败'
  },
  system: {
    user: {
      title: '用户管理',
      search: {
        email: '邮箱',
        phone: '手机号',
        userName: '用户名',
        status: '状态'
      },
      table: {
        email: '邮箱',
        phone: '手机号',
        userName: '用户名',
        status: '状态',
        avatar: '头像',
        tfa: '两步验证',
        passkeyCount: 'Passkey 数',
        createdAt: '创建时间'
      },
      dialog: {
        create: '新增用户',
        edit: '编辑用户',
        detail: '用户详情',
        role: '分配角色',
        resetPassword: '重置密码',
        passkey: 'Passkey 管理'
      },
      form: {
        email: '邮箱',
        phone: '手机号',
        userName: '用户名',
        password: '密码',
        passwordOptional: '留空则不修改',
        passwordRequiredHint: '创建用户时必须输入初始密码',
        status: '状态',
        avatar: '头像',
        newPassword: '新密码'
      },
      action: {
        create: '新增',
        edit: '编辑',
        delete: '删除',
        detail: '详情',
        more: '更多',
        role: '分配角色',
        password: '重置密码',
        disableTfa: '关闭TFA',
        passkey: 'Passkey'
      },
      message: {
        createSuccess: '创建成功',
        updateSuccess: '更新成功',
        deleteSuccess: '删除成功',
        deleteConfirm: '确定要删除该用户吗？',
        resetSuccess: '密码重置成功',
        roleSuccess: '角色分配成功',
        disableTfaConfirm: '确定要关闭该用户的双因子认证吗？',
        disableTfaSuccess: '已关闭双因子认证',
        passkeyDeleteConfirm: '确定要删除该用户的这个 Passkey 吗？',
        passkeyDeleteSuccess: 'Passkey 删除成功',
        passkeyDeleteAllConfirm: '确定要删除该用户的全部 Passkey 吗？',
        passkeyDeleteAllSuccess: '已删除该用户全部 Passkey'
      },
      validation: {
        accountRequired: '请输入账号',
        identifierRequired: '邮箱或手机号至少填写一项',
        emailInvalid: '邮箱格式不正确',
        phoneInvalid: '手机号格式不正确',
        userNameRequired: '请输入用户名',
        statusRequired: '请选择状态',
        passwordRequired: '请输入密码',
        newPasswordRequired: '请输入新密码'
      }
    },
    role: {
      title: '角色管理',
      search: {
        name: '角色名称'
      },
      table: {
        name: '角色名称',
        description: '描述',
        createdAt: '创建时间',
        updatedAt: '更新时间'
      },
      dialog: {
        create: '新增角色',
        edit: '编辑角色',
        permission: '分配权限',
        detail: '角色详情'
      },
      form: {
        name: '角色名称',
        description: '描述'
      },
      action: {
        create: '新增',
        edit: '编辑',
        delete: '删除',
        permission: '分配权限',
        detail: '详情'
      },
      permissionPanel: {
        title: '权限分配面板',
        subtitle: '支持按类型、分组和关键词快速筛选并批量授权',
        typeApi: 'API 权限',
        typeMenu: '菜单权限',
        searchPlaceholder: '搜索权限名称 / 描述 / 路径',
        onlySelected: '仅看已选',
        selectCurrentType: '全选当前类型',
        clearCurrentType: '清空当前类型',
        expandCurrentType: '展开当前类型',
        collapseCurrentType: '收起当前类型',
        expandGroup: '展开',
        collapseGroup: '收起',
        typeSelectedSummary: '当前类型已选 {checked}/{total}',
        filteredSummary: '当前视图 {checked}/{total}',
        clearAll: '清空全部',
        empty: '当前筛选条件下暂无权限',
        selectedSummary: '已选择 {count} 项权限',
        groupSummary: '当前类型展示 {count} 个分组'
      },
      message: {
        createSuccess: '创建成功',
        updateSuccess: '更新成功',
        deleteSuccess: '删除成功',
        deleteConfirm: '确定要删除该角色吗？',
        permissionSuccess: '权限更新成功'
      },
      validation: {
        nameRequired: '请输入角色名称',
        nameFormat: '角色名称仅支持字母或字母+下划线，且不能以下划线开头',
        descriptionRequired: '请输入描述'
      }
    },
    permission: {
      title: '权限管理',
      typeMenu: '菜单',
      typeButton: '按钮',
      typeApi: 'API',
      otherGroup: '其他',
      search: {
        name: '权限名称',
        type: '类型',
        group: '分组',
        method: '方法'
      },
      table: {
        name: '权限名称',
        description: '描述',
        type: '类型',
        method: '方法',
        path: '路径',
        group: '分组',
        createdAt: '创建时间',
        updatedAt: '更新时间'
      },
      dialog: {
        create: '新增权限',
        edit: '编辑权限',
        detail: '权限详情'
      },
      form: {
        route: '可用路由',
        routePlaceholder: '选择路由后自动填充',
        name: '权限名称',
        type: '类型',
        method: 'HTTP方法',
        path: '路径',
        group: '分组',
        groupPlaceholder: '选择或输入分组',
        description: '描述'
      },
      action: {
        create: '新增',
        edit: '编辑',
        delete: '删除',
        detail: '详情'
      },
      message: {
        deleteConfirm: '确定要删除该权限吗？',
        deleteSuccess: '删除成功',
        updateSuccess: '更新成功',
        createSuccess: '创建成功',
        selectType: '请选择权限类型'
      },
      validation: {
        nameRequired: '请输入权限名称',
        typeRequired: '请选择权限类型',
        methodRequired: '请选择HTTP方法',
        pathRequired: '请选择可用路由',
        descriptionRequired: '请输入描述',
        groupRequired: '请输入分组'
      }
    },
    menu: {
      title: '菜单管理',
      search: {
        name: '菜单名称',
        path: '路径',
        status: '状态'
      },
      table: {
        name: '菜单名称',
        path: '路径',
        icon: '图标',
        sort: '排序',
        status: '状态',
        hidden: '隐藏',
        createdAt: '创建时间'
      },
      dialog: {
        create: '新增菜单',
        edit: '编辑菜单',
        createChild: '新增子菜单',
        detail: '菜单详情'
      },
      form: {
        name: '菜单名称',
        path: '路径',
        icon: '图标',
        sort: '排序',
        status: '状态',
        hidden: '隐藏',
        parent: '上级菜单',
        noParent: '无父级',
        permission: '权限ID',
        iconPlaceholder: 'Element Plus 图标名称',
        permissionPlaceholder: '选择权限'
      },
      detail: {
        parentId: '父级ID',
        permissionId: '关联权限ID'
      },
      action: {
        create: '新增菜单',
        createChild: '添加子菜单',
        edit: '编辑',
        delete: '删除',
        detail: '详情'
      },
      message: {
        deleteConfirm: '确定要删除该菜单吗？',
        deleteSuccess: '删除成功',
        updateSuccess: '更新成功',
        createSuccess: '创建成功'
      },
      validation: {
        nameRequired: '请输入菜单名称',
        pathRequired: '请输入路径'
      }
    },
    operation: {
      title: '操作记录',
      search: {
        userName: '用户名',
        id: '记录ID',
        path: '请求路径',
        userId: '用户ID',
        ip: 'IP',
        method: '请求方法',
        status: '状态码'
      },
      table: {
        userName: '用户',
        method: '方法',
        path: '路径',
        status: '状态',
        ip: 'IP',
        agent: 'User-Agent',
        latency: '耗时',
        traceId: 'TraceID',
        error: '错误',
        time: '时间'
      },
      action: {
        detail: '详情'
      },
      detail: {
        title: '日志详情',
        recordId: '记录ID',
        user: '用户',
        userId: '用户ID',
        ip: 'IP',
        method: '方法',
        path: '路径',
        status: '状态',
        latency: '耗时',
        time: '时间',
        traceId: 'TraceID',
        agent: 'User-Agent',
        error: '错误信息',
        request: '请求数据',
        response: '响应数据',
        empty: '暂无详情数据'
      },
      message: {
        copyTraceIdSuccess: 'TraceID 已复制',
        copyRequestSuccess: '请求数据已复制',
        copyResponseSuccess: '响应数据已复制',
        copyFailed: '复制失败'
      }
    }
  },
  validation: {
    required: '此项为必填'
  },
  request: {
    failed: '请求失败',
    code11000: '登录标识或密码不能为空',
    code11001: '登录标识或密码错误',
    code11002: '用户不存在',
    code11007: '登录标识格式不正确',
    code11014: '登录标识不能为空',
    code11015: '需要重置密码',
    code11028: '需要二次验证',
    code11029: '验证码无效或已过期',
    code11032: '新密码不能为空',
    code11033: '请输入验证码或旧密码完成验证',
    code11034: '安全码不能为空',
    code11035: 'TOTP Key 不能为空',
    code11040: 'OAuth 类型不支持',
    code11041: 'OAuth 状态无效或已过期',
    code11042: '需要绑定第三方账号',
    code11043: '登录标识冲突',
    code11044: '绑定票据无效或已过期',
    code11045: '绑定票据与当前请求不匹配',
    code11046: '重认证票据无效或已过期',
    code11047: '第三方身份已绑定到其他账号',
    code11048: '第三方账号不存在',
    code11049: '当前账号至少需要保留一种登录方式',
    code11050: 'Passkey challenge 已失效，请重新发起操作',
    code11051: 'Passkey challenge 不匹配，请重试',
    code11052: 'Passkey 不存在',
    code11053: 'Passkey 已存在，请勿重复注册',
    code11054: 'Passkey 验证失败',
    code11055: '无法继续注册新的 Passkey',
    code11056: '当前环境暂无可用的 Passkey 登录凭证',
    sessionExpired: '登录已过期，请重新登录',
    relogin: '重新登录',
    network: '网络错误',
    timeout: '请求超时',
    badRequest: '请求参数错误',
    unauthorized: '未授权，请登录',
    forbidden: '拒绝访问',
    notFound: '请求资源不存在',
    serverError: '服务器内部错误'
  }
}
