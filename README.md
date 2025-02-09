# n8n Workflow Builder MCP Server

[![smithery badge](https://smithery.ai/badge/n8n-workflow-builder)](https://smithery.ai/server/n8n-workflow-builder)

A Model Context Protocol (MCP) server for programmatically creating and managing n8n workflows. This server allows you to interact with your n8n instance directly through the n8n API, enabling you to create, update, activate, deactivate, get, and delete workflows.

<a href="https://glama.ai/mcp/servers/fhoynrlnpp"><img width="380" height="200" src="https://glama.ai/mcp/servers/fhoynrlnpp/badge" alt="n8n Workflow Builder Server MCP server" /></a>

## Table of Contents

- [Features](#features)
- [Installation](#installation)
  - [Prerequisites](#prerequisites)
  - [Local Development (npm)](#local-development-npm)
  - [Docker](#docker)
- [Usage](#usage)
  - [`create_workflow`](#create_workflow)
  - [`create_workflow_and_activate`](#create_workflow_and_activate)
  - [`update_workflow`](#update_workflow)
  - [`activate_workflow`](#activate_workflow)
  - [`deactivate_workflow`](#deactivate_workflow)
  - [`get_workflow`](#get_workflow)
  - [`delete_workflow`](#delete_workflow)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [Security Considerations](#security-considerations)
- [License](#license)

## Features

- Create n8n workflows with nodes and connections.
- Validate workflow specifications.
- Export complete workflow configurations.
- Interact directly with n8n instances via the n8n API.
- Activate and deactivate workflows remotely.
- Update existing workflows.
- Get and delete workflows.

## Installation

### Prerequisites

- Node.js and npm installed.
- Access to an n8n instance (self-hosted or n8n Cloud).
- An API key for your n8n instance.  See [n8n API Authentication](https://docs.n8n.io/api/authentication/) for instructions on how to create an API key.

### Local Development (npm)

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/[your-username]/n8n-workflow-builder.git  # Replace [your-username]
    cd n8n-workflow-builder
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

3.  **Install as an MCP server:**

    ```bash
    npx @makafeli/n8n-workflow-builder
    ```
    Then, add the server to your MCP configuration (usually `cline_mcp_settings.json`) as described in the [Configuration](#configuration) section.


3.  **Start the server:**

    ```bash
    npm start
    ```

    **Note:** After updating the server, you need to restart it for the changes to take effect.

## Usage

The server provides the following tools, which can be accessed through an MCP client (like Claude Desktop with the Smithery integration).  All tools require that you have configured the `N8N_HOST` and `N8N_API_KEY` environment variables (see [Configuration](#configuration)).

### `create_workflow`

Creates a new n8n workflow, but does *not* activate it.

**Input:**

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

-   `nodes`: An array of node objects. Each node *must* have a `type` (the n8n node type) and a `name`.  `parameters` are optional and depend on the specific node type. Refer to the [n8n node documentation](https://docs.n8n.io/integrations/builtin/core-nodes/) for details on node types and their parameters.
-   `connections`: An array of connection objects, defining how nodes are connected.  Each connection *must* have a `source` (the name of the source node) and a `target` (the name of the target node). `sourceOutput` and `targetInput` are optional and default to 0.

**Example Output:**

```json
{
    "id": "newly-created-workflow-id",
    "name": "",
    "active": false,
    "nodes": [
        {
            "parameters": {
                "url": "https://example.com",
                "method": "GET"
            },
            "id": "uuid-generated-by-n8n",
            "name": "HTTP Request",
            "type": "n8n-nodes-base.httpRequest",
            "typeVersion": 1,
            "position": [
                100,
                100
            ]
        }
    ],
    "connections": {},
    "createdAt": "2024-02-09T03:12:01.838Z",
    "updatedAt": "2024-02-09T03:12:01.838Z"
}
```
The output is the full workflow object as returned by the n8n API, including the newly assigned `id`.

### `create_workflow_and_activate`

Creates a new n8n workflow and immediately activates it.

**Input:** Same as `create_workflow`.

**Example Output:** Same as `create_workflow`, but `active` will be `true`.

### `update_workflow`

Updates an existing n8n workflow.

**Input:**

```json
{
  "id": "existing-workflow-id",
  "nodes": [
    {
      "type": "n8n-nodes-base.httpRequest",
      "name": "Updated HTTP Request",
      "parameters": {
        "url": "https://example.com/updated",
        "method": "POST"
      }
    }
  ],
  "connections": []
}
```

-   `id`: The ID of the workflow to update (required).
-   `nodes` and `connections`:  Same as `create_workflow`.  These will *replace* the existing nodes and connections.

**Example Output:** The updated workflow object, as returned by the n8n API.

### `activate_workflow`

Activates an existing n8n workflow.

**Input:**

```json
{
  "id": "existing-workflow-id"
}
```

-   `id`: The ID of the workflow to activate (required).

**Example Output:** The updated workflow object, with `active` set to `true`.

### `deactivate_workflow`

Deactivates an existing n8n workflow.

**Input:**

```json
{
  "id": "existing-workflow-id"
}
```
-   `id`: The ID of the workflow to deactivate (required).

**Example Output:** The updated workflow object, with `active` set to `false`.

### `get_workflow`
Retrieves an existing n8n workflow by its ID.

**Input:**
```json
{
    "id": "existing-workflow-id"
}
```
- `id`: The ID of the workflow to get.

**Example Output:**
The complete workflow object as returned by the n8n API.

### `delete_workflow`
Deletes a workflow by its ID.

**Input:**
```json
{
    "id": "existing-workflow-id"
}
```
- `id`: The ID of the workflow to delete.

**Example Output:**
The response from the n8n API confirming deletion (usually an empty object or a success message).

## Configuration

To use this MCP server, you need to add it to your MCP configuration file (usually `cline_mcp_settings.json`) and provide the necessary environment variables.

```json
{
  "n8n-workflow-builder": {
    "command": "node",
    "args": ["/root/n8n-workflow-builder/src/index.js"],
    "env": {
      "N8N_HOST": "http://your-n8n-instance:5678",
      "N8N_API_KEY": "your-n8n-api-key"
    }
  }
}
```

-   **`command`:**  The command to run the server.  This should be `node`.
-   **`args`:**  The path to the `index.js` file.  **Important:**  This should point to the `src/index.js` file, *not* a `dist` directory (which doesn't exist in this project).
-   **`env`:**  Environment variables.
    -   **`N8N_HOST`:**  The base URL of your n8n instance.  This should include the protocol (`http://` or `https://`) and the port number if it's not the default (80 for HTTP, 443 for HTTPS).  Examples:
        -   `http://localhost:5678` (for a local n8n instance running on the default port)
        -   `https://your-n8n-cloud-instance.app.n8n.cloud` (for an n8n Cloud instance)
    -   **`N8N_API_KEY`:** Your n8n API key.  To obtain your API key:
        1.  Log in to your n8n instance.
        2.  Go to **Settings** > **n8n API**.
        3.  Select **Create an API key**.
        4.  Copy the generated key and paste it here.  **Keep this key secure!**

## Troubleshooting

-   **`N8N_API_KEY environment variable not set.`:**  You'll see a warning in the server's output if the `N8N_API_KEY` is not set.  Make sure you've set this environment variable in your MCP configuration.
-   **`n8n API Error: Unauthorized`:** This usually means your `N8N_API_KEY` is incorrect or expired.  Double-check the key in your n8n instance settings and update your MCP configuration accordingly.
-   **`n8n API Error: connect ECONNREFUSED ...`:** This means the server couldn't connect to your n8n instance.  Make sure:
    -   Your n8n instance is running.
    -   The `N8N_HOST` environment variable is set correctly, including the correct protocol (http/https) and port.
    -   There are no firewalls blocking the connection between the MCP server and your n8n instance.
-   **`Invalid workflow specification`:** This error means the input you provided to one of the tools (like `create_workflow` or `update_workflow`) doesn't match the expected format.  Make sure you're providing a valid `nodes` array, and that each node has a `type` and `name`. Refer to the [Usage](#usage) section for examples.
- **`Workflow creation failed: ...`:** This is a general error that can occur during workflow creation. The error message should provide more details. Common causes include invalid node types, incorrect node parameters, or issues with your n8n instance.

## Contributing

Contributions are welcome! If you'd like to contribute to this project, please follow these guidelines:

1.  Fork the repository.
2.  Create a new branch for your feature or bug fix.
3.  Make your changes, ensuring that your code is well-documented and follows the existing coding style.
4.  Write unit tests for your changes. (Currently, there are no tests, so this is an area for improvement).
5.  Submit a pull request.

## Security Considerations

-   **API Key Security:** Your `N8N_API_KEY` gives full access to your n8n instance.  **Treat it like a password!**  Do not commit it to version control.  Store it securely in your MCP configuration file, and ensure that this file has appropriate permissions.
-   **Input Validation:** The server performs basic input validation to prevent obviously invalid workflow specifications. However, it's important to be aware that malicious users could potentially craft workflows that exploit vulnerabilities in n8n nodes.  Be cautious about the source of workflow specifications you use with this server.
-   **Network Security:** Ensure that communication between the MCP server and your n8n instance is secure, especially if your n8n instance is exposed to the internet. Use HTTPS if possible.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
