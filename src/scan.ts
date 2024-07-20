import { glob } from "glob";
import * as path from "path";
import * as fs from "fs/promises";
import * as dotenv from "dotenv";
import { encode } from "gpt-tokenizer";
import { QdrantClient } from "@qdrant/js-client-rest";
import {
  OpenAIClient as AzureOpenAIClient,
  AzureKeyCredential,
} from "@azure/openai";

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

const openai_azure = new AzureOpenAIClient(
  process.env.AZURE_LLM_ENDPOINT!,
  new AzureKeyCredential(process.env.AZURE_LLM_API_KEY!)
);

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

const add_vector_to_code_file = async (code_file: CodeFile) => {
  const vectorCachePath = path.join(
    cache_dir,
    `vector_${code_file.base_name}.json`
  );

  try {
    const cachedVectorData = await fs.readFile(vectorCachePath, "utf-8");
    code_file.vector = JSON.parse(cachedVectorData);
  } catch {
    try {
      const vectors = await openai_azure.getEmbeddings(
        process.env.AZURE_LLM_MODEL_NAME!,
        [code_file.source_code]
      );

      if (vectors.data && vectors.data.length > 0) {
        code_file.vector = vectors.data[0].embedding;
        await fs.writeFile(
          vectorCachePath,
          JSON.stringify(code_file.vector),
          "utf-8"
        );
      }
    } catch (error) {
      console.error("Failed to fetch embeddings:", error);
    }
  }
};

const scan = async () => {
  await create_collection_if_not_exist();

  let file_paths = await scan_directory(
    path.join(process.cwd(), process.env.CODEBASE_PATH ?? ""),
    ignore_patterns
  );

  file_paths = file_paths.slice(0, 1000);

  const code_files = await get_code_files_within_token_limit(file_paths);
  await Promise.all(code_files.map(add_vector_to_code_file));

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

async function scan_directory(dir: string, ignorePatterns: string[] = []) {
  const paths = await glob("**/*", {
    ignore: ignorePatterns,
    cwd: dir,
    withFileTypes: true,
  });

  return paths.filter((path) => path.isFile()).map((file) => file.fullpath());
}

const chunk_array = <T>(array: T[], size: number): T[][] => {
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
};

async function create_collection_if_not_exist() {
  const { collections } = await vec_db.getCollections();
  if (collections.length <= 0) {
    vec_db.createCollection("codebase", {
      vectors: {
        size: parseInt(process.env.VECTOR_SIZE!),
        distance: "Cosine",
      },
    });
  }
}
