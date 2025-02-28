import axios from 'axios';
import { N8N_HOST, N8N_API_KEY } from '../config/constants';
import { WorkflowSpec } from '../types/workflow';
import { N8NWorkflowResponse } from '../types/api';

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

export async function createWorkflow(workflow: WorkflowSpec): Promise<N8NWorkflowResponse> {
  try {
    console.log('Creating workflow');
    const response = await api.post('/workflows', workflow);
    console.log('Response:', response.status, response.statusText);
    return response.data;
  } catch (error) {
    console.error('Error creating workflow:', error);
    if (axios.isAxiosError(error)) {
      console.error('Request URL:', error.config?.url);
      console.error('Response status:', error.response?.status);
      console.error('Response data:', error.response?.data);
    }
    throw error;
  }
}

export async function getWorkflow(id: string): Promise<N8NWorkflowResponse> {
  try {
    console.log(`Getting workflow with ID: ${id}`);
    const response = await api.get(`/workflows/${id}`);
    console.log('Response:', response.status, response.statusText);
    return response.data;
  } catch (error) {
    console.error(`Error getting workflow with ID ${id}:`, error);
    if (axios.isAxiosError(error)) {
      console.error('Request URL:', error.config?.url);
      console.error('Response status:', error.response?.status);
      console.error('Response data:', error.response?.data);
    }
    throw error;
  }
}

export async function updateWorkflow(id: string, workflow: WorkflowSpec): Promise<N8NWorkflowResponse> {
  try {
    console.log(`Updating workflow with ID: ${id}`);
    const response = await api.put(`/workflows/${id}`, workflow);
    console.log('Response:', response.status, response.statusText);
    return response.data;
  } catch (error) {
    console.error(`Error updating workflow with ID ${id}:`, error);
    if (axios.isAxiosError(error)) {
      console.error('Request URL:', error.config?.url);
      console.error('Response status:', error.response?.status);
      console.error('Response data:', error.response?.data);
    }
    throw error;
  }
}

export async function deleteWorkflow(id: string): Promise<any> {
  try {
    console.log(`Deleting workflow with ID: ${id}`);
    const response = await api.delete(`/workflows/${id}`);
    console.log('Response:', response.status, response.statusText);
    return response.data;
  } catch (error) {
    console.error(`Error deleting workflow with ID ${id}:`, error);
    if (axios.isAxiosError(error)) {
      console.error('Request URL:', error.config?.url);
      console.error('Response status:', error.response?.status);
      console.error('Response data:', error.response?.data);
    }
    throw error;
  }
}

export async function activateWorkflow(id: string): Promise<N8NWorkflowResponse> {
  try {
    console.log(`Activating workflow with ID: ${id}`);
    const response = await api.patch(`/workflows/${id}/activate`, {});
    console.log('Response:', response.status, response.statusText);
    return response.data;
  } catch (error) {
    console.error(`Error activating workflow with ID ${id}:`, error);
    if (axios.isAxiosError(error)) {
      console.error('Request URL:', error.config?.url);
      console.error('Response status:', error.response?.status);
      console.error('Response data:', error.response?.data);
    }
    throw error;
  }
}

export async function deactivateWorkflow(id: string): Promise<N8NWorkflowResponse> {
  try {
    console.log(`Deactivating workflow with ID: ${id}`);
    const response = await api.patch(`/workflows/${id}/deactivate`, {});
    console.log('Response:', response.status, response.statusText);
    return response.data;
  } catch (error) {
    console.error(`Error deactivating workflow with ID ${id}:`, error);
    if (axios.isAxiosError(error)) {
      console.error('Request URL:', error.config?.url);
      console.error('Response status:', error.response?.status);
      console.error('Response data:', error.response?.data);
    }
    throw error;
  }
}

export async function listWorkflows(): Promise<N8NWorkflowResponse[]> {
  try {
    console.log('Listing workflows from:', `${N8N_HOST}`);
    const response = await api.get('/workflows');
    console.log('Response:', response.status, response.statusText);
    return response.data;
  } catch (error) {
    console.error('Error listing workflows:', error);
    if (axios.isAxiosError(error)) {
      console.error('Request URL:', error.config?.url);
      console.error('Response status:', error.response?.status);
      console.error('Response data:', error.response?.data);
    }
    throw error;
  }
}
