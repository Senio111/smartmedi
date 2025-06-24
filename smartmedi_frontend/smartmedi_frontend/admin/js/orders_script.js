const token = localStorage.getItem("access_token");

if (!token) {
  window.location.href = "login.html";
}

function logout() {
  localStorage.removeItem("access_token");
  window.location.href = "login.html";
}

function getStatusBadge(status) {
  const statusMap = {
    'completed': 'success',
    'pending': 'warning',
    'processing': 'primary',
    'cancelled': 'danger',
    'shipped': 'info'
  };
  
  const badgeClass = statusMap[status.toLowerCase()] || 'secondary';
  return `<span class="badge bg-${badgeClass}">${status}</span>`;
}

function formatDate(dateString) {
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString(undefined, options);
}

function loadOrdersData(skip = 0, limit = 100) {
  document.getElementById('lastUpdated').textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
  
  $.ajax({
    url: `http://127.0.0.1:8001/api/v1/orders/?skip=${skip}&limit=${limit}`,
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      'accept': 'application/json'
    },
    success: function (data) {
      updateOrdersTable(data);
    },
    error: function (xhr) {
      let errorMsg = "Failed to load orders data.";
      if (xhr.status === 401) {
        errorMsg = "Session expired. Please login again.";
        logout();
      }
      alert(errorMsg);
    }
  });
}

function updateOrdersTable(orders) {
  const table = $("#ordersTable");
  table.empty();

  if (orders.length === 0) {
    table.append("<tr><td colspan='6' class='text-center py-4'>No orders found</td></tr>");
  } else {
    orders.forEach(order => {
      const row = `<tr>
        <td>${order.id}</td>
        <td>${order.customer.name}</td>
        <td>${order.customer.email}</td>
        <td>${order.customer.phone}</td>
        <td>${formatDate(order.order_date)}</td>
        <td>${getStatusBadge(order.status)}</td>
        <td>
  <a href="order_detail.html?id=${order.id}" class="btn btn-sm btn-outline-primary view-order">
    <i class="bi bi-eye"></i> View
  </a>
</td>
      </tr>`;
      table.append(row);
    });
  }
 
}

$(document).ready(function () {
  loadOrdersData();
  $('#refreshOrders').click(function() {
    loadOrdersData();
  });
  
  setInterval(loadOrdersData, 30000);
});