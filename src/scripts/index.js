import 'bootstrap/dist/css/bootstrap.min.css';

import { CardStore, Database, ImageStore } from './database';
import { CardEditor } from './editor';
import { Utils } from './utils';
import { LearningProgressService } from './app';
import { ZipDataManager } from './zip';

// import EditorJS from '@editorjs/editorjs';
// import Header from '@editorjs/header';
// import List from '@editorjs/list';
// import Image from '@editorjs/image';

// new EditorJS({
//   holder: 'test',
//   data: {
//     time: Date.now(),
//     blocks: [
//       {
//         type: 'paragraph',
//         data: {
//           text: 'Hello! Feel free to edit or insert an image.',
//         },
//       },
//     ],
//   },
//   tools: {
//     header: {
//       class: Header,
//     },
//     list: {
//       class: List,
//     },
//   },
// })

function getQuestionSnippet(editorData, maxLen = 20) {
  if (!editorData?.blocks?.length) return 'No content';

  for (const block of editorData.blocks) {
    if (block.type === 'paragraph' && block.data?.text) {
      const rawText = block.data.text.replace(/<[^>]+>/g, '');
      return rawText.slice(0, maxLen) + (rawText.length > maxLen ? '…' : '');
    }
  }
  return 'No paragraph found';
}

async function handleLearn() {
  const allCards = await cardStore.getAll();
  const cardsWithSelectedTagsIds = allCards
    .filter(card => selectedTags.every(tag => card.tags?.includes(tag)))
    .map(card => card.id);

  LearningProgressService.saveLearningProgress({
    allCardIds: cardsWithSelectedTagsIds,
    queueCardIds: cardsWithSelectedTagsIds,
  });

  console.log('start learning', cardsWithSelectedTagsIds);

  window.location.assign('/learn');
}

async function renderTagList() {
  tagListEl.innerHTML = '';

  const tags = await cardStore.getAllTags();

  tags.forEach(tag => {
    const tagBtn = document.createElement('button');
    tagBtn.textContent = tag;
    tagBtn.classList.add('btn', 'btn-sm', 'btn-outline-secondary');

    if (selectedTags.includes(tag)) {
      tagBtn.classList.add('active');
    }

    tagBtn.addEventListener('click', async () => {
      if (selectedTags.includes(tag)) {
        selectedTags = selectedTags.filter(t => t !== tag);
        tagBtn.classList.remove('active');
      } else {
        selectedTags.push(tag);
        tagBtn.classList.add('active');
      }
      await renderCardList();
    });

    tagListEl.appendChild(tagBtn);
  });
}

async function renderCardList() {
  cardListEl.innerHTML = '';

  let cards = await cardStore.getAll();

  if (selectedTags.length > 0) {
    cards = cards.filter(card => selectedTags.every(tag => card.tags.includes(tag)));
  }

  for (const card of cards) {
    const snippet = getQuestionSnippet(card.question, 20);

    const cardBtn = document.createElement('button');
    cardBtn.textContent = snippet;
    cardBtn.classList.add('btn', 'btn-sm', 'btn-outline-primary');

    if (card.id === selectedCardId) {
      cardBtn.classList.add('active');
    }

    cardBtn.addEventListener('click', async () => {
      selectedCardId = card.id;
      await cardEditor.loadCardById(card.id);
      await renderCardList();
    });

    cardListEl.appendChild(cardBtn);
  }
}

const database = new Database();
await database.init();

const imageStore = new ImageStore(database);
const cardStore = new CardStore(database);

async function handleEditorChange(action) {
  if (action === 'clear') {
    selectedCardId = null;
  }

  await renderCardList();
  await renderTagList();
}

const cardEditor = new CardEditor(cardStore, imageStore, handleEditorChange);
await cardEditor.init();
await cardEditor.renderCardContent();

let selectedCardId = null;
let selectedTags = [];

const cardListEl = document.getElementById('cardList');
const tagListEl = document.getElementById('tagList');

await renderTagList();
await renderCardList();

document.getElementById('learnBtn').addEventListener('click', handleLearn);

const zipDataManager = new ZipDataManager(cardStore, imageStore);

document.getElementById('exportBtn').addEventListener('click', async () => {
  const blob = await zipDataManager.exportData();
  Utils.downloadBlob(blob, 'sprtnik.zip');
});
const importInput = document.getElementById('importInput');
importInput.addEventListener('change', async e => {
  const file = e.target.files[0];
  if (!file) return;
  await zipDataManager.importData(file);
  console.log("target value:", e.target.value);
  await renderCardList();
  await renderTagList();
});
document.getElementById('importBtn').addEventListener('click', () => {
  importInput.click();
});

Utils.hideLoadingScreen();
