import confetti from 'canvas-confetti';
import html2canvas from 'html2canvas';
import { 
  getMembers, 
  sendAnonymousMessage, 
  getMessagesForMember, 
  toggleMessageReadStatus, 
  deleteMessage, 
  subscribeToMessages 
} from './supabase.js';
import { DEPARTMENTS } from './data/members.js';

// ==========================================
// STATE APLIKASI
// ==========================================
const MAKRAB_PIN = '2025';

let state = {
  isPinUnlocked: false,
  currentUser: null,       // Anggota yang sedang login di inboks
  members: [],             // Seluruh anggota OSIS
  filteredMembers: [],     // Anggota hasil filter/search
  selectedDepartment: 'Semua',
  searchQuery: '',
  targetRecipient: null,   // Anggota yang akan dikirimi pesan anonim
  messages: [],            // Pesan milik currentUser
  realtimeChannel: null
};

// ==========================================
// DOM ELEMENTS
// ==========================================
const screens = {
  pinGate: document.getElementById('screen-pin-gate'),
  directory: document.getElementById('screen-directory'),
  login: document.getElementById('screen-login'),
  inbox: document.getElementById('screen-inbox')
};

const modals = {
  send: document.getElementById('modal-send-message'),
  success: document.getElementById('modal-success-sent'),
  share: document.getElementById('modal-share-card')
};

// ==========================================
// INISIALISASI APLIKASI
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
  initPinGate();
  initNavigation();
  initModals();
  initSearchAndFilter();
  initLoginForm();
  initInboxActions();
  initShareCard();

  // Muat data anggota
  await loadMembersData();

  // Cek sesi login & PIN tersimpan
  checkSession();
});

// Cek sesi sebelumnya di browser
function checkSession() {
  const pinUnlocked = sessionStorage.getItem('makrab_pin_unlocked');
  if (pinUnlocked === 'true') {
    state.isPinUnlocked = true;
  }

  const savedUser = sessionStorage.getItem('smensa_current_user');
  if (savedUser) {
    try {
      state.currentUser = JSON.parse(savedUser);
    } catch (e) {
      sessionStorage.removeItem('smensa_current_user');
    }
  }

  if (state.currentUser && state.isPinUnlocked) {
    showScreen('inbox');
    loadInboxMessages();
  } else if (state.isPinUnlocked) {
    showScreen('directory');
  } else {
    showScreen('pinGate');
  }
}

// Navigasi Screen
function showScreen(screenKey) {
  Object.values(screens).forEach(screen => {
    screen.classList.remove('active-view');
    screen.style.display = 'none';
  });

  const target = screens[screenKey];
  if (target) {
    target.style.display = 'block';
    // Timeout kecil untuk trigger CSS transition
    setTimeout(() => {
      target.classList.add('active-view');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 20);
  }
}

// ==========================================
// 1. GERBANG KEAMANAN PIN MAKRAB
// ==========================================
function initPinGate() {
  const pinForm = document.getElementById('form-pin-gate');
  const pinInput = document.getElementById('input-makrab-pin');
  const errorMsg = document.getElementById('pin-error-msg');
  const btnToggleEye = document.getElementById('btn-toggle-pin-visibility');

  // Toggle lihat PIN
  if (btnToggleEye && pinInput) {
    btnToggleEye.addEventListener('click', () => {
      const type = pinInput.getAttribute('type') === 'password' ? 'text' : 'password';
      pinInput.setAttribute('type', type);
    });
  }

  // Submit PIN
  pinForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const enteredPin = pinInput.value.trim();

    if (enteredPin === MAKRAB_PIN || enteredPin === 'makrab' || enteredPin === 'smensa') {
      state.isPinUnlocked = true;
      sessionStorage.setItem('makrab_pin_unlocked', 'true');
      errorMsg.style.display = 'none';

      // Efek visual sukses
      showToast('Kunci Terbuka! Selamat Datang di Makrab OSIS SMENSA 🌟', 'success');
      showScreen('directory');
    } else {
      errorMsg.style.display = 'block';
      pinInput.classList.add('error');
      pinInput.value = '';
      pinInput.focus();

      // Shake animation
      const card = document.querySelector('.pin-card');
      if (card) {
        card.style.animation = 'none';
        card.offsetHeight; // trigger reflow
        card.style.animation = 'shake 0.4s ease';
      }
    }
  });
}

