import React from 'react';
import { Briefcase, Shield, TrendingUp, BookOpen, Zap, Code, Feather, Bot,
  Moon, CloudRain, Scale, Leaf, Rocket } from 'lucide-react-native';
const icons: Record<string, React.ComponentType<any>> = {
  briefcase: Briefcase, shield: Shield, 'trending-up': TrendingUp, 'book-open': BookOpen,
  zap: Zap, code: Code, feather: Feather, bot: Bot, moon: Moon, rain: CloudRain,
  scale: Scale, leaf: Leaf, rocket: Rocket,
};
export function LineIcon({ name, size = 22, color = '#A3A3A3' }: { name: string; size?: number; color?: string }) {
  const Icon = icons[name] || Bot;
  return <Icon size={size} color={color} strokeWidth={1.6} />;
}
