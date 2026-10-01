import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthEventsLogger } from '../auth-events.logger';
import { CoreHubIdentity, SubsystemRole } from '../core-hub-identity';
import { Permission } from '../permissions';
import { PermissionsGuard } from './permissions.guard';

function contextFor(user?: CoreHubIdentity): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user, path: '/api/v1/courses' }) }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
}

function identity(role: SubsystemRole): CoreHubIdentity {
  return {
    id: 'user-001',
    email: 'user@core.local',
    coreRole: role.toLowerCase(),
    subsystemRole: role,
  };
}

describe('PermissionsGuard - authorization tests (spec §15, §36)', () => {
  const reflector = new Reflector();
  const guard = new PermissionsGuard(reflector, new AuthEventsLogger());

  function requirePermissions(...permissions: Permission[]): void {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(permissions);
  }

  afterEach(() => jest.restoreAllMocks());

  it('allows a route with no permission metadata', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    expect(guard.canActivate(contextFor(identity(SubsystemRole.STUDENT)))).toBe(true);
  });

  it('allows STAFF to remove a place', () => {
    requirePermissions(Permission.PLACE_DELETE_ANY);
    expect(guard.canActivate(contextFor(identity(SubsystemRole.STAFF)))).toBe(true);
  });

  it('denies a STUDENT removing a place with 403', () => {
    requirePermissions(Permission.PLACE_DELETE_ANY);
    expect(() => guard.canActivate(contextFor(identity(SubsystemRole.STUDENT)))).toThrow(
      expect.objectContaining({ status: 403 }),
    );
  });

  it('denies a VIEWER adding a place (read-only role)', () => {
    requirePermissions(Permission.PLACE_CREATE);
    expect(() => guard.canActivate(contextFor(identity(SubsystemRole.VIEWER)))).toThrow(
      expect.objectContaining({ status: 403 }),
    );
    expect(guard.canActivate(contextFor(identity(SubsystemRole.ALUMNI)))).toBe(true);
  });

  it('passes when the role holds any one of the required permissions', () => {
    requirePermissions(Permission.REVIEW_DELETE_ANY, Permission.REVIEW_DELETE_OWN);
    expect(guard.canActivate(contextFor(identity(SubsystemRole.STUDENT)))).toBe(true);
  });

  it('returns 401 when no verified identity is present', () => {
    requirePermissions(Permission.PLACE_READ);
    expect(() => guard.canActivate(contextFor(undefined))).toThrow(
      expect.objectContaining({ status: 401 }),
    );
  });
});
