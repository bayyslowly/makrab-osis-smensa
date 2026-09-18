# 💌 Web App Pesan Anonim Makrab OSIS SMENSA
### SMK Negeri 1 Banyumas — Periode 2025/2026

Aplikasi web pesan anonim (mirip NGL) yang dirancang khusus untuk memeriahkan acara **Malam Keakraban (Makrab) OSIS SMENSA SMK Negeri 1 Banyumas**. Dilengkapi sistem keamanan dua tingkat, inboks pribadi real-time berbasis Supabase, dan fitur unduh kartu pesan estetik untuk Story WhatsApp / Instagram.

---

## 🌟 Fitur Utama

1. **Keamanan Dua Tingkat:**
   - **Gerbang Keamanan PIN Makrab:** Wajib memasukkan PIN Makrab umum (**`2025`**) untuk membuka akses direktori website.
   - **Otentikasi Personal (Login Pengurus):** Setiap pengurus OSIS dapat login ke inboks pribadinya menggunakan nama pengurus dan PIN pribadi default (**`osis2025`** atau **`2025`**).

2. **Direktori Pengurus OSIS (Publik / Kirim):**
   - Menampilkan kartu 53 seluruh pengurus OSIS SMENSA lengkap dengan nama, jabatan, kelas, dan Sie/Departemen.
   - Fitur pencarian instan berdasarkan nama, kelas, maupun jabatan.
   - Filter tab horizontal berdasarkan Sie (Pengurus Inti, Sie 1 s.d. Sie 10).
   - Tombol **"KIRIM PESAN ANONIM"** pada setiap kartu pengurus.

3. **Kirim Pesan Anonim (Mirip NGL):**
   - Modal popup responsif dengan informasi pengurus tujuan.
   - Pilihan inspirasi pesan cepat untuk mempermudah pengiriman.
   - Counter karakter (maksimal 500 karakter).
   - Efek animasi confetti saat pesan berhasil terkirim.
   - **100% Rahasia & Privasi Terjaga:** Isi pesan tidak pernah ditampilkan di halaman publik, hanya masuk ke inboks pribadi penerima.

4. **Inboks Pribadi (Private Dashboard):**
   - Akses eksklusif hanya untuk pengurus yang telah login.
   - Indikator pesan belum dibaca (*Unread Badge*) dan jumlah total unread.
   - **Supabase Realtime Subscription:** Pesan anonim baru langsung muncul secara *real-time* di inboks tanpa perlu memuat ulang halaman, lengkap dengan nada dering notifikasi halus dan toast alert.
   - Opsi tandai pesan sudah/belum dibaca dan hapus pesan.

5. **Screenshot / Bagikan Kartu Pesan Estetik:**
   - Menghasilkan kartu digital estetik bertema Makrab OSIS SMENSA (dengan aksen selotip, kutipan, dan watermark OSIS SMENSA).
   - Satu-klik unduh gambar resolusi tinggi format PNG menggunakan `html2canvas` siap unggah ke Story WhatsApp / Instagram.
   - Tombol salin teks pesan ke clipboard.

---

## 🗄️ Setup Backend Supabase

1. Buka dashboard proyek Supabase Anda:
   - URL: `https://ebzoaaolvhhlcqyzygnr.supabase.co`
2. Masuk ke menu **SQL Editor** di panel sebelah kiri.
3. Buka file [`supabase-setup.sql`](./supabase-setup.sql) yang ada di folder ini.
4. Salin seluruh isi SQL script tersebut dan tempelkan ke Supabase SQL Editor.
5. Klik tombol **Run** (Jalankan). Script ini secara otomatis akan:
   - Membuat tabel `members` dan tabel `messages` beserta relasinya.
   - Mengaktifkan Row Level Security (RLS) dengan kebijakan akses yang aman.
   - Mengaktifkan **Supabase Realtime** pada tabel `messages`.
   - Mengisi data awal (*data seeding*) seluruh 53 pengurus OSIS SMENSA.

---

## 🚀 Cara Menjalankan di Komputer / Laptop

Pastikan Anda telah menginstal **Node.js** (v18 ke atas disarankan).

1. Buka terminal pada folder proyek ini.
2. Instal dependensi:
   ```bash
   npm install
   ```
3. Jalankan server pengembangan (development):
   ```bash
   npm run dev
   ```
4. Buka tautan yang muncul di terminal (biasanya `http://localhost:5173`) di browser Anda atau browser HP (melalui IP lokal).

---

## 🔑 Informasi Akses & Akun

- **PIN Makrab (Gerbang Awal):** `2025` (atau ketik `makrab`)
- **Login Pengurus (Username):** Pilih nama Anda dari daftar dropdown struktur pengurus OSIS.
- **PIN Pribadi Pengurus (Default):** `osis2025` atau `2025`

---

## 👥 Struktur 53 Pengurus OSIS SMENSA (2025/2026)

- **Pengurus Inti (10):** Bayu Aji Prasetya (Ketua Umum), Quinsha Pramodyawardani (Ketua), Muhammad Khafidz Ramdani (Ketua), Afriluffy Shifana Hafshah (Sekretaris Umum), Amelia Arzety, Bunga Nazwa Ariesta, Amanda Salsabila, Khazaisya Khairia Sabilla (Bendahara Umum), Naaila Faizah Rozan, Anggita Talitha Sakhi.
- **Sie 1 - Keimanan & Ketakwaan (4):** Azizah Nur Ishma (Ketua Sie), Hamdan Allmashah, Lutfi Putra Pratama, Naila Paradista.
- **Sie 2 - Budi Pekerti & Akhlak Mulia (5):** Milka Exodia Nauli Tampubolon (Ketua Sie), Mei Nur Khasanah, Tri Wulandari, Umniyyah Alya Mukhbita, Putri Eka Rahmadani.
- **Sie 3 - Kebangsaan & Bela Negara (4):** Muflihah Khoerunnisa (Ketua Sie), Alya Ahtahya Maharani, Wendi Martin Zada, Aisyah Maharani.
- **Sie 4 - Akademik, Seni & Olahraga (5):** Vico Evrat Anargya (Ketua Sie), Khansa Artika Listy, Muhammad Taufik Maulana, Nazwa Diva Nofiyanti, Felytha Chandra Giarti.
- **Sie 5 - Demokrasi & Toleransi Sosial (4):** Adelia Arzety (Ketua Sie), Dwi Zaharttu Sagita, Elfa Liana Putri, Salsabila Nadhifah.
- **Sie 6 - Kreativitas & Kewirausahaan (3):** Shintia Kholifahtun Jannah (Ketua Sie), Dita Pranegara, Rizky Anindya Safira.
- **Sie 7 - Kesehatan & Gizi (4):** Gita Dian Prasasti (Ketua Sie), Valencia Mauliddina Syahniar, Sabila Putri Almadhani, Thalita Rui Khasanah.
- **Sie 8 - Sastra & Budaya (4):** Earlia Mutiara Ramadhani (Ketua Sie), Desta Silvy Fadilah, Ame Santila Evi, Revalina Kirana Putri.
- **Sie 9 - TIK (5):** Trista Varensya (Ketua Sie), Trandwika Hestu Sundoro, Alfira Nayla Putri, Alvi Isyana Paramesti, Khusi Murnias Widodo.
- **Sie 10 - Bahasa Inggris (5):** Carissa Pabha Jivita (Ketua Sie), Aghnia Rizka Agustina, Hafidza Arafah, Syifa Nur Rahmah, Zilfia Indi Mecca.
