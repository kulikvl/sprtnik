import { CardStore, Database, ImageStore } from './database';
import { CardEditor } from './editor';
import { Utils } from './utils';
import { LearningProgressService } from './app';
import { ZipDataManager } from './zip';

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
  const allCards = await state.stores.card.getAll();
  const cardsWithSelectedTagsIds = allCards
    .filter(card => state.selectedTags.every(tag => card.tags?.includes(tag)))
    .map(card => card.id);

  LearningProgressService.saveLearningProgress({
    allCardIds: cardsWithSelectedTagsIds,
    queueCardIds: cardsWithSelectedTagsIds,
  });

  window.location.assign('/learn');
}

async function renderTagList() {
  state.dom.tagList.innerHTML = '';

  const tags = await state.stores.card.getAllTags();

  tags.forEach(tag => {
    const bgColor = Utils.stringToColor(tag);

    const tagBtn = document.createElement('button');
    tagBtn.textContent = tag;
    tagBtn.classList.add('tag');
    tagBtn.style.backgroundColor = bgColor;

    if (state.selectedTags.includes(tag)) {
      tagBtn.classList.add('active');
    }

    tagBtn.addEventListener('click', async () => {
      if (state.selectedTags.includes(tag)) {
        state.selectedTags = state.selectedTags.filter(t => t !== tag);
        tagBtn.classList.remove('active');
      } else {
        state.selectedTags.push(tag);
        tagBtn.classList.add('active');
      }
      await renderCardList();
    });

    state.dom.tagList.appendChild(tagBtn);
  });
}

async function openCardEditor(card, mode) {
  const cardEditor = new CardEditor(state.stores.image);
  await cardEditor.init(card, false);

  const tags = card?.tags || [];
  for (const tag of tags) {
    const bgColor = Utils.stringToColor(tag);
    const badge = document.createElement('span');
    badge.classList.add('badge', 'rounded-pill');
    badge.textContent = tag;
    badge.style.backgroundColor = bgColor;
    state.dom.cardEditor.tagList.appendChild(badge);
  }

  state.cardEditor.instance = cardEditor;
  state.cardEditor.card = card;

  switch (mode) {
    case 'edit':
      state.dom.cardEditor.label.textContent = 'Edit card';
      state.cardEditor.mode = 'edit';
      break;
    case 'add':
      state.dom.cardEditor.label.textContent = 'Add new card';
      state.cardEditor.mode = 'add';
      break;
  }

  showCardEditorModal();
}

async function renderCardList() {
  state.dom.cardList.innerHTML = '';

  let cards = await state.stores.card.getAll();

  if (state.selectedTags.length > 0) {
    cards = cards.filter(card => state.selectedTags.every(tag => card.tags?.includes(tag)));
  }

  for (const card of cards) {
    const questionSnippet = getQuestionSnippet(card.question, 20);
    const answerSnippet = getQuestionSnippet(card.answer, 20);

    const cardEl = document.createElement('button');
    cardEl.classList.add('card');
    const cardContentEl = document.createElement('div');
    cardContentEl.classList.add('card-content');
    const questionEl = document.createElement('p');
    questionEl.style.marginBottom = '0';
    questionEl.textContent = questionSnippet;
    cardContentEl.appendChild(questionEl);
    const answerEl = document.createElement('p');
    answerEl.style.color = '#99999B';
    answerEl.style.marginTop = '0.4rem';
    answerEl.textContent = answerSnippet;
    cardContentEl.appendChild(answerEl);
    cardEl.appendChild(cardContentEl);
    cardEl.addEventListener('click', async () => {
      await openCardEditor(card, 'edit');
    });

    state.dom.cardList.appendChild(cardEl);
  }
}

async function handleSaveCard() {
  const cardEditorData = await state.cardEditor.instance.getCardData();

  state.cardEditor.card = {
    ...state.cardEditor.card,
    ...cardEditorData,
    tags: state.cardEditor.tags,
  };

  switch (state.cardEditor.mode) {
    case 'edit':
      await state.stores.card.put(state.cardEditor.card);
      hideCardEditorModal();
      break;
    case 'add':
      await state.stores.card.add(state.cardEditor.card);
      await state.cardEditor.instance.setCardData(null);
      break;
  }

  await renderCardList();
  await renderTagList();
}

