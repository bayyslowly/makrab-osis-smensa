-- =======================================================
-- SQL SETUP: MAKRAB OSIS SMENSA (SMK NEGERI 1 BANYUMAS)
-- Jalankan script ini di Supabase SQL Editor (Dashboard Supabase -> SQL Editor)
-- =======================================================

-- 1. Buat Tabel `members`
CREATE TABLE IF NOT EXISTS public.members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    position VARCHAR(100) NOT NULL,
    class VARCHAR(50) NOT NULL,
    department VARCHAR(150) NOT NULL,
    password VARCHAR(100) NOT NULL DEFAULT 'osis2025',
    gender VARCHAR(10) DEFAULT 'female',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Buat Tabel `messages`
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    is_read BOOLEAN NOT NULL DEFAULT FALSE
);

-- Indexing untuk query cepat
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON public.messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_members_name ON public.members(name);

-- 3. Aktifkan Row Level Security (RLS)
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 4. Buat Policy agar web app dapat membaca & menulis data dengan anon key
-- Policy untuk `members`
DROP POLICY IF EXISTS "Public can view all members" ON public.members;
CREATE POLICY "Public can view all members" 
ON public.members FOR SELECT 
TO anon, authenticated 
USING (true);

DROP POLICY IF EXISTS "Allow member update own password" ON public.members;
CREATE POLICY "Allow member update own password" 
ON public.members FOR UPDATE 
TO anon, authenticated 
USING (true);

-- Policy untuk `messages`
DROP POLICY IF EXISTS "Public can insert messages" ON public.messages;
CREATE POLICY "Public can insert messages" 
ON public.messages FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

DROP POLICY IF EXISTS "Public can view messages" ON public.messages;
CREATE POLICY "Public can view messages" 
ON public.messages FOR SELECT 
TO anon, authenticated 
USING (true);

DROP POLICY IF EXISTS "Public can update message read status" ON public.messages;
CREATE POLICY "Public can update message read status" 
ON public.messages FOR UPDATE 
TO anon, authenticated 
USING (true);

DROP POLICY IF EXISTS "Public can delete messages" ON public.messages;
CREATE POLICY "Public can delete messages" 
ON public.messages FOR DELETE 
TO anon, authenticated 
USING (true);

-- 5. Aktifkan Supabase Realtime Subscription pada tabel `messages`
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    END IF;
END $$;

-- 6. DATA SEEDING PENGURUS OSIS SMENSA (53 Anggota)
-- Hapus data lama jika ada agar bersih (idempotent)
TRUNCATE TABLE public.messages CASCADE;
TRUNCATE TABLE public.members CASCADE;

INSERT INTO public.members (name, position, class, department, password, gender) VALUES
-- [Pengurus Inti]
('Bayu Aji Prasetya', 'Ketua Umum', 'XI TJKT 1', 'Pengurus Inti', 'osis2025', 'male'),
('Quinsha Pramodyawardani', 'Ketua', 'XI DKV 3', 'Pengurus Inti', 'osis2025', 'female'),
('Muhammad Khafidz Ramdani', 'Ketua', 'X DKV 1', 'Pengurus Inti', 'osis2025', 'male'),
('Afriluffy Shifana Hafshah', 'Sekretaris Umum', 'XI MPLB 2', 'Pengurus Inti', 'osis2025', 'female'),
('Amelia Arzety', 'Sekretaris', 'XI MPLB 3', 'Pengurus Inti', 'osis2025', 'female'),
('Bunga Nazwa Ariesta', 'Sekretaris', 'X MPLB 2', 'Pengurus Inti', 'osis2025', 'female'),
('Amanda Salsabila', 'Sekretaris', 'X MPLB 3', 'Pengurus Inti', 'osis2025', 'female'),
('Khazaisya Khairia Sabilla', 'Bendahara Umum', 'XI AKL 3', 'Pengurus Inti', 'osis2025', 'female'),
('Naaila Faizah Rozan', 'Bendahara', 'X AKL 2', 'Pengurus Inti', 'osis2025', 'female'),
('Anggita Talitha Sakhi', 'Bendahara', 'X AKL 3', 'Pengurus Inti', 'osis2025', 'female'),

