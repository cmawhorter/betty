// aws-sdk has shit promise support last time i checked (which was a long time ago)
// but we'll just wrap callbacks in our own promise support and be done with it
export function invokeAsync(client, method, ...args) {
  return new Promise((resolve, reject) => {
    client[method](...args, (err, result) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(result);
    });
  });
}
