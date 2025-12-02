// mcp-server.mjs
// MCP server for Node.js backend: exposes tools for employee CRUD
// Tools: list_employees, create_employee, delete_employee

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ----- Resolve __dirname in ES module -----
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use the SAME employees.json file as server.js
const DATA_FILE = path.join(__dirname, "employees.json");

// ---------- Helper functions (same logic as server.js) ----------

function loadEmployees() {
  if (!fs.existsSync(DATA_FILE)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    if (!raw.trim()) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error("Error reading employees.json:", err);
    return [];
  }
}

function saveEmployees(employees) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(employees, null, 2));
}

function getNextId(employees) {
  if (employees.length === 0) return 1;
  return Math.max(...employees.map((e) => e.id)) + 1;
}

// ---------- Create MCP server ----------

const server = new McpServer({
  name: "employee-node-mcp",
  version: "1.0.0",
});

// ---------- Tool 1: list_employees ----------
// No params -> returns all employees as text JSON

server.registerTool(
  "list_employees",
  {
    description: "List all employees from the Node.js backend.",
    inputSchema: z
      .object({})
      .describe("No parameters needed. Just call to list all employees."),
  },
  async (_args) => {
    const employees = loadEmployees();
    return {
      content: [
        {
          type: "text",
          text:
            employees.length === 0
              ? "No employees found."
              : JSON.stringify(employees, null, 2),
        },
      ],
    };
  }
);

// ---------- Tool 2: create_employee ----------
// Creates a new employee, similar to POST /api/employees

server.registerTool(
  "create_employee",
  {
    description: "Create a new employee in the Node.js backend.",
    inputSchema: z
      .object({
        name: z.string().min(1).describe("Employee full name"),
        email: z.string().email().describe("Employee email address"),
        phone: z
          .string()
          .regex(/^\d{10}$/, "Phone must be a 10-digit number")
          .describe("10-digit mobile number"),
        role: z
          .string()
          .optional()
          .describe("Job role, e.g., Frontend Developer"),
        department: z
          .string()
          .optional()
          .describe("Department, e.g., IT, QA, HR"),
        salary: z
          .number()
          .optional()
          .describe("Salary as a number (optional)"),
        date_of_joining: z
          .string()
          .optional()
          .describe("Date of joining in YYYY-MM-DD format"),
        status: z
          .string()
          .optional()
          .describe("Status: Active or Inactive"),
      })
      .describe("Data for the new employee."),
  },
  async (args) => {
    const employees = loadEmployees();

    const newEmployee = {
      id: getNextId(employees),
      name: args.name,
      email: args.email,
      phone: args.phone,
      role: args.role || "",
      department: args.department || "",
      salary: args.salary ?? 0,
      date_of_joining: args.date_of_joining || "",
      status: args.status || "Active",
    };

    employees.push(newEmployee);
    saveEmployees(employees);

    return {
      content: [
        {
          type: "text",
          text:
            "Employee created:\n" + JSON.stringify(newEmployee, null, 2),
        },
      ],
    };
  }
);

// ---------- Tool 3: delete_employee ----------
// Deletes by ID, similar to DELETE /api/employees/:id

server.registerTool(
  "delete_employee",
  {
    description: "Delete an employee by ID from the Node.js backend.",
    inputSchema: z
      .object({
        id: z
          .number()
          .int()
          .positive()
          .describe("Employee numeric ID to delete"),
      })
      .describe("Provide the employee ID to delete."),
  },
  async (args) => {
    const employees = loadEmployees();
    const beforeCount = employees.length;
    const filtered = employees.filter((e) => e.id !== args.id);

    if (filtered.length === beforeCount) {
      return {
        content: [
          {
            type: "text",
            text: `No employee found with id ${args.id}.`,
          },
        ],
      };
    }

    saveEmployees(filtered);

    return {
      content: [
        {
          type: "text",
          text: `Employee with id ${args.id} deleted successfully.`,
        },
      ],
    };
  }
);

// ---------- Start MCP server over stdio ----------
// NOTE: do NOT console.log here; MCP uses stdout for JSON-RPC.
// If you log, always use console.error (stderr).

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("MCP Node server error:", err);
  process.exit(1);
});
