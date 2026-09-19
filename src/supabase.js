import { createClient } from '@supabase/supabase-js';
import { INITIAL_MEMBERS } from './data/members.js';

export const SUPABASE_URL = 'https://ebzoaaolvhhlcqyzygnr.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_J0r6JF1Bn23qQ_MoLHgTtg_8d-1zwMn';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: false
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Helper status koneksi
let isOnlineWithSupabase = false;

export async function checkDatabaseHealth() {
  try {
    const { data, error } = await supabase.from('members').select('id').limit(1);
    if (!error && data) {
      isOnlineWithSupabase = true;
      return { connected: true, hasTables: true };
    }
    return { connected: true, hasTables: false, error: error?.message };
  } catch (err) {
    return { connected: false, error: err.message };
  }
}

// 1. Fetch seluruh anggota OSIS
export async function getMembers() {
  try {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .order('name', { ascending: true });

    if (!error && data && data.length > 0) {
      isOnlineWithSupabase = true;
      return data;
    }

    // Jika tabel kosong di Supabase, coba bantu auto-seed
    if (!error && data && data.length === 0) {
      console.log('Tabel members kosong, mencoba melakukan auto-seed...');
      await seedMembersToSupabase();
      const retry = await supabase.from('members').select('*').order('name', { ascending: true });
      if (retry.data && retry.data.length > 0) return retry.data;
    }
  } catch (err) {
    console.warn('Gagal memuat dari Supabase, beralih ke data lokal:', err);
  }

  // Fallback ke data lokal jika Supabase belum dimigrasi
  return getLocalMembers();
}

// Helper auto-seed jika tabel members sudah ada tapi kosong
async function seedMembersToSupabase() {
  try {
    const seedData = INITIAL_MEMBERS.map(m => ({
      name: m.name,
      position: m.position,
      class: m.class,
      department: m.department,
      gender: m.gender,
      password: m.password
    }));
    await supabase.from('members').insert(seedData);
  } catch (e) {
    console.error('Auto-seed error:', e);
  }
}

// 2. Kirim pesan anonim
export async function sendAnonymousMessage(recipientId, content) {
  if (!content || !content.trim()) {
    throw new Error('Pesan tidak boleh kosong!');
  }

  try {
    const { data, error } = await supabase
      .from('messages')
      .insert([
        {
          recipient_id: recipientId,
          content: content.trim(),
          is_read: false
        }
      ])
      .select();

    if (error) throw error;
    return { success: true, data: data?.[0] };
  } catch (err) {
    console.warn('Supabase insert error, menyimpan ke penyimpanan lokal cadangan:', err);
    // Simpan ke local storage agar UX tetap mulus jika tabel belum aktif
    const localMsg = saveLocalMessage(recipientId, content.trim());
    return { success: true, data: localMsg, fallback: true };
  }
}

// 3. Ambil inboks pesan untuk anggota tertentu
export async function getMessagesForMember(memberId) {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('recipient_id', memberId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      return data;
    }
  } catch (err) {
    console.warn('Supabase fetch messages error, membaca penyimpanan lokal:', err);
  }

  // Fallback lokal
  return getLocalMessages(memberId);
}

// 4. Update status pesan (tanda sudah dibaca / belum dibaca)
export async function toggleMessageReadStatus(messageId, currentStatus) {
  try {
    const { error } = await supabase
      .from('messages')
      .update({ is_read: !currentStatus })
      .eq('id', messageId);

    if (error) throw error;
  } catch (err) {
    console.warn('Supabase update read status error:', err);
    toggleLocalMessageRead(messageId);
  }
}

// 5. Hapus pesan
export async function deleteMessage(messageId) {
  try {
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId);

    if (error) throw error;
  } catch (err) {
    console.warn('Supabase delete message error:', err);
    deleteLocalMessage(messageId);
  }
}

// 6. Supabase Realtime Subscription
export function subscribeToMessages(memberId, onNewMessage) {
  try {
    const channelName = `realtime-messages-${memberId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${memberId}`
        },
        payload => {
          console.log('Realtime pesan baru masuk:', payload);
          if (onNewMessage && payload.new) {
            onNewMessage(payload.new);
          }
        }
      )
      .subscribe((status) => {
        console.log(`Status Realtime Channel [${channelName}]:`, status);
      });

    return channel;
  } catch (err) {
    console.warn('Realtime subscription error:', err);
    return null;
  }
}

// 7. Update Password / PIN Pengurus
export async function updateMemberPassword(memberId, newPassword) {
  if (!newPassword || newPassword.length < 4) {
    throw new Error('Password baru minimal 4 karakter!');
  }

  try {
    const { data, error } = await supabase
      .from('members')
      .update({ password: newPassword })
      .eq('id', memberId)
      .select();

    if (error) throw error;

    // Update penyimpanan lokal cadangan
    updateLocalMemberPassword(memberId, newPassword);

    return { success: true, data: data?.[0] };
  } catch (err) {
    console.warn('Supabase update password error, memperbarui penyimpanan lokal:', err);
    const localUpdated = updateLocalMemberPassword(memberId, newPassword);
    if (!localUpdated && err) {
      throw err;
    }
    return { success: true, fallback: true };
  }
}

// ==========================================
// LOCAL STORAGE RESILIENCE HELPERS
// Menjamin aplikasi 100% dapat dicoba langsung
// ==========================================

function getLocalMembers() {
  const stored = localStorage.getItem('smensa_members');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      // fallback
    }
  }
  localStorage.setItem('smensa_members', JSON.stringify(INITIAL_MEMBERS));
  return INITIAL_MEMBERS;
}

function getLocalMessages(memberId) {
  const all = JSON.parse(localStorage.getItem('smensa_messages') || '[]');
  return all
    .filter(m => m.recipient_id === memberId)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

function saveLocalMessage(recipientId, content) {
  const all = JSON.parse(localStorage.getItem('smensa_messages') || '[]');
  const newMsg = {
    id: 'local-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
    recipient_id: recipientId,
    content: content,
    created_at: new Date().toISOString(),
    is_read: false
  };
  all.push(newMsg);
  localStorage.setItem('smensa_messages', JSON.stringify(all));
  
  // Trigger custom event untuk local realtime
  window.dispatchEvent(new CustomEvent('smensa_local_message', { detail: newMsg }));
  return newMsg;
}

function toggleLocalMessageRead(messageId) {
  const all = JSON.parse(localStorage.getItem('smensa_messages') || '[]');
  const idx = all.findIndex(m => m.id === messageId);
  if (idx !== -1) {
    all[idx].is_read = !all[idx].is_read;
    localStorage.setItem('smensa_messages', JSON.stringify(all));
  }
}

function deleteLocalMessage(messageId) {
  const all = JSON.parse(localStorage.getItem('smensa_messages') || '[]');
  const filtered = all.filter(m => m.id !== messageId);
  localStorage.setItem('smensa_messages', JSON.stringify(filtered));
}

function updateLocalMemberPassword(memberId, newPassword) {
  const all = JSON.parse(localStorage.getItem('smensa_members') || '[]');
  const idx = all.findIndex(m => m.id === memberId);
  if (idx !== -1) {
    all[idx].password = newPassword;
    localStorage.setItem('smensa_members', JSON.stringify(all));
    return true;
  }
  return false;
}
