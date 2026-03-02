import { memo, useState, useCallback, useEffect, useRef } from 'react'
import type { CollectionInfo, GalaxyModuleInfo, HostToWebviewMessage } from '@af/shared'
import { BUILTIN_CATEGORIES, type BuiltinModule } from '../data/builtinModules'
import { getVsCodeApi } from '../vscodeApi'

const SEARCH_DEBOUNCE_MS = 400

interface ModuleEntry {
  name: string
  collection: string
  description: string
}

export const ModulePalette = memo(function ModulePalette() {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [galaxyCollections, setGalaxyCollections] = useState<CollectionInfo[]>([])
  const [galaxyError, setGalaxyError] = useState<string | undefined>()
  const [galaxySearching, setGalaxySearching] = useState(false)
  const [expandedCollections, setExpandedCollections] = useState<Set<string>>(new Set())
  const [collectionModules, setCollectionModules] = useState<Record<string, GalaxyModuleInfo[]>>({})
  const [loadingModules, setLoadingModules] = useState<Set<string>>(new Set())
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>()

  // Listen for Galaxy messages from extension host
  useEffect(() => {
    const handler = (e: MessageEvent<HostToWebviewMessage>) => {
      const msg = e.data
      if (msg.type === 'galaxy:search-result') {
        setGalaxyCollections(msg.collections)
        setGalaxyError(msg.error)
        setGalaxySearching(false)
      }
      if (msg.type === 'galaxy:modules-result') {
        const key = `${msg.namespace}.${msg.collection}`
        setCollectionModules((prev) => ({ ...prev, [key]: msg.modules }))
        setLoadingModules((prev) => {
          const next = new Set(prev)
          next.delete(key)
          return next
        })
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  const toggle = useCallback((label: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  }, [])

  const handleDragStart = useCallback(
    (e: React.DragEvent, mod: ModuleEntry) => {
      e.dataTransfer.setData(
        'application/x-af-module',
        JSON.stringify(mod),
      )
      e.dataTransfer.effectAllowed = 'copy'
    },
    [],
  )

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)

    if (!value.trim()) {
      setGalaxyCollections([])
      setGalaxyError(undefined)
      setGalaxySearching(false)
      return
    }

    setGalaxySearching(true)
    searchTimerRef.current = setTimeout(() => {
      getVsCodeApi().postMessage({ type: 'galaxy:search', query: value.trim() })
    }, SEARCH_DEBOUNCE_MS)
  }, [])

  const toggleCollection = useCallback((ns: string, col: string) => {
    const key = `${ns}.${col}`
    setExpandedCollections((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
        // Fetch modules if not already loaded
        if (!collectionModules[key]) {
          setLoadingModules((prevLoading) => {
            const nextLoading = new Set(prevLoading)
            nextLoading.add(key)
            return nextLoading
          })
          getVsCodeApi().postMessage({ type: 'galaxy:modules', namespace: ns, collection: col })
        }
      }
      return next
    })
  }, [collectionModules])

  // Filter builtin modules by search query
  const filteredCategories = searchQuery.trim()
    ? BUILTIN_CATEGORIES.map((cat) => ({
        ...cat,
        modules: cat.modules.filter(
          (m) =>
            m.name.includes(searchQuery.toLowerCase()) ||
            m.description.toLowerCase().includes(searchQuery.toLowerCase()),
        ),
      })).filter((cat) => cat.modules.length > 0)
    : BUILTIN_CATEGORIES

  return (
    <div className="module-palette">
      <div className="palette-header">Modules</div>

      <div className="palette-search">
        <input
          type="text"
          className="palette-search-input"
          placeholder="Search modules..."
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
      </div>

      {/* Built-in modules */}
      {filteredCategories.map((cat) => (
        <div key={cat.label} className="palette-category">
          <div
            className="palette-category-header"
            onClick={() => toggle(cat.label)}
          >
            <span className="collapse-icon">
              {collapsed.has(cat.label) ? '\u25B6' : '\u25BC'}
            </span>
            {cat.label}
          </div>
          {!collapsed.has(cat.label) && (
            <div className="palette-category-body">
              {cat.modules.map((mod: BuiltinModule) => (
                <div
                  key={mod.name}
                  className="palette-module"
                  draggable
                  onDragStart={(e) => handleDragStart(e, mod)}
                  title={mod.description}
                >
                  {mod.name}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Galaxy search results */}
      {searchQuery.trim() && (
        <div className="palette-galaxy-section">
          <div className="palette-galaxy-header">Galaxy</div>

          {galaxySearching && (
            <div className="palette-galaxy-status">Searching...</div>
          )}

          {galaxyError && (
            <div className="palette-galaxy-error">{galaxyError}</div>
          )}

          {!galaxySearching && !galaxyError && galaxyCollections.length === 0 && searchQuery.trim() && (
            <div className="palette-galaxy-status">No collections found</div>
          )}

          {galaxyCollections.map((col) => {
            const key = `${col.namespace}.${col.name}`
            const isExpanded = expandedCollections.has(key)
            const modules = collectionModules[key]
            const isLoading = loadingModules.has(key)

            return (
              <div key={key} className="palette-collection">
                <div
                  className="palette-collection-header"
                  onClick={() => toggleCollection(col.namespace, col.name)}
                  title={col.description}
                >
                  <span className="collapse-icon">
                    {isExpanded ? '\u25BC' : '\u25B6'}
                  </span>
                  <span className="palette-collection-name">{key}</span>
                  <span className="palette-collection-version">{col.version}</span>
                </div>

                {isExpanded && (
                  <div className="palette-collection-body">
                    {isLoading && (
                      <div className="palette-galaxy-status">Loading modules...</div>
                    )}
                    {modules && modules.length === 0 && !isLoading && (
                      <div className="palette-galaxy-status">No modules</div>
                    )}
                    {modules?.map((mod) => (
                      <div
                        key={mod.name}
                        className="palette-module"
                        draggable
                        onDragStart={(e) =>
                          handleDragStart(e, {
                            name: mod.name,
                            collection: `${mod.namespace}.${mod.collection}`,
                            description: mod.description,
                          })
                        }
                        title={mod.description}
                      >
                        {mod.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
})
