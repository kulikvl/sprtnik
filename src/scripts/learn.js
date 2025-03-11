import 'bootstrap/dist/css/bootstrap.min.css';
// import 'bootstrap/dist/js/bootstrap.bundle.min.js';

import { LearningProgressService } from './app';
import { CardStore, Database, ImageStore } from './database';
import { CardEditor } from './editor';
import { Utils } from './utils';

function updateStats() {
  const stats = LearningProgressService.getStats();

  let value = (stats.done / stats.total) * 100;
  progressBarEl.style.width = `${value}%`;
  progressBarEl.textContent = `${stats.done} / ${stats.total}`;

  if (value === 100) {
    progressBarEl.classList.add('bg-success');
    reviewAreaEl.classList.add('d-none');
  } else {
    progressBarEl.classList.remove('bg-success');
  }
}

async function loadNextCard() {
  updateStats();
  
  const queueIds = LearningProgressService.getQueueCardIds();

  if (queueIds.length === 0) {
    return;
  }

  showAnswerBtnEl.classList.remove('d-none');
  markAreaEl.classList.add('d-none');

  currentCardId = queueIds[0];
  cardEditor.loadCardById(currentCardId);

  await cardEditor.renderCardContent({
    showQuestion: true,
    showAnswer: false,
    showTags: false,
    showEditButtons: false,
    readOnly: true,
  });
}

async function showAnswer() {
  await cardEditor.renderCardContent({
    showQuestion: true,
    showAnswer: true,
    showTags: false,
    showEditButtons: false,
    readOnly: true,
  });

  showAnswerBtnEl.classList.add('d-none');
  markAreaEl.classList.remove('d-none');
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

const database = new Database();
await database.init();

const imageStore = new ImageStore(database);
const cardStore = new CardStore(database);

const cardEditor = new CardEditor(cardStore, imageStore);
await cardEditor.init();

const showAnswerBtnEl = document.getElementById('showAnswerBtn');
const againBtnEl = document.getElementById('againBtn');
const okBtnEl = document.getElementById('okBtn');
const easyBtnEl = document.getElementById('easyBtn');
const reviewAreaEl = document.getElementById('reviewArea');
const markAreaEl = document.getElementById('markArea');
const progressBarEl = document.getElementById('progressBar');

let currentCardId = null;

showAnswerBtnEl.addEventListener('click', showAnswer);
againBtnEl.addEventListener('click', markAgain);
okBtnEl.addEventListener('click', markOk);
easyBtnEl.addEventListener('click', markEasy);

await loadNextCard();

Utils.hideLoadingScreen();
