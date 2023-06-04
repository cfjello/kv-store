import { z } from "https://deno.land/x/zod/mod.ts"
import { sprintf } from "https://deno.land/std@0.167.0/fmt/printf.ts"
import { RegisterType, ExtStoreObject,  MetaDataT, ResultT, GetResultT, MetaRowDataT} from "./interfaces.ts"
import { idSeq, uuid } from "./generators.ts"
import { _ } from "./lodash.ts"
import { CxError } from "./CxError.ts"
import { assert } from "https://deno.land/std/testing/asserts.ts";
import { reset } from "https://deno.land/std@0.177.0/fmt/colors.ts"

const __filename = new URL('', import.meta.url).pathname
const schemaCache = new Map<string, z.ZodSchema<unknown>>()
export const kv = await Deno.openKv();
// const uniqueId = uuid()
//
// Lock function
//
export async function lock<R>( lockName: string, callback: () => Promise<R>, timeout = 5000 ): Promise<R> {
    const key = ['lock', lockName]
    let res: R 
    let _timer: ReturnType<typeof setTimeout>
    try {
        await kv.atomic()
            .check({ key , versionstamp: null })
            .set( key, lockName )
            .commit()
        res = await callback()
    } 
    catch (err) {
        throw new CxError(__filename, 'store.lock()', 'STORE-0001', `failed to apply lock for ${key}`, err)
    }
    finally {
        await kv.atomic()
        .delete( key )
        .commit()
    }
    return Promise.resolve(res as R)
}

export async function unLock( lockName: string): Promise<void> {
    const key = ['lock', lockName]
    await kv.atomic()
        .delete( key )
        .commit()
}


export async function getSequence( seqName: string ): Promise<bigint | null> {
    const key   = ['sequence', seqName]
    await kv.atomic().max(key, 1n).commit()
    const seqNo = await kv.get(key) satisfies Deno.KvEntryMaybe<bigint>
    return Promise.resolve(seqNo?.value)
}

//
// Get a unique process identity for this instance of KVStore
// 
async function getIdentity(): Promise<number> {
    const key   = ['sequence', 'process']
        await kv.atomic()
        .set( 
            key, 
            await ( 
                async () => { 
                    return ( ( await kv.get( key ) as unknown as Deno.KvEntry<number | null>).value ?? 0 + 1 ) as number % 1000
            })()
        )
        .commit()
        const val = await kv.get(key)
        return Promise.resolve( val.value as number )
}

const processId = await lock<number>( 'identity', getIdentity ) 
export const getProcessId = () =>  processId
//
// Globally unique sortable ulid by adding the KV assigned process Id
//
export const nextUlidId = (processId = getProcessId() ) => {
    const id = idSeq().next().value! + sprintf('%03d', processId) 
    return id
}

const initStoreId = "00000000000000000000000000"
//
// Store functions
//
export async function cleanAll() { // Destructive function
    let keyList = await getKeys( ['data'] )
    for ( let i = 0; i < keyList.length; i++) {
        // console.log(`DATA: ${JSON.stringify( keyList[i] )}`)
        await kv.delete( keyList[i].key )
    }

    keyList = await getKeys( ['meta'] )
    for ( let i = 0; i < keyList.length; i++) {
         // console.log(`DATA: ${JSON.stringify( keyList[i] )}`)
        await kv.delete( keyList[i].key )
    }
    keyList = await getKeys( ['index'] )
    for ( let i = 0; i < keyList.length; i++) {
        // console.log(`DATA: ${JSON.stringify( keyList[i] )}`)
        await kv.delete( keyList[i].key )
    }
}

// Function overloads
type registerCallArgsType<T> = RegisterType<T>
export async function register<T>(
    key:        string, 
    object:     T, 
    init? :     boolean,
    schema?:    z.ZodSchema<T> | string,
    jobId?:     string 
): Promise<ResultT<string | null>>
export async function register<T>( argObj: registerCallArgsType<T> ): Promise<ResultT<string | null>>

