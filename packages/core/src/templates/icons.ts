/**
 * Lucide Icon Module for Flare CMS Admin
 *
 * Provides SVG icon strings from lucide-static, sized for sidebar/UI use.
 */

import {
  LayoutDashboard,
  FileText,
  Image,
  Users,
  Plug,
  HardDrive,
  Database,
  Settings,
  Search,
  Plus,
  Pencil,
  Trash2,
  Eye,
  ChevronDown,
  ChevronRight,
  X,
  Check,
  TriangleAlert,
  LogOut,
  User,
  Menu,
  ExternalLink,
  RefreshCw,
  Clock,
  Shield,
  BookOpen,
  FolderOpen,
  Newspaper,
  Globe,
  Code,
  Activity,
  Filter,
  MoreHorizontal,
  Copy,
  ArrowUpDown,
  Layers,
  ClipboardList,
  CircleHelp,
  Rocket,
} from 'lucide-static'

/**
 * Inject a CSS class into a Lucide SVG string.
 * Replaces the default `class="lucide lucide-*"` with custom classes
 * and sets width/height to match the UI context.
 */
export function icon(svg: string, className: string = 'h-5 w-5'): string {
  return svg
    .replace(/class="[^"]*"/, `class="${className}"`)
    .replace(/width="\d+"/, 'width="20"')
    .replace(/height="\d+"/, 'height="20"')
}

/**
 * Map a collection's icon hint to a Lucide SVG string.
 * Falls back to FileText if no match found.
 */
export function collectionIcon(iconHint?: string): string {
  const map: Record<string, string> = {
    'file-text': FileText,
    'newspaper': Newspaper,
    'book-open': BookOpen,
    'folder-open': FolderOpen,
    'globe': Globe,
    'image': Image,
    'users': Users,
    'code': Code,
    'layers': Layers,
    'clipboard-list': ClipboardList,
    'shield': Shield,
    'settings': Settings,
    'activity': Activity,
  }
  return map[iconHint || ''] || FileText
}

// Alias for backwards compat with layout import
const AlertTriangle = TriangleAlert

// Re-export all icons for use across templates
export {
  LayoutDashboard,
  FileText,
  Image,
  Users,
  Plug,
  HardDrive,
  Database,
  Settings,
  Search,
  Plus,
  Pencil,
  Trash2,
  Eye,
  ChevronDown,
  ChevronRight,
  X,
  Check,
  AlertTriangle,
  LogOut,
  User,
  Menu,
  ExternalLink,
  RefreshCw,
  Clock,
  Shield,
  BookOpen,
  FolderOpen,
  Newspaper,
  Globe,
  Code,
  Activity,
  Filter,
  MoreHorizontal,
  Copy,
  ArrowUpDown,
  Layers,
  ClipboardList,
  CircleHelp,
  Rocket,
}
