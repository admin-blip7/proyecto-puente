import { cn } from '@/lib/utils'

interface TiendaLogoProps {
  className?: string
}

export function TiendaLogo({ className }: TiendaLogoProps) {
  return (
    <span className={cn('font-editors-note leading-[0.9] tracking-[0.01em] text-lg lg:text-xl font-thin', className)}>
      <span className="block">Twenty</span>
      <span className="block italic">Two</span>
      <span className="block">Electronic.</span>
    </span>
  )
}