export async function register<T> ( 
    keyOrArgObj: string | RegisterType<T>, 
    object?: T, 
    init?: boolean, 
    schema?: z.ZodSchema<T> | string,
    jobId?:     string 
): Promise<ResultT<string | null>>
{     
    // Defaults args
    let key     = '__null__'
    const isStr = ( typeof keyOrArgObj === "string" ) 
    key         = isStr ? keyOrArgObj : keyOrArgObj.key
    object      = isStr ? object! : keyOrArgObj.object!
    schema      = isStr ? schema : keyOrArgObj.schema
    init        = ( isStr ? init : keyOrArgObj.init ) ?? true

    let zodError: z.ZodError | null = null
    let storeId = initStoreId

    const meta    =  { 
        key:            key,
        init:           init, 
        currStoreId:    initStoreId, 
        currJobId:      jobId ? jobId : initStoreId,
        schemaKey:      schema instanceof z.ZodSchema<T> ? key : schema
    } as MetaDataT

    try {  
        if ( schema ) {
            if ( schema instanceof z.ZodSchema<T> ) {  
                schemaCache.set( key, schema )
                const _res = await kv.atomic()
                    // .check( { key: ['schema', key], versionstamp: null } ) 
                    .set( ['schema', key], key ) 
                    .commit()

                const valid = validate(key, schema, object)
                if ( ! ( valid && valid.success ) ) {
                    zodError = valid!.error
                    throw Error(`Validation of schema for ${key} init object failed` )
                }
            }
            else {
                const valid = validate(key, schema, object)
                if ( ! ( valid && valid.success ) ) {
                    zodError = valid!.error
                    throw Error(`Validation of schema for ${key} init object failed` )
                }
            }
        }    
        if ( init ) {
            storeId = nextUlidId()
            set({
                    key:    key,
                    object: object,
                    jobId:  jobId

            } satisfies setCallArgsType<T>)
        }
        else {
            const _meta = await kv.atomic()
            .check( { key: ['meta', key], versionstamp: null } )
            .set( [ 'meta', key], meta )
            .commit()
        }
    }
    catch(err) {
        return Promise.resolve({   
            ok: false,
            meta: meta,
            error: new CxError(__filename, 'register()', 'STORE-0002', err ), 
            zodError: zodError!,
            value: null
        })
        // throw new CxError(__filename, 'register()', 'STORE-0002', `Cannot register object named: ${key}`, err) 
    }

    return Promise.resolve( { 
            ok: true, 
            value: storeId,  
            meta: meta 
        } satisfies ResultT<string> )
} 

// Function overloads
type ValidateArgsType<T> =  { key: string, schema: z.ZodSchema<T> | string, object:  T } 
export function validate<T>(  key: string, schema: z.ZodSchema<T> | string, object:  T ): z.SafeParseReturnType<unknown, unknown>
export function validate<T>( argObj: ValidateArgsType<T> ): z.SafeParseReturnType<unknown, unknown>

export function validate<T> (
    keyOrArgObj: string | ValidateArgsType<T>,
    schema?:  z.ZodSchema<T> | string,
    object?:  T ) : z.SafeParseReturnType<unknown, unknown>
{
    // Defaults args
    let key     = '__null__'
    const isStr = ( typeof keyOrArgObj === "string" ) 
    key         = isStr ? keyOrArgObj : keyOrArgObj.key
    schema      = isStr ? schema! : keyOrArgObj.schema
    object      = isStr ? object : keyOrArgObj.object

    try {
        if ( schema instanceof z.ZodSchema<T> ) {
            return schema.safeParse(object)
        }
        // Find the schema if only the name is provided
        else if ( schemaCache.has(schema as string) ) {
            const cached = schemaCache.get(schema)
            const res = cached!.safeParse(object)
            return res
        }
        else {
            throw Error(`The schema: ${schema} cannot be found in the schemaCache`)
        }
    }
    catch(err) {
        throw new CxError(__filename, 'store.validate()', 'STORE-0002B', `failed to validate data for ${key}`, err)
    }
}

// Function overloads
type setCallArgsType<T> =   { key: string, object: T, jobId?: string, check?: boolean } 
export async function set<T>( key: string, object: T, jobId?: string, check?: boolean ): Promise<ResultT<T>>
export async function set<T>( argObj: setCallArgsType<T> ): Promise<ResultT<T>>

