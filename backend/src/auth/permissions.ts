import { SubsystemRole } from './core-hub-identity';

/**
 * Subsystem permissions (spec §16).
 *
 *   Core JWT -> Core Role -> Subsystem Role -> Permission -> Business Operation
 *
 * Business code asks for a permission, never for `role === 'admin'`.
 * `:own` variants are scope hints: the guard lets the request through and the
 * service performs the ownership check against business data.
 */
export enum Permission {
  PLACE_READ = 'internship-place:read',
  PLACE_CREATE = 'internship-place:create',
  /** Correct any place's details (name, location, allowance, notes, tags). */
  PLACE_UPDATE_ANY = 'internship-place:update:any',
  PLACE_DELETE_ANY = 'internship-place:delete:any',

  REVIEW_CREATE = 'place-review:create',
  REVIEW_UPDATE_OWN = 'place-review:update:own',
  REVIEW_DELETE_OWN = 'place-review:delete:own',
  /** Remove anyone's review (moderation); also shows each reviewer's person code. */
  REVIEW_DELETE_ANY = 'place-review:delete:any',
}

/** Students and alumni add places and review the ones they interned at. */
const CONTRIBUTOR_PERMISSIONS: Permission[] = [
  Permission.PLACE_READ,
  Permission.PLACE_CREATE,
  Permission.REVIEW_CREATE,
  Permission.REVIEW_UPDATE_OWN,
  Permission.REVIEW_DELETE_OWN,
];

/** Staff curate the directory: they fix or remove places and moderate reviews. */
const STAFF_PERMISSIONS: Permission[] = [
  ...CONTRIBUTOR_PERMISSIONS,
  Permission.PLACE_UPDATE_ANY,
  Permission.PLACE_DELETE_ANY,
  Permission.REVIEW_DELETE_ANY,
];

/** Visitors may look but not write. */
const VIEWER_PERMISSIONS: Permission[] = [Permission.PLACE_READ];

const ADMIN_PERMISSIONS: Permission[] = Object.values(Permission);

export const ROLE_PERMISSIONS: Readonly<Record<SubsystemRole, readonly Permission[]>> =
  Object.freeze({
    [SubsystemRole.STUDENT]: Object.freeze(CONTRIBUTOR_PERMISSIONS),
    [SubsystemRole.ALUMNI]: Object.freeze(CONTRIBUTOR_PERMISSIONS),
    [SubsystemRole.STAFF]: Object.freeze(STAFF_PERMISSIONS),
    [SubsystemRole.ADMIN]: Object.freeze(ADMIN_PERMISSIONS),
    [SubsystemRole.VIEWER]: Object.freeze(VIEWER_PERMISSIONS),
  });

/** Does this subsystem role hold the given permission? */
export function can(role: SubsystemRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/** Does this subsystem role hold at least one of the given permissions? */
export function canAny(role: SubsystemRole, permissions: readonly Permission[]): boolean {
  return permissions.some((permission) => can(role, permission));
}
