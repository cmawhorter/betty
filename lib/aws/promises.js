// aws-sdk has shit promise support last time i checked (which was a long time ago)
// but we'll just wrap callbacks in our own promise support and be done with it
export async function invokeAsync(client, method, ...args) {
  return await new Promise((resolve, reject) => {
    if (typeof client[method] !== 'function') {
      reject(new Error(`target aws client has method matching "${method}"`));
      return;
    }
    client[method](...args, (err, result) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(result);
    });
  });
}
