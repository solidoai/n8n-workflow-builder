export interface N8NWorkflowResponse {
  id: string;
  name: string;
  active: boolean;
  nodes: any[];
  connections: any;
  createdAt: string;
  updatedAt: string;
}

export interface N8NExecutionResponse {
  id: number;
  data?: object;
  finished: boolean;
  mode: 'cli' | 'error' | 'integrated' | 'internal' | 'manual' | 'retry' | 'trigger' | 'webhook';
  retryOf?: number | null;
  retrySuccessId?: number | null;
  startedAt: string;
  stoppedAt: string;
  workflowId: number;
  waitTill?: string | null;
  customData?: object;
}

export interface N8NExecutionListResponse {
  data: N8NExecutionResponse[];
  nextCursor?: string;
}

export interface N8NErrorResponse {
  error: string;
}
