import { z } from "https://deno.land/x/zod/mod.ts"
// import { Result, Maybe } from "https://raw.githubusercontent.com/true-myth/true-myth/main/src/public/index.ts"
import { StateMetaData, Result, StoreEntry} from "./interfaces.ts"
// import { IterateIndexMap }  from "../cxiterate/interfaces.ts"
// import { ActionDescriptor } from "../cxctrl/interfaces.ts"
import { idSeq } from "./generators.ts"
import { _ } from "./lodash.ts"
import { CxError } from "./CxError.ts"
import { assert } from "https://deno.land/std/testing/asserts.ts";
// import { actionDescFac } from "../cxctrl/actionDescFac.ts";
// import { Mutex } from "../cxctrl/mod.ts" 

const __filename = new URL('', import.meta.url).pathname;

export class ZStore {
    /**
     * Cxstore class implementing the StoreIntf
     */ 
    initKey: Readonly<string> = "00000000000000000000000000"
    // deno-lint-ignore no-explicit-any
    state           = new Map<string, Map<string, any>>()
    meta            = new Map<string, StateMetaData>()
    index           = new Map<string, Map<string, Array<string>>>()
    indexByName     = new Map<string, string[]>()
    // deno-lint-ignore ban-types
    indexMeta       = new Map<string, {prefix: string, selector: Function}>()
    updIdx          = 0

    constructor( public storeName: string = 'store' ) {}
    /**
     * Register saves a deep copy of an object to the Store (register is a synonym for the set function)
     * @template T The type of the object
     * @param key The store storeName of the object
     * @param objRef A reference to the object to be stored
     * @returns The storeId of the object 
     */
    register<T> ( key: string, objRef: T, init = true ): Promise<Result<string, CxError>> {       
        let storeId = this.initKey
        try {
            if ( init ) 
                storeId = this.set<T>( key, objRef ) 
            else 
                storeId = this.initStoreKey<T>(key).storeId
        }
        catch(err) {
            return Promise.resolve({ 
                    ok: false, 
                    error: new CxError(__filename, 'register()', 'STORE-0001', `Cannot register object named: ${key}`, err) 
                })
        }

        return Promise.resolve( {ok: true, value: storeId } )
    } 


    unregister (key: string): Promise<Result<number, CxError>> {
        const isSwarmObj = key.includes('_swarm_')
        let cnt = 0
        try {
            if ( this.state.has(key) ) { 
                this.state.delete(key)
                this.meta.delete(key);

                if ( ! isSwarmObj &&  this.indexByName.has(key) ) {
                    ( this.indexByName.get(key) ?? []) .forEach( (jobKey: string)  => {
                        this.index.get(jobKey)?.delete(key)  
                        cnt++
                    })
                    this.indexByName.delete(key)
                }
            }
            else 
                throw Error(`Cannot find a store object named: ${key}`)
        }
        catch (err) {
            return Promise.resolve({ 
                ok: false, 
                error: new CxError(__filename, 'unregister()', 'STORE-0002', `Unregister failed for: ${key}`, err)
            })
        }
        return Promise.resolve({ 
            ok: true, 
            value: cnt
        })
    }

    publish<T>(key: string, objRef: T): string {
        return this.set<T>(key,objRef)
    }

    /**
     * Gets size , the number of entries, in the whole store
     * 
     * @return number
     */
    size(key = '' ): number { 
        if ( key === '' ) 
            return this.state.size 
        else {
            if ( this.state.has(key) )
                return this.state.get(key)!.size
            else 
                return 0
        }
    }

    /**
     * Determines whether store object exists 
     * 
     * @param key The storeName of the stored object
     * @param storeid  The id of the stored object
     * @return boolean
     */
    hasStoreId (key: string, storeId: string): boolean {
        return ( this.state.has( key ) && this.state.get(key)!.has(storeId) )
    }

    /**
     * Adds a new index for a named store object jobId based on some named fields 
     * 
     * @param indexName The name of the index
     * @param prefix   The index indexPrefix, a string to be added in front of the index id (idxId)
     * @return string  The index identifier
     */
    // deno-lint-ignore ban-types
    createIndex<T>( indexName: string, prefix: string, selector: Function): void {
        if ( this.indexMeta.has( prefix ) ) { 
            throw new CxError(__filename, 'store.createIndex()', 'STORE-0011', `Duplicate index indexPrefix: ${prefix}, when trying to create index`)
        }
        else if ( ! this.state.has(indexName) ) {
            throw new CxError(__filename, 'store.createIndex()', 'STORE-0012', `Index target state object: ${indexName}, does not exist in the Store`)
        }
        this.indexMeta.set(indexName, { prefix: prefix, selector: selector } )
    }

