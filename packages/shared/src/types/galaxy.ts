/**
 * Types for Ansible Galaxy collection browsing.
 */

/** Summary info about a Galaxy collection. */
export interface CollectionInfo {
  namespace: string
  name: string
  version: string
  description: string
}

/** A module found inside a Galaxy collection. */
export interface GalaxyModuleInfo {
  name: string
  namespace: string
  collection: string
  description: string
}
