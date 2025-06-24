// Authentication and basic functions
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

function getStatusClass(status) {
  if (!status) return '';
  switch(status.toLowerCase()) {
    case 'delivered': return 'status-delivered';
    case 'in_transit': return 'status-in_transit';
    case 'pending': return 'status-pending';
    case 'failed': return 'status-failed';
    default: return '';
  }
}

function getComplianceBadge(report) {
  if (!report.temperature_logs || !report.digital_signature) {
    return '<span class="badge bg-warning text-dark compliance-badge">Non-Compliant</span>';
  }
  return '<span class="badge bg-success compliance-badge">Compliant</span>';
}

// Main data loading functions
function loadComplianceData() {
  document.getElementById('lastUpdated').textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
  
  $.ajax({
    url: 'http://127.0.0.1:8001/api/v1/compliance/report',
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      'accept': 'application/json'
    },
    success: function (data) {
      updateComplianceTable(data);
    },
    error: function (xhr) {
      let errorMsg = "Failed to load compliance data.";
      if (xhr.status === 401) {
        errorMsg = "Session expired. Please login again.";
        logout();
      }
      showAlert(errorMsg, 'danger');
    }
  });
}

function updateComplianceTable(reports) {
  const table = $("#complianceTable");
  table.empty();

  if (reports.length === 0) {
    table.append("<tr><td colspan='7' class='text-center py-4'>No compliance reports found</td></tr>");
    return;
  }

  reports.forEach(report => {
    const statusClass = getStatusClass(report.status);
    const row = `<tr>
      <td>${report.order_id}</td>
      <td>${report.order?.customer?.name || 'N/A'}</td>
      <td>${report.delivery_address.substring(0, 30)}${report.delivery_address.length > 30 ? '...' : ''}</td>
      <td>${report.delivery_date}</td>
      <td><span class="${statusClass}">${report.status || 'N/A'}</span></td>
      <td>${getComplianceBadge(report)}</td>
      <td class="action-buttons">
        <button class="btn btn-sm btn-outline-primary view-compliance me-1" data-id="${report.id}">
          <i class="bi bi-eye"></i> View
        </button>
      </td>
    </tr>`;
    table.append(row);
  });

  // Set up event handlers
  $('.view-compliance').click(function() {
    const reportId = $(this).data('id');
    viewComplianceDetails(reportId);
  });
}

// View compliance details
let temperatureChart = null;

function viewComplianceDetails(reportId) {
  $.ajax({
    url: `http://127.0.0.1:8001/api/v1/compliance/report/${reportId}`,
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      'accept': 'application/json'
    },
    success: function (data) {
      // Update modal fields
      $('#viewOrderId').text(data.order_id);
      $('#viewCustomerName').text(data.order?.customer?.name || 'N/A');
      $('#viewDeliveryAddress').text(data.delivery_address);
      $('#viewDeliveryDate').text(data.delivery_date);
      $('#viewStatus').text(data.status);
      $('#viewUpdatedAt').text(formatDate(data.updated_at));
      $('#viewDigitalSignature').text(data.digital_signature || 'Not available');

      // Update temperature logs
      const logsTable = $('#temperatureLogsTable tbody');
      logsTable.empty();
      
      if (data.temperature_logs && data.temperature_logs.length > 0) {
        data.temperature_logs.forEach(log => {
          logsTable.append(`<tr>
            <td>${formatDate(log.timestamp)}</td>
            <td>${log.temperature}°C</td>
          </tr>`);
        });
        renderTemperatureChart(data.temperature_logs);
      } else {
        logsTable.append('<tr><td colspan="2" class="text-center py-3">No temperature logs available</td></tr>');
        if (temperatureChart) {
          temperatureChart.destroy();
        }
        $('#temperatureChart').html('<p class="text-center py-4 text-muted">No temperature data available</p>');
      }

      // Show modal
      $('#viewComplianceModal').modal('show');
    },
    error: function (xhr) {
      let errorMsg = "Failed to load compliance report details.";
      if (xhr.status === 401) {
        errorMsg = "Session expired. Please login again.";
        logout();
      } else if (xhr.responseJSON && xhr.responseJSON.detail) {
        errorMsg = xhr.responseJSON.detail;
      }
      showAlert(errorMsg, 'danger');
    }
  });
}

function renderTemperatureChart(temperatureLogs) {
  const ctx = document.getElementById('temperatureChart');
  
  // Destroy previous chart if exists
  if (temperatureChart) {
    temperatureChart.destroy();
  }
  
  // Prepare data for chart
  const labels = temperatureLogs.map(log => formatDate(log.timestamp));
  const data = temperatureLogs.map(log => log.temperature);
  
  // Create new chart
  temperatureChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Temperature (°C)',
        data: data,
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1,
        fill: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: false,
          suggestedMin: Math.min(...data) - 1,
          suggestedMax: Math.max(...data) + 1
        }
      }
    }
  });
}

// PDF Generation
function generatePdfReport() {
  $('#generatePdfReport').prop('disabled', true).html('<span class="spinner-border spinner-border-sm"></span> Generating...');
  
  $.ajax({
    url: 'http://127.0.0.1:8001/api/v1/compliance/report/pdf',
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      'accept': 'application/json'
    },
    xhrFields: {
      responseType: 'blob'
    },
    success: function (data) {
      const blob = new Blob([data], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `compliance_report_${new Date().toISOString().split('T')[0]}.pdf`;
      link.click();
      showAlert('PDF report generated successfully', 'success');
    },
    error: function (xhr) {
      let errorMsg = "Failed to generate PDF report.";
      if (xhr.status === 401) {
        errorMsg = "Session expired. Please login again.";
        logout();
      }
      showAlert(errorMsg, 'danger');
    },
    complete: function() {
      $('#generatePdfReport').prop('disabled', false).html('<i class="bi bi-file-earmark-pdf"></i> Generate PDF Report');
    }
  });
}

// Utility functions
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

// Event listeners
$(document).ready(function () {
  loadComplianceData();
  
  $('#refreshCompliance').click(function() {
    loadComplianceData();
  });
  
  $('#generatePdfReport').click(generatePdfReport);
  
  setInterval(() => loadComplianceData(), 30000);
  
  // Clean up chart when modal is closed
  $('#viewComplianceModal').on('hidden.bs.modal', function () {
    if (temperatureChart) {
      temperatureChart.destroy();
      temperatureChart = null;
    }
  });
});