// ==========================================
// 2. DIREKTORI PENGURUS OSIS
// ==========================================
async function loadMembersData() {
  try {
    const data = await getMembers();
    state.members = data;
    state.filteredMembers = data;
    
    // Update badge total
    const countBadge = document.getElementById('total-members-badge');
    if (countBadge) countBadge.textContent = `${data.length} Pengurus`;

    renderDepartmentFilterTabs();
    renderMembersGrid();
    populateLoginMemberSelect();
  } catch (err) {
    console.error('Gagal memuat anggota:', err);
    showToast('Gagal memuat data pengurus.', 'error');
  }
}

// Render Filter Chips Departemen
function renderDepartmentFilterTabs() {
  const container = document.getElementById('sie-filter-tabs');
  if (!container) return;

  container.innerHTML = '';
  DEPARTMENTS.forEach(dept => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = `chip-tab ${state.selectedDepartment === dept ? 'active' : ''}`;
    chip.textContent = dept;
    chip.addEventListener('click', () => {
      state.selectedDepartment = dept;
      document.querySelectorAll('.chip-tab').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      filterAndRenderMembers();
    });
    container.appendChild(chip);
  });
}

// Search & Filter
function initSearchAndFilter() {
  const searchInput = document.getElementById('input-search-members');
  const clearBtn = document.getElementById('btn-clear-search');
  const resetBtn = document.getElementById('btn-reset-filters');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value.toLowerCase().trim();
      clearBtn.style.display = state.searchQuery.length > 0 ? 'flex' : 'none';
      filterAndRenderMembers();
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      searchInput.value = '';
      state.searchQuery = '';
      clearBtn.style.display = 'none';
      filterAndRenderMembers();
      searchInput.focus();
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      state.searchQuery = '';
      state.selectedDepartment = 'Semua';
      if (searchInput) searchInput.value = '';
      if (clearBtn) clearBtn.style.display = 'none';
      document.querySelectorAll('.chip-tab').forEach((c, idx) => {
        c.classList.toggle('active', idx === 0);
      });
      filterAndRenderMembers();
    });
  }
}

function filterAndRenderMembers() {
  state.filteredMembers = state.members.filter(m => {
    const matchDept = state.selectedDepartment === 'Semua' || m.department === state.selectedDepartment;
    const matchQuery = !state.searchQuery || 
      m.name.toLowerCase().includes(state.searchQuery) ||
      m.position.toLowerCase().includes(state.searchQuery) ||
      m.class.toLowerCase().includes(state.searchQuery);
    return matchDept && matchQuery;
  });

  renderMembersGrid();
}

// Render Grid Kartu Anggota (2 Kolom di HP sesuai Mockup)
function renderMembersGrid() {
  const grid = document.getElementById('members-grid');
  const emptyState = document.getElementById('directory-empty-state');
  if (!grid) return;

  grid.innerHTML = '';

  if (state.filteredMembers.length === 0) {
    grid.style.display = 'none';
    if (emptyState) emptyState.style.display = 'block';
    return;
  }

  grid.style.display = 'grid';
  if (emptyState) emptyState.style.display = 'none';

  state.filteredMembers.forEach(member => {
    const card = document.createElement('div');
    card.className = 'member-card';

    // SVG Avatar Sesuai Gender & Style Mockup
    const avatarSvg = member.gender === 'male' 
      ? `<svg class="avatar-icon-svg" viewBox="0 0 24 24" fill="none" stroke="#0284C7" stroke-width="2">
           <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
           <circle cx="12" cy="7" r="4"></circle>
         </svg>`
      : `<svg class="avatar-icon-svg" viewBox="0 0 24 24" fill="none" stroke="#0284C7" stroke-width="2">
           <path d="M12 2a5 5 0 0 0-5 5v3a5 5 0 0 0 10 0V7a5 5 0 0 0-5-5z"></path>
           <path d="M18 21a6 6 0 0 0-12 0"></path>
         </svg>`;

    card.innerHTML = `
      <div class="member-avatar-box">
        ${avatarSvg}
      </div>
      <h3 class="member-name" title="${escapeHtml(member.name)}">${escapeHtml(member.name)}</h3>
      <span class="member-position">${escapeHtml(member.position)}</span>
      <span class="member-class-badge">${escapeHtml(member.class)}</span>
      <button type="button" class="btn-send-anon" data-member-id="${member.id}">
        KIRIM PESAN ANONIM
      </button>
    `;

    // Event kirim pesan
    const btnSend = card.querySelector('.btn-send-anon');
    btnSend.addEventListener('click', () => {
      openSendMessageModal(member);
    });

    grid.appendChild(card);
  });
}

