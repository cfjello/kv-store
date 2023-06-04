/*
import {z } from "https://deno.land/x/zod/mod.ts"

const PREDEFINED_VALUES = ["value1", "value2", "value3"] satisfies Primitive;

// const schema = z.union([z.string(), z.literal(...PREDEFINED_VALUES)]);

const schema = z.union([z.string(), z.literal(PREDEFINED_VALUES)] );

console.log(schema.parse("value1")); // Output: value1
try {
    console.log(schema.parse("value4")); // Throws an error
}
catch(err) {
    console.error(err)
}
*/