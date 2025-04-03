#!/usr/bin/env node
// NOTA: Use 'import' moderno, axios vira ESM por padrão em versões recentes.
// Se der erro no build, pode precisar de 'npm install axios@^1.0.0' ou ajustar tsconfig.json
// para permitir 'esModuleInterop: true' e 'allowSyntheticDefaultImports: true'
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
// ***** NOVO: Importar o transporte WebSocket *****
import { WebSocketServerTransport } from '@modelcontextprotocol/sdk/server/ws.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode,
} from '@modelcontextprotocol/sdk/types.js';
import axios, { AxiosError } from 'axios'; // Import moderno
import dotenv from 'dotenv';

dotenv.config(); // Carrega variáveis de ambiente .env (se existir)

// Classe auxiliar para construir a estrutura do workflow n8n
class N8NWorkflowBuilder {
  private nodes: any[] = [];
  private connections: any[] = [];
  private nextPosition = { x: 100, y: 100 };

  addNode(nodeType: string, name: string, parameters: any): string {
    const nodeId = name; // Usar o nome como ID simplifica a conexão por enquanto
    const node = {
      id: nodeId, // Adicionar ID ao nó
      type: nodeType,
      name: name,
      typeVersion: 1, // Adicionar typeVersion (pode ser necessário)
      parameters: parameters,
      position: [this.nextPosition.x, this.nextPosition.y], // Posição como array [x, y]
      credentials: {}, // Adicionar objeto credentials vazio
    };
    this.nodes.push(node);
    this.nextPosition.x += 200;
    return nodeId;
  }

  connectNodes(
    sourceNodeId: string,
    targetNodeId: string,
    sourceOutput = 'main', // Nome da saída, ex: 'main'
    targetInput = 'main' // Nome da entrada, ex: 'main'
  ) {
    // O formato da conexão no JSON final é diferente
    this.connections.push({
      source: sourceNodeId,
      target: targetNodeId,
      sourceOutput: sourceOutput,
      targetInput: targetInput,
    });
  }

  // Exporta no formato esperado pela API do n8n (ligeiramente diferente)
  exportWorkflow(workflowName: string): any {
    const workflow: any = {
      name: workflowName,
      nodes: this.nodes,
      connections: {}, // Conexões são um objeto indexado pelo nome da saída
      active: false, // Workflow começa inativo por padrão
      settings: {}, // Objeto settings vazio
      id: undefined, // ID será definido pelo n8n na criação
    };

    // Processa as conexões para o formato correto
    for (const conn of this.connections) {
      if (!workflow.connections[conn.sourceOutput]) {
        workflow.connections[conn.sourceOutput] = [];
      }
      workflow.connections[conn.sourceOutput].push({
        node: conn.target,
        type: conn.targetInput, // Usa o nome da entrada aqui
        // index: 0 // Index pode não ser necessário se usar nomes
      });
    }
    return workflow;
  }
}

class N8NWorkflowServer {
  private n8nHost: string;
  private n8nApiKey: string;
  private server: Server;
  // ***** NOVO: Definir a porta *****
  private port: number;

