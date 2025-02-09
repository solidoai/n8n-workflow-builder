#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode
} from '@modelcontextprotocol/sdk/types.js';

class N8NWorkflowBuilder {
  private nodes: any[];
  private connections: any[];
  private nextPosition: { x: number, y: number };

  constructor() {
    this.nodes = [];
    this.connections = [];
    this.nextPosition = { x: 100, y: 100 };
  }

  addNode(nodeType: string, name: string, parameters: any) {
    const node = {
      type: nodeType,
      name: name,
      parameters: parameters,
      position: { ...this.nextPosition }
    };
    this.nodes.push(node);
    this.nextPosition.x += 200;
    return name;
  }

  connectNodes(source: string, target: string, sourceOutput = 0, targetInput = 0) {
    this.connections.push({
      source_node: source,
      target_node: target,
      source_output: sourceOutput,
      target_input: targetInput
    });
  }

  exportWorkflow(): any {
    interface WorkflowConnection {
      node: string;
      type: string;
      index: number;
      sourceNode: string;
      sourceIndex: number;
    }

    interface Workflow {
      nodes: any[];
      connections: {
        main: WorkflowConnection[];
      };
    }

    const workflow: Workflow = {
      nodes: this.nodes,
      connections: { main: [] }
    };

    for (const conn of this.connections) {
      const connection: WorkflowConnection = {
        node: conn.target_node,
        type: 'main',
        index: conn.target_input,
        sourceNode: conn.source_node,
        sourceIndex: conn.source_output
      };
      workflow.connections.main.push(connection);
    }

    return workflow;
  }
}

class N8NWorkflowServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'n8n-workflow-builder',
        version: '0.1.0'
      },
      {
        capabilities: {
          resources: {},
          tools: {}
        }
      }
    );

    this.setupToolHandlers();
    this.server.onerror = (error) => console.error('[MCP Error]', error);
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [{
        name: 'create_workflow',
        description: 'Create and configure n8n workflows programmatically',
        inputSchema: {
          type: 'object',
          properties: {
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
      }]
    }));

    interface WorkflowNode {
      type: string;
      name: string;
      parameters?: Record<string, any>;
    }

    interface WorkflowConnectionSpec {
      source: string;
      target: string;
      sourceOutput?: number;
      targetInput?: number;
    }

    interface WorkflowSpec {
      nodes: WorkflowNode[];
      connections?: WorkflowConnectionSpec[];
    }

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (request.params.name !== 'create_workflow') {
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
      }

      try {
        const builder = new N8NWorkflowBuilder();
        function isWorkflowSpec(obj: any): obj is WorkflowSpec {
          return obj &&
            typeof obj === 'object' &&
            Array.isArray(obj.nodes) &&
            obj.nodes.every((node: any) =>
              typeof node === 'object' &&
              typeof node.type === 'string' &&
              typeof node.name === 'string'
            ) &&
            (!obj.connections || (
              Array.isArray(obj.connections) &&
              obj.connections.every((conn: any) =>
                typeof conn === 'object' &&
                typeof conn.source === 'string' &&
                typeof conn.target === 'string'
              )
            ));
        }

        const args = request.params.arguments;
        if (!isWorkflowSpec(args)) {
          throw new McpError(
            ErrorCode.InvalidParams,
            'Invalid workflow specification: must include nodes array with type and name properties'
          );
        }

        const { nodes, connections } = args;

        for (const node of nodes) {
          builder.addNode(node.type, node.name, node.parameters || {});
        }

        for (const conn of connections || []) {
          builder.connectNodes(
            conn.source,
            conn.target,
            conn.sourceOutput,
            conn.targetInput
          );
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(builder.exportWorkflow(), null, 2)
          }]
        };
      } catch (error) {
        throw new McpError(
          ErrorCode.InternalError,
          `Workflow creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
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
