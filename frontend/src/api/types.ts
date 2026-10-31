export type BucketPermissions = {
  read: boolean
  write: boolean
  owner: boolean
}

export type PartitionInfo = {
  available: number
  total: number
}

export type NodeInfo = {
  id: string
  garageVersion?: string | null
  addr?: string | null
  hostname?: string | null
  isUp: boolean
  lastSeenSecsAgo?: number | null
  role?: {
    zone: string
    tags: string[]
    capacity?: number | null
  } | null
  draining: boolean
  dataPartition?: PartitionInfo | null
  metadataPartition?: PartitionInfo | null
  resyncQueueLen?: number | null
}

export type ClusterStatus = {
  layoutVersion: number
  nodes: NodeInfo[]
}

export type ClusterHealth = {
  status: 'healthy' | 'degraded' | 'unavailable'
  knownNodes: number
  connectedNodes: number
  storageNodes: number
  storageNodesUp: number
  partitions: number
  partitionsQuorum: number
  partitionsAllOk: number
}

export type ClusterStatistics = {
  freeform: string
  dataAvail?: number | null
  metadataAvail?: number | null
  incompleteAvailInfo?: boolean
  bucketCount?: number | null
  totalObjectCount?: number | null
  totalObjectBytes?: number | null
}

export type WebsiteConfig = {
  indexDocument: string
  errorDocument?: string | null
  routingRules?: unknown[]
}

export type Quotas = {
  maxSize?: number | null
  maxObjects?: number | null
}

export type BucketKey = {
  accessKeyId: string
  name: string
  permissions: BucketPermissions
  bucketLocalAliases: string[]
}

export type Bucket = {
  id: string
  created: string
  globalAliases: string[]
  localAliases?: unknown[]
  websiteAccess?: boolean
  websiteConfig?: WebsiteConfig | null
  keys?: BucketKey[]
  objects?: number
  bytes?: number
  quotas?: Quotas | null
  unfinishedUploads?: number
  unfinishedMultipartUploads?: number
}

export type KeyListItem = {
  id: string
  name: string
  created?: string | null
  expiration?: string | null
  expired: boolean
}

export type KeyBucketPermission = {
  id: string
  globalAliases: string[]
  localAliases: string[]
  permissions: BucketPermissions
}

export type KeyInfo = {
  accessKeyId: string
  created?: string | null
  name: string
  expiration?: string | null
  expired: boolean
  secretAccessKey?: string
  permissions: { createBucket: boolean }
  buckets: KeyBucketPermission[]
}

export type ObjectItem = {
  key: string
  size: number
  lastModified: string
  etag: string
}

export type ObjectListing = {
  bucket: string
  prefix: string
  folders: string[]
  objects: ObjectItem[]
  nextToken: string | null
  isTruncated: boolean
}

export type AppSettings = {
  adminUrl: string
  s3Endpoint: string
  s3Region: string
  serviceAccessKey: string
  maxUploadMb: number
  websiteDomain: string
  singleNode: boolean
}

// ---- Cluster layout ----

export type ZoneRedundancy = 'maximum' | { atLeast: number }

export type LayoutParameters = { zoneRedundancy: ZoneRedundancy }

export type LayoutNodeRole = {
  id: string
  zone: string
  tags: string[]
  capacity?: number | null
  storedPartitions?: number | null
  usableCapacity?: number | null
}

export type NodeRoleChange = {
  id: string
  remove?: boolean
  zone?: string
  tags?: string[]
  capacity?: number | null
}

export type ClusterLayout = {
  version: number
  roles: LayoutNodeRole[]
  parameters: LayoutParameters
  partitionSize: number
  stagedRoleChanges: NodeRoleChange[]
  stagedParameters?: LayoutParameters | null
}

export type LayoutPreview =
  | { error: string }
  | { message: string[]; statistics?: unknown; newLayout: ClusterLayout }

export type ApplyLayoutResult = {
  message: string[]
  statistics?: unknown
  layout: ClusterLayout
}

export type MultiResponse<T> = {
  success: Record<string, T>
  error: Record<string, string>
}

// ---- Node details ----

export type NodeRole = {
  zone: string
  tags: string[]
  capacity?: number | null
}

export type NodeConnectionParameters = {
  region: string
  s3Endpoint?: string | null
  s3UsePathStyle?: boolean | null
  k2vEndpoint?: string | null
}

export type NodeInfoDetail = {
  nodeId: string
  hostname?: string | null
  garageVersion: string
  garageFeatures?: string[] | null
  rustVersion: string
  dbEngine: string
  connectionParameters?: NodeConnectionParameters | null
  addr?: string | null
  isUp?: boolean | null
  role?: NodeRole | null
  draining?: boolean | null
  dataPartition?: PartitionInfo | null
  metadataPartition?: PartitionInfo | null
}

export type NodeTableStats = {
  tableName: string
  items: number
  merkleItems: number
  merkleQueueLen: number
  insertQueueLen: number
  gcQueueLen: number
}

export type NodeBlockManagerStats = {
  rcEntries: number
  resyncQueueLen: number
  resyncErrors: number
}

export type NodeStatistics = {
  freeform: string
  tableStats?: NodeTableStats[] | null
  blockManagerStats?: NodeBlockManagerStats | null
}

// ---- Workers / repairs ----

export type WorkerState = 'busy' | 'idle' | 'done' | { throttled: { durationSecs: number } }

export type WorkerInfo = {
  id: number
  name: string
  state: WorkerState
  errors: number
  consecutiveErrors: number
  lastError?: { message: string; secsAgo: number } | null
  tranquility?: number | null
  progress?: string | null
  queueLength?: number | null
  persistentErrors?: number | null
  freeform: string[]
}

export type BlockError = {
  blockHash: string
  refcount: number
  errorCount: number
  lastTrySecsAgo: number
  nextTryInSecs: number
}

export type RepairTypeValue =
  | 'tables'
  | 'blocks'
  | 'versions'
  | 'multipartUploads'
  | 'blockRefs'
  | 'blockRc'
  | 'rebalance'
  | 'aliases'
  | 'clearResyncQueue'
  | { scrub: 'start' | 'pause' | 'resume' | 'cancel' }

// ---- Admin tokens ----

export type AdminTokenInfo = {
  id?: string | null
  created?: string | null
  name: string
  expiration?: string | null
  expired: boolean
  scope: string[]
}

export type CreateAdminTokenResult = AdminTokenInfo & { secretToken: string }