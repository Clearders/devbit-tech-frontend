import type { SocialService } from '~~/shared/social'
import { createSocialService, type SocialFetch } from '~/utils/socialService'
import { createSocialMock } from '~/utils/socialMock'
import { isEnabled, resolveSocialMode } from '~/utils/apiError'

const services = new WeakMap<object, { owner: number; mode: string; service: SocialService }>()

export function useSocialApi(): SocialService {
  const app = useNuxtApp()
  const config = useRuntimeConfig().public
  const { user } = useAuth()
  const owner = user.value?.id ?? 0
  const mode = resolveSocialMode(config.socialMode, import.meta.dev)
  const cached = services.get(app)
  if (cached?.owner === owner && cached.mode === mode) return cached.service
  const { apiFetch } = useApiFetch()
  const service = mode === 'mock'
    ? createSocialMock({ id: owner, name: user.value?.name ?? '开发预览', avatar: '我', isAdmin: false }, 180, config.socialDemoScenario === 'large' ? 'large' : true)
    : createSocialService(apiFetch as SocialFetch, mode, owner, {
      blocks: isEnabled(config.socialBlocksEnabled), preferences: isEnabled(config.socialPreferencesEnabled),
      presence: isEnabled(config.socialPresenceEnabled), history: isEnabled(config.socialHistoryEnabled),
      directory: isEnabled(config.socialDirectoryEnabled), profiles: isEnabled(config.socialProfilesEnabled),
      metadata: isEnabled(config.socialMetadataEnabled), groups: isEnabled(config.socialGroupsEnabled),
      conversations: isEnabled(config.socialConversationsEnabled), receipts: isEnabled(config.socialReceiptsEnabled),
    })
  services.set(app, { owner, mode, service })
  return service
}
