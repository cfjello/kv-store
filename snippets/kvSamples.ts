
const kv = await Deno.openKv();

await kv.delete( ["accounts"] )
await kv.delete( ["users"] )

let ins = await kv.set( ["users", "alex"] , "alex" )
ins = await kv.set( ["users", "sam"] , "sam" )
ins = await kv.set( ["users", "taylor"] , "taylor" )
ins = await kv.set( ["users", "benny"] , "benny" )


// Return all users
{
  const iter = kv.list<string>({ prefix: ["users"] });
  const users = [];
  for await (const res of iter) users.push(res);
  console.log(users[0]); // { key: ["users", "alex"], value: "alex", versionstamp: "00a44a3c3e53b9750000" }
  console.log(users[1]); // { key: ["users", "sam"], value: "sam", versionstamp: "00e0a2a0f0178b270000" }
  console.log(users[2]); // { key: ["users", "taylor"], value: "taylor", versionstamp: "0059e9035e5e7c5e0000" }
}

{
  // Return the first 2 users
  const iter = kv.list<string>({ prefix: ["users"] }, { limit: 2 });
  const users = [];
  for await (const res of iter) users.push(res);
  console.log(users[0]); // { key: ["users", "alex"], value: "alex", versionstamp: "00a44a3c3e53b9750000" }
  console.log(users[1]); // { key: ["users", "sam"], value: "sam", versionstamp: "00e0a2a0f0178b270000" }
}
{
  // Return all users lexicographically after "taylor"
  const iter = kv.list<string>({ prefix: ["users"], start: ["users", "taylor"] });
  const users = [];
  for await (const res of iter) users.push(res);
  console.log(users[0]); // { key: ["users", "taylor"], value: "taylor", versionstamp: "0059e9035e5e7c5e0000" }
}
// Return all users lexicographically before "taylor"
{
  const iter = kv.list<string>({ prefix: ["users"], end: ["users", "taylor"] });
  const users = [];
  for await (const res of iter) users.push(res);
  console.log(users[0]); // { key: ["users", "alex"], value: "alex", versionstamp: "00a44a3c3e53b9750000" }
  console.log(users[1]); // { key: ["users", "sam"], value: "sam", versionstamp: "00e0a2a0f0178b270000" }
  }
// Return all users starting with characters between "a" and "n"
const iter = kv.list<string>({ start: ["users", "a"], end: ["users", "n"] });
const users = [];
for await (const res of iter) users.push(res);
console.log(users[0]); // { key: ["users", "alex"], value: "alex", versionstamp: "00a44a3c3e53b9750000" }


const a = 1n;
const b = 2n;
const c = a + b;
console.log(c);




const updateAccount = async (val = 100n) => {
    await kv.atomic()
      .mutate({
        type: "set",
        key: [
          "accounts", "alex"],
        value: new Deno.KvU64( val + 
          await ( 
            async () => { 
              return ( ( await kv.get(["accounts", "alex"]) as unknown as Deno.KvEntry<bigint | null>).value ?? 0n ) as bigint 
            })()
        ),
      })
      .set( ["users", "benny"] , "benny3" )
      .commit();
}

/*
const updateKeySeq = async (val = 100n) => {
  await kv.atomic()
    .mutate({
      type: "set", 
      key: [
        "accounts", "alex", await ( 
            async () => { 
              return ( 
                ( await kv.get(["accountRec", "alex", ]) as unknown as Deno.KvEntry<bigint | null>).value ?? 0n ) as bigint 
            })()],
      value: new Deno.KvU64( val + 
        await ( 
          async () => { 
            return ( ( await kv.get(["accountRec", "alex"]) as unknown as Deno.KvEntry<bigint | null>).value ?? 0n ) as bigint 
          })()
      ),
    })
    .commit();
}
*/ 
  await updateAccount()
  let res = await kv.get( ["accounts", "alex"] )
  console.log(`New account value: ${res.value}`)
  await updateAccount()
  res = await kv.get( ["accounts", "alex"] )
  console.log(`New account value: ${res.value}`)
  await kv.delete( ["accounts", "alex"] )
  console.log(`deleted ${res.value}`)

  console.log("-------------------------------")
  const iter2 = kv.list<string>({ prefix: ["users"] } );

  for await (const res2 of iter2) {
    console.log(`${JSON.stringify(res2)}`)
  }
  