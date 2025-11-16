// ============================================
// Configuration
// ============================================
const CONFIG = {
    API_BASE_URL: 'https://37ev13bzmk.execute-api.us-east-1.amazonaws.com/dev',
    PASSWORD: 'azeez', // Hardcoded password - change this to revoke access
};

// ============================================
// State Management
// ============================================
const state = {
    contracts: [],
    purchaseOrders: [],
    resources: [],
    risks: [],
    poMappings: [],
    auditRecords: [],
    forecasts: [],
    isAuthenticated: false,
};

// ============================================
// Utility Functions
// ============================================
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatCurrency(amount) {
    return `£${parseFloat(amount).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    return dateStr;
}

function parseDate(dateStr) {
    if (!dateStr) return null;
    try {
        // Handle DD/MM/YYYY format
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10);
            const year = parseInt(parts[2], 10);
            if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
                return new Date(year, month - 1, day);
            }
        }
        // Fallback to ISO date
        const isoDate = new Date(dateStr);
        if (!isNaN(isoDate.getTime())) {
            return isoDate;
        }
    } catch (e) {
        console.error('Date parse error:', dateStr, e);
    }
    return null;
}

function showLoading() {
    document.getElementById('loading').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loading').classList.add('hidden');
}

function showError(message) {
    alert(`Error: ${message}`);
}

// ============================================
// API Functions
// ============================================
async function fetchAPI(endpoint) {
    const url = `${CONFIG.API_BASE_URL}${endpoint}`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(`Failed to fetch ${endpoint}:`, error);
        throw error;
    }
}

async function loadAllData() {
    showLoading();
    try {
        const [contractsRes, posRes, resourcesRes, risksRes, mappingsRes, auditRes, forecastsRes] = await Promise.all([
            fetchAPI('/api/contracts'),
            fetchAPI('/api/purchase-orders'),
            fetchAPI('/api/resources'),
            fetchAPI('/api/risks'),
            fetchAPI('/api/po-mappings'),
            fetchAPI('/api/audit?limit=200'),
            fetchAPI('/api/forecasts'),
        ]);

        // Validate responses
        if (!contractsRes || !contractsRes.contracts) {
            throw new Error('Contracts API returned invalid response');
        }
        if (!posRes || !posRes.purchase_orders) {
            throw new Error('Purchase Orders API returned invalid response');
        }
        if (!resourcesRes || !resourcesRes.resources) {
            throw new Error('Resources API returned invalid response');
        }
        if (!risksRes || !risksRes.risks) {
            throw new Error('Risks API returned invalid response');
        }
        if (!mappingsRes || !mappingsRes.mappings) {
            throw new Error('PO Mappings API returned invalid response');
        }

        state.contracts = contractsRes.contracts || [];
        state.purchaseOrders = posRes.purchase_orders || [];
        state.resources = resourcesRes.resources || [];
        state.risks = risksRes.risks || [];
        state.poMappings = mappingsRes.mappings || [];
        state.auditRecords = (auditRes && auditRes.audit_records) ? auditRes.audit_records : [];
        state.forecasts = (forecastsRes && forecastsRes.forecasts) ? forecastsRes.forecasts : [];

        console.log('Data loaded:', {
            contracts: state.contracts.length,
            pos: state.purchaseOrders.length,
            resources: state.resources.length,
            risks: state.risks.length,
            mappings: state.poMappings.length,
            audit: state.auditRecords.length,
            forecasts: state.forecasts.length
        });

        renderDashboard();
    } catch (error) {
        showError(`Failed to load data: ${error.message}`);
        console.error('Load data error:', error);
    } finally {
        hideLoading();
    }
}

// ============================================
// Authentication
// ============================================
function handleLogin(e) {
    e.preventDefault();
    const password = document.getElementById('password-input').value;
    const errorElement = document.getElementById('login-error');

    if (password === CONFIG.PASSWORD) {
        state.isAuthenticated = true;
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('dashboard').style.display = 'block';
        loadAllData();
    } else {
        errorElement.textContent = 'Incorrect password. Please try again.';
        errorElement.classList.add('show');
        setTimeout(() => {
            errorElement.classList.remove('show');
        }, 3000);
    }
}

// ============================================
// Dashboard Rendering
// ============================================
function renderDashboard() {
    // Set current date
    const now = new Date();
    document.getElementById('current-date').textContent = now.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    renderExecutiveSummary();
    renderSOWsTab();
    renderPOsTab();
    renderResourcesTab();
    renderRisksTab();
    renderHierarchyTab();
    renderForecastsTab();
    renderAuditTab();
}

// ============================================
// Executive Summary
// ============================================
function renderExecutiveSummary() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const yearStart = new Date(currentYear, 0, 1);
    const yearEnd = new Date(currentYear, 11, 31);

    // Filter active contracts
    const activeContracts = state.contracts.filter(c => {
        const endDate = parseDate(c.sow_end_date);
        return endDate && endDate >= now;
    });

    // Filter active resources
    const activeResources = state.resources.filter(r => r.is_active);

    // Calculate Annual Contract Value - EXACT COPY from manager_report_screen.py lines 973-1011
    // IMPORTANT: Use activeContracts only (not all contracts)
    let annualValue = 0.0;
    activeContracts.forEach(contract => {
        try {
            const startDateStr = contract.sow_start_date || '';
            const endDateStr = contract.sow_end_date || '';
            const totalValue = parseFloat(contract.sow_value_gbp || 0);

            if (!startDateStr || !endDateStr || totalValue === 0) return;

            const startDate = parseDate(startDateStr);
            const endDate = parseDate(endDateStr);

            if (!startDate || !endDate) return;

            // Guard rails
            if (endDate < startDate) return;

            // Total days in SOW (inclusive)
            const totalDays = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
            if (totalDays <= 0) return;

            // Daily rate
            const dailyRate = totalValue / totalDays;

            // Calculate overlap with target year
            const overlapStart = startDate > yearStart ? startDate : yearStart;
            const overlapEnd = endDate < yearEnd ? endDate : yearEnd;

            if (overlapEnd < overlapStart) return;

            // Days in the target year
            const daysInYear = Math.floor((overlapEnd - overlapStart) / (1000 * 60 * 60 * 24)) + 1;

            // Annual amount for this SOW
            const sowAnnualAmount = dailyRate * daysInYear;
            annualValue += Math.round(sowAnnualAmount * 100) / 100; // Round to 2 decimals

        } catch (e) {
            console.error('Error calculating SOW annual value:', contract, e);
        }
    });

    // Calculate margin statistics - margin_percentage exists in API
    const activeMargins = [];
    activeResources.forEach(r => {
        const margin = r.margin_percentage;
        if (margin !== null && margin !== undefined && !isNaN(parseFloat(margin))) {
            activeMargins.push(parseFloat(margin));
        }
    });

    const contractorsCount = activeMargins.length;
    const permanentCount = activeResources.length - contractorsCount;
    const avgMargin = activeMargins.length > 0
        ? activeMargins.reduce((a, b) => a + b, 0) / activeMargins.length
        : 0;

    // Update metrics
    document.getElementById('metric-acv').textContent = formatCurrency(annualValue);
    document.getElementById('metric-sows').textContent = activeContracts.length;
    document.getElementById('metric-resources').textContent = activeResources.length;
    document.getElementById('metric-resources-breakdown').textContent =
        `${contractorsCount} contractors, ${permanentCount} permanent`;
    document.getElementById('metric-margin').textContent = `${avgMargin.toFixed(1)}%`;

    // Customer breakdown
    const customerSowCounts = {};
    const customerResourceCounts = {};
    const customerCanonicalNames = {};

    activeContracts.forEach(c => {
        const customer = c.customer_name || 'Unknown';
        const key = customer.toUpperCase();
        if (!customerCanonicalNames[key]) customerCanonicalNames[key] = customer;
        customerSowCounts[key] = (customerSowCounts[key] || 0) + 1;
    });

    activeResources.forEach(r => {
        const customer = r.customer_name || 'Unknown';
        const key = customer.toUpperCase();
        if (!customerCanonicalNames[key]) customerCanonicalNames[key] = customer;
        customerResourceCounts[key] = (customerResourceCounts[key] || 0) + 1;
    });

    const allCustomers = new Set([...Object.keys(customerSowCounts), ...Object.keys(customerResourceCounts)]);
    const sortedCustomers = Array.from(allCustomers).sort();

    let customerHtml = '<h3>Customer Breakdown (Active)</h3>';
    sortedCustomers.forEach(key => {
        const name = customerCanonicalNames[key];
        const sowCount = customerSowCounts[key] || 0;
        const resourceCount = customerResourceCounts[key] || 0;
        customerHtml += `<p><strong>${escapeHtml(name)}:</strong> ${sowCount} SOWs, ${resourceCount} resources</p>`;
    });

    document.getElementById('customer-breakdown').innerHTML = customerHtml;
}

// ============================================
// SOWs Tab
// ============================================
function renderSOWsTab() {
    const now = new Date();
    const activeCount = state.contracts.filter(c => {
        const endDate = parseDate(c.sow_end_date);
        return endDate && endDate >= now;
    }).length;
    const completedCount = state.contracts.length - activeCount;

    // Summary
    const summaryHtml = `
        <p><strong>Total SOWs: ${state.contracts.length}</strong> (Active: ${activeCount}, Completed: ${completedCount})</p>
    `;
    document.getElementById('sows-summary').innerHTML = summaryHtml;

    // Monthly summary
    renderMonthlySummary();

    // Table
    const tbody = document.querySelector('#sows-table tbody');
    tbody.innerHTML = '';

    const sortedContracts = [...state.contracts].sort((a, b) => {
        const custCompare = (a.customer_name || '').localeCompare(b.customer_name || '');
        if (custCompare !== 0) return custCompare;
        return (a.service_name || '').localeCompare(b.service_name || '');
    });

    sortedContracts.forEach(contract => {
        const endDate = parseDate(contract.sow_end_date);
        const status = endDate && endDate >= now ? 'Active' : 'Completed';
        const statusClass = status === 'Active' ? 'status-active' : 'status-completed';

        const row = `
            <tr>
                <td>${escapeHtml(contract.customer_name || '')}</td>
                <td>${escapeHtml(contract.sow_short_name || '')}</td>
                <td>${formatCurrency(contract.sow_value_gbp || 0)}</td>
                <td>${formatDate(contract.sow_start_date || '')}</td>
                <td>${formatDate(contract.sow_end_date || '')}</td>
                <td>${parseInt(contract.sow_duration_months || 0)}</td>
                <td class="${statusClass}">${status}</td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

function renderMonthlySummary() {
    const monthYearMap = {};

    state.contracts.forEach(contract => {
        const startDate = parseDate(contract.sow_start_date);
        if (!startDate) return;

        const key = `${startDate.getFullYear()}-${startDate.getMonth()}`;
        if (!monthYearMap[key]) {
            monthYearMap[key] = {
                year: startDate.getFullYear(),
                month: startDate.getMonth(),
                contracts: []
            };
        }
        monthYearMap[key].contracts.push(contract);
    });

    const sortedMonths = Object.values(monthYearMap).sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
    });

    let totalValue = 0;
    state.contracts.forEach(c => {
        totalValue += parseFloat(c.sow_value_gbp || 0);
    });

    const dateRange = sortedMonths.length > 0
        ? `${new Date(sortedMonths[sortedMonths.length - 1].year, sortedMonths[sortedMonths.length - 1].month).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })} to ${new Date(sortedMonths[0].year, sortedMonths[0].month).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}`
        : 'N/A';

    let html = `
        <h2>Statements of Work Signed - All Months (Descending Order)</h2>
        <p><strong>Total of ${state.contracts.length} SOWs signed with Total Value of ${formatCurrency(totalValue)} between ${dateRange}</strong></p>
    `;

    sortedMonths.forEach(({ year, month, contracts }) => {
        const monthName = new Date(year, month).toLocaleDateString('en-GB', { month: 'long' });

        html += `
            <h3>${monthName} ${year} Summary: ${contracts.length} new SOW(s) started in ${monthName}:</h3>
            <table style="margin-top: 10px; margin-bottom: 20px;">
                <thead>
                    <tr>
                        <th>Customer</th>
                        <th>SOW Short Name</th>
                        <th>Duration (Months)</th>
                        <th>SOW Value</th>
                        <th>Start Date</th>
                    </tr>
                </thead>
                <tbody>
        `;

        contracts.forEach(sow => {
            html += `
                <tr>
                    <td>${escapeHtml(sow.customer_name || '')}</td>
                    <td>${escapeHtml(sow.sow_short_name || '')}</td>
                    <td>${parseInt(sow.sow_duration_months || 0)}</td>
                    <td>${formatCurrency(sow.sow_value_gbp || 0)}</td>
                    <td>${formatDate(sow.sow_start_date || '')}</td>
                </tr>
            `;
        });

        html += `
                </tbody>
            </table>
        `;
    });

    document.getElementById('monthly-summary').innerHTML = html;
}

