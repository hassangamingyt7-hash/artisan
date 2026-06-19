import("./dist/server.cjs").catch(err => {
  console.error("Failed to load server.cjs. Did you run 'npm run build' first?", err);
});