// ==========================================
// 3. FORM & MODAL KIRIM PESAN ANONIM
// ==========================================
function openSendMessageModal(member) {
  state.targetRecipient = member;

  const recipientName = document.getElementById('modal-recipient-name');
  const recipientTag = document.getElementById('modal-recipient-tag');
  const recipientAvatar = document.getElementById('modal-recipient-avatar');
  const inputRecipientId = document.getElementById('input-recipient-id');
  const messageInput = document.getElementById('input-message-content');
  const charCounter = document.getElementById('char-counter');

  if (recipientName) recipientName.textContent = member.name;
  if (recipientTag) recipientTag.textContent = `${member.position} • ${member.class}`;
  if (inputRecipientId) inputRecipientId.value = member.id;
  if (messageInput) {
    messageInput.value = '';
    messageInput.focus();
  }
  if (charCounter) charCounter.textContent = '0 / 500';

  // Avatar Icon
  if (recipientAvatar) {
    recipientAvatar.innerHTML = member.gender === 'male'
      ? `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#0284C7" stroke-width="2">
           <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
           <circle cx="12" cy="7" r="4"></circle>
         </svg>`
      : `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#0284C7" stroke-width="2">
           <path d="M12 2a5 5 0 0 0-5 5v3a5 5 0 0 0 10 0V7a5 5 0 0 0-5-5z"></path>
           <path d="M18 21a6 6 0 0 0-12 0"></path>
         </svg>`;
  }

  modals.send.style.display = 'flex';
}

function initModals() {
  // Tutup Modal Kirim
  const btnCloseSend = document.getElementById('btn-close-send-modal');
  const btnCancelSend = document.getElementById('btn-cancel-send');
  if (btnCloseSend) btnCloseSend.addEventListener('click', () => modals.send.style.display = 'none');
  if (btnCancelSend) btnCancelSend.addEventListener('click', () => modals.send.style.display = 'none');

  // Counter Karakter & Prompt Cepat
  const messageInput = document.getElementById('input-message-content');
  const charCounter = document.getElementById('char-counter');
  if (messageInput && charCounter) {
    messageInput.addEventListener('input', () => {
      charCounter.textContent = `${messageInput.value.length} / 500`;
    });
  }

  // Chips inspirasi cepat
  document.querySelectorAll('.chip-prompt').forEach(chip => {
    chip.addEventListener('click', () => {
      const promptText = chip.getAttribute('data-prompt');
      if (messageInput) {
        messageInput.value = promptText;
        messageInput.focus();
        if (charCounter) charCounter.textContent = `${promptText.length} / 500`;
      }
    });
  });

  // Submit Kirim Pesan
  const formSend = document.getElementById('form-send-anonymous');
  const btnSubmitSend = document.getElementById('btn-confirm-send');

  if (formSend) {
    formSend.addEventListener('submit', async (e) => {
      e.preventDefault();
      const content = messageInput.value.trim();
      const recipientId = document.getElementById('input-recipient-id').value;

      if (!content) {
        showToast('Tulis pesanmu terlebih dahulu ya!', 'error');
        return;
      }

      btnSubmitSend.disabled = true;
      btnSubmitSend.innerHTML = `<span>Mengirim...</span>`;

      try {
        await sendAnonymousMessage(recipientId, content);

        // Tutup modal kirim
        modals.send.style.display = 'none';

        // Efek Confetti Seru!
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });

        // Tampilkan modal sukses
        const successTarget = document.getElementById('success-target-text');
        if (successTarget && state.targetRecipient) {
          successTarget.textContent = `Pesanmu sudah tersimpan aman di inboks rahasia ${state.targetRecipient.name}.`;
        }
        modals.success.style.display = 'flex';
      } catch (err) {
        console.error('Gagal mengirim pesan:', err);
        showToast(err.message || 'Gagal mengirim pesan.', 'error');
      } finally {
        btnSubmitSend.disabled = false;
        btnSubmitSend.innerHTML = `
          <span>KIRIM PESAN ANONIM</span>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        `;
      }
    });
  }

  // Tutup Modal Sukses
  const btnCloseSuccess = document.getElementById('btn-close-success');
  if (btnCloseSuccess) {
    btnCloseSuccess.addEventListener('click', () => {
      modals.success.style.display = 'none';
    });
  }
}

