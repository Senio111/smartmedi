const token = localStorage.getItem("access_token");

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

function loadCustomersData() {
  document.getElementById('lastUpdated').textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
  
  $.ajax({
    url: 'http://127.0.0.1:8001/api/v1/customers/?skip=0&limit=100',
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      'accept': 'application/json'
    },
    success: function (data) {
      updateCustomersTable(data);
    },
    error: function (xhr) {
      let errorMsg = "Failed to load customers data.";
      if (xhr.status === 401) {
        errorMsg = "Session expired. Please login again.";
        logout();
      }
      showAlert(errorMsg, 'danger');
    }
  });
}

function updateCustomersTable(customers) {
  const table = $("#customersTable");
  table.empty();

  if (customers.length === 0) {
    table.append("<tr><td colspan='5' class='text-center py-4'>No customers found</td></tr>");
    return;
  }

  customers.forEach(customer => {
    const row = `<tr>
      <td>${customer.name}</td>
      <td>${customer.email}</td>
      <td>${customer.phone}</td>
      <td>${customer.address.substring(0, 30)}${customer.address.length > 30 ? '...' : ''}</td>
      <td class="action-buttons">
        <button class="btn btn-sm btn-outline-primary view-customer me-1" data-id="${customer.id}">
          <i class="bi bi-eye"></i> View
        </button>
        <button class="btn btn-sm btn-outline-danger delete-customer" data-id="${customer.id}" data-name="${customer.name}">
          <i class="bi bi-trash"></i> Delete
        </button>
      </td>
    </tr>`;
    table.append(row);
  });

  // Set up event handlers
  $('.view-customer').click(function() {
    const customerId = $(this).data('id');
    viewCustomerDetails(customerId);
  });

  $('.delete-customer').click(function() {
    const customerId = $(this).data('id');
    const customerName = $(this).data('name');
    confirmDeleteCustomer(customerId, customerName);
  });
}

function viewCustomerDetails(customerId) {
  $.ajax({
    url: `http://127.0.0.1:8001/api/v1/customers/${customerId}`,
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      'accept': 'application/json'
    },
    success: function (data) {
      $('#viewCustomerName').text(data.name);
      $('#viewCustomerEmail').text(data.email);
      $('#viewCustomerPhone').text(data.phone);
      $('#viewCustomerId').text(data.id);
      $('#viewCustomerAddress').text(data.address);
      $('#viewCustomerModal').modal('show');
    },
    error: function (xhr) {
      let errorMsg = "Failed to load customer details.";
      if (xhr.status === 401) {
        errorMsg = "Session expired. Please login again.";
        logout();
      }
      showAlert(errorMsg, 'danger');
    }
  });
}

function confirmDeleteCustomer(customerId, customerName) {
  $('#customerToDelete').text(customerName);
  $('#deleteCustomerModal').data('id', customerId).modal('show');
}

function deleteCustomer() {
  const customerId = $('#deleteCustomerModal').data('id');

  $('#deleteSpinner').removeClass('d-none');
  $('#confirmDeleteCustomer').prop('disabled', true);

  $.ajax({
    url: `http://127.0.0.1:8001/api/v1/customers/${customerId}`,
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      'accept': 'application/json'
    },
    success: function () {
      $('#deleteCustomerModal').modal('hide');
      loadCustomersData();
      showAlert('Customer deleted successfully', 'success');
    },
    error: function (xhr) {
      let errorMsg = "Failed to delete customer.";
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
      $('#confirmDeleteCustomer').prop('disabled', false);
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
  loadCustomersData();
  
  $('#refreshCustomers').click(function() {
    loadCustomersData();
  });
  
  $('#confirmDeleteCustomer').click(deleteCustomer);
  
  setInterval(() => loadCustomersData(), 30000);
});