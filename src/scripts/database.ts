import type { OutputData } from '@editorjs/editorjs';

export interface DefaultEntity {
  id: number;
}

export interface Card extends DefaultEntity {
  question: OutputData;
  answer: OutputData;
  tags: string[];
}

export type CardQuestionAnswerData = Pick<Card, 'question' | 'answer'>;

export type Image = DefaultEntity & Blob;

interface StoreSchema {
  name: string;
  options: IDBObjectStoreParameters;
}

const schema: StoreSchema[] = [
  {
    name: 'cards',
    options: { keyPath: 'id', autoIncrement: true },
  },
  {
    name: 'images',
    options: { keyPath: 'id', autoIncrement: true },
  },
];

function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

class Store<T extends DefaultEntity> {
  private readonly db: IDBDatabase;
  private readonly storeName: string;

  public constructor(db: IDBDatabase, storeName: string) {
    this.db = db;
    this.storeName = storeName;
  }

  private txn(mode: IDBTransactionMode = 'readonly') {
    return this.db.transaction(this.storeName, mode).objectStore(this.storeName);
  }

  public add(item: Omit<T, 'id'>) {
    const store = this.txn('readwrite');
    return promisifyRequest(store.add(item)) as Promise<number>;
  }

  public put(item: T) {
    const store = this.txn('readwrite');
    return promisifyRequest(store.put(item)) as Promise<number>;
  }

  public get(id: number) {
    const store = this.txn('readonly');
    return promisifyRequest(store.get(id)) as Promise<T>;
  }

  public getAll(): Promise<T[]> {
    const store = this.txn('readonly');
    return promisifyRequest(store.getAll()) as Promise<T[]>;
  }

  public delete(id: number) {
    const store = this.txn('readwrite');
    return promisifyRequest(store.delete(id)) as Promise<void>;
  }

  public clear() {
    const store = this.txn('readwrite');
    return promisifyRequest(store.clear()) as Promise<void>;
  }
}

class CardStore extends Store<Card> {
  constructor(db: IDBDatabase) {
    super(db, 'cards');
  }

  public async getAllTags() {
    const cards = await this.getAll();
    const tagSet = new Set<string>();
    cards.forEach(card => {
      if (Array.isArray(card.tags)) {
        card.tags.forEach(tag => tagSet.add(tag));
      }
    });
    return [...tagSet].sort();
  }
}

class ImageStore extends Store<Image> {
  public constructor(db: IDBDatabase) {
    super(db, 'images');
  }
}

export class Database {
  private db!: IDBDatabase;

  public constructor(
    private readonly name = 'app-db',
    private readonly version = 1,
  ) {}

  public async open() {
    this.db = await new Promise((resolve, reject) => {
      const req = indexedDB.open(this.name, this.version);
      req.onupgradeneeded = event => {
        const db = (event.target as IDBOpenDBRequest).result;
        schema.forEach(storeDef => {
          if (!db.objectStoreNames.contains(storeDef.name)) {
            db.createObjectStore(storeDef.name, storeDef.options);
          }
        });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    return this;
  }

  public close() {
    this.db.close();
  }

  public get cards() {
    return new CardStore(this.db);
  }

  public get images() {
    return new ImageStore(this.db);
  }
}
