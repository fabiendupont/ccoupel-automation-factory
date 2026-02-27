// Types
export type {
  ModuleParameter,
  ModuleSchema,
  RoleParameter,
  RoleEntryPoint,
  RoleSchema,
  RoleDefinition,
  DraggableRoleData,
  SystemBlockType,
  ModuleBlock,
  SystemBlock,
  SystemTask,
  Link,
  BuiltinVariableType,
  VariableType,
  PlayVariable,
  PlayAttributes,
  Play,
  PlaySectionName,
  BlockSectionName,
  SectionName,
} from './types/playbook'

// Type guards and helpers from playbook
export {
  isDraggableRoleData,
  getRoleDisplayName,
  getRoleFQCN,
  isConfiguredRole,
  isBlock,
  isPlayStart,
  isTask,
  isSystemBlock,
  isSystemBlockContainer,
  isSystemTask,
  isUserBlock,
} from './types/playbook'

// Canvas helpers
export {
  GRID_SIZE,
  snapToGrid,
  isSectionCollapsed,
  isPlaySectionCollapsed,
  getBlockDimensions,
  getModuleDimensions,
  getSectionColor,
  getPlaySectionColor,
  getPlayTheme,
  isOrphan,
  getBlockTheme,
  getTaskTheme,
  getLinkStyle,
  getLinkTypeFromSource,
  getStartChainCount,
  getModuleOrVirtual,
} from './utils/canvasHelpers'

// YAML parser
export { parseYaml, isAnsiblePlaybook, TASK_LEVEL_KEYS } from './parsers/yamlParser'
export type { ParseResult } from './parsers/yamlParser'
