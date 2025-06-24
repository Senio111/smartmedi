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
      const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
      return new Date(dateString).toLocaleDateString(undefined, options);
    }

    function loadDashboardData() {
      // Update last updated time
      document.getElementById('lastUpdated').textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
      
      $.ajax({
        url: "http://127.0.0.1:8001/api/v1/dashboard/",
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        success: function (data) {
          updateDashboard(data);
        },
        error: function (xhr) {
          let errorMsg = "Failed to load dashboard data.";
          if (xhr.status === 401) {
            errorMsg = "Session expired. Please login again.";
            logout();
          }
          alert(errorMsg);
        }
      });
    }

    function updateDashboard(data) {
      const stats = data.stats;
      const orders = data.recent_orders;
      
      $("#totalCustomers").text(stats.total_customers.toLocaleString());
      $("#totalOrders").text(stats.total_orders.toLocaleString());
      $("#totalDeliveries").text(stats.total_deliveries.toLocaleString());
      $("#totalInventory").text(stats.total_inventory_items.toLocaleString());

      const table = $("#ordersTable");
      table.empty();

      if (orders.length === 0) {
        table.append("<tr><td colspan='5' class='text-center py-4'>No recent orders found</td></tr>");
      } else {
        orders.forEach(order => {
          const row = `<tr>
            <td><a href="#" class="text-primary">${order.id}</a></td>
            <td>${order.customer_name}</td>
            <td>${getStatusBadge(order.status)}</td>
            <td>${formatDate(order.created_at)}</td>
          </tr>`;
          table.append(row);
        });
      }
      $('.view-order').click(function() {
        const orderId = $(this).data('id');
        alert(`Viewing order ${orderId}`);
      });
    }

    $(document).ready(function () {
      // Initial load
      loadDashboardData();
      $('#refreshOrders').click(function() {
        loadDashboardData();
      });
      setInterval(loadDashboardData, 30000);
    });