-- [Sie 1: Pembinaan Keimanan dan Ketakwaan Terhadap Tuhan yang Maha Esa]
('Azizah Nur Ishma', 'Ketua Sie 1', 'XI MPLB 2', 'Sie 1: Keimanan & Ketakwaan', 'osis2025', 'female'),
('Hamdan Allmashah', 'Anggota Sie 1', 'XI TJKT 1', 'Sie 1: Keimanan & Ketakwaan', 'osis2025', 'male'),
('Lutfi Putra Pratama', 'Anggota Sie 1', 'X TJKT 2', 'Sie 1: Keimanan & Ketakwaan', 'osis2025', 'male'),
('Naila Paradista', 'Anggota Sie 1', 'X MPLB 2', 'Sie 1: Keimanan & Ketakwaan', 'osis2025', 'female'),

-- [Sie 2: Pembinaan Budi Pekerti Luhur atau Akhlak Mulia]
('Milka Exodia Nauli Tampubolon', 'Ketua Sie 2', 'XI AKL 2', 'Sie 2: Budi Pekerti & Akhlak Mulia', 'osis2025', 'female'),
('Mei Nur Khasanah', 'Anggota Sie 2', 'XI AKL 1', 'Sie 2: Budi Pekerti & Akhlak Mulia', 'osis2025', 'female'),
('Tri Wulandari', 'Anggota Sie 2', 'X AKL 3', 'Sie 2: Budi Pekerti & Akhlak Mulia', 'osis2025', 'female'),
('Umniyyah Alya Mukhbita', 'Anggota Sie 2', 'X AKL 3', 'Sie 2: Budi Pekerti & Akhlak Mulia', 'osis2025', 'female'),
('Putri Eka Rahmadani', 'Anggota Sie 2', 'X AKL 2', 'Sie 2: Budi Pekerti & Akhlak Mulia', 'osis2025', 'female'),

-- [Sie 3: Pembinaan Kepribadian Unggul, Wawasan Kebangsaan, dan Bela Negara]
('Muflihah Khoerunnisa', 'Ketua Sie 3', 'XI DKV 2', 'Sie 3: Kebangsaan & Bela Negara', 'osis2025', 'female'),
('Alya Ahtahya Maharani', 'Anggota Sie 3', 'XI TJKT 3', 'Sie 3: Kebangsaan & Bela Negara', 'osis2025', 'female'),
('Wendi Martin Zada', 'Anggota Sie 3', 'X TJKT 2', 'Sie 3: Kebangsaan & Bela Negara', 'osis2025', 'male'),
('Aisyah Maharani', 'Anggota Sie 3', 'X DKV 1', 'Sie 3: Kebangsaan & Bela Negara', 'osis2025', 'female'),

-- [Sie 4: Pembinaan Akademik, Seni dan/atau Olahraga sesuai Bakat dan Minat]
('Vico Evrat Anargya', 'Ketua Sie 4', 'XI DKV 3', 'Sie 4: Akademik, Seni & Olahraga', 'osis2025', 'male'),
('Khansa Artika Listy', 'Anggota Sie 4', 'XI AKL 2', 'Sie 4: Akademik, Seni & Olahraga', 'osis2025', 'female'),
('Muhammad Taufik Maulana', 'Anggota Sie 4', 'X TJKT 2', 'Sie 4: Akademik, Seni & Olahraga', 'osis2025', 'male'),
('Nazwa Diva Nofiyanti', 'Anggota Sie 4', 'X AKL 3', 'Sie 4: Akademik, Seni & Olahraga', 'osis2025', 'female'),
('Felytha Chandra Giarti', 'Anggota Sie 4', 'X TJKT 3', 'Sie 4: Akademik, Seni & Olahraga', 'osis2025', 'female'),

-- [Sie 5: Pembinaan Demokrasi, HAM, Pendidikan Politik, Lingkungan Hidup, Kepekaan, dan Toleransi Sosial]
('Adelia Arzety', 'Ketua Sie 5', 'XI AKL 3', 'Sie 5: Demokrasi & Toleransi Sosial', 'osis2025', 'female'),
('Dwi Zaharttu Sagita', 'Anggota Sie 5', 'XI MPLB 1', 'Sie 5: Demokrasi & Toleransi Sosial', 'osis2025', 'female'),
('Elfa Liana Putri', 'Anggota Sie 5', 'X AKL 1', 'Sie 5: Demokrasi & Toleransi Sosial', 'osis2025', 'female'),
('Salsabila Nadhifah', 'Anggota Sie 5', 'X TJKT 3', 'Sie 5: Demokrasi & Toleransi Sosial', 'osis2025', 'female'),

