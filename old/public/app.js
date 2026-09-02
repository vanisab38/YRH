const state = {
  workOrders: [],
  staff: [],
  categories: [],
  locations: [],
  view: 'table',
};

const el = (id) => document.getElementById(id);

async function api(path, options) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || res.statusText);
  }
  if (res.status === 204) return null;
  return res.json();
}

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));
}

function fillOptions(select, values, placeholder) {
  const current = select.value;
  select.innerHTML =
    `<option value="">${placeholder}</option>` +
    values.map((v) => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');
  select.value = current;
}

function fillDatalist(datalist, values) {
  datalist.innerHTML = values.map((v) => `<option value="${escapeHtml(v)}"></option>`).join('');
}

function renderAssigneeCheckboxes() {
  const fieldset = el('woAssignees');
  fieldset.innerHTML =
    '<legend>Assigned to</legend>' +
    state.staff
      .map(
        (s) => `
    <label class="checkbox">
      <input type="checkbox" value="${escapeHtml(s.name)}" />
      ${escapeHtml(s.name)}
    </label>`
      )
      .join('');
}

async function loadLookups() {
  const [staff, categories, locations] = await Promise.all([
    api('/api/staff'),
    api('/api/categories'),
    api('/api/locations'),
  ]);
  state.staff = staff;
  state.categories = categories;
  state.locations = locations;

  fillOptions(el('categoryFilter'), categories.map((c) => c.name), 'All categories');
  fillOptions(el('locationFilter'), locations.map((l) => l.label), 'All locations');
  fillOptions(el('staffFilter'), staff.map((s) => s.name), 'All staff');

  fillDatalist(el('categoryOptions'), categories.map((c) => c.name));
  fillDatalist(el('locationOptions'), locations.map((l) => l.label));

  renderAssigneeCheckboxes();
}

function currentFilters() {
  const params = new URLSearchParams();
  const q = el('searchInput').value.trim();
  const status = el('statusFilter').value;
  const category = el('categoryFilter').value;
  const location = el('locationFilter').value;
  const staff = el('staffFilter').value;
  if (q) params.set('q', q);
  if (status) params.set('status', status);
  if (category) params.set('category', category);
  if (location) params.set('location', location);
  if (staff) params.set('staff', staff);
  return params.toString();
}

async function loadWorkOrders() {
  const qs = currentFilters();
  state.workOrders = await api(`/api/work-orders${qs ? `?${qs}` : ''}`);
  render();
}

const STATUS_LABEL = { open: 'Open', in_progress: 'In Progress', done: 'Done' };

function render() {
  if (state.view === 'table') renderTable();
  else renderKanban();
}

function renderTable() {
  el('tableBody').innerHTML =
    state.workOrders
      .map(
        (wo) => `
    <tr>
      <td>${escapeHtml(wo.wo_number || '—')}</td>
      <td>${escapeHtml(wo.reported_date || '—')}</td>
      <td>${escapeHtml(wo.category_name || '—')}</td>
      <td>${escapeHtml(wo.location_label || '—')}</td>
      <td class="detail-cell">${escapeHtml(wo.detail)}</td>
      <td><span class="status-badge status-badge--${wo.status}">${STATUS_LABEL[wo.status]}</span></td>
      <td>${escapeHtml(wo.assignees || '—')}</td>
      <td class="row-actions">
        <button data-action="edit" data-id="${wo.id}">Edit</button>
        <button data-action="delete" data-id="${wo.id}">Delete</button>
      </td>
    </tr>`
      )
      .join('') || `<tr><td colspan="8" class="empty">No work orders match these filters.</td></tr>`;
}

function renderKanban() {
  for (const status of ['open', 'in_progress', 'done']) {
    const col = el(`col-${status}`);
    const items = state.workOrders.filter((wo) => wo.status === status);
    col.innerHTML =
      items
        .map(
          (wo) => `
      <div class="kanban-card">
        <div class="kanban-card__title">${escapeHtml(wo.detail)}</div>
        <div class="kanban-card__meta">${escapeHtml(wo.location_label || '')} · ${escapeHtml(wo.category_name || '')}</div>
        <div class="kanban-card__meta">${escapeHtml(wo.assignees || 'Unassigned')}</div>
        <div class="kanban-card__actions">
          <select data-action="move" data-id="${wo.id}">
            <option value="open" ${status === 'open' ? 'selected' : ''}>Open</option>
            <option value="in_progress" ${status === 'in_progress' ? 'selected' : ''}>In Progress</option>
            <option value="done" ${status === 'done' ? 'selected' : ''}>Done</option>
          </select>
          <button data-action="edit" data-id="${wo.id}">Edit</button>
        </div>
      </div>`
        )
        .join('') || '<p class="empty">Nothing here.</p>';
  }
}

function openDialog(wo) {
  el('dialogTitle').textContent = wo ? `Edit Work Order #${wo.id}` : 'New Work Order';
  el('woId').value = wo?.id || '';
  el('woNumber').value = wo?.wo_number || '';
  el('woDate').value = wo?.reported_date || '';
  el('woCategory').value = wo?.category_name || '';
  el('woLocation').value = wo?.location_label || '';
  el('woDetail').value = wo?.detail || '';
  el('woStatus').value = wo?.status || 'open';

  const assigned = new Set((wo?.assignees || '').split(',').map((s) => s.trim()).filter(Boolean));
  document.querySelectorAll('#woAssignees input[type=checkbox]').forEach((cb) => {
    cb.checked = assigned.has(cb.value);
  });

  el('workOrderDialog').showModal();
}

async function saveWorkOrder(e) {
  e.preventDefault();
  const id = el('woId').value;
  const payload = {
    wo_number: el('woNumber').value.trim() || null,
    reported_date: el('woDate').value || null,
    category: el('woCategory').value.trim(),
    location: el('woLocation').value.trim(),
    detail: el('woDetail').value.trim(),
    status: el('woStatus').value,
    assignees: Array.from(document.querySelectorAll('#woAssignees input[type=checkbox]:checked')).map(
      (cb) => cb.value
    ),
  };

  if (id) {
    await api(`/api/work-orders/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
  } else {
    await api('/api/work-orders', { method: 'POST', body: JSON.stringify(payload) });
  }

  el('workOrderDialog').close();
  await loadLookups();
  await loadWorkOrders();
}

async function handleActionClick(e) {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const id = btn.dataset.id;
  if (btn.dataset.action === 'edit') {
    const wo = state.workOrders.find((w) => String(w.id) === id);
    openDialog(wo);
  } else if (btn.dataset.action === 'delete') {
    if (confirm('Delete this work order?')) {
      await api(`/api/work-orders/${id}`, { method: 'DELETE' });
      await loadWorkOrders();
    }
  }
}

async function handleKanbanChange(e) {
  const select = e.target.closest('select[data-action="move"]');
  if (!select) return;
  await api(`/api/work-orders/${select.dataset.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: select.value }),
  });
  await loadWorkOrders();
}

function initViewToggle() {
  document.querySelectorAll('.view-toggle button').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.view = btn.dataset.view;
      document.querySelectorAll('.view-toggle button').forEach((b) => b.classList.toggle('active', b === btn));
      el('tableView').hidden = state.view !== 'table';
      el('kanbanView').hidden = state.view !== 'kanban';
      render();
    });
  });
}

function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

function init() {
  initViewToggle();
  el('tableBody').addEventListener('click', handleActionClick);
  el('kanbanView').addEventListener('click', handleActionClick);
  el('kanbanView').addEventListener('change', handleKanbanChange);
  el('newWorkOrderBtn').addEventListener('click', () => openDialog(null));
  el('cancelBtn').addEventListener('click', () => el('workOrderDialog').close());
  el('workOrderForm').addEventListener('submit', saveWorkOrder);
  [el('searchInput'), el('statusFilter'), el('categoryFilter'), el('locationFilter'), el('staffFilter')].forEach(
    (input) => input.addEventListener('input', debounce(loadWorkOrders, 250))
  );

  loadLookups().then(loadWorkOrders);
}

init();
