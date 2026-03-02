import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GalaxyService } from '../src/services/galaxyService'

// Mock Memento (VS Code globalState)
function createMockMemento(): { get: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> } {
  const store = new Map<string, unknown>()
  return {
    get: vi.fn((key: string) => store.get(key)),
    update: vi.fn((key: string, value: unknown) => {
      if (value === undefined) store.delete(key)
      else store.set(key, value)
      return Promise.resolve()
    }),
  }
}

const SEARCH_RESPONSE = {
  data: [
    { namespace: 'community', name: 'general', version: '9.0.0', description: 'Community general collection' },
    { namespace: 'amazon', name: 'aws', version: '7.1.0', description: 'AWS modules' },
  ],
}

const COLLECTION_INFO_RESPONSE = {
  highest_version: { version: '9.0.0' },
}

const DOCS_BLOB_RESPONSE = {
  docs_blob: {
    contents: [
      { content_type: 'module', content_name: 'archive', description: 'Creates archives' },
      { content_type: 'module', content_name: 'json_query', description: 'JSON query filter' },
      { content_type: 'role', content_name: 'some_role', description: 'A role, not a module' },
    ],
  },
}

describe('GalaxyService', () => {
  let service: GalaxyService
  let memento: ReturnType<typeof createMockMemento>
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    memento = createMockMemento()
    service = new GalaxyService(memento as any)
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  describe('searchCollections', () => {
    it('fetches and returns collections', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(SEARCH_RESPONSE),
      })

      const result = await service.searchCollections('community')

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        namespace: 'community',
        name: 'general',
        version: '9.0.0',
        description: 'Community general collection',
      })
      expect(globalThis.fetch).toHaveBeenCalledOnce()
      expect((globalThis.fetch as any).mock.calls[0][0]).toContain('keywords=community')
    })

    it('caches search results', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(SEARCH_RESPONSE),
      })

      await service.searchCollections('community')
      const result = await service.searchCollections('community')

      expect(result).toHaveLength(2)
      expect(globalThis.fetch).toHaveBeenCalledOnce()
    })

    it('ignores expired cache entries', async () => {
      // Seed cache with old timestamp
      const cacheKey = 'galaxy:search:community'
      memento.update(cacheKey, {
        data: [{ namespace: 'old', name: 'data', version: '1.0.0', description: '' }],
        timestamp: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
      })

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(SEARCH_RESPONSE),
      })

      const result = await service.searchCollections('community')

      expect(result).toHaveLength(2)
      expect(result[0].namespace).toBe('community')
      expect(globalThis.fetch).toHaveBeenCalledOnce()
    })

    it('throws on HTTP error', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      })

      await expect(service.searchCollections('fail')).rejects.toThrow('Galaxy search failed: 500')
    })
  })

  describe('getModules', () => {
    it('fetches collection info then docs-blob and returns modules only', async () => {
      globalThis.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(COLLECTION_INFO_RESPONSE),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(DOCS_BLOB_RESPONSE),
        })

      const result = await service.getModules('community', 'general')

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        name: 'archive',
        namespace: 'community',
        collection: 'general',
        description: 'Creates archives',
      })
      // Roles should be filtered out
      expect(result.find((m) => m.name === 'some_role')).toBeUndefined()
      expect(globalThis.fetch).toHaveBeenCalledTimes(2)
    })

    it('caches module results', async () => {
      globalThis.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(COLLECTION_INFO_RESPONSE),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(DOCS_BLOB_RESPONSE),
        })

      await service.getModules('community', 'general')
      const result = await service.getModules('community', 'general')

      expect(result).toHaveLength(2)
      expect(globalThis.fetch).toHaveBeenCalledTimes(2) // Only the first call
    })

    it('throws when collection info fails', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      })

      await expect(service.getModules('no', 'exist')).rejects.toThrow('Collection info failed: 404')
    })

    it('throws when no version found', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ highest_version: {} }),
      })

      await expect(service.getModules('community', 'general')).rejects.toThrow('No version found')
    })
  })
})
