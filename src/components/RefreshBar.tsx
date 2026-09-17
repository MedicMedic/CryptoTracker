interface RefreshBarProps {
  lastUpdatedAt: number | null
  onRefresh: () => void
}

export function RefreshBar({ lastUpdatedAt, onRefresh }: RefreshBarProps) {
  if (lastUpdatedAt === null) return null

  return (
    <div className="refresh-bar">
      <span>Updated {new Date(lastUpdatedAt).toLocaleTimeString()}</span>
      <button onClick={onRefresh}>Refresh</button>
    </div>
  )
}
