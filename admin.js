import { auth, db } from './firebase-config.js';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, where, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// DOM Elements
const loginSection = document.getElementById('login-section');
const dashboardSection = document.getElementById('dashboard-section');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');
const navItems = document.querySelectorAll('.nav-item');
const currentSectionTitle = document.getElementById('current-section-title');
const tableHead = document.getElementById('table-head');
const tableBody = document.getElementById('table-body');
const addNewBtn = document.getElementById('add-new-btn');
const exportPdfBtn = document.getElementById('export-pdf-btn');
const exportCsvBtn = document.getElementById('export-csv-btn');
const itemModal = document.getElementById('item-modal');
const closeModalBtn = document.getElementById('close-modal');
const cancelModalBtn = document.getElementById('cancel-modal');
const itemForm = document.getElementById('item-form');
const dynamicFormFields = document.getElementById('dynamic-form-fields');
const modalTitle = document.getElementById('modal-title');
const loadingSpinner = document.getElementById('loading-spinner');
const toast = document.getElementById('toast');

const appModal = document.getElementById('application-modal');
const closeAppModalBtn = document.getElementById('close-app-modal');
const appModalBody = document.getElementById('app-modal-body');

let currentCollection = 'committee';
let currentEditId = null;
let fileToUpload = null;
let currentItems = [];

// Schemas for dynamic rendering
const schemas = {
  committee: {
    title: 'Working Committee',
    fields: [
      { name: 'name', label: 'Full Name', type: 'text', required: true },
      { name: 'designation', label: 'Designation', type: 'text', required: true },
      { name: 'department', label: 'Department', type: 'text', required: false },
      { name: 'year', label: 'Year', type: 'text', required: false },
      { name: 'order', label: 'Display Order', type: 'number', required: true },
      { name: 'photoUrl', label: 'Profile Photo', type: 'file', accept: 'image/*' }
    ]
  },
  members: {
    title: 'CSAC Members',
    fields: [
      { name: 'name', label: 'Full Name', type: 'text', required: true },
      { name: 'designation', label: 'Role / Designation', type: 'text', required: false },
      { name: 'department', label: 'Department', type: 'text', required: false },
      { name: 'year', label: 'Year', type: 'text', required: false },
      { name: 'order', label: 'Display Order', type: 'number', required: true },
      { name: 'photoUrl', label: 'Profile Photo', type: 'file', accept: 'image/*' }
    ]
  },
  applications: {
    title: 'Membership Applications',
    fields: [
      { name: 'fullName', label: 'Full Name', type: 'text' },
      { name: 'rollNumber', label: 'Roll Number', type: 'text' },
      { name: 'department', label: 'Department', type: 'text' },
      { name: 'year', label: 'Year', type: 'text' },
      { name: 'phoneNumber', label: 'Phone', type: 'text' },
      { name: 'email', label: 'Email', type: 'text' },
      { name: 'interestedExaminations', label: 'Exams', type: 'text' },
      { name: 'status', label: 'Status', type: 'text' }
    ]
  },
  gallery: {
    title: 'Photo Gallery',
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true },
      { name: 'category', label: 'Category', type: 'text', required: true },
      { name: 'order', label: 'Display Order', type: 'number', required: true },
      { name: 'photoUrl', label: 'Image', type: 'file', accept: 'image/*', required: true }
    ]
  },
  reports: {
    title: 'Activity Reports',
    fields: [
      { name: 'title', label: 'Report Title', type: 'text', required: true },
      { name: 'date', label: 'Date', type: 'date', required: true },
      { name: 'description', label: 'Description', type: 'textarea', required: false },
      { name: 'order', label: 'Display Order', type: 'number', required: true },
      { name: 'pdfUrl', label: 'PDF File', type: 'file', accept: '.pdf', required: true }
    ]
  },
  testimonials: {
    title: 'Testimonials',
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'role', label: 'Role/Position', type: 'text', required: false },
      { name: 'quote', label: 'Quote', type: 'textarea', required: true },
      { name: 'order', label: 'Display Order', type: 'number', required: true },
      { name: 'photoUrl', label: 'Photo', type: 'file', accept: 'image/*' }
    ]
  },
  achievements: {
    title: 'Achievements',
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true },
      { name: 'description', label: 'Description', type: 'textarea', required: true },
      { name: 'date', label: 'Date/Year', type: 'text', required: true },
      { name: 'order', label: 'Display Order', type: 'number', required: true },
      { name: 'photoUrl', label: 'Image', type: 'file', accept: 'image/*' }
    ]
  },
  events: {
    title: 'CSAC Week Events',
    fields: [
      { name: 'title', label: 'Event Title', type: 'text', required: true },
      { name: 'date', label: 'Date & Time', type: 'text', required: true },
      { name: 'description', label: 'Description', type: 'textarea', required: true },
      { name: 'order', label: 'Display Order', type: 'number', required: true }
    ]
  }
};

