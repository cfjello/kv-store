    import * as store from "../KVStore.ts"
    import {z } from "https://deno.land/x/zod/mod.ts"
    import { _ } from "../lodash.ts"
    import { assert, assertEquals, assertExists, assertInstanceOf, assertNotEquals } from "https://deno.land/std/testing/asserts.ts"

    const userSchema = z.object({
        id: z.string(),
        name: z.string(),
        email: z.string().email(),
        phone: z.string().optional(),
        group: z.nullable(z.string()),
    });


    // console.log( JSON.stringify(userSchema, undefined, 2) )
    
    type User = z.infer<typeof userSchema>;
    
    const exampleUser: User = {
        id: "1234",
        name: "example",
        email: "example@example.com",
        phone: "000-123-4567",
        group: null,
    };

    try {
        userSchema.parse(exampleUser);
    } catch (e) {
            // This line should print the first error message
            console.error(JSON.parse(e.message)[0]);
    }

    console.log( `Type: ${typeof userSchema}`)

        // const id = z.instanceof(userSchema)
    Deno.test( {
        name: 'KVStore: It can register a Zod object', 
        fn: async () => {
            const context  = exampleUser
            await store.register('User', context, true )
            const isReg = await store.isRegistered('User')
            assertEquals( isReg, true)
            const storeId =  store.getCurrStoreId('User')
            assertExists(storeId)
            assertEquals( context.email, "example@example.com")
            userSchema.parse(exampleUser)
            // assertInstanceOf(context, userSchema)
            /*
            expect(context.f1).toEqual('field_1')
            expect( store.hasStoreId('testContext', storeId)).toBe(true)
            const context2 = store.get('testContext',storeId) as C_Type
            expect( context2.f1).toEqual('field_1')
            expect( store.hasStoreId('testContext', "22222")).toBeFalsy()
            */
        },
        sanitizeResources: false,
        sanitizeOps: false
    })

    Deno.test( {
        name: 'Zod Store: It can store, retrive, update and re-publish a Zod store object', 
        fn: async () => {
            try {
                const context = _.cloneDeep(exampleUser) as User
                await store.register('User', context, userSchema)
                const storeId =  store.getCurrStoreId('User')
                assertExists(storeId)
                assertEquals( context.email, "example@example.com")
                userSchema.parse(exampleUser)
                context.name = 'Viggo'
                await store.publish('User', context)
                const storeId2 =  store.getCurrStoreId('User')
                assertNotEquals(storeId, storeId2)
                const currObj = await store.get<User>('User')
                assert( currObj.ok && currObj.value.name === "Viggo")
                userSchema.parse(exampleUser)
            }
            catch(err) { console.log(err)}
            // curr


            // assertInstanceOf(context, userSchema)
            /*
            expect(context.f1).toEqual('field_1')
            expect( store.hasStoreId('testContext', storeId)).toBe(true)
            const context2 = store.get('testContext',storeId) as C_Type
            expect( context2.f1).toEqual('field_1')
            expect( store.hasStoreId('testContext', "22222")).toBeFalsy()
            */
        },
        sanitizeResources: false,
        sanitizeOps: false
    })