-- [Sie 6: Pembinaan Kreativitas, Keterampilan dan Kewirausahaan]
('Shintia Kholifahtun Jannah', 'Ketua Sie 6', 'XI PM 1', 'Sie 6: Kreativitas & Kewirausahaan', 'osis2025', 'female'),
('Dita Pranegara', 'Anggota Sie 6', 'X DKV 1', 'Sie 6: Kreativitas & Kewirausahaan', 'osis2025', 'female'),
('Rizky Anindya Safira', 'Anggota Sie 6', 'X PM 3', 'Sie 6: Kreativitas & Kewirausahaan', 'osis2025', 'female'),

-- [Sie 7: Pembinaan Kualitas Jasmani, Kesehatan, dan Gizi]
('Gita Dian Prasasti', 'Ketua Sie 7', 'XI MPLB 3', 'Sie 7: Kesehatan & Gizi', 'osis2025', 'female'),
('Valencia Mauliddina Syahniar', 'Anggota Sie 7', 'XI AKL 2', 'Sie 7: Kesehatan & Gizi', 'osis2025', 'female'),
('Sabila Putri Almadhani', 'Anggota Sie 7', 'X DKV 3', 'Sie 7: Kesehatan & Gizi', 'osis2025', 'female'),
('Thalita Rui Khasanah', 'Anggota Sie 7', 'X MPLB 2', 'Sie 7: Kesehatan & Gizi', 'osis2025', 'female'),

-- [Sie 8: Pembinaan Sastra dan Budaya]
('Earlia Mutiara Ramadhani', 'Ketua Sie 8', 'XI MPLB 2', 'Sie 8: Sastra & Budaya', 'osis2025', 'female'),
('Desta Silvy Fadilah', 'Anggota Sie 8', 'XI MPLB 1', 'Sie 8: Sastra & Budaya', 'osis2025', 'female'),
('Ame Santila Evi', 'Anggota Sie 8', 'X AKL 3', 'Sie 8: Sastra & Budaya', 'osis2025', 'female'),
('Revalina Kirana Putri', 'Anggota Sie 8', 'X TJKT 3', 'Sie 8: Sastra & Budaya', 'osis2025', 'female'),

-- [Sie 9: Pembinaan Teknologi Informasi dan Komunikasi (TIK)]
('Trista Varensya', 'Ketua Sie 9', 'XI DKV 2', 'Sie 9: TIK', 'osis2025', 'female'),
('Trandwika Hestu Sundoro', 'Anggota Sie 9', 'XI DKV 1', 'Sie 9: TIK', 'osis2025', 'male'),
('Alfira Nayla Putri', 'Anggota Sie 9', 'X DKV 1', 'Sie 9: TIK', 'osis2025', 'female'),
('Alvi Isyana Paramesti', 'Anggota Sie 9', 'X DKV 3', 'Sie 9: TIK', 'osis2025', 'female'),
('Khusi Murnias Widodo', 'Anggota Sie 9', 'X DKV 2', 'Sie 9: TIK', 'osis2025', 'female'),

-- [Sie 10: Pembinaan Komunikasi dalam Bahasa Inggris]
('Carissa Pabha Jivita', 'Ketua Sie 10', 'XI DKV 1', 'Sie 10: Bahasa Inggris', 'osis2025', 'female'),
('Aghnia Rizka Agustina', 'Anggota Sie 10', 'XI MPLB 3', 'Sie 10: Bahasa Inggris', 'osis2025', 'female'),
('Hafidza Arafah', 'Anggota Sie 10', 'X DKV 2', 'Sie 10: Bahasa Inggris', 'osis2025', 'female'),
('Syifa Nur Rahmah', 'Anggota Sie 10', 'X MPLB 2', 'Sie 10: Bahasa Inggris', 'osis2025', 'female'),
('Zilfia Indi Mecca', 'Anggota Sie 10', 'X PM 2', 'Sie 10: Bahasa Inggris', 'osis2025', 'female');
