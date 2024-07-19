import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config();

const scanDirectory = (dir: string): string[] => {
  let results: string[] = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.resolve(dir, file);
    const stat = fs.statSync(file);
    if (stat?.isDirectory()) {
      results = results.concat(scanDirectory(file));
    } else {
      results.push(file);
    }
  });
  return results;
};

scanDirectory(process.cwd()).forEach((file) => {
  console.log(file);
});
