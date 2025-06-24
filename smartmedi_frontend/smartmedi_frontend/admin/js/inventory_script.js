const token = localStorage.getItem("access_token");
const LOW_STOCK_THRESHOLD = 50; // Define your low stock threshold

if (!token) {
  window.location.href = "login.html";
}

function logout() {
  localStorage.removeItem("access_token");
  window.location.href = "login.html";
}

function formatDate(dateString) {
  const options = { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  return new Date(dateString).toLocaleDateString(undefined, options);
}

function formatShortDate(dateString) {
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString(undefined, options);
}

function getItemStatus(item) {
  const today = new Date();
  const expiry = new Date(item.expiry_date);
  const diffTime = expiry - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  const status = {};
  
  if (diffDays < 0) status.expired = true;
  else if (diffDays <= 30) status.expirySoon = true;
  
  if (item.quantity < LOW_STOCK_THRESHOLD) status.lowStock = true;
  
  return status;
}

function loadInventoryData(filter = 'all') {
  document.getElementById('lastUpdated').textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
  
  $.ajax({
    url: 'http://127.0.0.1:8001/api/v1/inventory/',
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      'accept': 'application/json'
    },
    success: function (data) {
      updateInventoryTable(data, filter);
    },
    error: function (xhr) {
      let errorMsg = "Failed to load inventory data.";
      if (xhr.status === 401) {
        errorMsg = "Session expired. Please login again.";
        logout();
      }
      showAlert(errorMsg, 'danger');
    }
  });
}

function updateInventoryTable(inventory, filter = 'all') {
  const table = $("#inventoryTable");
  table.empty();

  if (inventory.length === 0) {
    table.append("<tr><td colspan='6' class='text-center py-4'>No inventory items found</td></tr>");
    return;
  }

  let filteredItems = inventory;
  
  // Apply filters
  if (filter === 'expired') {
    filteredItems = inventory.filter(item => {
      const status = getItemStatus(item);
      return status.expired;
    });
  } else if (filter === 'expiring') {
    filteredItems = inventory.filter(item => {
      const status = getItemStatus(item);
      return status.expirySoon && !status.expired;
    });
  } else if (filter === 'lowstock') {
    filteredItems = inventory.filter(item => {
      const status = getItemStatus(item);
      return status.lowStock;
    });
  }

  if (filteredItems.length === 0) {
    table.append(`<tr><td colspan='6' class='text-center py-4'>No ${filter} items found</td></tr>`);
    return;
  }

  filteredItems.forEach(item => {
    const status = getItemStatus(item);
    const rowClass = [
      status.expired ? 'expired' : '',
      status.expirySoon ? 'expiry-soon' : '',
      status.lowStock ? 'low-stock' : ''
    ].filter(Boolean).join(' ');

    const row = `<tr class="${rowClass}">
      <td>${item.product_name}</td>
      <td>${item.quantity}</td>
      <td>${item.location}</td>
      <td>${formatShortDate(item.expiry_date)}</td>
      <td>${formatDate(item.last_updated)}</td>
      <td class="action-buttons">
        <button class="btn btn-sm btn-outline-primary edit-inventory me-1" data-id="${item.id}">
          <i class="bi bi-pencil"></i>
        </button>
        <button class="btn btn-sm btn-outline-danger delete-inventory" data-id="${item.id}" data-name="${item.product_name}">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    </tr>`;
    table.append(row);
  });

  // Set up event handlers
  $('.edit-inventory').click(function() {
    const itemId = $(this).data('id');
    editInventoryItem(itemId);
  });

  $('.delete-inventory').click(function() {
    const itemId = $(this).data('id');
    const itemName = $(this).data('name');
    confirmDeleteItem(itemId, itemName);
  });
}

function createInventoryItem() {
  const productName = $('#productName').val();
  const quantity = $('#quantity').val();
  const location = $('#location').val();
  const expiryDate = $('#expiryDate').val();

  if (!productName || !quantity || !location || !expiryDate) {
    showAlert('Please fill in all required fields', 'warning');
    return;
  }

  $('#createSpinner').removeClass('d-none');
  $('#saveInventoryItem').prop('disabled', true);

  $.ajax({
    url: 'http://127.0.0.1:8001/api/v1/inventory/',
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      'accept': 'application/json',
      'Content-Type': 'application/json'
    },
    data: JSON.stringify({
      product_name: productName,
      quantity: parseInt(quantity),
      location: location,
      expiry_date: expiryDate
    }),
    success: function () {
      $('#createInventoryModal').modal('hide');
      $('#createInventoryForm')[0].reset();
      loadInventoryData();
      showAlert('Inventory item created successfully', 'success');
    },
    error: function (xhr) {
      let errorMsg = "Failed to create inventory item.";
      if (xhr.status === 401) {
        errorMsg = "Session expired. Please login again.";
        logout();
      } else if (xhr.responseJSON && xhr.responseJSON.detail) {
        errorMsg = xhr.responseJSON.detail;
      }
      showAlert(errorMsg, 'danger');
    },
    complete: function() {
      $('#createSpinner').addClass('d-none');
      $('#saveInventoryItem').prop('disabled', false);
    }
  });
}

