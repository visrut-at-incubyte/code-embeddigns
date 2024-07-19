import { glob } from "glob";
import * as path from "path";
import * as fs from "fs/promises";
import * as dotenv from "dotenv";
import { encode } from "gpt-tokenizer";

dotenv.config();

interface CodeFile {
  path: string;
  source_code: string;
  token_count: number;
}

const cache_dir = path.join(process.cwd(), "cache");
fs.mkdir(cache_dir, { recursive: true });

const scan_directory = async (dir: string, ignorePatterns: string[] = []) => {
  const paths = await glob("**/*", {
    ignore: ignorePatterns,
    cwd: dir,
    withFileTypes: true,
  });

  return paths.filter((path) => path.isFile()).map((file) => file.fullpath());
};

const ignore_patterns = process.env.IGNORE_PATTERNS?.split(",") || [];

const get_code_files_within_token_limit = async (
  file_paths: string[]
): Promise<CodeFile[]> => {
  const code_files: CodeFile[] = [];

  for (const file_path of file_paths) {
    const cache_path = path.join(cache_dir, path.basename(file_path) + ".json");
    let code_file: CodeFile;

    try {
      const cachedData = await fs.readFile(cache_path, "utf-8");
      code_file = JSON.parse(cachedData);
    } catch {
      const source_code = await fs.readFile(file_path, "utf-8");
      const token_count = encode(source_code).length;

      if (token_count <= parseInt(process.env.TOKEN_LIMIT!)) {
        code_file = { path: file_path, source_code, token_count };
        await fs.writeFile(cache_path, JSON.stringify(code_file), "utf-8");
      }
    }

    if (code_file!) {
      code_files.push(code_file);
    }
  }

  return code_files;
};

const scan = async () => {
  const file_paths = await scan_directory(
    path.join(process.cwd(), process.env.CODEBASE_PATH ?? ""),
    ignore_patterns
  );

  const code_files = await get_code_files_within_token_limit(file_paths);
  console.log(code_files[0]);
  console.log(code_files.length);
};

scan();
