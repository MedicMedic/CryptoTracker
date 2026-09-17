import { useEffect, useState } from 'react'
import { ApiError, isRetryable } from '../lib/api'
import { fetchCoins } from '../lib/coins'
import type { Coin } from '../types/coin'
import type { RequestState } from '../types/request-state'

// Debounces `query`, cancels the in-flight request on every change (and on
// unmount), and ignores a response that arrives after its own request was
// superseded — otherwise a fast "re" reply can overwrite a slower "react" one.
export function useCoins(query: string, perPage = 50) {
  const [state, setState] = useState<RequestState<Coin[]>>({ status: 'idle' })
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    const delay = query.trim() ? 300 : 0

    const timer = setTimeout(async () => {
      setState({ status: 'loading' })
      try {
        const data = await fetchCoins(query, controller.signal, perPage)
        setState({ status: 'success', data })
      } catch (err) {
        if (controller.signal.aborted) return
        setState({
          status: 'error',
          message: err instanceof ApiError ? err.message : 'Something went wrong.',
          retryable: isRetryable(err),
        })
      }
    }, delay)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query, perPage, reloadToken])

  return { state, retry: () => setReloadToken((n) => n + 1) }
}
