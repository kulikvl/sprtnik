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
    console.log('Deleting all data...');
    await this.#cardStore.clear();
    await this.#imageStore.clear();

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

    for (const [fileName, file] of images) {
      // const fileData = imagesFolder.file(filename);
      console.log('Importing image:', fileName, file);
      const blob = await file.async('blob'); // or 'arrayBuffer'
      const oldId = fileName;
      const newId = await this.#imageStore.add(blob);
      idRemap[oldId] = newId;
    }

    for (const card of importedCards) {
      card.question.blocks.forEach(block => {
        if (block.type === 'image' && block.data?.file?.key) {
          const oldImageKey = block.data.file.key.toString();
          if (idRemap[oldImageKey]) {
            block.data.file.key = idRemap[oldImageKey];
          }
        }
      });
      card.answer.blocks.forEach(block => {
        if (block.type === 'image' && block.data?.file?.key) {
          const oldImageKey = block.data.file.key.toString();
          if (idRemap[oldImageKey]) {
            block.data.file.key = idRemap[oldImageKey];
          }
        }
      });
    }

    for (const c of importedCards) {
      await this.#cardStore.add(c);
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
