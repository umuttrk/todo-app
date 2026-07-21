// docs/specs/003-gorev-listesi.md — üst bar etiket filtresi ve kart
// etiket chip'leri için okuma yolu. Tag CRUD (oluştur/yeniden
// adlandır/sil, PRD §9) ayrı bir spec'in kapsamındadır, burada yalnızca
// listeleme implemente edilir.
import { prisma } from '../prismaClient';

export async function listTags() {
  return prisma.tag.findMany({ orderBy: { name: 'asc' } });
}
