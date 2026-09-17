interface SearchBoxProps {
  value: string
  onChange: (value: string) => void
}

export function SearchBox({ value, onChange }: SearchBoxProps) {
  return (
    <div className="search-box">
      <label htmlFor="coin-search">Search coins</label>
      <input
        id="coin-search"
        type="search"
        autoComplete="off"
        placeholder="e.g. bitcoin, eth, doge"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}
