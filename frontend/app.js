/* ============================================================
   AI FINANCE ASSISTANT
   FRONTEND APP.JS
   Compatible with the current index.html structure
   Backend: FastAPI
   ============================================================ */

const API_BASE = "https://wealthpilot-bj3l.onrender.com";

let authToken = localStorage.getItem("finance_token");
let currentUser = null;

let transactions = [];
let budgets = [];
let savingsGoals = [];
let actualSavings = [];
let plannedExpenses = [];
let profile = null;
let financialPreferences = null;

let categoryChart = null;
let summaryChart = null;

let currentTransactionId = null;
let currentBudgetId = null;
let currentSavingsGoalId = null;
let currentPlannedExpenseId = null;

const state = {
    currentPage: "dashboard",
    transactionSearch: "",
    transactionTypeFilter: "all",
    transactionCategoryFilter: "all",
    summaryMonth: getCurrentMonth(),
    planningMonth: getCurrentMonth()
};


/* ============================================================
   INITIALIZATION
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
    initializeApp();
});

async function initializeApp() {
    bindGlobalEvents();
    initializeTheme();

    if (authToken) {
        try {
            await loadCurrentUser();
            showApp();
            await loadAllData();
            navigateTo("dashboard");
        } catch (error) {
            console.error("Initialization failed:", error);
            logout(false);
        }
    } else {
        showAuth();
    }
}


/* ============================================================
   AUTHENTICATION
   ============================================================ */

function showAuth() {
    const authScreen = document.getElementById("auth-screen");
    const appScreen = document.getElementById("app-screen");

    if (authScreen) authScreen.classList.remove("hidden");
    if (appScreen) appScreen.classList.add("hidden");
}

function showApp() {
    const authScreen = document.getElementById("auth-screen");
    const appScreen = document.getElementById("app-screen");

    if (authScreen) authScreen.classList.add("hidden");
    if (appScreen) appScreen.classList.remove("hidden");

    updateUserUI();
}

async function loadCurrentUser() {
    const response = await apiRequest("/me");

    if (response) {
        currentUser = response;
    }
}

