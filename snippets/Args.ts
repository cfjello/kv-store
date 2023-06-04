function myFunction(arg1: string, arg2: number): void;
function myFunction(args: { arg1: string; arg2: number }): void;
function myFunction(arg1OrArgs: string | { arg1: string; arg2: number }, arg2?: number) {
  if (typeof arg1OrArgs === "string") {
    console.log(arg1OrArgs, arg2);
  } else {
    console.log(arg1OrArgs.arg1, arg1OrArgs.arg2);
  }
}


myFunction('Hi', 2)
myFunction({arg1: 'Hey', arg2: 20})