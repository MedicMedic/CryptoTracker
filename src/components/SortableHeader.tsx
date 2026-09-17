export type SortKey = 'price' | 'change'
export type SortDir = 'asc' | 'desc'

interface SortableHeaderProps {
  label: string
  sortKey: SortKey
  active: SortKey | null
  dir: SortDir
  onSort: (key: SortKey) => void
}

export function SortableHeader({ label, sortKey, active, dir, onSort }: SortableHeaderProps) {
  const isActive = active === sortKey
  const directionWord = dir === 'asc' ? 'ascending' : 'descending'

  return (
    <th scope="col" aria-sort={isActive ? directionWord : 'none'}>
      <button
        type="button"
        className="sort-button"
        onClick={() => onSort(sortKey)}
        aria-label={`Sort by ${label}${isActive ? `, ${directionWord}` : ''}`}
        title="Sorts only the coins currently loaded, not the full market"
      >
        {label}
        {isActive && (
          <span className="sort-icon active" aria-hidden="true">
            {dir === 'asc' ? '▲' : '▼'}
          </span>
        )}
      </button>
    </th>
  )
}
