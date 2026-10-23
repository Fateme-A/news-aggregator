import { Button } from '@/components/ui/Button'
import { themeControlLabel, useTheme, type ThemeChoice } from '@/store/theme'
import { IconDeviceDesktop, IconMoon, IconSun } from '@tabler/icons-react'
import { useShallow } from 'zustand/react/shallow'

const ICONS: Record<ThemeChoice, typeof IconSun> = {
  light: IconSun,
  dark: IconMoon,
  system: IconDeviceDesktop,
}

export function ThemeToggle({ className }: { className?: string }) {
  const { choice, cycleChoice } = useTheme(
    useShallow((state) => ({
      choice: state.choice,
      cycleChoice: state.cycleChoice,
    })),
  )
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
