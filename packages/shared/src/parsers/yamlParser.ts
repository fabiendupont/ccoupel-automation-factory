/**
 * YAML Parser Service (TypeScript port)
 *
 * Parses Ansible YAML playbooks into the frontend's graph structure (Play[]).
 * This is the inverse of PlaybookYamlService which converts graph → YAML.
 *
 * Ported from backend/app/services/yaml_parser_service.py
 */

import { parseAllDocuments } from 'yaml'
import type {
  Play,
  ModuleBlock,
  Link,
  PlayVariable,
  PlayAttributes,
  VariableType,
} from '../types/playbook'

/** The 4 task-bearing sections of a play (excludes 'variables' and 'roles'). */
type TaskSectionName = 'pre_tasks' | 'tasks' | 'post_tasks' | 'handlers'

/**
 * Ansible task-level keys that are NOT module keys.
 * When identifying which key in a task dict is the module, we skip these.
 */
export const TASK_LEVEL_KEYS = new Set([
  'name', 'when', 'loop', 'with_items', 'with_dict', 'register',
  'ignore_errors', 'changed_when', 'failed_when', 'notify', 'tags',
  'become', 'become_user', 'delegate_to', 'run_once', 'environment',
  'vars', 'no_log', 'any_errors_fatal', 'check_mode', 'diff',
  'throttle', 'timeout', 'retries', 'delay', 'until', 'listen',
  'collections', 'module_defaults', 'block', 'rescue', 'always',
  'with_fileglob', 'with_first_found', 'with_together', 'with_subelements',
])

export interface ParseResult {
  plays: Play[]
  warnings: string[]
  errors: string[]
}

/**
 * Parse YAML content into plays.
 */
export function parseYaml(yamlContent: string): ParseResult {
  const warnings: string[] = []
  const errors: string[] = []

  const { documents, errors: loadErrors } = loadYamlDocuments(yamlContent)
  errors.push(...loadErrors)

  if (documents === null) {
    return { plays: [], warnings, errors }
  }

  const plays: Play[] = []
  let playIndex = 0

  for (const doc of documents) {
    if (Array.isArray(doc)) {
      for (const playDict of doc) {
        if (playDict !== null && typeof playDict === 'object' && !Array.isArray(playDict)) {
          plays.push(parsePlay(playDict as Record<string, unknown>, playIndex))
          playIndex++
        }
      }
    } else if (doc !== null && typeof doc === 'object' && !Array.isArray(doc)) {
      plays.push(parsePlay(doc as Record<string, unknown>, playIndex))
      playIndex++
    }
  }

  return { plays, warnings, errors }
}

/**
 * Detect whether a YAML string looks like an Ansible playbook.
 *
 * Heuristic: the top-level structure is a list of dicts, and at least one dict
 * contains a key that is typical of a play (hosts, tasks, roles, pre_tasks, etc.).
 */
export function isAnsiblePlaybook(content: string): boolean {
  try {
    const { documents } = loadYamlDocuments(content)
    if (documents === null || documents.length === 0) return false

    const playKeys = new Set([
      'hosts', 'tasks', 'pre_tasks', 'post_tasks', 'handlers', 'roles',
      'gather_facts', 'become', 'vars', 'vars_files', 'vars_prompt',
      'environment', 'collections', 'module_defaults',
    ])

    for (const doc of documents) {
      const items = Array.isArray(doc) ? doc : [doc]
      for (const item of items) {
        if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
          const keys = Object.keys(item as Record<string, unknown>)
          if (keys.some(k => playKeys.has(k))) {
            return true
          }
        }
      }
    }
    return false
  } catch {
    return false
  }
}

// ─── Internal helpers ──────────────────────────────────────────────

function loadYamlDocuments(yamlContent: string): { documents: unknown[] | null; errors: string[] } {
  const errors: string[] = []
  try {
    const docs = parseAllDocuments(yamlContent)
    const parsed: unknown[] = []
    for (const doc of docs) {
      if (doc.errors.length > 0) {
        for (const err of doc.errors) {
          errors.push(`YAML parsing error: ${err.message}`)
        }
        return { documents: null, errors }
      }
      const value = doc.toJSON()
      if (value !== null && value !== undefined) {
        parsed.push(value)
      }
    }
    if (parsed.length === 0) {
      return { documents: null, errors }
    }
    return { documents: parsed, errors }
  } catch (e) {
    return { documents: null, errors: [`YAML parsing error: ${e}`] }
  }
}

