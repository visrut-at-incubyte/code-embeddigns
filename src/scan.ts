import { glob } from "glob";
import * as dotenv from "dotenv";

dotenv.config();

const scanDirectory = async (dir: string, ignorePatterns: string[] = []) => {
  const paths = await glob("**/*", {
    ignore: ignorePatterns,
    cwd: dir,
    withFileTypes: true,
  });

  return paths.filter((path) => path.isFile()).map((file) => file.fullpath());
};

const ignorePatterns = process.env.IGNORE_PATTERNS?.split(",") || [];

const scan = async () => {
  const files = await scanDirectory(process.cwd(), ignorePatterns);
  console.log(files.length);
  // for (const file of files) {
  //   console.log(file);
  // }
};

scan();
