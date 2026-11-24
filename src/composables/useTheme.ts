import { watch } from 'vue'
import { useDark, usePreferredDark } from '@vueuse/core'
import { useAppStore } from '@/stores'

/**
 * 主题管理相关逻辑
 */
export function useTheme() {
    const appStore = useAppStore()
    const isDarkPreferred = usePreferredDark()

    // Element Plus 暗色模式处理
    const isDark = useDark({
        selector: 'html',
        attribute: 'class',
        valueDark: 'dark',
        valueLight: '',
        storageKey: null // 不使用 vueuse 的本地存储，使用 pinia 存储
    })

    // 监听主题状态变化
    watch(
        () => appStore.theme,
        (val) => {
            if (val === 'auto') {
                isDark.value = isDarkPreferred.value
            } else {
                isDark.value = val === 'dark'
            }
        },
        { immediate: true }
    )

    // 监听系统偏好变化
    watch(
        isDarkPreferred,
        (val) => {
            if (appStore.theme === 'auto') {
                isDark.value = val
            }
        }
    )

    // 同步 CPAMP v2 data-theme 属性
    watch(
        isDark,
        (dark) => {
            if (typeof document !== 'undefined') {
                document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'white')
            }
        },
        { immediate: true }
    )

    return {
        isDark
    }
}
