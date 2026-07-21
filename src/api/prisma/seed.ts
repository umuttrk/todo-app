// Yerel geliştirme/demo verisi. docs/specs/002 ve 003'teki görsel
// tasarımı (öncelik sırtı, overdue/bugün rozetleri, N/M sayacı, etiket
// chip'leri) tarayıcıda görebilmek için — henüz bir "görev oluştur/
// düzenle" paneli (subtask/tag ekleme UI'si) olmadığından, bu veriler
// doğrudan veritabanına yazılır. Çalıştırma: `npm run prisma:seed`.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function daysFromToday(offset: number): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + offset);
  return d;
}

async function upsertTag(name: string) {
  return prisma.tag.upsert({ where: { name }, update: {}, create: { name } });
}

async function main() {
  await prisma.taskTag.deleteMany();
  await prisma.subtask.deleteMany();
  await prisma.task.deleteMany();
  await prisma.tag.deleteMany();

  const [ev, finans, kisisel, is_] = await Promise.all([
    upsertTag('ev'),
    upsertTag('finans'),
    upsertTag('kişisel'),
    upsertTag('iş'),
  ]);

  const fatura = await prisma.task.create({
    data: {
      title: 'Fatura ödemesini yap',
      description: 'Elektrik + su faturası, son gün ayın 15\'i',
      priority: 'high',
      dueDate: daysFromToday(-2),
      order: 1000,
      tags: { create: [{ tagId: ev.id }, { tagId: finans.id }] },
      subtasks: {
        create: [
          { title: 'Elektrik faturasını öde', completed: true, order: 1 },
          { title: 'Su faturasını öde', completed: true, order: 2 },
          { title: 'Doğalgaz faturasını öde', completed: false, order: 3 },
          { title: 'Makbuzları arşivle', completed: false, order: 4 },
        ],
      },
    },
  });

  const toplanti = await prisma.task.create({
    data: {
      title: 'Takım toplantısına hazırlan',
      description: 'Sprint özeti ve demo akışı',
      priority: 'medium',
      dueDate: daysFromToday(0),
      order: 999,
      tags: { create: [{ tagId: is_.id }] },
    },
  });

  const kitap = await prisma.task.create({
    data: {
      title: 'Kitap oku',
      priority: 'low',
      dueDate: daysFromToday(5),
      order: 998,
      tags: { create: [{ tagId: kisisel.id }] },
    },
  });

  const market = await prisma.task.create({
    data: {
      title: 'Marketten alışveriş yap',
      priority: 'low',
      order: 997,
    },
  });

  const diş = await prisma.task.create({
    data: {
      title: 'Diş randevusu',
      priority: 'medium',
      completed: true,
      order: 1,
    },
  });

  const eskiNotlar = await prisma.task.create({
    data: {
      title: 'Eski proje notları',
      priority: 'low',
      order: 1,
      deletedAt: new Date(),
    },
  });

  // eslint-disable-next-line no-console
  console.log('Seed tamamlandı:', {
    fatura: fatura.id,
    toplanti: toplanti.id,
    kitap: kitap.id,
    market: market.id,
    diş: diş.id,
    eskiNotlar: eskiNotlar.id,
  });
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
