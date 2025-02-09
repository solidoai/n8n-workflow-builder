#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio';
import { CallToolRequestSchema, ListToolsRequestSchema, McpError, ErrorCode } from '@modelcontextprotocol/sdk/types';
import * as n8nApi from './services/n8nApi';
import { WorkflowBuilder } from './services/workflowBuilder';
import { validateWorkflowSpec } from './utils/validation';

class N8NWorkflowServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      { name: 'n8n-workflow-builder', version: '0.2.0' },
      { capabilities: { tools: {}, resources: {} } }
    );
    this.setupToolHandlers();
    this.server.onerror = (error) => console.error('[MCP Error]', error);
  }

  private setupToolHandlers() {
    // Register available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'list_workflows',
          description: 'List all workflows from n8n',
          inputSchema: { type: 'object', properties: {} }
        },
        {
          name: 'create_workflow',
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
          description: 'Get a workflow by ID',
          inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] }
        },
        {
          name: 'update_workflow',
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
          description: 'Delete a workflow by ID',
          inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] }
        },
        {
          name: 'activate_workflow',
          description: 'Activate a workflow by ID',
          inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] }
        },
        {
          name: 'deactivate_workflow',
          description: 'Deactivate a workflow by ID',
          inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      try {
        switch (name) {
          case 'list_workflows': {
            const workflows = await n8nApi.listWorkflows();
            return { content: [{ type: 'text', text: JSON.stringify(workflows, null, 2) }] };
          }
          case 'create_workflow': {
            if (!validateWorkflowSpec(args)) {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid workflow specification');
            }
            const builder = new WorkflowBuilder();
            for (const node of args.nodes) {
              builder.addNode(node);
            }
            if (args.connections) {
              for (const conn of args.connections) {
                builder.connectNodes(conn);
              }
            }
            const workflowSpec = builder.exportWorkflow();
            if (args.name) {
              workflowSpec.name = args.name;
            }
            const created = await n8nApi.createWorkflow(workflowSpec);
            return { content: [{ type: 'text', text: JSON.stringify(created, null, 2) }] };
          }
          case 'get_workflow': {
            const workflow = await n8nApi.getWorkflow(args.id);
            return { content: [{ type: 'text', text: JSON.stringify(workflow, null, 2) }] };
          }
          case 'update_workflow': {
            if (!validateWorkflowSpec(args)) {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid workflow specification');
            }
            const updated = await n8nApi.updateWorkflow(args.id, args);
            return { content: [{ type: 'text', text: JSON.stringify(updated, null, 2) }] };
          }
          case 'delete_workflow': {
            const result = await n8nApi.deleteWorkflow(args.id);
            return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
          }
          case 'activate_workflow': {
            const activated = await n8nApi.activateWorkflow(args.id);
            return { content: [{ type: 'text', text: JSON.stringify(activated, null, 2) }] };
          }
          case 'deactivate_workflow': {
            const deactivated = await n8nApi.deactivateWorkflow(args.id);
            return { content: [{ type: 'text', text: JSON.stringify(deactivated, null, 2) }] };
          }
          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
      } catch (error) {
        throw new McpError(ErrorCode.InternalError, `Workflow operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