// ==========================================
// 4. LOGIN PENGURUS
// ==========================================
function initNavigation() {
  // Tombol Login dari Header & Floating Dock
  const btnNavLogin = document.getElementById('btn-nav-login');
  const btnFloatingLogin = document.getElementById('btn-floating-login');
  const btnBackToDir = document.getElementById('btn-back-to-directory');

  if (btnNavLogin) {
    btnNavLogin.addEventListener('click', () => {
      if (state.currentUser) {
        showScreen('inbox');
        loadInboxMessages();
      } else {
        showScreen('login');
      }
    });
  }

  if (btnFloatingLogin) {
    btnFloatingLogin.addEventListener('click', () => {
      if (state.currentUser) {
        showScreen('inbox');
        loadInboxMessages();
      } else {
        showScreen('login');
      }
    });
  }

  if (btnBackToDir) {
    btnBackToDir.addEventListener('click', () => {
      showScreen('directory');
    });
  }
}

function populateLoginMemberSelect() {
  const select = document.getElementById('login-member-select');
  if (!select) return;

  select.innerHTML = '<option value="" disabled selected>-- Pilih Namamu dari Daftar --</option>';
  
  // Kelompokkan per Sie
  DEPARTMENTS.filter(d => d !== 'Semua').forEach(dept => {
    const optGroup = document.createElement('optgroup');
    optGroup.label = dept;

    const deptMembers = state.members.filter(m => m.department === dept);
    deptMembers.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = `${m.name} (${m.position} - ${m.class})`;
      optGroup.appendChild(opt);
    });

    select.appendChild(optGroup);
  });
}

function initLoginForm() {
  const form = document.getElementById('form-login-pengurus');
  const selectMember = document.getElementById('login-member-select');
  const inputPassword = document.getElementById('input-login-password');
  const errorBox = document.getElementById('login-error-msg');
  const btnToggleEye = document.getElementById('btn-toggle-login-pass');

  if (btnToggleEye && inputPassword) {
    btnToggleEye.addEventListener('click', () => {
      const type = inputPassword.getAttribute('type') === 'password' ? 'text' : 'password';
      inputPassword.setAttribute('type', type);
    });
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const memberId = selectMember.value;
      const enteredPassword = inputPassword.value.trim();

      if (!memberId) {
        showToast('Pilih namamu terlebih dahulu!', 'error');
        return;
      }

      const selectedMember = state.members.find(m => m.id === memberId);
      if (!selectedMember) return;

      // Cek password (menerima password anggota, default 'osis2025', atau '2025')
      const isValid = 
        enteredPassword === selectedMember.password ||
        enteredPassword === 'osis2025' ||
        enteredPassword === '2025';

      if (isValid) {
        errorBox.style.display = 'none';
        state.currentUser = selectedMember;
        sessionStorage.setItem('smensa_current_user', JSON.stringify(selectedMember));

        showToast(`Selamat datang, ${selectedMember.name}! 👋`, 'success');
        showScreen('inbox');
        loadInboxMessages();
      } else {
        errorBox.style.display = 'block';
        inputPassword.value = '';
        inputPassword.focus();
      }
    });
  }
}

