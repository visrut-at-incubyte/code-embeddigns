import { glob } from "glob";
import * as path from "path";
import * as fs from "fs/promises";
import * as dotenv from "dotenv";
import { encode } from "gpt-tokenizer";
import { QdrantClient } from "@qdrant/js-client-rest";

interface CodeFile {
  path: string;
  source_code: string;
  base_name: string;
  token_count: number;
  vector?: number[];
}

dotenv.config();

const vec_db = new QdrantClient({
  url: "http://localhost:6333",
});

const cache_dir = path.join(process.cwd(), "cache");
fs.mkdir(cache_dir, { recursive: true });

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
        code_file = {
          source_code,
          token_count,
          path: file_path,
          base_name: path.basename(file_path),
        };
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

  const chunks = chunk_array(code_files, 10);
  chunks.forEach((chunk, chunkIndex) => {
    const ids = chunk.map((_, index) => chunkIndex * 10 + index + 1);
    const payloads = chunk.map((file) => ({
      path: file.path,
      source_code: file.source_code,
      base_name: file.base_name,
      token_count: file.token_count,
    }));
    const vectors = chunk.map((file) => file.vector || []);

    vec_db.upsert("codebase", {
      batch: {
        ids: ids,
        payloads: payloads,
        vectors: vectors,
      },
    });
  });
};

scan();

const scan_directory = async (dir: string, ignorePatterns: string[] = []) => {
  const paths = await glob("**/*", {
    ignore: ignorePatterns,
    cwd: dir,
    withFileTypes: true,
  });

  return paths.filter((path) => path.isFile()).map((file) => file.fullpath());
};

const chunk_array = <T>(array: T[], size: number): T[][] => {
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
};
