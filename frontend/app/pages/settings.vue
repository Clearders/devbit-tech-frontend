<template>
  <div class="settings-page">
    <section class="page-header">
      <ScrollReveal>
        <div class="container" data-transition-group="title">
          <h1 class="page-header__title">⚙️ 账户设置</h1>
          <p class="page-header__subtitle">管理你的个人资料与头像</p>
        </div>
      </ScrollReveal>
    </section>

    <section class="settings-content">
      <div class="container">
        <div v-if="isResolving" class="settings-loading" data-transition-group="content">
          <div
            class="skeleton skeleton--title"
            style="width: 200px; margin: 0 auto 1rem"
          ></div>
          <div
            class="skeleton skeleton--text"
            style="width: 300px; margin: 0 auto"
          ></div>
        </div>

        <ScrollReveal v-else-if="!isAuthenticated">
          <div class="settings-login-prompt" data-transition-group="content">
            <p>请先登录以管理账户设置。</p>
            <NuxtLink to="/login" class="btn btn--primary">前往登录</NuxtLink>
          </div>
        </ScrollReveal>

        <div v-else class="settings-card" data-transition-group="card">
          <!-- Avatar Section -->
          <ScrollReveal>
            <div class="settings-section">
              <h2 class="settings-section__title">🖼️ 个人头像</h2>
              <p class="settings-section__desc">
                上传一张图片作为你的头像。支持 PNG、JPG、GIF、WebP 格式，最大
                2MB。
              </p>

              <div class="settings-avatar-area">
                <div class="settings-avatar-preview">
                  <AvatarImage
                    :avatar-url="previewUrl || user?.avatarUrl"
                    :avatar="userInitials"
                    :name="user?.name ?? ''"
                    size="lg"
                  />
                </div>

                <div class="settings-avatar-actions">
                  <label
                    class="btn btn--outline settings-upload-btn"
                    :class="{ 'btn--disabled': uploading }"
                  >
                    {{ validating ? '检查图片中…' : '📁 选择图片' }}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/gif,image/webp"
                      class="settings-file-input"
                      :disabled="uploading || validating"
                      @change="handleFileSelect"
                    />
                  </label>
                </div>
              </div>

              <div v-if="selectedFile" class="page-tools" data-transition-group="content">
                <span>待上传：{{ selectedFile.name }}</span>
                <button
                  type="button"
                  class="btn btn--primary"
                  :disabled="uploading"
                  @click="uploadAvatar"
                >
                  {{ uploading ? '上传中…' : '确认上传' }}
                </button>
                <button
                  type="button"
                  class="btn btn--outline"
                  :disabled="uploading"
                  @click="cancelPreview"
                >
                  取消
                </button>
              </div>
              <p v-if="selectedFile" class="settings-section__desc">
                当前为本地预览，确认上传后才会更新头像。
              </p>
              <div
                v-if="uploadError"
                role="alert"
                class="form-error form-error--global"
              >
                {{ uploadError }}
              </div>
              <div v-if="uploadSuccess" role="status" class="form-success">
                {{ uploadSuccess }}
              </div>
            </div>
          </ScrollReveal>

          <!-- Profile Info Section -->
          <ScrollReveal>
            <div class="settings-section">
              <h2 class="settings-section__title">📋 基本信息</h2>
              <div class="settings-info-grid">
                <div class="settings-info-item">
                  <span class="settings-info-label">用户名</span>
                  <span class="settings-info-value">{{ user?.name }}</span>
                </div>
                <div class="settings-info-item">
                  <span class="settings-info-label">邮箱</span>
                  <span class="settings-info-value">{{ user?.email }}</span>
                </div>
                <div class="settings-info-item">
                  <span class="settings-info-label">角色</span>
                  <span class="settings-info-value">
                    {{ user?.isAdmin ? '👑 管理员' : '👤 用户' }}
                  </span>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import AvatarImage from '~/components/AvatarImage.vue'

definePageMeta({
  middleware: ['auth'],
})

useSeoMeta({
  title: '账户设置 – DevBit Tech',
  description: '管理你的 DevBit Tech 账户设置与头像。',
})

const { user, isAuthenticated, isResolving } = useAuth()
const { apiFetch } = useApiFetch()

