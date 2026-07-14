/**
 * Composable for managing the floating message window's position, size,
 * drag, resize, and docking behavior.
 */

export type DockPosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'right' | 'left'
export type WindowMode = 'centered' | 'floating' | 'docked'

export interface WindowState {
  x: number
  y: number
  width: number
  height: number
  mode: WindowMode
  dock: DockPosition
  isMinimized: boolean
}

const DEFAULT_WIDTH = 720
const DEFAULT_HEIGHT = 560
const MIN_WIDTH = 400
const MIN_HEIGHT = 360
const DOCK_MARGIN = 16
const TITLE_BAR_HEIGHT = 48

interface DragState {
  startX: number
  startY: number
  startWindowX: number
  startWindowY: number
}

interface ResizeState {
  startX: number
  startY: number
  startWidth: number
  startHeight: number
  startWindowX: number
  startWindowY: number
  direction: ResizeDirection
}

type ResizeDirection = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

export const useMessageWindow = () => {
  const windowState = useState<WindowState>('msg_window_state', () => ({
    x: 0,
    y: 0,
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
    mode: 'centered',
    dock: 'bottom-right',
    isMinimized: false,
  }))

  const isWindowOpen = useState<boolean>('msg_window_open', () => false)
  const isDragging = useState<boolean>('msg_window_dragging', () => false)
  const isResizing = useState<boolean>('msg_window_resizing', () => false)

  let dragState: DragState | null = null
  let resizeState: ResizeState | null = null

  // Compute centered position
  function getCenteredPosition(): { x: number; y: number } {
    if (!import.meta.client) return { x: 0, y: 0 }
    const w = windowState.value.width
    const h = windowState.value.height
    return {
      x: Math.max(0, (window.innerWidth - w) / 2),
      y: Math.max(0, (window.innerHeight - h) / 2),
    }
  }

  // Compute docked position
  function getDockedPosition(dock: DockPosition): { x: number; y: number } {
    if (!import.meta.client) return { x: 0, y: 0 }
    const w = windowState.value.width
    const h = windowState.value.height
    switch (dock) {
      case 'bottom-right':
        return { x: window.innerWidth - w - DOCK_MARGIN, y: window.innerHeight - h - DOCK_MARGIN }
      case 'bottom-left':
        return { x: DOCK_MARGIN, y: window.innerHeight - h - DOCK_MARGIN }
      case 'top-right':
        return { x: window.innerWidth - w - DOCK_MARGIN, y: DOCK_MARGIN }
      case 'top-left':
        return { x: DOCK_MARGIN, y: DOCK_MARGIN }
      case 'right':
        return { x: window.innerWidth - w - DOCK_MARGIN, y: (window.innerHeight - h) / 2 }
      case 'left':
        return { x: DOCK_MARGIN, y: (window.innerHeight - h) / 2 }
    }
  }

  // Open the window centered
  function openWindow() {
    const pos = getCenteredPosition()
    windowState.value = {
      ...windowState.value,
      x: pos.x,
      y: pos.y,
      mode: 'centered',
      isMinimized: false,
    }
    isWindowOpen.value = true
  }

  // Close the window
  function closeWindow() {
    isWindowOpen.value = false
    isDragging.value = false
    isResizing.value = false
  }

  // Toggle minimize
  function toggleMinimize() {
    windowState.value.isMinimized = !windowState.value.isMinimized
  }

  // Dock to a specific position
  function dockTo(position: DockPosition) {
    const pos = getDockedPosition(position)
    windowState.value = {
      ...windowState.value,
      x: pos.x,
      y: pos.y,
      mode: 'docked',
      dock: position,
      isMinimized: false,
    }
    isWindowOpen.value = true
  }

  // Undock / set to floating
  function setFloating() {
    windowState.value.mode = 'floating'
  }

  // Resize via edge drag
  function onResizePointerDown(e: PointerEvent, direction: ResizeDirection) {
    e.preventDefault()
    e.stopPropagation()
    resizeState = {
      startX: e.clientX,
      startY: e.clientY,
      startWidth: windowState.value.width,
      startHeight: windowState.value.height,
      startWindowX: windowState.value.x,
      startWindowY: windowState.value.y,
      direction,
    }
    isResizing.value = true
    document.addEventListener('pointermove', onResizePointerMove)
    document.addEventListener('pointerup', onResizePointerUp)
  }

  function onResizePointerMove(e: PointerEvent) {
    if (!resizeState) return
    const dx = e.clientX - resizeState.startX
    const dy = e.clientY - resizeState.startY
    const dir = resizeState.direction

    let newW = resizeState.startWidth
    let newH = resizeState.startHeight
    let newX = resizeState.startWindowX
    let newY = resizeState.startWindowY

    if (dir.includes('e')) {
      newW = Math.max(MIN_WIDTH, resizeState.startWidth + dx)
    }
    if (dir.includes('w')) {
      newW = Math.max(MIN_WIDTH, resizeState.startWidth - dx)
      newX = resizeState.startWindowX + dx
      // Clamp left
      if (newX < 0) {
        newW += newX
        newX = 0
      }
    }
    if (dir.includes('s')) {
      newH = Math.max(MIN_HEIGHT, resizeState.startHeight + dy)
    }
    if (dir.includes('n')) {
      newH = Math.max(MIN_HEIGHT, resizeState.startHeight - dy)
      newY = resizeState.startWindowY + dy
      if (newY < 0) {
        newH += newY
        newY = 0
      }
    }

    // Clamp to viewport
    const maxW = window.innerWidth - 8
    const maxH = window.innerHeight - 8
    newW = Math.min(newW, maxW)
    newH = Math.min(newH, maxH)

    windowState.value = {
      ...windowState.value,
      x: newX,
      y: newY,
      width: newW,
      height: newH,
      mode: 'floating',
    }
  }

  function onResizePointerUp() {
    resizeState = null
    isResizing.value = false
    document.removeEventListener('pointermove', onResizePointerMove)
    document.removeEventListener('pointerup', onResizePointerUp)
  }

  // Drag via title bar
  function onDragPointerDown(e: PointerEvent) {
    e.preventDefault()
    dragState = {
      startX: e.clientX,
      startY: e.clientY,
      startWindowX: windowState.value.x,
      startWindowY: windowState.value.y,
    }
    isDragging.value = true
    document.addEventListener('pointermove', onDragPointerMove)
    document.addEventListener('pointerup', onDragPointerUp)
  }

  function onDragPointerMove(e: PointerEvent) {
    if (!dragState) return
    let newX = dragState.startWindowX + (e.clientX - dragState.startX)
    let newY = dragState.startWindowY + (e.clientY - dragState.startY)

    // Allow some overflow so window can be dragged partially off-screen
    const maxX = window.innerWidth - 80
    const maxY = window.innerHeight - TITLE_BAR_HEIGHT
    newX = Math.max(-windowState.value.width + 80, Math.min(newX, maxX))
    newY = Math.max(0, Math.min(newY, maxY))

    windowState.value = {
      ...windowState.value,
      x: newX,
      y: newY,
      mode: 'floating',
    }
  }

  function onDragPointerUp() {
    dragState = null
    isDragging.value = false
    document.removeEventListener('pointermove', onDragPointerMove)
    document.removeEventListener('pointerup', onDragPointerUp)
  }

  // Handle window resize (viewport change)
  function onViewportResize() {
    if (!isWindowOpen.value) return
    const state = windowState.value
    const maxW = window.innerWidth - 8
    const maxH = window.innerHeight - 8

    let { x, y, width, height } = state

    // Clamp size
    width = Math.min(width, maxW)
    height = Math.min(height, maxH)
    // Clamp position
    x = Math.max(-width + 80, Math.min(x, window.innerWidth - 80))
    y = Math.max(0, Math.min(y, window.innerHeight - TITLE_BAR_HEIGHT))

    if (state.mode === 'centered') {
      const pos = getCenteredPosition()
      x = pos.x
      y = pos.y
    } else if (state.mode === 'docked') {
      const pos = getDockedPosition(state.dock)
      x = pos.x
      y = pos.y
    }

    windowState.value = { ...state, x, y, width, height }
  }

  onMounted(() => {
    window.addEventListener('resize', onViewportResize)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('resize', onViewportResize)
    onDragPointerUp()
    onResizePointerUp()
  })

  // ------------- DOCK ZONES (snap suggestions) -------------
  const dockZones = computed<{ position: DockPosition; label: string; icon: string }[]>(() => [
    { position: 'bottom-right', label: '右下', icon: '↘' },
    { position: 'bottom-left', label: '左下', icon: '↙' },
    { position: 'top-right', label: '右上', icon: '↗' },
    { position: 'top-left', label: '左上', icon: '↖' },
    { position: 'right', label: '右侧', icon: '→' },
    { position: 'left', label: '左侧', icon: '←' },
  ])

  return {
    windowState,
    isWindowOpen,
    isDragging,
    isResizing,
    openWindow,
    closeWindow,
    toggleMinimize,
    dockTo,
    setFloating,
    onDragPointerDown,
    onDragPointerMove,
    onDragPointerUp,
    onResizePointerDown,
    dockZones,
    DOCK_MARGIN,
    TITLE_BAR_HEIGHT,
    MIN_WIDTH,
    MIN_HEIGHT,
  }
}
