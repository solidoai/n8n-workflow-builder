#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("@modelcontextprotocol/sdk/server");
const stdio_1 = require("@modelcontextprotocol/sdk/server/stdio");
const types_1 = require("@modelcontextprotocol/sdk/types");
const n8nApi = __importStar(require("./services/n8nApi"));
const workflowBuilder_1 = require("./services/workflowBuilder");
const validation_1 = require("./utils/validation");
class N8NWorkflowServer {
    constructor() {
        this.server = new server_1.Server({ name: 'n8n-workflow-builder', version: '0.2.0' }, { capabilities: { tools: {}, resources: {} } });
        this.setupToolHandlers();
        this.server.onerror = (error) => console.error('[MCP Error]', error);
    }
    setupToolHandlers() {
        // Register available tools
        this.server.setRequestHandler(types_1.ListToolsRequestSchema, async () => ({
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
        this.server.setRequestHandler(types_1.CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;
            try {
                switch (name) {
                    case 'list_workflows': {
                        const workflows = await n8nApi.listWorkflows();
                        return { content: [{ type: 'text', text: JSON.stringify(workflows, null, 2) }] };
                    }
                    case 'create_workflow': {
                        if (!(0, validation_1.validateWorkflowSpec)(args)) {
                            throw new types_1.McpError(types_1.ErrorCode.InvalidParams, 'Invalid workflow specification');
                        }
                        const builder = new workflowBuilder_1.WorkflowBuilder();
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
                        if (!(0, validation_1.validateWorkflowSpec)(args)) {
                            throw new types_1.McpError(types_1.ErrorCode.InvalidParams, 'Invalid workflow specification');
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
                        throw new types_1.McpError(types_1.ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
                }
            }
            catch (error) {
                throw new types_1.McpError(types_1.ErrorCode.InternalError, `Workflow operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
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
