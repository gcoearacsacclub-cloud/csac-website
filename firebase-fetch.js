import { db } from './firebase-config.js';
import { collection, getDocs, addDoc, query, orderBy, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

/**
 * Safely fetch docs from a Firestore collection.
 * Falls back to unordered fetch if orderBy fails (e.g., missing index).
 * Returns empty array if collection doesn't exist yet.
 */
async function safeFetchCollection(collectionName, orderField = 'order') {
  try {
    console.log(`[Firestore Read] Starting fetch for collection: ${collectionName} with order: ${orderField}`);
    let snapshot;
    try {
      const q = query(collection(db, collectionName), orderBy(orderField, 'asc'));
      snapshot = await getDocs(q);
      console.log(`[Firestore Read] Successfully fetched ${snapshot.size} documents from ${collectionName} (Ordered)`);
    } catch (orderError) {
      // Fallback: fetch without ordering if index is missing
      console.warn(`[Firestore Read] OrderBy failed for "${collectionName}", fetching unordered:`, orderError.message);
      snapshot = await getDocs(collection(db, collectionName));
      console.log(`[Firestore Read] Successfully fetched ${snapshot.size} documents from ${collectionName} (Unordered)`);
    }

    const docs = [];
    snapshot.forEach(doc => {
      docs.push({ id: doc.id, ...doc.data() });
    });

    // Client-side sort as safety net
    docs.sort((a, b) => (Number(a[orderField]) || 0) - (Number(b[orderField]) || 0));
    return docs;
  } catch (error) {
    console.error(`🚨 [Firestore Read Failed] Could not fetch collection "${collectionName}":`, error);
    return null;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // We only run this on the main page
  if (!document.querySelector('#committee')) return;

  fetchAndRenderCommittee();
  fetchAndRenderMembers();
  fetchAndRenderEvents();
  fetchAndRenderReports();
  fetchAndRenderGallery();
  fetchAndRenderTestimonials();
  fetchAndRenderAchievements();
  initJoinForm();
});

function initJoinForm() {
  const joinForm = document.getElementById('join-form');
  if (!joinForm) return;

  joinForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = joinForm.querySelector('.btn-submit');
    const originalText = btn.innerHTML;

    const name = document.getElementById('name')?.value.trim();
    const rollNumber = document.getElementById('rollNumber')?.value.trim();
    const dept = document.getElementById('dept')?.value.trim();
    const year = document.getElementById('year')?.value.trim();
    const phone = document.getElementById('phone')?.value.trim();
    const email = document.getElementById('email')?.value.trim().toLowerCase();
    const message = document.getElementById('message')?.value.trim() || '';

    const examCheckboxes = document.querySelectorAll('input[name="exams"]:checked');
    const interestedExaminations = Array.from(examCheckboxes).map(cb => cb.value);

    if (!name || !rollNumber || !dept || !year || !phone || !email) {
      alert('Please fill out all required fields.');
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Submitting...';

    const appColRef = collection(db, 'applications');

    try {
      // Check for duplicate application by email (if read permission allows)
      try {
        const q = query(appColRef, where('email', '==', email));
        const existingApps = await getDocs(q);

        if (!existingApps.empty) {
          btn.disabled = false;
          btn.innerHTML = originalText;
          alert('You have already submitted an application.');
          return;
        }
      } catch (checkErr) {
        console.warn('Duplicate check skipped due to read permissions:', checkErr.message);
      }

      // Save application to Firestore applications collection
      await addDoc(appColRef, {
        fullName: name,
        rollNumber: rollNumber,
        department: dept,
        year: year,
        phoneNumber: phone,
        email: email,
        interestedExaminations: interestedExaminations,
        message: message,
        status: 'pending',
        submittedAt: new Date().toISOString()
      });

      btn.textContent = 'Submitted Successfully! ✓';
      btn.style.background = 'linear-gradient(135deg, #138808, #0E6B06)';
      joinForm.reset();

      setTimeout(() => {
        btn.disabled = false;
        btn.innerHTML = originalText;
        btn.style.background = '';
      }, 4000);
    } catch (err) {
      console.error('Error submitting application:', err);
      btn.disabled = false;
      btn.innerHTML = originalText;
      alert('Failed to submit application: ' + err.message);
    }
  });
}

