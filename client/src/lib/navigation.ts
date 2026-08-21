import {
  Boxes,
  Frame,
  History,
  LayoutDashboard,
  Palette,
  Printer,
  Send,
  Settings,
  Shirt,
  Tags,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react'

export type ViewKey =
  | 'dashboard'
  | 'raw-materials'
  | 'designs'
  | 'screen-rack'
  | 'print-runs'
  | 'dtf-prints'
  | 'on-hand-stock'
  | 'sales'
  | 'category-manager'
  | 'activity-log'
  | 'settings'

export interface NavItem {
  key: ViewKey
  label: string
  icon: LucideIcon
}

export const navItems: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'raw-materials', label: 'Raw Materials', icon: Boxes },
  { key: 'designs', label: 'Designs', icon: Palette },
  { key: 'screen-rack', label: 'Screen Rack', icon: Frame },
  { key: 'print-runs', label: 'Print Runs', icon: Printer },
  { key: 'dtf-prints', label: 'DTF Prints', icon: Send },
  { key: 'on-hand-stock', label: 'On-Hand Stock', icon: Shirt },
  { key: 'sales', label: 'Sales & Revenue', icon: TrendingUp },
  { key: 'category-manager', label: 'Category Manager', icon: Tags },
  { key: 'activity-log', label: 'Activity Log', icon: History },
  { key: 'settings', label: 'Settings', icon: Settings },
]

export const viewTitles: Record<ViewKey, string> = {
  dashboard: 'Dashboard',
  'raw-materials': 'Raw Materials',
  designs: 'Designs',
  'screen-rack': 'Screen Rack',
  'print-runs': 'Print Runs',
  'dtf-prints': 'DTF Prints',
  'on-hand-stock': 'On-Hand Stock',
  sales: 'Sales & Revenue',
  'category-manager': 'Category Manager',
  'activity-log': 'Activity Log',
  settings: 'Settings',
}
