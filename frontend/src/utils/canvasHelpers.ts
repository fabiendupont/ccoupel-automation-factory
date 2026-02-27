/**
 * Re-export all canvas helpers from @af/shared.
 * This file exists for backwards compatibility — all helpers now live in packages/shared.
 */
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
} from '@af/shared'
