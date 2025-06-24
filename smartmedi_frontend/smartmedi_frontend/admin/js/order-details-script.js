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

function loadOrderDetails() {
  // Get order ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get('id');
  
  if (!orderId) {
    alert('No order ID specified');
    window.location.href = 'orders.html';
    return;
  }

  // Show loading state
  $('#orderId').text(`#${orderId} (Loading...)`);
  
  $.ajax({
    url: `http://127.0.0.1:8001/api/v1/orders/${orderId}`,
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      'accept': 'application/json'
    },
    success: function (data) {
      updateOrderDetails(data);
    },
    error: function (xhr) {
      let errorMsg = "Failed to load order details.";
      if (xhr.status === 401) {
        errorMsg = "Session expired. Please login again.";
        logout();
      } else if (xhr.status === 404) {
        errorMsg = "Order not found.";
      }
      
      $('#orderId').text(`${orderId}`);
      $('#orderStatusBadge').removeClass().addClass('status-badge badge bg-danger').text('Error');
      
      alert(errorMsg);
      window.location.href = 'orders.html';
    }
  });
}

function updateOrderDetails(order) {

  $('#orderId').text(`${order.id}`);
  $('#orderDate').text(formatDate(order.order_date));
  
  // Update status badge
  const statusBadgeClass = getStatusBadge(order.status);
  $('#orderStatusBadge').removeClass().addClass('status-badge badge ' + statusBadgeClass).text(order.status);
  
  // Update customer information
  $('#customerName').text(order.customer.name);
  $('#customerEmail').text(order.customer.email);
  $('#customerPhone').text(order.customer.phone);
  $('#customerId').text(order.customer.id);
  $('#customerAddress').text(order.customer.address);
  
  // Update order information
  $('#orderDateFull').text(formatDate(order.order_date));
  $('#orderStatus').text(order.status);
  $('#orderCustomerId').text(order.customer_id);
  
  // Update last updated time
  $('#lastUpdated').text(`Last updated: ${new Date().toLocaleTimeString()}`);
  
}

$(document).ready(function () {
  loadOrderDetails();
  setInterval(loadOrderDetails, 30000);
});