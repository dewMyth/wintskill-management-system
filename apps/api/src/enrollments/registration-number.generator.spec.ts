import type { Batch, Course, Prisma } from '../generated/prisma/client.js';
import { CourseBatchSequenceGenerator } from './registration-number.generator.js';

function txWithCounter(start: number) {
  let lastSeq = start;
  const update = vi.fn(async () => ({ batchId: 'b1', lastSeq: ++lastSeq }));
  return {
    tx: { batchCounter: { update } } as unknown as Prisma.TransactionClient,
    update,
  };
}

const ctx = {
  course: { code: 'BB' } as Course,
  batch: { id: 'b1', code: '2026/03' } as Batch,
};

describe('CourseBatchSequenceGenerator', () => {
  it('builds WINT / course code / batch code / 3-digit sequence', async () => {
    const { tx, update } = txWithCounter(0);
    const generator = new CourseBatchSequenceGenerator();
    await expect(generator.next(tx, ctx)).resolves.toBe('WINT/BB/2026/03/001');
    await expect(generator.next(tx, ctx)).resolves.toBe('WINT/BB/2026/03/002');
    expect(update).toHaveBeenCalledWith({
      where: { batchId: 'b1' },
      data: { lastSeq: { increment: 1 } },
    });
  });

  it('keeps counting past 999', async () => {
    const { tx } = txWithCounter(999);
    await expect(
      new CourseBatchSequenceGenerator().next(tx, ctx),
    ).resolves.toBe('WINT/BB/2026/03/1000');
  });
});
