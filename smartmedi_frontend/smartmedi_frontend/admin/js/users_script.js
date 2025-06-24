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

function getRoleClass(role) {
  const roleMap = {
    'admin': 'role-admin',
    'manager': 'role-manager',
    'staff': 'role-staff'
  };
  return roleMap[role.toLowerCase()] || '';
}

function togglePasswordVisibility(fieldId, toggleId) {
  const field = $(`#${fieldId}`);
  const toggle = $(`#${toggleId}`);
  
  if (field.attr('type') === 'password') {
    field.attr('type', 'text');
    toggle.removeClass('bi-eye-slash').addClass('bi-eye');
  } else {
    field.attr('type', 'password');
    toggle.removeClass('bi-eye').addClass('bi-eye-slash');
  }
}

function loadUsersData() {
  document.getElementById('lastUpdated').textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
  
  $.ajax({
    url: 'http://127.0.0.1:8001/api/v1/users/',
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      'accept': 'application/json'
    },
    success: function (data) {
      updateUsersTable(data);
    },
    error: function (xhr) {
      let errorMsg = "Failed to load users data.";
      if (xhr.status === 401) {
        errorMsg = "Session expired. Please login again.";
        logout();
      }
      showAlert(errorMsg, 'danger');
    }
  });
}

function updateUsersTable(users) {
  const table = $("#usersTable");
  table.empty();

  if (users.length === 0) {
    table.append("<tr><td colspan='5' class='text-center py-4'>No users found</td></tr>");
    return;
  }

  users.forEach(user => {
    const statusClass = user.is_active ? 'active-user' : 'inactive-user';
    const statusIcon = user.is_active ? 'bi-check-circle-fill' : 'bi-x-circle-fill';
    
    const row = `<tr class="${getRoleClass(user.role)}">
      <td>${user.username}</td>
      <td>${user.email}</td>
      <td><span class="badge bg-secondary">${user.role}</span></td>
      <td><i class="bi ${statusIcon} ${statusClass}"></i> ${user.is_active ? 'Active' : 'Inactive'}</td>
      <td class="action-buttons">
        <button class="btn btn-sm btn-outline-danger delete-user" data-id="${user.id}" data-name="${user.username}">
          <i class="bi bi-trash"></i> Delete
        </button>
      </td>
    </tr>`;
    table.append(row);
  });

  // Set up delete handlers
  $('.delete-user').click(function() {
    const userId = $(this).data('id');
    const userName = $(this).data('name');
    confirmDeleteUser(userId, userName);
  });
}

function registerUser() {
  const username = $('#username').val();
  const email = $('#email').val();
  const role = $('#role').val();
  const password = $('#password').val();
  const confirmPassword = $('#confirmPassword').val();

  if (!username || !email || !role || !password || !confirmPassword) {
    showAlert('Please fill in all required fields', 'warning');
    return;
  }

  if (password !== confirmPassword) {
    showAlert('Passwords do not match', 'warning');
    return;
  }

  if (password.length < 8) {
    showAlert('Password must be at least 8 characters', 'warning');
    return;
  }

  $('#registerSpinner').removeClass('d-none');
  $('#registerUser').prop('disabled', true);

  $.ajax({
    url: 'http://127.0.0.1:8001/api/v1/users/register',
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      'accept': 'application/json',
      'Content-Type': 'application/json'
    },
    data: JSON.stringify({
      username: username,
      email: email,
      role: role,
      password: password
    }),
    success: function () {
      $('#createUserModal').modal('hide');
      $('#createUserForm')[0].reset();
      loadUsersData();
      showAlert('User created successfully', 'success');
    },
    error: function (xhr) {
      let errorMsg = "Failed to create user.";
      if (xhr.status === 401) {
        errorMsg = "Session expired. Please login again.";
        logout();
      } else if (xhr.responseJSON && xhr.responseJSON.detail) {
        errorMsg = xhr.responseJSON.detail;
      }
      showAlert(errorMsg, 'danger');
    },
    complete: function() {
      $('#registerSpinner').addClass('d-none');
      $('#registerUser').prop('disabled', false);
    }
  });
}

function confirmDeleteUser(userId, userName) {
  $('#userToDelete').text(userName);
  $('#deleteUserModal').data('id', userId).modal('show');
}

function deleteUser() {
  const userId = $('#deleteUserModal').data('id');

  $('#deleteSpinner').removeClass('d-none');
  $('#confirmDeleteUser').prop('disabled', true);

  $.ajax({
    url: `http://127.0.0.1:8001/api/v1/users/${userId}`,
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      'accept': 'application/json'
    },
    success: function () {
      $('#deleteUserModal').modal('hide');
      loadUsersData();
      showAlert('User deleted successfully', 'success');
    },
    error: function (xhr) {
      let errorMsg = "Failed to delete user.";
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
      $('#confirmDeleteUser').prop('disabled', false);
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
  loadUsersData();
  
  $('#refreshUsers').click(function() {
    loadUsersData();
  });
  
  $('#registerUser').click(registerUser);
  $('#confirmDeleteUser').click(deleteUser);
  
  // Password toggle handlers
  $('#togglePassword').click(function() {
    togglePasswordVisibility('password', 'togglePassword');
  });
  
  $('#toggleConfirmPassword').click(function() {
    togglePasswordVisibility('confirmPassword', 'toggleConfirmPassword');
  });
  
  setInterval(() => loadUsersData(), 30000);
});