import { useEffect, useState } from 'react'

// A 100ms response needs no spinner; a 3s response does. Waiting `delay`
// before showing the flag covers both without a glitchy flash on fast loads.
export function useDelayedFlag(active: boolean, delay = 300) {
  const [show, setShow] = useState(false)
  useEffect(() => {
    if (!active) {
      setShow(false)
      return
    }
    const t = setTimeout(() => setShow(true), delay)
    return () => clearTimeout(t)
  }, [active, delay])
  return show
}
