'use client'

interface Props {
  value: string
  onChange: (val: string) => void
}

export function SearchInput({ value, onChange }: Props) {
  return (
    <div className="relative">
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={4}
        value={value}
        onChange={e => {
          const clean = e.target.value.replace(/\D/g, '').slice(0, 4)
          onChange(clean)
        }}
        placeholder="0000"
        autoFocus
        className="w-full text-6xl text-center font-bold tracking-[0.3em]
                   border-b-4 border-blue-500 bg-transparent outline-none
                   py-5 text-gray-800 placeholder:text-gray-200 font-mono"
      />
      {value.length > 0 && (
        <button
          onClick={() => onChange('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300
                     hover:text-gray-500 transition-colors text-3xl w-10 h-10
                     flex items-center justify-center rounded-full hover:bg-gray-100"
          aria-label="Очистити"
        >
          ×
        </button>
      )}
    </div>
  )
}
