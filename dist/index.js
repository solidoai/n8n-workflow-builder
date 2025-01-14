#!/usr/bin/env node
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
class N8NWorkflowBuilder {
    constructor() {
        this.nodes = [];
        this.connections = [];
        this.nextPosition = { x: 100, y: 100 };
    }
    addNode(nodeType, name, parameters) {
        const node = {
            type: nodeType,
            name: name,
            parameters: parameters,
            position: Object.assign({}, this.nextPosition)
        };
        this.nodes.push(node);
        this.nextPosition.x += 200;
        return name;
    }
    connectNodes(source, target, sourceOutput = 0, targetInput = 0) {
        this.connections.push({
            source_node: source,
            target_node: target,
            source_output: sourceOutput,
            target_input: targetInput
        });
    }
    exportWorkflow() {
        const workflow = {
            nodes: this.nodes,
            connections: { main: [] }
        };
        for (const conn of this.connections) {
            const connection = {
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
    constructor() {
        this.server = new Server({
            name: 'n8n-workflow-builder',
            version: '0.1.0'
        }, {
            capabilities: {
                resources: {},
                tools: {}
            }
        });
        this.setupToolHandlers();
        this.server.onerror = (error) => console.error('[MCP Error]', error);
    }
    setupToolHandlers() {
        this.server.setRequestHandler(ListToolsRequestSchema, () => __awaiter(this, void 0, void 0, function* () {
            return ({
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
            });
        }));
        this.server.setRequestHandler(CallToolRequestSchema, (request) => __awaiter(this, void 0, void 0, function* () {
            if (request.params.name !== 'create_workflow') {
                throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
            }
            try {
                const builder = new N8NWorkflowBuilder();
                function isWorkflowSpec(obj) {
                    return obj &&
                        typeof obj === 'object' &&
                        Array.isArray(obj.nodes) &&
                        obj.nodes.every((node) => typeof node === 'object' &&
                            typeof node.type === 'string' &&
                            typeof node.name === 'string') &&
                        (!obj.connections || (Array.isArray(obj.connections) &&
                            obj.connections.every((conn) => typeof conn === 'object' &&
                                typeof conn.source === 'string' &&
                                typeof conn.target === 'string')));
                }
                const args = request.params.arguments;
                if (!isWorkflowSpec(args)) {
                    throw new McpError(ErrorCode.InvalidParams, 'Invalid workflow specification: must include nodes array with type and name properties');
                }
                const { nodes, connections } = args;
                for (const node of nodes) {
                    builder.addNode(node.type, node.name, node.parameters || {});
                }
                for (const conn of connections || []) {
                    builder.connectNodes(conn.source, conn.target, conn.sourceOutput, conn.targetInput);
                }
                return {
                    content: [{
                            type: 'text',
                            text: JSON.stringify(builder.exportWorkflow(), null, 2)
                        }]
                };
            }
            catch (error) {
                throw new McpError(ErrorCode.InternalError, `Workflow creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }));
    }
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            const transport = new StdioServerTransport();
            yield this.server.connect(transport);
            console.error('N8N Workflow Builder MCP server running on stdio');
        });
    }
}
const server = new N8NWorkflowServer();
server.run().catch(console.error);
