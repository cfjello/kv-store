import { monotonicFactory } from "https://raw.githubusercontent.com/ulid/javascript/master/dist/index.js"
import { crypto } from "https://deno.land/std@0.184.0/crypto/mod.ts"
/**
 * ID sequence generator for internal numbering of sequences
 * e.g. Store Ctrl transaction Ids 
 */

const ulid = monotonicFactory()

export function* idSeq(){
    while(true) {
        yield ulid();
    }
}

export function uuid() { return crypto.randomUUID() }
