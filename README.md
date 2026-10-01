# csmju-internship-directory

Internship Directory — **ระบบสถานที่ฝึกงาน/สหกิจศึกษา และรีวิวประสบการณ์** ระบบย่อยของโครงการ CSMJU2030
ค้นหาสถานที่ฝึกงาน ดูเบี้ยเลี้ยง ข้อควรระวัง พิกัด และรีวิวจากรุ่นพี่ เข้าใช้งานผ่าน **Core Hub SSO** เท่านั้น (ไม่มีหน้า login ของตัวเอง)

มาตรฐานกลางอยู่ใน `standards/` (submodule ของ CSMJU2030/csmju2030-standards) ผูกเวอร์ชันไว้ที่ `.standards-version`

| role (จาก Core Hub) | role ในระบบนี้ | ทำอะไรได้ |
|---|---|---|
| student | STUDENT | ดูสถานที่ · เพิ่มสถานที่ · เขียน/แก้/ลบรีวิวของตัวเอง |
| alumni | ALUMNI | เหมือน STUDENT (รุ่นพี่ที่ฝึกงานแล้ว) |
| staff · lecturer | STAFF | ทุกอย่างของ STUDENT + แก้/ลบสถานที่ · ลบรีวิวของใครก็ได้ · เห็น person code ของผู้รีวิว |
| guest | VIEWER | ดูอย่างเดียว |
| admin | ADMIN | ทุก permission (แต่แก้ข้อความรีวิวของคนอื่นไม่ได้ — ลบได้อย่างเดียว) |

## สถานะ

- ✅ **backend** (NestJS 11 + Prisma 7.9.1) — สถานที่ฝึกงาน รีวิว อันดับ ตัวกรอง ชั้น auth คัดลอกจาก `demo-student-subsystem`
- 🟡 **frontend** (Next.js 16) — หน้าครบ (รายการ+แผนที่ · รายละเอียด+รีวิว · เพิ่ม/แก้ไขสถานที่) โครงและ SSO ตาม `demo-student-subsystem`
  หน้าตายังเป็นชั่วคราว: `@csmju2030/design-system` v1.3.0 ใช้ auth คนละแบบกับ standards 1.7 (ดู REPORT.md) — รอ PM ยืนยันก่อนเปลี่ยนไปใช้ `<CsmjuAppShell>`
- ⏳ **ลงทะเบียนกับ Core Hub** และ **conformance** — ต้องใช้บัญชีเจ้าของระบบของทีม (PL ทำ)

## โครงสร้าง

```text
csmju-internship-directory/
├── backend/           NestJS 11 + Prisma 7.9.1 — พอร์ต 4218
├── frontend/          Next.js 16 App Router — พอร์ต 3218 ประตูเดียวของระบบย่อย (proxy /api/* และ /auth/* ไป backend)
├── standards/         git submodule → csmju2030-standards
├── subsystem.yaml     manifest ที่ CI และ conformance อ่าน
├── .standards-version
└── docker-compose.yml PostgreSQL ของระบบย่อยเอง (พอร์ต 5440) + backend
```

> พอร์ต frontend 3218 · backend 4218 ตามที่ผู้ดูแล dev server กำหนดให้ทีม · PostgreSQL 5440 เลือกเองให้ไม่ชนกับ 5432
> (`subsystem.yaml`, `backend/.env.example`, `docker-compose.yml`, `backend/Dockerfile`)

## เริ่มทำงาน

```bash
git submodule update --init standards          # ห้ามใส่ --remote (CI ตก GH-04)
cp backend/.env.example backend/.env           # ค่าของ Core Hub จริงอยู่ในไฟล์แล้ว
pnpm install

docker compose up -d csmju-internship-directory-db   # PostgreSQL พอร์ต 5440
pnpm --filter backend prisma:deploy
pnpm --filter backend prisma:seed              # สถานที่ตัวอย่าง 3 แห่ง

cp frontend/.env.example frontend/.env.local
pnpm dev                                       # backend :4218 + frontend :3218
```

เปิด **http://localhost:3218** (ต้องเป็น `localhost` ตรงกับ callback ที่ลงทะเบียน ไม่ใช่ 127.0.0.1)

เปิดงานใหม่ทุกครั้งให้แตก branch จาก `main` ตามรูปแบบ `feature/internship-directory/<เรื่องที่ทำ>`
และอ่าน `standards/docs/github-workflow.md` ข้อ 1 ก่อนเปิด PR