const uploading = ref(false)
const validating = ref(false)
const selectedFile = shallowRef<File | null>(null)
const previewUrl = ref('')
let selectionVersion = 0
function clearPreview() {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = ''
  selectedFile.value = null
}
function cancelPreview() {
  selectionVersion++
  clearPreview()
  uploadError.value = ''
  uploadSuccess.value = ''
}
onUnmounted(() => {
  selectionVersion++
  clearPreview()
})
const uploadError = ref('')
const uploadSuccess = ref('')

const userInitials = computed(() => {
  const name = user.value?.name ?? ''
  // Extract initials: uppercase ASCII letters first, then fallback to first 2 chars
  const upper = name.replace(/[^A-Z]/g, '').slice(0, 2)
  if (upper.length >= 2) return upper
  if (upper.length === 1) {
    const lower = name.replace(/[^a-z]/g, '')
    return upper + (lower[0]?.toUpperCase() ?? '')
  }
  return name.slice(0, 2).toUpperCase() || '??'
})

async function handleFileSelect(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || uploading.value) return
  const version = ++selectionVersion
  clearPreview()
  uploadError.value = ''
  uploadSuccess.value = ''
  if (
    !['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(file.type)
  ) {
    uploadError.value = '不支持的文件格式。请上传 PNG、JPG、GIF 或 WebP 图片。'
    return
  }
  if (file.size > 2 * 1024 * 1024) {
    uploadError.value = '文件大小不能超过 2MB。'
    return
  }
  validating.value = true
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    if (!image.naturalWidth || !image.naturalHeight)
      throw new Error('Invalid image')
    if (version !== selectionVersion) {
      URL.revokeObjectURL(url)
      return
    }
    selectedFile.value = file
    previewUrl.value = url
  } catch {
    URL.revokeObjectURL(url)
    if (version === selectionVersion)
      uploadError.value = '图片无法读取，文件可能已损坏。请选择另一张图片。'
  } finally {
    if (version === selectionVersion) validating.value = false
  }
}
async function uploadAvatar() {
  if (!selectedFile.value || uploading.value) return
  uploading.value = true
  uploadError.value = ''
  uploadSuccess.value = ''
  try {
    const formData = new FormData()
    formData.append('avatar', selectedFile.value)
    const updatedUser = await apiFetch<NonNullable<typeof user.value>>(
      '/me/avatar',
      {
        method: 'POST',
        body: formData,
        headers: new Headers({ accept: 'application/json' }),
      },
    )
    user.value = updatedUser
    clearPreview()
    uploadSuccess.value = '头像上传成功！'
  } catch (error: unknown) {
    uploadError.value =
      error instanceof Error ? error.message : '头像上传失败，请稍后重试。'
  } finally {
    uploading.value = false
  }
}
</script>

<style scoped>
.settings-page {
  padding-bottom: 4rem;
}

.settings-content {
  padding-top: 1rem;
}

.settings-loading,
.settings-login-prompt {
  text-align: center;
  padding: 4rem 1rem;
  color: var(--color-text-muted, #888);
}

.settings-login-prompt p {
  margin-bottom: 1rem;
}

.settings-card {
  max-width: 600px;
  margin: 0 auto;
}

.settings-section {
  background: var(--color-surface-1, #fff);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.settings-section__title {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 0.25rem;
}

.settings-section__desc {
  color: var(--color-text-muted, #888);
  font-size: 0.875rem;
  margin: 0 0 1rem;
}

.settings-avatar-area {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.settings-avatar-preview {
  flex-shrink: 0;
}

.settings-avatar-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.settings-upload-btn {
  position: relative;
  cursor: pointer;
}

.settings-file-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.settings-info-grid {
  display: grid;
  gap: 0.75rem;
}

.settings-info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--color-border, #eee);
}

.settings-info-item:last-child {
  border-bottom: none;
}

.settings-info-label {
  color: var(--color-text-muted, #888);
  font-size: 0.875rem;
}

.settings-info-value {
  font-weight: 500;
}

.form-error {
  color: #e74c3c;
  font-size: 0.875rem;
  margin-top: 0.75rem;
}

.form-success {
  color: #27ae60;
  font-size: 0.875rem;
  margin-top: 0.75rem;
}

@media (max-width: 480px) {
  .settings-avatar-area {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
