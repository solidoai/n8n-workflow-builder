# n8n Workflow Builder MCP Server

This project provides an MCP server for managing n8n workflows. It offers functionality to list, create, update, delete, activate, and deactivate workflows through a set of defined tools.

**Important:**  
This version exclusively supports **npm** for package management and running the server. (npx support will be reintroduced in a future update.)

## Requirements

- Node.js (v14+ recommended)
- npm

## Installation

1. Clone the repository.
2. Navigate to the project directory:
   ```
   cd /root/n8n-workflow-builder
   ```
3. Install the dependencies:
   ```
   npm install
   ```

## Build

Before running the server, rebuild the project using:
```
npm run clean && npm run build
```

## Running the MCP Server

Start the server using:
```
npm start
```

The server will start and connect via stdio. Use your MCP client (configured via your `cline_mcp_settings.json` file) to view and interact with the available tools.

## Available Tools

The following tools are defined in the server and can be accessed through your MCP client:

- **list_workflows**: Lists all workflows from n8n.
- **create_workflow**: Creates a new workflow in n8n.
- **get_workflow**: Retrieves a workflow by its ID.
- **update_workflow**: Updates an existing workflow.
- **delete_workflow**: Deletes a workflow by its ID.
- **activate_workflow**: Activates a workflow by its ID.
- **deactivate_workflow**: Deactivates a workflow by its ID.

## Configuration

Server configuration is managed via the `cline_mcp_settings.json` file. Ensure that the following environment variables are correctly set:

- `N8N_HOST`: Your n8n API host URL.
- `N8N_API_KEY`: Your n8n API key.

Example configuration in `cline_mcp_settings.json`:

```json
{
  "n8n-workflow-builder": {
    "command": "node",
    "args": ["/root/n8n-workflow-builder/build/index.js"],
    "env": {
      "N8N_HOST": "https://n8n.yasin.nu/api/v1/",
      "N8N_API_KEY": "YOUR_N8N_API_KEY_HERE"
    },
    "disabled": false,
    "alwaysAllow": [
      "create_workflow",
      "create_workflow_and_activate",
      "update_workflow",
      "activate_workflow",
      "deactivate_workflow",
      "get_workflow",
      "delete_workflow"
    ],
    "autoApprove": []
  }
}
```

## Future Enhancements

- Reintroduction of npx support.
- Additional tools and workflow features.

## License

This project is licensed under the MIT License.