    /**
     * Adds a given index identifier if it does not exixt, e.g. a jobId to the index
     * 
     * @param idxId    The index Id of the indexed object
     * @param prefix   The index indexPrefix, a string to be added in front of the index id (idxId)
     * @return string  The index identifier
    */
    addIndexKey( idxKey: string ): string {
        if ( ! this.index.has( idxKey ) ) { 
            this.index.set( idxKey , new Map<string, Array<string>>() ) 
        }
        return idxKey   
    }
  
    /**
     * Determines whether index object exists for a given index Id
     * 
     * @param key The storeName of the index
     * @param idxId  The index Id or name of the index - number is supplied it will be prefixed with the index indexPrefix for constructing the name
     * @return boolean
     */
    hasIndexId ( key: string, idxKey: string ): boolean {
        return ( this.index.has(idxKey) && this.index.get(idxKey)!.has(key) )
    }

     /**
     * Sets the index for a given index Id (defined as a number and a fixed indexPrefix) and defaults to the previous storeId if no storeId is given
     * (This is usefull for generation an index for the objects created given job run)
     * 
     * @param key       The storeName of the indexed object
     * @param idxId     The idxId of the indexed object
     * @param storeId   The storeId to put in the index
     * @param prefix    The index indexPrefix that define the type of index, e.g. key=189 and indexPrefix 'S' result in index key: 'S189' 
     * @return void
     */
    setIndexId (key: string, idxKey: string, storeId: string ): void {
        if ( ! this.hasStoreId( key , storeId ) ) {
            throw new CxError(__filename, 'setIndexId()', 'STORE-0003', `No storeId for ${key} with storeId ${storeId} in store`)
        }   
        if ( ! this.index.get(idxKey)!.has(key) ) {
            this.index.get(idxKey)!.set(key, [])
            this.indexByName.set(key, [])
            this.indexByName.get(key)!.push(idxKey)
        }     
        this.index.get(idxKey)!.get(key)!.push(storeId)
        this.state.get(key)!.get(storeId).meta.refCount += 1
    }

     /** TODO: decide whether this function getIndexStoreId() is useful
     * Gets the storeId for a given key, idxId and indexPrefix 
     * 
     * @param key The storeName of the indexed object
     * @param idxId  The idxId of the indexed object
     * @param prefix  The index indexPrefix that define the type of index, e.g. key=189 and indexPrefix 'S' result in index key: 'S189' 
     * @return void

    getIndexStoreId( key: string, idxId:number | string, indexPrefix: string = 'J' ) : number {
        let idxKey: string =  typeof idxId === 'string' ? idxId : `${indexPrefix}${idxId}`
        if ( ! this.hasIndexId( key, idxId, indexPrefix ) )
            throw new CxError(__filename, 'getIndexStoreId()', 'STORE-0005', `Cannot find index entry for ${idxKey}[${key}]`)
        else
            return this.index.get(idxKey)!.get(key)
    }
    */

    /**
     * Gets a collection of StoreIDs for a given key, idxId and indexPrefix - this i.e. can be used 
     * to fetch references to all objects related to a given index Id. Object-states in the collection cannot be updated
     * 
     * @param idxId  The idxId of the indexed object
     * @param prefix  The index indexPrefix that define the type of index, e.g. key=189 and indexPrefix 'S' result in index key: 'S189' 
     * @return Map<string, any> A map of named objects and thier StoreIDs
    */
    // deno-lint-ignore no-explicit-any
    getCollection( idxKey: string ) : Map<string, any> {
        // deno-lint-ignore no-explicit-any
        const collection = new Map<string, any>()
        try {
            this.index.get(idxKey)!.forEach( ( storeIds, key ) => {
                storeIds.forEach( storeId => {
                    this.get( key, storeId )
                    collection.set( key, this.get( key, storeId ) )
                })
            })
            return collection
        }
        catch(err) {
            throw new CxError(__filename, 'getCollection()', 'STORE-0006', `Cannot fetch Collection storeIDs`, err)
        }
    }

    /**
     * Gets the object-state for a named indexed object of type S
     * 
     * @param key The storeName of the indexed object
     * @param idxId  The index Id of the indexed object
     * @param prefix  The index indexPrefix that define the type of index, e.g. key=189 and indexPrefix 'S' result in index key: 'S189' 
     * @return S | undefined if the indexed object does not exist
     */
    getIndexState<S>(key: string, idxKey: string ): S[] | undefined {
        if ( this.hasIndexId(key, idxKey) ) {
            // const storeId = this.index.get(idxKey)!.get(key)
            return this.get(key) as S[]
        }
        else
            return undefined
    }
   
