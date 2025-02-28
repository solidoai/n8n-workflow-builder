#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from './sdk-schemas';
import * as n8nApi from './services/n8nApi';
import { WorkflowBuilder } from './services/workflowBuilder';
import { validateWorkflowSpec } from './utils/validation';

console.log("ListToolsRequestSchema:", ListToolsRequestSchema);
console.log("CallToolRequestSchema:", CallToolRequestSchema);

if (!ListToolsRequestSchema) {
  console.error("ListToolsRequestSchema is undefined!");
}

if (!CallToolRequestSchema) {
  console.error("CallToolRequestSchema is undefined!");
}

class N8NWorkflowServer {
  private server: InstanceType<typeof Server>;

  constructor() {
    this.server = new Server(
      { name: 'n8n-workflow-builder', version: '0.2.0' },
      { capabilities: { tools: {}, resources: {} } }
    );
    this.setupToolHandlers();
    this.server.onerror = (error: any) => console.error('[MCP Error]', error);
  }

  private setupToolHandlers() {
    // Register available tools using the local schemas and return an array of tool definitions.
    this.server.setRequestHandler(ListToolsRequestSchema, async (req: any) => {
      console.log("listTools handler invoked with request:", req);
      return {
        tools: [
          // Workflow Tools
          {
            name: 'list_workflows',
            enabled: true,
            description: 'List all workflows from n8n',
            inputSchema: { type: 'object', properties: {} }
          },
          {
            name: 'create_workflow',
            enabled: true,
            description: 'Create a new workflow in n8n',
            inputSchema: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                nodes: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      type: { type: 'string' },
                      name: { type: 'string' },
                      parameters: { type: 'object' }
                    },
                    required: ['type', 'name']
                  }
                },
                connections: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      source: { type: 'string' },
                      target: { type: 'string' },
                      sourceOutput: { type: 'number', default: 0 },
                      targetInput: { type: 'number', default: 0 }
                    },
                    required: ['source', 'target']
                  }
                }
              },
              required: ['nodes']
            }
          },
          {
            name: 'get_workflow',
            enabled: true,
            description: 'Get a workflow by ID',
            inputSchema: {
              type: 'object',
              properties: { id: { type: 'string' } },
              required: ['id']
            }
          },
          {
            name: 'update_workflow',
            enabled: true,
            description: 'Update an existing workflow',
            inputSchema: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                nodes: { type: 'array' },
                connections: { type: 'array' }
              },
              required: ['id', 'nodes']
            }
          },
          {
            name: 'delete_workflow',
            enabled: true,
            description: 'Delete a workflow by ID',
            inputSchema: {
              type: 'object',
              properties: { id: { type: 'string' } },
              required: ['id']
            }
          },
          {
            name: 'activate_workflow',
            enabled: true,
            description: 'Activate a workflow by ID',
            inputSchema: {
              type: 'object',
              properties: { id: { type: 'string' } },
              required: ['id']
            }
          },
          {
            name: 'deactivate_workflow',
            enabled: true,
            description: 'Deactivate a workflow by ID',
            inputSchema: {
              type: 'object',
              properties: { id: { type: 'string' } },
              required: ['id']
            }
          },
          
          // Execution Tools
          {
            name: 'list_executions',
            enabled: true,
            description: 'List all executions from n8n with optional filters',
            inputSchema: {
              type: 'object',
              properties: {
                includeData: { type: 'boolean' },
                status: { 
                  type: 'string',
                  enum: ['error', 'success', 'waiting']
                },
                workflowId: { type: 'string' },
                projectId: { type: 'string' },
                limit: { type: 'number' },
                cursor: { type: 'string' }
              }
            }
          },
          {
            name: 'get_execution',
            enabled: true,
            description: 'Get details of a specific execution by ID',
            inputSchema: {
              type: 'object',
              properties: {
                id: { type: 'number' },
                includeData: { type: 'boolean' }
              },
              required: ['id']
            }
          },
          {
            name: 'delete_execution',
            enabled: true,
            description: 'Delete an execution by ID',
            inputSchema: {
              type: 'object',
              properties: {
                id: { type: 'number' }
              },
              required: ['id']
            }
          }
        ]
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
      console.log("callTool handler invoked with request:", request);
      
      try {
        const { name, arguments: args } = request.params;
        
        switch (name) {
          // Workflow Tools
          case 'list_workflows':
            const workflows = await n8nApi.listWorkflows();
            return {
              content: [{ 
                type: 'text', 
                text: JSON.stringify(workflows, null, 2) 
              }]
            };
            
          case 'create_workflow':
            if (!args.name) {
              args.name = 'New Workflow';
            }
            
            const workflowSpec = validateWorkflowSpec({
              name: args.name,
              nodes: args.nodes as any[],
              connections: args.connections || []
            });
            
            const createdWorkflow = await n8nApi.createWorkflow(workflowSpec);
            return {
              content: [{ 
                type: 'text', 
                text: JSON.stringify(createdWorkflow, null, 2) 
              }]
            };
            
          case 'get_workflow':
            if (!args.id) {
              throw new McpError(ErrorCode.InvalidParams, 'Workflow ID is required');
            }
            
            const workflow = await n8nApi.getWorkflow(args.id);
            return {
              content: [{ 
                type: 'text', 
                text: JSON.stringify(workflow, null, 2) 
              }]
            };
            
          case 'update_workflow':
            if (!args.id) {
              throw new McpError(ErrorCode.InvalidParams, 'Workflow ID is required');
            }
            
            const updatedWorkflowSpec = validateWorkflowSpec({
              nodes: args.nodes as any[],
              connections: args.connections || []
            });
            
            const updatedWorkflow = await n8nApi.updateWorkflow(args.id, updatedWorkflowSpec);
            return {
              content: [{ 
                type: 'text', 
                text: JSON.stringify(updatedWorkflow, null, 2) 
              }]
            };
            
          case 'delete_workflow':
            if (!args.id) {
              throw new McpError(ErrorCode.InvalidParams, 'Workflow ID is required');
            }
            
            const deleteResult = await n8nApi.deleteWorkflow(args.id);
            return {
              content: [{ 
                type: 'text', 
                text: JSON.stringify(deleteResult, null, 2) 
              }]
            };
            
          case 'activate_workflow':
            if (!args.id) {
              throw new McpError(ErrorCode.InvalidParams, 'Workflow ID is required');
            }
            
            const activatedWorkflow = await n8nApi.activateWorkflow(args.id);
            return {
              content: [{ 
                type: 'text', 
                text: JSON.stringify(activatedWorkflow, null, 2) 
              }]
            };
            
          case 'deactivate_workflow':
            if (!args.id) {
              throw new McpError(ErrorCode.InvalidParams, 'Workflow ID is required');
            }
            
            const deactivatedWorkflow = await n8nApi.deactivateWorkflow(args.id);
            return {
              content: [{ 
                type: 'text', 
                text: JSON.stringify(deactivatedWorkflow, null, 2) 
              }]
            };
          
          // Execution Tools
          case 'list_executions':
            const executions = await n8nApi.listExecutions({
              includeData: args.includeData,
              status: args.status,
              workflowId: args.workflowId,
              projectId: args.projectId,
              limit: args.limit,
              cursor: args.cursor
            });
            return {
              content: [{ 
                type: 'text', 
                text: JSON.stringify(executions, null, 2) 
              }]
            };
            
          case 'get_execution':
            if (!args.id) {
              throw new McpError(ErrorCode.InvalidParams, 'Execution ID is required');
            }
            
            const execution = await n8nApi.getExecution(args.id, args.includeData);
            return {
              content: [{ 
                type: 'text', 
                text: JSON.stringify(execution, null, 2) 
              }]
            };
            
          case 'delete_execution':
            if (!args.id) {
              throw new McpError(ErrorCode.InvalidParams, 'Execution ID is required');
            }
            
            const deletedExecution = await n8nApi.deleteExecution(args.id);
            return {
              content: [{ 
                type: 'text', 
                text: JSON.stringify(deletedExecution, null, 2) 
              }]
            };
            
          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
      } catch (error) {
        console.error('Error handling tool call:', error);
        
        if (error instanceof McpError) {
          throw error;
        }
        
        return {
          content: [{ 
            type: 'text', 
            text: `Error: ${error instanceof Error ? error.message : String(error)}` 
          }],
          isError: true
        };
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('N8N Workflow Builder MCP server running on stdio');
  }
}

const server = new N8NWorkflowServer();
server.run().catch(console.error);
