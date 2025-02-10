#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sdk_1 = require("@modelcontextprotocol/sdk");
const stdio_1 = require("@modelcontextprotocol/sdk/stdio");
const sdk_schemas_1 = require("./sdk-schemas");
console.log("ListToolsRequestSchema:", sdk_schemas_1.ListToolsRequestSchema);
console.log("CallToolRequestSchema:", sdk_schemas_1.CallToolRequestSchema);
if (!sdk_schemas_1.ListToolsRequestSchema) {
    console.error("ListToolsRequestSchema is undefined!");
}
if (!sdk_schemas_1.CallToolRequestSchema) {
    console.error("CallToolRequestSchema is undefined!");
}
class N8NWorkflowServer {
    constructor() {
        this.server = new sdk_1.Server({ name: 'n8n-workflow-builder', version: '0.2.0' }, { capabilities: { tools: {}, resources: {} } });
        this.setupToolHandlers();
        this.server.onerror = (error) => console.error('[MCP Error]', error);
    }
    setupToolHandlers() {
        // Register available tools using the local schemas and return an array of tool definitions.
        this.server.setRequestHandler(sdk_schemas_1.ListToolsRequestSchema, async (req) => {
            console.log("listTools handler invoked with request:", req);
            return {
                tools: [
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
                    }
                ]
            };
        });
        this.server.setRequestHandler(sdk_schemas_1.CallToolRequestSchema, async (request) => {
            // Simplified handler for testing purposes
            return { content: [{ type: 'text', text: 'Tool call handled' }] };
        });
    }
    async run() {
        const transport = new stdio_1.StdioServerTransport();
        await this.server.connect(transport);
        console.error('N8N Workflow Builder MCP server running on stdio');
    }
}
const server = new N8NWorkflowServer();
server.run().catch(console.error);
