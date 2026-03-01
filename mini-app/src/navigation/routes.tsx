import type { ComponentType } from 'react';

import { HomePage } from '@/pages/HomePage.tsx';
import { FrensPage } from '@/pages/FrensPage.tsx';
import { EarnPage } from '@/pages/EarnPage.tsx';
import { BoostsPage } from '@/pages/BoostsPage.tsx';
import { AdminPage } from '@/pages/AdminPage.tsx';
import { SquadPage } from '@/pages/SquadPage.tsx';
import { LeaguePage } from '@/pages/LeaguePage.tsx';

interface Route {
  path: string;
  Component: ComponentType;
  title?: string;
}

export const routes: Route[] = [
  { path: '/', Component: HomePage },
  { path: '/frens', Component: FrensPage, title: 'Frens' },
  { path: '/earn', Component: EarnPage, title: 'Earn' },
  { path: '/boosts', Component: BoostsPage, title: 'Boosts' },
  { path: '/admin', Component: AdminPage, title: 'Admin' },
  { path: '/squad', Component: SquadPage, title: 'Squad' },
  { path: '/league', Component: LeaguePage, title: 'League' },
];