async function fetchAndRenderCommittee() {
  const container = document.querySelector('.committee-grid-new');
  if (!container) return;

  const docs = await safeFetchCollection('committee');

  container.innerHTML = '';
  if (docs === null) {
    container.innerHTML = `<div class="fetch-error-msg"><i class="fa-solid fa-triangle-exclamation"></i> Unable to load committee data from Firestore.</div>`;
    return;
  }
  if (docs.length === 0) {
    container.innerHTML = `<div class="fetch-empty-msg"><i class="fa-solid fa-info-circle"></i> No committee members published yet.</div>`;
    return;
  }

  docs.forEach(data => {
    const deptYear = (data.department || data.year)
      ? `<div class="cmte-dept">${data.department || ''}${data.department && data.year ? '<br>' : ''}${data.year || ''}</div>`
      : '';
    const card = `
      <div class="cmte-card reveal-zoom active">
        <div class="cmte-photo"><img src="${data.photoUrl || 'images/default-avatar.png'}" alt="${data.name}"
            onerror="this.parentElement.innerHTML='<div class=\\'default-avatar\\'><i class=\\'fa-solid fa-user\\'></i></div>'">
        </div>
        <h3>${data.name}</h3>
        <div class="cmte-position">${data.designation || ''}</div>
        ${deptYear}
      </div>
    `;
    container.insertAdjacentHTML('beforeend', card);
  });
}

async function fetchAndRenderMembers() {
  const container = document.getElementById('members-grid');
  if (!container) return;

  const [committeeDocs, memberDocs] = await Promise.all([
    safeFetchCollection('committee'),
    safeFetchCollection('members')
  ]);

  // Preserve the no-results element
  const noResultsEl = document.getElementById('members-no-results');
  const noResultsHTML = noResultsEl ? noResultsEl.outerHTML : '';
  container.innerHTML = '';

  if (committeeDocs === null && memberDocs === null) {
    container.innerHTML = `<div class="fetch-error-msg"><i class="fa-solid fa-triangle-exclamation"></i> Unable to load members data from Firestore.</div>`;
    return;
  }

  const combinedDocs = [];
  const existingNames = new Set();

  // 1. Add Committee Members first (with designation)
  if (Array.isArray(committeeDocs)) {
    committeeDocs.forEach(c => {
      const normName = (c.name || '').trim().toLowerCase();
      if (normName && !existingNames.has(normName)) {
        combinedDocs.push(c);
        existingNames.add(normName);
      }
    });
  }

  // 2. Add General Members
  if (Array.isArray(memberDocs)) {
    memberDocs.forEach(m => {
      const normName = (m.name || '').trim().toLowerCase();
      if (normName && !existingNames.has(normName)) {
        combinedDocs.push(m);
        existingNames.add(normName);
      }
    });
  }

  combinedDocs.forEach(data => {
    const nameplate = data.designation
      ? `<div class="mbr-team">${data.designation}</div>` : '';
    const dept = data.department
      ? `<div class="mbr-dept"><i class="fa-solid fa-building-columns"></i> ${data.department}</div>` : '';
    const year = data.year
      ? `<div class="mbr-year">${data.year}</div>` : '';
    const card = `
      <div class="mbr-card reveal-zoom active" data-dept="${data.department || 'all'}" data-name="${data.name || ''}">
        <div class="mbr-photo"><img src="${data.photoUrl || 'images/default-avatar.png'}" alt="${data.name || 'Member'}"
            onerror="this.parentElement.innerHTML='<div class=\\'default-avatar\\'><i class=\\'fa-solid fa-user\\'></i></div>'">
        </div>
        <div class="mbr-info">
          <h4>${data.name || ''}</h4>
          ${nameplate}
          ${dept}
          ${year}
        </div>
      </div>
    `;
    container.insertAdjacentHTML('beforeend', card);
  });
  if (noResultsHTML) container.insertAdjacentHTML('beforeend', noResultsHTML);
  if (typeof window.filterMembers === 'function') {
    window.filterMembers();
  }
}

async function fetchAndRenderEvents() {
  const container = document.querySelector('.week-timeline');
  if (!container) return;

  const docs = await safeFetchCollection('events');

  container.innerHTML = '';
  if (docs === null) {
    container.innerHTML = `<div class="fetch-error-msg"><i class="fa-solid fa-triangle-exclamation"></i> Unable to load events data from Firestore.</div>`;
    return;
  }
  if (docs.length === 0) {
    container.innerHTML = `<div class="fetch-empty-msg"><i class="fa-solid fa-info-circle"></i> No events published yet.</div>`;
    return;
  }

  let day = 1;
  docs.forEach(data => {
    const card = `
      <div class="week-event reveal active">
        <div class="week-event-dot"></div>
        <div class="week-event-card">
          <div class="week-event-header">
            <h3>${data.title}</h3>
            <span class="week-event-date">Day ${day++}</span>
          </div>
          <div style="margin-top: 6px; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 0.8rem; color: var(--text-muted);"><i class="fa-solid fa-calendar-days"
                style="margin-right: 4px;"></i>${data.date}</span>
            <i class="fa-solid fa-chevron-down expand-icon"></i>
          </div>
          <div class="week-event-body">
            <p>${data.description}</p>
          </div>
        </div>
      </div>
    `;
    container.insertAdjacentHTML('beforeend', card);
  });
}

