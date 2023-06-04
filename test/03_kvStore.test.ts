import * as store  from "../KVStore.ts"
import { z } from "https://deno.land/x/zod/mod.ts"

// import { _ } from "../lodash.ts"
import { assert, assertEquals, assertExists, assertInstanceOf, assertNotEquals } from "https://deno.land/std/testing/asserts.ts"

const userSchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
    phone: z.string().optional(),
    group: z.nullable(z.string()),
});

// console.log( JSON.stringify(userSchema, undefined, 2) )

type User = z.infer<typeof userSchema>

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
    name: 'Zod Store: It can store and retrive a Zod store object', 
    fn: async () => {
        const context  = exampleUser
        await store.register('User', context, true )
        const storedUser =  (await store.getCurrStoreId('User'))
        const storeId =  storedUser.ok ? storedUser.value : undefined
        assertExists(storeId)
        assertEquals( context.email, "example@example.com")
        userSchema.parse(exampleUser)
        const fetchedUser_1 = await store.get<User>('User', storeId)
        console.log(JSON.stringify(fetchedUser_1))
        assertEquals(  fetchedUser_1.ok, true)
        if ( fetchedUser_1.ok ) {
            assertEquals( fetchedUser_1.value.email, "example@example.com")
            assert( fetchedUser_1.value !== context )
            assertEquals( userSchema.safeParse( fetchedUser_1.value ).success, true )
        }
        const fetchedUser_2 = await store.get<User>('User')
        console.log(JSON.stringify(fetchedUser_2))
        assertEquals(  fetchedUser_2.ok, true)
        if ( fetchedUser_2.ok ) {
            assertEquals( fetchedUser_2.value.email, "example@example.com")
            assert( fetchedUser_2.value !== context )
            assertEquals( userSchema.safeParse( fetchedUser_2.value ).success, true )
        }
    },
    sanitizeResources: false,
    sanitizeOps: false
})


