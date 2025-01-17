# n8n Workflow Builder MCP Server

A Model Context Protocol (MCP) server for programmatically creating and managing n8n workflows.

<a href="https://glama.ai/mcp/servers/fhoynrlnpp"><img width="380" height="200" src="https://glama.ai/mcp/servers/fhoynrlnpp/badge" alt="n8n Workflow Builder Server MCP server" /></a>

## Features
- Create workflows with nodes and connections
- Validate workflow specifications
- Export complete workflow configurations
- REST API interface through MCP

## Installation

1. Clone the repository:
```bash
git clone https://github.com/[your-username]/n8n-workflow-builder.git
cd n8n-workflow-builder
```

2. Install dependencies:
```bash
npm install
```

3. Compile TypeScript:
```bash
npx tsc
```

4. Start the server:
```bash
npm start
```

## Usage

The server provides a `create_workflow` tool that accepts a workflow specification:

```json
{
  "nodes": [
    {
      "type": "n8n-nodes-base.httpRequest",
      "name": "HTTP Request",
      "parameters": {
        "url": "https://example.com",
        "method": "GET"
      }
    }
  ],
  "connections": []
}
```

## Configuration

Add the server to your MCP configuration:

```json
{
  "n8n-workflow-builder": {
    "command": "node",
    "args": ["/path/to/n8n-workflow-builder/dist/index.js"]
  }
}
```

## License
MIT