// ==========================================
// Toast Notification
// ==========================================
function showToast(message, type = 'success') {
  toast.textContent = message;
  toast.className = `toast ${type}`;
  // Force reflow to restart animation
  void toast.offsetWidth;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3500);
}

// ==========================================
// Auth State Listener
// ==========================================
onAuthStateChanged(auth, (user) => {
  if (user) {
    loginSection.classList.add('hidden');
    dashboardSection.classList.remove('hidden');
    loadData();
  } else {
    loginSection.classList.remove('hidden');
    dashboardSection.classList.add('hidden');
  }
});

// ==========================================
// Login
// ==========================================
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const btn = document.getElementById('login-btn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i>';
  loginError.textContent = '';

  try {
    await signInWithEmailAndPassword(auth, email, password);
    showToast('Login successful!', 'success');
  } catch (error) {
    console.error('Login error:', error.code);
    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
      loginError.textContent = 'Invalid credentials. Please try again.';
    } else if (error.code === 'auth/too-many-requests') {
      loginError.textContent = 'Too many attempts. Please try again later.';
    } else {
      loginError.textContent = 'Login failed: ' + error.message;
    }
    showToast('Login failed', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span>Sign In</span> <i class="fa-solid fa-arrow-right"></i>';
  }
});

// ==========================================
// Logout
// ==========================================
logoutBtn.addEventListener('click', async () => {
  try {
    await signOut(auth);
    showToast('Logged out successfully', 'success');
  } catch (error) {
    showToast('Logout failed', 'error');
  }
});

// ==========================================
// Navigation
// ==========================================
navItems.forEach(item => {
  item.addEventListener('click', () => {
    navItems.forEach(nav => nav.classList.remove('active'));
    item.classList.add('active');
    currentCollection = item.dataset.collection;
    currentSectionTitle.textContent = 'Manage ' + schemas[currentCollection].title;
    loadData();
  });
});

