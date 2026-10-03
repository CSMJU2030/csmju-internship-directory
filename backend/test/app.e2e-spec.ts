/**
 * End-to-end suite for the Internship Directory (spec §36, §38, §39).
 *
 * It boots the real NestJS application - global guards, validation pipe,
 * response interceptor and exception filter included - against:
 *   - a fake Core Hub that serves its JWKS document and GET /api/v1/people/me, and
 *   - an in-memory stand-in for the subsystem database.
 *
 * The subsystem code under test is unchanged: it still downloads JWKS, selects
 * the key by `kid`, verifies RS256 signatures and enforces its own policies.
 */
import { INestApplication } from '@nestjs/common';
import { decodeJwt } from 'jose';
import request from 'supertest';
import { ReferenceDataService } from '../src/core-hub/reference-data.service';
import { bootApp } from './helpers/boot-app';
import { FakeCoreHub } from './helpers/fake-core-hub';
import { InMemoryPrisma } from './helpers/in-memory-prisma';
import {
  TestSigningKey,
  createAlgNoneToken,
  createSigningKey,
  signCoreHubToken,
  signHs256Token,
  tamperPayload,
} from './helpers/token-factory';

const STUDENT_CORE_ID = 'user-001';
const OTHER_STUDENT_CORE_ID = 'user-002';
const STAFF_CORE_ID = 'user-003';
const ADMIN_CORE_ID = 'user-004';

/** People as Core Hub's GET /api/v1/people/me returns them - the subsystem keeps personCode only. */
const STUDENT_PERSON = {
  personCode: '6500000001',
  personType: 'STUDENT',
  fullNameTh: 'นักศึกษา ทดสอบ',
  universityEmail: 'student.test@example.test',
  status: 'ACTIVE',
  coreUserId: 'user-001',
};
const STAFF_PERSON = {
  personCode: 'staff.test',
  personType: 'STAFF',
  fullNameTh: 'เจ้าหน้าที่ ทดสอบ',
  universityEmail: 'staff.test@example.test',
  status: 'ACTIVE',
  coreUserId: 'user-003',
};