// ============================================
// POs Tab
// ============================================
function renderPOsTab() {
    const now = new Date();
    const openCount = state.purchaseOrders.filter(po => {
        const endDate = parseDate(po.po_period_end_date);
        return endDate && endDate >= now;
    }).length;
    const closedCount = state.purchaseOrders.length - openCount;

    const unreceivedCount = state.purchaseOrders.filter(po => po.po_status !== 'received').length;

    const summaryHtml = `
        <p><strong>Total Purchase Orders: ${state.purchaseOrders.length}</strong> (Open: ${openCount}, Closed: ${closedCount})</p>
        <p><strong>${unreceivedCount > 0 ? `${unreceivedCount} PO(s) not yet received` : 'All POs received'}</strong></p>
    `;
    document.getElementById('pos-summary').innerHTML = summaryHtml;

    const tbody = document.querySelector('#pos-table tbody');
    tbody.innerHTML = '';

    const sortedPOs = [...state.purchaseOrders].sort((a, b) => {
        const serviceCompare = (a.service_name || '').localeCompare(b.service_name || '');
        if (serviceCompare !== 0) return serviceCompare;
        return (a.po_period_start_date || '').localeCompare(b.po_period_start_date || '');
    });

    sortedPOs.forEach(po => {
        const endDate = parseDate(po.po_period_end_date);
        const periodStatus = endDate && endDate >= now ? 'Open' : 'Closed';
        const statusClass = periodStatus === 'Open' ? 'status-open' : 'status-closed';

        const row = `
            <tr>
                <td>${escapeHtml(po.customer_name || '')}</td>
                <td>${escapeHtml(po.service_name || '')}</td>
                <td>${escapeHtml(po.po_number || '')}</td>
                <td>${formatDate(po.po_period_start_date || '')}</td>
                <td>${formatDate(po.po_period_end_date || '')}</td>
                <td>${escapeHtml(po.po_status || '')}</td>
                <td class="${statusClass}">${periodStatus}</td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

// ============================================
// Resources Tab
// ============================================
function renderResourcesTab() {
    const activeCount = state.resources.filter(r => r.is_active).length;
    const inactiveCount = state.resources.length - activeCount;

    const margins = [];
    state.resources.forEach(r => {
        const margin = r.margin_percentage;
        if (margin !== null && margin !== undefined && !isNaN(parseFloat(margin))) {
            margins.push(parseFloat(margin));
        }
    });

    const contractorsCount = margins.length;
    const permanentCount = state.resources.length - contractorsCount;
    const avgMargin = margins.length > 0 ? margins.reduce((a, b) => a + b, 0) / margins.length : 0;

    const summaryHtml = `
        <p><strong>Total Resources: ${state.resources.length}</strong> (Active: ${activeCount}, Inactive: ${inactiveCount})</p>
        <p><strong>Contractors: ${contractorsCount}</strong> | <strong>Permanent: ${permanentCount}</strong></p>
        <p><strong>Average Contractor Margin: ${avgMargin.toFixed(2)}%</strong></p>
    `;
    document.getElementById('resources-summary').innerHTML = summaryHtml;

    const tbody = document.querySelector('#resources-table tbody');
    tbody.innerHTML = '';

    const sortedResources = [...state.resources].sort((a, b) => {
        const custCompare = (a.customer_name || '').localeCompare(b.customer_name || '');
        if (custCompare !== 0) return custCompare;
        return (a.job_title || '').localeCompare(b.job_title || '');
    });

    sortedResources.forEach(resource => {
        const marginDisplay = resource.margin_percentage !== null && resource.margin_percentage !== undefined
            ? `${parseFloat(resource.margin_percentage).toFixed(2)}%`
            : '';

        const row = `
            <tr>
                <td>${escapeHtml(resource.customer_name || '')}</td>
                <td>${escapeHtml(resource.first_name || '')}</td>
                <td>${escapeHtml(resource.last_name || '')}</td>
                <td>${escapeHtml(resource.job_title || '')}</td>
                <td style="text-align: right;">${marginDisplay}</td>
                <td>${resource.is_active ? 'Yes' : 'No'}</td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

// ============================================
// Risks Tab
// ============================================
function renderRisksTab() {
    const redCount = state.risks.filter(r => r.rag_status === 'Red').length;
    const amberCount = state.risks.filter(r => r.rag_status === 'Amber').length;
    const greenCount = state.risks.filter(r => r.rag_status === 'Green').length;

    const summaryHtml = `
        <p><strong>Total Items: ${state.risks.length}</strong></p>
        <p>🔴 Red: ${redCount} | 🟠 Amber: ${amberCount} | 🟢 Green: ${greenCount}</p>
    `;
    document.getElementById('risks-summary').innerHTML = summaryHtml;

    const tbody = document.querySelector('#risks-table tbody');
    tbody.innerHTML = '';

    state.risks.forEach(risk => {
        let rowClass = '';
        let statusIcon = escapeHtml(risk.rag_status || '');

        if (risk.rag_status === 'Red') {
            rowClass = 'rag-red';
            statusIcon = '🔴';
        } else if (risk.rag_status === 'Amber') {
            rowClass = 'rag-amber';
            statusIcon = '🟠';
        } else if (risk.rag_status === 'Green') {
            rowClass = 'rag-green';
            statusIcon = '🟢';
        }

        const row = `
            <tr class="${rowClass}">
                <td><strong>${escapeHtml(risk.ref || '')}</strong></td>
                <td>${escapeHtml(risk.type || '')}</td>
                <td>${statusIcon}</td>
                <td>${escapeHtml(risk.description || '')}</td>
                <td>${escapeHtml(risk.impact || '')}</td>
                <td>${escapeHtml(risk.current_status || '')}</td>
                <td>${formatDate(risk.target_date || '')}</td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

// ============================================
// Hierarchy Tab
// ============================================

/**
 * Generate HTML for a single resource in the hierarchy view
 * Based on hierarchical_mappings.py reference implementation
 */
function generateResourceHTML(mapping, resourcesById, isActive) {
    const resource = resourcesById[mapping.resource_id] || {};

    const firstName = resource.first_name || '';
    const lastName = resource.last_name || '';
    const fullName = `${firstName} ${lastName}`.trim() || 'Unknown Resource';
    const jobTitle = resource.job_title || '';
    const sellRate = resource.sell_rate_gbp || 0;
    const marginPercentage = resource.margin_percentage || 0;

    // Format created_date: "2025-11-12 04:05:28" -> "12/11/2025"
    let assignmentStart = '';
    if (mapping.created_date) {
        try {
            const datePart = mapping.created_date.split(' ')[0]; // "2025-11-12"
            const [year, month, day] = datePart.split('-');
            assignmentStart = `${day}/${month}/${year}`;
        } catch (e) {
            console.error('Error parsing created_date:', mapping.created_date, e);
            assignmentStart = 'Unknown';
        }
    } else {
        assignmentStart = 'Unknown';
    }

    // Format end_date if it exists
    let assignmentEnd = 'Present';
    if (mapping.end_date && mapping.end_date !== '') {
        assignmentEnd = formatDate(mapping.end_date);
    }

    const assignmentDisplay = `${assignmentStart} → ${assignmentEnd}`;

    // Resource employment status (is the person employed by us?)
    const resourceActive = resource.is_active;
    const resourceStatusIcon = resourceActive ? '🟢' : '🔴';
    const resourceStatusText = resourceActive ? 'Active' : 'Inactive';

    // Mapping assignment status (are they assigned to THIS PO?)
    const mappingStatus = mapping.status || 'Active';
    const mappingStatusIcon = mappingStatus === 'Active' ? '🟢' : '🔴';

    return `
        <div class="resource-item ${isActive ? 'active' : 'ended'}">
            <div class="resource-header">
                <span class="resource-icon">${isActive ? '✅' : '⚠️'}</span>
                <span class="resource-name">${escapeHtml(fullName)}</span>
                <span class="job-title"> - ${escapeHtml(jobTitle)}</span>
            </div>
            <div class="resource-details">
                <div class="detail-line">
                    💷 Sell: £${sellRate.toFixed(2)}/day | Margin: ${marginPercentage.toFixed(1)}%
                </div>
                <div class="detail-line">
                    Employment: ${resourceStatusIcon} ${resourceStatusText} |
                    Assignment: ${mappingStatusIcon} ${mappingStatus}
                </div>
                <div class="detail-line">
                    📅 Assigned to this PO: ${assignmentDisplay}
                </div>
            </div>
        </div>
    `;
}

function renderHierarchyTab() {
    // IMPORTANT: Old data (pre-v1.2.3) doesn't have status field - default to Active
    const activeMappings = state.poMappings.filter(m => {
        const mappingStatus = m.status || "Active"; // Handle missing status (old data)
        const hasEndDate = m.end_date && m.end_date !== "";
        return mappingStatus === "Active" && !hasEndDate;
    }).length;
    const endedMappings = state.poMappings.length - activeMappings;

    const summaryHtml = `
        <p><strong>Total SOWs: ${state.contracts.length}</strong></p>
        <p><strong>Total POs: ${state.purchaseOrders.length}</strong></p>
        <p><strong>Total Resources: ${state.resources.length}</strong></p>
        <p><strong>Active Mappings: ${activeMappings}</strong> | <strong>Ended Mappings: ${endedMappings}</strong></p>
    `;
    document.getElementById('hierarchy-summary').innerHTML = summaryHtml;

    // Build lookups
    const posById = {};
    state.purchaseOrders.forEach(po => {
        posById[po.po_id] = po;
    });

    const resourcesById = {};
    state.resources.forEach(r => {
        resourcesById[r.resource_id] = r;
    });

    const posByContract = {};
    state.purchaseOrders.forEach(po => {
        if (!posByContract[po.contract_id]) posByContract[po.contract_id] = [];
        posByContract[po.contract_id].push(po);
    });

    // Build mappings by PO lookup
    const mappingsByPo = {};
    state.poMappings.forEach(m => {
        if (!mappingsByPo[m.po_id]) mappingsByPo[m.po_id] = [];
        mappingsByPo[m.po_id].push(m);
    });

    let html = '';

    const sortedContracts = [...state.contracts].sort((a, b) => {
        const custCompare = (a.customer_name || '').localeCompare(b.customer_name || '');
        if (custCompare !== 0) return custCompare;
        return (a.sow_reference || '').localeCompare(b.sow_reference || '');
    });

    sortedContracts.forEach(contract => {
        const contractPOs = posByContract[contract.contract_id] || [];

        let totalResources = 0;
        let activeResourceMappings = 0;
        let endedResourceMappings = 0;

        contractPOs.forEach(po => {
            const poMappings = mappingsByPo[po.po_id] || [];
            totalResources += poMappings.length;
            // Handle old data: default status to Active if missing
            activeResourceMappings += poMappings.filter(m => {
                const status = m.status || "Active";
                const hasEndDate = m.end_date && m.end_date !== "";
                return status === "Active" && !hasEndDate;
            }).length;
            endedResourceMappings += poMappings.filter(m => {
                const status = m.status || "Active";
                const hasEndDate = m.end_date && m.end_date !== "";
                return status === "Ended" || hasEndDate;
            }).length;
        });

        const sowStatus = contract.status || 'Active';
        const sowStatusIcon = sowStatus === 'Active' ? '🟢' : '🔴';
        const sowStatusClass = sowStatus === 'Active' ? 'status-active' : 'status-inactive';

        html += `
            <details class="sow-section" open>
                <summary class="sow-header">
                    <span class="icon">📑</span>
                    <span class="sow-title">${escapeHtml(contract.sow_reference || '')} - ${escapeHtml(contract.service_name || '')}</span>
                    <span class="badge ${sowStatusClass}">${sowStatusIcon} SOW: ${sowStatus}</span>
                    <span class="count">[${totalResources} Total, ${activeResourceMappings} Active, ${endedResourceMappings} Ended]</span>
                </summary>
        `;

        // Sort POs by start date
        const sortedPOs = contractPOs.sort((a, b) => {
            return (a.po_period_start_date || '').localeCompare(b.po_period_start_date || '');
        });

        sortedPOs.forEach(po => {
            const poMappings = mappingsByPo[po.po_id] || [];

            // Separate active and ended mappings
            const activeMappings = [];
            const endedMappings = [];

            poMappings.forEach(m => {
                const status = m.status || "Active";
                const hasEndDate = m.end_date && m.end_date !== "";
                if (status === "Ended" || hasEndDate) {
                    endedMappings.push(m);
                } else {
                    activeMappings.push(m);
                }
            });

            const poStatus = po.po_status || 'received';
            const poStatusIcon = poStatus === 'received' ? '🟢' : '⚪';

            html += `
                <details class="po-section" open>
                    <summary class="po-header">
                        <span class="icon">📋</span>
                        <span>PO ${escapeHtml(po.po_number || '')} - ${escapeHtml(po.po_period_label || '')}</span>
                        <span class="badge">${poStatusIcon} PO: ${escapeHtml(poStatus)}</span>
                        <span class="po-period">(${formatDate(po.po_period_start_date)} - ${formatDate(po.po_period_end_date)})</span>
                        <span class="count">[${poMappings.length} Total, ${activeMappings.length} Active, ${endedMappings.length} Ended]</span>
                    </summary>
                    <div class="po-content">
            `;

            // Show active mappings
            if (activeMappings.length > 0) {
                html += `
                        <div class="mapping-group active-mappings">
                            <div class="group-header">✅ ACTIVE MAPPINGS (${activeMappings.length}):</div>
                `;
                activeMappings.forEach(mapping => {
                    html += generateResourceHTML(mapping, resourcesById, true);
                });
                html += `</div>`;
            }

            // Show ended mappings
            if (endedMappings.length > 0) {
                html += `
                        <div class="mapping-group ended-mappings">
                            <div class="group-header">🔴 ENDED MAPPINGS (${endedMappings.length}):</div>
                `;
                endedMappings.forEach(mapping => {
                    html += generateResourceHTML(mapping, resourcesById, false);
                });
                html += `</div>`;
            }

            if (poMappings.length === 0) {
                html += `<div class="no-mappings">No resources mapped to this PO</div>`;
            }

            html += `
                    </div>
                </details>
            `;
        });

        html += `</details>`;
    });

    document.getElementById('hierarchy-content').innerHTML = html;
}

// ============================================
// Forecasts Tab
// ============================================
function renderForecastsTab() {
    const summaryHtml = `
        <p><strong>Total Forecasts: ${state.forecasts.length}</strong></p>
    `;
    document.getElementById('forecasts-summary').innerHTML = summaryHtml;

    const tbody = document.querySelector('#forecasts-table tbody');
    tbody.innerHTML = '';

    if (state.forecasts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #999;">No forecasts available</td></tr>';
        return;
    }

    const sortedForecasts = [...state.forecasts].sort((a, b) => {
        return new Date(b.created_at) - new Date(a.created_at);
    });

    sortedForecasts.forEach(forecast => {
        const createdDate = new Date(forecast.created_at).toLocaleDateString('en-GB');
        const totalCost = forecast.forecast_data?.total_cost || 0;

        const row = `
            <tr>
                <td>${createdDate}</td>
                <td>${escapeHtml(forecast.customer_name || '')}</td>
                <td>${escapeHtml(forecast.period_start_date || '')} - ${escapeHtml(forecast.period_end_date || '')}</td>
                <td>${formatCurrency(totalCost)}</td>
                <td><button onclick="viewForecastDetails('${forecast.forecast_id}')">View</button></td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

function viewForecastDetails(forecastId) {
    const forecast = state.forecasts.find(f => f.forecast_id === forecastId);
    if (!forecast) return;

    const report = forecast.forecast_data?.text_report || 'No report available';
    alert(report);
}

// ============================================
// Audit Tab
// ============================================
function renderAuditTab() {
    // Filter last 7 days
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const recentAudits = state.auditRecords.filter(a => {
        try {
            if (!a.timestamp) return false;
            // Handle ISO format: "2025-11-12T04:05:28.123Z" or "2025-11-12T04:05:28"
            const timestamp = new Date(a.timestamp.replace('Z', '+00:00'));
            if (isNaN(timestamp.getTime())) return false;
            return timestamp > weekAgo;
        } catch (e) {
            console.error('Audit timestamp parse error:', a.timestamp, e);
            return false;
        }
    }).sort((a, b) => {
        try {
            return new Date(b.timestamp) - new Date(a.timestamp);
        } catch {
            return 0;
        }
    }).slice(0, 50);

    const summaryHtml = `
        <p><strong>Total Changes: ${recentAudits.length}</strong></p>
        <p>Shows what changed in the last week so you can track updates</p>
    `;
    document.getElementById('audit-summary').innerHTML = summaryHtml;

    const tbody = document.querySelector('#audit-table tbody');
    tbody.innerHTML = '';

    if (recentAudits.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #999; font-style: italic;">No changes recorded in the last 7 days</td></tr>';
        return;
    }

    recentAudits.forEach(audit => {
        try {
            const dt = new Date(audit.timestamp);
            const dateStr = dt.toLocaleString('en-GB');

            const formatValue = (val) => {
                if (!val || val === 'null') return '<em>empty</em>';
                const str = String(val);
                return str.length > 50 ? str.substring(0, 50) + '...' : str;
            };

            const row = `
                <tr>
                    <td style="white-space: nowrap;">${escapeHtml(dateStr)}</td>
                    <td>${escapeHtml(audit.table_name || '')}</td>
                    <td>${escapeHtml(audit.operation || '')}</td>
                    <td>${escapeHtml(audit.field_name || '')}</td>
                    <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(formatValue(audit.old_value))}</td>
                    <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(formatValue(audit.new_value))}</td>
                </tr>
            `;
            tbody.innerHTML += row;
        } catch (e) {
            console.error('Error rendering audit row:', e);
        }
    });
}

// ============================================
// Tab Navigation
// ============================================
function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.dataset.tab;

            // Remove active class from all tabs
            tabButtons.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            // Add active class to clicked tab
            btn.classList.add('active');
            document.getElementById(`${targetTab}-tab`).classList.add('active');
        });
    });
}

// ============================================
// Initialization
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    // Setup login
    document.getElementById('login-form').addEventListener('submit', handleLogin);

    // Setup refresh button
    document.getElementById('refresh-btn').addEventListener('click', loadAllData);

    // Setup tabs
    setupTabs();

    // Hide loading initially
    hideLoading();
});