// ==========================================
// Load Data from Firestore
// ==========================================
async function loadData() {
  loadingSpinner.classList.remove('hidden');
  tableBody.innerHTML = '';
  tableHead.innerHTML = '';

  if (currentCollection === 'applications') {
    if (addNewBtn) addNewBtn.style.display = 'none';
    if (exportPdfBtn) exportPdfBtn.classList.remove('hidden');
    if (exportCsvBtn) exportCsvBtn.classList.remove('hidden');
  } else {
    if (addNewBtn) addNewBtn.style.display = 'inline-flex';
    if (exportPdfBtn) exportPdfBtn.classList.add('hidden');
    if (exportCsvBtn) exportCsvBtn.classList.add('hidden');
  }

  try {
    const schema = schemas[currentCollection];
    if (!schema) {
      showToast('Unknown collection: ' + currentCollection, 'error');
      return;
    }

    if (currentCollection === 'applications') {
      let headerHtml = '<tr>';
      headerHtml += '<th>Sr. No.</th>';
      headerHtml += '<th>Full Name</th>';
      headerHtml += '<th>Roll Number</th>';
      headerHtml += '<th>Department</th>';
      headerHtml += '<th>Year</th>';
      headerHtml += '<th>Phone</th>';
      headerHtml += '<th>Email</th>';
      headerHtml += '<th>Exams</th>';
      headerHtml += '<th>Status</th>';
      headerHtml += '<th>Submitted Date</th>';
      headerHtml += '<th>Actions</th></tr>';
      tableHead.innerHTML = headerHtml;

      console.log(`[Firestore Read Admin] Fetching collection: applications`);
      const colRef = collection(db, 'applications');
      const querySnapshot = await getDocs(colRef);

      currentItems = [];
      if (querySnapshot.empty) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="11" style="text-align: center; padding: 48px 16px; color: var(--text-muted);">
              <div style="font-size: 2.5rem; margin-bottom: 12px; opacity: 0.4;">
                <i class="fa-solid fa-inbox"></i>
              </div>
              <div style="font-size: 1rem; font-weight: 500;">No membership applications found</div>
            </td>
          </tr>`;
        return;
      }

      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        data.id = docSnap.id;
        currentItems.push(data);
      });

      currentItems.sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0));

      currentItems.forEach((data, index) => {
        const examsStr = Array.isArray(data.interestedExaminations) ? data.interestedExaminations.join(', ') : (data.interestedExaminations || '');
        const submittedDateStr = data.submittedAt ? new Date(data.submittedAt).toLocaleDateString() : 'N/A';
        const statusStr = (data.status || 'pending').toLowerCase();

        let rowHtml = `<tr>
          <td>${index + 1}</td>
          <td><strong>${data.fullName || 'N/A'}</strong></td>
          <td>${data.rollNumber || 'N/A'}</td>
          <td>${data.department || 'N/A'}</td>
          <td>${data.year || 'N/A'}</td>
          <td>${data.phoneNumber || 'N/A'}</td>
          <td>${data.email || 'N/A'}</td>
          <td>${examsStr}</td>
          <td><span class="status-badge status-${statusStr}">${statusStr.toUpperCase()}</span></td>
          <td>${submittedDateStr}</td>
          <td class="actions-cell">
            <button class="icon-btn view-app-btn" data-id="${data.id}" title="View Details"><i class="fa-solid fa-eye"></i></button>
            ${statusStr !== 'approved' ? `<button class="icon-btn approve-app-btn" data-id="${data.id}" title="Approve Application" style="color:#38a169;"><i class="fa-solid fa-check"></i></button>` : ''}
            ${statusStr !== 'rejected' ? `<button class="icon-btn reject-app-btn" data-id="${data.id}" title="Reject Application" style="color:#e53e3e;"><i class="fa-solid fa-xmark"></i></button>` : ''}
            <button class="icon-btn delete delete-btn" data-id="${data.id}" title="Delete"><i class="fa-solid fa-trash"></i></button>
          </td>
        </tr>`;
        tableBody.insertAdjacentHTML('beforeend', rowHtml);
      });

      attachActionListeners();
      return;
    }

    // Build Headers for standard schemas
    let headerHtml = '<tr>';
    schema.fields.forEach(field => {
      if (field.type !== 'file' || field.name === 'photoUrl') {
        headerHtml += `<th>${field.label}</th>`;
      }
    });
    headerHtml += '<th>Actions</th></tr>';
    tableHead.innerHTML = headerHtml;

    // Fetch Data
    console.log(`[Firestore Read Admin] Fetching collection: ${currentCollection}`);
    let querySnapshot;
    try {
      const q = query(collection(db, currentCollection), orderBy('order', 'asc'));
      querySnapshot = await getDocs(q);
      console.log(`[Firestore Read Admin] Fetched ${querySnapshot.size} docs from ${currentCollection} (Ordered)`);
    } catch (orderError) {
      console.warn(`[Firestore Read Admin] OrderBy query failed for "${currentCollection}", falling back to unordered fetch:`, orderError.message);
      const colRef = collection(db, currentCollection);
      querySnapshot = await getDocs(colRef);
      console.log(`[Firestore Read Admin] Fetched ${querySnapshot.size} docs from ${currentCollection} (Unordered)`);
    }

    currentItems = [];

    if (querySnapshot.empty) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="${schema.fields.filter(f => f.type !== 'file' || f.name === 'photoUrl').length + 1}" 
              style="text-align: center; padding: 48px 16px; color: var(--text-muted);">
            <div style="font-size: 2.5rem; margin-bottom: 12px; opacity: 0.4;">
              <i class="fa-solid fa-inbox"></i>
            </div>
            <div style="font-size: 1rem; font-weight: 500;">No ${schema.title.toLowerCase()} found</div>
            <div style="font-size: 0.85rem; margin-top: 6px; opacity: 0.7;">Click "Add New Item" to create your first entry</div>
          </td>
        </tr>`;
      return;
    }

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      data.id = docSnap.id;
      currentItems.push(data);
    });

    currentItems.sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));

    currentItems.forEach(data => {
      let rowHtml = '<tr>';
      schema.fields.forEach(field => {
        if (field.type === 'file') {
          if (field.name === 'photoUrl') {
            rowHtml += `<td>${data[field.name] ? `<img src="${data[field.name]}" alt="Img" title="Click to preview">` : '<span style="color:var(--text-muted)">N/A</span>'}</td>`;
          }
        } else {
          let val = data[field.name] != null ? String(data[field.name]) : '';
          if (val.length > 50) val = val.substring(0, 50) + '...';
          rowHtml += `<td>${val}</td>`;
        }
      });

      rowHtml += `
        <td class="actions-cell">
          <button class="icon-btn edit-btn" data-id="${data.id}" title="Edit"><i class="fa-solid fa-pen-to-square"></i></button>
          <button class="icon-btn delete delete-btn" data-id="${data.id}" title="Delete"><i class="fa-solid fa-trash"></i></button>
        </td>
      </tr>`;
      tableBody.insertAdjacentHTML('beforeend', rowHtml);
    });

    attachActionListeners();
  } catch (error) {
    console.error("Error loading data:", error);
    showToast('Failed to load data: ' + error.message, 'error');
    tableBody.innerHTML = `
      <tr>
        <td colspan="100%" style="text-align: center; padding: 48px 16px; color: var(--danger);">
          <div style="font-size: 2rem; margin-bottom: 12px;"><i class="fa-solid fa-exclamation-triangle"></i></div>
          <div>Error loading data. Check console for details.</div>
        </td>
      </tr>`;
  } finally {
    loadingSpinner.classList.add('hidden');
  }
}

