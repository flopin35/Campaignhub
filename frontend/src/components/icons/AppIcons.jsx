import {
  AlertTriangle,
  BarChart3,
  Bell,
  BadgeCheck,
  Briefcase,
  Calendar,
  Camera,
  Check,
  CheckCircle2,
  ClipboardList,
  Clock,
  CreditCard,
  Flag,
  Flame,
  Inbox,
  Lock,
  Mail,
  MessageCircle,
  Send,
  Share2,
  Sparkles,
  ThumbsUp,
  Timer,
  UserPlus,
  Users,
  X,
  XCircle,
  QrCode,
  Zap,
} from 'lucide-react';

/** @param {import('lucide-react').LucideIcon} Icon */
export function Icon({ icon: IconComponent, className = 'w-4 h-4', ...props }) {
  if (!IconComponent) return null;
  return <IconComponent className={className} aria-hidden {...props} />;
}

export const NOTIFICATION_ICON_MAP = {
  campaign_approved: CheckCircle2,
  campaign_rejected: XCircle,
  payment_approved: CreditCard,
  campaign_trending: Flame,
  campaign_expiring: Clock,
  new_follower: Users,
  extension_success: Calendar,
  campaign_verified: CheckCircle2,
  user_verified: CheckCircle2,
  verification_revoked: AlertTriangle,
  general: Bell,
};

export function NotificationIcon({ type, className = 'w-5 h-5 shrink-0' }) {
  const IconComponent = NOTIFICATION_ICON_MAP[type] || Bell;
  return <IconComponent className={className} aria-hidden />;
}

export const SHARE_PLATFORM_ICON_MAP = {
  whatsapp: MessageCircle,
  facebook: Share2,
  twitter: Share2,
  telegram: Send,
  linkedin: Briefcase,
};

export function SharePlatformIcon({ platform, className = 'w-4 h-4' }) {
  const IconComponent = SHARE_PLATFORM_ICON_MAP[platform] || Share2;
  return <IconComponent className={className} aria-hidden />;
}

export const SIDEBAR_ICON_MAP = {
  overview: BarChart3,
  campaigns: ClipboardList,
  verification: CheckCircle2,
  reports: Flag,
  comments: MessageCircle,
};

export function SidebarIcon({ tabId, className = 'w-4 h-4' }) {
  const IconComponent = SIDEBAR_ICON_MAP[tabId];
  return IconComponent ? <IconComponent className={className} aria-hidden /> : null;
}

export {
  AlertTriangle,
  BarChart3,
  Bell,
  BadgeCheck,
  Briefcase,
  Calendar,
  Camera,
  Check,
  CheckCircle2,
  ClipboardList,
  Clock,
  CreditCard,
  Flag,
  Flame,
  Inbox,
  Lock,
  Mail,
  MessageCircle,
  Send,
  Share2,
  Sparkles,
  ThumbsUp,
  Timer,
  UserPlus,
  Users,
  X,
  XCircle,
  QrCode,
  Zap,
};