function showCardEditorModal() {
  state.dom.cardEditor.modal.classList.add('show');
}

function hideCardEditorModal() {
  state.dom.cardEditor.modal.classList.remove('show');
  const hideEvent = new Event('modalHidden');
  state.dom.cardEditor.modal.dispatchEvent(hideEvent);
}

// =================== Main ===================

const state = {
  cardEditor: {
    instance: null,
    mode: null,
    card: null,
    tags: [],
  },
  stores: {
    image: null,
    card: null,
  },
  dom: {
    cardList: null,
    tagList: null,
    cardEditor: {
      modal: null,
      label: null,
      tagList: null,
      tagInput: null,
    },
  },
  selectedTags: [],
};

async function main() {
  const database = new Database();
  await database.init();

  state.stores.image = new ImageStore(database);
  state.stores.card = new CardStore(database);

  const zipDataManager = new ZipDataManager(state.stores.card, state.stores.image);

  document.getElementById('exportBtn').addEventListener('click', async () => {
    const blob = await zipDataManager.exportData();
    Utils.downloadBlob(blob, 'sprtnik.zip');
  });
  const importInput = document.getElementById('importInput');
  importInput.addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    await zipDataManager.importData(file);
    await renderCardList();
    await renderTagList();
  });
  document.getElementById('importBtn').addEventListener('click', () => {
    importInput.click();
  });

  state.dom.cardList = document.getElementById('cardList');
  state.dom.tagList = document.getElementById('tagList');

  document.getElementById('learnBtn').addEventListener('click', handleLearn);

  state.dom.cardEditor.modal = document.getElementById('cardEditorModal');
  state.dom.cardEditor.modal.addEventListener('modalHidden', function () {
    if (state.cardEditor.instance) {
      state.cardEditor.instance.destroy();
    }

    state.dom.cardEditor.tagList.innerHTML = '';
    state.dom.cardEditor.tagInput.value = '';

    state.cardEditor.instance = null;
    state.cardEditor.card = null;
    state.cardEditor.tags = [];
    state.cardEditor.mode = null;
  });

  state.dom.cardEditor.label = document.getElementById('cardEditorModalLabel');

  document.getElementById('addCardBtn').addEventListener('click', async () => {
    await openCardEditor(null, 'add');
  });

  const cardEditorModalSaveBtnEl = document.getElementById('cardEditorModalSaveBtn');
  cardEditorModalSaveBtnEl.addEventListener('click', async () => {
    await handleSaveCard();
  });
  const cardEditorModalCloseBtnEl = document.getElementById('cardEditorModalCloseBtn');
  cardEditorModalCloseBtnEl.addEventListener('click', async () => {
    hideCardEditorModal();
  });

  state.dom.cardEditor.tagList = document.getElementById('cardEditorModalTagList');
  state.dom.cardEditor.tagInput = document.getElementById('cardEditorModalTagInput');
  state.dom.cardEditor.tagInput.addEventListener('keydown', event => {
    switch (event.key) {
      case 'Enter':
        const tagText = state.dom.cardEditor.tagInput.value.trim();
        state.dom.cardEditor.tagInput.value = '';

        if (
          !tagText ||
          Array.from(state.dom.cardEditor.tagList.children).some(
            child => child.textContent === tagText,
          )
        ) {
          return;
        }

        const bgColor = Utils.stringToColor(tagText);

        const badge = document.createElement('span');
        badge.classList.add('badge', 'rounded-pill');
        badge.textContent = tagText;
        badge.style.backgroundColor = bgColor;

        state.dom.cardEditor.tagList.appendChild(badge);
        state.cardEditor.tags.push(tagText);

        break;
      case 'Backspace':
        if (
          state.dom.cardEditor.tagInput.value !== '' ||
          !state.dom.cardEditor.tagList.lastElementChild
        ) {
          return;
        }

        state.dom.cardEditor.tagList.lastElementChild.remove();
        state.cardEditor.tags.pop();
        break;
    }
  });

  await renderTagList();
  await renderCardList();

  Utils.hideLoadingScreen();
}

await main();