export async function set<T> ( 
    keyOrArgObj: string | setCallArgsType<T>, 
    object?: T, 
    jobId?: string,
    check?: boolean
    ):  Promise<GetResultT<T>> 
{
    const isStr = ( typeof keyOrArgObj === "string" ) 
    const key   = isStr ? keyOrArgObj : keyOrArgObj.key
    object      = (isStr ? object! : keyOrArgObj.object!)
    check    = check ?? false
    assert (_.isObject( object), `An Object must be passed to the store`)

    let kvRes:      Deno.KvCommitResult | Deno.KvCommitError
    let metaStored: MetaDataT | null = null
    let meta:       MetaDataT
    let metaRow:    MetaRowDataT
    let zodError:   z.ZodError | null = null

    const storeId = nextUlidId()
    jobId = ( ( isStr ? jobId : keyOrArgObj.jobId ) ?? storeId ) as string
    try {  
        if ( check ) {
            metaStored = (await kv.get<MetaDataT>(['meta', key])).value
            assert(  metaStored!== null, `The key: ${key} does not exist - you must register() the key in the store`)
        }
        //
        // Update meta information
        //
        meta =  {
            key:         key,
            init:        true,
            currStoreId: storeId,
            currJobId:   jobId!,
            schemaKey:   metaStored  ? metaStored.schemaKey : undefined
        } satisfies MetaDataT

        
        metaRow =  { 
            name:        key,
            jobId:       jobId,
            schema:      metaStored ? metaStored.schemaKey : undefined
        } as MetaRowDataT

        // 
        // store the object
        //
        (object as ExtStoreObject<T>).__meta = metaRow

        if ( check ) {
            const schemaName = (await kv.get( ['schema', key] )).value
            assert(schemaName!== null, `Cannot validate ${key}, since it has no schema.` )
            const valid = validate<T>( key, schemaName as string, object )
            if ( ! ( valid && valid.success ) ) {
                zodError = valid!.error
                throw Error(`Validation of schema for ${key} init object failed` )
            }
        }
        
        if ( jobId !== storeId )
            kvRes = await kv.atomic()
                .set( ['data',   storeId ],  object as ExtStoreObject<T> )
                .set( ['index',  jobId, storeId ], storeId )
                .set( ['index',  key  , storeId ], storeId )
                .set( ['meta',   key], meta )
                .commit()
        else 
            kvRes = await kv.atomic()
                .set( ['data',   storeId ],  object as ExtStoreObject<T> )
                .set( ['index',  key  , storeId ], storeId )
                .set( ['meta',   key], meta )
                .commit()
    }
    catch(err) {
        Promise.resolve({
            ok:           false,
            value:        null,
            versionstamp: null,
            meta:         meta!,
            error:        new CxError(__filename, 'store.set()', 'STORE-0003', `failed to store data for ${key}`, err),
            zodError:     zodError
        })
    }
    return Promise.resolve( 
        { 
            ok:           true, 
            value:        object, 
            versionstamp: (kvRes! as Deno.KvCommitResult).versionstamp ,
            meta:         meta!
        } satisfies GetResultT<T> )
}

// Function overloads
type publishCallArgsType<T> = { key: string, objRef: T } 
export async function publish<T>( key: string, objRef: T ):         Promise<ResultT<string>>
export async function publish<T>( argObj: publishCallArgsType<T> ): Promise<ResultT<string>>

export async function publish<T>(
        keyOrArgObj: string | publishCallArgsType<T>, 
        objRef?: T,
        jobId?: string 
    ): Promise<ResultT<T>> {
    const key = typeof keyOrArgObj === "string" ? keyOrArgObj : keyOrArgObj.key
    objRef = typeof keyOrArgObj === "string" ? objRef : keyOrArgObj.objRef 
    return await set<T>(key, objRef as T, jobId)
}

export async function isRegistered(key: string): Promise<boolean> { 
    const meta = await kv.get( ['meta', key] )
    return Promise.resolve(meta.value !== null) 
}

type hasCallArgsType = { key: string, storeId?: string } 
export async function has( key: string, storeId?: string ):  Promise<boolean>
export async function has( argObj: hasCallArgsType ):        Promise<boolean>

