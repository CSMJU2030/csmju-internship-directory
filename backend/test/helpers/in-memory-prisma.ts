/**
 * An in-memory stand-in for PrismaService so the e2e suite can exercise the
 * real HTTP stack (guards, pipes, filters, controllers, services) without a
 * PostgreSQL instance. It supports only the query shapes this codebase uses.
 */
import { randomUUID } from 'crypto';
import { Prisma } from '../../generated/prisma/client';

type Row = Record<string, any>;

function uniqueViolation(target: string[]): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'in-memory',
    meta: { target },
  });
}

function matches(row: Row, where: Row | undefined): boolean {
  if (!where) {
    return true;
  }

  return Object.entries(where).every(([field, condition]) => {
    if (condition === undefined) {
      return true;
    }
    if (field === 'OR') {
      return (condition as Row[]).some((clause) => matches(row, clause));
    }
    if (field === 'AND') {
      return (condition as Row[]).every((clause) => matches(row, clause));
    }
    if (condition && typeof condition === 'object' && 'contains' in condition) {
      const haystack = String(row[field] ?? '');
      const needle = String((condition as Row).contains);
      return (condition as Row).mode === 'insensitive'
        ? haystack.toLowerCase().includes(needle.toLowerCase())
        : haystack.includes(needle);
    }
    if (condition && typeof condition === 'object' && !(condition instanceof Date)) {
      // { in: [...] }, { lt: x }, { gt: x } — the operators this codebase uses.
      const ops = condition as Row;
      const value = row[field];
      if ('in' in ops && !(ops.in as unknown[]).includes(value)) return false;
      if ('lt' in ops && !(value < ops.lt)) return false;
      if ('gt' in ops && !(value > ops.gt)) return false;
      return true;
    }
    if (condition instanceof Date) {
      return row[field] instanceof Date && row[field].getTime() === condition.getTime();
    }
    return row[field] === condition;
  });
}

function sortRows(rows: Row[], orderBy?: Row): Row[] {
  if (!orderBy) {
    return rows;
  }
  const [field, direction] = Object.entries(orderBy)[0] as [string, 'asc' | 'desc'];
  return [...rows].sort((a, b) => {
    const left = a[field];
    const right = b[field];
    if (left === right) return 0;
    const result = left > right ? 1 : -1;
    return direction === 'desc' ? -result : result;
  });
}

/** `include: { <relation>: true }` support: relation name -> how to load it. */
type Relations = Record<string, (row: Row) => Row | undefined>;

class Table {
  rows: Row[] = [];
  relations: Relations = {};

  constructor(
    private readonly uniqueFields: string[],
    private readonly compositeUnique: string[][] = [],
    private readonly defaults: () => Row = () => ({}),
  ) {}

  private withInclude(row: Row, include?: Row): Row {
    if (!include) {
      return row;
    }
    const loaded: Row = { ...row };
    for (const [name, wanted] of Object.entries(include)) {
      if (wanted && this.relations[name]) {
        loaded[name] = this.relations[name](row);
      }
    }
    return loaded;
  }

  private findByWhere(where: Row): Row | undefined {
    // Composite unique key, e.g. { roomCode_startsAt: { roomCode, startsAt } }
    for (const fields of this.compositeUnique) {
      const key = fields.join('_');
      if (where[key]) {
        return this.rows.find((row) => fields.every((field) => row[field] === where[key][field]));
      }
    }
    return this.rows.find((row) =>
      Object.entries(where).every(([field, value]) => row[field] === value),
    );
  }

  async findUnique({ where, include }: { where: Row; include?: Row }): Promise<Row | null> {
    const row = this.findByWhere(where);
    return row ? this.withInclude(row, include) : null;
  }

  async findFirst(args: { where?: Row; orderBy?: Row; include?: Row } = {}): Promise<Row | null> {
    const [row] = await this.findMany({ ...args, take: 1 });
    return row ?? null;
  }

  async findUniqueOrThrow(args: { where: Row }): Promise<Row> {
    const row = await this.findUnique(args);
    if (!row) {
      throw new Prisma.PrismaClientKnownRequestError('Not found', {
        code: 'P2025',
        clientVersion: 'in-memory',
      });
    }
    return row;
  }

  async findMany(
    args: { where?: Row; orderBy?: Row; skip?: number; take?: number; include?: Row } = {},
  ): Promise<Row[]> {
    const filtered = this.rows.filter((row) => matches(row, args.where));
    const sorted = sortRows(filtered, args.orderBy);
    const start = args.skip ?? 0;
    return sorted
      .slice(start, args.take === undefined ? undefined : start + args.take)
      .map((row) => this.withInclude(row, args.include));
  }

  async count({ where }: { where?: Row } = {}): Promise<number> {
    return this.rows.filter((row) => matches(row, where)).length;
  }

  async create({ data, include }: { data: Row; include?: Row }): Promise<Row> {
    for (const field of this.uniqueFields) {
      if (data[field] !== undefined && data[field] !== null) {
        if (this.rows.some((row) => row[field] === data[field])) {
          throw uniqueViolation([field]);
        }
      }
    }
    for (const fields of this.compositeUnique) {
      if (this.rows.some((row) => fields.every((field) => row[field] === data[field]))) {
        throw uniqueViolation(fields);
      }
    }

    const now = new Date();
    const row = { id: randomUUID(), ...this.defaults(), ...data, createdAt: now, updatedAt: now };
    this.rows.push(row);
    return this.withInclude(row, include);
  }

  async createMany({ data }: { data: Row[] }): Promise<{ count: number }> {
    for (const item of data) {
      await this.create({ data: item });
    }
    return { count: data.length };
  }

  async update({ where, data, include }: { where: Row; data: Row; include?: Row }): Promise<Row> {
    const row = this.findByWhere(where);
    if (!row) {
      throw new Prisma.PrismaClientKnownRequestError('Not found', {
        code: 'P2025',
        clientVersion: 'in-memory',
      });
    }
    Object.assign(row, data, { updatedAt: new Date() });
    return this.withInclude(row, include);
  }

  async deleteMany({ where }: { where?: Row } = {}): Promise<{ count: number }> {
    const before = this.rows.length;
    this.rows = this.rows.filter((row) => !matches(row, where));
    return { count: before - this.rows.length };
  }

  async delete({ where }: { where: Row }): Promise<Row> {
    const row = this.findByWhere(where);
    if (!row) {
      throw new Prisma.PrismaClientKnownRequestError('Not found', {
        code: 'P2025',
        clientVersion: 'in-memory',
      });
    }
    this.rows = this.rows.filter((candidate) => candidate !== row);
    return row;
  }
}

/** The subsystem database: internship places and their reviews. */
export class InMemoryPrisma {
  internshipPlace = new Table(['nameKey'], [], () => ({
    dailyAllowanceSatang: 0,
    workHours: null,
    tags: [],
  }));

  placeReview = new Table([], [['placeId', 'coreUserId']], () => ({
    personCode: null,
    position: null,
    internshipYear: null,
  }));

  async $connect(): Promise<void> {}
  async $disconnect(): Promise<void> {}
  async onModuleInit(): Promise<void> {}
  async onModuleDestroy(): Promise<void> {}

  /** Array form only: the operations already ran when they were built, as here. */
  async $transaction<T>(operations: Promise<T>[]): Promise<T[]> {
    return Promise.all(operations);
  }

  reset(): void {
    this.internshipPlace.rows = [];
    this.placeReview.rows = [];
  }
}
