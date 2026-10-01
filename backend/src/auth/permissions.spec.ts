import { SubsystemRole } from './core-hub-identity';
import { Permission, ROLE_PERMISSIONS, can, canAny } from './permissions';

describe('Subsystem permission model (spec §15, §16)', () => {
  describe.each([SubsystemRole.STUDENT, SubsystemRole.ALUMNI])('%s', (role) => {
    it('reads places, adds places and writes its own reviews', () => {
      expect(can(role, Permission.PLACE_READ)).toBe(true);
      expect(can(role, Permission.PLACE_CREATE)).toBe(true);
      expect(can(role, Permission.REVIEW_CREATE)).toBe(true);
      expect(can(role, Permission.REVIEW_UPDATE_OWN)).toBe(true);
      expect(can(role, Permission.REVIEW_DELETE_OWN)).toBe(true);
    });

    it("cannot change places or remove other people's reviews", () => {
      expect(can(role, Permission.PLACE_UPDATE_ANY)).toBe(false);
      expect(can(role, Permission.PLACE_DELETE_ANY)).toBe(false);
      expect(can(role, Permission.REVIEW_DELETE_ANY)).toBe(false);
    });
  });

  describe('VIEWER', () => {
    it('can only read places', () => {
      const role = SubsystemRole.VIEWER;
      expect(can(role, Permission.PLACE_READ)).toBe(true);
      expect(can(role, Permission.PLACE_CREATE)).toBe(false);
      expect(can(role, Permission.REVIEW_CREATE)).toBe(false);
    });
  });

  describe('STAFF', () => {
    it('curates places and moderates reviews', () => {
      const role = SubsystemRole.STAFF;
      expect(can(role, Permission.PLACE_UPDATE_ANY)).toBe(true);
      expect(can(role, Permission.PLACE_DELETE_ANY)).toBe(true);
      expect(can(role, Permission.REVIEW_DELETE_ANY)).toBe(true);
    });
  });

  describe('ADMIN', () => {
    it('holds every permission', () => {
      for (const permission of Object.values(Permission)) {
        expect(can(SubsystemRole.ADMIN, permission)).toBe(true);
      }
    });
  });

  it('canAny passes when at least one permission matches', () => {
    expect(
      canAny(SubsystemRole.STUDENT, [Permission.REVIEW_DELETE_ANY, Permission.REVIEW_DELETE_OWN]),
    ).toBe(true);
    expect(canAny(SubsystemRole.VIEWER, [Permission.PLACE_CREATE, Permission.REVIEW_CREATE])).toBe(
      false,
    );
  });

  it('defines permissions for every subsystem role', () => {
    for (const role of Object.values(SubsystemRole)) {
      expect(ROLE_PERMISSIONS[role]).toBeDefined();
    }
  });

  it('names every permission <resource>:<action>[:own|:any]', () => {
    for (const permission of Object.values(Permission)) {
      expect(permission).toMatch(/^[a-z]+(-[a-z]+)*:[a-z]+(:(own|any))?$/);
    }
  });
});
