import { useEffect, useRef } from 'react'
import { useCoinHistory } from '../hooks/useCoinHistory'
import { useDelayedFlag } from '../hooks/useDelayedFlag'
import { formatChange, formatPrice } from '../lib/format'
import type { Coin } from '../types/coin'
import { PriceChart } from './PriceChart'
import { Spinner } from './Spinner'

interface CoinDetailModalProps {
  coin: Coin
  onClose: () => void
}

export function CoinDetailModal({ coin, onClose }: CoinDetailModalProps) {
  const { state, retry } = useCoinHistory(coin.id)
  const showSpinner = useDelayedFlag(state.status === 'loading')
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  // Focus the dialog, lock background scroll, and hand focus back to
  // whatever opened the modal (the coin's row button) once it closes.
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    closeButtonRef.current?.focus()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
      previouslyFocused?.focus()
    }
  }, [])

  // Escape closes; Tab/Shift+Tab wraps within the dialog instead of
  // escaping into the page behind it.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key !== 'Tab' || !dialogRef.current) return
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const change = coin.price_change_percentage_24h
  const changeClass = change == null ? '' : change >= 0 ? 'positive' : 'negative'

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        ref={dialogRef}
        className="modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="coin-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button ref={closeButtonRef} type="button" className="modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>

        <div className="modal-header">
          <img src={coin.image} alt="" width={32} height={32} />
          <div>
            <h2 id="coin-modal-title">
              {coin.name} <span className="symbol">{coin.symbol.toUpperCase()}</span>
            </h2>
            <p className="modal-price">
              {formatPrice(coin.current_price)}
              <span className={`change ${changeClass}`}>{formatChange(change)}</span>
            </p>
          </div>
        </div>

        {state.status === 'loading' && showSpinner && <Spinner />}

        {state.status === 'error' && (
          <p role="alert" className="status-message">
            {state.message} {state.retryable && <button onClick={retry}>Try again</button>}
          </p>
        )}

        {state.status === 'success' && state.data.length === 0 && (
          <p className="status-message">No price history available for this coin.</p>
        )}

        {state.status === 'success' && state.data.length > 0 && <PriceChart data={state.data} coinName={coin.name} />}
      </div>
    </div>
  )
}