export async function has ( 
    keyOrArgObj: string | hasCallArgsType, 
    storeId?: string 
    ): Promise<boolean>
{
    const key = typeof keyOrArgObj === "string" ? keyOrArgObj : keyOrArgObj.key
    storeId = typeof keyOrArgObj === "string" ? storeId : keyOrArgObj.storeId 

    const result = (await kv.get([key, storeId!])!)
    return Promise.resolve( ( result !== null && result.value !== null ) ) 
}

// Function overloads
type getCallArgsType = { key: string, storeId?: string } 
export async function get<T>( key: string, storeId?: string ):  Promise<Deno.KvEntryMaybe<T>>
export async function get<T>( argObj: getCallArgsType ):        Promise<Deno.KvEntryMaybe<T>>

export async function get<T>( 
    keyOrArgObj: string | getCallArgsType , 
    storeId?: string 
    ): Promise<Deno.KvEntryMaybe<T>>
{
    const key = typeof keyOrArgObj === "string" ? keyOrArgObj : keyOrArgObj.key
    storeId = typeof keyOrArgObj === "string" ? storeId : keyOrArgObj.storeId

    let  kvRes: Deno.KvEntryMaybe<T>
    try {  
        if ( ! storeId ) {
            const metaData = await kv.get(['meta', key])
            assert( metaData, `key: ${key} is not registered`)
            const meta = metaData.value as MetaDataT
            assert( meta.currStoreId !== initStoreId, `key: ${key} has no stored objects yet` )
            storeId = storeId ?? meta.currStoreId
            
        }
        assert(storeId, `storeId is undefined`)
        kvRes = await kv.get( ['data', storeId] ) satisfies Deno.KvEntryMaybe<T>
        // assert( kvRes.value !== null, `get data/${storeId} has mutated - it has probably been deleted` )
    }
    catch(err) {
        throw new CxError(__filename, 'KVStore.get()', 'STORE-0004', `failed to fetch data for ${key} with storeId: ${storeId}`, err)
    }
    return Promise.resolve( kvRes )  
}

//
// Index Function
// 
/*
export async function dropSchema( key: string ): Promise<Deno.KvCommitResult | Deno.KvCommitError>  {
    // const storeIdList: string[] = []
    const itor = kv.list({ prefix: [key] })
    for await (const entry of itor) {
        const schema = entry.value

        // storeIdList.push(entry.value as string)
    }
    
    const kvRes = await kv.atomic()
                .delete(['data', storeId ] )
                .commit()

}
*/

export async function getKeys( key: Deno.KvKey ): Promise<Deno.KvEntry<unknown>[]> {
    try {  
        const res:  Deno.KvEntry<unknown>[] = []
        const entries = kv.list( { prefix: key } )

        for await ( const entry of entries ) {
            res.push( entry )
          }
        return Promise.resolve( res )
    }
    catch(err) {
        throw new CxError(__filename, 'KVStore.getJobItor()', 'STORE-0005', `failed to fetch data for jobIndex: ${JSON.stringify(key) }`, err)
    }
}

export async function getStoreIds( key: string ): Promise<Deno.KvEntry<unknown>[]> {
    return Promise.resolve( await getKeys( [ 'index', key]) )
}

export async function getRows<T>( key: string ): Promise<readonly Deno.KvEntryMaybe<T>[]> {
    const keys:  Deno.KvKey[] = []
    const entries = kv.list( { prefix: [ 'index', key ] } )
    for await ( const entry of entries ) {
        keys.push( [ 'data', entry.value as string ] )
    }
    return Promise.resolve( await kv.getMany<T[]>( keys ) )
}

export function newJobId(): string {
    return nextUlidId()
}

// export function delRecord( key: )

export function getJobItor( jobId: string ): Deno.KvListIterator<unknown> {
    try {  
        return kv.list({ prefix: ["index", jobId] })
        /*
        for await (const entry of entries) {
            res.push(entry.value as string)
          }
        console.log( JSON.stringify(res) )
        */
    }
    catch(err) {
        throw new CxError(__filename, 'KVStore.getJobItor()', 'STORE-0005', `failed to fetch data for jobIndex: ${jobId}`, err)
    }
}

