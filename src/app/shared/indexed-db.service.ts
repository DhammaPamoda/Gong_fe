import { Injectable } from '@angular/core';

import * as idb from 'idb';
import { IDBPDatabase, IDBPObjectStore } from 'idb/lib/entry';

import { EnumUtils } from '../utils/enumUtils';

export enum DbObjectTypeEnum {
  COURSES = 'COURSES',
  AREAS = 'AREAS',
  GONGS = 'GONGS',
  PERMISSIONS = 'PERMISSIONS',
}

export interface DbRecordInterface {
  id: string;
  data: any;
}


@Injectable({
  providedIn: 'root'
})
export class IndexedDbService {

  private dbObjectParametersMap: { [key: string]: { dbName: string, objectStoreName: string } } = {};

  constructor() {
    this.dbObjectParametersMap[DbObjectTypeEnum.COURSES] = { dbName: 'gong-db', objectStoreName: DbObjectTypeEnum.COURSES };
    this.dbObjectParametersMap[DbObjectTypeEnum.AREAS] = { dbName: 'gong-db', objectStoreName: DbObjectTypeEnum.AREAS };
    this.dbObjectParametersMap[DbObjectTypeEnum.GONGS] = { dbName: 'gong-db', objectStoreName: DbObjectTypeEnum.GONGS };
    this.dbObjectParametersMap[DbObjectTypeEnum.PERMISSIONS] = { dbName: 'gong-db', objectStoreName: DbObjectTypeEnum.PERMISSIONS };
  }

  saveDataArray2DB(dbObjectType: DbObjectTypeEnum, dataArray: Array<any>,
    dataExtractorFunc = (val) => val,
    idExtractorFunc = (val) => val.id
  ): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      if (!dataArray || !Array.isArray(dataArray)) {
        resolve(true);
        return;
      }
      this.openDb(dbObjectType)
        .then((db) => {
          const store = this.getStore(db, dbObjectType, 'readwrite');
          const promisesArray: Promise<any>[] = [];
          dataArray.forEach((recordData) => {
            const newRecordId = idExtractorFunc(recordData);
            const newRecordValue = dataExtractorFunc(recordData);
            promisesArray.push(store.put(newRecordValue, newRecordId));
          });
          Promise.all(promisesArray)
            .then(() => resolve(true))
            .catch((error) => reject(error));
        });
    });
  }

  getAllStoredDataRecords(dbObjectType: DbObjectTypeEnum): Promise<Array<any>> {
    return new Promise<Array<any>>((resolve, reject) => {
      this.openDb(dbObjectType).then(async (db) => {
        const store = this.getStore(db, dbObjectType, 'readonly');

        store.getAll().then((retArray) => resolve(retArray))
          .catch((error) => reject(error));

      }).catch((error) => reject(error));
    });
  }

  getAllStoredDataRecordsAndKeysMap(dbObjectType: DbObjectTypeEnum): Promise<Map<any, any>> {
    return new Promise<Map<any, any>>((resolve, reject) => {
      this.openDb(dbObjectType).then(async (db) => {
        const store = this.getStore(db, dbObjectType, 'readonly');

        const retMap = new Map<any, any>();
        let cursor = await store.openCursor();
        while (cursor) {
          retMap.set(cursor.key, cursor.value);
          cursor = await cursor.continue();
        }
        resolve(retMap);

      }).catch((error) => reject(error));
    });
  }

  getStoredDataRecord4Key(dbObjectType: DbObjectTypeEnum, aKey: any): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      this.openDb(dbObjectType).then(async (db) => {
        const store = this.getStore(db, dbObjectType, 'readonly');

        store.get(aKey).then((retValue) => resolve(retValue))
          .catch((error) => reject(error));

      }).catch((error) => reject(error));
    });
  }

  getStoredDataAllKeys(dbObjectType: DbObjectTypeEnum): Promise<string[]> {
    return new Promise<string[]>((resolve, reject) => {
      this.openDb(dbObjectType).then(async (db) => {
        const store = this.getStore(db, dbObjectType, 'readonly');

        store.getAllKeys().then((retValue) => resolve(retValue))
          .catch((error) => reject(error));

      }).catch((error) => reject(error));
    });
  }

  clearAllStaticData(): Promise<any> {
    return new Promise<boolean>((resolve, reject) => {
      const promisesArray: Promise<any>[] = [];
      EnumUtils.getEnumValues(DbObjectTypeEnum).forEach(dbObjectType => {
        const p = this.openDb(dbObjectType)
          .then((db) => {
            return db.clear(dbObjectType);
          });
        promisesArray.push(p);
      });
      Promise.all(promisesArray)
        .then(() => resolve(true))
        .catch((error) => reject(error));
    });
  }

  private openDb(dbObjectType: DbObjectTypeEnum) {
    const dbName = this.dbObjectParametersMap[dbObjectType].dbName;
    const objectStoreName = this.dbObjectParametersMap[dbObjectType].objectStoreName;
    return idb.openDB(dbName, 1, {
      upgrade: (db, oldVersion, newVersion, transaction) => {
        console.log(dbName + ' oldVersion :' + oldVersion, db);
        switch (oldVersion) {
          case 0:
            db.createObjectStore(DbObjectTypeEnum.AREAS);
            db.createObjectStore(DbObjectTypeEnum.COURSES);
            db.createObjectStore(DbObjectTypeEnum.GONGS);
            db.createObjectStore(DbObjectTypeEnum.PERMISSIONS);
            break;
          case 1:
            break;
        }
      }
    });
  }

  private getStore(db: IDBPDatabase, dbObjectType: DbObjectTypeEnum, mode: 'readonly' | 'readwrite')
    : IDBPObjectStore<any, string[], string> {
    const storeName = this.dbObjectParametersMap[dbObjectType].objectStoreName;
    const tx = db.transaction(storeName, mode);
    return tx.objectStore(storeName);
  }
}

