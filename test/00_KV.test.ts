import { store } from "../mod.ts"
import { expect } from 'https://deno.land/x/expect/mod.ts'
import { z } from "https://deno.land/x/zod/mod.ts"


await store.cleanAll()

const userSchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
    phone: z.string().optional(),
    group: z.nullable(z.string()),
  });
  
type User = z.infer<typeof userSchema>;


Deno.test( {
    name: '04 - KV can delete based on versionstamp', 
    fn: async () => {
        const user: User = {
            id: "1234",
            name: "example",
            email: "example@example.com",
            phone: "000-123-4567",
            group: null,
        };
        user.id = "1230"
        await store.kv.set( ['U1'], user )
        user.id = "1231"
        await store.kv.set( ['U1'], user )
        user.id = "1232"
        await store.kv.set( ['U1'], user )
        user.id = "1233"
        await store.kv.set( ['U1'], user )
        user.id = "1234"
        await store.kv.set( ['U1'], user )
        const keys:  Deno.KvKey[] = []
        const entries = store.kv.list( { prefix: ['U1'] } )
        for await ( const entry of entries ) {
            console.log(`NEW key: ${JSON.stringify(entry.key)}`)
            keys.push( [ entry.value as string ] )
        }
        // const rows = await store.kv.getMany<User[]>( keys ) 
        // expect ( rows.length).toEqual(5)
        // console.log( `StoreIds: ${JSON.stringify(rows, undefined, 2)}`)

        // const versionstamp = rows[4].versionstamp

        // await store.kv.atomic()
        //      .check({ rows[4].key , versionstamp: null })
    },
    sanitizeResources: false,
    sanitizeOps: false
})

/*
Deno.test( {
    name: '04 - set() can set additional rows', 
    fn: async () => {
        const user: User = {
            id: "1234",
            name: "example",
            email: "example@example.com",
            phone: "000-123-4567",
            group: null,
        };
        const _res = await store.register({
            key: 'U10', 
            object: user, 
            init: true, 
            schema: userSchema 
        })
        user.id = "1235"
        await store.set( 'U10', user )
        user.id = "1236"
        await store.set( 'U10', user )
        user.id = "1237"
        await store.set( 'U10', user )
        user.id = "1238"
        await store.set( 'U10', user )
        user.id = "1239"
        await store.set( 'U10', user )
        const rows = await store.getRows('U10')
        expect ( rows.length).toEqual(6)
        // console.log( `StoreIds: ${JSON.stringify(rows, undefined, 2)}`)

        const versionstamp = rows[4].versionstamp

        await store.kv.atomic()
            .check({ rows[4].key , versionstamp: null })
    },
    sanitizeResources: false,
    sanitizeOps: false
})
*/