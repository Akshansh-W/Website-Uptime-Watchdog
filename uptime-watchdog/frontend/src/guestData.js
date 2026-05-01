export const GUEST_USER = {
  id: 'guest',
  name: 'Guest Preview',
  email: 'guest@watchdog.preview',
  isGuest: true,
};

export const GUEST_MONITORS = [
  {
    id: 'guest-api',
    label: 'Production API',
    url: 'https://api.example.com',
    status: 'up',
    uptime: 99.98,
    responseTime: 118,
    lastChecked: '2 min ago',
    alertEmail: 'alerts@example.com',
    alertSlack: 'Watchdog Ops',
    history: ['up', 'up', 'up', 'up', 'up', 'up', 'up', 'up', 'up', 'down', 'up', 'up'],
  },
  {
    id: 'guest-store',
    label: 'Checkout Flow',
    url: 'https://shop.example.com/checkout',
    status: 'down',
    uptime: 97.42,
    responseTime: null,
    lastChecked: '5 min ago',
    alertEmail: 'commerce@example.com',
    alertSlack: null,
    history: ['up', 'up', 'down', 'down', 'up', 'up', 'up', 'down', 'down', 'down', 'up', 'down'],
  },
  {
    id: 'guest-docs',
    label: 'Docs Site',
    url: 'https://docs.example.com',
    status: 'up',
    uptime: 100,
    responseTime: 64,
    lastChecked: '1 min ago',
    alertEmail: 'docs@example.com',
    alertSlack: null,
    history: ['up', 'up', 'up', 'up', 'up', 'up', 'up', 'up', 'up', 'up', 'up', 'up'],
  },
];

export function createGuestMonitor(data) {
  return {
    id: `guest-${Date.now()}`,
    label: data.label,
    url: data.url,
    status: 'pending',
    uptime: null,
    responseTime: null,
    lastChecked: 'Not checked yet',
    alertEmail: data.alertEmail || 'preview@example.com',
    alertSlack: data.alertSlack,
    history: [],
  };
}
