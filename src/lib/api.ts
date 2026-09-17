export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(url, init)
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err
    throw new ApiError(0, 'Network error — check your connection.')
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new ApiError(res.status, body?.message ?? body?.error ?? `Request failed (${res.status}).`)
  }
  return res.json() as Promise<T>
}

export function isRetryable(err: unknown): boolean {
  if (err instanceof ApiError) return err.status === 0 || err.status === 429 || err.status >= 500
  return false
}

export async function requestWithRetry<T>(url: string, init?: RequestInit, attempts = 3): Promise<T> {
  for (let i = 0; i < attempts; i++) {
    try {
      return await request<T>(url, init)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') throw err
      if (!isRetryable(err) || i === attempts - 1) throw err
      await new Promise((r) => setTimeout(r, 300 * 2 ** i)) // 300ms, 600ms…
    }
  }
  throw new Error('unreachable')
}
