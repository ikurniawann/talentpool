export const pipelineQueryKeys = {
  all: ["hris", "pipeline"] as const,
  candidates: () => ["hris", "pipeline", "candidates"] as const,
  brands: () => ["hris", "pipeline", "brands"] as const,
};
