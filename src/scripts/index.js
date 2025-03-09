import { Flashcard, LearningProgressService } from './app';
import * as db from './db';
import Utils from './utils';

console.log('index.js');

const selectedTags = new Set();

async function learn() {
  const flashcards = await db.getFlashcards({
    tags: [...selectedTags],
  });
  const flashcardIds = flashcards.map(fc => fc.id);

  LearningProgressService.saveLearningProgress({
    allCardIds: flashcardIds,
    queueCardIds: flashcardIds,
  });

  window.location.href = '/learn';
}

async function displayTags() {
  const tags = await db.getTags();
  const listDiv = document.getElementById('tagList');

  listDiv.style.display = 'flex';
  listDiv.style.flexWrap = 'wrap';
  listDiv.style.gap = '8px';

  tags.forEach(tag => {
    const tagDiv = document.createElement('div');
    tagDiv.style.border = '1px solid #ccc';
    tagDiv.style.margin = '0'; // Remove margin since we're using gap
    tagDiv.style.padding = '5px 10px'; // More horizontal padding looks better for tags
    tagDiv.style.borderRadius = '16px'; // Optional: rounded corners for a tag-like appearance
    tagDiv.style.backgroundColor = '#f0f0f0'; // Optional: light background

    tagDiv.innerHTML = tag;

    tagDiv.addEventListener('click', () => {
      if (selectedTags.has(tag)) {
        selectedTags.delete(tag);
        tagDiv.style.backgroundColor = '#f0f0f0';
        tagDiv.style.color = '#000';
      } else {
        selectedTags.add(tag);
        tagDiv.style.backgroundColor = '#007bff';
        tagDiv.style.color = '#fff';
      }
      // updateSelectedTagsDisplay();
    });

    listDiv.appendChild(tagDiv);
  });
}

async function displayFlashcards() {
  const flashcards = await db.getFlashcards();
  console.log('Flashcards:', flashcards);
  const listDiv = document.getElementById('flashcardList');
  listDiv.innerHTML = '';

  flashcards.forEach(fc => {
    const cardDiv = document.createElement('div');
    cardDiv.style.border = '1px solid #ccc';
    cardDiv.style.margin = '5px';
    cardDiv.style.padding = '5px';

    const tagsString = fc.tags && fc.tags.length > 0 ? fc.tags.join(', ') : '';

    cardDiv.innerHTML = `
      <strong>Question:</strong> ${fc.question} <br>
      <strong>Answer:</strong> ${fc.answer} <br>
      <strong>Tags:</strong> ${tagsString} <br>
      <strong>Created:</strong> ${new Date(fc.createdAt).toLocaleString()} <br>
    `;

    if (fc.questionImages && fc.questionImages.length > 0) {
      const file = fc.questionImages[0];

      const imgURL = URL.createObjectURL(file);
      const img = document.createElement('img');
      img.src = imgURL;
      img.alt = 'Stored PNG image';

      // const img = document.createElement('img');
      // img.src = fc.questionImages[0];
      // img.style.maxWidth = '200px';
      cardDiv.appendChild(img);
    }

    listDiv.appendChild(cardDiv);
  });
}

async function handleAddFlashcard(event) {
  event.preventDefault();

  const questionEl = document.getElementById('flashcardQuestion');
  const answerEl = document.getElementById('flashcardAnswer');
  const tagsEl = document.getElementById('flashcardTags');
  const questionImageInput = document.getElementById('questionImageInput');
  // const answerImageInput = document.getElementById('questionImageInput');

  const question = questionEl.value.trim();
  const answer = answerEl.value.trim();
  const tags = tagsEl.value
    .split(',')
    .map(t => t.trim())
    .filter(Boolean);

  // // Convert image to base64 if provided
  // let imageBase64 = null;
  // if (imageInput.files && imageInput.files[0]) {
  //   imageBase64 = await fileToBase64(imageInput.files[0]);
  // }
  // const file = questionImageInput.files[0];
  // if (!file) {
  //   console.log('No file selected');
  //   return;
  // }

  const flashcard = new Flashcard({
    question,
    answer,
    tags,
    // questionImages: [file],
  });

  // Store in DB
  await db.addFlashcard(flashcard);

  // Clear form
  questionEl.value = '';
  answerEl.value = '';
  tagsEl.value = '';
  questionImageInput.value = '';

  // Refresh list
  await displayFlashcards();
}

await db.initDB();
await displayFlashcards();
await displayTags();

document.getElementById('flashcardForm').addEventListener('submit', handleAddFlashcard);

document.getElementById('exportBtn').addEventListener('click', async () => {
  const blob = await db.exportFlashcardsToZip();
  Utils.downloadBlob(blob, 'sprtnik.zip');
});

const importInput = document.getElementById('importInput');
importInput.addEventListener('change', async e => {
  console.log('Importing...');
  const file = e.target.files[0];
  if (file) {
    await db.importFlashcardsFromZip(file);
    e.target.value = '';
  }
});
document.getElementById('importBtn').addEventListener('click', () => {
  importInput.click();
});

document.getElementById('learnBtn').addEventListener('click', learn);
