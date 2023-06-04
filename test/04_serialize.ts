import {
    Serializer,
    toDeserialize,
    toSerialize,
  } from "https://deno.land/x/superserial/mod.ts";
  
  class TestUser {
    #_age = 0;
    constructor(public name: string) {
      this.#_age = 0;
    }
  
    setAge(age: number) {
      this.#_age = age;
    }
  
    getAge() {
      return this.#_age;
    }
  
    [toSerialize]() {
      return {
        name: this.name,
        age: this.#_age,
      };
    }
  
    [toDeserialize](
      value: {
        name: string;
        age: number;
      },
    ) {
      this.name = value.name;
      this.#_age = value.age;
    }
  }
  
  const serializer = new Serializer({ classes: { TestUser } });
  
  {
    const user = new TestUser("wan2land");
    user.setAge(20);
  
    console.log(serializer.serialize(user)); // TestUser{"name":"wan2land","age":20}
  }
  {
    const user = serializer.deserialize<TestUser>(
      'TestUser{"name":"wan2land","age":20}',
    );
    console.log(user); // TestUser { name: "wan2land" }
    console.log(user.getAge()); // 20
  }