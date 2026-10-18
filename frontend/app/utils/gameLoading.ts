export async function waitForGameCanvas<T>(find: () => T | null, timeout = 5000): Promise<T> {
  const deadline = Date.now() + timeout
  while (true) {
    const canvas = find()
    if (canvas) return canvas
    if (Date.now() >= deadline) throw new Error('画布初始化失败，请重试。')
    await new Promise(resolve => setTimeout(resolve, Math.min(50, Math.max(0, deadline - Date.now()))))
  }
}
