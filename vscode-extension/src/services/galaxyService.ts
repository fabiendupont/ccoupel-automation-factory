import type * as vscode from 'vscode'
import type { CollectionInfo, GalaxyModuleInfo } from '@af/shared'

const GALAXY_BASE = 'https://galaxy.ansible.com'
const SEARCH_TTL = 60 * 60 * 1000   // 1 hour
const MODULES_TTL = 30 * 60 * 1000  // 30 minutes

interface CacheEntry<T> {
  data: T
  timestamp: number
}

export class GalaxyService {
  private readonly state: vscode.Memento

  constructor(globalState: vscode.Memento) {
    this.state = globalState
  }

  async searchCollections(query: string): Promise<CollectionInfo[]> {
    const cacheKey = `galaxy:search:${query.toLowerCase()}`
    const cached = this.getCache<CollectionInfo[]>(cacheKey, SEARCH_TTL)
    if (cached) return cached

    const url =
      `${GALAXY_BASE}/api/v3/plugin/ansible/search/collection-versions/` +
      `?keywords=${encodeURIComponent(query)}&limit=20&is_highest=true`

    const res = await fetch(url)
    if (!res.ok) throw new Error(`Galaxy search failed: ${res.status}`)

    const json = await res.json()
    const collections: CollectionInfo[] = (json.data ?? []).map(
      (item: Record<string, unknown>) => ({
        namespace: item.namespace as string,
        name: item.name as string,
        version: item.version as string,
        description: (item.description as string) || '',
      }),
    )

    this.setCache(cacheKey, collections)
    return collections
  }

  async getModules(namespace: string, collection: string): Promise<GalaxyModuleInfo[]> {
    const cacheKey = `galaxy:modules:${namespace}.${collection}`
    const cached = this.getCache<GalaxyModuleInfo[]>(cacheKey, MODULES_TTL)
    if (cached) return cached

    // Step 1: get highest version
    const infoUrl =
      `${GALAXY_BASE}/api/v3/plugin/ansible/content/published/collections/index/` +
      `${encodeURIComponent(namespace)}/${encodeURIComponent(collection)}/`

    const infoRes = await fetch(infoUrl)
    if (!infoRes.ok) throw new Error(`Collection info failed: ${infoRes.status}`)

    const infoJson = await infoRes.json()
    const version = infoJson.highest_version?.version
    if (!version) throw new Error('No version found for collection')

    // Step 2: get docs-blob
    const docsUrl =
      `${GALAXY_BASE}/api/v3/plugin/ansible/content/published/collections/index/` +
      `${encodeURIComponent(namespace)}/${encodeURIComponent(collection)}/` +
      `versions/${encodeURIComponent(version)}/docs-blob/`

    const docsRes = await fetch(docsUrl)
    if (!docsRes.ok) throw new Error(`Docs blob failed: ${docsRes.status}`)

    const docsJson = await docsRes.json()
    const contents: Array<Record<string, unknown>> = docsJson.docs_blob?.contents ?? []

    const modules: GalaxyModuleInfo[] = contents
      .filter((c) => c.content_type === 'module')
      .map((c) => ({
        name: c.content_name as string,
        namespace,
        collection,
        description: (c.description as string) || '',
      }))

    this.setCache(cacheKey, modules)
    return modules
  }

  private getCache<T>(key: string, ttl: number): T | undefined {
    const entry = this.state.get<CacheEntry<T>>(key)
    if (!entry) return undefined
    if (Date.now() - entry.timestamp > ttl) return undefined
    return entry.data
  }

  private setCache<T>(key: string, data: T): void {
    const entry: CacheEntry<T> = { data, timestamp: Date.now() }
    this.state.update(key, entry)
  }
}
