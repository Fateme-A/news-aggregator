import { Button } from '@/components/ui/Button'
import { themeControlLabel, useTheme, type ThemeChoice } from '@/store/theme'
import { IconDeviceDesktop, IconMoon, IconSun } from '@tabler/icons-react'

const ICONS: Record<ThemeChoice, typeof IconSun> = {
  light: IconSun,
  dark: IconMoon,
  system: IconDeviceDesktop,
}

export function ThemeToggle({ className }: { className?: string }) {
  const choice = useTheme((state) => state.choice)
  const cycleChoice = useTheme((state) => state.cycleChoice)
  const Icon = ICONS[choice]

  return (
    <Button
      size="icon"
      aria-label={themeControlLabel(choice)}
      onClick={cycleChoice}
      className={className}
    >
      <Icon size={18} stroke={1.75} aria-hidden />
    </Button>
  )
}
