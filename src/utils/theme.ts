export type Theme = 'light' | 'dark';

export interface ThemeStyles {
  accentBorder: any;
  accentText: any;
  background: string;
  cardBg: string;
  text: string;
  subtext: string;
  inputBg: string;
  buttonBg: string;
  buttonHoverBg: string;
  buttonText: string;
  borderColor: string;
  linkColor: string;
  linkHoverColor: string;
  shadowColor: string;
}

export const themes: Record<Theme, ThemeStyles> = {
  light: {
    accentBorder: 'border-[#8B7355]',
    accentText: 'text-[#8B7355]',
    background: 'bg-[#E8E0D5]',
    cardBg: 'bg-white',
    text: 'text-gray-900',
    subtext: 'text-gray-600',
    inputBg: 'bg-white',
    buttonBg: 'bg-[#8B7355]',
    buttonHoverBg: 'hover:bg-[#7A6548]',
    buttonText: 'text-white',
    borderColor: 'border-[#8B7355]',
    linkColor: 'text-[#8B7355]',
    linkHoverColor: 'hover:text-[#7A6548]',
    shadowColor: 'shadow-[#8B7355]'
  },
  dark: {
    accentBorder: 'border-gray-700',
    accentText: 'text-gray-200',
    background: 'bg-[#1a1a1a]',
    cardBg: 'bg-[#2A2A2A]',
    text: 'text-gray-200',
    subtext: 'text-gray-400',
    inputBg: 'bg-[#323232]',
    buttonBg: 'bg-[#404040]',
    buttonHoverBg: 'hover:bg-[#4A4A4A]',
    buttonText: 'text-white',
    borderColor: 'border-gray-700',
    linkColor: 'text-gray-300',
    linkHoverColor: 'hover:text-white',
    shadowColor: 'shadow-gray-900'
  }
}; 

export function getTextColor(currentTheme: string, lightColor: string, darkColor: string) {
  return currentTheme === 'light' ? lightColor : darkColor;
} 