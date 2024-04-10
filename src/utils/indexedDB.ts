export interface MyDatabase extends IDBDatabase {
    items: IDBObjectStore;
}

interface IndexDefinition {
    name: string;
    keyPath: string | string[];
    options?: IDBIndexParameters;
}

interface ObjectStoreDefinition {
    name: string;
    keyPath: string | string[];
    indexes?: IndexDefinition[];
}

export async function openDB(dbName: string, version: number, objectStores: ObjectStoreDefinition[]): Promise<MyDatabase> {
    return new Promise<MyDatabase>((resolve, reject) => {
        const request = window.indexedDB.open(dbName, version);

        request.onerror = (event) => {
            reject((event.target as IDBRequest).error);
        };

        request.onsuccess = (event) => {
            const db = (event.target as IDBRequest).result as MyDatabase;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBRequest).result as MyDatabase;
            for (const store of objectStores) {
                const objectStore = db.createObjectStore(store.name, { keyPath: store.keyPath, autoIncrement: true });
                if (store.indexes) {
                    for (const index of store.indexes) {
                        objectStore.createIndex(index.name, index.keyPath, index.options);
                    }
                }
            }
        };
    });
}

export async function addItem(db: MyDatabase, storeName: string, item: any): Promise<number> {
    return new Promise<number>((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const objectStore = transaction.objectStore(storeName);
        const request = objectStore.add(item);

        request.onsuccess = (event) => {
            resolve((event.target as IDBRequest).result as number);
        };

        request.onerror = (event) => {
            reject((event.target as IDBRequest).error);
        };
    });
}

export async function updateItem(db: MyDatabase, storeName: string, itemId: any, newData: any): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        // 开启读写事务
        const transaction = db.transaction([storeName], 'readwrite');
        const objectStore = transaction.objectStore(storeName);

        // 使用 get() 方法获取要更新的记录
        const request = objectStore.get(itemId);

        request.onsuccess = (event) => {
            // 检查记录是否存在
            const item = (event.target as IDBRequest).result;
            if (item) {
                // 更新记录的属性
                for (const key in newData) {
                    if (Object.prototype.hasOwnProperty.call(newData, key)) {
                        item[key] = newData[key];
                    }
                }

                // 使用 put() 方法保存更新后的记录
                const updateRequest = objectStore.put(item);
                updateRequest.onsuccess = () => {
                    resolve();
                };
                updateRequest.onerror = (event) => {
                    reject((event.target as IDBRequest).error);
                };
            } else {
                // 记录不存在，抛出错误
                reject(new Error('Record not found'));
            }
        };

        request.onerror = (event) => {
            reject((event.target as IDBRequest).error);
        };
    });
}

export async function deleteItem(db: MyDatabase, storeName: string, itemId: any): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        // 开启读写事务
        const transaction = db.transaction([storeName], 'readwrite');
        const objectStore = transaction.objectStore(storeName);

        // 使用 delete() 方法删除指定 itemId 的记录
        const request = objectStore.delete(itemId);

        request.onsuccess = () => {
            // 删除成功
            resolve();
        };

        request.onerror = (event) => {
            // 删除失败
            reject((event.target as IDBRequest).error);
        };
    });
}

export async function deleteByMultipleIndexes(db: MyDatabase, storeName: string, indexes: { indexName: string, value: any }[]): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const objectStore = transaction.objectStore(storeName);
        let cursorRequest: IDBRequest;

        // 使用游标范围查询
        const keyRange = IDBKeyRange.only(indexes[0].value);
        const index = objectStore.index(indexes[0].indexName);
        cursorRequest = index.openCursor(keyRange);

        cursorRequest.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
            if (cursor) {
                let match = true;
                // 检查其他索引字段是否匹配
                for (const { indexName, value } of indexes.slice(1)) {
                    const fieldValue = cursor.value[indexName];
                    if (fieldValue !== value) {
                        match = false;
                        break;
                    }
                }
                // 如果所有索引字段都匹配，则删除该项
                if (match) {
                    const deleteRequest = cursor.delete();
                    deleteRequest.onsuccess = () => {
                        // 继续遍历下一个游标
                        cursor.continue();
                    };
                    deleteRequest.onerror = (event) => {
                        reject((event.target as IDBRequest).error);
                    };
                } else {
                    // 继续遍历下一个游标
                    cursor.continue();
                }
            } else {
                // 游标结束，返回
                resolve();
            }
        };

        cursorRequest.onerror = (event) => {
            reject((event.target as IDBRequest).error);
        };
    });
}


