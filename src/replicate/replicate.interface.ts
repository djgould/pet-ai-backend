export interface ReplicateGetPrediction {
  id: string;
  version: string;
  urls: {
    get: string;
    cancel: string;
  };
  created_at: string;
  started_at: string;
  completed_at: string;
  source: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  input: {
    prompt: string;
  };
  output: string[] | string;
  error: string;
  logs: string;
  metrics: {
    predict_time: number;
  };
}

export interface ReplicateCreatePrediction {
  id: string;
  version: string;
  urls: {
    get: string;
    cancel: string;
  };
  created_at: string;
  started_at: string;
  completed_at: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  input: {
    text: string;
  };
  output: string[];
  error: string;
  logs: string;
  metrics: {
    predict_time: number;
  };
}
