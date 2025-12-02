// server.js

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, "employees.json");

// Middleware
app.use(cors());
app.use(express.json()); // parse JSON bodies

// Serve static frontend from /public
app.use(express.static(path.join(__dirname, "public")));

// ---------- Helper functions ----------

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

// ---------- Frontend route ----------

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ---------- API routes (REST) ----------

// Health check
app.get("/api/health", (req, res) => {
  res.json({ message: "Node/Express Employee API is running" });
});

// CREATE employee
app.post("/api/employees", (req, res) => {
  const employees = loadEmployees();
  const data = req.body || {};

  const required = ["name", "email", "phone"];
  for (const field of required) {
    if (!data[field] || String(data[field]).trim() === "") {
      return res.status(400).json({ error: `'${field}' is required` });
    }
  }

  // 🔹 Phone validation: exactly 10 digits
  const rawPhone = String(data.phone || "").trim();
  const phoneDigits = rawPhone.replace(/\D/g, "");
  if (phoneDigits.length !== 10) {
    return res
      .status(400)
      .json({ error: "Phone number must be exactly 10 digits" });
  }

  const newEmployee = {
    id: getNextId(employees),
    name: data.name,
    email: data.email,
    phone: phoneDigits,
    role: data.role || "",
    department: data.department || "",
    salary: data.salary || 0,
    date_of_joining: data.date_of_joining || "",
    status: data.status || "Active",
  };

  employees.push(newEmployee);
  saveEmployees(employees);

  res.status(201).json(newEmployee);
});

// READ all employees
app.get("/api/employees", (req, res) => {
  const employees = loadEmployees();
  res.json(employees);
});

// READ single employee
app.get("/api/employees/:id", (req, res) => {
  const employees = loadEmployees();
  const id = Number(req.params.id);
  const emp = employees.find((e) => e.id === id);

  if (!emp) {
    return res.status(404).json({ error: "Employee not found" });
  }
  res.json(emp);
});

// UPDATE employee
app.put("/api/employees/:id", (req, res) => {
  const employees = loadEmployees();
  const id = Number(req.params.id);
  const data = req.body || {};

  const index = employees.findIndex((e) => e.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Employee not found" });
  }

  const emp = employees[index];

  // 🔹 If phone is being updated, validate 10 digits
  let updatedPhone = emp.phone;
  if (data.phone !== undefined) {
    const rawPhone = String(data.phone || "").trim();
    const phoneDigits = rawPhone.replace(/\D/g, "");
    if (phoneDigits.length !== 10) {
      return res
        .status(400)
        .json({ error: "Phone number must be exactly 10 digits" });
    }
    updatedPhone = phoneDigits;
  }

  employees[index] = {
    ...emp,
    name: data.name ?? emp.name,
    email: data.email ?? emp.email,
    phone: updatedPhone,
    role: data.role ?? emp.role,
    department: data.department ?? emp.department,
    salary: data.salary ?? emp.salary,
    date_of_joining: data.date_of_joining ?? emp.date_of_joining,
    status: data.status ?? emp.status,
  };

  saveEmployees(employees);
  res.json(employees[index]);
});

// DELETE employee
app.delete("/api/employees/:id", (req, res) => {
  const employees = loadEmployees();
  const id = Number(req.params.id);

  const filtered = employees.filter((e) => e.id !== id);
  if (filtered.length === employees.length) {
    return res.status(404).json({ error: "Employee not found" });
  }

  saveEmployees(filtered);
  res.status(204).send();
});

// ---------- Start server ----------

app.listen(PORT, () => {
  console.log(`Node Employee app running on http://127.0.0.1:${PORT}`);
});
