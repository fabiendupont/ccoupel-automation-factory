import { create } from 'zustand'
import type { Play, ModuleBlock, Link, PlayVariable, PlayAttributes } from '@af/shared'
import type { EditFullMessage } from '@af/shared'
import { getVsCodeApi } from './vscodeApi'

const EDIT_DEBOUNCE_MS = 300

interface AppState {
  plays: Play[]
  activePlayIndex: number
  selectedModuleId: string | null
  collapsedBlocks: Set<string>
  collapsedBlockSections: Set<string>
  warnings: string[]
  errors: string[]
  isPlaybook: boolean
  linkingFrom: string | null
  lastEditTimestamp: number

  // Read-only actions (from PR 1)
  setPlays: (plays: Play[]) => void
  setActivePlayIndex: (index: number) => void
  setSelectedModuleId: (id: string | null) => void
  toggleBlockCollapse: (blockId: string) => void
  toggleBlockSection: (key: string) => void
  setParseResult: (data: {
    isPlaybook: boolean
    plays: Play[]
    warnings: string[]
    errors: string[]
  }) => void

  // Editing actions (PR 2)
  updateModuleAttributes: (moduleId: string, updates: Partial<ModuleBlock>) => void
  deleteModule: (moduleId: string) => void
  addModule: (module: ModuleBlock, linkFromId?: string) => void
  moveModule: (moduleId: string, x: number, y: number) => void
  addLink: (link: Link) => void
  deleteLink: (linkId: string) => void
  addPlay: () => void
  removePlay: (index: number) => void
  renamePlay: (index: number, name: string) => void
  updatePlayAttributes: (updates: Partial<PlayAttributes>) => void
  updatePlayVariables: (variables: PlayVariable[]) => void
  setModulesForActivePlay: (modules: ModuleBlock[]) => void
  setLinksForActivePlay: (links: Link[]) => void
  setLinkingFrom: (id: string | null) => void
}

let editTimer: ReturnType<typeof setTimeout> | undefined

function notifyEdit(plays: Play[]) {
  clearTimeout(editTimer)
  editTimer = setTimeout(() => {
    const msg: EditFullMessage = { type: 'edit:full', plays }
    getVsCodeApi().postMessage(msg)
  }, EDIT_DEBOUNCE_MS)
}

/** Apply a mutation to the active play and notify the host. */
function mutateActivePlay(
  state: AppState,
  mutate: (play: Play) => Play,
): Partial<AppState> {
  const plays = state.plays.map((p, i) =>
    i === state.activePlayIndex ? mutate(p) : p,
  )
  notifyEdit(plays)
  return { plays, lastEditTimestamp: Date.now() }
}