export async function getAllItems(db: MyDatabase, storeName: string): Promise<any[]> {
    return new Promise<any[]>((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const objectStore = transaction.objectStore(storeName);
        const request = objectStore.getAll();

        request.onsuccess = (event) => {
            resolve((event.target as IDBRequest).result as any[]);
        };

        request.onerror = (event) => {
            reject((event.target as IDBRequest).error);
        };
    });
}


export async function getItemById(db: MyDatabase, storeName: string, itemId: any): Promise<any> {
    return new Promise<any>((resolve, reject) => {
        // 开启只读事务
        const transaction = db.transaction([storeName], 'readonly');
        const objectStore = transaction.objectStore(storeName);

        // 使用 get() 方法获取指定 itemId 的记录
        const request = objectStore.get(itemId);

        request.onsuccess = (event) => {
            // 返回查询结果
            resolve((event.target as IDBRequest).result);
        };

        request.onerror = (event) => {
            reject((event.target as IDBRequest).error);
        };
    });
}

export async function getByMultipleIndexes(db: MyDatabase, storeName: string, indexes: { indexName: string, value: any }[]): Promise<any[]> {
    return new Promise<any[]>((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const objectStore = transaction.objectStore(storeName);
        let cursorRequest: IDBRequest;

        // 使用游标范围查询
        const keyRange = IDBKeyRange.only(indexes[0].value);
        const index = objectStore.index(indexes[0].indexName);
        cursorRequest = index.openCursor(keyRange);

        const results: any[] = [];

        cursorRequest.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
            if (cursor) {
                console.log("cursorRequest",cursor.value)
                let match = true;
                // 检查其他索引字段是否匹配
                for (const { indexName, value } of indexes.slice(1)) {
                    const fieldValue = cursor.value[indexName];
                    if (fieldValue !== value) {
                        match = false;
                        break;
                    }
                }
                // 如果所有索引字段都匹配，则将结果添加到结果集中
                if (match) {
                    results.push(cursor.value);
                }
                // 继续遍历下一个游标
                cursor.continue();
            } else {
                // 游标结束，返回结果集
                resolve(results);
            }
        };

        cursorRequest.onerror = (event) => {
            reject((event.target as IDBRequest).error);
        };
    });
}

export async function getByIndex(db: MyDatabase, storeName: string, indexName: string, value: any): Promise<any[]> {
    return new Promise<any[]>((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const objectStore = transaction.objectStore(storeName);
        const index = objectStore.index(indexName);
        const request = index.getAll(value);

        request.onsuccess = (event) => {
            resolve((event.target as IDBRequest).result as any[]);
        };

        request.onerror = (event) => {
            reject((event.target as IDBRequest).error);
        };
    });
}

export async function getByTimeIndex(db: MyDatabase, storeName: string, indexName: string, minValue: any, maxValue: any): Promise<any[]> {
    return new Promise<any[]>((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const objectStore = transaction.objectStore(storeName);
        const index = objectStore.index(indexName);

        // 创建一个 IDBKeyRange 对象，用于指定范围
        const range = IDBKeyRange.bound(minValue, maxValue, true, true);
        
        // 使用 getAll 方法并传入范围对象来获取符合条件的记录
        const request = index.getAll(range);

        request.onsuccess = (event) => {
            resolve((event.target as IDBRequest).result as any[]);
        };

        request.onerror = (event) => {
            reject((event.target as IDBRequest).error);
        };
    });
}