// ==========================================
// 5. INBOKS PRIBADI (PRIVATE DASHBOARD)
// ==========================================
function initInboxActions() {
  const btnBack = document.getElementById('btn-inbox-back');
  const btnLogout = document.getElementById('btn-logout-inbox');
  const btnShareLink = document.getElementById('btn-inbox-share-link');

  if (btnBack) {
    btnBack.addEventListener('click', () => {
      showScreen('directory');
    });
  }

  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      if (confirm('Yakin ingin keluar dari inboks pribadimu?')) {
        state.currentUser = null;
        sessionStorage.removeItem('smensa_current_user');
        if (state.realtimeChannel) {
          state.realtimeChannel.unsubscribe();
          state.realtimeChannel = null;
        }
        showToast('Berhasil keluar.', 'info');
        showScreen('directory');
      }
    });
  }

  if (btnShareLink) {
    btnShareLink.addEventListener('click', () => {
      showScreen('directory');
    });
  }
}

async function loadInboxMessages() {
  if (!state.currentUser) return;

  // Set Nama Pengurus di Header Inboks sesuai Mockup: [BAYU AJI PRASETYA]
  const nameBadge = document.getElementById('inbox-member-name-badge');
  if (nameBadge) {
    nameBadge.textContent = `[${state.currentUser.name.toUpperCase()}]`;
  }

  // Update Preview Sticky Note di Bawah
  const noteRecipient = document.getElementById('note-preview-recipient');
  if (noteRecipient) {
    const firstName = state.currentUser.name.split(' ')[0].toUpperCase();
    noteRecipient.textContent = `UNTUK: ${firstName}`;
  }

  try {
    const msgs = await getMessagesForMember(state.currentUser.id);
    state.messages = msgs || [];
    renderInboxMessages();
  } catch (err) {
    console.error('Gagal mengambil pesan inboks:', err);
    showToast('Gagal memuat pesan inboks.', 'error');
  }

  // Aktifkan Realtime Subscription
  setupRealtimeInbox();
}

function setupRealtimeInbox() {
  if (!state.currentUser) return;

  // Bersihkan subscription sebelumnya jika ada
  if (state.realtimeChannel) {
    state.realtimeChannel.unsubscribe();
  }

  // Subscribe ke Supabase Realtime
  state.realtimeChannel = subscribeToMessages(state.currentUser.id, (newMsg) => {
    handleNewIncomingMessage(newMsg);
  });

  // Listener untuk local testing fallback
  window.removeEventListener('smensa_local_message', onLocalMessageReceived);
  window.addEventListener('smensa_local_message', onLocalMessageReceived);
}

function onLocalMessageReceived(e) {
  const msg = e.detail;
  if (state.currentUser && msg && msg.recipient_id === state.currentUser.id) {
    handleNewIncomingMessage(msg);
  }
}

function handleNewIncomingMessage(newMsg) {
  // Cek duplikasi ID
  if (state.messages.some(m => m.id === newMsg.id)) return;

  // Tambahkan di urutan paling atas
  state.messages.unshift(newMsg);
  renderInboxMessages();

  // Play gentle notification sound
  playNotificationSound();

  // Tampilkan notifikasi toast realtime
  showToast('Pesan anonim baru saja masuk! 📬', 'info');
}

function playNotificationSound() {
  try {
    const audio = document.getElementById('sound-notification');
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    }
  } catch (e) {}
}