describe('Internship Directory (e2e)', () => {
  let app: INestApplication;
  let coreHub: FakeCoreHub;
  let db: InMemoryPrisma;
  let key: TestSigningKey;

  let studentToken: string;
  let otherStudentToken: string;
  let alumniToken: string;
  let staffToken: string;
  let adminToken: string;

  const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    key = await createSigningKey('core-hub-2026');

    coreHub = new FakeCoreHub();
    await coreHub.start([key]);
    // Only the first student's account is linked to a person in Core Hub.
    coreHub.setPeople({ [STUDENT_CORE_ID]: STUDENT_PERSON, [STAFF_CORE_ID]: STAFF_PERSON });

    // The fake Core Hub gets a random port, so these are set here - the
    // configuration factory reads them when the testing module is compiled.
    process.env.CORE_HUB_URL = coreHub.url;
    process.env.CORE_HUB_JWKS_URL = coreHub.jwksUrl;

    db = new InMemoryPrisma();
    app = await bootApp(db);

    studentToken = await signCoreHubToken(key, {
      sub: STUDENT_CORE_ID,
      email: 'student@core.local',
      role: 'student',
    });
    otherStudentToken = await signCoreHubToken(key, {
      sub: OTHER_STUDENT_CORE_ID,
      email: 'other@core.local',
      role: 'student',
    });
    alumniToken = await signCoreHubToken(key, {
      sub: 'user-005',
      email: 'alumni@core.local',
      role: 'alumni',
    });
    staffToken = await signCoreHubToken(key, {
      sub: STAFF_CORE_ID,
      email: 'staff@core.local',
      role: 'staff',
    });
    adminToken = await signCoreHubToken(key, {
      sub: ADMIN_CORE_ID,
      email: 'admin@core.local',
      role: 'admin',
    });
  });

  beforeEach(() => {
    db.reset();
    // Every test starts with Core Hub up and nothing cached.
    coreHub.referenceDataFailure = null;
    coreHub.peopleFailure = null;
    app.get(ReferenceDataService).reset();
  });

  afterAll(async () => {
    await app?.close();
    await coreHub?.stop();
  });

  // ---------------------------------------------------------------- health --
  describe('GET /api/health (spec §21)', () => {
    it('is public and reports the service name', async () => {
      const response = await request(app.getHttpServer()).get('/api/health').expect(200);

      expect(response.body).toEqual({
        success: true,
        data: { status: 'ok', service: 'csmju-internship-directory' },
      });
    });
  });

  // ------------------------------------------------------- authentication --
  describe('Authentication (spec §36, §39)', () => {
    it('rejects a request with no token (401)', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/me').expect(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('rejects a non-Bearer Authorization scheme (401)', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/me')
        .set({ Authorization: 'Basic dXNlcjpwYXNz' })
        .expect(401);
    });

    it('rejects a malformed token (401)', async () => {
      await request(app.getHttpServer()).get('/api/v1/me').set(bearer('not-a-jwt')).expect(401);
    });

    it('rejects an expired token (401)', async () => {
      const expired = await signCoreHubToken(key, {
        role: 'staff',
        expiresInSec: -60,
        issuedAtOffsetSec: -600,
      });
      await request(app.getHttpServer()).get('/api/v1/me').set(bearer(expired)).expect(401);
    });

    it('rejects a token signed by an attacker key (401)', async () => {
      const attackerKey = await createSigningKey('core-hub-2026');
      const forged = await signCoreHubToken(attackerKey, { role: 'admin' });
      await request(app.getHttpServer()).get('/api/v1/me').set(bearer(forged)).expect(401);
    });

    it('rejects a token whose role claim was modified after signing (401)', async () => {
      const escalated = tamperPayload(studentToken, { role: 'admin' });
      await request(app.getHttpServer()).get('/api/v1/me').set(bearer(escalated)).expect(401);
    });

    it('rejects a wrong issuer (401)', async () => {
      const token = await signCoreHubToken(key, { issuer: 'evil-hub' });
      await request(app.getHttpServer()).get('/api/v1/me').set(bearer(token)).expect(401);
    });

    it('rejects a wrong audience (401)', async () => {
      const token = await signCoreHubToken(key, { audience: 'other-platform' });
      await request(app.getHttpServer()).get('/api/v1/me').set(bearer(token)).expect(401);
    });

    it('rejects an HS256 token (401)', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/me')
        .set(bearer(await signHs256Token()))
        .expect(401);
    });

    it('rejects an unsigned alg=none token (401)', async () => {
      await request(app.getHttpServer()).get('/api/v1/me').set(bearer(createAlgNoneToken())).expect(401);
    });

    it('rejects an unknown kid (401)', async () => {
      const unknown = await createSigningKey('core-hub-1999');
      const token = await signCoreHubToken(unknown);
      await request(app.getHttpServer()).get('/api/v1/me').set(bearer(token)).expect(401);
    });

    it('returns 403 for a Core Hub role this subsystem does not map', async () => {
      const token = await signCoreHubToken(key, { role: 'finance-officer' });
      const response = await request(app.getHttpServer())
        .get('/api/v1/me')
        .set(bearer(token))
        .expect(403);

      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('rejects a token that lives longer than an access token - e.g. a refresh token (401)', async () => {
      const token = await signCoreHubToken(key, { expiresInSec: 7 * 24 * 60 * 60 });
      await request(app.getHttpServer()).get('/api/v1/me').set(bearer(token)).expect(401);
    });

    it('rejects a token without iat, whose lifetime cannot be checked (401)', async () => {
      const token = await signCoreHubToken(key, { omitIat: true });
      await request(app.getHttpServer()).get('/api/v1/me').set(bearer(token)).expect(401);
    });

    it('rejects a token Core Hub issued for another subsystem (401)', async () => {
      const token = await signCoreHubToken(key, { azp: 'csmju-equipment' });
      await request(app.getHttpServer()).get('/api/v1/me').set(bearer(token)).expect(401);
    });

    it('accepts a token issued for this subsystem, and one with claims beyond the contract', async () => {
      const token = await signCoreHubToken(key, {
        azp: 'csmju-internship-directory',
        extraClaims: { faculty: 'SCI' },
      });
      await request(app.getHttpServer()).get('/api/v1/me').set(bearer(token)).expect(200);
    });

    it('never leaks a token or Authorization header in an error response', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/me')
        .set(bearer(studentToken.slice(0, -3)))
        .expect(401);

      expect(JSON.stringify(response.body)).not.toContain(studentToken.slice(0, 20));
    });
  });

  // ------------------------------------------------------------------ /me --
  describe('GET /api/v1/me (spec §22)', () => {
    it('returns the verified Core Hub identity plus the mapped subsystem role', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/me')
        .set(bearer(staffToken))
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          id: STAFF_CORE_ID,
          email: 'staff@core.local',
          coreRole: 'staff',
          subsystemRole: 'STAFF',
          // The token's exp, so a frontend can renew ahead of it.
          session: {
            expiresAt: new Date((decodeJwt(staffToken).exp as number) * 1000).toISOString(),
          },
        },
      });
    });

    it.each([
      ['student', 'STUDENT'],
      ['staff', 'STAFF'],
      ['admin', 'ADMIN'],
      ['alumni', 'ALUMNI'],
      ['lecturer', 'STAFF'],
      ['guest', 'VIEWER'],
    ])('maps core role %s to subsystem role %s', async (coreRole, subsystemRole) => {
      const token = await signCoreHubToken(key, { role: coreRole, sub: 'user-map' });
      const response = await request(app.getHttpServer())
        .get('/api/v1/me')
        .set(bearer(token))
        .expect(200);

      expect(response.body.data.subsystemRole).toBe(subsystemRole);
    });
  });


  // ------------------------------------------------------ internship places --
  describe('Internship place APIs', () => {
    const NOT_FOUND_ID = '99999999-9999-4999-8999-999999999999';

    const placeBody = (overrides: Record<string, unknown> = {}) => ({
      name: 'บริษัท เทคโนโลยีเชียงใหม่ ซอฟต์แวร์ จำกัด',
      province: 'จังหวัดเชียงใหม่',
      latitude: 18.796147,
      longitude: 98.979263,
      dailyAllowanceSatang: 35_000,
      workHours: '08:30 - 17:30 น.',
      notes: 'ตรงเวลามาก ห้ามสายเด็ดขาด',
      tags: ['web', 'testing'],
      ...overrides,
    });

    const addPlace = (token: string, body: Record<string, unknown> = placeBody()) =>
      request(app.getHttpServer()).post('/api/v1/internship-places').set(bearer(token)).send(body);

    const addReview = (token: string, placeId: string, body: Record<string, unknown>) =>
      request(app.getHttpServer())
        .post(`/api/v1/internship-places/${placeId}/reviews`)
        .set(bearer(token))
        .send(body);

    const list = (token: string, query = '') =>
      request(app.getHttpServer()).get(`/api/v1/internship-places${query}`).set(bearer(token));

    it('lets a STUDENT add a place (201), owned by the token subject', async () => {
      const response = await addPlace(studentToken).expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        name: 'บริษัท เทคโนโลยีเชียงใหม่ ซอฟต์แวร์ จำกัด',
        province: 'เชียงใหม่',
        dailyAllowanceSatang: 35_000,
        tags: ['web', 'testing'],
        averageScore: 0,
        reviewCount: 0,
        reviews: [],
        myReviewId: null,
      });
      expect(db.internshipPlace.rows[0]).toMatchObject({ createdByCoreUserId: STUDENT_CORE_ID });
    });

    it('refuses the same company under a slightly different name (409)', async () => {
      const first = await addPlace(studentToken).expect(201);
      const clash = await addPlace(alumniToken, placeBody({ name: 'เทคโนโลยี เชียงใหม่ซอฟต์แวร์' })).expect(409);

      expect(clash.body.error.code).toBe('CONFLICT');
      expect(clash.body.error.details).toMatchObject({ placeId: first.body.data.id });
    });

    it('answers 400 VALIDATION_ERROR for an invalid body', async () => {
      const response = await addPlace(staffToken, { name: '', province: 'x', notes: '' }).expect(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it.each([
      ['a one-character field of work', { tags: ['x'] }],
      ['too many fields of work', { tags: ['web', 'mobile', 'ai-data', 'network', 'uxui', 'game'] }],
      ['an allowance in baht with decimals', { dailyAllowanceSatang: 350.5 }],
      ['a negative allowance', { dailyAllowanceSatang: -1 }],
      ['a latitude out of range', { latitude: 120 }],
      ['a smuggled owner', { createdByCoreUserId: 'someone-else' }],
    ])('rejects %s (400)', async (_label, overrides) => {
      await addPlace(studentToken, placeBody(overrides)).expect(400);
    });

    it('denies a guest (VIEWER) adding a place (403) but lets them read the list', async () => {
      const guestToken = await signCoreHubToken(key, { sub: 'user-guest', role: 'guest' });
      await addPlace(guestToken).expect(403);
      await list(guestToken).expect(200);
    });

    it('answers 404 for a place that does not exist and 400 for an id that is not a UUID', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/internship-places/${NOT_FOUND_ID}`)
        .set(bearer(studentToken))
        .expect(404);
      await request(app.getHttpServer())
        .get('/api/v1/internship-places/not-a-uuid')
        .set(bearer(studentToken))
        .expect(400);
    });

    it('lists the closed list of fields of work', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/internship-places/tags')
        .set(bearer(studentToken))
        .expect(200);
      expect(response.body.data).toContainEqual({ key: 'web', label: 'Web Development', preset: true, placeCount: 0 });
    });

    it('accepts a field of work that is not in the list, and maps a preset label to its key', async () => {
      const created = await addPlace(
        studentToken,
        placeBody({ tags: ['web development', 'Data  Engineering', 'data engineering', 'WEB'] }),
      ).expect(201);
      expect(created.body.data.tags).toEqual(['web', 'Data Engineering']);

      const tags = await request(app.getHttpServer())
        .get('/api/v1/internship-places/tags')
        .set(bearer(studentToken))
        .expect(200);
      expect(tags.body.data).toContainEqual({ key: 'Data Engineering', label: 'Data Engineering', preset: false, placeCount: 1 });
      expect(tags.body.data.find((tag: { key: string }) => tag.key === 'web')).toMatchObject({ placeCount: 1 });

      const filtered = await list(studentToken, '?tag=data%20engineering').expect(200);
      expect(filtered.body.data.map((place: { id: string }) => place.id)).toEqual([created.body.data.id]);
    });

    it('lists the provinces that already have places, most used first', async () => {
      await addPlace(studentToken).expect(201);
      await addPlace(studentToken, placeBody({ name: 'Second CNX', province: 'เชียงใหม่' })).expect(201);
      await addPlace(studentToken, placeBody({ name: 'Lamphun Co', province: 'ลำพูน' })).expect(201);

      const response = await request(app.getHttpServer())
        .get('/api/v1/internship-places/provinces')
        .set(bearer(studentToken))
        .expect(200);
      expect(response.body.data).toEqual([
        { name: 'เชียงใหม่', placeCount: 2 },
        { name: 'ลำพูน', placeCount: 1 },
      ]);
    });

    describe('with places and reviews', () => {
      let paidId: string;
      let freeId: string;
      let farId: string;

      beforeEach(async () => {
        paidId = (await addPlace(staffToken).expect(201)).body.data.id;
        freeId = (
          await addPlace(
            staffToken,
            placeBody({
              name: 'ศูนย์สารสนเทศและการสื่อสาร ม.แม่โจ้',
              latitude: 18.895315,
              longitude: 99.013222,
              dailyAllowanceSatang: 0,
              notes: 'ไม่มีเบี้ยเลี้ยง แต่ได้ฝึก Network จริง',
              tags: ['network'],
            }),
          ).expect(201)
        ).body.data.id;
        farId = (
          await addPlace(
            staffToken,
            placeBody({
              name: 'Bangkok Startup',
              province: 'กรุงเทพมหานคร',
              latitude: 13.7563,
              longitude: 100.5018,
              dailyAllowanceSatang: 50_000,
              notes: 'อยู่ไกล ต้องหาที่พักเอง',
              tags: ['mobile'],
            }),
          ).expect(201)
        ).body.data.id;

        await addReview(studentToken, paidId, { score: 5, comment: 'ได้ใช้ React จริง', position: 'Frontend Intern', internshipYear: 2568 }).expect(201);
        await addReview(alumniToken, paidId, { score: 4, comment: 'พี่เลี้ยงดูแลดี' }).expect(201);
        await addReview(studentToken, farId, { score: 2, comment: 'งานหนักเกินไป' }).expect(201);
      });

      it('lists only the caller’s own reviews with their places, newest first', async () => {
        const mine = await request(app.getHttpServer())
          .get('/api/v1/internship-places/my-reviews')
          .set(bearer(studentToken))
          .expect(200);
        expect(mine.body.meta.total).toBe(2);
        const reviews: Array<{ placeId: string; createdAt: string }> = mine.body.data;
        expect(reviews.map((review) => review.placeId).sort()).toEqual([farId, paidId].sort());
        const times = reviews.map((review) => Date.parse(review.createdAt));
        expect(times).toEqual([...times].sort((x, y) => y - x));
        expect(mine.body.data.find((review: { placeId: string }) => review.placeId === farId)).toMatchObject({
          placeName: 'Bangkok Startup',
          placeProvince: 'กรุงเทพมหานคร',
          score: 2,
          isMine: true,
        });
        expect(mine.body.data[0]).not.toHaveProperty('personCode');

        const none = await request(app.getHttpServer())
          .get('/api/v1/internship-places/my-reviews')
          .set(bearer(staffToken))
          .expect(200);
        expect(none.body.data).toEqual([]);
      });

      it('computes the average and the review count', async () => {
        const response = await list(studentToken).expect(200);
        const paid = response.body.data.find((place: { id: string }) => place.id === paidId);

        expect(paid).toMatchObject({ averageScore: 4.5, reviewCount: 2, rank: 1 });
        expect(response.body.meta).toMatchObject({ total: 3, page: 1, limit: 20, totalPages: 1 });
      });

      it('ranks places with good reviews first and a poorly reviewed one last', async () => {
        const response = await list(studentToken).expect(200);
        expect(response.body.data.map((place: { id: string }) => place.id)).toEqual([paidId, freeId, farId]);
      });

      it.each([
        ['?allowance=paid', () => [paidId, farId]],
        ['?allowance=free', () => [freeId]],
        ['?tag=network', () => [freeId]],
        ['?province=%E0%B8%81%E0%B8%A3%E0%B8%B8%E0%B8%87%E0%B9%80%E0%B8%97%E0%B8%9E%E0%B8%A1%E0%B8%AB%E0%B8%B2%E0%B8%99%E0%B8%84%E0%B8%A3', () => [farId]],
        ['?minRating=4', () => [paidId]],
        ['?q=react', () => [paidId]],
        ['?q=network', () => [freeId]],
        ['?sort=allowance', () => [farId, paidId, freeId]],
        ['?sort=distance', () => [freeId, paidId, farId]],
      ])('filters and sorts with %s', async (query, expected) => {
        const response = await list(studentToken, query).expect(200);
        expect(response.body.data.map((place: { id: string }) => place.id)).toEqual(expected());
      });

      it('pages with ?page=&limit=', async () => {
        const response = await list(studentToken, '?page=2&limit=2').expect(200);
        expect(response.body.data).toHaveLength(1);
        expect(response.body.meta).toMatchObject({ total: 3, page: 2, limit: 2, totalPages: 2 });
      });

      it('rejects an unknown sort or filter value (400)', async () => {
        await list(studentToken, '?sort=price').expect(400);
        await list(studentToken, '?minRating=9').expect(400);
        await list(studentToken, '?per_page=5').expect(400);
      });

      it('shows a place with its reviews, newest first, and marks the caller’s own', async () => {
        const response = await request(app.getHttpServer())
          .get(`/api/v1/internship-places/${paidId}`)
          .set(bearer(studentToken))
          .expect(200);

        const { data } = response.body;
        expect(data.scoreDistribution).toEqual({ '1': 0, '2': 0, '3': 0, '4': 1, '5': 1 });
        expect(data.reviews.map((review: { score: number }) => review.score)).toEqual([4, 5]);
        expect(data.reviews.find((review: { isMine: boolean }) => review.isMine)).toMatchObject({
          score: 5,
          position: 'Frontend Intern',
          internshipYear: 2568,
        });
        expect(data.myReviewId).toBe(data.reviews[1].id);
      });

      it('never names a reviewer, and shows the person code to staff only', async () => {
        const asStudent = await request(app.getHttpServer())
          .get(`/api/v1/internship-places/${paidId}`)
          .set(bearer(otherStudentToken))
          .expect(200);
        const asStaff = await request(app.getHttpServer())
          .get(`/api/v1/internship-places/${paidId}`)
          .set(bearer(staffToken))
          .expect(200);

        expect(JSON.stringify(asStudent.body)).not.toContain('6500000001');
        expect(JSON.stringify(asStudent.body)).not.toContain(STUDENT_CORE_ID);
        expect(asStaff.body.data.reviews.map((review: { personCode: string | null }) => review.personCode)).toContain(
          '6500000001',
        );
        // Names and emails are neither stored nor returned.
        expect(JSON.stringify(db.placeReview.rows)).not.toContain('example.test');
        expect(JSON.stringify(db.placeReview.rows)).not.toContain('ทดสอบ');
      });

      it('stores the person code asked from Core Hub with the reviewer’s own token', async () => {
        const row = db.placeReview.rows.find((review) => review.coreUserId === STUDENT_CORE_ID);
        expect(row).toMatchObject({ personCode: '6500000001' });
        expect(db.placeReview.rows.find((review) => review.coreUserId === 'user-005')).toMatchObject({
          personCode: null,
        });
      });

      it('accepts a score without any text', async () => {
        const response = await addReview(otherStudentToken, paidId, { score: 3 }).expect(201);
        expect(response.body.data).toMatchObject({ score: 3, comment: null, isMine: true });
        await addReview(staffToken, paidId, { score: 4, comment: '   ' }).expect(201);
        expect(db.placeReview.rows.find((review) => review.coreUserId === STAFF_CORE_ID)).toMatchObject({ comment: null });
      });

      it('allows one review per person per place (409)', async () => {
        const again = await addReview(studentToken, paidId, { score: 1, comment: 'เปลี่ยนใจแล้ว' }).expect(409);
        expect(again.body.error.code).toBe('CONFLICT');
        expect(again.body.error.details.reviewId).toEqual(expect.any(String));
      });

      it('rejects a review score outside 1-5 or a year after next year (400)', async () => {
        await addReview(otherStudentToken, paidId, { score: 6, comment: 'ดีเกินไป' }).expect(400);
        await addReview(otherStudentToken, paidId, { score: 4, comment: 'มาจากอนาคต', internshipYear: 2600 }).expect(400);
      });

      it('lets the author edit their review, and nobody else - not even ADMIN (403)', async () => {
        const reviewId = db.placeReview.rows.find((review) => review.coreUserId === STUDENT_CORE_ID)!.id;
        const path = `/api/v1/internship-places/${paidId}/reviews/${reviewId}`;

        await request(app.getHttpServer()).patch(path).set(bearer(otherStudentToken)).send({ score: 1 }).expect(403);
        await request(app.getHttpServer()).patch(path).set(bearer(adminToken)).send({ score: 1 }).expect(403);
        const edited = await request(app.getHttpServer())
          .patch(path)
          .set(bearer(studentToken))
          .send({ score: 3, comment: 'แก้ไขแล้ว งานหนักขึ้น' })
          .expect(200);

        expect(edited.body.data).toMatchObject({ score: 3, comment: 'แก้ไขแล้ว งานหนักขึ้น', isMine: true });
      });

      it('lets the author or staff delete a review (200 + deleted:true) and recomputes the average', async () => {
        const mine = db.placeReview.rows.find((review) => review.coreUserId === STUDENT_CORE_ID && review.placeId === paidId)!;
        const theirs = db.placeReview.rows.find((review) => review.coreUserId === 'user-005')!;

        await request(app.getHttpServer())
          .delete(`/api/v1/internship-places/${paidId}/reviews/${theirs.id}`)
          .set(bearer(otherStudentToken))
          .expect(403);
        const deleted = await request(app.getHttpServer())
          .delete(`/api/v1/internship-places/${paidId}/reviews/${mine.id}`)
          .set(bearer(studentToken))
          .expect(200);
        expect(deleted.body.data).toEqual({ id: mine.id, deleted: true });

        await request(app.getHttpServer())
          .delete(`/api/v1/internship-places/${paidId}/reviews/${theirs.id}`)
          .set(bearer(staffToken))
          .expect(200);

        const after = await request(app.getHttpServer())
          .get(`/api/v1/internship-places/${paidId}`)
          .set(bearer(studentToken))
          .expect(200);
        expect(after.body.data).toMatchObject({ averageScore: 0, reviewCount: 0 });
      });

      it('answers 404 for a review that belongs to another place', async () => {
        const reviewOfFar = db.placeReview.rows.find((review) => review.placeId === farId)!;
        await request(app.getHttpServer())
          .delete(`/api/v1/internship-places/${paidId}/reviews/${reviewOfFar.id}`)
          .set(bearer(staffToken))
          .expect(404);
      });

      it('lets STAFF correct a place, and denies a STUDENT (403)', async () => {
        const path = `/api/v1/internship-places/${freeId}`;
        await request(app.getHttpServer()).patch(path).set(bearer(studentToken)).send({ dailyAllowanceSatang: 10_000 }).expect(403);

        const updated = await request(app.getHttpServer())
          .patch(path)
          .set(bearer(staffToken))
          .send({ dailyAllowanceSatang: 20_000, tags: ['network', 'security'] })
          .expect(200);
        expect(updated.body.data).toMatchObject({ dailyAllowanceSatang: 20_000, tags: ['network', 'security'] });
      });

      it('refuses renaming a place to the name of another (409)', async () => {
        await request(app.getHttpServer())
          .patch(`/api/v1/internship-places/${freeId}`)
          .set(bearer(staffToken))
          .send({ name: 'bangkok startup' })
          .expect(409);
      });

      it('lets STAFF remove a place with its reviews (200 + deleted:true), and denies a STUDENT (403)', async () => {
        await request(app.getHttpServer())
          .delete(`/api/v1/internship-places/${paidId}`)
          .set(bearer(studentToken))
          .expect(403);
        const response = await request(app.getHttpServer())
          .delete(`/api/v1/internship-places/${paidId}`)
          .set(bearer(staffToken))
          .expect(200);

        expect(response.body.data).toEqual({ id: paidId, deleted: true });
        expect(db.placeReview.rows.some((review) => review.placeId === paidId)).toBe(false);
        expect(db.internshipPlace.rows).toHaveLength(2);
      });
    });

    describe('when Core Hub cannot answer /people/me', () => {
      it('answers 401 when Core Hub has ended the session, and stores nothing', async () => {
        const placeId = (await addPlace(staffToken).expect(201)).body.data.id;
        coreHub.peopleFailure = { status: 401 };

        const response = await addReview(studentToken, placeId, { score: 4, comment: 'ส่งไม่ทัน' }).expect(401);
        expect(response.body.error.code).toBe('UNAUTHORIZED');
        expect(db.placeReview.rows).toHaveLength(0);
      });

      it('answers 503 with Retry-After when Core Hub is down, and stores nothing', async () => {
        const placeId = (await addPlace(staffToken).expect(201)).body.data.id;
        coreHub.peopleFailure = { status: 503 };

        const response = await addReview(studentToken, placeId, { score: 4, comment: 'รอก่อน' }).expect(503);
        expect(response.body.error.code).toBe('SERVICE_UNAVAILABLE');
        expect(response.headers['retry-after']).toBeDefined();
        expect(db.placeReview.rows).toHaveLength(0);
      });
    });
  });
});
