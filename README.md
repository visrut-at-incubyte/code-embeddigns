- Token Limit for OpenAI Embeddings models
- https://platform.openai.com/docs/guides/embeddings

| Model                  | ~ Pages per dollar | Performance on MTEB eval | Max input |
| ---------------------- | ------------------ | ------------------------ | --------- |
| text-embedding-3-small | 62,500             | 62.3%                    | 8191      |
| text-embedding-3-large | 9,615              | 64.6%                    | 8191      |
| text-embedding-ada-002 | 12,500             | 61.0%                    | 8191      |

- You have to run this
- docker run -p 6333:6333 --name code_similarity_qdrant -d qdrant/qdrant

- All code is tightly coupled to Qdrant as a vector database and Azure OpenAI client in typescript