// ==========================================
// Modal Form Generation
// ==========================================
function generateForm(itemData = null) {
  dynamicFormFields.innerHTML = '';
  fileToUpload = null;
  const schema = schemas[currentCollection];

  schema.fields.forEach(field => {
    const formGroup = document.createElement('div');
    formGroup.className = 'form-group';

    const label = document.createElement('label');
    label.textContent = field.label;
    if (field.required && field.name !== 'role') label.textContent += ' *';
    formGroup.appendChild(label);

    if (field.type === 'textarea') {
      const input = document.createElement('textarea');
      input.name = field.name;
      input.id = `input-${field.name}`;
      if (field.required && !itemData) input.required = field.required && field.name !=='role';
      if (itemData && itemData[field.name]) input.value = itemData[field.name];
      formGroup.appendChild(input);
    } else if (field.type === 'file') {
      const wrapper = document.createElement('div');
      wrapper.className = 'file-upload-wrapper';

      if (itemData && itemData[field.name] && field.name === 'photoUrl') {
        const img = document.createElement('img');
        img.src = itemData[field.name];
        img.className = 'file-preview-img';
        img.style.display = 'block';
        wrapper.appendChild(img);
      }

      if (itemData && itemData[field.name] && field.name === 'pdfUrl') {
        const link = document.createElement('a');
        link.href = itemData[field.name];
        link.target = '_blank';
        link.textContent = '📄 View current PDF';
        link.style.cssText = 'color: var(--primary); font-size: 0.85rem; text-decoration: underline;';
        wrapper.appendChild(link);
      }

      const input = document.createElement('input');
      input.type = 'file';
      input.name = field.name;
      input.id = `input-${field.name}`;
      input.accept = field.accept;
      if (field.required && !itemData) input.required = true;

      input.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
          fileToUpload = { file: e.target.files[0], field: field.name };
        }
      });

      wrapper.appendChild(input);
      formGroup.appendChild(wrapper);
    } else {
      const input = document.createElement('input');
      input.type = field.type;
      input.name = field.name;
      input.id = `input-${field.name}`;
      if (field.required && !itemData) input.required = true;
      if (itemData && itemData[field.name] != null) input.value = itemData[field.name];
      formGroup.appendChild(input);
    }

    dynamicFormFields.appendChild(formGroup);
  });
}

