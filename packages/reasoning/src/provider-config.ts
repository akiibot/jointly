const REQUIRED = [
  "WATSONX_API_KEY",
  "WATSONX_SERVICE_URL",
  "WATSONX_PROJECT_ID",
  "WATSONX_MODEL_ID",
  "WATSONX_API_VERSION",
] as const;

export interface WatsonxConfiguration {
  apiKey: string;
  serviceUrl: string;
  projectId: string;
  modelId: string;
  apiVersion: string;
}

export function readWatsonxConfiguration(environment: NodeJS.ProcessEnv): WatsonxConfiguration {
  const missing = REQUIRED.filter((name) => !environment[name]);
  if (missing.length) throw new Error(`missing watsonx configuration names: ${missing.join(", ")}`);
  return {
    apiKey: environment.WATSONX_API_KEY!,
    serviceUrl: environment.WATSONX_SERVICE_URL!,
    projectId: environment.WATSONX_PROJECT_ID!,
    modelId: environment.WATSONX_MODEL_ID!,
    apiVersion: environment.WATSONX_API_VERSION!,
  };
}

export function watsonxConfigurationPresence(environment: NodeJS.ProcessEnv) {
  return {
    presentNames: REQUIRED.filter((name) => Boolean(environment[name])),
    missingNames: REQUIRED.filter((name) => !environment[name]),
    valuesRedacted: true as const,
  };
}
