import JSZip from 'jszip';
import { Database } from './database';

export class ZipManager {
  public constructor(private readonly database: Database) {}

  public async importData(zipFile: File) {
    const data = await zipFile.arrayBuffer();
    const zip = await JSZip.loadAsync(data);

    const cardsFile = zip.file('cards.json')!;
    const cardsJsonStr = await cardsFile.async('string');
    const importedCards = JSON.parse(cardsJsonStr);

    const imagesFolder = zip.folder('images')!;

    const images: [string, JSZip.JSZipObject][] = [];
    imagesFolder.forEach((relativePath, file) => {
      images.push([relativePath, file]);
    });
    const idRemap: Record<string, IDBValidKey> = {};

    for (const [id, file] of images) {
      const blob = await file.async('blob');
      const oldId = id;
      const newId = await this.database.images.add(blob);
      idRemap[oldId] = newId;
    }

    for (const card of importedCards) {
      [...card.question.blocks, ...card.answer.blocks].forEach(block => {
        if (block.type === 'image' && block.data?.file?.key) {
          const oldImageKey = block.data.file.key;
          block.data.file.key = idRemap[oldImageKey];
        }
      });

      delete card.id;
      await this.database.cards.add(card);
    }
  }

  public async exportData() {
    const zip = new JSZip();

    const cards = await this.database.cards.getAll();
    if (cards.length === 0) {
      throw new Error('No cards to export');
    }

    zip.file('cards.json', JSON.stringify(cards, null, 2));

    const imagesFolder = zip.folder('images')!;
    const images = await this.database.images.getAll();

    for (const image of images) {
      imagesFolder.file(image.id.toString(), image);
    }

    return await zip.generateAsync({ type: 'blob' });
  }
}