  constructor() {
    this.n8nHost = process.env.N8N_HOST || 'http://localhost:5678';
    this.n8nApiKey = process.env.N8N_API_KEY || '';
    // ***** NOVO: Ler a porta do ambiente ou usar 3000 como padrão *****
    this.port = parseInt(process.env.PORT || '3000', 10);

    // Remover /api/v1 se estiver presente, as chamadas axios já o adicionam
    if (this.n8nHost.endsWith('/api/v1')) {
       this.n8nHost = this.n8nHost.slice(0, - '/api/v1'.length);
    }
     if (this.n8nHost.endsWith('/api/v1/')) {
       this.n8nHost = this.n8nHost.slice(0, - '/api/v1/'.length);
    }


    if (!this.n8nApiKey) {
      console.warn(
        'N8N_API_KEY environment variable not set. API calls to n8n will likely fail.'
      );
    }
     if (!process.env.N8N_HOST) {
      console.warn(
        'N8N_HOST environment variable not set. Using default http://localhost:5678.'
      );
    }


    console.log('--- N8N API Configuration ---');
    console.log(`Target N8N Host: ${this.n8nHost}`);
    console.log(`API Key Found: ${this.n8nApiKey ? 'Yes' : 'NO (!!!)'}`);
    console.log(`MCP Server Port: ${this.port}`);
    console.log('-----------------------------');


    this.server = new Server(
      {
        name: 'n8n-workflow-builder',
        version: '0.3.1-ws', // Versão atualizada
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );
    this.setupToolHandlers();
    this.server.onerror = (error) => console.error('[MCP Error]', error);
  }

  // --- Métodos para chamar a API N8n (com tratamento de erro melhorado) ---
  private async makeN8nApiCall(method: 'get' | 'post' | 'put' | 'delete', path: string, data?: any): Promise<any> {
       const url = `${this.n8nHost}/api/v1${path}`; // Garante que /api/v1 está no path
       console.log(`Making n8n API call: ${method.toUpperCase()} ${url}`);
       if(data && method !== 'get' && method !== 'delete'){
           console.log('With data:', JSON.stringify(data, null, 2));
       }
       try {
           const response = await axios({
               method: method,
               url: url,
               data: data,
               headers: {
                   'X-N8N-API-KEY': this.n8nApiKey,
                   'Content-Type': data ? 'application/json' : undefined,
               },
               timeout: 15000 // Timeout de 15 segundos
           });
           console.log(`n8n API response status: ${response.status}`);
           return response.data;
       } catch (error) {
           let message = 'Unknown n8n API error';
           let details: any = {};
           if (axios.isAxiosError(error)) {
                console.error(`n8n API Error Status: ${error.response?.status}`);
                console.error('n8n API Error Response:', JSON.stringify(error.response?.data, null, 2));
               message = `n8n API Error (${error.response?.status || 'Network Error'}): ${error.response?.data?.message || error.message}`;
               details = error.response?.data || { code: error.code, url: url };
           } else if (error instanceof Error) {
               message = error.message;
               details = { stack: error.stack };
           }
           console.error('Full API Call Error:', error);
           throw new McpError(ErrorCode.InternalError, message, details);
       }
   }

  async createWorkflow(workflowData: any): Promise<any> {
    return this.makeN8nApiCall('post', '/workflows', workflowData);
  }

  async updateWorkflow(id: string, workflowData: any): Promise<any> {
    return this.makeN8nApiCall('put', `/workflows/${id}`, workflowData);
  }

  async activateWorkflow(id: string): Promise<any> {
     return this.makeN8nApiCall('post', `/workflows/${id}/activate`);
  }

  async deactivateWorkflow(id: string): Promise<any> {
     return this.makeN8nApiCall('post', `/workflows/${id}/deactivate`);
  }

  async getWorkflow(id: string): Promise<any> {
     return this.makeN8nApiCall('get', `/workflows/${id}`);
  }

  async deleteWorkflow(id: string): Promise<any> {
     return this.makeN8nApiCall('delete', `/workflows/${id}`);
  }
  // --- Fim dos métodos da API N8n ---


  setupToolHandlers() {
    // Handler para ListTools (sem alterações no schema, apenas implementação)
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
       console.log("Handling ListTools request");
      return {
        tools: [
          // ... (definições das ferramentas como antes) ...
                    {
                        name: 'create_workflow',
                        description: 'Create an n8n workflow given its JSON structure',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                name: { type: 'string', description: 'The name for the new workflow'},
                                nodes: {
                                    type: 'array',
                                    description: "Array of node objects (id, type, name, typeVersion, parameters, position, credentials)",
                                    items: { type: 'object' } // Schema simplificado, a API n8n valida
                                },
                                connections: {
                                    type: 'object',
                                    description: "Object mapping output names to arrays of target connections ({ node, type })"
                                    // Schema simplificado
                                }
                            },
                            required: ['name', 'nodes']
                        }
                    },
                    // Adicione as outras definições de ferramentas aqui (update, activate, etc.)
                    // com schemas apropriados se necessário, ou simplificados
                    {
                        name: 'activate_workflow',
                        description: 'Activate an n8n workflow',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                id: { type: 'string', description: 'The ID of the workflow to activate' }
                            },
                            required: ['id']
                        }
                    },
                     {
                        name: 'get_workflow',
                        description: 'Get an n8n workflow details',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                id: { type: 'string', description: 'The ID of the workflow to get' }
                            },
                            required: ['id']
                        }
                    },
                     {
                        name: 'delete_workflow',
                        description: 'Delete an n8n workflow',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                id: { type: 'string', description: 'The ID of the workflow to delete' }
                            },
                            required: ['id']
                        }
                    }
                    // ... etc
        ],
      };
    });

    // Handler para CallTool (lógica principal)
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      console.log(`Handling CallTool request for tool: ${request.params.name}`);
      console.log('With arguments:', JSON.stringify(request.params.arguments, null, 2));

      try {
        // NÂO precisamos mais do N8NWorkflowBuilder aqui,
        // assumimos que os argumentos já contêm o JSON correto do workflow
        const args = request.params.arguments;

        let resultData: any; // Variável para armazenar o resultado da API N8n

        switch (request.params.name) {
          case 'create_workflow': {
            // Assume 'args' é o objeto workflow completo (name, nodes, connections)
             if (!args || typeof args.name !== 'string' || !Array.isArray(args.nodes)) {
               throw new McpError(ErrorCode.InvalidParams, 'Invalid arguments for create_workflow. Expected { name: string, nodes: array, connections?: object }');
             }
             // Adiciona campos padrão se não existirem
             const workflowPayload = {
                active: false,
                settings: {},
                connections: {}, // API espera objeto, mesmo que vazio
                ...args // Inclui name, nodes, e connections se fornecido
             };
             resultData = await this.createWorkflow(workflowPayload);
             console.log("Workflow created successfully by n8n API.");
             break;
          }
           case 'activate_workflow': {
             const { id } = args;
             if (typeof id !== 'string') {
               throw new McpError(ErrorCode.InvalidParams, 'Missing or invalid workflow id for activate_workflow');
             }
             resultData = await this.activateWorkflow(id);
              console.log("Workflow activated successfully by n8n API.");
             break;
           }
          case 'get_workflow': {
             const { id } = args;
             if (typeof id !== 'string') {
               throw new McpError(ErrorCode.InvalidParams, 'Missing or invalid workflow id for get_workflow');
             }
             resultData = await this.getWorkflow(id);
              console.log("Workflow retrieved successfully by n8n API.");
             break;
           }
            case 'delete_workflow': {
             const { id } = args;
             if (typeof id !== 'string') {
               throw new McpError(ErrorCode.InvalidParams, 'Missing or invalid workflow id for delete_workflow');
             }
             resultData = await this.deleteWorkflow(id);
              console.log("Workflow deleted successfully by n8n API.");
             break;
           }
          // Adicione casos para 'update_workflow', 'deactivate_workflow', etc.
          default:
            console.error(`Unknown tool called: ${request.params.name}`);
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
        }

        // Retorna o resultado da API N8n como texto JSON
        console.log("Returning successful result to MCP client.");
        return {
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(resultData, null, 2), // Envia a resposta completa da API N8n
              },
            ],
          }
        };

      } catch (error) {
          console.error(`Error during tool call (${request.params.name}):`, error);
          // Re-lança o erro (que já deve ser um McpError se veio da API N8n, ou será convertido)
         if (error instanceof McpError) {
           throw error;
         }
         // Converte outros erros para McpError
         throw new McpError(
           ErrorCode.InternalError,
           `Workflow operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
           error instanceof Error ? { stack: error.stack } : undefined
         );
      }
    });
  }

  // ***** MÉTODO RUN MODIFICADO *****
  async run() {
    try {
        // ***** NOVO: Criar transporte WebSocket *****
        // O 'host' 0.0.0.0 faz ele ouvir em todas as interfaces de rede dentro do container
        const transport = new WebSocketServerTransport({ port: this.port, host: '0.0.0.0' });

        // ***** NOVO: Conectar o servidor usando o transporte WebSocket *****
        // O método 'connect' aqui é para o *servidor* se conectar ao *transporte*, não para ouvir.
        // O transporte que realmente ouve.
        await this.server.connect(transport);

        console.log(`N8N Workflow Builder MCP server listening for WebSocket connections on port ${this.port}`);

    } catch (err) {
         console.error(`Failed to start WebSocket server on port ${this.port}:`, err);
         process.exit(1); // Sai se não conseguir iniciar o servidor
    }
  }
}

// Inicia o servidor
const serverInstance = new N8NWorkflowServer();
serverInstance.run(); // Não precisa de .catch aqui se o run() já trata e faz process.exit