function editInventoryItem(itemId) {
  $.ajax({
    url: `http://127.0.0.1:8001/api/v1/inventory/${itemId}`,
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      'accept': 'application/json'
    },
    success: function (data) {
      $('#editItemId').val(data.id);
      $('#editProductName').val(data.product_name);
      $('#editQuantity').val(data.quantity);
      $('#editLocation').val(data.location);
      $('#editExpiryDate').val(data.expiry_date);
      $('#editInventoryModal').modal('show');
    },
    error: function (xhr) {
      let errorMsg = "Failed to load inventory item.";
      if (xhr.status === 401) {
        errorMsg = "Session expired. Please login again.";
        logout();
      }
      showAlert(errorMsg, 'danger');
    }
  });
}

function updateInventoryItem() {
  const itemId = $('#editItemId').val();
  const productName = $('#editProductName').val();
  const quantity = $('#editQuantity').val();
  const location = $('#editLocation').val();
  const expiryDate = $('#editExpiryDate').val();

  if (!productName || !quantity || !location || !expiryDate) {
    showAlert('Please fill in all required fields', 'warning');
    return;
  }

  $('#updateSpinner').removeClass('d-none');
  $('#updateInventoryItem').prop('disabled', true);

  $.ajax({
    url: `http://127.0.0.1:8001/api/v1/inventory/${itemId}`,
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      'accept': 'application/json',
      'Content-Type': 'application/json'
    },
    data: JSON.stringify({
      product_name: productName,
      quantity: parseInt(quantity),
      location: location,
      expiry_date: expiryDate
    }),
    success: function () {
      $('#editInventoryModal').modal('hide');
      loadInventoryData();
      showAlert('Inventory item updated successfully', 'success');
    },
    error: function (xhr) {
      let errorMsg = "Failed to update inventory item.";
      if (xhr.status === 401) {
        errorMsg = "Session expired. Please login again.";
        logout();
      } else if (xhr.responseJSON && xhr.responseJSON.detail) {
        errorMsg = xhr.responseJSON.detail;
      }
      showAlert(errorMsg, 'danger');
    },
    complete: function() {
      $('#updateSpinner').addClass('d-none');
      $('#updateInventoryItem').prop('disabled', false);
    }
  });
}

function confirmDeleteItem(itemId, itemName) {
  $('#itemToDelete').text(itemName);
  $('#deleteInventoryModal').data('id', itemId).modal('show');
}

function deleteInventoryItem() {
  const itemId = $('#deleteInventoryModal').data('id');

  $('#deleteSpinner').removeClass('d-none');
  $('#confirmDeleteItem').prop('disabled', true);

  $.ajax({
    url: `http://127.0.0.1:8001/api/v1/inventory/${itemId}`,
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      'accept': 'application/json'
    },
    success: function () {
      $('#deleteInventoryModal').modal('hide');
      loadInventoryData();
      showAlert('Inventory item deleted successfully', 'success');
    },
    error: function (xhr) {
      let errorMsg = "Failed to delete inventory item.";
      if (xhr.status === 401) {
        errorMsg = "Session expired. Please login again.";
        logout();
      } else if (xhr.responseJSON && xhr.responseJSON.detail) {
        errorMsg = xhr.responseJSON.detail;
      }
      showAlert(errorMsg, 'danger');
    },
    complete: function() {
      $('#deleteSpinner').addClass('d-none');
      $('#confirmDeleteItem').prop('disabled', false);
    }
  });
}

function showAlert(message, type) {
  const alert = $(`
    <div class="alert alert-${type} alert-dismissible fade show position-fixed top-0 end-0 m-3" role="alert">
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>
  `);
  $('body').append(alert);
  setTimeout(() => alert.alert('close'), 5000);
}

$(document).ready(function () {
  loadInventoryData();
  
  $('#refreshInventory').click(function() {
    loadInventoryData();
  });
  
  $('#saveInventoryItem').click(createInventoryItem);
  $('#updateInventoryItem').click(updateInventoryItem);
  $('#confirmDeleteItem').click(deleteInventoryItem);
  
  // Filter handlers
  $('.filter-all').click(function(e) {
    e.preventDefault();
    loadInventoryData('all');
  });
  
  $('.filter-expired').click(function(e) {
    e.preventDefault();
    loadInventoryData('expired');
  });
  
  $('.filter-expiring').click(function(e) {
    e.preventDefault();
    loadInventoryData('expiring');
  });
  
  $('.filter-lowstock').click(function(e) {
    e.preventDefault();
    loadInventoryData('lowstock');
  });
  
  setInterval(() => loadInventoryData(), 30000);
});