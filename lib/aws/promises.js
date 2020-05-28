// aws-sdk has shit promise support last time i checked (which was a long time ago)
// but we'll just wrap callbacks in our own promise support and be done with it
export async function invokeAsync(client, method, ...args) {
  return await new Promise((resolve, reject) => {
    console.log('invokeAsync; a');
    client[method](...args, (err, result) => {
      console.log('invokeAsync; b');
      if (err) {
        console.log('invokeAsync; b -> reject');
        reject(err);
        return;
      }
      console.log('invokeAsync; b -> resolve');
      resolve(result);
    });
  });
}
