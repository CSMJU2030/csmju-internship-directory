/**
 * Development seed data for the Internship Directory.
 *
 * IMPORTANT: no Core Hub users, passwords or sessions are seeded here.
 * `coreUserId` values below are EXTERNAL REFERENCES to Core Hub identities
 * (the `sub` claim of a Core Hub access token) and carry no credentials.
 * user-002 = student@core.local · user-003 = staff@core.local in the Core Hub
 * seed; `seed-reviewer-*` stand for other students and match no account, so
 * nobody can edit their reviews. Like every review they keep no name or
 * email; `personCode` is null because no person is linked.
 *
 * Every company below except the university's own centre is made up - sample
 * data must not read as real reviews of real companies.
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
const reviewer = (n: number) => `seed-reviewer-${String(n).padStart(2, '0')}`;

interface SeedReview {
  score: number;
  comment?: string;
  position?: string;
  internshipYear?: number;
}

interface SeedPlace {
  name: string;
  province: string;
  latitude: number;
  longitude: number;
  dailyAllowanceSatang: number;
  workHours: string;
  notes: string;
  tags: string[];
  /** The first review is the test student's own, the rest come from seed reviewers. */
  reviews: SeedReview[];
}

const PLACES: SeedPlace[] = [
  {
    name: 'สยามไอที โซลูชั่น (นิมมานฯ)',
    province: 'เชียงใหม่',
    latitude: 18.7985,
    longitude: 98.966,
    dailyAllowanceSatang: 40_000,
    workHours: '09:00 - 18:00 น. (Hybrid เข้าออฟฟิศ 3 วัน)',
    notes: 'มีเบี้ยเลี้ยง 400 บาท/วัน เน้นงาน Mobile App และ AI มีเครื่องดื่มสวัสดิการฟรี',
    tags: ['mobile', 'ai-data'],
    reviews: [{ score: 5, comment: 'ได้ใช้ AI ช่วยเขียนโค้ดในงานจริง ตรงกับสายที่เรียนมาก', position: 'AI Engineer Intern', internshipYear: 2568 }],
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
    reviews: [{ score: 5, comment: 'ได้ทำโปรเจกต์จริงด้วย React และ Go พี่ ๆ สอนงานดีมาก', position: 'Full-stack Developer Intern', internshipYear: 2568 }],
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
    reviews: [{ score: 4, comment: 'เหมาะกับคนที่อยากฝึกงาน Infrastructure และ Admin', position: 'Network Admin Intern', internshipYear: 2568 }],
  },
  {
    name: 'ล้านนาดิจิทัล สตูดิโอ',
    province: 'เชียงใหม่',
    latitude: 18.7883,
    longitude: 98.9853,
    dailyAllowanceSatang: 30_000,
    workHours: '10:00 - 19:00 น. (เข้าออฟฟิศทุกวัน)',
    notes: 'ทำเว็บและแอปให้ลูกค้าท่องเที่ยว งานเยอะช่วงไฮซีซัน ต้องมีพอร์ตงาน Figma ตอนสัมภาษณ์',
    tags: ['uxui', 'web'],
    reviews: [
      { score: 5, comment: 'ได้ออกแบบหน้าจอที่ลูกค้าใช้จริง พี่เลี้ยงคอมเมนต์ละเอียดทุกงาน', position: 'UX/UI Designer Intern', internshipYear: 2568 },
      { score: 4, comment: 'งานสนุก แต่ช่วงใกล้ส่งงานลูกค้ากลับดึกบ้าง', position: 'Front-end Intern', internshipYear: 2567 },
      { score: 5, internshipYear: 2568 },
    ],
  },
  {
    name: 'นอร์ทเทิร์น คลาวด์ เซอร์วิส',
    province: 'ลำพูน',
    latitude: 18.5806,
    longitude: 99.0087,
    dailyAllowanceSatang: 45_000,
    workHours: '08:00 - 17:00 น. (มีเวรออนคอลสลับกัน)',
    notes: 'ดูแล Data Center ในนิคมฯ ลำพูน มีรถรับส่งจากตัวเมืองเชียงใหม่ ต้องผ่านอบรมความปลอดภัยก่อนเข้าห้องเซิร์ฟเวอร์',
    tags: ['network', 'security'],
    reviews: [
      { score: 4, comment: 'ได้จับ Linux, Docker และระบบ Monitoring ของจริง เบี้ยเลี้ยงดี', position: 'DevOps Intern', internshipYear: 2568 },
      { score: 3, comment: 'เวรออนคอลเหนื่อย แต่ได้ประสบการณ์แก้ปัญหาจริง', position: 'System Admin Intern', internshipYear: 2567 },
    ],
  },
  {
    name: 'บริษัท เชียงรายสมาร์ทฟาร์ม จำกัด',
    province: 'เชียงราย',
    latitude: 19.9105,
    longitude: 99.8406,
    dailyAllowanceSatang: 25_000,
    workHours: '08:30 - 17:00 น. (ลงพื้นที่ไร่ชาเดือนละ 2 ครั้ง)',
    notes: 'ทำระบบเซนเซอร์วัดความชื้นและแดชบอร์ดให้เกษตรกร มีที่พักให้ช่วงลงพื้นที่',
    tags: ['iot', 'ai-data'],
    reviews: [
      { score: 5, comment: 'ได้ต่อบอร์ด ESP32 เขียนเฟิร์มแวร์ แล้วเห็นข้อมูลขึ้นแดชบอร์ดจริง ภูมิใจมาก', position: 'IoT Developer Intern', internshipYear: 2568 },
      { score: 4, position: 'Data Analyst Intern', internshipYear: 2568 },
    ],
  },
  {
    name: 'ไพรม์ ฟินเทค แล็บ',
    province: 'กรุงเทพมหานคร',
    latitude: 13.7466,
    longitude: 100.5393,
    dailyAllowanceSatang: 60_000,
    workHours: '09:30 - 18:30 น. (Hybrid เข้าออฟฟิศ 2 วัน)',
    notes: 'เบี้ยเลี้ยงสูงแต่ค่าครองชีพกรุงเทพฯ สูงตาม ต้องหาที่พักเอง มีขั้นตอนตรวจโค้ดเข้มงวด',
    tags: ['web', 'security', 'testing'],
    reviews: [
      { score: 4, comment: 'ได้เรียน Code Review และ Unit Test แบบจริงจัง', position: 'Back-end Developer Intern', internshipYear: 2568 },
      { score: 5, comment: 'ทีม Security สอนเรื่อง OWASP และให้ลองทำ Pentest ในระบบทดสอบ', position: 'Security Intern', internshipYear: 2568 },
      { score: 3, comment: 'ค่าที่พักแพง เหลือเงินไม่มาก', internshipYear: 2567 },
    ],
  },
  {
    name: 'อีสานโค้ด คอมพานี',
    province: 'ขอนแก่น',
    latitude: 16.4419,
    longitude: 102.836,
    dailyAllowanceSatang: 20_000,
    workHours: '08:30 - 17:30 น. (จันทร์ - ศุกร์)',
    notes: 'ทำระบบ ERP ให้โรงงานและโรงพยาบาลในภาคอีสาน บรรยากาศเป็นกันเอง',
    tags: ['erp', 'web'],
    reviews: [
      { score: 4, comment: 'ได้เข้าใจ Business Flow ของโรงงานจริง ใช้ต่อได้ตอนทำโปรเจกต์จบ', position: 'ERP Consultant Intern', internshipYear: 2568 },
      { score: 4, internshipYear: 2567 },
    ],
  },
  {
    name: 'อันดามัน เกมเวิร์คส์',
    province: 'ภูเก็ต',
    latitude: 7.8804,
    longitude: 98.3923,
    dailyAllowanceSatang: 35_000,
    workHours: '11:00 - 20:00 น. (เข้าออฟฟิศทุกวัน)',
    notes: 'สตูดิโอเกมมือถือขนาดเล็ก ใช้ Unity ต้องส่งเกมตัวอย่างตอนสมัคร มีห้องพักพนักงานราคาถูก',
    tags: ['game', 'mobile'],
    reviews: [
      { score: 5, comment: 'ได้ทำฟีเจอร์ที่ขึ้น Store จริง ทีมเล็กเลยได้ลองทุกส่วน', position: 'Game Developer Intern', internshipYear: 2568 },
      { score: 2, comment: 'งานกดดันช่วงก่อนปล่อยอัปเดต และไกลบ้านมาก', position: 'QA Tester Intern', internshipYear: 2567 },
    ],
  },
  {
    name: 'บริษัท ลำปางดาต้าเซ็นเตอร์ จำกัด',
    province: 'ลำปาง',
    latitude: 18.2888,
    longitude: 99.4909,
    dailyAllowanceSatang: 15_000,
    workHours: '08:00 - 16:30 น. (จันทร์ - ศุกร์)',
    notes: 'งานส่วนใหญ่คือดูแลเครือข่ายและคอมพิวเตอร์ของลูกค้าหน่วยงานรัฐ มีงานเอกสารค่อนข้างมาก',
    tags: ['network'],
    reviews: [
      { score: 3, comment: 'ได้ความรู้ด้าน Network แต่ไม่ค่อยได้เขียนโปรแกรม', position: 'IT Support Intern', internshipYear: 2568 },
      { score: 2, internshipYear: 2567 },
    ],
  },
  {
    name: 'สองแควซอฟต์ จำกัด',
    province: 'พิษณุโลก',
    latitude: 16.8211,
    longitude: 100.2659,
    dailyAllowanceSatang: 0,
    workHours: '09:00 - 17:00 น. (Remote ได้วันศุกร์)',
    notes: 'ไม่มีเบี้ยเลี้ยง แต่มีที่พักฟรีใกล้ออฟฟิศ ทำเว็บให้หน่วยงานการศึกษา',
    tags: ['web', 'uxui'],
    reviews: [{ score: 3, comment: 'ไม่มีเบี้ยเลี้ยงแต่ที่พักฟรีช่วยได้มาก งานไม่หนัก', position: 'Web Developer Intern', internshipYear: 2568 }],
  },
  {
    name: 'ควอนตัม คิวเอ เซอร์วิส',
    province: 'นนทบุรี',
    latitude: 13.8621,
    longitude: 100.5144,
    dailyAllowanceSatang: 40_000,
    workHours: '09:00 - 18:00 น. (Hybrid เข้าออฟฟิศ 3 วัน)',
    notes: 'รับทดสอบซอฟต์แวร์ให้ธนาคารและประกัน ใช้ Playwright และ Postman เป็นหลัก',
    tags: ['testing', 'web'],
    reviews: [
      { score: 4, comment: 'ได้เขียน Automated Test จริง พี่ ๆ สอน Test Case Design ดีมาก', position: 'QA Automation Intern', internshipYear: 2568 },
      { score: 4, position: 'Manual Tester Intern', internshipYear: 2568 },
      { score: 5, comment: 'ได้ไปต่องานหลังฝึกจบ', internshipYear: 2567 },
    ],
  },
  {
    name: 'ม่อนแจ่ม ทราเวลเทค',
    province: 'เชียงใหม่',
    latitude: 18.9373,
    longitude: 98.8221,
    dailyAllowanceSatang: 25_000,
    workHours: '09:00 - 18:00 น. (จันทร์ - เสาร์ เว้นเสาร์)',
    notes: 'ทำระบบจองที่พักและทัวร์ ออฟฟิศอยู่แม่ริม ต้องมีรถส่วนตัว อากาศดีมาก',
    tags: ['web', 'mobile'],
    reviews: [
      { score: 4, comment: 'ได้ทำ API ระบบจองด้วย NestJS ใกล้เคียงกับที่เรียนในวิชา', position: 'Back-end Intern', internshipYear: 2568 },
      { score: 5, internshipYear: 2568 },
    ],
  },
];

async function main(): Promise<void> {
  console.log('[seed] seeding csmju_internship_directory ...');

  // Adds the sample places that are not there yet, matched by name - running
  // the seed again never duplicates a place or touches what users added.
  const existing = new Set((await prisma.internshipPlace.findMany({ select: { nameKey: true } })).map((place) => place.nameKey));
  let added = 0;

  for (const { reviews, ...place } of PLACES) {
    const nameKey = placeNameKey(place.name);
    if (existing.has(nameKey)) continue;
    await prisma.internshipPlace.create({
      data: {
        ...place,
        nameKey,
        createdByCoreUserId: STAFF,
        reviews: {
          create: reviews.map((review, index) => ({
            score: review.score,
            comment: review.comment ?? null,
            position: review.position ?? null,
            internshipYear: review.internshipYear ?? null,
            coreUserId: index === 0 ? STUDENT : reviewer(index),
            personCode: null,
          })),
        },
      },
    });
    added += 1;
  }
  console.log(`[seed] added ${added} places (${PLACES.length - added} already there)`);
}

main()
  .catch((error) => {
    console.error('[seed] failed', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
