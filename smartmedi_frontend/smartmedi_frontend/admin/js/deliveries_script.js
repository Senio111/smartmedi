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
    'delivered': 'success',
    'in_transit': 'primary',
    'pending': 'warning',
    'failed': 'danger',
    'scheduled': 'info'
  };
  
  const badgeClass = statusMap[status.toLowerCase()] || 'secondary';
  return `<span class="badge bg-${badgeClass}">${status}</span>`;
}

function formatDate(dateString) {
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString(undefined, options);
}

function loadDeliveriesData(skip = 0, limit = 100) {
  document.getElementById('lastUpdated').textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
  
  $.ajax({
    url: `http://127.0.0.1:8001/api/v1/deliveries/?skip=${skip}&limit=${limit}`,
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      'accept': 'application/json'
    },
    success: function (data) {
      updateDeliveriesTable(data);
    },
    error: function (xhr) {
      let errorMsg = "Failed to load deliveries data.";
      if (xhr.status === 401) {
        errorMsg = "Session expired. Please login again.";
        logout();
      }
      alert(errorMsg);
    }
  });
}

function updateDeliveriesTable(deliveries) {
  const table = $("#deliveriesTable");
  table.empty();

  if (deliveries.length === 0) {
    table.append("<tr><td colspan='7' class='text-center py-4'>No deliveries found</td></tr>");
  } else {
    deliveries.forEach(delivery => {
      const row = `<tr>
        <td>${delivery.id}</td>
        <td>${delivery.order_id}</td>
        <td>${delivery.order.customer.name}</td>
        <td>${delivery.delivery_address}</td>
        <td>${formatDate(delivery.delivery_date)}</td>
        <td>${getStatusBadge(delivery.status)}</td>
        <td>
          <a href="delivery_detail.html?id=${delivery.id}" class="btn btn-sm btn-outline-primary view-delivery">
            <i class="bi bi-eye"></i> View
          </a>
        </td>
      </tr>`;
      table.append(row);
    });
  }
}

$(document).ready(function () {
  loadDeliveriesData();
  $('#refreshDeliveries').click(function() {
    loadDeliveriesData();
  });
  
  setInterval(loadDeliveriesData, 30000);
});