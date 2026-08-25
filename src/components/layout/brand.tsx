import Link from 'next/link'

export function Brand({ href = '/', size = 'md' }: { href?: string; size?: 'sm' | 'md' | 'lg' }) {
  const px = size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-lg'
  return (
    <Link
      href={href}
      className={`inline-flex items-baseline font-display font-black tracking-tight ${px} text-[color:var(--ink)] no-underline`}
    >
      Vin<span className="text-[color:var(--accent)]">·</span>SEND
    </Link>
  )
}