export const useStore = create<AppState>((set, get) => ({
  plays: [],
  activePlayIndex: 0,
  selectedModuleId: null,
  collapsedBlocks: new Set(),
  collapsedBlockSections: new Set(['*:rescue', '*:always']),
  warnings: [],
  errors: [],
  isPlaybook: true,
  linkingFrom: null,
  lastEditTimestamp: 0,

  setPlays: (plays) => set({ plays }),
  setActivePlayIndex: (index) => set({ activePlayIndex: index, selectedModuleId: null }),
  setSelectedModuleId: (id) => set({ selectedModuleId: id }),

  toggleBlockCollapse: (blockId) =>
    set((state) => {
      const next = new Set(state.collapsedBlocks)
      if (next.has(blockId)) next.delete(blockId)
      else next.add(blockId)
      return { collapsedBlocks: next }
    }),

  toggleBlockSection: (key) =>
    set((state) => {
      const next = new Set(state.collapsedBlockSections)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return { collapsedBlockSections: next }
    }),

  setParseResult: (data) =>
    set({
      isPlaybook: data.isPlaybook,
      plays: data.plays,
      warnings: data.warnings,
      errors: data.errors,
      activePlayIndex: 0,
      selectedModuleId: null,
    }),

  // ─── Editing actions ──────────────────────────────────────────

  updateModuleAttributes: (moduleId, updates) =>
    set((state) =>
      mutateActivePlay(state, (play) => ({
        ...play,
        modules: play.modules.map((m) =>
          m.id === moduleId ? { ...m, ...updates } : m,
        ),
      })),
    ),

  deleteModule: (moduleId) =>
    set((state) =>
      mutateActivePlay(state, (play) => {
        const modules = play.modules.filter((m) => m.id !== moduleId)
        const links = play.links.filter(
          (l) => l.from !== moduleId && l.to !== moduleId,
        )
        // Remove from block sections if it was a block child
        const updatedModules = modules.map((m) => {
          if (!m.blockSections) return m
          return {
            ...m,
            blockSections: {
              normal: m.blockSections.normal.filter((id) => id !== moduleId),
              rescue: m.blockSections.rescue.filter((id) => id !== moduleId),
              always: m.blockSections.always.filter((id) => id !== moduleId),
            },
          }
        })
        return { ...play, modules: updatedModules, links }
      }),
    ),

  addModule: (module, linkFromId) =>
    set((state) =>
      mutateActivePlay(state, (play) => {
        const modules = [...play.modules, module]
        const links = [...play.links]
        if (linkFromId) {
          links.push({
            id: `link-${Date.now()}`,
            from: linkFromId,
            to: module.id,
            type: (module.parentSection as Link['type']) ?? 'tasks',
          })
        }
        return { ...play, modules, links }
      }),
    ),

  moveModule: (moduleId, x, y) =>
    set((state) =>
      mutateActivePlay(state, (play) => ({
        ...play,
        modules: play.modules.map((m) =>
          m.id === moduleId ? { ...m, x, y } : m,
        ),
      })),
    ),

  addLink: (link) =>
    set((state) =>
      mutateActivePlay(state, (play) => ({
        ...play,
        links: [...play.links, link],
      })),
    ),

  deleteLink: (linkId) =>
    set((state) =>
      mutateActivePlay(state, (play) => ({
        ...play,
        links: play.links.filter((l) => l.id !== linkId),
      })),
    ),

  addPlay: () =>
    set((state) => {
      const newPlay: Play = {
        id: `play-${state.plays.length + 1}`,
        name: `Play ${state.plays.length + 1}`,
        modules: [],
        links: [],
        variables: [],
        attributes: { hosts: 'all' },
      }
      const plays = [...state.plays, newPlay]
      notifyEdit(plays)
      return {
        plays,
        activePlayIndex: plays.length - 1,
        lastEditTimestamp: Date.now(),
      }
    }),

  removePlay: (index) =>
    set((state) => {
      if (state.plays.length <= 1) return state
      const plays = state.plays.filter((_, i) => i !== index)
      const activePlayIndex = Math.min(state.activePlayIndex, plays.length - 1)
      notifyEdit(plays)
      return { plays, activePlayIndex, lastEditTimestamp: Date.now() }
    }),

  renamePlay: (index, name) =>
    set((state) => {
      const plays = state.plays.map((p, i) =>
        i === index ? { ...p, name } : p,
      )
      notifyEdit(plays)
      return { plays, lastEditTimestamp: Date.now() }
    }),

  updatePlayAttributes: (updates) =>
    set((state) =>
      mutateActivePlay(state, (play) => ({
        ...play,
        attributes: { ...play.attributes, ...updates },
      })),
    ),

  updatePlayVariables: (variables) =>
    set((state) =>
      mutateActivePlay(state, (play) => ({
        ...play,
        variables,
      })),
    ),

  setModulesForActivePlay: (modules) =>
    set((state) =>
      mutateActivePlay(state, (play) => ({ ...play, modules })),
    ),

  setLinksForActivePlay: (links) =>
    set((state) =>
      mutateActivePlay(state, (play) => ({ ...play, links })),
    ),

  setLinkingFrom: (id) => set({ linkingFrom: id }),
}))
