import { LearningProgressService } from './app';
import { CardStore, Database, ImageStore } from './database';
import { CardViewer } from './editor';
import { Utils } from './utils';

function updateStats() {
  const stats = LearningProgressService.getStats();

  let value = (stats.done / stats.total) * 100;
  if (value === 0) value = 3;

  state.dom.progress.bar.style.width = `${value}%`;
  state.dom.progress.doneCount.textContent = `${stats.done}`;
  state.dom.progress.allCount.textContent = `/${stats.total}`;
}

async function loadNextCard() {
  updateStats();

  const queueIds = LearningProgressService.getQueueCardIds();
  if (queueIds.length === 0) {
    if (state.cardViewer.instance) {
      state.cardViewer.instance.destroy();
      state.cardViewer.instance = null;
      state.cardViewer.card = null;
    }

    state.dom.main.classList.add('hidden');
    state.dom.footer.classList.add('hidden');

    return;
  }

  state.cardViewer.card = await state.stores.card.get(queueIds[0]);

  if (!state.cardViewer.instance) {
    state.cardViewer.instance = new CardViewer(state.stores.image);
    await state.cardViewer.instance.init(state.cardViewer.card);
  } else {
    await state.cardViewer.instance.flip();
    state.cardViewer.instance.setCardData(state.cardViewer.card);
  }
}

async function flip() {
  state.cardViewer.instance.flip();
}

async function markEasy() {
  LearningProgressService.removeFirstFromQueue();
  await loadNextCard();
}

async function markOk() {
  const removedCardId = LearningProgressService.removeFirstFromQueue();
  LearningProgressService.addToQueue(removedCardId);
  await loadNextCard();
}

async function markAgain() {
  await loadNextCard();
}

// =================== Main ===================

const state = {
  stores: {
    image: null,
    card: null,
  },
  cardViewer: {
    instance: null,
    card: null,
  },
  dom: {
    footer: null,
    main: null,
    progress: {
      bar: null,
      doneCount: null,
      allCount: null,
    },
  },
};

async function main() {
  const database = new Database();
  await database.init();

  state.stores.image = new ImageStore(database);
  state.stores.card = new CardStore(database);

  const flipBtnEl = document.getElementById('flipBtn');
  const againBtnEl = document.getElementById('againBtn');
  const okBtnEl = document.getElementById('okBtn');
  const easyBtnEl = document.getElementById('easyBtn');
  state.dom.main = document.getElementById('main');
  state.dom.footer = document.getElementById('footer');
  state.dom.progress.bar = document.getElementById('progressBar');
  state.dom.progress.doneCount = document.getElementById('doneCount');
  state.dom.progress.allCount = document.getElementById('allCount');

  flipBtnEl.addEventListener('click', flip);
  againBtnEl.addEventListener('click', markAgain);
  okBtnEl.addEventListener('click', markOk);
  easyBtnEl.addEventListener('click', markEasy);

  await loadNextCard();

  Utils.hideLoadingScreen();
}

await main();
