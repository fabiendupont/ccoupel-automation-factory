import { create } from 'zustand'
import type { Play } from '@af/shared'

interface AppState {
  plays: Play[]
  activePlayIndex: number
  selectedModuleId: string | null
  collapsedBlocks: Set<string>
  collapsedBlockSections: Set<string>
  warnings: string[]
  errors: string[]
  isPlaybook: boolean

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
}

export const useStore = create<AppState>((set) => ({
  plays: [],
  activePlayIndex: 0,
  selectedModuleId: null,
  collapsedBlocks: new Set(),
  collapsedBlockSections: new Set(['*:rescue', '*:always']),
  warnings: [],
  errors: [],
  isPlaybook: true,

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
}))
