# REPORT — csmju-internship-directory (backend)

## ผลรัน

`./standards/scripts/run-all-checks.sh .` (Windows + Git Bash, pnpm 9.15.9 ผ่าน corepack, ไม่มี `jq` ในเครื่อง)

```
  ✅ PASS  UI Token Compliance         check-ui-tokens.sh
  ✅ PASS  Code Quality                check-qa.sh
  ✅ PASS  Exception Validation        check-exceptions.sh

✅ All 19 checks passed.
```

- `ARC-02/03` ข้ามในเครื่องเพราะไม่มี `jq` — dependency ของ backend เป็นชุดเดียวกับ `demo-student-subsystem` ทุกตัว ต้องดูผลจริงใน CI
- `API-01` สคริปต์ข้ามในเครื่องเพราะไม่มี `jq` — รันเทียบเท่าแล้ว: `pnpm --filter backend generate:openapi` แล้ว `git diff --exit-code openapi.json` ไม่มีความต่าง
- `QA-01..04` รันจริงด้วย pnpm แล้ว: lint ✅ · typecheck ✅ · test ✅ · build ✅

ผลเทสต์:

```
pnpm --filter backend test       Tests: 183 passed, 183 total   (12 suites)
pnpm --filter backend test:e2e   Tests: 119 passed, 119 total   (2 suites)
```

ทดสอบกับของจริงในเครื่อง (PostgreSQL 16 ใน Docker + Core Hub ที่ `csmju2030.jowave.com`):

```
prisma migrate deploy + seed                  ผ่าน
GET /api/health                               200 {status:"ok", service:"csmju-internship-directory"}
GET /api/v1/internship-places (ไม่มี token)    401
GET /auth/login                               302 https://csmju2030.jowave.com/sso/authorize?subsystem=csmju-internship-directory&state=…
token ปลอม                                     401 · jwks.refresh จาก Core Hub จริง keyCount 1 kid core-hub-2026
grep -iE "eyJ|access_token=|authorization:|cookie:" log   0 บรรทัด
```

`node standards/conformance/run.js` — **ยังไม่ได้รัน** ต้องลงทะเบียนระบบใน Core Hub ก่อน (ดูหัวข้อสุดท้าย)

## ไฟล์ที่สร้าง/แก้ไข

- `backend/` — คัดลอกโครงจาก `demo-student-subsystem/backend` (ลบโมดูล bookings/rooms ออก)
- `backend/src/internship-places/` — โดเมนของระบบนี้: สถานที่ฝึกงาน รีวิว อันดับ ตัวกรอง (เขียนเอง)
- `backend/prisma/schema.prisma` · `migrations/20261001000000_init` · `seed.ts` — ตาราง `internship_places` และ `place_reviews`
- `backend/src/openapi/` · `backend/openapi.json` · `src/internship-places/dto/place-responses.ts` — สร้าง `openapi.json` ด้วย `@nestjs/swagger` (tech-stack.md ข้อ 3)
- `backend/test/app.e2e-spec.ts` — คงเคส auth ของ reference ไว้ทั้งหมด และเพิ่มเคสของโดเมน
- `backend/test/sso.e2e-spec.ts` · `core-hub.integration-spec.ts` · `helpers/in-memory-prisma.ts` · `e2e-setup.ts` — เปลี่ยนชื่อระบบและ endpoint จาก rooms/bookings เป็นของระบบนี้
- `backend/src/config/configuration.ts` · `main.ts` · `health/health.controller.ts` · `.env.example` · `Dockerfile` — ชื่อระบบและพอร์ต
- `docker-compose.yml` · `.dockerignore` · `package.json` (ราก) · `subsystem.yaml` · `README.md` · `.env.example` (ราก)

## ชั้น auth ที่คัดลอกมา

- คัดลอกจาก demo-student-subsystem (commit `6724d70`, standards 1.7.0 · SSO 1.1):
  `src/auth/` ทั้งโฟลเดอร์ · `src/common/` · `src/core-hub/` · `src/config/env.validation.ts` · `src/app-setup.ts` · `src/prisma/` · `test/helpers/{boot-app,fake-core-hub,token-factory}.ts`
- แก้ไข:
  - `src/auth/role-mapping.ts` — เฉพาะค่าในตาราง (ไฟล์ที่อนุญาตให้แก้)
  - `src/auth/permissions.ts` — permission ของโดเมนนี้ (ไฟล์ที่อนุญาตให้แก้)
  - `src/auth/core-hub-identity.ts` — **เพิ่มค่า `VIEWER` ใน enum `SubsystemRole`** (ไม่ได้แก้ตรรกะ) เพื่อให้ guest ดูได้อย่างเดียว
    ในขณะที่ alumni เขียนรีวิวได้ — demo ใช้ `ALUMNI` เป็น role ดูอย่างเดียว ซึ่งใช้กับระบบนี้ไม่ได้
  - unit test `permissions.spec.ts` · `guards/permissions.guard.spec.ts` · `role-mapping.spec.ts` — ให้ตรงกับ permission ใหม่
  - `all-exceptions.filter.ts` คัดลอกหลัง 1 ต.ค. 2569 (ตัวที่ log แค่ `request.path`)

## Role mapping ที่ประกาศ (ต้องตรงกับ default_role_mapping ในทะเบียน)

| core role | subsystem role |
|---|---|
| student | STUDENT |
| alumni | ALUMNI |
| staff | STAFF |
| lecturer | STAFF |
| guest | VIEWER |
| admin | ADMIN |

## ข้อสมมติที่ตั้งเอง (เพราะมาตรฐานไม่ได้ระบุ)

1. จังหวัดเก็บเป็นข้อความ (ไม่ใช่ข้อมูลกลางใน `reference-data.md`)
2. ค่าเฉลี่ย อันดับ และตัวกรองตามคะแนน คำนวณใน service ไม่ใช่ SQL — ไดเรกทอรีมีหลักร้อยแห่ง และอันดับต้องใช้คะแนนทุกรีวิวอยู่แล้ว
3. ชื่อซ้ำตรวจด้วย `name_key` (ตัวพิมพ์เล็ก ตัดคำว่าบริษัท/จำกัด/Co., Ltd. ช่องว่าง และวรรคตอน) ซึ่งเป็น unique
3.1 1 คน 1 รีวิวต่อสถานที่ ตรวจใน service ไม่ใช้ unique key เพราะ reference-data.md ข้อ 8 ให้ `core_user_id` เป็น index ที่ไม่ unique
4. ADMIN ลบรีวิวของคนอื่นได้ แต่แก้ข้อความรีวิวของคนอื่นไม่ได้ (กันการแก้คำพูดของผู้รีวิว)
5. พอร์ต 3218/4218 ตามที่ผู้ดูแล dev server กำหนด · PostgreSQL ใช้ 5440 (เลือกเอง ไม่ชน 5432)

## สิ่งที่ยังทำไม่ได้ / เคสที่ยังไม่ผ่าน

- **conformance ยังไม่ได้รัน** — ต้องให้ PL ลงทะเบียนระบบใน Core Hub (ตาราง role mapping ด้านบน) และได้บัญชีทดสอบจากผู้ดูแล dev server
- **frontend ยังไม่มี** — `ui-design-system.md` ข้อ 17.0 ให้ใช้ template `csmju-subsystem-web` จาก repo `csmju-core-hub`
  แต่ `aie-workflow.md` ห้าม clone `csmju-core-hub` (มีข้อมูลนักศึกษาจริง) จึงต้องขอ template จาก PM ก่อน
