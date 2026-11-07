import {
  ArrowLeft,
  ArrowRight,
  Bell,
  BookOpen,
  ChartNoAxesCombined,
  Check,
  ChevronRight,
  CircleCheck,
  Clock3,
  Flower2,
  Heart,
  House,
  LifeBuoy,
  LogOut,
  MessageCircle,
  Pause,
  Play,
  Plus,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Sun,
  Trash2,
  UserRound,
  Wind,
  X,
} from 'lucide-react-native';
import { tokens } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';
const icons = {
  back: ArrowLeft,
  arrow: ArrowRight,
  bell: Bell,
  book: BookOpen,
  progress: ChartNoAxesCombined,
  check: Check,
  chevron: ChevronRight,
  complete: CircleCheck,
  clock: Clock3,
  wellness: Flower2,
  heart: Heart,
  home: House,
  support: LifeBuoy,
  logout: LogOut,
  talk: MessageCircle,
  pause: Pause,
  play: Play,
  plus: Plus,
  send: Send,
  settings: Settings2,
  privacy: ShieldCheck,
  sparkles: Sparkles,
  sun: Sun,
  delete: Trash2,
  user: UserRound,
  wind: Wind,
  close: X,
};
export type IconName = keyof typeof icons;
export function Icon({
  name,
  size = tokens.icon.md,
  color,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  const { sky } = useTheme();
  const Drawing = icons[name];
  return (
    <Drawing
      size={size}
      color={color ?? sky.palette.text}
      strokeWidth={tokens.icon.stroke}
      aria-hidden={true}
    />
  );
}
