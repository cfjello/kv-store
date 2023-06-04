import { z } from "https://deno.land/x/zod/mod.ts"
import { CxError } from "./CxError.ts"

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

export type ExtStoreObject<T>       = T &  { __meta: MetaRowDataT } 