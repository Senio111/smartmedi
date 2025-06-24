const token = localStorage.getItem("access_token");

    if (!token) {
      window.location.href = "login.html";
    }

    function logout() {
      localStorage.removeItem("access_token");
      window.location.href = "login.html";
    }

    function formatDate(dateString) {
      if (!dateString) return 'N/A';
      const options = { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      };
      return new Date(dateString).toLocaleDateString(undefined, options);
    }

    function formatCurrency(amount) {
      return new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: 'USD' 
      }).format(amount / 100); // Assuming amount is in cents
    }

    function getStatusClass(status) {
      switch(status.toLowerCase()) {
        case 'paid': return 'status-paid';
        case 'pending': return 'status-pending';
        case 'failed': return 'status-failed';
        default: return '';
      }
    }

    function loadPaymentsData() {
      document.getElementById('lastUpdated').textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
      
      $.ajax({
        url: 'http://127.0.0.1:8001/api/v1/payments/?skip=0&limit=100',
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          'accept': 'application/json'
        },
        success: function (data) {
          updatePaymentsTable(data);
        },
        error: function (xhr) {
          let errorMsg = "Failed to load payments data.";
          if (xhr.status === 401) {
            errorMsg = "Session expired. Please login again.";
            logout();
          }
          showAlert(errorMsg, 'danger');
        }
      });
    }

    function updatePaymentsTable(payments) {
      const table = $("#paymentsTable");
      table.empty();

      if (payments.length === 0) {
        table.append("<tr><td colspan='7' class='text-center py-4'>No payments found</td></tr>");
        return;
      }

      payments.forEach(payment => {
        const statusClass = getStatusClass(payment.status);
        const row = `<tr>
          <td>${payment.order_id}</td>
          <td>${payment.amount}</td>
          <td>${payment.payment_method}</td>
          <td><span class="${statusClass}">${payment.status}</span></td>
          <td>${payment.transaction_ref || 'N/A'}</td>
          <td>${formatDate(payment.paid_at)}</td>
          <td class="action-buttons">
            <button class="btn btn-sm btn-outline-primary view-payment me-1" data-id="${payment.id}">
              <i class="bi bi-eye"></i> View
            </button>
            <button class="btn btn-sm btn-outline-danger delete-payment" data-id="${payment.id}" data-order="${payment.order_id}">
              <i class="bi bi-trash"></i> Delete
            </button>
          </td>
        </tr>`;
        table.append(row);
      });

      // Set up event handlers
      $('.view-payment').click(function() {
        const paymentId = $(this).data('id');
        viewPaymentDetails(paymentId);
      });

      $('.delete-payment').click(function() {
        const paymentId = $(this).data('id');
        const orderId = $(this).data('order');
        confirmDeletePayment(paymentId, orderId);
      });
    }

    function viewPaymentDetails(paymentId) {
      $.ajax({
        url: `http://127.0.0.1:8001/api/v1/payments/${paymentId}`,
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          'accept': 'application/json'
        },
        success: function (data) {
          $('#viewPaymentOrderId').text(data.order_id);
          $('#viewPaymentAmount').text(formatCurrency(data.amount));
          $('#viewPaymentMethod').text(data.payment_method);
          $('#viewPaymentStatus').text(data.status);
          $('#viewPaymentRef').text(data.transaction_ref || 'N/A');
          $('#viewPaymentPaidAt').text(formatDate(data.paid_at));
          $('#viewPaymentModal').modal('show');
        },
        error: function (xhr) {
          let errorMsg = "Failed to load payment details.";
          if (xhr.status === 401) {
            errorMsg = "Session expired. Please login again.";
            logout();
          }
          showAlert(errorMsg, 'danger');
        }
      });
    }

    function confirmDeletePayment(paymentId, orderId) {
      $('#paymentToDelete').text(`Order ID: ${orderId}`);
      $('#deletePaymentModal').data('id', paymentId).modal('show');
    }

    function deletePayment() {
      const paymentId = $('#deletePaymentModal').data('id');

      $('#deleteSpinner').removeClass('d-none');
      $('#confirmDeletePayment').prop('disabled', true);

      $.ajax({
        url: `http://127.0.0.1:8001/api/v1/payments/${paymentId}`,
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          'accept': 'application/json'
        },
        success: function () {
          $('#deletePaymentModal').modal('hide');
          loadPaymentsData();
          showAlert('Payment deleted successfully', 'success');
        },
        error: function (xhr) {
          let errorMsg = "Failed to delete payment.";
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
          $('#confirmDeletePayment').prop('disabled', false);
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
      loadPaymentsData();
      
      $('#refreshPayments').click(function() {
        loadPaymentsData();
      });
      
      $('#confirmDeletePayment').click(deletePayment);
      
      setInterval(() => loadPaymentsData(), 30000);
    });