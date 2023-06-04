import { z } from "https://deno.land/x/zod/mod.ts"
import { CxError } from "./CxError.ts"
// import { ZodError } from "https://deno.land/x/zod@v3.20.2/ZodError.ts"
// 
// Start of old interfaces
// 
export interface StateKeys {
    jobId:      string,
    taskId:     number,
    intern:     boolean,
    refCount:   number
}

export type StateMetaData = {
    storeId:        string,
    prevStoreId?:   string,
    prevJobId?:     string,
    prevTaskId?:    string
}

export type StoreEntry<T> = {
    data: T
    meta: StateKeys
}
//
// End of old interfaces 
//

export type RegisterType<T> = {
    key:        string, 
    object:     T, 
    init? :     boolean,
    schema?:    z.ZodSchema<T> | string,
    jobId?:     string
}

export type MetaDataT = { 
    key:         string, 
    init:        boolean, 
    currStoreId: string,
    currJobId:   string,
    schemaKey?:   string
} 

export type MetaRowDataT = { 
    name:       string, 
    jobId:      string,
    schema:     string
} 

export type ResultT<T> = { 
    ok:         true, 
    meta:       MetaDataT 
    value:      T
    } |
    { 
    ok:         false, 
    meta:       MetaDataT 
    error:      CxError,
    zodError?:  z.ZodError
    value:      null
}
export type GetResultT<T> = { 
    ok:         true, 
    meta:       MetaDataT 
    value:      T,
    versionstamp:  string
    } |
    { 
    ok:         false, 
    meta:       MetaDataT 
    error:      CxError,
    value:      null,
    versionstamp:  null
}


// export type ResultListT = { ok: boolean, value: Array<> }

export type ExtStoreObject<T>       = T &  { __meta: MetaRowDataT } 
/// export type SuccessType<T>          = { ok: true, value: T }
// export type SuccessIndexType<T>     = { ok: true, value: ExtStoreObject<T> }
// export type FailureType<CxError>    = { ok: false, error: CxError}
// export type Result<T, CxError>      = SuccessType<T> | FailureType<CxError>
// export type IndexResult<T, CxError> = SuccessType<T> | FailureType<CxError>