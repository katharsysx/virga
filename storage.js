(() => {
  const DB_NAME='virga-local', DB_VERSION=2, AUDIO_STORE='audio', AUDIO_BLOBS='audioBlobs', JOURNAL_STORE='journal';
  let databasePromise;

  function openDB(){
    if(databasePromise) return databasePromise;
    databasePromise=new Promise((resolve,reject)=>{
      if(!('indexedDB' in window)){databasePromise=null;reject(new Error('IndexedDB is unavailable'));return}
      const request=indexedDB.open(DB_NAME,DB_VERSION);
      request.onupgradeneeded=event=>{
        const db=request.result,tx=request.transaction;
        if(!db.objectStoreNames.contains(AUDIO_STORE)){
          const store=db.createObjectStore(AUDIO_STORE,{keyPath:'id'});
          store.createIndex('addedAt','addedAt');
        }
        if(!db.objectStoreNames.contains(JOURNAL_STORE)){
          const store=db.createObjectStore(JOURNAL_STORE,{keyPath:'id'});
          store.createIndex('createdAt','createdAt');
        }
        if(event.oldVersion<2){
          const blobs=db.objectStoreNames.contains(AUDIO_BLOBS)?tx.objectStore(AUDIO_BLOBS):db.createObjectStore(AUDIO_BLOBS,{keyPath:'id'});
          const cursorRequest=tx.objectStore(AUDIO_STORE).openCursor();
          cursorRequest.onsuccess=()=>{
            const cursor=cursorRequest.result;
            if(!cursor)return;
            const metadata=cursor.value;
            if(metadata.blob){blobs.put({id:metadata.id,blob:metadata.blob});delete metadata.blob;cursor.update(metadata)}
            cursor.continue();
          };
        }
      };
      request.onsuccess=()=>{
        const db=request.result;
        db.onversionchange=()=>{db.close();databasePromise=null};
        resolve(db);
      };
      request.onerror=()=>{databasePromise=null;reject(request.error||new Error('Could not open local storage'))};
      request.onblocked=()=>{databasePromise=null;reject(new Error('Local storage is blocked by another tab'))};
    });
    return databasePromise;
  }

  async function requestStore(name,mode,action){
    const db=await openDB();
    return new Promise((resolve,reject)=>{
      let request;
      const tx=db.transaction(name,mode),store=tx.objectStore(name);
      try{request=action(store)}catch(error){reject(error);return}
      tx.oncomplete=()=>resolve(request?request.result:undefined);
      tx.onerror=()=>reject(tx.error||new Error('Local storage transaction failed'));
      tx.onabort=()=>reject(tx.error||new Error('Local storage transaction was aborted'));
    });
  }

  async function writeAcrossStores(names,action){
    const db=await openDB();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(names,'readwrite');
      try{action(Object.fromEntries(names.map(name=>[name,tx.objectStore(name)])))}catch(error){tx.abort();reject(error);return}
      tx.oncomplete=()=>resolve();
      tx.onerror=()=>reject(tx.error||new Error('Local storage transaction failed'));
      tx.onabort=()=>reject(tx.error||new Error('Local storage transaction was aborted'));
    });
  }

  const safePrefs={
    get(key,fallback){try{const raw=localStorage.getItem(`virga:${key}`);return raw==null?fallback:JSON.parse(raw)}catch(_){return fallback}},
    set(key,value){try{localStorage.setItem(`virga:${key}`,JSON.stringify(value));return true}catch(_){return false}}
  };

  window.VirgaStore={
    prefs:safePrefs,
    openDB,
    async listAudio(){
      const rows=await requestStore(AUDIO_STORE,'readonly',store=>store.getAll());
      const tracks=await Promise.all(rows.map(async metadata=>{
        const stored=await requestStore(AUDIO_BLOBS,'readonly',store=>store.get(metadata.id));
        return{...metadata,blob:stored?.blob};
      }));
      return tracks.sort((a,b)=>a.addedAt-b.addedAt);
    },
    async putAudio(item){
      const metadata={...item};delete metadata.blob;
      return writeAcrossStores([AUDIO_STORE,AUDIO_BLOBS],stores=>{
        stores[AUDIO_STORE].put(metadata);
        stores[AUDIO_BLOBS].put({id:item.id,blob:item.blob});
      });
    },
    async updateAudioMetadata(item){
      const metadata={...item};delete metadata.blob;
      return requestStore(AUDIO_STORE,'readwrite',store=>store.put(metadata));
    },
    async getAudio(id){
      const [metadata,stored]=await Promise.all([
        requestStore(AUDIO_STORE,'readonly',store=>store.get(id)),
        requestStore(AUDIO_BLOBS,'readonly',store=>store.get(id))
      ]);
      return metadata?{...metadata,blob:stored?.blob}:undefined;
    },
    async deleteAudio(id){
      return writeAcrossStores([AUDIO_STORE,AUDIO_BLOBS],stores=>{
        stores[AUDIO_STORE].delete(id);
        stores[AUDIO_BLOBS].delete(id);
      });
    },
    async listJournal(){const rows=await requestStore(JOURNAL_STORE,'readonly',store=>store.getAll());return rows.sort((a,b)=>b.createdAt-a.createdAt)},
    async putJournal(item){return requestStore(JOURNAL_STORE,'readwrite',store=>store.put(item))},
    async deleteJournal(id){return requestStore(JOURNAL_STORE,'readwrite',store=>store.delete(id))}
  };
})();