function parsePlay(playDict: Record<string, unknown>, playIndex: number): Play {
  const playId = `play-${playIndex + 1}`
  const idCounter = { value: 0 }

  const attributes = extractAttributes(playDict)
  const variables = extractVariables(playDict)

  const allModules: ModuleBlock[] = []
  const allLinks: Link[] = []

  const sections: TaskSectionName[] = ['pre_tasks', 'tasks', 'post_tasks', 'handlers']

  for (const section of sections) {
    const tasks = playDict[section]
    if (!Array.isArray(tasks) || tasks.length === 0) continue

    const { modules, links } = parseSection(tasks, playId, section, idCounter)
    allModules.push(...modules)
    allLinks.push(...links)
  }

  return {
    id: playId,
    name: (playDict.name as string) ?? `Play ${playIndex + 1}`,
    modules: allModules,
    links: allLinks,
    variables,
    attributes,
  }
}

function extractAttributes(playDict: Record<string, unknown>): PlayAttributes {
  const attrs: PlayAttributes = {}
  if ('hosts' in playDict) attrs.hosts = String(playDict.hosts)
  if ('remote_user' in playDict) attrs.remoteUser = String(playDict.remote_user)
  if ('gather_facts' in playDict) attrs.gatherFacts = Boolean(playDict.gather_facts)
  if ('become' in playDict) attrs.become = Boolean(playDict.become)
  if ('connection' in playDict) attrs.connection = String(playDict.connection)
  if ('roles' in playDict) attrs.roles = playDict.roles as PlayAttributes['roles']
  return attrs
}

function extractVariables(playDict: Record<string, unknown>): PlayVariable[] {
  const rawVars = playDict.vars
  if (!rawVars || typeof rawVars !== 'object' || Array.isArray(rawVars)) return []

  const variables: PlayVariable[] = []
  for (const [key, value] of Object.entries(rawVars as Record<string, unknown>)) {
    variables.push({
      key,
      value: String(value),
      type: inferType(value),
      required: true,
    })
  }
  return variables
}

function inferType(value: unknown): VariableType {
  if (typeof value === 'boolean') return 'bool'
  if (typeof value === 'number') {
    return Number.isInteger(value) ? 'int' : 'string'
  }
  if (Array.isArray(value)) return 'list'
  if (typeof value === 'object' && value !== null) return 'dict'
  return 'string'
}

function parseSection(
  tasks: unknown[],
  playId: string,
  section: TaskSectionName,
  idCounter: { value: number },
): { modules: ModuleBlock[]; links: Link[] } {
  const sectionSlug = section.replace('_', '-')
  const startId = `${playId}-start-${sectionSlug}`

  const startModule: ModuleBlock = {
    id: startId,
    collection: '',
    name: section.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    x: 50,
    y: 20,
    isPlay: true,
    parentSection: section,
  }

  const modules: ModuleBlock[] = [startModule]
  const links: Link[] = []
  let prevId = startId

  for (let taskIndex = 0; taskIndex < tasks.length; taskIndex++) {
    const taskDict = tasks[taskIndex]
    if (taskDict === null || typeof taskDict !== 'object' || Array.isArray(taskDict)) continue

    const result = parseTask(
      taskDict as Record<string, unknown>,
      playId,
      section,
      idCounter,
    )
    if (result === null) continue

    const { module, childModules } = result

    // Position top-level tasks
    module.x = 200
    module.y = 20 + taskIndex * 120

    modules.push(module)
    modules.push(...childModules)

    // Chain link from previous to current
    idCounter.value++
    links.push({
      id: `link-${idCounter.value}`,
      from: prevId,
      to: module.id,
      type: section,
    })
    prevId = module.id
  }

  return { modules, links }
}

