interface Window {
  /** Private bridge between the prehydration script and the early client plugin. */
  __devbitStartupLoading?: {
    setProgress: (progress: 25 | 65) => void
    finish: (immediate?: boolean) => void
  }
}