// ==========================================
// Add / Edit Button Handlers
// ==========================================
addNewBtn.addEventListener('click', () => {
  currentEditId = null;
  modalTitle.textContent = 'Add ' + schemas[currentCollection].title;
  generateForm();
  itemModal.classList.remove('hidden');
});

function attachActionListeners() {
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      currentEditId = e.currentTarget.dataset.id;
      const item = currentItems.find(i => i.id === currentEditId);
      if (!item) {
        showToast('Item not found', 'error');
        return;
      }
      modalTitle.textContent = 'Edit ' + schemas[currentCollection].title;
      generateForm(item);
      itemModal.classList.remove('hidden');
    });
  });

  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.dataset.id;
      const item = currentItems.find(i => i.id === id);
      const itemName = item?.fullName || item?.name || item?.title || 'this item';

      if (confirm(`Are you sure you want to delete "${itemName}"?`)) {
        try {
          console.log(`[Firestore Write] Deleting doc ${id} from ${currentCollection}`);
          await deleteDoc(doc(db, currentCollection, id));
          console.log(`[Firestore Write] Successfully deleted doc ${id}`);
          showToast(`"${itemName}" deleted successfully`, 'success');
          await loadData();
        } catch (error) {
          console.error('Delete error:', error);
          showToast('Failed to delete: ' + error.message, 'error');
        }
      }
    });
  });

  // Member Application Specific Action Listeners
  document.querySelectorAll('.view-app-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      const app = currentItems.find(i => i.id === id);
      if (app) viewApplicationDetails(app);
    });
  });

  document.querySelectorAll('.approve-app-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      approveApplication(id);
    });
  });

  document.querySelectorAll('.reject-app-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      rejectApplication(id);
    });
  });
}

// ==========================================
// Close Modal
// ==========================================
const closeModals = () => {
  itemModal.classList.add('hidden');
  currentEditId = null;
  fileToUpload = null;
};
closeModalBtn.addEventListener('click', closeModals);
cancelModalBtn.addEventListener('click', closeModals);

// Close modal on backdrop click
itemModal.addEventListener('click', (e) => {
  if (e.target === itemModal) closeModals();
});

