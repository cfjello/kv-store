import { z } from "https://deno.land/x/zod/mod.ts"


const userSchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
    phone: z.string().optional(),
    group: z.nullable(z.string()),
  });
  
  type User = z.infer<typeof userSchema>;
  
  const _exampleUser: User = {
    id: "1234",
    name: "example",
    email: "example@example.com",
    phone: "000-123-4567",
    group: null,
  };

  try {
    userSchema.parse(_exampleUser);
  } catch (e) {
        // This line should print the first error message
        console.error(JSON.parse(e.message)[0]);
  }

/*
const userSchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
    phone: z.string().optional(),
    group: z.nullable(z.string()),
  });
  
  type User = z.infer<typeof userSchema>;
  
  const _exampleUser: User = {
    id: "1234",
    name: "example",
    email: "example@example.com",
    phone: "000-123-4567",
    group: null,
  };
  
  // parsing
  try {
    userSchema.parse({ id: 1 });
  } catch (e) {
    // Following ZodError should be thrown for each invalid field
    // Note that `e.message` is a `string` not an array of objects.
    // [
    //   {
    //     "code": "invalid_type",
    //     "expected": "string",
    //     "received": "number",
    //     "path": [
    //       "id"
    //     ],
    //     "message": "Expected string, received number"
    //   },
    //   ...
    // ]
  
    // This line should print the first error message
    console.error(JSON.parse(e.message)[0]);
  }
  
  // "safe" parsing
  const parsingResult = userSchema.safeParse({ id: '1' });
  // a condition for type narrowing 
  if (!parsingResult.success) {
    // you can use .error on `success=false`
    console.group('SafeParsing');
    console.error(JSON.parse(parsingResult.error.message));
    console.groupEnd();
  } else {
    // now you can use .data `success=true`
    console.log(parsingResult.data);
  }
  */