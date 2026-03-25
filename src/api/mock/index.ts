import type { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse, AxiosHeaders } from 'axios'
import { mockLoginData, mockUserInfo, mockMenus, mockUserList, mockRoles, mockPermissions, mockMenuTree, mockRolePermissions, mockOAuthAccounts, mockPasskeysByUserId } from './data'
import { apiRoutePrefix, buildApiPath } from '../path'

const mockPasskeyChallenges = new Map<string, {
    action: 'login' | 'register' | 'reauth'
    user_id?: number
    display_name?: string
}>()
const issuedReauthTickets = new Set<string>()
const issuedReauthSafeCodes = new Set<string>()

const MOCK_PASSKEY_LIMIT = 10
const LEGACY_API_ROUTE_PREFIX = '/dudu-admin-api'

function encodeMockBase64Url(value: string) {
    return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function createChallengeId(prefix: string) {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function createMockTraceId() {
    return `mock-trace-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function getMockRpId() {
    if (typeof window === 'undefined' || !window.location.hostname) {
        return 'localhost'
    }

    return window.location.hostname
}

function normalizeMockUrl(url?: string) {
    const rawUrl = typeof url === 'string' ? url : ''
    if (!rawUrl.startsWith(apiRoutePrefix)) {
        return rawUrl
    }

    return `${LEGACY_API_ROUTE_PREFIX}${rawUrl.slice(apiRoutePrefix.length)}`
}

function getUserPasskeys(userId: number) {
    if (!mockPasskeysByUserId[userId]) {
        mockPasskeysByUserId[userId] = []
    }

    return mockPasskeysByUserId[userId]
}

function syncUserPasskeyCount(userId: number) {
    const count = getUserPasskeys(userId).length
    const user = mockUserList.find((item) => item.id === userId)

    if (user) {
        user.passkey_count = count
    }

    if (mockUserInfo.id === userId) {
        mockUserInfo.passkey_count = count
    }
}

function nextPasskeyId() {
    return Object.values(mockPasskeysByUserId)
        .flat()
        .reduce((maxId, item) => Math.max(maxId, item.id), 0) + 1
}

function stripPasskeyRecord<T extends { credential_id: string }>(passkey: T): Omit<T, 'credential_id'> {
    const rest = { ...passkey } as Omit<T, 'credential_id'> & { credential_id?: string }
    delete rest.credential_id
    return rest
}

function getMockUserHandle(userId: number) {
    return encodeMockBase64Url(`user-${userId}`)
}

function findPasskeyOwnerByCredential(credentialId?: string) {
    if (!credentialId) {
        return null
    }

    for (const [rawUserId, passkeys] of Object.entries(mockPasskeysByUserId)) {
        const userId = Number(rawUserId)
        const passkey = passkeys.find((item) => item.credential_id === credentialId)

        if (passkey) {
            return { userId, passkey }
        }
    }

    return null
}

function canDeletePasskeys(userId: number, nextCount: number) {
    const user = mockUserList.find((item) => item.id === userId)
    if (!user) {
        return false
    }

    const hasLocalIdentifier = !!user.email || !!user.phone
    const hasOAuth = userId === mockUserInfo.id && mockOAuthAccounts.length > 0

    return hasLocalIdentifier || hasOAuth || nextCount > 0
}

/**
 * Mock 适配器
 * 拦截 axios 请求并返回模拟数据
 */
export function useMockAdapter(service: AxiosInstance) {
    service.defaults.adapter = async (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => {
        const { url: requestUrl, method, data, params } = config;
        const url = normalizeMockUrl(requestUrl);

        // 模拟网络延迟
        await new Promise(resolve => setTimeout(resolve, 200));

        console.log(`[Mock] ${method?.toUpperCase()} ${requestUrl}`, params || '');

        // 创建响应的辅助函数
        const createResponse = (responseData: unknown, code = 0, msg = 'ok'): AxiosResponse => {
            return {
                data: {
                    code,
                    msg,
                    trace: {
                        id: createMockTraceId(),
                        desc: ''
                    },
                    data: responseData
                },
                status: 200,
                statusText: 'OK',
                headers: {} as AxiosHeaders,
                config,
                request: {}
            } as AxiosResponse;
        };

        const mockOAuthProfiles = {
            feishu: {
                user_name: '待绑定飞书用户',
                avatar: 'https://example.com/avatar/feishu-pending.png'
            },
            wechat: {
                user_name: '待绑定企业微信用户',
                avatar: 'https://example.com/avatar/wechat-pending.png'
            }
        } as const;

        const getBindTicket = (provider: 'feishu' | 'wechat') => `BIND_TICKET_${provider.toUpperCase()}`;

        const issueReauthTicket = () => {
            const ticket = createChallengeId('reauth-ticket');
            issuedReauthTickets.add(ticket);
            return ticket;
        };

        const hasReauthTicket = (ticket?: string) => !!ticket && issuedReauthTickets.has(ticket);

        const consumeReauthTicket = (ticket?: string) => {
            if (!ticket || !issuedReauthTickets.has(ticket)) {
                return false;
            }

            issuedReauthTickets.delete(ticket);
            return true;
        };

        const issueReauthSafeCode = () => {
            const safeCode = createChallengeId('safe-reauth');
            issuedReauthSafeCodes.add(safeCode);
            return safeCode;
        };

        const consumeReauthSafeCode = (safeCode?: string) => {
            if (!safeCode || !issuedReauthSafeCodes.has(safeCode)) {
                return false;
            }

            issuedReauthSafeCodes.delete(safeCode);
            return true;
        };

        // ========== 认证相关接口 ==========

        // 登录接口
        if (url === '/dudu-admin-api/internal/admin/auth/token' && method === 'post') {
            try {
                const body = typeof data === 'string' ? JSON.parse(data) : data;
                const grantType = body?.grant_type;
                console.log('[Mock] Login payload:', body);

                if (grantType === 'password') {
                    if (body?.identifier === 'tfa') {
                        return createResponse({ safe_code: 'SAFE_TFA_CODE' }, 11028, '需要二次验证');
                    }
                    if (body?.identifier === 'reset') {
                        return createResponse({ safe_code: 'SAFE_RESET_CODE' }, 11015, '需要重置密码');
                    }
                    if ((body?.identifier === 'admin@example.com' || body?.identifier === '+8613800000000') && (body?.credentials === '123456' || body?.credentials === 'e10adc3949ba59abbe56e057f20f883e')) {
                        console.log('[Mock] Login success');
                        return createResponse(mockLoginData);
                    }
                    console.log('[Mock] Login failed: invalid credentials');
                    return createResponse(null, 11001, '登录标识或密码错误');
                }

                if (grantType === 'totp') {
                    if (body?.identifier === 'SAFE_TFA_CODE' && body?.credentials === '123456') {
                        return createResponse(mockLoginData);
                    }
                    return createResponse(null, 11029, 'TOTP 验证码无效');
                }

                if (grantType === 'feishu' || grantType === 'wechat') {
                    const oauthGrantType = grantType as 'feishu' | 'wechat';
                    if (!body?.credentials || !body?.state) {
                        return createResponse(null, 11041, 'OAuth state 无效');
                    }
                    if (body?.credentials === 'need-bind') {
                        return createResponse({
                            bind_ticket: getBindTicket(oauthGrantType),
                            oauth_profile: mockOAuthProfiles[oauthGrantType],
                            syncable_fields: ['user_name', 'avatar']
                        }, 11042, '需要绑定第三方账号');
                    }
                    return createResponse(mockLoginData);
                }

                return createResponse(null, 11010, '授权类型无效');
            } catch (e) {
                console.error('[Mock] Login error:', e);
                return createResponse(null, 11001, '登录标识或密码错误');
            }
        }

        // 获取 Passkey 登录挑战
        if (url === '/dudu-admin-api/internal/admin/auth/passkey/login/options' && method === 'post') {
            const hasRegisteredPasskey = Object.values(mockPasskeysByUserId).some((items) => items.length > 0);
            if (!hasRegisteredPasskey) {
                return createResponse(null, 11056, '当前环境暂无可用的 Passkey 登录凭证');
            }

            const challengeId = createChallengeId('login');
            mockPasskeyChallenges.set(challengeId, {
                action: 'login'
            });

            return createResponse({
                challenge_id: challengeId,
                options: {
                    publicKey: {
                        challenge: encodeMockBase64Url(`${challengeId}:challenge`),
                        rpId: getMockRpId(),
                        timeout: 60000,
                        userVerification: 'preferred'
                    }
                }
            });
        }

        // 完成 Passkey 登录
        if (url === '/dudu-admin-api/internal/admin/auth/passkey/login/finish' && method === 'post') {
            const body = typeof data === 'string' ? JSON.parse(data) : data;
            const challenge = mockPasskeyChallenges.get(body?.challenge_id);

            if (!challenge || challenge.action !== 'login') {
                return createResponse(null, 11050, 'Passkey challenge 已失效');
            }

            mockPasskeyChallenges.delete(body.challenge_id);

            const credentialId = body?.credential?.id || body?.credential?.raw_id;
            const matchedPasskey = findPasskeyOwnerByCredential(credentialId);

            if (!matchedPasskey) {
                return createResponse(null, 11052, 'Passkey 不存在');
            }

            const userHandle = body?.credential?.response?.userHandle;
            if (userHandle && userHandle !== getMockUserHandle(matchedPasskey.userId)) {
                return createResponse(null, 11054, 'Passkey 验证失败');
            }

            matchedPasskey.passkey.last_used_at = new Date().toISOString();
            syncUserPasskeyCount(matchedPasskey.userId);
            return createResponse(mockLoginData);
        }

        // 用户信息接口
        if (url === '/dudu-admin-api/internal/admin/auth/profile' && method === 'get') {
            console.log('[Mock] Returning profile');
            return createResponse(mockUserInfo);
        }

        // 更新个人资料
        if (url === '/dudu-admin-api/internal/admin/auth/profile' && method === 'put') {
            const body = typeof data === 'string' ? JSON.parse(data) : data;
            if (body?.user_name !== undefined) {
                mockUserInfo.user_name = body.user_name;
            }
            if (body?.avatar !== undefined) {
                mockUserInfo.avatar = body.avatar;
            }
            return createResponse(null);
        }

        // 修改密码
        if (url === '/dudu-admin-api/internal/admin/auth/password' && method === 'put') {
            const body = typeof data === 'string' ? JSON.parse(data) : data;
            if (!hasReauthTicket(body?.reauth_ticket)) {
                return createResponse(null, 11046, '重认证票据无效');
            }
            if (!body?.password) {
                return createResponse(null, 11032, '新密码不能为空');
            }
            consumeReauthTicket(body.reauth_ticket);
            return createResponse(null);
        }

        // 重置密码
        if (url === '/dudu-admin-api/internal/admin/auth/password/reset' && method === 'put') {
            const body = typeof data === 'string' ? JSON.parse(data) : data;
            if (body?.safe_code !== 'SAFE_RESET_CODE') {
                return createResponse(null, 11030, '安全码无效');
            }
            return createResponse(null);
        }

        // 修改登录标识
        if (url === '/dudu-admin-api/internal/admin/auth/identifier' && method === 'put') {
            const body = typeof data === 'string' ? JSON.parse(data) : data;
            if (!hasReauthTicket(body?.reauth_ticket)) {
                return createResponse(null, 11046, '重认证票据无效');
            }
            if (!body?.email && !body?.phone) {
                return createResponse(null, 11014, '登录标识不能为空');
            }
            mockUserInfo.email = body.email || '';
            mockUserInfo.phone = body.phone || '';
            consumeReauthTicket(body.reauth_ticket);
            return createResponse(null);
        }

        // 查询敏感操作验证方式
        if (url === '/dudu-admin-api/internal/admin/auth/reauth/methods' && method === 'get') {
            const passkeyCount = getUserPasskeys(mockUserInfo.id).length;
            const availableMethods = ['password'];

            if (passkeyCount > 0) {
                availableMethods.unshift('passkey');
            }

            return createResponse({
                default_method: passkeyCount > 0 ? 'passkey' : 'password',
                available_methods: availableMethods,
                password_requires_totp: !!mockUserInfo.totp_enabled,
                totp_enabled: !!mockUserInfo.totp_enabled,
                passkey_count: passkeyCount
            });
        }

        // 密码验证敏感操作
        if (url === '/dudu-admin-api/internal/admin/auth/reauth/password' && method === 'post') {
            const body = typeof data === 'string' ? JSON.parse(data) : data;
            if (!body?.password) {
                return createResponse(null, 11033, '请输入验证码或旧密码完成验证');
            }
            if (body.password !== 'e10adc3949ba59abbe56e057f20f883e') {
                return createResponse(null, 11001, '登录标识或密码错误');
            }
            if (mockUserInfo.totp_enabled) {
                return createResponse({ safe_code: issueReauthSafeCode() }, 11028, '需要二次验证');
            }

            return createResponse({ reauth_ticket: issueReauthTicket() });
        }

        // TOTP 验证敏感操作
        if (url === '/dudu-admin-api/internal/admin/auth/reauth/totp' && method === 'post') {
            const body = typeof data === 'string' ? JSON.parse(data) : data;
            if (!consumeReauthSafeCode(body?.safe_code)) {
                return createResponse(null, 11030, '安全码无效');
            }
            if (body?.totp_code !== '123456') {
                return createResponse(null, 11029, 'TOTP 验证码无效');
            }

            return createResponse({ reauth_ticket: issueReauthTicket() });
        }

        // 获取 Passkey 敏感操作挑战
        if (url === '/dudu-admin-api/internal/admin/auth/reauth/passkey/options' && method === 'post') {
            const passkeys = getUserPasskeys(mockUserInfo.id);
            if (!passkeys.length) {
                return createResponse(null, 11056, '当前环境暂无可用的 Passkey 登录凭证');
            }

            const challengeId = createChallengeId('reauth');
            mockPasskeyChallenges.set(challengeId, {
                action: 'reauth',
                user_id: mockUserInfo.id
            });

            return createResponse({
                challenge_id: challengeId,
                options: {
                    publicKey: {
                        challenge: encodeMockBase64Url(`${challengeId}:challenge`),
                        rpId: getMockRpId(),
                        timeout: 60000,
                        userVerification: 'preferred',
                        allowCredentials: passkeys.map((item) => ({
                            type: 'public-key',
                            id: item.credential_id,
                            transports: item.transports || []
                        }))
                    }
                }
            });
        }

        // 完成 Passkey 敏感操作验证
        if (url === '/dudu-admin-api/internal/admin/auth/reauth/passkey/finish' && method === 'post') {
            const body = typeof data === 'string' ? JSON.parse(data) : data;
            const challenge = mockPasskeyChallenges.get(body?.challenge_id);

            if (!challenge || challenge.action !== 'reauth' || challenge.user_id !== mockUserInfo.id) {
                return createResponse(null, 11050, 'Passkey challenge 已失效');
            }

            mockPasskeyChallenges.delete(body.challenge_id);

            const credentialId = body?.credential?.id || body?.credential?.raw_id;
            const matchedPasskey = findPasskeyOwnerByCredential(credentialId);

            if (!matchedPasskey || matchedPasskey.userId !== mockUserInfo.id) {
                return createResponse(null, 11052, 'Passkey 不存在');
            }

            matchedPasskey.passkey.last_used_at = new Date().toISOString();
            syncUserPasskeyCount(matchedPasskey.userId);
            return createResponse({ reauth_ticket: issueReauthTicket() });
        }

        // 本地账号重认证
        if (url === '/dudu-admin-api/internal/admin/auth/reauth' && method === 'post') {
            const body = typeof data === 'string' ? JSON.parse(data) : data;
            if (body?.safe_code) {
                if (!consumeReauthSafeCode(body.safe_code)) {
                    return createResponse(null, 11030, '安全码无效');
                }
                if (body?.totp_code !== '123456') {
                    return createResponse(null, 11029, 'TOTP 验证码无效');
                }
                return createResponse({ reauth_ticket: issueReauthTicket() });
            }

            if (!body?.identifier) {
                return createResponse(null, 11014, '登录标识不能为空');
            }
            if (!body?.password) {
                return createResponse(null, 11033, '请输入验证码或旧密码完成验证');
            }
            if (body.identifier !== mockUserInfo.email && body.identifier !== mockUserInfo.phone) {
                return createResponse(null, 11001, '登录标识或密码错误');
            }
            if (body.password !== 'e10adc3949ba59abbe56e057f20f883e') {
                return createResponse(null, 11001, '登录标识或密码错误');
            }
            if (mockUserInfo.totp_enabled) {
                return createResponse({ safe_code: issueReauthSafeCode() }, 11028, '需要二次验证');
            }

            return createResponse({ reauth_ticket: issueReauthTicket() });
        }

        // OAuth 绑定确认
        if (url === '/dudu-admin-api/internal/admin/auth/oauth/bind/confirm' && method === 'post') {
            const body = typeof data === 'string' ? JSON.parse(data) : data;
            if (!body?.bind_ticket) {
                return createResponse(null, 11044, '绑定票据无效');
            }
            if (!hasReauthTicket(body?.reauth_ticket)) {
                return createResponse(null, 11046, '重认证票据无效');
            }

            const provider = body.bind_ticket === getBindTicket('feishu')
                ? 'feishu'
                : body.bind_ticket === getBindTicket('wechat')
                    ? 'wechat'
                    : '';

            if (!provider) {
                return createResponse(null, 11044, '绑定票据无效');
            }

            if (mockOAuthAccounts.some((account) => account.provider === provider)) {
                return createResponse(null, 11047, '第三方身份已绑定');
            }

            const oauthProfile = mockOAuthProfiles[provider as 'feishu' | 'wechat'];
            if (Array.isArray(body?.sync_fields)) {
                if (body.sync_fields.includes('user_name') && oauthProfile.user_name) {
                    mockUserInfo.user_name = oauthProfile.user_name;
                }
                if (body.sync_fields.includes('avatar') && oauthProfile.avatar) {
                    mockUserInfo.avatar = oauthProfile.avatar;
                }
            }

            const identityId = Math.max(...mockOAuthAccounts.map((item) => item.id), 0) + 1;
            mockOAuthAccounts.push({
                id: identityId,
                provider,
                provider_tenant: provider === 'feishu' ? 'tenant-new' : 'corp-new',
                display_name: oauthProfile.user_name,
                avatar_url: oauthProfile.avatar,
                bound_at: new Date().toISOString(),
                last_login_at: ''
            });

            const currentUser = mockUserList.find((item) => item.id === mockUserInfo.id);
            if (currentUser) {
                currentUser.user_name = mockUserInfo.user_name;
                currentUser.avatar = mockUserInfo.avatar;
            }

            consumeReauthTicket(body.reauth_ticket);
            return createResponse({
                token: mockLoginData.token,
                expires_in: mockLoginData.expires_in
            });
        }

        // 已绑定第三方账号
        if (url === '/dudu-admin-api/internal/admin/auth/oauth/accounts' && method === 'get') {
            return createResponse({ list: mockOAuthAccounts });
        }

        // 解绑第三方账号
        if (url === '/dudu-admin-api/internal/admin/auth/oauth/unbind' && method === 'post') {
            const body = typeof data === 'string' ? JSON.parse(data) : data;
            if (!hasReauthTicket(body?.reauth_ticket)) {
                return createResponse(null, 11046, '重认证票据无效');
            }

            const index = mockOAuthAccounts.findIndex((account) => account.id === body?.identity_id);
            if (index < 0) {
                return createResponse(null, 11048, '第三方账号不存在');
            }

            if (mockOAuthAccounts.length <= 1 && !mockUserInfo.email && !mockUserInfo.phone) {
                return createResponse(null, 11049, '至少保留一种登录方式');
            }

            mockOAuthAccounts.splice(index, 1);
            consumeReauthTicket(body.reauth_ticket);
            return createResponse(null);
        }

        // 获取 Passkey 注册挑战
        if (url === '/dudu-admin-api/internal/admin/auth/passkey/register/options' && method === 'post') {
            const body = typeof data === 'string' ? JSON.parse(data) : data;
            if (!hasReauthTicket(body?.reauth_ticket)) {
                return createResponse(null, 11046, '重认证票据无效');
            }
            const passkeys = getUserPasskeys(mockUserInfo.id);

            if (passkeys.length >= MOCK_PASSKEY_LIMIT) {
                return createResponse(null, 11055, '无法继续注册新的 Passkey');
            }

            const challengeId = createChallengeId('register');
            mockPasskeyChallenges.set(challengeId, {
                action: 'register',
                user_id: mockUserInfo.id,
                display_name: String(body?.display_name || '').trim()
            });

            consumeReauthTicket(body.reauth_ticket);

            return createResponse({
                challenge_id: challengeId,
                options: {
                    publicKey: {
                        challenge: encodeMockBase64Url(`${challengeId}:challenge`),
                        rp: {
                            id: getMockRpId(),
                            name: 'Dudu Admin Mock'
                        },
                        user: {
                            id: encodeMockBase64Url(`user-${mockUserInfo.id}`),
                            name: mockUserInfo.email || mockUserInfo.phone || `user-${mockUserInfo.id}`,
                            displayName: mockUserInfo.user_name
                        },
                        pubKeyCredParams: [
                            { type: 'public-key', alg: -7 },
                            { type: 'public-key', alg: -257 }
                        ],
                        timeout: 60000,
                        attestation: 'none',
                        authenticatorSelection: {
                            userVerification: 'preferred',
                            residentKey: 'required',
                            requireResidentKey: true
                        },
                        excludeCredentials: passkeys.map((item) => ({
                            type: 'public-key',
                            id: item.credential_id,
                            transports: item.transports || []
                        }))
                    }
                }
            });
        }

        // 完成 Passkey 注册
        if (url === '/dudu-admin-api/internal/admin/auth/passkey/register/finish' && method === 'post') {
            const body = typeof data === 'string' ? JSON.parse(data) : data;
            const challenge = mockPasskeyChallenges.get(body?.challenge_id);

            if (!challenge || challenge.action !== 'register' || !challenge.user_id) {
                return createResponse(null, 11050, 'Passkey challenge 已失效');
            }

            mockPasskeyChallenges.delete(body.challenge_id);

            const passkeys = getUserPasskeys(challenge.user_id);
            const credentialId = body?.credential?.id || body?.credential?.raw_id;

            if (!credentialId) {
                return createResponse(null, 11054, 'Passkey 验证失败');
            }

            if (passkeys.some((item) => item.credential_id === credentialId)) {
                return createResponse(null, 11053, 'Passkey 已存在');
            }

            if (passkeys.length >= MOCK_PASSKEY_LIMIT) {
                return createResponse(null, 11055, '无法继续注册新的 Passkey');
            }

            const newPasskey = {
                id: nextPasskeyId(),
                credential_id: credentialId,
                display_name: challenge.display_name || `${mockUserInfo.user_name} Passkey`,
                aaguid: '',
                transports: Array.isArray(body?.credential?.response?.transports)
                    ? body.credential.response.transports
                    : ['internal'],
                last_used_at: null,
                created_at: new Date().toISOString()
            };

            passkeys.unshift(newPasskey);
            syncUserPasskeyCount(challenge.user_id);
            return createResponse(stripPasskeyRecord(newPasskey));
        }

        // 获取当前用户 Passkey
        if (url === '/dudu-admin-api/internal/admin/auth/passkeys' && method === 'get') {
            return createResponse({
                list: getUserPasskeys(mockUserInfo.id).map((item) => stripPasskeyRecord(item))
            });
        }

        // 删除当前用户 Passkey
        if (url === '/dudu-admin-api/internal/admin/auth/passkey' && method === 'delete') {
            const body = typeof data === 'string' ? JSON.parse(data) : data;

            if (!hasReauthTicket(body?.reauth_ticket)) {
                return createResponse(null, 11046, '重认证票据无效');
            }

            const passkeys = getUserPasskeys(mockUserInfo.id);
            const index = passkeys.findIndex((item) => item.id === body?.id);

            if (index < 0) {
                return createResponse(null, 11052, 'Passkey 不存在');
            }

            if (!canDeletePasskeys(mockUserInfo.id, passkeys.length - 1)) {
                return createResponse(null, 11049, '至少保留一种登录方式');
            }

            passkeys.splice(index, 1);
            syncUserPasskeyCount(mockUserInfo.id);
            consumeReauthTicket(body.reauth_ticket);
            return createResponse(null);
        }

        // 获取 TOTP Key
        if (url === '/dudu-admin-api/internal/admin/auth/tfa/key' && method === 'get') {
            return createResponse({ totp_key: 'MOCK_TOTP_KEY', qr_code: '' });
        }

        // 启用 TFA
        if (url === '/dudu-admin-api/internal/admin/auth/tfa/enable' && method === 'put') {
            const body = typeof data === 'string' ? JSON.parse(data) : data;
            if (!hasReauthTicket(body?.reauth_ticket)) {
                return createResponse(null, 11046, '重认证票据无效');
            }
            if (!body?.totp_key) {
                return createResponse(null, 11035, 'TOTP Key 不能为空');
            }
            if (body?.totp_code !== '123456') {
                return createResponse(null, 11029, 'TOTP 验证码无效');
            }
            mockUserInfo.totp_enabled = true;
            consumeReauthTicket(body.reauth_ticket);
            return createResponse(null);
        }

        // 关闭 TFA
        if (url === '/dudu-admin-api/internal/admin/auth/tfa/disable' && method === 'put') {
            const body = typeof data === 'string' ? JSON.parse(data) : data;
            if (!hasReauthTicket(body?.reauth_ticket)) {
                return createResponse(null, 11046, '重认证票据无效');
            }
            mockUserInfo.totp_enabled = false;
            consumeReauthTicket(body.reauth_ticket);
            return createResponse(null);
        }

        // 获取 TFA 状态
        if (url === '/dudu-admin-api/internal/admin/auth/tfa/status' && method === 'get') {
            return createResponse({ enable: !!mockUserInfo.totp_enabled });
        }

        // 获取 OAuth 登录地址
        if (url === '/dudu-admin-api/internal/admin/auth/oauth/url' && method === 'get') {
            const type = params?.type;
            if (!type) {
                return createResponse(null, 11040, 'OAuth 类型不支持');
            }
            return createResponse({
                url: `https://example.com/oauth?type=${type}&state=mock`
            });
        }

        // 菜单接口
        if (url === '/dudu-admin-api/internal/admin/auth/menus' && method === 'get') {
            console.log('[Mock] Returning menus:', JSON.stringify(mockMenus));
            return createResponse(mockMenus);
        }

        // 退出登录接口
        if (url === '/dudu-admin-api/internal/admin/auth/token' && method === 'delete') {
            console.log('[Mock] Logout');
            return createResponse(null);
        }

        // ========== 用户管理接口 ==========

        // 用户列表接口
        if (url === '/dudu-admin-api/internal/admin/system/user/paginate' && method === 'get') {
            console.log('[Mock] Returning user list');
            const userName = params?.user_name?.toLowerCase() || '';
            const email = params?.email?.toLowerCase() || '';
            const phone = params?.phone?.toLowerCase() || '';
            let filteredList = mockUserList;
            if (userName) {
                filteredList = mockUserList.filter(u =>
                    u.user_name.toLowerCase().includes(userName)
                );
            }
            if (email) {
                filteredList = filteredList.filter(u =>
                    String(u.email || '').toLowerCase().includes(email)
                );
            }
            if (phone) {
                filteredList = filteredList.filter(u =>
                    String(u.phone || '').toLowerCase().includes(phone)
                );
            }
            return createResponse({
                list: filteredList,
                total: filteredList.length,
                page: params?.page || 1,
                page_size: params?.page_size || 10
            });
        }

        // 用户详情
        if (url === '/dudu-admin-api/internal/admin/system/user' && method === 'get') {
            const user = mockUserList.find((item) => item.id === params?.id);
            if (!user) {
                return createResponse(null, 11002, '用户不存在');
            }
            return createResponse(user);
        }

        // 创建用户
        if (url === '/dudu-admin-api/internal/admin/system/user' && method === 'post') {
            console.log('[Mock] Creating user');
            const body = typeof data === 'string' ? JSON.parse(data) : data;
            if (!body?.email && !body?.phone) {
                return createResponse(null, 11014, '登录标识不能为空');
            }

            const duplicate = mockUserList.find((user) =>
                (body.email && user.email === body.email) || (body.phone && user.phone === body.phone)
            );
            if (duplicate) {
                return createResponse(null, 11013, '登录标识已存在');
            }
            if (!body?.password) {
                return createResponse(null, 11032, '密码不能为空');
            }

            const newUser = {
                id: mockUserList.length + 1,
                user_name: body.user_name,
                email: body.email || '',
                phone: body.phone || '',
                avatar: body.avatar || '',
                status: body.status ?? 1,
                created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
                totp_enabled: false,
                passkey_count: 0,
                access: []
            };
            mockUserList.push(newUser);
            mockPasskeysByUserId[newUser.id] = [];
            return createResponse(newUser);
        }

        // 更新用户
        if (url === '/dudu-admin-api/internal/admin/system/user' && method === 'put') {
            console.log('[Mock] Updating user');
            const body = typeof data === 'string' ? JSON.parse(data) : data;
            if (!body?.email && !body?.phone) {
                return createResponse(null, 11014, '登录标识不能为空');
            }

            const duplicate = mockUserList.find((target) =>
                target.id !== body.id && ((body.email && target.email === body.email) || (body.phone && target.phone === body.phone))
            );
            if (duplicate) {
                return createResponse(null, 11013, '登录标识已存在');
            }

            const user = mockUserList.find(u => u.id === body.id);
            if (user) {
                user.user_name = body.user_name ?? user.user_name;
                user.email = body.email ?? user.email;
                user.phone = body.phone ?? user.phone;
                user.status = body.status ?? user.status;
                user.avatar = body.avatar ?? user.avatar;
                return createResponse(user);
            }
            return createResponse(null, 11002, '用户不存在');
        }

        // 删除用户
        if (url === '/dudu-admin-api/internal/admin/system/user' && method === 'delete') {
            console.log('[Mock] Deleting user');
            const id = params?.id;
            const index = mockUserList.findIndex(u => u.id === id);
            if (index > -1) {
                mockUserList.splice(index, 1);
                delete mockPasskeysByUserId[id];
                return createResponse(null);
            }
            return createResponse(null, 404, '用户不存在');
        }

        // 获取用户角色
        if (url === '/dudu-admin-api/internal/admin/system/user/role' && method === 'get') {
            console.log('[Mock] Returning user roles');
            const userId = params?.user_id || 1;
            // 返回角色 ID 数组
            const roleIds = userId === 1 ? [1] : [2];
            return createResponse(roleIds);
        }

        // 设置用户角色
        if (url === '/dudu-admin-api/internal/admin/system/user/role' && method === 'put') {
            console.log('[Mock] Setting user roles');
            return createResponse(null);
        }

        // 管理员重置用户密码
        if (url === '/dudu-admin-api/internal/admin/system/user/password/reset' && method === 'put') {
            console.log('[Mock] Resetting user password');
            return createResponse(null);
        }

        // 管理员关闭用户 TFA
        if (url === '/dudu-admin-api/internal/admin/system/user/tfa/disable' && method === 'put') {
            console.log('[Mock] Disabling user TFA');
            const body = typeof data === 'string' ? JSON.parse(data) : data;
            const user = mockUserList.find(u => u.id === body?.user_id);
            if (user) {
                user.totp_enabled = false;
            }
            return createResponse(null);
        }

        // 获取用户 Passkey
        if (url === '/dudu-admin-api/internal/admin/system/user/passkeys' && method === 'get') {
            const userId = Number(params?.user_id || 0);
            const user = mockUserList.find((item) => item.id === userId);

            if (!user) {
                return createResponse(null, 11002, '用户不存在');
            }

            return createResponse({
                list: getUserPasskeys(userId).map((item) => stripPasskeyRecord(item))
            });
        }

        // 删除单个用户 Passkey
        if (url === '/dudu-admin-api/internal/admin/system/user/passkey' && method === 'delete') {
            const body = typeof data === 'string' ? JSON.parse(data) : data;
            const userId = Number(body?.user_id || 0);
            const user = mockUserList.find((item) => item.id === userId);

            if (!user) {
                return createResponse(null, 11002, '用户不存在');
            }

            const passkeys = getUserPasskeys(userId);
            const index = passkeys.findIndex((item) => item.id === body?.id);

            if (index < 0) {
                return createResponse(null, 11052, 'Passkey 不存在');
            }

            if (!canDeletePasskeys(userId, passkeys.length - 1)) {
                return createResponse(null, 11049, '至少保留一种登录方式');
            }

            passkeys.splice(index, 1);
            syncUserPasskeyCount(userId);
            return createResponse(null);
        }

        // 删除用户全部 Passkey
        if (url === '/dudu-admin-api/internal/admin/system/user/passkeys' && method === 'delete') {
            const body = typeof data === 'string' ? JSON.parse(data) : data;
            const userId = Number(body?.user_id || 0);
            const user = mockUserList.find((item) => item.id === userId);

            if (!user) {
                return createResponse(null, 11002, '用户不存在');
            }

            const passkeys = getUserPasskeys(userId);
            if (!passkeys.length) {
                return createResponse(null);
            }

            if (!canDeletePasskeys(userId, 0)) {
                return createResponse(null, 11049, '至少保留一种登录方式');
            }

            mockPasskeysByUserId[userId] = [];
            syncUserPasskeyCount(userId);
            return createResponse(null);
        }

        // ========== 角色管理接口 ==========

        // 角色分页列表
        if (url === '/dudu-admin-api/internal/admin/system/role/paginate' && method === 'get') {
            console.log('[Mock] Returning role list');
            const name = params?.name?.toLowerCase() || '';
            let filteredList = mockRoles;
            if (name) {
                filteredList = mockRoles.filter(r =>
                    r.name.toLowerCase().includes(name) ||
                    r.description?.toLowerCase().includes(name)
                );
            }
            return createResponse({
                list: filteredList,
                total: filteredList.length,
                page: params?.page || 1,
                page_size: params?.page_size || 10
            });
        }

        // 获取所有角色（不分页）
        if (url === '/dudu-admin-api/internal/admin/system/role/list' && method === 'get') {
            console.log('[Mock] Returning all roles');
            return createResponse(mockRoles);
        }

        // 创建角色
        if (url === '/dudu-admin-api/internal/admin/system/role' && method === 'post') {
            console.log('[Mock] Creating role');
            const body = typeof data === 'string' ? JSON.parse(data) : data;
            const newRole = {
                ID: mockRoles.length + 1,
                name: body.name,
                description: body.description || '',
                CreatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
            };
            mockRoles.push(newRole);
            return createResponse(newRole);
        }

        // 更新角色
        if (url === '/dudu-admin-api/internal/admin/system/role' && method === 'put') {
            console.log('[Mock] Updating role');
            const body = typeof data === 'string' ? JSON.parse(data) : data;
            const role = mockRoles.find(r => r.ID === body.id);
            if (role) {
                if (body.name) role.name = body.name;
                if (body.description !== undefined) role.description = body.description;
                return createResponse(role);
            }
            return createResponse(null, 404, '角色不存在');
        }

        // 删除角色
        if (url === '/dudu-admin-api/internal/admin/system/role' && method === 'delete') {
            console.log('[Mock] Deleting role');
            const id = params?.id;
            const index = mockRoles.findIndex(r => r.ID === id);
            if (index > -1) {
                mockRoles.splice(index, 1);
                return createResponse(null);
            }
            return createResponse(null, 404, '角色不存在');
        }

        // 获取角色权限
        if (url === '/dudu-admin-api/internal/admin/system/role/permission' && method === 'get') {
            console.log('[Mock] Returning role permissions');
            const roleId = params?.role_id || 1;
            const permissionIds = mockRolePermissions[roleId] || [];
            return createResponse(permissionIds);
        }

        // 设置角色权限
        if (url === '/dudu-admin-api/internal/admin/system/role/permission' && method === 'put') {
            console.log('[Mock] Setting role permissions');
            const body = typeof data === 'string' ? JSON.parse(data) : data;
            mockRolePermissions[body.role_id] = body.permission_ids || [];
            return createResponse(null);
        }

        // ========== 权限管理接口 ==========

        // 权限分页列表
        if (url === '/dudu-admin-api/internal/admin/system/permission/paginate' && method === 'get') {
            console.log('[Mock] Returning permission list');
            const name = params?.name?.toLowerCase() || '';
            const type = params?.type || '';
            const group = params?.group || '';

            let filteredList = mockPermissions;
            if (name) {
                filteredList = filteredList.filter(p =>
                    p.name.toLowerCase().includes(name) ||
                    p.description?.toLowerCase().includes(name)
                );
            }
            if (type) {
                filteredList = filteredList.filter(p => p.type === type);
            }
            if (group) {
                filteredList = filteredList.filter(p => p.group === group);
            }

            return createResponse({
                list: filteredList,
                total: filteredList.length,
                page: params?.page || 1,
                page_size: params?.page_size || 10
            });
        }

        // 获取所有权限（按分组）
        if (url === '/dudu-admin-api/internal/admin/system/permission/list' && method === 'get') {
            console.log('[Mock] Returning grouped permissions');
            const type = params?.type;
            const list = type ? mockPermissions.filter(p => p.type === type) : mockPermissions;
            const grouped = list.reduce((acc: Record<string, typeof mockPermissions>, item) => {
                const group = item.group || '默认分组';
                if (!acc[group]) acc[group] = [];
                acc[group].push(item);
                return acc;
            }, {} as Record<string, typeof mockPermissions>);
            return createResponse(grouped);
        }

        // 获取可用权限列表（系统已注册路由）
        if (url === '/dudu-admin-api/internal/admin/system/permission/available' && method === 'get') {
            console.log('[Mock] Returning available permissions');
            // 契约锁定：data 必须是按 HTTP Method 分组的对象结构。
            // 开发期前后端统一该结构，不接受 [{ method, path }] 数组格式。
            const routes = {
                GET: [
                    buildApiPath('/internal/admin/system/user'),
                    buildApiPath('/internal/admin/system/role')
                ],
                POST: [
                    buildApiPath('/internal/admin/system/user'),
                    buildApiPath('/internal/admin/system/role')
                ],
                PUT: [
                    buildApiPath('/internal/admin/system/user'),
                    buildApiPath('/internal/admin/system/role')
                ],
                DELETE: [
                    buildApiPath('/internal/admin/system/user'),
                    buildApiPath('/internal/admin/system/role')
                ]
            };
            return createResponse(routes);
        }

        // 创建权限
        if (url === '/dudu-admin-api/internal/admin/system/permission' && method === 'post') {
            console.log('[Mock] Creating permission');
            const body = typeof data === 'string' ? JSON.parse(data) : data;
            const maxId = Math.max(...mockPermissions.map(p => p.ID ?? 0), 0);
            const newPermission = {
                ID: maxId + 1,
                name: body.name,
                description: body.description || '',
                type: body.type,
                group: body.group || ''
            };
            mockPermissions.push(newPermission);
            return createResponse(newPermission);
        }

        // 更新权限
        if (url === '/dudu-admin-api/internal/admin/system/permission' && method === 'put') {
            console.log('[Mock] Updating permission');
            const body = typeof data === 'string' ? JSON.parse(data) : data;
            const permission = mockPermissions.find(p => p.ID === body.id);
            if (permission) {
                if (body.name) permission.name = body.name;
                if (body.description !== undefined) permission.description = body.description;
                if (body.type) permission.type = body.type;
                if (body.group !== undefined) permission.group = body.group;
                return createResponse(permission);
            }
            return createResponse(null, 404, '权限不存在');
        }

        // 删除权限
        if (url === '/dudu-admin-api/internal/admin/system/permission' && method === 'delete') {
            console.log('[Mock] Deleting permission');
            const id = params?.id;
            const index = mockPermissions.findIndex(p => p.ID === id);
            if (index > -1) {
                mockPermissions.splice(index, 1);
                return createResponse(null);
            }
            return createResponse(null, 404, '权限不存在');
        }

        // ========== 菜单管理接口 ==========

        // 获取菜单树
        if (url === '/dudu-admin-api/internal/admin/system/menu/list' && method === 'get') {
            console.log('[Mock] Returning menu tree');
            return createResponse({ items: mockMenuTree });
        }

        // 创建菜单
        if (url === '/dudu-admin-api/internal/admin/system/menu' && method === 'post') {
            console.log('[Mock] Creating menu');
            const body = typeof data === 'string' ? JSON.parse(data) : data;
            // 简化处理：直接返回成功
            const newMenu = {
                ID: Date.now(),
                parent_id: body.parent_id || 0,
                name: body.name,
                path: body.path,
                icon: body.icon || '',
                sort: body.sort || 0,
                permission_id: Date.now()
            };
            return createResponse(newMenu);
        }

        // 更新菜单
        if (url === '/dudu-admin-api/internal/admin/system/menu' && method === 'put') {
            console.log('[Mock] Updating menu');
            const body = typeof data === 'string' ? JSON.parse(data) : data;
            return createResponse({ ...body });
        }

        // 删除菜单
        if (url === '/dudu-admin-api/internal/admin/system/menu' && method === 'delete') {
            console.log('[Mock] Deleting menu');
            return createResponse(null);
        }

        // ========== 操作记录接口 ==========

        // 操作记录列表
        if (url === '/dudu-admin-api/internal/admin/system/record/paginate' && method === 'get') {
            console.log('[Mock] Returning operation list');
            const mockOperations = [
                {
                    id: 1,
                    user_id: 1,
                    user_name: 'Admin User',
                    method: 'GET',
                    path: buildApiPath('/internal/admin/auth/profile'),
                    status: 200,
                    ip: '127.0.0.1',
                    location: '本地',
                    duration: 15,
                    created_at: '2026-01-27 10:00:00',
                    user_agent: 'Mozilla/5.0'
                },
                {
                    id: 2,
                    user_id: 1,
                    user_name: 'Admin User',
                    method: 'POST',
                    path: buildApiPath('/internal/admin/auth/token'),
                    status: 200,
                    ip: '127.0.0.1',
                    location: '本地',
                    duration: 32,
                    created_at: '2026-01-27 09:58:00',
                    user_agent: 'Mozilla/5.0'
                },
                {
                    id: 3,
                    user_id: 1,
                    user_name: 'Admin User',
                    method: 'PUT',
                    path: buildApiPath('/internal/admin/system/user'),
                    status: 200,
                    ip: '192.168.1.100',
                    location: '内网',
                    duration: 45,
                    created_at: '2026-01-27 09:30:00',
                    user_agent: 'Mozilla/5.0'
                },
                {
                    id: 4,
                    user_id: 2,
                    user_name: 'Test User',
                    method: 'DELETE',
                    path: buildApiPath('/internal/admin/system/role'),
                    status: 403,
                    ip: '10.0.0.1',
                    location: '内网',
                    duration: 8,
                    created_at: '2026-01-26 16:00:00',
                    user_agent: 'Mozilla/5.0'
                }
            ];
            // 契约锁定：分页返回 data.items + data.total + data.page + data.size。
            // 开发期前后端统一该结构，不再使用 list/page_size。
            return createResponse({
                items: mockOperations,
                total: mockOperations.length,
                page: 1,
                size: 10
            });
        }

        // 操作记录详情
        if (url === '/dudu-admin-api/internal/admin/system/record/detail' && method === 'get') {
            console.log('[Mock] Returning operation detail');
            return createResponse({
                id: 1,
                user_id: 1,
                user_name: 'Admin User',
                method: 'POST',
                path: buildApiPath('/internal/admin/system/user'),
                status: 0,
                ip: '127.0.0.1',
                trace_id: 'abc123def456',
                created_at: '2026-01-27 10:00:00',
                latency: 0.032,
                agent: 'Mozilla/5.0',
                error_message: '',
                params: { identifier: 'admin@example.com', credentials: '***' },
                resp: { code: 0, msg: 'OK', data: { token: 'xxx' } }
            });
        }

        // ========== 未匹配的接口 ==========
        console.warn(`[Mock] API not found: ${method?.toUpperCase()} ${url}`);

        // 返回 404 错误
        const error = {
            response: {
                status: 404,
                statusText: 'Not Found',
                data: {
                    code: 404,
                    msg: `Mock API not found: ${url}`
                },
                headers: {},
                config
            },
            config,
            message: `Request failed with status code 404`
        };

        return Promise.reject(error);
    };
}