async function login(event) {
    event.preventDefault();

    const email = valueOf("login-email");
    const password = valueOf("login-password");

    if (!email || !password) {
        showToast("Please enter your email and password.", "error");
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/login`, {
    method: "POST",
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify({
        email: email,
        password: password
    })
});
        

        const data = await parseResponse(response);

        if (!response.ok) {
            throw new Error(data?.detail || "Login failed.");
        }

        authToken = data.access_token;
        localStorage.setItem("finance_token", authToken);

        await loadCurrentUser();
        showApp();
        await loadAllData();
        navigateTo("dashboard");

        showToast("Welcome back!", "success");

        const form = document.getElementById("login-form");
        if (form) form.reset();

    } catch (error) {
        console.error(error);
        showToast(error.message || "Unable to login.", "error");
    }
}

async function register(event) {
    event.preventDefault();

    const name = valueOf("register-name");
    const email = valueOf("register-email");
    const password = valueOf("register-password");

    if (!name || !email || !password) {
        showToast("Please fill in all required fields.", "error");
        return;
    }

    if (password.length < 6) {
        showToast("Password should contain at least 6 characters.", "error");
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name,
                email,
                password
            })
        });

        const data = await parseResponse(response);

        if (!response.ok) {
            throw new Error(data?.detail || "Registration failed.");
        }

        showToast("Account created successfully. Please login.", "success");

        const registerForm = document.getElementById("register-form");
        if (registerForm) registerForm.reset();

        switchAuthView("login");

    } catch (error) {
        console.error(error);
        showToast(error.message || "Unable to create account.", "error");
    }
}

function logout(showMessage = true) {
    authToken = null;
    currentUser = null;

    localStorage.removeItem("finance_token");

    transactions = [];
    budgets = [];
    savingsGoals = [];
    actualSavings = [];
    plannedExpenses = [];
    profile = null;
    financialPreferences = null;

    showAuth();

    if (showMessage) {
        showToast("Logged out successfully.", "success");
    }
}

function switchAuthView(view) {
    const loginView = document.getElementById("login-view");
    const registerView = document.getElementById("register-view");

    if (!loginView || !registerView) return;

    if (view === "register") {
        loginView.classList.add("hidden");
        registerView.classList.remove("hidden");
    } else {
        registerView.classList.add("hidden");
        loginView.classList.remove("hidden");
    }
}

function updateUserUI() {
    const name =
        currentUser?.name ||
        currentUser?.full_name ||
        currentUser?.username ||
        currentUser?.email ||
        "User";

    const elements = [
        "user-name",
        "sidebar-user-name",
        "profile-display-name"
    ];

    elements.forEach(id => {
        const element = document.getElementById(id);
        if (element) element.textContent = name;
    });

    const emailElement = document.getElementById("sidebar-user-email");
    if (emailElement && currentUser?.email) {
        emailElement.textContent = currentUser.email;
    }
}


/* ============================================================
   API
   ============================================================ */

async function apiRequest(endpoint, options = {}) {
    const headers = {
        ...(options.headers || {})
    };

    if (authToken) {
        headers.Authorization = `Bearer ${authToken}`;
    }

    if (
        options.body &&
        typeof options.body === "object" &&
        !(options.body instanceof FormData) &&
        !(options.body instanceof URLSearchParams)
    ) {
        headers["Content-Type"] = "application/json";
        options.body = JSON.stringify(options.body);
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers
    });

    const data = await parseResponse(response);

    if (response.status === 401) {
        logout(false);
        throw new Error("Your session has expired. Please login again.");
    }

    if (!response.ok) {
        throw new Error(
            data?.detail ||
            data?.message ||
            `Request failed (${response.status})`
        );
    }

    return data;
}

async function parseResponse(response) {
    const text = await response.text();

    if (!text) return null;

    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
}


/* ============================================================
   LOAD DATA
   ============================================================ */

async function loadAllData() {
    await Promise.all([
        loadTransactions(),
        loadBudgets(),
        loadSavingsGoals(),
        loadActualSavings(),
        loadPlannedExpenses(),
        loadProfile(),
        loadFinancialPreferences()
    ]);

    renderEverything();
}

async function loadTransactions() {
    try {
        const data = await apiRequest("/transactions");
        transactions = normalizeArray(data);
    } catch (error) {
        console.error("Transactions:", error);
        transactions = [];
    }
}

async function loadBudgets() {
    try {
        const data = await apiRequest("/budgets");
        budgets = normalizeArray(data);
    } catch (error) {
        console.error("Budgets:", error);
        budgets = [];
    }
}

async function loadSavingsGoals() {
    try {
        const data = await apiRequest("/savings-goals");
        savingsGoals = normalizeArray(data);
    } catch (error) {
        console.error("Savings goals:", error);
        savingsGoals = [];
    }
}

async function loadActualSavings() {
    try {
        const data = await apiRequest("/actual-savings");
        actualSavings = normalizeArray(data);
    } catch (error) {
        console.error("Actual savings:", error);
        actualSavings = [];
    }
}

async function loadPlannedExpenses() {
    try {
        const data = await apiRequest("/planned-expenses");
        plannedExpenses = normalizeArray(data);
    } catch (error) {
        console.error("Planned expenses:", error);
        plannedExpenses = [];
    }
}

async function loadProfile() {
    try {
        const data = await apiRequest("/profile");
        profile = data || null;
    } catch (error) {
        console.error("Profile:", error);
        profile = null;
    }
}

async function loadFinancialPreferences() {
    try {
        const data = await apiRequest("/financial-preferences");
        financialPreferences = data || null;
    } catch (error) {
        console.error("Financial preferences:", error);
        financialPreferences = null;
    }
}

function normalizeArray(data) {
    if (Array.isArray(data)) return data;

    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.transactions)) return data.transactions;
    if (Array.isArray(data?.budgets)) return data.budgets;
    if (Array.isArray(data?.goals)) return data.goals;
    if (Array.isArray(data?.savings_goals)) return data.savings_goals;
    if (Array.isArray(data?.actual_savings)) return data.actual_savings;
    if (Array.isArray(data?.planned_expenses)) return data.planned_expenses;

    return [];
}


/* ============================================================
   NAVIGATION
   ============================================================ */

function navigateTo(page) {
    const validPages = [
        "dashboard",
        "transactions",
        "budgets",
        "savings",
        "savings-coach",
        "planned",
        "summary",
        "profile"
    ];

    if (!validPages.includes(page)) {
        page = "dashboard";
    }

    state.currentPage = page;

    document.querySelectorAll(".page-section").forEach(section => {
        section.classList.add("hidden");
    });

    const target = document.getElementById(`page-${page}`);

    if (target) {
        target.classList.remove("hidden");
    }

    document.querySelectorAll("[data-page]").forEach(item => {
        item.classList.toggle(
            "active",
            item.dataset.page === page
        );
    });

    closeMobileSidebar();

    renderCurrentPage();
}

function renderCurrentPage() {
    switch (state.currentPage) {
        case "dashboard":
            renderDashboard();
            break;
        case "transactions":
            renderTransactions();
            break;
        case "budgets":
            renderBudgets();
            break;
        case "savings":
            renderSavings();
            break;
        case "savings-coach":
            renderSavingsCoach();
            break;
        case "planned":
            renderPlanning();
            break;
        case "summary":
            renderSummary();
            break;
        case "profile":
            renderProfile();
            break;
    }
}

function renderEverything() {
    renderDashboard();
    renderTransactions();
    renderBudgets();
    renderSavings();
    renderSavingsCoach();
    renderPlanning();
    renderSummary();
    renderProfile();
}


/* ============================================================
   DASHBOARD
   ============================================================ */

function renderDashboard() {
    const month = getCurrentMonth();

    const monthlyTransactions = getTransactionsForMonth(month);

    const income = sumTransactions(
        monthlyTransactions.filter(t => isIncome(t))
    );

    const expenses = sumTransactions(
        monthlyTransactions.filter(t => !isIncome(t))
    );

    const calculatedSavings = income - expenses;

    const saved = sumActualSavingsForMonth(month);

    const goal = getSavingsGoalForMonth(month);

    const planned = sumPlannedExpensesForMonth(month);

    setText("dashboard-income", formatCurrency(income));
    setText("dashboard-expenses", formatCurrency(expenses));
    setText("dashboard-balance", formatCurrency(calculatedSavings));

    const savingsRate =
        income > 0 ? (calculatedSavings / income) * 100 : 0;

    setText(
        "dashboard-savings-rate",
        `${formatNumber(savingsRate)}%`
    );

    setText(
        "dashboard-actual-saved",
        formatCurrency(saved)
    );

    setText(
        "dashboard-goal-target",
        goal ? formatCurrency(goal.target_amount) : "—"
    );

    setText(
        "dashboard-goal-remaining",
        goal
            ? formatCurrency(Math.max(Number(goal.target_amount) - saved, 0))
            : "—"
    );

    setText(
        "dashboard-planned-total",
        formatCurrency(planned)
    );

    const progress =
        goal && Number(goal.target_amount) > 0
            ? Math.min((saved / Number(goal.target_amount)) * 100, 100)
            : 0;

    setText(
        "dashboard-goal-progress",
        `${formatNumber(progress)}%`
    );

    renderCategoryChart(month);
    renderRecentTransactions();
}

function renderRecentTransactions() {
    const container = document.getElementById("recent-transactions");

    if (!container) return;

    const recent = [...transactions]
        .sort((a, b) => dateValue(b.date) - dateValue(a.date))
        .slice(0, 5);

    if (!recent.length) {
        container.innerHTML = `
            <div class="empty-state-inline">
                <span>No transactions yet.</span>
            </div>
        `;
        return;
    }

    container.innerHTML = recent.map(transaction => {
        const income = isIncome(transaction);

        return `
            <div class="recent-transaction">
                <div class="transaction-icon">
                    ${income ? "↗" : "↘"}
                </div>

                <div class="recent-transaction-info">
                    <strong>${escapeHTML(
                        transaction.description || "Transaction"
                    )}</strong>
                    <span>
                        ${escapeHTML(
                            transaction.category || "Other"
                        )}
                        ·
                        ${formatDate(transaction.date)}
                    </span>
                </div>

                <strong class="${income ? "income-text" : "expense-text"}">
                    ${income ? "+" : "-"}${formatCurrency(transaction.amount)}
                </strong>
            </div>
        `;
    }).join("");
}

function renderCategoryChart(month) {
    const canvas = document.getElementById("category-chart");

    if (!canvas || typeof Chart === "undefined") return;

    const monthTransactions = getTransactionsForMonth(month)
        .filter(t => !isIncome(t));

    const totals = {};

    monthTransactions.forEach(t => {
        const category = t.category || "Other";
        totals[category] =
            (totals[category] || 0) + Number(t.amount || 0);
    });

    const labels = Object.keys(totals);
    const values = Object.values(totals);

    if (categoryChart) {
        categoryChart.destroy();
    }

    categoryChart = new Chart(canvas, {
        type: "doughnut",
        data: {
            labels,
            datasets: [{
    data: values,
   backgroundColor: [
    "#10B981", // Emerald
    "#6366F1", // Indigo
    "#F59E0B", // Amber
    "#F43F5E", // Rose
    "#8B5CF6", // Purple
    "#06B6D4", // Cyan
    "#EC4899", // Pink
    "#64748B"  // Slate
],
    borderWidth: 2,
    borderColor: "#FFFFFF"
}]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: "bottom"
                }
            }
        }
    });
}


/* ============================================================
   TRANSACTIONS
   ============================================================ */

function openTransactionModal(transactionId = null) {
    currentTransactionId = transactionId;

    const modal = document.getElementById("transaction-modal");
    const form = document.getElementById("transaction-form");

    if (!modal || !form) return;

    form.reset();

    const transaction = transactions.find(
        t => Number(t.id) === Number(transactionId)
    );

    if (transaction) {
        setValue("transaction-description", transaction.description);
        setValue("transaction-merchant", transaction.merchant || "");
        setValue("transaction-amount", transaction.amount);
        setValue("transaction-date", normalizeDateInput(transaction.date));
        setValue(
            "transaction-type",
            transaction.transaction_type || transaction.type || "expense"
        );
        setValue(
            "custom-category",
            transaction.category || ""
        );

        showAISuggestion(
            transaction.predicted_category || transaction.category,
            null
        );
    } else {
        setValue(
            "transaction-date",
            getTodayISO()
        );

        setValue("transaction-type", "expense");

        hideAISuggestion();
    }

    updateTransactionModalTitle();
    modal.classList.remove("hidden");
}

function closeTransactionModal() {
    const modal = document.getElementById("transaction-modal");

    if (modal) {
        modal.classList.add("hidden");
    }

    currentTransactionId = null;
}

function updateTransactionModalTitle() {
    const title =
        document.querySelector("#transaction-modal .modal-title") ||
        document.querySelector("#transaction-modal h2") ||
        document.querySelector("#transaction-modal h3");

    if (title) {
        title.textContent = currentTransactionId
            ? "Edit Transaction"
            : "Add Transaction";
    }
}

async function saveTransaction(event) {
    event.preventDefault();

    const description = valueOf("transaction-description").trim();
    const merchant = valueOf("transaction-merchant").trim();
    const amount = Number(valueOf("transaction-amount"));
    const date = valueOf("transaction-date") || getTodayISO();
    const transactionType =
        valueOf("transaction-type") || "expense";
    const category = valueOf("custom-category").trim();

    if (!description) {
        showToast("Please enter a description.", "error");
        return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
        showToast("Please enter a valid amount.", "error");
        return;
    }

    if (!category) {
        showToast("Please select or enter a category.", "error");
        return;
    }

    const payload = {
        description,
        merchant: merchant || null,
        amount,
        date,
        transaction_type: transactionType,
        category
    };

    try {
        if (currentTransactionId) {
            await apiRequest(
                `/transactions/${currentTransactionId}`,
                {
                    method: "PUT",
                    body: payload
                }
            );

            showToast("Transaction updated.", "success");
        } else {
            await apiRequest("/transactions", {
                method: "POST",
                body: payload
            });

            showToast("Transaction added.", "success");
        }

        closeTransactionModal();

        await refreshFinancialData();

    } catch (error) {
        console.error(error);
        showToast(
            error.message || "Unable to save transaction.",
            "error"
        );
    }
}

async function deleteTransaction(id) {
    if (!id) return;

    const confirmed = window.confirm(
        "Delete this transaction?"
    );

    if (!confirmed) return;

    try {
        await apiRequest(`/transactions/${id}`, {
            method: "DELETE"
        });

        showToast("Transaction deleted.", "success");

        await refreshFinancialData();

    } catch (error) {
        console.error(error);
        showToast(
            error.message || "Unable to delete transaction.",
            "error"
        );
    }
}

async function editTransaction(id) {
    openTransactionModal(id);
}

function renderTransactions() {
    const tbody = document.getElementById(
        "transactions-table-body"
    );

    if (!tbody) return;

    const search = state.transactionSearch.toLowerCase();

    let filtered = [...transactions];

    if (search) {
        filtered = filtered.filter(t => {
            const text = [
                t.description,
                t.merchant,
                t.category,
                t.predicted_category
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            return text.includes(search);
        });
    }

    if (state.transactionTypeFilter !== "all") {
        filtered = filtered.filter(t =>
            (t.transaction_type || t.type || "expense").toLowerCase() ===
            state.transactionTypeFilter
        );
    }

    if (state.transactionCategoryFilter !== "all") {
        filtered = filtered.filter(t =>
            (t.category || "Other") ===
            state.transactionCategoryFilter
        );
    }

    filtered.sort(
        (a, b) => dateValue(b.date) - dateValue(a.date)
    );

    const empty = document.getElementById("transactions-empty");

    if (!filtered.length) {
        tbody.innerHTML = "";

        if (empty) {
            empty.classList.remove("hidden");
        }

        return;
    }

    if (empty) {
        empty.classList.add("hidden");
    }

    tbody.innerHTML = filtered.map(transaction => {
        const income = isIncome(transaction);

        return `
            <tr>
                <td>
                    <strong>
                        ${escapeHTML(transaction.description || "—")}
                    </strong>
                    ${
                        transaction.merchant
                            ? `<small>${escapeHTML(transaction.merchant)}</small>`
                            : ""
                    }
                </td>

                <td>
                    ${formatDate(transaction.date)}
                </td>

                <td>
                    <span class="category-badge">
                        ${escapeHTML(transaction.category || "Other")}
                    </span>
                </td>

                <td class="${income ? "income-text" : "expense-text"}">
                    ${income ? "+" : "-"}${formatCurrency(transaction.amount)}
                </td>

                <td>
                    <span class="type-badge ${income ? "income" : "expense"}">
                        ${income ? "Income" : "Expense"}
                    </span>
                </td>

                <td>
                    <div class="table-actions">
                        <button
                            type="button"
                            class="icon-button"
                            onclick="editTransaction(${transaction.id})"
                            title="Edit"
                        >
                            ✎
                        </button>

                        <button
                            type="button"
                            class="icon-button danger"
                            onclick="deleteTransaction(${transaction.id})"
                            title="Delete"
                        >
                            ×
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");

    populateTransactionCategoryFilter();
}

async function predictCategory() {
    const description =
        valueOf("transaction-description").trim();

    if (!description) {
        hideAISuggestion();
        return;
    }

    try {
        const result = await apiRequest("/predict-category", {
            method: "POST",
            body: {
                description
            }
        });

        let predictedCategory = result?.predicted_category;
        let confidence = result?.confidence;

        /*
         Defensive handling in case the backend accidentally returns
         an array/tuple-like response.
        */
        if (Array.isArray(predictedCategory)) {
            predictedCategory = predictedCategory[0];
        }

        if (!predictedCategory) {
            hideAISuggestion();
            return;
        }

        showAISuggestion(predictedCategory, confidence);

    } catch (error) {
        console.error("Category prediction:", error);

        /*
         Do not block manual transaction entry if the model
         is unavailable.
        */
        hideAISuggestion();
    }
}

function showAISuggestion(category, confidence) {
    const box = document.getElementById("ai-suggestion");
    const text = document.getElementById("ai-suggestion-text");

    if (!box || !text) return;

    let message = `AI suggests: ${category}`;

    if (
        confidence !== null &&
        confidence !== undefined &&
        Number.isFinite(Number(confidence))
    ) {
        message += ` (${Math.round(Number(confidence) * 100)}% confidence)`;
    }

    text.textContent = message;

    box.classList.remove("hidden");

    box.dataset.category = category;
}

function hideAISuggestion() {
    const box = document.getElementById("ai-suggestion");

    if (box) {
        box.classList.add("hidden");
        box.dataset.category = "";
    }
}

function useAISuggestedCategory() {
    const box = document.getElementById("ai-suggestion");

    if (!box) return;

    const category = box.dataset.category;

    if (category) {
        setValue("custom-category", category);
        showToast(`Category set to ${category}.`, "success");
    }
}

function populateTransactionCategoryFilter() {
    const select = document.getElementById(
        "transaction-category-filter"
    );

    if (!select) return;

    const current = select.value;

    const categories = [
        ...new Set(
            transactions
                .map(t => t.category)
                .filter(Boolean)
        )
    ].sort();

    select.innerHTML = `
        <option value="all">All Categories</option>
        ${categories.map(category => `
            <option value="${escapeAttribute(category)}">
                ${escapeHTML(category)}
            </option>
        `).join("")}
    `;

    if (categories.includes(current)) {
        select.value = current;
    } else {
        select.value = "all";
    }
}


/* ============================================================
   SMART ENTRY
   ============================================================ */

function openSmartEntryModal() {
    const modal = document.getElementById("smart-entry-modal");

    if (!modal) return;

    setValue("smart-entry-text", "");

    const review = document.getElementById("smart-review");

    if (review) {
        review.classList.add("hidden");
    }

    modal.classList.remove("hidden");
}

function closeSmartEntryModal() {
    const modal = document.getElementById("smart-entry-modal");

    if (modal) {
        modal.classList.add("hidden");
    }
}

function analyzeSmartEntry() {
    const input = valueOf("smart-entry-text").trim();

    if (!input) {
        showToast("Describe the transaction first.", "error");
        return;
    }

    const parsed = parseSmartEntry(input);

    setValue("smart-amount", parsed.amount || "");
    setValue("smart-merchant", parsed.merchant || "");
    setValue("smart-type", parsed.type);
    setValue("smart-category", parsed.category);
    setValue("smart-date", parsed.date);

    const review = document.getElementById("smart-review");

    if (review) {
        review.classList.remove("hidden");
    }
}

function parseSmartEntry(text) {
    const lower = text.toLowerCase();

    const amountMatch = lower.match(
        /(?:₹|rs\.?|inr)?\s*(\d+(?:,\d{3})*(?:\.\d+)?)/
    );

    const amount = amountMatch
        ? Number(amountMatch[1].replace(/,/g, ""))
        : "";

    let type = "expense";

    if (
        /\b(received|salary|income|earned|credited|deposit|got paid)\b/i.test(
            text
        )
    ) {
        type = "income";
    }

    let date = getTodayISO();

    if (/\byesterday\b/i.test(text)) {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        date = toISODate(d);
    }

    const category = obviousCategory(text, type);

    let merchant = "";

    const merchantPatterns = [
        /\bfrom\s+([A-Za-z0-9&'. -]{2,40})/i,
        /\bat\s+([A-Za-z0-9&'. -]{2,40})/i,
        /\bon\s+([A-Za-z0-9&'. -]{2,40})/i
    ];

    for (const pattern of merchantPatterns) {
        const match = text.match(pattern);

        if (match) {
            merchant = cleanMerchant(match[1]);
            break;
        }
    }

    return {
        amount,
        merchant,
        type,
        category,
        date
    };
}

function cleanMerchant(value) {
    return value
        .replace(
            /\b(for|on|today|yesterday|using|with|at)\b.*$/i,
            ""
        )
        .replace(/[.,!?]+$/, "")
        .trim();
}

function obviousCategory(text, transactionType = "expense") {
    if (transactionType === "income") {
        return "Other";
    }

    const lower = text.toLowerCase();

    /*
     Education first because words such as "course", "college",
     and "exam" should not accidentally become shopping/other.
    */
    if (
        /\b(college|university|school|course|exam|books?|tuition|fees?|udemy|coursera|education)\b/i.test(lower)
    ) {
        return "Education";
    }

    if (
        /\b(swiggy|zomato|restaurant|food|lunch|dinner|breakfast|cafe|coffee|grocery|groceries|blinkit|zepto|instamart)\b/i.test(lower)
    ) {
        return "Food";
    }

    if (
        /\b(uber|ola|rapido|bus|train|metro|fuel|petrol|diesel|transport|travel|auto|cab)\b/i.test(lower)
    ) {
        return "Transport";
    }

    if (
        /\b(amazon|flipkart|myntra|shopping|clothes|shirt|shoe|shoes|dress|mall)\b/i.test(lower)
    ) {
        return "Shopping";
    }

    if (
        /\b(netflix|prime|spotify|movie|cinema|game|gaming|subscription|entertainment)\b/i.test(lower)
    ) {
        return "Entertainment";
    }

    if (
        /\b(hospital|doctor|medicine|pharmacy|medical|health|clinic|apollo)\b/i.test(lower)
    ) {
        return "Health";
    }

    if (
        /\b(rent|electricity|electric|water bill|internet|wifi|phone bill|insurance|fee|utility)\b/i.test(lower)
    ) {
        return "Bills";
    }

    return "Other";
}

function saveSmartEntry() {
    const amount = Number(valueOf("smart-amount"));
    const merchant = valueOf("smart-merchant").trim();
    const type = valueOf("smart-type") || "expense";
    const category = valueOf("smart-category") || "Other";
    const date = valueOf("smart-date") || getTodayISO();

    if (!Number.isFinite(amount) || amount <= 0) {
        showToast("Please enter a valid amount.", "error");
        return;
    }

    closeSmartEntryModal();

    openTransactionModal();

    setValue("transaction-description", valueOf("smart-entry-text"));
    setValue("transaction-merchant", merchant);
    setValue("transaction-amount", amount);
    setValue("transaction-date", date);
    setValue("transaction-type", type);
    setValue("custom-category", category);

    showAISuggestion(category, null);
}


/* ============================================================
   BUDGETS
   ============================================================ */

function openBudgetModal(budgetId = null) {
    currentBudgetId = budgetId;

    const modal = document.getElementById("budget-modal");
    const form = document.getElementById("budget-form");

    if (!modal || !form) return;

    form.reset();

    const budget = budgets.find(
        b => Number(b.id) === Number(budgetId)
    );

    if (budget) {
        setValue("budget-category", budget.category);
        setValue("budget-amount", budget.amount);
        setValue("budget-month", budget.month);
    } else {
        setValue("budget-month", getCurrentMonth());
    }

    updateBudgetModalTitle();

    modal.classList.remove("hidden");
}

function closeBudgetModal() {
    const modal = document.getElementById("budget-modal");

    if (modal) modal.classList.add("hidden");

    currentBudgetId = null;
}

function updateBudgetModalTitle() {
    const title =
        document.querySelector("#budget-modal .modal-title") ||
        document.querySelector("#budget-modal h2") ||
        document.querySelector("#budget-modal h3");

    if (title) {
        title.textContent = currentBudgetId
            ? "Edit Budget"
            : "Add Budget";
    }
}

async function saveBudget(event) {
    event.preventDefault();

    const category = valueOf("budget-category");
    const amount = Number(valueOf("budget-amount"));
    const month = valueOf("budget-month") || getCurrentMonth();

    if (!category) {
        showToast("Please select a category.", "error");
        return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
        showToast("Enter a valid budget amount.", "error");
        return;
    }

    const payload = {
        category,
        amount,
        month
    };

    try {
        if (currentBudgetId) {
            await apiRequest(`/budgets/${currentBudgetId}`, {
                method: "PUT",
                body: payload
            });

            showToast("Budget updated.", "success");
        } else {
            await apiRequest("/budgets", {
                method: "POST",
                body: payload
            });

            showToast("Budget added.", "success");
        }

        closeBudgetModal();
        await refreshFinancialData();

    } catch (error) {
        console.error(error);
        showToast(
            error.message || "Unable to save budget.",
            "error"
        );
    }
}

async function deleteBudget(id) {
    if (!window.confirm("Delete this budget?")) return;

    try {
        await apiRequest(`/budgets/${id}`, {
            method: "DELETE"
        });

        showToast("Budget deleted.", "success");
        await refreshFinancialData();

    } catch (error) {
        console.error(error);
        showToast(
            error.message || "Unable to delete budget.",
            "error"
        );
    }
}

function renderBudgets() {
    const month = getCurrentMonth();

    const monthBudgets = budgets.filter(
        b => normalizeMonth(b.month) === month
    );

    const expenses = getTransactionsForMonth(month)
        .filter(t => !isIncome(t));

    const totalBudget = sum(
        monthBudgets.map(b => Number(b.amount || 0))
    );

    const totalSpent = sum(expenses.map(t => Number(t.amount || 0)));

    const remaining = totalBudget - totalSpent;

    setText("budgets-total", formatCurrency(totalBudget));
    setText("budgets-spent", formatCurrency(totalSpent));
    setText("budgets-remaining", formatCurrency(remaining));

    const utilization =
        totalBudget > 0
            ? (totalSpent / totalBudget) * 100
            : 0;

    setText(
        "budgets-health",
        totalBudget
            ? `${formatNumber(utilization)}% used`
            : "No budgets"
    );

    setText(
        "budgets-detail",
        totalBudget
            ? remaining >= 0
                ? `${formatCurrency(remaining)} remaining this month`
                : `${formatCurrency(Math.abs(remaining))} over budget`
            : "Create a budget to start tracking spending."
    );

    const grid = document.getElementById("budgets-grid");
    const empty = document.getElementById("budgets-empty");

    if (!grid) return;

    if (!monthBudgets.length) {
        grid.innerHTML = "";

        if (empty) empty.classList.remove("hidden");

        return;
    }

    if (empty) empty.classList.add("hidden");

    grid.innerHTML = monthBudgets.map(budget => {
        const spent = sum(
            expenses
                .filter(t => t.category === budget.category)
                .map(t => Number(t.amount || 0))
        );

        const amount = Number(budget.amount || 0);

        const percentage =
            amount > 0
                ? Math.min((spent / amount) * 100, 100)
                : 0;

        const remainingAmount = amount - spent;

        return `
            <div class="budget-card">
                <div class="card-header-row">
                    <div>
                        <span class="eyebrow">Monthly budget</span>
                        <h3>${escapeHTML(budget.category)}</h3>
                    </div>

                    <div class="card-actions">
                        <button
                            type="button"
                            onclick="openBudgetModal(${budget.id})"
                            class="icon-button"
                        >✎</button>

                        <button
                            type="button"
                            onclick="deleteBudget(${budget.id})"
                            class="icon-button danger"
                        >×</button>
                    </div>
                </div>

                <div class="budget-amount-row">
                    <strong>${formatCurrency(spent)}</strong>
                    <span>of ${formatCurrency(amount)}</span>
                </div>

                <div class="progress-track">
                    <div
                        class="progress-fill ${percentage >= 100 ? "danger-fill" : ""}"
                        style="width:${percentage}%"
                    ></div>
                </div>

                <div class="budget-footer">
                    <span>${formatNumber(percentage)}% used</span>
                    <strong class="${remainingAmount < 0 ? "expense-text" : ""}">
                        ${remainingAmount >= 0
                            ? formatCurrency(remainingAmount) + " left"
                            : formatCurrency(Math.abs(remainingAmount)) + " over"}
                    </strong>
                </div>
            </div>
        `;
    }).join("");
}


/* ============================================================
   SAVINGS GOALS
   ============================================================ */

function openSavingsGoalModal(goalId = null) {
    currentSavingsGoalId = goalId;

    const modal = document.getElementById("savings-modal");
    const form = document.getElementById("savings-form");

    if (!modal || !form) return;

    form.reset();

    const goal = savingsGoals.find(
        g => Number(g.id) === Number(goalId)
    );

    if (goal) {
        setValue("savings-target", goal.target_amount);
        setValue("savings-month", goal.month);
    } else {
        setValue("savings-month", getCurrentMonth());
    }

    modal.classList.remove("hidden");
}

function closeSavingsGoalModal() {
    const modal = document.getElementById("savings-modal");

    if (modal) modal.classList.add("hidden");

    currentSavingsGoalId = null;
}

async function saveSavingsGoal(event) {
    event.preventDefault();

    const targetAmount = Number(
        valueOf("savings-target")
    );

    const month =
        valueOf("savings-month") || getCurrentMonth();

    if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
        showToast("Enter a valid savings target.", "error");
        return;
    }

    const payload = {
        target_amount: targetAmount,
        month
    };

    try {
        if (currentSavingsGoalId) {
            await apiRequest(
                `/savings-goals/${currentSavingsGoalId}`,
                {
                    method: "PUT",
                    body: payload
                }
            );

            showToast("Savings goal updated.", "success");
        } else {
            await apiRequest("/savings-goals", {
                method: "POST",
                body: payload
            });

            showToast("Savings goal created.", "success");
        }

        closeSavingsGoalModal();
        await refreshFinancialData();

    } catch (error) {
        console.error(error);
        showToast(
            error.message || "Unable to save savings goal.",
            "error"
        );
    }
}

async function deleteSavingsGoal(id) {
    if (!window.confirm("Delete this savings goal?")) return;

    try {
        await apiRequest(`/savings-goals/${id}`, {
            method: "DELETE"
        });

        showToast("Savings goal deleted.", "success");
        await refreshFinancialData();

    } catch (error) {
        console.error(error);
        showToast(
            error.message || "Unable to delete savings goal.",
            "error"
        );
    }
}

function renderSavings() {
    const month = getCurrentMonth();

    const goal = getSavingsGoalForMonth(month);

    const saved = sumActualSavingsForMonth(month);

    const transactionsThisMonth =
        getTransactionsForMonth(month);

    const income = sumTransactions(
        transactionsThisMonth.filter(t => isIncome(t))
    );

    const expenses = sumTransactions(
        transactionsThisMonth.filter(t => !isIncome(t))
    );

    const calculatedSavings = income - expenses;

    const target = goal
        ? Number(goal.target_amount || 0)
        : 0;

    const remaining = Math.max(target - saved, 0);

    const progress =
        target > 0
            ? Math.min((saved / target) * 100, 100)
            : 0;

    setText("savings-page-target", formatCurrency(target));
    setText("savings-page-actual", formatCurrency(saved));
    setText("savings-page-remaining", formatCurrency(remaining));
    setText(
        "savings-page-progress",
        `${formatNumber(progress)}%`
    );

    const grid = document.getElementById("savings-grid");
    const empty = document.getElementById("savings-empty");

    if (grid) {
        if (!savingsGoals.length) {
            grid.innerHTML = "";

            if (empty) empty.classList.remove("hidden");
        } else {
            if (empty) empty.classList.add("hidden");

            grid.innerHTML = [...savingsGoals]
                .sort(
                    (a, b) =>
                        normalizeMonth(b.month).localeCompare(
                            normalizeMonth(a.month)
                        )
                )
                .map(goalItem => {
                    const goalMonth =
                        normalizeMonth(goalItem.month);

                    const goalSaved =
                        sumActualSavingsForMonth(goalMonth);

                    const goalTarget =
                        Number(goalItem.target_amount || 0);

                    const goalProgress =
                        goalTarget > 0
                            ? Math.min(
                                (goalSaved / goalTarget) * 100,
                                100
                            )
                            : 0;

                    return `
                        <div class="savings-goal-card">
                            <div class="card-header-row">
                                <div>
                                    <span class="eyebrow">
                                        Savings goal
                                    </span>
                                    <h3>${escapeHTML(goalMonth)}</h3>
                                </div>

                                <div class="card-actions">
                                    <button
                                        type="button"
                                        class="icon-button"
                                        onclick="openSavingsGoalModal(${goalItem.id})"
                                    >✎</button>

                                    <button
                                        type="button"
                                        class="icon-button danger"
                                        onclick="deleteSavingsGoal(${goalItem.id})"
                                    >×</button>
                                </div>
                            </div>

                            <div class="savings-goal-number">
                                ${formatCurrency(goalSaved)}
                                <span>
                                    / ${formatCurrency(goalTarget)}
                                </span>
                            </div>

                            <div class="progress-track">
                                <div
                                    class="progress-fill"
                                    style="width:${goalProgress}%"
                                ></div>
                            </div>

                            <div class="budget-footer">
                                <span>${formatNumber(goalProgress)}% achieved</span>
                                <strong>
                                    ${formatCurrency(
                                        Math.max(goalTarget - goalSaved, 0)
                                    )}
                                    remaining
                                </strong>
                            </div>
                        </div>
                    `;
                })
                .join("");
        }
    }

    renderActualSavingsHistory();
}

function openActualSavingsModal() {
    const modal =
        document.getElementById("actual-savings-modal");

    const form =
        document.getElementById("actual-savings-form");

    if (!modal || !form) return;

    form.reset();

    setValue("actual-savings-date", getTodayISO());
    setValue("actual-savings-month", getCurrentMonth());

    modal.classList.remove("hidden");
}

function closeActualSavingsModal() {
    const modal =
        document.getElementById("actual-savings-modal");

    if (modal) modal.classList.add("hidden");
}

async function saveActualSavings(event) {
    event.preventDefault();

    const amount = Number(
        valueOf("actual-savings-amount")
    );

    const date =
        valueOf("actual-savings-date") ||
        getTodayISO();

    const month =
        valueOf("actual-savings-month") ||
        normalizeMonth(date);

    const note =
        valueOf("actual-savings-note").trim();

    if (!Number.isFinite(amount) || amount <= 0) {
        showToast("Enter a valid savings amount.", "error");
        return;
    }

    const payload = {
        amount,
        date,
        month,
        note: note || null
    };

    try {
        await apiRequest("/actual-savings", {
            method: "POST",
            body: payload
        });

        showToast("Actual savings recorded.", "success");

        closeActualSavingsModal();

        await refreshFinancialData();

    } catch (error) {
        console.error(error);
        showToast(
            error.message || "Unable to record savings.",
            "error"
        );
    }
}

async function deleteActualSavings(id) {
    if (!window.confirm("Delete this savings record?")) {
        return;
    }

    try {
        await apiRequest(`/actual-savings/${id}`, {
            method: "DELETE"
        });

        showToast("Savings record deleted.", "success");
        await refreshFinancialData();

    } catch (error) {
        console.error(error);
        showToast(
            error.message || "Unable to delete savings record.",
            "error"
        );
    }
}

function renderActualSavingsHistory() {
    const container =
        document.getElementById("actual-savings-list");

    const empty =
        document.getElementById("actual-savings-empty");

    if (!container) return;

    const sorted = [...actualSavings].sort(
        (a, b) =>
            dateValue(b.date) - dateValue(a.date)
    );

    if (!sorted.length) {
        container.innerHTML = "";

        if (empty) empty.classList.remove("hidden");

        return;
    }

    if (empty) empty.classList.add("hidden");

    container.innerHTML = sorted.map(item => `
        <div class="saving-history-item">
            <div>
                <strong>
                    ${formatCurrency(item.amount)}
                </strong>

                <span>
                    ${formatDate(item.date)}
                    ${
                        item.note
                            ? ` · ${escapeHTML(item.note)}`
                            : ""
                    }
                </span>
            </div>

            <button
                type="button"
                class="icon-button danger"
                onclick="deleteActualSavings(${item.id})"
            >
                ×
            </button>
        </div>
    `).join("");
}


/* ============================================================
   SAVINGS COACH
   ============================================================ */

function renderSavingsCoach() {
    const month = getCurrentMonth();

    const monthTransactions =
        getTransactionsForMonth(month);

    const income = sumTransactions(
        monthTransactions.filter(t => isIncome(t))
    );

    const expenses = sumTransactions(
        monthTransactions.filter(t => !isIncome(t))
    );

    const calculatedSavings = income - expenses;

    const saved = sumActualSavingsForMonth(month);

    const goal = getSavingsGoalForMonth(month);

    const target =
        goal ? Number(goal.target_amount || 0) : 0;

    const remaining =
        Math.max(target - saved, 0);

    const progress =
        target > 0
            ? Math.min((saved / target) * 100, 100)
            : 0;

    setText(
        "coach-target",
        formatCurrency(target)
    );

    setText(
        "coach-saved",
        formatCurrency(saved)
    );

    setText(
        "coach-remaining",
        formatCurrency(remaining)
    );

    setText(
        "coach-progress-label",
        `${formatNumber(progress)}%`
    );

    setText(
        "coach-progress-amount",
        formatCurrency(saved)
    );

    const progressBar =
        document.getElementById("coach-progress-bar");

    if (progressBar) {
        progressBar.style.width = `${progress}%`;
    }

    const spendingSignal =
        document.getElementById("coach-spending-signal");

    const tip =
        document.getElementById("coach-tip");

    const headline =
        document.getElementById("coach-headline");

    const description =
        document.getElementById("coach-description");

    if (target <= 0) {
        setText(
            "coach-headline",
            "Set a savings goal"
        );

        setText(
            "coach-description",
            "Create a monthly goal so the coach can track your progress."
        );
    } else if (saved >= target) {
        setText(
            "coach-headline",
            "Goal achieved 🎉"
        );

        setText(
            "coach-description",
            "You have reached your recorded savings target for this month."
        );
    } else if (calculatedSavings <= 0) {
        setText(
            "coach-headline",
            "Focus on your cash flow"
        );

        setText(
            "coach-description",
            "Your recorded expenses currently match or exceed your income."
        );
    } else if (saved < calculatedSavings) {
        setText(
            "coach-headline",
            "You can save more"
        );

        setText(
            "coach-description",
            "Your calculated monthly savings are higher than your recorded actual savings."
        );
    } else {
        setText(
            "coach-headline",
            "Good progress"
        );

        setText(
            "coach-description",
            "Your actual savings are moving toward the monthly target."
        );
    }

    if (spendingSignal) {
        const spendingRatio =
            income > 0
                ? (expenses / income) * 100
                : 0;

        spendingSignal.textContent =
            income <= 0
                ? "Add income data to evaluate your spending ratio."
                : `You have spent ${formatNumber(spendingRatio)}% of recorded income this month.`;
    }

    if (tip) {
        const suggestions = [];

        if (income > 0 && expenses / income > 0.7) {
            suggestions.push(
                "Your expenses are above 70% of income. Review your largest spending category."
            );
        }

        if (plannedExpensesForMonth(month).length) {
            suggestions.push(
                "Compare planned expenses with actual spending before adding new commitments."
            );
        }

        if (target > 0 && remaining > 0) {
            suggestions.push(
                `You need ${formatCurrency(remaining)} more in recorded savings to reach your goal.`
            );
        }

        if (!suggestions.length) {
            suggestions.push(
                "Keep recording transactions and actual savings consistently so your trends stay accurate."
            );
        }

        tip.textContent = suggestions[0];
    }

    renderCoachInsights(
        month,
        income,
        expenses,
        calculatedSavings,
        saved,
        target
    );
}

function renderCoachInsights(
    month,
    income,
    expenses,
    calculatedSavings,
    saved,
    target
) {
    const container =
        document.getElementById("coach-insights");

    if (!container) return;

    const insights = [];

    if (income > 0) {
        const rate =
            (calculatedSavings / income) * 100;

        insights.push(
            `Calculated savings rate: ${formatNumber(rate)}%.`
        );
    }

    if (saved > 0) {
        insights.push(
            `Recorded actual savings this month: ${formatCurrency(saved)}.`
        );
    }

    if (target > 0) {
        const remaining =
            Math.max(target - saved, 0);

        insights.push(
            remaining > 0
                ? `${formatCurrency(remaining)} remains to reach your target.`
                : "Your recorded savings have reached the target."
        );
    }

    const categoryTotals =
        getCategoryTotals(
            getTransactionsForMonth(month)
                .filter(t => !isIncome(t))
        );

    const top = getTopCategory(categoryTotals);

    if (top) {
        insights.push(
            `${top.category} is your highest expense category at ${formatCurrency(top.amount)}.`
        );
    }

    container.innerHTML = insights.length
        ? insights.map(text => `
            <div class="insight-item">
                <span class="insight-dot"></span>
                <span>${escapeHTML(text)}</span>
            </div>
        `).join("")
        : `
            <div class="empty-state-inline">
                Start recording financial activity to receive insights.
            </div>
        `;
}


/* ============================================================
   PLANNED EXPENSES
   ============================================================ */

function openPlannedExpenseModal(id = null) {
    currentPlannedExpenseId = id;

    const modal =
        document.getElementById("planned-modal");

    const form =
        document.getElementById("planned-form");

    if (!modal || !form) return;

    form.reset();

    const item = plannedExpenses.find(
        p => Number(p.id) === Number(id)
    );

    if (item) {
        setValue("planned-description", item.description || "");
        setValue("planned-category", item.category || "Other");
        setValue("planned-amount", item.planned_amount);
        setValue("planned-month", item.month);
    } else {
        setValue("planned-month", getCurrentMonth());
        setValue("planned-category", "Other");
    }

    updatePlannedModalTitle();

    modal.classList.remove("hidden");
}

function closePlannedExpenseModal() {
    const modal =
        document.getElementById("planned-modal");

    if (modal) modal.classList.add("hidden");

    currentPlannedExpenseId = null;
}

function updatePlannedModalTitle() {
    const title =
        document.querySelector("#planned-modal .modal-title") ||
        document.querySelector("#planned-modal h2") ||
        document.querySelector("#planned-modal h3");

    if (title) {
        title.textContent =
            currentPlannedExpenseId
                ? "Edit Planned Expense"
                : "Add Planned Expense";
    }
}

async function savePlannedExpense(event) {
    event.preventDefault();

    const description =
        valueOf("planned-description").trim();

    const category =
        valueOf("planned-category") || "Other";

    const plannedAmount =
        Number(valueOf("planned-amount"));

    const month =
        valueOf("planned-month") || getCurrentMonth();

    if (!description) {
        showToast(
            "Please enter a description.",
            "error"
        );
        return;
    }

    if (
        !Number.isFinite(plannedAmount) ||
        plannedAmount <= 0
    ) {
        showToast(
            "Enter a valid planned amount.",
            "error"
        );
        return;
    }

    const payload = {
        description,
        category,
        planned_amount: plannedAmount,
        month
    };

    try {
        if (currentPlannedExpenseId) {
            await apiRequest(
                `/planned-expenses/${currentPlannedExpenseId}`,
                {
                    method: "PUT",
                    body: payload
                }
            );

            showToast(
                "Planned expense updated.",
                "success"
            );
        } else {
            await apiRequest(
                "/planned-expenses",
                {
                    method: "POST",
                    body: payload
                }
            );

            showToast(
                "Planned expense added.",
                "success"
            );
        }

        closePlannedExpenseModal();

        await refreshFinancialData();

    } catch (error) {
        console.error(error);
        showToast(
            error.message ||
            "Unable to save planned expense.",
            "error"
        );
    }
}

async function deletePlannedExpense(id) {
    if (!window.confirm("Delete this planned expense?")) {
        return;
    }

    try {
        await apiRequest(`/planned-expenses/${id}`, {
            method: "DELETE"
        });

        showToast(
            "Planned expense deleted.",
            "success"
        );

        await refreshFinancialData();

    } catch (error) {
        console.error(error);
        showToast(
            error.message ||
            "Unable to delete planned expense.",
            "error"
        );
    }
}

function renderPlanning() {
    const month = state.planningMonth;

    const planned = plannedExpensesForMonth(month);

    const actualExpenses =
        getTransactionsForMonth(month)
            .filter(t => !isIncome(t));

    const plannedTotal = sum(
        planned.map(
            p => Number(p.planned_amount || 0)
        )
    );

    const actualTotal = sum(
        actualExpenses.map(
            t => Number(t.amount || 0)
        )
    );

    const difference =
        plannedTotal - actualTotal;

    setText(
        "planned-page-total",
        formatCurrency(plannedTotal)
    );

    setText(
        "planned-page-actual",
        formatCurrency(actualTotal)
    );

    setText(
        "planned-page-difference",
        formatCurrency(Math.abs(difference))
    );

    setText(
        "planned-page-status",
        difference >= 0
            ? "Within plan"
            : "Over plan"
    );

    setText(
        "planned-page-status-detail",
        difference >= 0
            ? `${formatCurrency(difference)} below planned spending`
            : `${formatCurrency(Math.abs(difference))} above planned spending`
    );

    const tbody =
        document.getElementById("planned-table-body");

    const empty =
        document.getElementById("planned-empty");

    if (!tbody) return;

    if (!planned.length) {
        tbody.innerHTML = "";

        if (empty) empty.classList.remove("hidden");

        renderPlanningSuggestions(month);

        return;
    }

    if (empty) empty.classList.add("hidden");

    tbody.innerHTML = planned.map(item => {
        const actual = sum(
            actualExpenses
                .filter(
                    t =>
                        t.category === item.category
                )
                .map(
                    t => Number(t.amount || 0)
                )
        );

        const itemDifference =
            Number(item.planned_amount || 0) - actual;

        return `
            <tr>
                <td>
                    <strong>
                        ${escapeHTML(item.description || "—")}
                    </strong>
                </td>

                <td>
                    ${escapeHTML(item.category || "Other")}
                </td>

                <td>
                    ${formatCurrency(item.planned_amount)}
                </td>

                <td>
                    ${formatCurrency(actual)}
                </td>

                <td class="${itemDifference < 0 ? "expense-text" : "income-text"}">
                    ${itemDifference < 0 ? "-" : ""}
                    ${formatCurrency(Math.abs(itemDifference))}
                </td>

                <td>
                    <div class="table-actions">
                        <button
                            type="button"
                            class="icon-button"
                            onclick="openPlannedExpenseModal(${item.id})"
                        >✎</button>

                        <button
                            type="button"
                            class="icon-button danger"
                            onclick="deletePlannedExpense(${item.id})"
                        >×</button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");

    renderPlanningSuggestions(month);
}

function renderPlanningSuggestions(month) {
    const container =
        document.getElementById("planned-suggestions");

    if (!container) return;

    const previousMonth = shiftMonth(month, -1);

    const previousExpenses =
        getTransactionsForMonth(previousMonth)
            .filter(t => !isIncome(t));

    const totals =
        getCategoryTotals(previousExpenses);

    const topCategories =
        Object.entries(totals)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4);

    if (!topCategories.length) {
        container.innerHTML = `
            <div class="empty-state-inline">
                Add transaction history to receive planning suggestions.
            </div>
        `;
        return;
    }

    container.innerHTML = topCategories.map(
        ([category, amount]) => `
            <div class="suggestion-item">
                <div>
                    <strong>${escapeHTML(category)}</strong>
                    <span>
                        Previous month: ${formatCurrency(amount)}
                    </span>
                </div>

                <button
                    type="button"
                    class="secondary-button"
                    onclick="openSuggestedPlannedExpense('${escapeAttribute(category)}', ${amount}, '${escapeAttribute(month)}')"
                >
                    Use
                </button>
            </div>
        `
    ).join("");
}

function openSuggestedPlannedExpense(
    category,
    amount,
    month
) {
    openPlannedExpenseModal();

    setValue("planned-category", category);
    setValue("planned-description", `${category} planned spending`);
    setValue("planned-amount", Math.round(amount));
    setValue("planned-month", month);
}


/* ============================================================
   MONTHLY SUMMARY
   ============================================================ */

function renderSummary() {
    const month = state.summaryMonth;

    const monthTransactions =
        getTransactionsForMonth(month);

    const income = sumTransactions(
        monthTransactions.filter(t => isIncome(t))
    );

    const expenses = sumTransactions(
        monthTransactions.filter(t => !isIncome(t))
    );

    const savings = income - expenses;

    const rate =
        income > 0
            ? (savings / income) * 100
            : 0;

    const actualSaved =
        sumActualSavingsForMonth(month);

    const planned =
        sumPlannedExpensesForMonth(month);

    const difference =
        planned - expenses;

    const categoryTotals =
        getCategoryTotals(
            monthTransactions.filter(
                t => !isIncome(t)
            )
        );

    const top =
        getTopCategory(categoryTotals);

    setText("summary-income", formatCurrency(income));
    setText("summary-expenses", formatCurrency(expenses));
    setText("summary-savings", formatCurrency(savings));
    setText("summary-rate", `${formatNumber(rate)}%`);

    setText(
        "summary-actual-saved",
        formatCurrency(actualSaved)
    );

    setText(
        "summary-planned",
        formatCurrency(planned)
    );

    setText(
        "summary-planned-difference",
        formatCurrency(Math.abs(difference))
    );

    setText(
        "summary-top-category",
        top ? top.category : "—"
    );

    setText(
        "summary-top-category-amount",
        top ? formatCurrency(top.amount) : "—"
    );

    renderSummaryChart(month);
    renderSummaryInsights(
        month,
        income,
        expenses,
        savings,
        actualSaved,
        planned,
        top
    );

    renderMonthlyBreakdown();
}

function renderSummaryChart(month) {
    const canvas =
        document.getElementById("summary-chart");

    const empty =
        document.getElementById("summary-chart-empty");

    if (!canvas || typeof Chart === "undefined") {
        return;
    }

    const transactionsThisMonth =
        getTransactionsForMonth(month)
            .filter(t => !isIncome(t));

    const totals =
        getCategoryTotals(transactionsThisMonth);

    const labels = Object.keys(totals);
    const values = Object.values(totals);

    if (summaryChart) {
        summaryChart.destroy();
    }

    if (!labels.length) {
        if (empty) empty.classList.remove("hidden");
        return;
    }

    if (empty) empty.classList.add("hidden");

    summaryChart = new Chart(canvas, {
        type: "bar",
        data: {
            labels,
            datasets: [{
                label: "Expenses",
                data: values
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function renderSummaryInsights(
    month,
    income,
    expenses,
    savings,
    actualSaved,
    planned,
    top
) {
    const container =
        document.getElementById("summary-insights");

    if (!container) return;

    const insights = [];

    if (income > 0) {
        const rate =
            (savings / income) * 100;

        insights.push(
            `Your calculated savings rate is ${formatNumber(rate)}%.`
        );
    } else {
        insights.push(
            "No income has been recorded for this month."
        );
    }

    if (top) {
        insights.push(
            `${top.category} is your largest expense category at ${formatCurrency(top.amount)}.`
        );
    }

    if (planned > 0) {
        const difference = planned - expenses;

        insights.push(
            difference >= 0
                ? `Actual expenses are ${formatCurrency(difference)} below planned expenditure.`
                : `Actual expenses are ${formatCurrency(Math.abs(difference))} above planned expenditure.`
        );
    }

    if (actualSaved > 0) {
        insights.push(
            `You recorded ${formatCurrency(actualSaved)} as actual savings.`
        );
    }

    container.innerHTML = insights.map(
        insight => `
            <div class="insight-item">
                <span class="insight-dot"></span>
                <span>${escapeHTML(insight)}</span>
            </div>
        `
    ).join("");
}

function renderMonthlyBreakdown() {
    const container =
        document.getElementById("monthly-breakdown");

    if (!container) return;

    const months = getLastMonths(6);

    container.innerHTML = months.map(month => {
        const monthTransactions =
            getTransactionsForMonth(month);

        const income = sumTransactions(
            monthTransactions.filter(t => isIncome(t))
        );

        const expenses = sumTransactions(
            monthTransactions.filter(t => !isIncome(t))
        );

        const savings = income - expenses;

        return `
            <div class="monthly-breakdown-row">
                <strong>${month}</strong>

                <span class="income-text">
                    ${formatCurrency(income)}
                </span>

                <span class="expense-text">
                    ${formatCurrency(expenses)}
                </span>

                <strong>
                    ${formatCurrency(savings)}
                </strong>
            </div>
        `;
    }).join("");
}


/* ============================================================
   PROFILE & FINANCIAL PREFERENCES
   ============================================================ */

/* =========================================================
   PROFILE SUMMARY RENDER
========================================================= */

async function renderProfile() {

    try {

        /*
         * Always read the latest saved data directly
         * from FastAPI instead of relying on possibly
         * stale/undefined frontend variables.
         */

        const profileResponse =
            await apiRequest("/profile");

        const preferencesResponse =
            await apiRequest(
                "/financial-preferences"
            );


        const profile =
            profileResponse?.profile || {};

        const preferences =
            preferencesResponse?.financial_preferences || {};


        /*
         * USER
         */

        const user =
            currentUser || {};


        /*
         * PERSONAL PROFILE
         */

        const name =
            user.name ||
            "Not provided";

        const age =
            profile.age !== null &&
            profile.age !== undefined &&
            profile.age !== ""
                ? profile.age
                : "Not provided";

        const gender =
            profile.gender ||
            "Prefer not to say";

        const profession =
            profile.profession ||
            "Not provided";

        const maritalStatus =
            profile.marital_status ||
            "Prefer not to say";


        /*
         * FINANCIAL PREFERENCES
         */

        const incomeRange =
            preferences.monthly_income_range ||
            "Not provided";

        const incomeSource =
            preferences.income_source ||
            "Not provided";

        const currency =
            preferences.currency ||
            "INR";

        const financialGoal =
            preferences.financial_goal ||
            "Not provided";

        const savingsTarget =
            preferences.savings_target !== null &&
            preferences.savings_target !== undefined &&
            preferences.savings_target !== ""
                ? money(
                    preferences.savings_target
                )
                : "Not provided";

        const reminders =
            preferences.reminders_enabled === false
                ? "Disabled"
                : "Enabled";


        /*
         * WRITE SAVED VALUES INTO SUMMARY VIEW
         */

        setText(
            "summary-profile-name",
            name
        );

        setText(
            "summary-profile-age",
            age
        );

        setText(
            "summary-profile-gender",
            gender
        );

        setText(
            "summary-profile-profession",
            profession
        );

        setText(
            "summary-profile-marital-status",
            maritalStatus
        );


        setText(
            "summary-income-range",
            incomeRange
        );

        setText(
            "summary-income-source",
            incomeSource
        );

        setText(
            "summary-currency",
            currency
        );

        setText(
            "summary-financial-goal",
            financialGoal
        );

        setText(
            "summary-savings-target",
            savingsTarget
        );

        setText(
            "summary-reminders",
            reminders
        );


        /*
         * PROFILE HEADER
         */

        setText(
            "profile-display-name",
            name
        );

        setText(
            "profile-display-email",
            user.email ||
            "—"
        );


        /*
         * AVATAR
         */

        const avatar =
            document.getElementById(
                "profile-avatar"
            );

        if (avatar) {

            avatar.textContent =
                name
                    .trim()
                    .charAt(0)
                    .toUpperCase() ||
                "U";
        }


        /*
         * CURRENCY IN PROFILE HEADER
         */

        setText(
            "profile-current-currency",
            currency === "INR"
                ? "INR (₹)"
                : currency
        );


        /*
         * KEEP FRONTEND STATE IN SYNC
         */

        window.profile =
            profile;

        window.financialPreferences =
            preferences;


    } catch (error) {

        console.error(
            "Profile summary loading failed:",
            error
        );

        showToast(
            "Unable to load saved profile details.",
            "error"
        );
    }
}


function showProfileEditor() {

    const summary = document.getElementById("profile-summary-view");
    const edit = document.getElementById("profile-edit-view");
    const editButton = document.getElementById("edit-profile-button");

    if (summary) {
        summary.hidden = true;
    }

    if (edit) {
        edit.hidden = false;
    }

    if (editButton) {
        editButton.hidden = true;
    }

    renderProfile();
}

async function saveProfile() {
    try {
        const payload = {
            name:
                valueOrNull("profile-name") ||
                currentUser?.name ||
                "",

            age:
                numberOrNull("profile-age"),

            gender:
                valueOrNull("profile-gender"),

            profession:
                valueOrNull("profile-profession"),

            marital_status:
                valueOrNull("profile-marital-status")
        };

        const result = await apiRequest(
            "/profile",
            {
                method: "PUT",
                body: payload
            }
        );

        // FastAPI returns:
        // { message: "...", profile: {...} }
        profile =
            result?.profile ||
            result ||
            payload;

        // Keep the logged-in user's name synchronized.
        if (currentUser) {
            currentUser.name =
                profile.name ||
                payload.name ||
                currentUser.name;
        }

        updateUserUI();

        // Save financial preferences too.
        await saveFinancialPreferences();

        // IMPORTANT:
        // Re-render the profile using the freshly saved data.
        renderProfile();

        // Explicitly show the saved summary.
        renderProfile();

        showToast(
            "Profile and preferences saved.",
            "success"
        );

    } catch (error) {
        console.error(
            "Profile save failed:",
            error
        );

        showToast(
            error.message ||
            "Unable to save profile.",
            "error"
        );
    }
}

async function saveFinancialPreferences() {
    const remindersElement =
        document.getElementById("profile-reminders");

    let remindersEnabled = true;

    if (remindersElement) {
        if (remindersElement.type === "checkbox") {
            remindersEnabled = remindersElement.checked;
        } else {
            remindersEnabled =
                remindersElement.value !== "false";
        }
    }

    const payload = {
        monthly_income_range:
            valueOrNull("profile-income-range"),

        income_source:
            valueOrNull("profile-income-source"),

        currency:
            valueOf("profile-currency") || "INR",

        financial_goal:
            valueOrNull("profile-financial-goal"),

        savings_target:
            numberOrNull(
                valueOf("profile-savings-target")
            ),

        reminders_enabled:
            remindersEnabled
    };

    const result =
        await apiRequest(
            "/financial-preferences",
            {
                method: "PUT",
                body: payload
            }
        );

financialPreferences =
    result?.financial_preferences || result || payload;
}


/* ============================================================
   REFRESH
   ============================================================ */

async function refreshFinancialData() {
    const results = await Promise.allSettled([
        loadTransactions(),
        loadBudgets(),
        loadSavingsGoals(),
        loadActualSavings(),
        loadPlannedExpenses()
    ]);

    results.forEach((result, index) => {
        if (result.status === "rejected") {
            console.error(`Financial data loader ${index + 1} failed:`, result.reason);
        }
    });

    renderEverything();
    renderCurrentPage();
}


/* ============================================================
   GLOBAL EVENTS
   ============================================================ */

function bindGlobalEvents() {
    const loginForm =
        document.getElementById("login-form");

    if (loginForm) {
        loginForm.addEventListener("submit", login);
    }

    const registerForm =
        document.getElementById("register-form");

    if (registerForm) {
        registerForm.addEventListener(
            "submit",
            register
        );
    }

    document.querySelectorAll("[data-auth-view]").forEach(
        button => {
            button.addEventListener("click", () => {
                switchAuthView(
                    button.dataset.authView
                );
            });
        }
    );

    document.querySelectorAll("[data-page]").forEach(
        item => {
            item.addEventListener("click", event => {
                event.preventDefault();

                navigateTo(
                    item.dataset.page
                );
            });
        }
    );

    document.querySelectorAll("[data-page-link]").forEach(
        item => {
            item.addEventListener("click", event => {
                event.preventDefault();

                navigateTo(
                    item.dataset.pageLink
                );
            });
        }
    );

    document.querySelectorAll("[data-open-transaction]").forEach(
        button => {
            button.addEventListener(
                "click",
                () => openTransactionModal()
            );
        }
    );

    bindClick(
        "smart-entry-button",
        openSmartEntryModal
    );
    
    bindClick(
    "smart-entry-button-page",
    openSmartEntryModal
    );

    bindClick(
        "add-budget-button",
        () => openBudgetModal()
    );

    bindClick(
        "empty-add-budget",
        () => openBudgetModal()
    );

    bindClick(
        "add-savings-button",
        () => openSavingsGoalModal()
    );

    bindClick(
        "empty-add-savings",
        () => openSavingsGoalModal()
    );

    bindClick(
        "add-actual-savings-button",
        openActualSavingsModal
    );

    bindClick(
        "savings-record-button",
        openActualSavingsModal
    );

    bindClick(
        "add-planned-button",
        () => openPlannedExpenseModal()
    );

    bindClick(
        "empty-add-planned",
        () => openPlannedExpenseModal()
    );

    bindClick(
        "logout-button",
        () => logout()
    );

    bindClick(
        "logout",
        () => logout()
    );

    bindClick(
        "save-profile-button",
        saveProfile
    );
    bindClick(
    "edit-profile-button",
    showProfileEditor
    );

    bindClick(
    "cancel-profile-edit",
    renderProfile
    );
    bindClick(
        "use-ai-category",
        useAISuggestedCategory
    );

    bindClick(
        "analyze-smart-entry",
        analyzeSmartEntry
    );

    bindClick(
        "smart-save",
        saveSmartEntry
    );

    const transactionForm =
        document.getElementById("transaction-form");

    if (transactionForm) {
        transactionForm.addEventListener(
            "submit",
            saveTransaction
        );
    }

    const budgetForm =
        document.getElementById("budget-form");

    if (budgetForm) {
        budgetForm.addEventListener(
            "submit",
            saveBudget
        );
    }

    const savingsForm =
        document.getElementById("savings-form");

    if (savingsForm) {
        savingsForm.addEventListener(
            "submit",
            saveSavingsGoal
        );
    }

    const actualSavingsForm =
        document.getElementById("actual-savings-form");

    if (actualSavingsForm) {
        actualSavingsForm.addEventListener(
            "submit",
            saveActualSavings
        );
    }

    const plannedForm =
        document.getElementById("planned-form");

    if (plannedForm) {
        plannedForm.addEventListener(
            "submit",
            savePlannedExpense
        );
    }

    const transactionDescription =
        document.getElementById(
            "transaction-description"
        );

    if (transactionDescription) {
        let predictionTimer;

        transactionDescription.addEventListener(
            "input",
            () => {
                clearTimeout(predictionTimer);

                predictionTimer = setTimeout(
                    predictCategory,
                    450
                );
            }
        );
    }

    const search =
        document.getElementById(
            "transaction-search"
        );

    if (search) {
        search.addEventListener(
            "input",
            event => {
                state.transactionSearch =
                    event.target.value;

                renderTransactions();
            }
        );
    }

    const typeFilter =
        document.getElementById(
            "transaction-filter"
        );

    if (typeFilter) {
        typeFilter.addEventListener(
            "change",
            event => {
                state.transactionTypeFilter =
                    event.target.value;

                renderTransactions();
            }
        );
    }

    const categoryFilter =
        document.getElementById(
            "transaction-category-filter"
        );

    if (categoryFilter) {
        categoryFilter.addEventListener(
            "change",
            event => {
                state.transactionCategoryFilter =
                    event.target.value;

                renderTransactions();
            }
        );
    }

    const summaryMonth =
        document.getElementById("summary-month");

    if (summaryMonth) {
        summaryMonth.value =
            state.summaryMonth;

        summaryMonth.addEventListener(
            "change",
            event => {
                state.summaryMonth =
                    event.target.value ||
                    getCurrentMonth();

                renderSummary();
            }
        );
    }

    const plannedMonth =
        document.getElementById(
            "planned-month-filter"
        );

    if (plannedMonth) {
        plannedMonth.value =
            state.planningMonth;

        plannedMonth.addEventListener(
            "change",
            event => {
                state.planningMonth =
                    event.target.value ||
                    getCurrentMonth();

                renderPlanning();
            }
        );
    }

    /*
     Some versions of the current HTML use a different
     ID for the planning month selector.
    */
    const alternatePlanningMonth =
        document.getElementById(
            "planned-page-month"
        );

    if (
        alternatePlanningMonth &&
        alternatePlanningMonth !== plannedMonth
    ) {
        alternatePlanningMonth.value =
            state.planningMonth;

        alternatePlanningMonth.addEventListener(
            "change",
            event => {
                state.planningMonth =
                    event.target.value ||
                    getCurrentMonth();

                renderPlanning();
            }
        );
    }

    bindModalEvents();

    bindMobileMenu();

    bindThemeToggle();

    document.addEventListener(
        "keydown",
        event => {
            if (event.key === "Escape") {
                closeAllModals();
                closeMobileSidebar();
            }
        }
    );
}


/* ============================================================
   MODALS
   ============================================================ */

function bindModalEvents() {
    const modalConfigs = [
        ["transaction-modal", closeTransactionModal],
        ["smart-entry-modal", closeSmartEntryModal],
        ["budget-modal", closeBudgetModal],
        ["savings-modal", closeSavingsGoalModal],
        ["actual-savings-modal", closeActualSavingsModal],
        ["planned-modal", closePlannedExpenseModal]
    ];

    modalConfigs.forEach(
        ([modalId, closeFunction]) => {
            const modal =
                document.getElementById(modalId);

            if (!modal) return;

            modal.addEventListener(
                "click",
                event => {
                    if (
                        event.target === modal ||
                        event.target.matches(
                            ".modal-backdrop"
                        )
                    ) {
                        closeFunction();
                    }
                }
            );
        }
    );

    document.querySelectorAll(
        "[data-close-modal]"
    ).forEach(button => {
        button.addEventListener(
            "click",
            () => {
                const modalId =
                    button.dataset.closeModal;

                const modal =
                    document.getElementById(modalId);

                if (modal) {
                    modal.classList.add("hidden");
                }
            }
        );
    });

    /*
     Support common close button classes without
     depending on one exact HTML implementation.
    */
    document.querySelectorAll(
        ".modal-close, .close-modal"
    ).forEach(button => {
        button.addEventListener(
            "click",
            () => {
                const modal =
                    button.closest(".modal");

                if (modal) {
                    modal.classList.add("hidden");
                }
            }
        );
    });
}

function closeAllModals() {
    document.querySelectorAll(".modal").forEach(
        modal => modal.classList.add("hidden")
    );

    currentTransactionId = null;
    currentBudgetId = null;
    currentSavingsGoalId = null;
    currentPlannedExpenseId = null;
}


/* ============================================================
   MOBILE SIDEBAR
   ============================================================ */

function bindMobileMenu() {
    const menuButton =
        document.getElementById("mobile-menu");

    const sidebar =
        document.getElementById("sidebar");

    const closeButton =
        document.getElementById("sidebar-close");

    const overlay =
        document.getElementById("sidebar-overlay");

    if (menuButton) {
        menuButton.addEventListener(
            "click",
            openMobileSidebar
        );
    }

    if (closeButton) {
        closeButton.addEventListener(
            "click",
            closeMobileSidebar
        );
    }

    if (overlay) {
        overlay.addEventListener(
            "click",
            closeMobileSidebar
        );
    }

    /*
     Backward compatibility with an older sidebar toggle.
    */
    const oldToggle =
        document.getElementById("sidebar-toggle");

    if (oldToggle) {
        oldToggle.addEventListener(
            "click",
            openMobileSidebar
        );
    }
}

function openMobileSidebar() {
    const sidebar =
        document.getElementById("sidebar");

    const overlay =
        document.getElementById("sidebar-overlay");

    if (sidebar) {
        sidebar.classList.add("mobile-open");
    }

    if (overlay) {
        overlay.classList.remove("hidden");
    }

    document.body.classList.add(
        "sidebar-is-open"
    );
}

function closeMobileSidebar() {
    const sidebar =
        document.getElementById("sidebar");

    const overlay =
        document.getElementById("sidebar-overlay");

    if (sidebar) {
        sidebar.classList.remove("mobile-open");
    }

    if (overlay) {
        overlay.classList.add("hidden");
    }

    document.body.classList.remove(
        "sidebar-is-open"
    );
}


/* ============================================================
   THEME
   ============================================================ */

function initializeTheme() {
    const saved =
        localStorage.getItem("finance_theme");

    if (saved === "dark") {
        document.documentElement.classList.add(
            "dark-mode"
        );
    } else if (saved === "light") {
        document.documentElement.classList.remove(
            "dark-mode"
        );
    } else {
        if (
            window.matchMedia &&
            window.matchMedia(
                "(prefers-color-scheme: dark)"
            ).matches
        ) {
            document.documentElement.classList.add(
                "dark-mode"
            );
        }
    }

    updateThemeButtons();
}

function bindThemeToggle() {
    document.querySelectorAll(
        "[data-theme-toggle], #theme-toggle"
    ).forEach(button => {
        button.addEventListener(
            "click",
            toggleTheme
        );
    });
}

function toggleTheme() {
    const root =
        document.documentElement;

    const dark =
        root.classList.toggle("dark-mode");

    localStorage.setItem(
        "finance_theme",
        dark ? "dark" : "light"
    );

    updateThemeButtons();
}

function updateThemeButtons() {
    const dark =
        document.documentElement.classList.contains(
            "dark-mode"
        );

    document.querySelectorAll(
        "[data-theme-toggle], #theme-toggle"
    ).forEach(button => {
        button.setAttribute(
            "aria-label",
            dark
                ? "Switch to light mode"
                : "Switch to dark mode"
        );

        const icon =
            button.querySelector(
                ".theme-icon"
            );

        if (icon) {
            icon.textContent =
                dark ? "☀" : "☾";
        }
    });
}


/* ============================================================
   TOAST NOTIFICATIONS
   ============================================================ */

function showToast(message, type = "info") {
    const container =
        document.getElementById(
            "toast-container"
        );

    if (!container) {
        console.log(`[${type}] ${message}`);
        return;
    }

    const toast =
        document.createElement("div");

    toast.className =
        `toast toast-${type}`;

    toast.innerHTML = `
        <div class="toast-icon">
            ${
                type === "success"
                    ? "✓"
                    : type === "error"
                        ? "!"
                        : "i"
            }
        </div>

        <div class="toast-message">
            ${escapeHTML(message)}
        </div>

        <button
            type="button"
            class="toast-close"
            aria-label="Close"
        >
            ×
        </button>
    `;

    container.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.add("show");
    });

    const close =
        () => removeToast(toast);

    const closeButton =
        toast.querySelector(".toast-close");

    if (closeButton) {
        closeButton.addEventListener(
            "click",
            close
        );
    }

    /*
     Keep the notification visible for 5 seconds.
     Do not use a tiny timeout that makes it disappear
     before the user can read it.
    */
    const timeout =
        setTimeout(close, 5000);

    toast.addEventListener(
        "mouseenter",
        () => clearTimeout(timeout),
        { once: true }
    );
}
function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function showToast(message, type = "info") {
    const container = document.getElementById("toast-container");
    if (!container) return;

    let text = message;

    if (message && typeof message === "object") {
        if (Array.isArray(message)) {
            text = message
                .map(item => {
                    if (typeof item === "string") return item;
                    if (item?.msg) return item.msg;
                    if (item?.detail) return item.detail;
                    return JSON.stringify(item);
                })
                .join(", ");
        } else {
            text =
                message.detail ||
                message.message ||
                message.msg ||
                JSON.stringify(message);
        }
    }

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;

    toast.innerHTML = `
        <span class="toast-icon">${type === "error" ? "!" : "✓"}</span>
        <span class="toast-message">${escapeHtml(String(text))}</span>
        <button class="toast-close" type="button">&times;</button>
    `;

    container.appendChild(toast);

    const closeButton = toast.querySelector(".toast-close");
    closeButton.addEventListener("click", () => {
        toast.remove();
    });

    setTimeout(() => {
        if (toast.isConnected) {
            toast.remove();
        }
    }, 5000);
}

/* ============================================================
   FINANCIAL HELPERS
   ============================================================ */

function getTransactionsForMonth(month) {
    return transactions.filter(
        transaction =>
            normalizeMonth(transaction.date) ===
            normalizeMonth(month)
    );
}

function plannedExpensesForMonth(month) {
    return plannedExpenses.filter(
        item =>
            normalizeMonth(item.month) ===
            normalizeMonth(month)
    );
}

function sumPlannedExpensesForMonth(month) {
    return sum(
        plannedExpensesForMonth(month).map(
            item => Number(item.planned_amount || 0)
        )
    );
}

function sumActualSavingsForMonth(month) {
    return sum(
        actualSavings
            .filter(
                item =>
                    normalizeMonth(
                        item.month || item.date
                    ) === normalizeMonth(month)
            )
            .map(
                item => Number(item.amount || 0)
            )
    );
}

function getSavingsGoalForMonth(month) {
    return savingsGoals.find(
        goal =>
            normalizeMonth(goal.month) ===
            normalizeMonth(month)
    ) || null;
}

function sumTransactions(items) {
    return sum(
        items.map(
            item => Number(item.amount || 0)
        )
    );
}

function sum(values) {
    return values.reduce(
        (total, value) =>
            total + (Number(value) || 0),
        0
    );
}

function getCategoryTotals(items) {
    const totals = {};

    items.forEach(item => {
        const category =
            item.category || "Other";

        totals[category] =
            (totals[category] || 0) +
            Number(item.amount || 0);
    });

    return totals;
}

function getTopCategory(totals) {
    const entries =
        Object.entries(totals);

    if (!entries.length) return null;

    entries.sort(
        (a, b) => b[1] - a[1]
    );

    return {
        category: entries[0][0],
        amount: entries[0][1]
    };
}

function isIncome(transaction) {
    const type = (
        transaction.transaction_type ||
        transaction.type ||
        ""
    ).toLowerCase();

    return (
        type === "income" ||
        type === "credit" ||
        type === "deposit"
    );
}


/* ============================================================
   DATE HELPERS
   ============================================================ */

function getCurrentMonth() {
    const now = new Date();

    return `${now.getFullYear()}-${String(
        now.getMonth() + 1
    ).padStart(2, "0")}`;
}

function getTodayISO() {
    return toISODate(new Date());
}

function toISODate(date) {
    const year = date.getFullYear();

    const month =
        String(date.getMonth() + 1)
            .padStart(2, "0");

    const day =
        String(date.getDate())
            .padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function normalizeDateInput(value) {
    if (!value) return getTodayISO();

    return String(value).slice(0, 10);
}

function normalizeMonth(value) {
    if (!value) return "";

    const stringValue =
        String(value);

    if (/^\d{4}-\d{2}$/.test(stringValue)) {
        return stringValue;
    }

    return stringValue.slice(0, 7);
}

function dateValue(value) {
    if (!value) return 0;

    const timestamp =
        new Date(value).getTime();

    return Number.isFinite(timestamp)
        ? timestamp
        : 0;
}

function formatDate(value) {
    if (!value) return "—";

    const date =
        new Date(value);

    if (Number.isNaN(date.getTime())) {
        return String(value).slice(0, 10);
    }

    return date.toLocaleDateString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );
}

function shiftMonth(month, offset) {
    const [year, monthNumber] =
        normalizeMonth(month)
            .split("-")
            .map(Number);

    if (!year || !monthNumber) {
        return getCurrentMonth();
    }

    const date =
        new Date(
            year,
            monthNumber - 1 + offset,
            1
        );

    return `${date.getFullYear()}-${String(
        date.getMonth() + 1
    ).padStart(2, "0")}`;
}

function getLastMonths(count) {
    const result = [];

    for (let i = count - 1; i >= 0; i--) {
        result.push(
            shiftMonth(
                getCurrentMonth(),
                -i
            )
        );
    }

    return result;
}


/* ============================================================
   FORM HELPERS
   ============================================================ */

function valueOf(id) {
    const element =
        document.getElementById(id);

    return element
        ? element.value || ""
        : "";
}

function setValue(id, value) {
    const element =
        document.getElementById(id);

    if (!element) return;

    if (
        element.type === "checkbox"
    ) {
        element.checked =
            Boolean(value);
        return;
    }

    element.value =
        value === null ||
        value === undefined
            ? ""
            : value;
}

function setText(id, value) {
    const element =
        document.getElementById(id);

    if (element) {
        element.textContent =
            value === null ||
            value === undefined
                ? ""
                : value;
    }
}

function valueOrNull(id) {
    const value =
        valueOf(id).trim();

    return value || null;
}

function numberOrNull(value) {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return null;
    }

    const number =
        Number(value);

    return Number.isFinite(number)
        ? number
        : null;
}

function bindClick(id, callback) {
    const element =
        document.getElementById(id);

    if (!element) return;

    element.addEventListener(
        "click",
        event => {
            event.preventDefault();
            callback();
        }
    );
}


/* ============================================================
   CURRENCY / NUMBER FORMATTING
   ============================================================ */

function getCurrencyCode() {
    return (
        financialPreferences?.currency ||
        "INR"
    );
}

function formatCurrency(value) {
    const number =
        Number(value || 0);

    try {
        return new Intl.NumberFormat(
            "en-IN",
            {
                style: "currency",
                currency: getCurrencyCode(),
                maximumFractionDigits: 2
            }
        ).format(number);
    } catch {
        return `₹${number.toFixed(2)}`;
    }
}

function formatNumber(value) {
    const number =
        Number(value || 0);

    return number.toLocaleString(
        "en-IN",
        {
            maximumFractionDigits: 1
        }
    );
}


/* ============================================================
   SECURITY / HTML HELPERS
   ============================================================ */

function escapeHTML(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function escapeAttribute(value) {
    return escapeHTML(value)
        .replace(/`/g, "&#096;");
}


/* ============================================================
   EXPOSE FUNCTIONS FOR INLINE HTML ACTIONS
   ============================================================ */

window.navigateTo = navigateTo;

window.logout = logout;

window.openTransactionModal =
    openTransactionModal;

window.closeTransactionModal =
    closeTransactionModal;

window.editTransaction =
    editTransaction;

window.deleteTransaction =
    deleteTransaction;

window.openSmartEntryModal =
    openSmartEntryModal;

window.closeSmartEntryModal =
    closeSmartEntryModal;

window.analyzeSmartEntry =
    analyzeSmartEntry;

window.saveSmartEntry =
    saveSmartEntry;

window.openBudgetModal =
    openBudgetModal;

window.closeBudgetModal =
    closeBudgetModal;

window.deleteBudget =
    deleteBudget;

window.openSavingsGoalModal =
    openSavingsGoalModal;

window.closeSavingsGoalModal =
    closeSavingsGoalModal;

window.deleteSavingsGoal =
    deleteSavingsGoal;

window.openActualSavingsModal =
    openActualSavingsModal;

window.closeActualSavingsModal =
    closeActualSavingsModal;

window.deleteActualSavings =
    deleteActualSavings;

window.openPlannedExpenseModal =
    openPlannedExpenseModal;

window.closePlannedExpenseModal =
    closePlannedExpenseModal;

window.deletePlannedExpense =
    deletePlannedExpense;

window.openSuggestedPlannedExpense =
    openSuggestedPlannedExpense;

window.switchAuthView =
    switchAuthView;

window.toggleTheme =
    toggleTheme;


/* ============================================================
   END
   ============================================================ */