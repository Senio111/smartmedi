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
  return `bg-${badgeClass}`;
}

function formatDate(dateString) {
  const options = { 
    year: 'numeric', 
    month: 'long', 
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

function loadDeliveryDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const deliveryId = urlParams.get('id');
  
  if (!deliveryId) {
    alert('No delivery ID specified');
    window.location.href = 'deliveries.html';
    return;
  }

  $('#deliveryId').text(`${deliveryId} (Loading...)`);
  
  $.ajax({
    url: `http://127.0.0.1:8001/api/v1/deliveries/${deliveryId}`,
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      'accept': 'application/json'
    },
    success: function (data) {
      updateDeliveryDetails(data);
    },
    error: function (xhr) {
      let errorMsg = "Failed to load delivery details.";
      if (xhr.status === 401) {
        errorMsg = "Session expired. Please login again.";
        logout();
      } else if (xhr.status === 404) {
        errorMsg = "Delivery not found.";
      }
      
      $('#deliveryId').text(`${deliveryId}`);
      $('#deliveryStatusBadge').removeClass().addClass('status-badge badge bg-danger').text('Error');
      
      alert(errorMsg);
      window.location.href = 'deliveries.html';
    }
  });
}

function updateDeliveryDetails(delivery) {
  $('#deliveryId').text(delivery.id);
  $('#deliveryDate').text(formatShortDate(delivery.delivery_date));
  
  const statusBadgeClass = getStatusBadge(delivery.status);
  $('#deliveryStatusBadge').removeClass().addClass('status-badge badge ' + statusBadgeClass).text(delivery.status);
  
  $('#orderId').text(delivery.order_id);
  $('#deliveryDateFull').text(formatDate(delivery.delivery_date));
  $('#deliveryStatus').text(delivery.status);
  $('#lastUpdatedTime').text(formatDate(delivery.updated_at));
  $('#deliveryAddress').text(delivery.delivery_address);
  
  $('#customerName').text(delivery.order.customer.name);
  $('#customerEmail').text(delivery.order.customer.email);
  $('#customerPhone').text(delivery.order.customer.phone);
  $('#customerId').text(delivery.order.customer.id);
  $('#customerAddress').text(delivery.order.customer.address);
  
  if (delivery.temperature_logs && delivery.temperature_logs.length > 0) {
    let logsHTML = '';
    delivery.temperature_logs.forEach(log => {
      logsHTML += `
        <div class="temperature-log">
          <p><strong>${formatDate(log.timestamp)}</strong>: ${log.temperature}°C</p>
        </div>
      `;
    });
    $('#temperatureLogs').html(logsHTML);
  }
  
  if (delivery.digital_signature) {
    $('#digitalSignature').text(delivery.digital_signature);
  }
  
  $('#lastUpdated').text(`Last updated: ${new Date().toLocaleTimeString()}`);
}

$(document).ready(function () {
  loadDeliveryDetails();
  setInterval(loadDeliveryDetails, 30000);
});