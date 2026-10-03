interface Window {
  /** Private bridge between the first-paint head script and the early client plugin. */
  __devbitStartupLoading?: {
    start: () => void
    setProgress: (progress: 25 | 65) => void
    finish: (immediate?: boolean) => void
  }
}
