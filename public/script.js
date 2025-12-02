const API_BASE = "/api/employees"; // works for both Flask and Node

const employeeForm = document.getElementById("employee-form");
const employeeTableBody = document.getElementById("employee-table-body");
const formTitle = document.getElementById("form-title");
const cancelEditBtn = document.getElementById("cancel-edit-btn");
const employeeIdInput = document.getElementById("employee-id");
const employeeCount = document.getElementById("employee-count");

// Filters
const searchInput = document.getElementById("search-text");
const filterDepartment = document.getElementById("filter-department");
const filterRole = document.getElementById("filter-role");
const filterStatus = document.getElementById("filter-status");
const searchBtn = document.getElementById("search-btn");

let isEditing = false;
let allEmployees = [];
let filteredEmployees = [];

// Load employees on page load
document.addEventListener("DOMContentLoaded", () => {
  fetchEmployees();

  // Live filters
  searchInput.addEventListener("input", () => applyFilters(false));
  filterDepartment.addEventListener("change", () => applyFilters(false));
  filterRole.addEventListener("change", () => applyFilters(false));
  filterStatus.addEventListener("change", () => applyFilters(false));

  // Search button: filter + auto-edit when exactly one match
  searchBtn.addEventListener("click", () => {
    applyFilters(true);
  });
});

async function fetchEmployees() {
  employeeTableBody.innerHTML = "<tr><td colspan='7'>Loading...</td></tr>";

  try {
    const res = await fetch(API_BASE);
    const data = await res.json();
    allEmployees = data || [];
    applyFilters(false);
  } catch (err) {
    console.error(err);
    employeeTableBody.innerHTML =
      "<tr><td colspan='7'>Error loading employees</td></tr>";
  }
}

// Reset filters back to show everything
function resetFilters() {
  if (searchInput) searchInput.value = "";
  if (filterDepartment) filterDepartment.value = "ALL";
  if (filterRole) filterRole.value = "ALL";
  if (filterStatus) filterStatus.value = "ALL";
}

// Apply search + filters
function applyFilters(triggeredBySearch = false) {
  const text = searchInput.value.trim().toLowerCase();
  const dept = filterDepartment.value;
  const role = filterRole.value;
  const status = filterStatus.value;

  filteredEmployees = allEmployees.filter((emp) => {
    const name = (emp.name || "").toLowerCase();
    const email = (emp.email || "").toLowerCase();
    const empDept = emp.department || "";
    const empRole = emp.role || "";
    const empStatus = emp.status || "";

    const matchesText =
      !text || name.includes(text) || email.includes(text);

    const matchesDept =
      dept === "ALL" || empDept === dept;

    const matchesRole =
      role === "ALL" || empRole === role;

    const matchesStatus =
      status === "ALL" || empStatus === status;

    return matchesText && matchesDept && matchesRole && matchesStatus;
  });

  // If triggered via Search button and only one match -> auto open in edit mode
  if (triggeredBySearch && filteredEmployees.length === 1) {
    startEdit(filteredEmployees[0].id);
  }

  renderEmployees(filteredEmployees);
}

function renderEmployees(employees) {
  if (!employees.length) {
    employeeTableBody.innerHTML =
      "<tr><td colspan='7'>No employees found</td></tr>";
    employeeCount.textContent = "0 employees";
    return;
  }

  employeeTableBody.innerHTML = "";
  employeeCount.textContent = `${employees.length} employee${
    employees.length > 1 ? "s" : ""
  }`;

  employees.forEach((emp) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${emp.id}</td>
      <td>${emp.name}</td>
      <td>${emp.email}</td>
      <td>${emp.role || ""}</td>
      <td>${emp.department || ""}</td>
      <td>${emp.status || ""}</td>
      <td>
        <button class="secondary" onclick="startEdit(${emp.id})">Edit</button>
        <button class="danger" onclick="deleteEmployee(${emp.id})">Delete</button>
      </td>
    `;

    employeeTableBody.appendChild(tr);
  });
}

// Handle form submit (create or update)
employeeForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  // 🔹 Strong phone validation: exactly 10 digits
  const rawPhone = document.getElementById("phone").value.trim();
  const phoneDigits = rawPhone.replace(/\D/g, ""); // remove non-digits

  if (phoneDigits.length !== 10) {
    alert("Phone number must be exactly 10 digits.");
    return;
  }

  const payload = {
    name: document.getElementById("name").value.trim(),
    email: document.getElementById("email").value.trim(),
    phone: phoneDigits,
    role: document.getElementById("role").value.trim(),
    department: document.getElementById("department").value.trim(),
    salary: Number(document.getElementById("salary").value) || 0,
    date_of_joining: document.getElementById("date_of_joining").value,
    status: document.getElementById("status").value
  };

  if (!payload.name || !payload.email || !payload.phone) {
    alert("Name, Email and Phone are required.");
    return;
  }

  const id = employeeIdInput.value;

  try {
    if (!isEditing) {
      // CREATE
      const res = await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        alert("Error: " + (err.error || res.statusText));
        return;
      }
    } else {
      // UPDATE
      const res = await fetch(`${API_BASE}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        alert("Error: " + (err.error || res.statusText));
        return;
      }
    }

    // After successful save: clear form + clear filters + reload data
    resetForm();
    resetFilters();
    fetchEmployees();
  } catch (err) {
    console.error(err);
    alert("Something went wrong");
  }
});

// Start editing an employee
async function startEdit(id) {
  try {
    const res = await fetch(`${API_BASE}/${id}`);
    if (!res.ok) {
      alert("Employee not found");
      return;
    }
    const emp = await res.json();

    isEditing = true;
    employeeIdInput.value = emp.id;
    formTitle.textContent = "Edit Employee";
    document.getElementById("name").value = emp.name || "";
    document.getElementById("email").value = emp.email || "";
    document.getElementById("phone").value = emp.phone || "";
    document.getElementById("role").value = emp.role || "";
    document.getElementById("department").value = emp.department || "";
    document.getElementById("salary").value = emp.salary || "";
    document.getElementById("date_of_joining").value =
      emp.date_of_joining || "";
    document.getElementById("status").value = emp.status || "Active";
    cancelEditBtn.classList.remove("hidden");
  } catch (err) {
    console.error(err);
    alert("Error loading employee");
  }
}

// Cancel edit
cancelEditBtn.addEventListener("click", () => {
  resetForm();
});

function resetForm() {
  isEditing = false;
  employeeForm.reset();
  employeeIdInput.value = "";
  formTitle.textContent = "Add New Employee";
  cancelEditBtn.classList.add("hidden");
}

// Delete employee
async function deleteEmployee(id) {
  if (!confirm("Are you sure you want to delete this employee?")) return;

  try {
    const res = await fetch(`${API_BASE}/${id}`, {
      method: "DELETE"
    });

    if (res.status === 204) {
      fetchEmployees();
    } else {
      const err = await res.json();
      alert("Error: " + (err.error || res.statusText));
    }
  } catch (err) {
    console.error(err);
    alert("Error deleting employee");
  }
}
