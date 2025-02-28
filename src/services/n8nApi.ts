import axios from 'axios';
import { N8N_HOST, N8N_API_KEY } from '../config/constants';
import { WorkflowSpec } from '../types/workflow';
import { ExecutionListOptions } from '../types/execution';
import { N8NWorkflowResponse, N8NExecutionResponse, N8NExecutionListResponse } from '../types/api';

const api = axios.create({
  baseURL: N8N_HOST,
  headers: {
    'Content-Type': 'application/json',
    'X-N8N-API-KEY': N8N_API_KEY
  }
});

// Log the API configuration for debugging
console.log('N8N API Configuration:');
console.log('Host:', N8N_HOST);
console.log('API Key:', N8N_API_KEY ? '****' + N8N_API_KEY.slice(-4) : 'Not set');

/**
 * Helper function to handle API errors consistently
 * @param context Description of the operation that failed
 * @param error The error that was thrown
 */
function handleApiError(context: string, error: unknown): never {
  console.error(`Error ${context}:`, error);
  if (axios.isAxiosError(error)) {
    console.error('Request URL:', error.config?.url);
    console.error('Response status:', error.response?.status);
    console.error('Response data:', error.response?.data);
  }
  throw error;
}

/**
 * Helper function to build a URL with query parameters
 * @param basePath The base API path
 * @param params An object containing the query parameters
 * @returns The complete URL with query parameters
 */
function buildUrl(basePath: string, params: Record<string, any> = {}): string {
  const urlParams = new URLSearchParams();
  
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      urlParams.append(key, value.toString());
    }
  }
  
  const queryString = urlParams.toString();
  return `${basePath}${queryString ? '?' + queryString : ''}`;
}

export async function createWorkflow(workflow: WorkflowSpec): Promise<N8NWorkflowResponse> {
  try {
    console.log('Creating workflow');
    const response = await api.post('/workflows', workflow);
    console.log('Response:', response.status, response.statusText);
    return response.data;
  } catch (error) {
    return handleApiError('creating workflow', error);
  }
}

export async function getWorkflow(id: string): Promise<N8NWorkflowResponse> {
  try {
    console.log(`Getting workflow with ID: ${id}`);
    const response = await api.get(`/workflows/${id}`);
    console.log('Response:', response.status, response.statusText);
    return response.data;
  } catch (error) {
    return handleApiError(`getting workflow with ID ${id}`, error);
  }
}

export async function updateWorkflow(id: string, workflow: WorkflowSpec): Promise<N8NWorkflowResponse> {
  try {
    console.log(`Updating workflow with ID: ${id}`);
    const response = await api.put(`/workflows/${id}`, workflow);
    console.log('Response:', response.status, response.statusText);
    return response.data;
  } catch (error) {
    return handleApiError(`updating workflow with ID ${id}`, error);
  }
}

export async function deleteWorkflow(id: string): Promise<any> {
  try {
    console.log(`Deleting workflow with ID: ${id}`);
    const response = await api.delete(`/workflows/${id}`);
    console.log('Response:', response.status, response.statusText);
    return response.data;
  } catch (error) {
    return handleApiError(`deleting workflow with ID ${id}`, error);
  }
}

export async function activateWorkflow(id: string): Promise<N8NWorkflowResponse> {
  try {
    console.log(`Activating workflow with ID: ${id}`);
    const response = await api.patch(`/workflows/${id}/activate`, {});
    console.log('Response:', response.status, response.statusText);
    return response.data;
  } catch (error) {
    return handleApiError(`activating workflow with ID ${id}`, error);
  }
}

export async function deactivateWorkflow(id: string): Promise<N8NWorkflowResponse> {
  try {
    console.log(`Deactivating workflow with ID: ${id}`);
    const response = await api.patch(`/workflows/${id}/deactivate`, {});
    console.log('Response:', response.status, response.statusText);
    return response.data;
  } catch (error) {
    return handleApiError(`deactivating workflow with ID ${id}`, error);
  }
}

export async function listWorkflows(): Promise<N8NWorkflowResponse[]> {
  try {
    console.log('Listing workflows from:', `${N8N_HOST}`);
    const response = await api.get('/workflows');
    console.log('Response:', response.status, response.statusText);
    return response.data;
  } catch (error) {
    return handleApiError('listing workflows', error);
  }
}

// Execution API Methods

/**
 * List workflow executions with optional filtering
 * 
 * @param options Filtering and pagination options
 * @returns A paginated list of executions
 * 
 * Pagination: This endpoint uses cursor-based pagination. To retrieve the next page:
 * 1. Check if the response contains a nextCursor property
 * 2. If present, use it in the next request as the cursor parameter
 * 3. Continue until nextCursor is no longer returned
 */
export async function listExecutions(options: ExecutionListOptions = {}): Promise<N8NExecutionListResponse> {
  try {
    console.log('Listing executions');
    
    const url = buildUrl('/executions', options);
    
    console.log(`Fetching executions from: ${url}`);
    const response = await api.get(url);
    console.log('Response:', response.status, response.statusText);
    return response.data;
  } catch (error) {
    return handleApiError('listing executions', error);
  }
}

/**
 * Get details of a specific execution
 * 
 * @param id The execution ID to retrieve
 * @param includeData Whether to include the full execution data (may be large)
 * @returns The execution details
 */
export async function getExecution(id: number, includeData?: boolean): Promise<N8NExecutionResponse> {
  try {
    console.log(`Getting execution with ID: ${id}`);
    const url = buildUrl(`/executions/${id}`, includeData ? { includeData: true } : {});
    const response = await api.get(url);
    console.log('Response:', response.status, response.statusText);
    return response.data;
  } catch (error) {
    return handleApiError(`getting execution with ID ${id}`, error);
  }
}

/**
 * Delete an execution by ID
 * 
 * @param id The execution ID to delete
 * @returns The response from the deletion operation
 */
export async function deleteExecution(id: number): Promise<N8NExecutionResponse> {
  try {
    console.log(`Deleting execution with ID: ${id}`);
    const response = await api.delete(`/executions/${id}`);
    console.log('Response:', response.status, response.statusText);
    return response.data;
  } catch (error) {
    return handleApiError(`deleting execution with ID ${id}`, error);
  }
}