function renderInboxMessages() {
  const container = document.getElementById('inbox-messages-list');
  const emptyState = document.getElementById('inbox-empty-state');
  const unreadCountBadge = document.getElementById('unread-count-badge');
  const unreadPill = document.getElementById('inbox-unread-text');
  const noteSampleText = document.getElementById('note-preview-quote');

  if (!container) return;
  container.innerHTML = '';

  const unreadCount = state.messages.filter(m => !m.is_read).length;
  
  if (unreadCountBadge) unreadCountBadge.textContent = unreadCount;
  if (unreadPill) unreadPill.textContent = `${unreadCount} UNREAD`;

  // Update sample text di sticky note preview
  if (noteSampleText) {
    if (state.messages.length > 0) {
      noteSampleText.textContent = `"${state.messages[0].content}"`;
    } else {
      noteSampleText.textContent = `"Pesan anonim akan muncul di sini secara real-time!"`;
    }
  }

  if (state.messages.length === 0) {
    container.style.display = 'none';
    if (emptyState) emptyState.style.display = 'block';
    return;
  }

  container.style.display = 'flex';
  if (emptyState) emptyState.style.display = 'none';

  state.messages.forEach(msg => {
    const bubble = document.createElement('div');
    bubble.className = `message-bubble-card ${msg.is_read ? 'read' : 'unread'}`;

    const formattedTime = formatMessageTime(msg.created_at);

    bubble.innerHTML = `
      <div class="message-card-top">
        <div class="msg-sender-avatar">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
        </div>
        <div class="msg-meta-info">
          <span class="msg-sender-title">Pengirim Anonim 🤫</span>
          <span class="msg-timestamp">${formattedTime}</span>
        </div>
        ${!msg.is_read ? '<span class="msg-unread-dot" title="Belum dibaca"></span>' : ''}
      </div>

      <div class="msg-content-text">${escapeHtml(msg.content)}</div>

      <div class="msg-actions-row">
        <button type="button" class="btn-msg-action btn-toggle-read" title="${msg.is_read ? 'Tandai belum dibaca' : 'Tandai sudah dibaca'}">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span>${msg.is_read ? 'Belum Dibaca' : 'Sudah Dibaca'}</span>
        </button>

        <button type="button" class="btn-msg-action btn-share-this" title="Bagikan kartu pesan ini">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
            <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
            <circle cx="9" cy="9" r="2"/>
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
          </svg>
          <span>Bagikan</span>
        </button>

        <button type="button" class="btn-msg-action delete btn-delete-msg" title="Hapus pesan ini">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
          </svg>
          <span>Hapus</span>
        </button>
      </div>
    `;

    // Action toggle read
    const btnToggle = bubble.querySelector('.btn-toggle-read');
    btnToggle.addEventListener('click', async () => {
      await toggleMessageReadStatus(msg.id, msg.is_read);
      msg.is_read = !msg.is_read;
      renderInboxMessages();
    });

    // Action share this single message
    const btnShare = bubble.querySelector('.btn-share-this');
    btnShare.addEventListener('click', () => {
      openShareModalWithMessage(msg.id);
    });

    // Action delete
    const btnDelete = bubble.querySelector('.btn-delete-msg');
    btnDelete.addEventListener('click', async () => {
      if (confirm('Hapus pesan anonim ini?')) {
        await deleteMessage(msg.id);
        state.messages = state.messages.filter(m => m.id !== msg.id);
        renderInboxMessages();
        showToast('Pesan dihapus.', 'info');
      }
    });

    container.appendChild(bubble);
  });
}

