/**
 * YAML Generator Service (TypeScript port)
 *
 * Converts the frontend's graph structure (Play[]) into valid Ansible YAML.
 * This is the inverse of yamlParser.ts which converts YAML → Play[].
 *
 * Ported from backend/app/services/playbook_yaml_service.py
 */

import { stringify } from 'yaml'
import type {
  Play,
  ModuleBlock,
  Link,
  PlayVariable,
  PlayAttributes,
  RoleDefinition,
} from '../types/playbook'
import { isBlock, isPlayStart, isSystemBlock } from '../types/playbook'

/** Task-bearing sections in order. */
const TASK_SECTIONS = ['pre_tasks', 'tasks', 'post_tasks', 'handlers'] as const
type TaskSectionName = (typeof TASK_SECTIONS)[number]

/**
 * Convert Play[] to Ansible YAML string.
 */
export function generateYaml(plays: Play[]): string {
  if (plays.length === 0) return '---\n'

  const playbook = plays.map(buildPlay)

  const yamlOutput = stringify(playbook, {
    indent: 2,
    lineWidth: 120,
    sortMapEntries: false,
    defaultKeyType: 'PLAIN',
    defaultStringType: 'PLAIN',
  })

  return '---\n' + yamlOutput
}

// ─── Internal helpers ──────────────────────────────────────────────

function buildPlay(play: Play): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  // Name
  result.name = play.name

  // Hosts (default to "all")
  const attrs = play.attributes
  result.hosts = attrs?.hosts ?? 'all'

  // Optional play-level settings
  if (attrs?.become) result.become = attrs.become
  if (attrs?.gatherFacts !== undefined) result.gather_facts = attrs.gatherFacts
  if (attrs?.remoteUser) result.remote_user = attrs.remoteUser
  if (attrs?.connection) result.connection = attrs.connection

  // Variables
  const vars = buildVars(play.variables)
  if (vars && Object.keys(vars).length > 0) {
    result.vars = vars
  }

  // Roles
  if (attrs?.roles && attrs.roles.length > 0) {
    result.roles = buildRoles(attrs.roles)
  }

  // Task sections
  for (const section of TASK_SECTIONS) {
    const orderedModules = getOrderedModules(play.modules, play.links, section)
    if (orderedModules.length === 0) continue

    const tasks = buildTasks(orderedModules, play.modules)
    if (tasks.length > 0) {
      result[section] = tasks
    }
  }

  return result
}

/**
 * Walk link chain from START node to produce execution-ordered modules.
 * Falls back to positional order if chain is broken.
 */
function getOrderedModules(
  allModules: ModuleBlock[],
  links: Link[],
  section: TaskSectionName,
): ModuleBlock[] {
  // Find START node for this section
  const start = allModules.find(
    (m) => isPlayStart(m) && m.parentSection === section,
  )
  if (!start) return []

  // Build adjacency: from → to
  const sectionLinks = links.filter((l) => l.type === section)
  const nextMap = new Map<string, string>()
  for (const link of sectionLinks) {
    nextMap.set(link.from, link.to)
  }

  // Walk chain from START
  const ordered: ModuleBlock[] = []
  const visited = new Set<string>()
  let currentId = nextMap.get(start.id)

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId)
    const mod = allModules.find((m) => m.id === currentId)
    if (!mod) break
    // Only include top-level modules (not block children)
    if (!mod.parentId) {
      ordered.push(mod)
    }
    currentId = nextMap.get(currentId)
  }

  // Fallback: include any unvisited top-level modules in position order
  const sectionModules = allModules
    .filter(
      (m) =>
        m.parentSection === section &&
        !m.parentId &&
        !isPlayStart(m) &&
        !isSystemBlock(m) &&
        !visited.has(m.id),
    )
    .sort((a, b) => a.y - b.y || a.x - b.x)

  ordered.push(...sectionModules)

  return ordered
}

function buildTasks(
  modules: ModuleBlock[],
  allModules: ModuleBlock[],
): Record<string, unknown>[] {
  const tasks: Record<string, unknown>[] = []

  for (const mod of modules) {
    if (isPlayStart(mod) || isSystemBlock(mod)) continue
    const task = buildTask(mod, allModules)
    if (task) tasks.push(task)
  }

  return tasks
}

function buildTask(
  mod: ModuleBlock,
  allModules: ModuleBlock[],
): Record<string, unknown> | null {
  const task: Record<string, unknown> = {}

  // Task name
  if (mod.taskName) {
    task.name = mod.taskName
  }

  if (isBlock(mod)) {
    // Block structure
    const sections = mod.blockSections
    if (sections) {
      const blockTasks = buildBlockSection(sections.normal, allModules)
      if (blockTasks.length > 0) task.block = blockTasks

      const rescueTasks = buildBlockSection(sections.rescue, allModules)
      if (rescueTasks.length > 0) task.rescue = rescueTasks

      const alwaysTasks = buildBlockSection(sections.always, allModules)
      if (alwaysTasks.length > 0) task.always = alwaysTasks
    }
  } else {
    // Regular task: module FQCN + parameters
    const fqcn = mod.collection ? `${mod.collection}.${mod.name}` : mod.name

    const params = mod.moduleParameters
    if (params && typeof params === 'object' && Object.keys(params).length > 0) {
      // Clean empty values
      const clean: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(params)) {
        if (v !== null && v !== undefined && v !== '') {
          clean[k] = v
        }
      }
      task[fqcn] = Object.keys(clean).length > 0 ? clean : null
    } else {
      task[fqcn] = null
    }
  }

  // Task-level attributes
  if (mod.when) task.when = mod.when
  if (mod.loop) task.loop = mod.loop
  if (mod.register) task.register = mod.register
  if (mod.ignoreErrors) task.ignore_errors = mod.ignoreErrors
  if (mod.become) task.become = mod.become
  if (mod.delegateTo) task.delegate_to = mod.delegateTo
  if (mod.tags && mod.tags.length > 0) task.tags = mod.tags

  return task
}

function buildBlockSection(
  childIds: string[],
  allModules: ModuleBlock[],
): Record<string, unknown>[] {
  const tasks: Record<string, unknown>[] = []

  for (const childId of childIds) {
    const child = allModules.find((m) => m.id === childId)
    if (!child) continue
    const task = buildTask(child, allModules)
    if (task) tasks.push(task)
  }

  return tasks
}

function buildVars(variables: PlayVariable[]): Record<string, unknown> | null {
  if (!variables || variables.length === 0) return null

  const vars: Record<string, unknown> = {}

  for (const v of variables) {
    vars[v.key] = parseVariableValue(v.value, v.type)
  }

  return vars
}

/**
 * Parse variable string value to its typed representation.
 */
function parseVariableValue(value: string, type: string): unknown {
  switch (type) {
    case 'bool':
      return value === 'true' || value === 'True' || value === 'yes'
    case 'int':
      return parseInt(value, 10) || 0
    case 'list':
      try { return JSON.parse(value) } catch { return [] }
    case 'dict':
      try { return JSON.parse(value) } catch { return {} }
    default:
      return value
  }
}

function buildRoles(
  roles: (string | RoleDefinition)[],
): unknown[] {
  return roles.map((role) => {
    if (typeof role === 'string') return role

    const result: Record<string, unknown> = { role: role.role }
    if (role.vars && Object.keys(role.vars).length > 0) result.vars = role.vars
    if (role.when) result.when = role.when
    if (role.tags && role.tags.length > 0) result.tags = role.tags
    if (role.become !== undefined) result.become = role.become
    return result
  })
}