**หลัง `git pull` ทุกครั้งที่ `backend/prisma/schema.prisma` เปลี่ยน** ให้รัน `pnpm --filter backend prisma:generate`
แล้ว `pnpm --filter backend prisma:deploy` (client อยู่ใน `backend/generated/` ซึ่งไม่อยู่ใน git)

## API

ทุก endpoint อยู่ใต้ `/api/v1` ต้องมี token ของ Core Hub (header `Authorization: Bearer` หรือคุกกี้ session)
และตอบใน envelope `{ success, data, meta? }`

| method + path | permission | หมายเหตุ |
|---|---|---|
| `GET /api/v1/internship-places` | `internship-place:read` | `?page&limit&q&province&allowance=paid\|free&minRating&tag&sort&nearLat&nearLng` |
| `GET /api/v1/internship-places/tags` | `internship-place:read` | รายการสายงาน (ปิด) |
| `GET /api/v1/internship-places/:id` | `internship-place:read` | รวมรีวิว · `scoreDistribution` · `myReviewId` |
| `POST /api/v1/internship-places` | `internship-place:create` | ชื่อซ้ำ (ตัดคำว่าบริษัท/จำกัด แล้ว) → `409` |
| `PATCH /api/v1/internship-places/:id` | `internship-place:update:any` | |
| `DELETE /api/v1/internship-places/:id` | `internship-place:delete:any` | ลบรีวิวทั้งหมดของสถานที่ด้วย |
| `POST /api/v1/internship-places/:id/reviews` | `place-review:create` | 1 คน 1 รีวิวต่อสถานที่ → ซ้ำ `409` |
| `PATCH /api/v1/internship-places/:id/reviews/:reviewId` | `place-review:update:own` | เจ้าของรีวิวเท่านั้น (คนอื่น `403`) |
| `DELETE /api/v1/internship-places/:id/reviews/:reviewId` | `place-review:delete:own` / `:any` | |

- `sort`: `rank` (ค่าเริ่มต้น — ค่าเฉลี่ยถ่วงน้ำหนัก Bayesian) · `rating` · `allowance` · `reviews` · `distance` · `newest` · `name`
- เบี้ยเลี้ยงเก็บเป็นสตางค์ (`dailyAllowanceSatang`, integer) ตาม data-dictionary ข้อ 5
- ผู้รีวิวไม่ถูกระบุชื่อ — ระบบเก็บแค่ `core_user_id` และ `person_code` (จาก `GET /api/v1/people/me` ของ Core Hub ตอนเขียนรีวิว)
  ผู้ใช้ทั่วไปเห็นแค่ `isMine` · staff เห็น `personCode`

## ตรวจก่อนเปิด PR

```bash
./standards/scripts/run-all-checks.sh .     # static — เหมือน CI
pnpm --filter backend test                  # unit
pnpm --filter backend test:e2e              # Core Hub ปลอม (JWKS + /people/me) + ฐานข้อมูลในหน่วยความจำ
pnpm -r typecheck
pnpm --filter backend lint
pnpm generate:openapi                       # แก้ endpoint แล้วต้อง commit backend/openapi.json + frontend/src/lib/api-types.ts ใน PR เดียวกัน (API-01)
rm -rf frontend/.next && pnpm --filter frontend typecheck && pnpm --filter frontend build
```

**conformance (runtime)** — ต้องลงทะเบียนกับ Core Hub ก่อน และใช้บัญชีทดสอบจาก**ไฟล์นอก repo** เท่านั้น
(รูปแบบไฟล์ดู `standards/docs/conformance.md` ข้อ 2.1)

```bash
CONFORMANCE_ACCOUNTS_FILE=~/.csmju/conformance-accounts.json node standards/conformance/run.js
```

### ลงทะเบียนกับ Core Hub (PL ทำ)

login `https://csmju2030.jowave.com` ด้วยบัญชีเจ้าของระบบ (role staff) → หลังบ้าน → ระบบย่อย → ลงทะเบียนระบบย่อย

| ช่องในฟอร์ม | ค่า |
|---|---|
| ชื่อระบบ | `csmju-internship-directory` |
| ชื่อที่แสดง | `Internship Directory` |
| Repository | `github.com/CSMJU2030/csmju-internship-directory` |
| Standards version | `1.0` (ตัวเลือกเดียวของฟอร์ม) |
| Callback URL | `http://localhost:3218/auth/callback` |
| Base URL | เว้นว่าง |
| บทบาท | student→`STUDENT` · alumni→`ALUMNI` · staff→`STAFF` · lecturer→`STAFF` · guest→`VIEWER` · admin→`ADMIN` |
