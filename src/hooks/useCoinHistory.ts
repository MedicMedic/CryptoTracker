import { useEffect, useState } from 'react'
import { ApiError, isRetryable } from '../lib/api'
import { fetchCoinHistory } from '../lib/coins'
import type { PricePoint } from '../types/price-point'
import type { RequestState } from '../types/request-state'

// `coinId: null` means "no coin selected, don't fetch" (the modal is closed).
export function useCoinHistory(coinId: string | null) {
  const [state, setState] = useState<RequestState<PricePoint[]>>({ status: 'idle' })
  const [reloadToken, setReloadToken] = useState(0)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null)

  useEffect(() => {
    if (!coinId) {
      setState({ status: 'idle' })
      return
    }

    const controller = new AbortController()
    // A manual refresh re-fetches the same coin, not a different one (the
    // modal fully unmounts between coins) — keep the current chart on
    // screen instead of blanking it while the new data loads.
    setState((prev) => (prev.status === 'success' ? prev : { status: 'loading' }))

    fetchCoinHistory(coinId, controller.signal)
      .then((data) => {
        setState({ status: 'success', data })
        setLastUpdatedAt(Date.now())
      })
      .catch((err) => {
        if (controller.signal.aborted) return
        setState({
          status: 'error',
          message: err instanceof ApiError ? err.message : 'Something went wrong.',
          retryable: isRetryable(err),
        })
      })

    return () => controller.abort()
  }, [coinId, reloadToken])

  return { state, retry: () => setReloadToken((n) => n + 1), lastUpdatedAt }
}
