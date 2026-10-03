/**
 * Development seed data for the Internship Directory.
 *
 * IMPORTANT: no Core Hub users, passwords or sessions are seeded here.
 * `coreUserId` values below are EXTERNAL REFERENCES to Core Hub identities
 * (the `sub` claim of a Core Hub access token) and carry no credentials.
 * They match the development accounts in the Core Hub seed:
 *   user-002 = student@core.local · user-003 = staff@core.local
 * Like every review they keep no name or email; `personCode` is null because
 * test accounts are linked to no person in Core Hub.
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { placeNameKey } from '../src/internship-places/place-scoring';

// Prisma 7 driver adapter, bound to the subsystem's own DATABASE_URL.
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

const STAFF = 'user-003';
const STUDENT = 'user-002';

const PLACES = [
  {
    name: 'สยามไอที โซลูชั่น (นิมมานฯ)',
    province: 'เชียงใหม่',
    latitude: 18.7985,
    longitude: 98.966,
    dailyAllowanceSatang: 40_000,
    workHours: '09:00 - 18:00 น. (Hybrid เข้าออฟฟิศ 3 วัน)',
    notes: 'มีเบี้ยเลี้ยง 400 บาท/วัน เน้นงาน Mobile App และ AI มีเครื่องดื่มสวัสดิการฟรี',
    tags: ['mobile', 'ai-data'],
    review: { score: 5, comment: 'ได้ใช้ AI ช่วยเขียนโค้ดในงานจริง ตรงกับสายที่เรียนมาก', position: 'AI Engineer Intern', internshipYear: 2568 },
  },
  {
    name: 'บริษัท เทคโนโลยีเชียงใหม่ ซอฟต์แวร์ จำกัด',
    province: 'เชียงใหม่',
    latitude: 18.796147,
    longitude: 98.979263,
    dailyAllowanceSatang: 35_000,
    workHours: '08:30 - 17:30 น. (จันทร์ - ศุกร์)',
    notes: 'ตรงเวลามาก ห้ามสายเด็ดขาด มีเบี้ยเลี้ยงวันละ 350 บาท และกาแฟฟรี',
    tags: ['web', 'testing'],
    review: { score: 5, comment: 'ได้ทำโปรเจกต์จริงด้วย React และ Go พี่ ๆ สอนงานดีมาก', position: 'Full-stack Developer Intern', internshipYear: 2568 },
  },
  {
    name: 'ศูนย์สารสนเทศและการสื่อสาร ม.แม่โจ้',
    province: 'เชียงใหม่',
    latitude: 18.895315,
    longitude: 99.013222,
    dailyAllowanceSatang: 0,
    workHours: '08:30 - 16:30 น. (วันทำการ)',
    notes: 'ไม่มีเบี้ยเลี้ยง แต่เดินทางสะดวกใน ม.แม่โจ้ ได้ฝึกระบบ Network และ Server จริง',
    tags: ['network'],
    review: { score: 4, comment: 'เหมาะกับคนที่อยากฝึกงาน Infrastructure และ Admin', position: 'Network Admin Intern', internshipYear: 2568 },
  },
];

async function main(): Promise<void> {
  console.log('[seed] seeding csmju_internship_directory ...');

  // Sample data for a fresh database only - re-running the seed leaves existing places alone.
  if ((await prisma.internshipPlace.count()) > 0) {
    console.log('[seed] places already exist - nothing to do');
    return;
  }

  for (const { review, ...place } of PLACES) {
    await prisma.internshipPlace.create({
      data: {
        ...place,
        nameKey: placeNameKey(place.name),
        createdByCoreUserId: STAFF,
        reviews: { create: { ...review, coreUserId: STUDENT, personCode: null } },
      },
    });
  }
  console.log(`[seed] added ${PLACES.length} places`);
}

main()
  .catch((error) => {
    console.error('[seed] failed', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
