import JSZip from 'jszip';
import { CardStore, ImageStore } from './database';

export class ZipDataManager {
  /**
   * @type {CardStore}
   */
  #cardStore = null;

  /**
   * @type {ImageStore}
   */
  #imageStore = null;

  constructor(cardStore, imageStore) {
    this.#cardStore = cardStore;
    this.#imageStore = imageStore;
  }

  async importData(zipFile) {
    try {
      const data = await zipFile.arrayBuffer();
      const zip = await JSZip.loadAsync(data);

      const cardsFile = zip.file('cards.json');
      const cardsJsonStr = await cardsFile.async('string');
      const importedCards = JSON.parse(cardsJsonStr);

      const imagesFolder = zip.folder('images');

      const images = [];
      imagesFolder.forEach((relativePath, file) => {
        images.push([relativePath, file]);
      });
      const idRemap = {};

      for (const [id, file] of images) {
        console.log('Importing image:', id, file);
        const blob = await file.async('blob');
        const oldId = id;
        const newId = await this.#imageStore.add(blob);
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
        await this.#cardStore.add(card);
      }
    } catch (err) {
      console.error('Import failed:', err);
    }
  }

  async exportData() {
    try {
      const zip = new JSZip();

      const cards = await this.#cardStore.getAll();
      if (cards.length === 0) {
        throw new Error('No cards to export');
      }

      zip.file('cards.json', JSON.stringify(cards, null, 2));

      const imagesFolder = zip.folder('images');
      const images = await this.#imageStore.getAll();

      for (const image of images) {
        imagesFolder.file(image.id, image);
      }

      return await zip.generateAsync({ type: 'blob' });
    } catch (err) {
      console.error('Export failed:', err);
    }
  }
}
