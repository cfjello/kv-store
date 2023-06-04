import { store } from "../mod.ts"
import { expect } from 'https://deno.land/x/expect/mod.ts'
import { z } from "https://deno.land/x/zod/mod.ts"

{

class NameAndAge {
    public state: any
    constructor( _state: any ) { this.state = _state }
    nameAndAge () { console.log( JSON.stringify(this.state)) }
}

type C_Type = { f1: string, f2: string }


await store.cleanAll()

// await store.cleanKV([['data'], ['schema'], ['index'], ['meta']] )

Deno.test( {
    name: '01 - nextId() appends process number', 
    fn: () => {
        // console.log(`nextId() example: ${ store.nextId()}`)
        expect( store.nextUlidId().endsWith('001') )
        expect( store.nextUlidId(2).endsWith('002') )
        expect( store.nextUlidId(567).endsWith('567') )
    },
    sanitizeResources: false,
    sanitizeOps: false
})

type recT =  { f1: string, f2: string }
type jobT =  { f1: string, f2: string }

Deno.test( {
    name: '02 - register() and init an object', 
    fn: async () => {
        const context  = { f1: 'field_1', f2: 'field_2' } satisfies recT
        // store.cleanKV([['data'],])
        const res = await store.register({ key: 'Context', object: context } )
        expect(res.ok ).toBeTruthy()
        if ( res.ok ) {
            const stored = await store.get<recT>('Context')
            // if ( !stored.value ) console.log ( `FAILURE: ${JSON.stringify(stored.error)}`  )
            expect(stored.value !== null && stored.value && stored.value.f1 === 'field_1') 
        }
    },
    sanitizeResources: false,
    sanitizeOps: false
})


Deno.test( {
    name: '03 - getKeys() is working', 
    fn: async () => {
        const context4: jobT  = { f1: 'field_4_1', f2: 'field_2' }
        const context5: jobT  = { f1: 'field_5_1', f2: 'field_2' }
        const context6: jobT  = { f1: 'field_6_1', f2: 'field_2' }
        const context7: jobT  = { f1: 'field_7_1', f2: 'field_2' }
        await store.register<jobT>({ key: 'content4', object: context4} )
        await store.register<jobT>({ key: 'content5', object: context5} )
        await store.register<jobT>({ key: 'content6', object: context6 } )
        await store.register<jobT>({ key: 'content7', object: context7 } )
        const keyList = await store.getKeys( ['data' ])
        // console.log(keyList)
        expect(keyList.length).toBeGreaterThan(4)
    },
    sanitizeResources: false,
    sanitizeOps: false
})


const userSchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
    phone: z.string().optional(),
    group: z.nullable(z.string()),
  });
  
type User = z.infer<typeof userSchema>;


Deno.test( {
    name: '04 - register() can validate an object using a provided ZodSchema', 
    fn: async () => {
        const user_01: User = {
            id: "1234",
            name: "example",
            email: "example@example.com",
            phone: "000-123-4567",
            group: null,
        };
        const res = await store.register({
            key: 'U01', 
            object: user_01, 
            init: true, 
            schema: userSchema 
        })
        expect(res.ok).toBeTruthy()
    },
    sanitizeResources: false,
    sanitizeOps: false
})

Deno.test( {
    name: '05 - register() can validate and fail an object using a provided ZodSchema', 
    fn: async () => {
        const user_02: User = {
            id: "1234",
            name: "example",
            email: "example__example.com",
            phone: "000-123-4567",
            group: null,
        };
        const res = await store.register('U02', user_02, true, userSchema )
        expect(res.ok).toBeFalsy() 
        const err = !res.ok ? res.zodError: undefined
        expect( err ).toBeDefined()
        expect(err!.issues[0].message).toEqual("Invalid email")
        // console.log(`ZOD Error: ${ !res.ok ? JSON.stringify(res.zodError) : ''}`)
    },
    sanitizeResources: false,
    sanitizeOps: false
})

Deno.test( {
    name: '06 - register() can validate and fail an object using a named ZodSchema', 
    fn: async () => {
        const user_03: User = {
            id: "1234",
            name: "example",
            email: "example@example.com",
            phone: "000-123-4567",
            group: null,
        };
        const _res = await store.register({
            key: 'U03USER', 
            object: user_03, 
            init: true, 
            schema: userSchema 
        })
        expect(_res.ok).toBeTruthy()
        const user_04: User = {
            id: "1234",
            name: "example",
            email: "example__example.com",
            phone: "000-123-4567",
            group: null,
        };
        const res = await store.register('U04USER', user_04, true, 'U03USER' )
        expect(res.ok).toBeFalsy() 
        const err = !res.ok ? res.zodError: undefined
        expect( err ).toBeDefined()
        expect(err!.issues[0].message).toEqual("Invalid email")
        // console.log(`ZOD Error: ${JSON.stringify(err)}` )
    },
    sanitizeResources: false,
    sanitizeOps: false
})

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
        console.log( `StoreIds: ${JSON.stringify(rows, undefined, 2)}`)
    },
    sanitizeResources: false,
    sanitizeOps: false
})

}