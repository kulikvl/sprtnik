import JSZip from 'jszip';

export const schema = [
  {
    storeName: 'cards',
    options: { keyPath: 'id', autoIncrement: true },
  },
  {
    storeName: 'images',
    options: { keyPath: 'id', autoIncrement: true },
  },
];

export class Database {
  #db = null;

  constructor(dbName = 'db', dbVersion = 1) {
    this.dbName = dbName;
    this.dbVersion = dbVersion;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onupgradeneeded = event => {
        this.#db = event.target.result;
        this.#applySchema();
      };

      request.onsuccess = event => {
        this.#db = event.target.result;
        resolve();
      };

      request.onerror = event => {
        reject(`Database init error: ${event.target.error}`);
      };
    });
  }

  #applySchema() {
    schema.forEach(storeDef => {
      if (!this.#db.objectStoreNames.contains(storeDef.storeName)) {
        this.#db.createObjectStore(storeDef.storeName, storeDef.options);
      }
    });
  }

  createTransaction(storeNames, mode = 'readonly') {
    if (!this.#db) {
      throw new Error('Database is not initialized. Call init() first.');
    }
    return this.#db.transaction(storeNames, mode);
  }

  static async wrapRequest(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = e => reject(e.target.error);
    });
  }
}

class Store {
  constructor(database, storeName) {
    this.database = database;
    this.storeName = storeName;
  }

  async add(item) {
    const tx = this.database.createTransaction([this.storeName], 'readwrite');
    const store = tx.objectStore(this.storeName);
    const request = store.add(item);
    return Database.wrapRequest(request);
  }

  async put(item) {
    const tx = this.database.createTransaction([this.storeName], 'readwrite');
    const store = tx.objectStore(this.storeName);
    const request = store.put(item);
    return Database.wrapRequest(request);
  }

  async getAll() {
    const tx = this.database.createTransaction([this.storeName]);
    const store = tx.objectStore(this.storeName);
    const request = store.getAll();
    return Database.wrapRequest(request);
  }

  async get(id) {
    const tx = this.database.createTransaction([this.storeName]);
    const store = tx.objectStore(this.storeName);
    const request = store.get(id);
    return Database.wrapRequest(request);
  }

  async clear() {
    const tx = this.database.createTransaction([this.storeName], 'readwrite');
    const store = tx.objectStore(this.storeName);
    const request = store.clear();
    return Database.wrapRequest(request);
  }

  async delete(id) {
    const tx = this.database.createTransaction([this.storeName], 'readwrite');
    const store = tx.objectStore(this.storeName);
    const request = store.delete(id);
    return Database.wrapRequest(request);
  }
}

export class CardStore extends Store {
  constructor(database) {
    super(database, 'cards');
  }

  async getAllTags() {
    const cards = await this.getAll();
    const allTags = cards.reduce((tags, card) => {
      if (!card.tags || !Array.isArray(card.tags)) {
        return tags;
      }
      return [...tags, ...card.tags];
    }, []);
    return [...new Set(allTags)].sort();
  }
}

export class ImageStore extends Store {
  constructor(database) {
    super(database, 'images');
  }
}