async function fetchAndRenderReports() {
  const container = document.querySelector('.reports-grid');
  if (!container) return;

  const docs = await safeFetchCollection('reports');

  container.innerHTML = '';
  if (docs === null) {
    container.innerHTML = `<div class="fetch-error-msg"><i class="fa-solid fa-triangle-exclamation"></i> Unable to load activity reports from Firestore.</div>`;
    return;
  }
  if (docs.length === 0) {
    container.innerHTML = `<div class="fetch-empty-msg"><i class="fa-solid fa-info-circle"></i> No reports published yet.</div>`;
    return;
  }

  docs.forEach(data => {
    const card = `
      <div class="report-card reveal-zoom active">
        <h3>${data.title}</h3>
        <div class="report-date">${data.date}</div>
        <p>${data.description || ''}</p>
        <div class="report-actions">
          ${data.pdfUrl ? `
            <a href="${data.pdfUrl}" target="_blank" class="btn-small">
              <i class="fa-solid fa-eye" style="margin-right: 4px;"></i>View
            </a>
            <a href="${data.pdfUrl}" download class="btn-small">
              <i class="fa-solid fa-file-arrow-down" style="margin-right: 4px;"></i>PDF
            </a>
          ` : ''}
        </div>
      </div>
    `;
    container.insertAdjacentHTML('beforeend', card);
  });
}

async function fetchAndRenderGallery() {
  const container = document.querySelector('.masonry-grid');
  if (!container) return;

  const docs = await safeFetchCollection('gallery');

  container.innerHTML = '';
  if (docs === null) {
    container.innerHTML = `<div class="fetch-error-msg"><i class="fa-solid fa-triangle-exclamation"></i> Unable to load gallery items from Firestore.</div>`;
    return;
  }
  if (docs.length === 0) {
    container.innerHTML = `<div class="fetch-empty-msg"><i class="fa-solid fa-info-circle"></i> No gallery images published yet.</div>`;
    return;
  }

  docs.forEach(data => {
    const item = `
      <div class="gallery-item" data-category="${data.category || 'all'}">
        <img src="${data.photoUrl}" alt="${data.title || 'Gallery Image'}">
        <div class="gallery-overlay"><i class="fa-solid fa-eye"></i></div>
      </div>
    `;
    container.insertAdjacentHTML('beforeend', item);
  });
}

async function fetchAndRenderTestimonials() {
  const track = document.querySelector('.testimonial-track');
  if (!track) return;

  const docs = await safeFetchCollection('testimonials');

  track.innerHTML = '';
  if (docs === null) {
    track.innerHTML = `<div class="fetch-error-msg"><i class="fa-solid fa-triangle-exclamation"></i> Unable to load testimonials from Firestore.</div>`;
    return;
  }
  if (docs.length === 0) {
    track.innerHTML = `<div class="fetch-empty-msg"><i class="fa-solid fa-info-circle"></i> No testimonials published yet.</div>`;
    return;
  }

  docs.forEach(data => {
    const slide = `
      <div class="testimonial-slide">
        <div class="testimonial-card">
          <i class="fa-solid fa-quote-left quote-icon"></i>
          <p>${data.quote}</p>
          <div class="author">${data.name}</div>
          <div class="role">${data.role}</div>
        </div>
      </div>
    `;
    track.insertAdjacentHTML('beforeend', slide);
  });

  // Update slider dots to match the number of testimonials
  const dotsContainer = document.querySelector('.slider-dots');
  if (dotsContainer) {
    dotsContainer.innerHTML = '';
    docs.forEach((_, i) => {
      const dot = document.createElement('span');
      dot.className = `slider-dot${i === 0 ? ' active' : ''}`;
      dotsContainer.appendChild(dot);
    });
  }

  if (typeof window.initTestimonialSlider === 'function') {
    window.initTestimonialSlider();
  }
}

async function fetchAndRenderAchievements() {
  const container = document.querySelector('.counters-grid');
  if (!container) return;

  const docs = await safeFetchCollection('achievements');

  container.innerHTML = '';
  if (docs === null) {
    container.innerHTML = `<div class="fetch-error-msg"><i class="fa-solid fa-triangle-exclamation"></i> Unable to load achievements from Firestore.</div>`;
    return;
  }
  if (docs.length === 0) {
    container.innerHTML = `<div class="fetch-empty-msg"><i class="fa-solid fa-info-circle"></i> No achievements published yet.</div>`;
    return;
  }

  docs.forEach(data => {
    const card = `
      <div class="counter-card reveal-zoom active">
        <div class="counter-icon"><i class="fa-solid fa-trophy"></i></div>
        <h3>${data.title}</h3>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 6px;">${data.description || ''}</p>
        <div style="font-size: 0.8rem; color: var(--gold); margin-top: 8px;">${data.date || ''}</div>
      </div>
    `;
    container.insertAdjacentHTML('beforeend', card);
  });
}

