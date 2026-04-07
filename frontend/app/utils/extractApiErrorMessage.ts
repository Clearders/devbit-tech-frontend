export const extractApiErrorMessage = (error: unknown, fallback: string): string => {
  const e = error as {
    data?: { message?: string; error?: string }
    statusMessage?: string
    message?: string
  }

  return e?.data?.message ?? e?.data?.error ?? e?.statusMessage ?? e?.message ?? fallback
}

