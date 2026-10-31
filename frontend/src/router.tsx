import { createBrowserRouter } from 'react-router-dom'

import { AppShell } from '@/components/app-shell'
import BucketDetailPage from '@/pages/bucket-detail'
import BucketsPage from '@/pages/buckets'
import ClusterPage from '@/pages/cluster'
import DashboardPage from '@/pages/dashboard'
import KeyDetailPage from '@/pages/key-detail'
import KeysPage from '@/pages/keys'
import NotFoundPage from '@/pages/not-found'
import SettingsPage from '@/pages/settings'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'buckets', element: <BucketsPage /> },
      { path: 'buckets/:bucketId', element: <BucketDetailPage /> },
      { path: 'cluster', element: <ClusterPage /> },
      { path: 'keys', element: <KeysPage /> },
      { path: 'keys/:keyId', element: <KeyDetailPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])