// ==========================================
// Save Item (Create / Update)
// ==========================================
itemForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const saveBtn = document.getElementById('save-item-btn');
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

  try {
    const schema = schemas[currentCollection];
    const data = {};

    // Collect text/number/date fields
    schema.fields.forEach(field => {
      if (field.type !== 'file') {
        const inputEl = document.getElementById(`input-${field.name}`);
        if (!inputEl) return;
        let val = inputEl.value.trim();
        if (field.type === 'number') val = Number(val);
        data[field.name] = val;
      }
    });

    // Handle File Upload to Cloudinary
    if (fileToUpload && fileToUpload.file) {
      showToast('Uploading file...', 'success');

      const CLOUDINARY_CLOUD_NAME = 'qcifpdvi';
      const CLOUDINARY_UPLOAD_PRESET = 'CSAC_uploads';

      const formData = new FormData();
      formData.append('file', fileToUpload.file);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      formData.append('folder', `csac/${currentCollection}`);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`, {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        let errorMsg = 'Unknown upload error';
        try {
          const errorData = await res.json();
          errorMsg = errorData.error?.message || errorMsg;
        } catch (_) { }
        throw new Error('Cloudinary upload failed: ' + errorMsg);
      }

      const result = await res.json();
      data[fileToUpload.field] = result.secure_url;
    }

    // Save to Firestore
    if (currentEditId) {
      // UPDATE existing document
      console.log(`[Firestore Write] Updating doc ${currentEditId} in ${currentCollection}`, data);
      const docRef = doc(db, currentCollection, currentEditId);
      data.updatedAt = serverTimestamp();
      await updateDoc(docRef, data);
      console.log(`[Firestore Write] Successfully updated doc ${currentEditId}`);
      showToast('Item updated successfully!', 'success');
    } else {
      // CREATE new document - Firestore auto-creates the collection if it doesn't exist
      console.log(`[Firestore Write] Adding new doc to ${currentCollection}`, data);
      data.createdAt = serverTimestamp();
      const colRef = collection(db, currentCollection);
      const docRef = await addDoc(colRef, data);
      console.log(`[Firestore Write] Successfully added new doc with ID ${docRef.id}`);
      showToast('Item added successfully!', 'success');
    }

    closeModals();
    await loadData();
  } catch (error) {
    console.error('Save error:', error);
    showToast('Failed to save: ' + error.message, 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = '<i class="fa-solid fa-save"></i> Save Changes';
  }
});

// ==========================================
// Preview Modal (image click)
// ==========================================
const previewModal = document.getElementById('preview-modal');
const previewContainer = document.getElementById('preview-container');
const closePreview = document.getElementById('close-preview');

if (previewModal && previewContainer) {
  document.addEventListener('click', (e) => {
    if (e.target.matches('.data-table img')) {
      previewContainer.innerHTML = `<img src="${e.target.src}" alt="Preview">`;
      previewModal.classList.remove('hidden');
    }
  });

  if (closePreview) {
    closePreview.addEventListener('click', () => previewModal.classList.add('hidden'));
  }
  previewModal.addEventListener('click', (e) => {
    if (e.target === previewModal) previewModal.classList.add('hidden');
  });
}

// ==========================================
// Membership Application Management & Exports
// ==========================================

function viewApplicationDetails(app) {
  if (!appModal || !appModalBody) return;

  const examsStr = Array.isArray(app.interestedExaminations) ? app.interestedExaminations.join(', ') : (app.interestedExaminations || 'None selected');
  const submittedDate = app.submittedAt ? new Date(app.submittedAt).toLocaleString() : 'N/A';
  const statusStr = (app.status || 'pending').toLowerCase();

  appModalBody.innerHTML = `
    <div class="app-detail-row">
      <span class="app-detail-label">Full Name:</span>
      <span class="app-detail-val"><strong>${app.fullName || 'N/A'}</strong></span>
    </div>
    <div class="app-detail-row">
      <span class="app-detail-label">Roll Number:</span>
      <span class="app-detail-val">${app.rollNumber || 'N/A'}</span>
    </div>
    <div class="app-detail-row">
      <span class="app-detail-label">Department:</span>
      <span class="app-detail-val">${app.department || 'N/A'}</span>
    </div>
    <div class="app-detail-row">
      <span class="app-detail-label">Year of Study:</span>
      <span class="app-detail-val">${app.year || 'N/A'}</span>
    </div>
    <div class="app-detail-row">
      <span class="app-detail-label">Phone Number:</span>
      <span class="app-detail-val">${app.phoneNumber || 'N/A'}</span>
    </div>
    <div class="app-detail-row">
      <span class="app-detail-label">Email Address:</span>
      <span class="app-detail-val">${app.email || 'N/A'}</span>
    </div>
    <div class="app-detail-row">
      <span class="app-detail-label">Interested Exams:</span>
      <span class="app-detail-val">${examsStr}</span>
    </div>
    <div class="app-detail-row">
      <span class="app-detail-label">Status:</span>
      <span class="app-detail-val"><span class="status-badge status-${statusStr}">${statusStr.toUpperCase()}</span></span>
    </div>
    <div class="app-detail-row">
      <span class="app-detail-label">Submitted Date:</span>
      <span class="app-detail-val">${submittedDate}</span>
    </div>
    <div style="margin-top: 15px;">
      <span class="app-detail-label" style="display: block; margin-bottom: 6px;">Statement of Purpose / Message:</span>
      <div style="background: rgba(0,0,0,0.2); padding: 12px; border-radius: 8px; font-size: 0.9rem; border: 1px solid var(--border); max-height: 120px; overflow-y: auto;">
        ${app.message || 'No message provided.'}
      </div>
    </div>
    <div class="form-actions" style="margin-top: 20px;">
      <button type="button" class="btn-outline" id="download-single-pdf-btn" style="border-color: #e53e3e; color: #e53e3e;">
        <i class="fa-solid fa-file-pdf"></i> Download Application PDF
      </button>
    </div>
  `;

  document.getElementById('download-single-pdf-btn')?.addEventListener('click', () => {
    exportSingleApplicationPDF(app);
  });

  appModal.classList.remove('hidden');
}

if (closeAppModalBtn && appModal) {
  closeAppModalBtn.addEventListener('click', () => appModal.classList.add('hidden'));
  appModal.addEventListener('click', (e) => {
    if (e.target === appModal) appModal.classList.add('hidden');
  });
}

async function approveApplication(appId) {
  const app = currentItems.find(i => i.id === appId);
  if (!app) return;

  if (!confirm(`Are you sure you want to APPROVE the application for "${app.fullName}"?`)) return;

  try {
    loadingSpinner.classList.remove('hidden');

    // 1. Check if applicant is already in members collection by email
    const membersCol = collection(db, 'members');
    if (app.email) {
      const qEmail = query(membersCol, where('email', '==', app.email));
      const existingMembers = await getDocs(qEmail);
      if (!existingMembers.empty) {
        if (!confirm(`Member with email "${app.email}" already exists in Members section. Proceed with adding anyway?`)) {
          loadingSpinner.classList.add('hidden');
          return;
        }
      }
    }

    // 2. Automatically add to members collection
    await addDoc(membersCol, {
      name: app.fullName,
      rollNumber: app.rollNumber || '',
      department: app.department || '',
      year: app.year || '',
      phoneNumber: app.phoneNumber || '',
      email: app.email || '',
      interestedExaminations: app.interestedExaminations || [],
      designation: 'Member',
      order: Date.now(),
      createdAt: serverTimestamp()
    });

    // 3. Update application status to approved
    const appRef = doc(db, 'applications', appId);
    await updateDoc(appRef, {
      status: 'approved',
      approvedAt: serverTimestamp()
    });

    showToast(`Application for ${app.fullName} approved and added to Members!`, 'success');
    await loadData();
  } catch (err) {
    console.error('Approve error:', err);
    showToast('Failed to approve application: ' + err.message, 'error');
  } finally {
    loadingSpinner.classList.add('hidden');
  }
}

async function rejectApplication(appId) {
  const app = currentItems.find(i => i.id === appId);
  if (!app) return;

  if (!confirm(`Are you sure you want to REJECT the application for "${app.fullName}"?`)) return;

  try {
    loadingSpinner.classList.remove('hidden');

    const appRef = doc(db, 'applications', appId);
    await updateDoc(appRef, {
      status: 'rejected',
      rejectedAt: serverTimestamp()
    });

    showToast(`Application for ${app.fullName} rejected.`, 'success');
    await loadData();
  } catch (err) {
    console.error('Reject error:', err);
    showToast('Failed to reject application: ' + err.message, 'error');
  } finally {
    loadingSpinner.classList.add('hidden');
  }
}

// Export CSV
function exportApplicationsCSV() {
  if (!currentItems.length) {
    showToast('No applications to export', 'error');
    return;
  }

  const headers = ["Sr. No.", "Full Name", "Roll Number", "Department", "Year", "Phone Number", "Email", "Interested Examinations", "Status", "Submitted Date"];
  const rows = currentItems.map((item, idx) => [
    idx + 1,
    `"${(item.fullName || '').replace(/"/g, '""')}"`,
    `"${(item.rollNumber || '').replace(/"/g, '""')}"`,
    `"${(item.department || '').replace(/"/g, '""')}"`,
    `"${(item.year || '').replace(/"/g, '""')}"`,
    `"${(item.phoneNumber || '').replace(/"/g, '""')}"`,
    `"${(item.email || '').replace(/"/g, '""')}"`,
    `"${(Array.isArray(item.interestedExaminations) ? item.interestedExaminations.join(', ') : item.interestedExaminations || '').replace(/"/g, '""')}"`,
    `"${(item.status || 'pending').toUpperCase()}"`,
    `"${(item.submittedAt ? new Date(item.submittedAt).toLocaleDateString() : 'N/A')}"`
  ]);

  const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', 'CSAC_Membership_Applications.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('CSV Exported successfully!', 'success');
}

