import {
  Compass,
  FolderClosed,
  type LucideIcon,
  MessageCircle,
  MessageSquare,
  Palette,
  Users,
  Mail,
  Calendar,
  Mailbox
} from 'lucide-react';

/**
 * Map of commonly used icon names to their components
 * Add more icons here as needed
 */
const iconMap: Record<string, LucideIcon> = {
  // Common icons
  Users,
  MessageSquare,
  MessageCircle,
  Compass,
  FolderClosed,
  Palette,
  Mail,
  Calendar,
  Mailbox
};

/**
 * Get icon component by name from lucide-react
 * Falls back to MessageSquare if icon not found
 */
export const getIconByName = (iconName: string): LucideIcon => {
  const trimmedName = iconName.trim();

  // Check in our icon map
  if (trimmedName in iconMap) {
    return iconMap[trimmedName];
  }

  // Fallback to MessageSquare
  console.warn(`Icon "${iconName}" not found in icon map, using MessageSquare as fallback`);
  return MessageSquare;
};

