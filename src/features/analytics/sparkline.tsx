// Inline SVG sparkline. No external chart lib.
// Uses tokenized colors so it stays legible in dark mode.

export function Sparkline({
  values,
  width = 320,
  height = 60,
}: {
  values: number[]
  width?: number
  height?: number
}) {
  if (values.length === 0) {
    return (
      <div style={{ width, height }} className="flex items-center justify-center text-[color:var(--faint)] text-xs">
        no data
      </div>
    )
  }
  const max = Math.max(1, ...values)
  const min = Math.min(0, ...values)
  const range = Math.max(1, max - min)
  const step = values.length > 1 ? width / (values.length - 1) : 0

  const pts = values.map((v, i) => [i * step, height - ((v - min) / range) * (height - 4) - 2] as const)
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' ')
  const area = `${path} L${width},${height} L0,${height} Z`
  const lastX = pts[pts.length - 1]![0]
  const lastY = pts[pts.length - 1]![1]

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Sparkline">
      <path d={area} fill="color-mix(in srgb, var(--accent) 12%, transparent)" />
      <path d={path} fill="none" stroke="var(--accent)" strokeWidth="1.5" />
      <circle cx={lastX} cy={lastY} r="2.5" fill="var(--accent)" />
    </svg>
  )
}