// Export Full Table PDF Report
function exportApplicationsPDF() {
  if (!currentItems.length) {
    showToast('No applications to export', 'error');
    return;
  }

  if (!window.jspdf || !window.jspdf.jsPDF) {
    showToast('PDF generator library loading failed', 'error');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(10, 17, 40);
  doc.text('GCOEARA CSAC', 14, 15);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(212, 168, 67);
  doc.text('MEMBERSHIP APPLICATION REPORT', 14, 22);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28);

  const tableColumn = ["Sr. No.", "Full Name", "Roll Number", "Department", "Year", "Phone Number", "Email", "Interested Exams", "Status", "Submitted Date"];
  const tableRows = currentItems.map((item, idx) => [
    idx + 1,
    item.fullName || 'N/A',
    item.rollNumber || 'N/A',
    item.department || 'N/A',
    item.year || 'N/A',
    item.phoneNumber || 'N/A',
    item.email || 'N/A',
    Array.isArray(item.interestedExaminations) ? item.interestedExaminations.join(', ') : item.interestedExaminations || 'N/A',
    (item.status || 'pending').toUpperCase(),
    item.submittedAt ? new Date(item.submittedAt).toLocaleDateString() : 'N/A'
  ]);

  doc.autoTable({
    head: [tableColumn],
    body: tableRows,
    startY: 32,
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [10, 17, 40], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    theme: 'grid'
  });

  doc.save('CSAC_Membership_Applications_Report.pdf');
  showToast('PDF Report Exported successfully!', 'success');
}