function parseTask(
  taskDict: Record<string, unknown>,
  _playId: string,
  section: string,
  idCounter: { value: number },
  parentId?: string,
  parentSection?: string,
): { module: ModuleBlock; childModules: ModuleBlock[] } | null {
  const childModules: ModuleBlock[] = []

  // Check if this is a block
  if ('block' in taskDict) {
    idCounter.value++
    const blockId = `block-${idCounter.value}`

    const blockSections: NonNullable<ModuleBlock['blockSections']> = {
      normal: [],
      rescue: [],
      always: [],
    }

    // Parse block/rescue/always children
    const sectionMapping: Array<['normal' | 'rescue' | 'always', string]> = [
      ['normal', 'block'],
      ['rescue', 'rescue'],
      ['always', 'always'],
    ]

    for (const [blockSectionName, blockKey] of sectionMapping) {
      const sectionTasks = taskDict[blockKey]
      if (!Array.isArray(sectionTasks)) continue

      for (const childTask of sectionTasks) {
        if (childTask === null || typeof childTask !== 'object' || Array.isArray(childTask)) continue

        const childResult = parseTask(
          childTask as Record<string, unknown>,
          _playId,
          section,
          idCounter,
          blockId,
          blockSectionName,
        )
        if (childResult === null) continue

        // Position children relative to block
        childResult.module.x = 50
        childResult.module.y = 20 + blockSections[blockSectionName].length * 120
        blockSections[blockSectionName].push(childResult.module.id)
        childModules.push(childResult.module)
        childModules.push(...childResult.childModules)
      }
    }

    const module: ModuleBlock = {
      id: blockId,
      collection: '',
      name: (taskDict.name as string) ?? 'Block',
      x: 0,
      y: 0,
      isBlock: true,
      blockSections,
      parentSection: (parentSection ?? section) as ModuleBlock['parentSection'],
    }

    if (taskDict.name) {
      module.taskName = taskDict.name as string
    }

    if (parentId) {
      module.parentId = parentId
    }

    applyTaskAttributes(module, taskDict)

    return { module, childModules }
  }

  // Regular task — identify module key
  const moduleKey = identifyModuleKey(taskDict)
  if (moduleKey === null) return null

  idCounter.value++
  const moduleId = `module-${idCounter.value}`

  const { collection, name } = splitFqcn(moduleKey)

  const module: ModuleBlock = {
    id: moduleId,
    collection,
    name,
    x: 0,
    y: 0,
    parentSection: (parentSection ?? section) as ModuleBlock['parentSection'],
  }

  if (taskDict.name) {
    module.taskName = taskDict.name as string
  }

  if (parentId) {
    module.parentId = parentId
  }

  // Module parameters
  const params = taskDict[moduleKey]
  if (params !== undefined && params !== null) {
    module.moduleParameters = typeof params === 'object' ? params as Record<string, unknown> : params as Record<string, unknown>
  }

  applyTaskAttributes(module, taskDict)

  return { module, childModules }
}

function identifyModuleKey(taskDict: Record<string, unknown>): string | null {
  for (const key of Object.keys(taskDict)) {
    if (!TASK_LEVEL_KEYS.has(key)) {
      return key
    }
  }
  return null
}

function splitFqcn(moduleKey: string): { collection: string; name: string } {
  const lastDot = moduleKey.lastIndexOf('.')
  if (lastDot !== -1) {
    return {
      collection: moduleKey.substring(0, lastDot),
      name: moduleKey.substring(lastDot + 1),
    }
  }
  return { collection: '', name: moduleKey }
}

function applyTaskAttributes(module: ModuleBlock, taskDict: Record<string, unknown>): void {
  if ('when' in taskDict) module.when = String(taskDict.when)
  if ('register' in taskDict) module.register = String(taskDict.register)
  if ('loop' in taskDict) module.loop = String(taskDict.loop)
  if ('tags' in taskDict) module.tags = taskDict.tags as string[]
  if (taskDict.ignore_errors) module.ignoreErrors = Boolean(taskDict.ignore_errors)
  if (taskDict.become !== undefined) module.become = Boolean(taskDict.become)
  if (taskDict.delegate_to) module.delegateTo = String(taskDict.delegate_to)
}
