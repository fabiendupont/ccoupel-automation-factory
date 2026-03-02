import { describe, it, expect } from 'vitest'
import { BUILTIN_CATEGORIES } from '../webview/data/builtinModules'

describe('Builtin modules data', () => {
  const allModules = BUILTIN_CATEGORIES.flatMap((c) => c.modules)

  it('has at least 40 modules', () => {
    expect(allModules.length).toBeGreaterThanOrEqual(40)
  })

  it('every module has required fields', () => {
    for (const mod of allModules) {
      expect(mod.name).toBeTruthy()
      expect(typeof mod.name).toBe('string')
      expect(typeof mod.description).toBe('string')
      expect(mod.description).toBeTruthy()
      expect(typeof mod.collection).toBe('string')
    }
  })

  it('has no duplicate module names within ansible.builtin', () => {
    const builtinNames = allModules
      .filter((m) => m.collection === 'ansible.builtin')
      .map((m) => m.name)
    const unique = new Set(builtinNames)
    expect(unique.size).toBe(builtinNames.length)
  })

  it('all non-structure modules belong to ansible.builtin', () => {
    const nonStructure = allModules.filter((m) => m.collection !== '')
    for (const mod of nonStructure) {
      expect(mod.collection).toBe('ansible.builtin')
    }
  })

  it('has expected categories', () => {
    const labels = BUILTIN_CATEGORIES.map((c) => c.label)
    expect(labels).toContain('Files')
    expect(labels).toContain('System')
    expect(labels).toContain('Packages')
    expect(labels).toContain('Control')
    expect(labels).toContain('Structure')
  })
})