// Export Individual Application PDF
function exportSingleApplicationPDF(item) {
  if (!window.jspdf || !window.jspdf.jsPDF) {
    showToast('PDF generator library loading failed', 'error');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFillColor(10, 17, 40);
  doc.rect(0, 0, 210, 30, 'F');

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 153, 51);
  doc.text('GCOEARA CSAC', 14, 14);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(240, 214, 138);
  doc.text('MEMBERSHIP APPLICATION FORM', 14, 22);

  let y = 42;
  const addField = (label, val) => {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(10, 17, 40);
    doc.text(label, 14, y);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50);
    doc.text(String(val || 'N/A'), 70, y);
    y += 9;
  };

  addField('Full Name:', item.fullName);
  addField('Roll Number:', item.rollNumber);
  addField('Department:', item.department);
  addField('Year of Study:', item.year);
  addField('Phone Number:', item.phoneNumber);
  addField('Email Address:', item.email);
  addField('Interested Exams:', Array.isArray(item.interestedExaminations) ? item.interestedExaminations.join(', ') : item.interestedExaminations);
  addField('Status:', (item.status || 'pending').toUpperCase());
  addField('Submitted Date:', item.submittedAt ? new Date(item.submittedAt).toLocaleString() : 'N/A');

  y += 5;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(10, 17, 40);
  doc.text('Statement of Purpose:', 14, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60);
  const splitText = doc.splitTextToSize(item.message || 'No statement provided.', 180);
  doc.text(splitText, 14, y);

  doc.save(`Application_${(item.fullName || 'Member').replace(/\s+/g, '_')}.pdf`);
  showToast('Application PDF downloaded!', 'success');
}

if (exportPdfBtn) exportPdfBtn.addEventListener('click', exportApplicationsPDF);
if (exportCsvBtn) exportCsvBtn.addEventListener('click', exportApplicationsCSV);

