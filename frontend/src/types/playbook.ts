/**
 * Re-export all playbook types from @af/shared.
 * This file exists for backwards compatibility — all types now live in packages/shared.
 */
export {
  // Types
  type ModuleParameter,
  type ModuleSchema,
  type RoleParameter,
  type RoleEntryPoint,
  type RoleSchema,
  type RoleDefinition,
  type DraggableRoleData,
  type SystemBlockType,
  type ModuleBlock,
  type SystemBlock,
  type SystemTask,
  type Link,
  type BuiltinVariableType,
  type VariableType,
  type PlayVariable,
  type PlayAttributes,
  type Play,
  type PlaySectionName,
  type BlockSectionName,
  type SectionName,
  // Functions
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
} from '@af/shared'
