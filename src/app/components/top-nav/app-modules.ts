import { WORKFLOW_NAV } from '../../modules/workflows/models/workflow-nav.model';

/** One side bar entry. Routes are the same as before; only where they are shown changed. */
export interface NavItem {
  label: string;
  icon: string;
  route: string;
  /** Pages inside the item, shown as header tabs (GenBI, Dashboard). */
  tabs?: { label: string; route: string }[];
  /** Rendered only when the user holds at least one of these permission keys. */
  requiresAnyPermission?: string[];
}
export interface NavGroup { label: string; items: NavItem[] }

const WF = ['workflows:menuvisibility'];

/** Side bar groups: Workflows Run and Build pages, then the other modules. */
export const NAV_GROUPS: NavGroup[] = [
  { label: 'Run', items: WORKFLOW_NAV.run.map((i) => ({ ...i, requiresAnyPermission: WF })) },
  { label: 'Build', items: WORKFLOW_NAV.build.map((i) => ({ ...i, requiresAnyPermission: WF })) },
  {
    label: 'Insights',
    items: [
      { label: 'Dashboard', icon: 'chart-column', route: '/dashboard/overview', tabs: [{ label: 'Overview', route: '/dashboard/overview' }] },
      {
        label: 'GenBI', icon: 'database-zap', route: '/genbi/overview', requiresAnyPermission: ['genbi:menuvisibility'],
        tabs: [
          { label: 'Overview', route: '/genbi/overview' },
          { label: 'Organisations', route: '/genbi/org' },
          { label: 'Upload', route: '/genbi/upload' },
          { label: 'Schemas', route: '/genbi/schemas' },
          { label: 'Validation', route: '/genbi/validation' },
          { label: 'Analytics', route: '/genbi/analytics' },
        ],
      },
    ],
  },
  { label: 'Admin', items: [{ label: 'Permissions', icon: 'shield-check', route: '/admin/permissions', requiresAnyPermission: ['manage-permissions:menuvisibility'] }] },
];

const ALL = NAV_GROUPS.flatMap((g) => g.items.map((i) => ({ ...i, group: g.label })));

/** The side bar entry a URL belongs to (longest matching route wins). */
export function navFor(url: string): (NavItem & { group: string }) | undefined {
  const path = url.split('?')[0];
  const owns = (i: NavItem) => [i.route, ...(i.tabs || []).map((t) => t.route)].some((r) => path === r || path.startsWith(r + '/'))
    || (i.route.startsWith('/genbi') && path.startsWith('/genbi')) || (i.route.startsWith('/dashboard') && path.startsWith('/dashboard'));
  return ALL.filter(owns).sort((a, b) => b.route.length - a.route.length)[0]
    // Drill-ins such as a template's runs belong to Workflows Run.
    ?? (path.startsWith('/workflows') ? { ...WORKFLOW_NAV.run[1], group: 'Run' } : undefined);
}