    /**
     * Get current last store id for an entry store
     * 
     * @param key The storeName of the stored object
     * @param storeId The number of the version to retrieve, defaulting to the most recent one
     * @return number The most recent/current storeId
     */
    getStoreId( key: string, _storeId = this.initKey ) : string {
        let storeId = _storeId
        if ( this.isRegistered(key) ) {
            if ( ! this.hasStoreId( key, _storeId ) ) { 
                if ( this.meta.has( key ) ) 
                    storeId = this.meta.get(key)!.storeId
            }
        }
        else
            throw new CxError(__filename, 'store.getStoreId()', 'STORE-0007', `Key: ${key} does not exist`)
        return storeId
    }

    /**
     * Gets a typed stored object (a deep copy or a reference depending on the parameters provided)
     * @template T The type of the object
     * @param key The storeName of the store object 
     * @param [_storeId] Can be set to retrieve a specific numbered version of the store object, otherwise the most recent object is returned
     * @param [getRefOnly] If set to true a reference is returned  otherwise a deep copy (the default)
     * @returns A typed deep copy of the stored object or a reference if parameter getRefOnly is set to true, the latter should be retrieved as readonly 
     */
    get<T>( key: string, storeId = this.initKey ): T {
            // const storeId = this.getStoreId( key, _storeId )
            // if ( dataOnly )
            //     return this.state.get(key)!.get(storeId).data as T
            // else

            return this.state.get(key)!.get(storeId) as T 
    }

    initStoreKey<T>( key: string, storeId = this.initKey ): StateMetaData {
        //
        // Do we have a new key? If so we create the meta info
        //
        try {
            if ( ! this.state.has( key ) )  {
                this.state.set( key, new Map<string,T>() ) 
            }
            this.meta.set( 
                key, 
                { 
                    storeId: storeId, 
                    prevStoreId: this.initKey, 
                    prevJobId: this.initKey, 
                    prevTaskId: 
                    this.initKey 
                } as StateMetaData 
            )
        }
        catch(err) {
            throw new CxError(__filename, 'initStoreKey.set()', 'STORE-0008', `Cannot set key: ${key}`,err)  
        }
            return this.meta.get(key)!   
    }

    /**
     * Saves a deep copy of an object to the Store
     * @template S The type of the object
     * @param key The store storeName of the object
     * @param objRef A reference to the object to be stored
     * @param threshold The number of entries in the immutable collection to keep ( less than 2 for unlimited, otherwise the number given )
     * @returns The storeId of the object 
     */
    set<T>( key: string, objRef: T ): string  {
        assert (_.isObject( objRef), `Object must be passed to the store`)
        const storeId = idSeq().next()!.value as string
        try {  
            //
            // If the ActionDescriptor is not initialized ( that is if this was called directly ) then initialize
            // 
            // const ad: ActionDescriptor = _.isUndefined(_actionDesc) ? actionDescFac({ rootName: key }): _actionDesc!
            //
            // Do we have a new key? If so we create the meta info
            //
            const metaInfo: StateMetaData = this.initStoreKey( key, storeId ) 
            //
            // Build and Store the data
            //
            const objClone: T = Object.freeze( _.cloneDeep( objRef ) )
            //
            // Store the cloned data
            //
            /*
            this.state.get(key)!.set( 
                storeId , {
                    data: objClone as T,
                    meta: { jobId: ad.jobId,taskId: ad.taskId,intern: ad.intern, refCount: 0 }
                } as StoreEntry<T> 
            */

            this.state.get(key)!.set( storeId, objClone as T) as T 
            //
            // store the job-index reference
            //
            // TODO: Reinstate this.setIndexId(key, storeId )
            //
            // set the updated metaData with the current storeId
            //
            this.meta.set( key, metaInfo )
        }
        catch(err) {
            throw new CxError(__filename, 'store.set()', 'STORE-0010', `failed to store data for ${key}`, err)
        }
        return storeId
    }

    /**
     * Is the object key/storeName exists in the store?
     * 
     * @param key The store storeName of the object
     * @return boolean
     */
    has(key: string): boolean { return this.isRegistered( key ) }

    /**
     * Is the named object reistred in the store and does it have an entry?
     * 
     * @param key The store storeName of the object
     * @return boolean
     */
    isRegistered(key: string): boolean { return ( this.state.has(key) /* && this.state.get(key)!.size > 0 */  ) }

    /**
     * Get a reference to the whole store map
     */
    getAll(): ReadonlyMap<string, {}> { return this.state }
        
    /**
     * Get a reference to the whole metadata map
     */
    getAllMeta(): ReadonlyMap<string, {}> { return this.meta }

}