// ==========================================
// 6. SCREENSHOT / BAGIKAN KARTU PESAN ESTETIK
// ==========================================
function initShareCard() {
  const btnOpenShare = document.getElementById('btn-open-share-card');
  const noteTrigger = document.getElementById('note-preview-trigger');
  const btnCloseModal = document.getElementById('btn-close-share-modal');
  const selectMsg = document.getElementById('select-message-to-share');
  const btnDownloadPng = document.getElementById('btn-download-card-png');
  const btnCopyText = document.getElementById('btn-copy-message-text');

  if (btnOpenShare) {
    btnOpenShare.addEventListener('click', () => openShareModalWithMessage());
  }

  if (noteTrigger) {
    noteTrigger.addEventListener('click', () => openShareModalWithMessage());
  }

  if (btnCloseModal) {
    btnCloseModal.addEventListener('click', () => modals.share.style.display = 'none');
  }

  if (selectMsg) {
    selectMsg.addEventListener('change', () => {
      const selectedId = selectMsg.value;
      const targetMsg = state.messages.find(m => m.id === selectedId);
      updateShareCardContent(targetMsg);
    });
  }

  // Unduh Gambar PNG dengan html2canvas
  if (btnDownloadPng) {
    btnDownloadPng.addEventListener('click', async () => {
      const targetElement = document.getElementById('capture-target-card');
      if (!targetElement) return;

      btnDownloadPng.disabled = true;
      btnDownloadPng.innerHTML = `<span>Menyiapkan Gambar...</span>`;

      try {
        const canvas = await html2canvas(targetElement, {
          scale: 2.5,
          useCORS: true,
          backgroundColor: null,
          logging: false
        });

        const image = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = image;
        link.download = `Pesan-Makrab-${state.currentUser?.name?.replace(/\s+/g, '-') || 'OSIS'}.png`;
        link.click();

        showToast('Kartu berhasil diunduh! Siap diposting ke Story 📸', 'success');
      } catch (err) {
        console.error('html2canvas error:', err);
        showToast('Gagal membuat gambar.', 'error');
      } finally {
        btnDownloadPng.disabled = false;
        btnDownloadPng.innerHTML = `
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          <span>Unduh Gambar (PNG)</span>
        `;
      }
    });
  }

  // Salin Teks
  if (btnCopyText) {
    btnCopyText.addEventListener('click', () => {
      const content = document.getElementById('story-message-content')?.textContent?.trim();
      if (content) {
        navigator.clipboard.writeText(`"${content}" - Pesan Anonim Makrab OSIS SMENSA 2025/2026`).then(() => {
          showToast('Teks pesan berhasil disalin ke clipboard! 📋', 'success');
        });
      }
    });
  }
}

function openShareModalWithMessage(preselectMessageId = null) {
  if (state.messages.length === 0) {
    showToast('Belum ada pesan di inboksmu untuk dibagikan!', 'error');
    return;
  }

  const select = document.getElementById('select-message-to-share');
  if (select) {
    select.innerHTML = '';
    state.messages.forEach((msg, idx) => {
      const opt = document.createElement('option');
      opt.value = msg.id;
      const snippet = msg.content.length > 40 ? msg.content.substring(0, 40) + '...' : msg.content;
      opt.textContent = `Pesan #${idx + 1}: ${snippet}`;
      select.appendChild(opt);
    });

    if (preselectMessageId) {
      select.value = preselectMessageId;
    }
  }

  const targetMsg = preselectMessageId 
    ? state.messages.find(m => m.id === preselectMessageId)
    : state.messages[0];

  updateShareCardContent(targetMsg);
  modals.share.style.display = 'flex';
}

function updateShareCardContent(msg) {
  if (!msg) return;

  const quoteEl = document.getElementById('story-message-content');
  const recipientEl = document.getElementById('story-recipient-name');
  const dateEl = document.getElementById('story-card-date');

  if (quoteEl) quoteEl.textContent = msg.content;
  if (recipientEl && state.currentUser) {
    recipientEl.textContent = state.currentUser.name.toUpperCase();
  }
  if (dateEl) {
    dateEl.textContent = formatCardDate(msg.created_at);
  }
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================
function formatMessageTime(isoString) {
  if (!isoString) return 'Baru saja';
  try {
    const d = new Date(isoString);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();

    const timeStr = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    if (isToday) {
      return `${timeStr} WIB`;
    }
    const dateStr = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    return `${dateStr}, ${timeStr}`;
  } catch (e) {
    return 'Baru saja';
  }
}

function formatCardDate(isoString) {
  try {
    const d = isoString ? new Date(isoString) : new Date();
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch (e) {
    return '2025/2026';
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Toast Notifications
export function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const icon = type === 'success' ? '✅' : type === 'error' ? '⚠️' : 'ℹ️';

  toast.innerHTML = `
    <span>${icon}</span>
    <span>${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    toast.style.transition = 'all 0.25s ease';
    setTimeout(() => toast.remove(), 250);
  }, 3500);
}
