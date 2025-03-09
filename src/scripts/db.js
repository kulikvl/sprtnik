import JSZip from 'jszip';

let db;

export function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('db', 1);

    request.onupgradeneeded = event => {
      db = event.target.result;

      if (!db.objectStoreNames.contains('flashcards')) {
        db.createObjectStore('flashcards', { keyPath: 'id', autoIncrement: true });
      }
    };

    request.onsuccess = event => {
      db = event.target.result;
      resolve();
    };

    request.onerror = event => {
      reject(`DB error: ${event.target.error}`);
    };
  });
}

export function addFlashcard(flashcard) {
  console.log('Add flashcard', flashcard);

  return new Promise((resolve, reject) => {
    const tx = db.transaction(['flashcards'], 'readwrite');
    const store = tx.objectStore('flashcards');

    const request = store.add(flashcard);
    request.onsuccess = () => {
      resolve();
    };
    request.onerror = event => {
      reject(`Add error: ${event.target.error}`);
    };
  });
}

export function getFlashcards({ ids, tags } = {}) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['flashcards'], 'readonly');
    const store = tx.objectStore('flashcards');
    const request = store.getAll();

    request.onsuccess = () => {
      let flashcards = request.result;
      if (ids) {
        flashcards = flashcards.filter(flashcard => ids.includes(flashcard.id));
      }
      if (tags) {
        flashcards = flashcards.filter(flashcard => flashcard.tags.some(tag => tags.includes(tag)));
      }
      resolve(flashcards);
    };
    request.onerror = event => {
      reject(`GetAll error: ${event.target.error}`);
    };
  });
}

export async function getOneFlashcard(id) {
  const flashcards = await getFlashcards({ ids: [id] });
  return flashcards[0];
}

export async function getTags() {
  try {
    const flashcards = await getFlashcards();

    const allTags = flashcards.reduce((tags, flashcard) => {
      if (!flashcard.tags || !Array.isArray(flashcard.tags)) {
        return tags;
      }
      return [...tags, ...flashcard.tags];
    }, []);

    const uniqueTags = [...new Set(allTags)];

    return uniqueTags.sort();
  } catch (err) {
    console.error('Error fetching tags:', err);
    return [];
  }
}

export async function exportFlashcardsToZip() {
  try {
    const allFlashcards = await getFlashcards();

    const zip = new JSZip();
    const mediaFolder = zip.folder('media');

    const strippedFlashcards = [];

    for (let i = 0; i < allFlashcards.length; i++) {
      const fc = allFlashcards[i];

      const strippedFC = {
        id: fc.id,
        question: fc.question,
        answer: fc.answer,
        tags: fc.tags,
        questionImages: [],
        answerImages: [],
        createdAt: fc.createdAt,
      };

      for (let j = 0; j < (fc.questionImages?.length || 0); j++) {
        const imageFile = fc.questionImages[j];
        const filePath = `card-${fc.id}-question-${j}.png`;
        strippedFC.questionImages.push(filePath);
        const arrayBuffer = await imageFile.arrayBuffer();
        mediaFolder.file(filePath, arrayBuffer);
      }

      for (let j = 0; j < (fc.answerImages?.length || 0); j++) {
        const imageFile = fc.answerImages[j];
        const filePath = `card-${fc.id}-answer-${j}.png`;
        strippedFC.answerImages.push(filePath);
        const arrayBuffer = await imageFile.arrayBuffer();
        mediaFolder.file(filePath, arrayBuffer);
      }

      strippedFlashcards.push(strippedFC);
    }

    zip.file('cards.json', JSON.stringify(strippedFlashcards, null, 2));
    return await zip.generateAsync({ type: 'blob' });
  } catch (err) {
    console.error('Export failed:', err);
  }
}

export function deleteAllFlashcards() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['flashcards'], 'readwrite');
    const store = tx.objectStore('flashcards');
    const request = store.clear();

    request.onsuccess = () => {
      resolve();
    };
    request.onerror = event => {
      reject(`Clear error: ${event.target.error}`);
    };
  });
}

export async function importFlashcardsFromZip(file) {
  try {
    console.log('Deleting all flashcards...');
    await deleteAllFlashcards();
    console.log('Deleted!');

    const data = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(data);

    if (!zip.files['cards.json']) {
      throw new Error('No cards.json found in the ZIP!');
    }

    const jsonStr = await zip.files['cards.json'].async('text');
    const importedFlashcards = JSON.parse(jsonStr);

    for (const fc of importedFlashcards) {
      console.log('Importing flashcard:', fc);
      const reconstructedQuestionImages = [];
      const reconstructedAnswerImages = [];

      for (const filePath of fc.questionImages) {
        const fileInZip = zip.file(`media/${filePath}`);
        if (!fileInZip) {
          throw new Error(`Missing file in ZIP: media/${filePath}`);
        }
        const arrayBuffer = await fileInZip.async('arrayBuffer');
        const mimeType = 'image/png';
        const newFile = new File([arrayBuffer], 'imported-filename', { type: mimeType });
        reconstructedQuestionImages.push(newFile);
      }

      for (const filePath of fc.answerImages) {
        const fileInZip = zip.file(`media/${filePath}`);
        if (!fileInZip) {
          throw new Error(`Missing file in ZIP: media/${filePath}`);
        }
        const arrayBuffer = await fileInZip.async('arrayBuffer');
        const mimeType = 'image/png';
        const newFile = new File([arrayBuffer], 'imported-filename', { type: mimeType });
        reconstructedAnswerImages.push(newFile);
      }

      fc.questionImages = reconstructedQuestionImages;
      fc.answerImages = reconstructedAnswerImages;

      delete fc.id;

      await addFlashcard(fc);
    }

    console.log('Import complete!');
  } catch (err) {
    console.error('Import failed:', err);
  }
}
