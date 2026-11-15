# Template & Panduan Format Soal — DutawangiCBT (SD Negeri 2 Tukangkayu)

Dokumen ini menjelaskan susunan rapi format template soal **TKA & AKM** yang didukung penuh oleh **DutawangiCBT**, baik untuk **unduh template** maupun **impor otomatis ke Bank Soal**.

---

## Ringkasan Format Tersedia

| Format File | Ekstensi | Kegunaan Utama | Cara Kerja di Aplikasi |
| :--- | :--- | :--- | :--- |
| **Microsoft Excel** | `.xlsx` | Impor massal cepat ratusan soal sekaligus | 2 sheet (`Bank_Soal` + `Panduan_Pengisian`), tabel resmi (`TabelBankSoal`) di baris 4, dropdown `Jenis_Soal`, border & wrap teks rapi |
| **Microsoft Word** | `.docx` / `.doc` | Penulisan & telaah soal yang nyaman dibaca/dicetak | Tersusun rapi per kartu soal dalam tabel 2 kolom (`Field` \| `Isi`) |
| **Markdown** | `.md` | Template teks terstruktur ringan & ramah AI | Setiap soal diawali heading `## Soal <nomor>` |

---

## 1. Susunan Format Excel (`.xlsx`)

Pada sheet **`Bank_Soal`** (baris 1–2 berisi kop judul & petunjuk, baris 4 wajib header kolom tabel):

| Kolom | Nama Header | Wajib | Format & Contoh |
| :---: | :--- | :---: | :--- |
| **A** | `Nomor` | Ya | Angka urut (`1`, `2`, `3`, ...) |
| **B** | `Jenis_Soal` | Ya | `PG`, `PG_KOMPLEKS`, `BENAR_SALAH`, `MENJODOHKAN`, atau `ISIAN` |
| **C** | `Domain_AKM` | Ya | Contoh: `Literasi · Teks Informasi` |
| **D** | `Stimulus` | Opsional | Wacana atau teks konteks sebelum pertanyaan |
| **E** | `Pertanyaan` | Ya | Teks pertanyaan utama |
| **F** | `Opsi_A` | Sesuai jenis | `A. ...` (PG/PGK) · `Pernyataan\|true` (B/S) · `Kiri->Kanan` (Jodohkan) |
| **G** | `Opsi_B` | Sesuai jenis | `B. ...` (PG/PGK) · `Pernyataan\|false` (B/S) · `Kiri->Kanan` (Jodohkan) |
| **H** | `Opsi_C` | Opsional | `C. ...` / Pernyataan ke-3 / Pasangan ke-3 |
| **I** | `Opsi_D` | Opsional | `D. ...` / Pernyataan ke-4 / Pasangan ke-4 |
| **J** | `Kunci_Jawaban` | Ya | `B` (PG) · `A,B,D` (PGK) · `S1:true,S2:false` (B/S) · `P1->24 cm` (Jodohkan) · Teks jawaban (ISIAN) |
| **K** | `Kata_Kunci_AI` | Khusus `ISIAN` | Kata kunci dipisah koma untuk koreksi Asisten AI |
| **L** | `Bobot_Nilai` | Ya | Angka bobot skor maksimal (`20`) |
| **M** | `Gambar_URL` | Opsional | URL gambar publik (`https://...`) atau kosong |

---

## 2. Susunan Format Word (`.docx` & `.doc`)

Di dalam file Microsoft Word, setiap butir soal disusun rapi dengan judul bagian lalu **tabel 2 kolom**:

### Judul Bagian: `SOAL #1 — PILIHAN GANDA (PG)`

| Field | Isi |
| :--- | :--- |
| **Nomor** | `1` |
| **Jenis Soal** | `PG` |
| **Domain AKM** | `Literasi · Teks Informasi` |
| **Bobot Nilai** | `20` |
| **Stimulus** | Sekolah dasar di kawasan pesisir mulai menerapkan program sekolah bebas plastik sekali pakai... |
| **Pertanyaan** | Tujuan utama penerapan program membawa botol minum isi ulang di sekolah adalah... |
| **Opsi A** | A. Menambah beban tas siswa setiap hari |
| **Opsi B** | B. Mengurangi timbulan sampah plastik sekali pakai di lingkungan sekolah |
| **Opsi C** | C. Menggantikan seluruh jam pelajaran olahraga |
| **Opsi D** | D. Menghapus kegiatan kantin sehat sekolah |
| **Kunci Jawaban** | `B` |
| **Kata Kunci AI** | `-` |
| **Gambar URL** | `-` |

> Untuk jenis **`BENAR_SALAH`**, ganti baris Opsi dengan **`Pernyataan S1`**, **`Pernyataan S2`**, dst. (contoh isi: `Es mencair di atas 0°C|true`).
> Untuk jenis **`MENJODOHKAN`**, ganti baris Opsi dengan **`Pasangan P1`**, **`Pasangan P2`**, dst. (contoh isi: `Keliling persegi sisi 6 cm->24 cm`).

---

## 3. Susunan Format Markdown (`.md`)

Setiap file `.md` dapat langsung diunggah pada menu **Import Soal** atau ditempelkan teksnya:

```markdown
# TEMPLATE BANK SOAL — DUTAWANGICBT

> **Sekolah:** SD Negeri 2 Tukangkayu
> **Mata Pelajaran:** Asesmen Kompetensi Minimum

---

## Soal 1
- **Jenis Soal**: PG
- **Domain AKM**: Literasi · Teks Informasi
- **Bobot Nilai**: 20
- **Gambar URL**:

> **Stimulus**:
> Sekolah dasar di kawasan pesisir mulai menerapkan program sekolah bebas plastik sekali pakai dengan mewajibkan siswa membawa botol minum isi ulang.

**Pertanyaan**:
Tujuan utama penerapan program membawa botol minum isi ulang di sekolah adalah...

- **A.** Menambah beban tas siswa setiap hari
- **B.** Mengurangi timbulan sampah plastik sekali pakai di lingkungan sekolah
- **C.** Menggantikan seluruh jam pelajaran olahraga
- **D.** Menghapus kegiatan kantin sehat sekolah

- **Kunci Jawaban**: B
- **Kata Kunci AI**:

---

## Soal 2
- **Jenis Soal**: PG_KOMPLEKS
- **Domain AKM**: Numerasi · Aljabar & Operasi Hitung
- **Bobot Nilai**: 20
- **Gambar URL**:

> **Stimulus**:
> Koperasi sekolah menjual 2 buku tulis dan 1 pensil seharga Rp10.000. Harga 1 buku tulis adalah Rp4.000.

**Pertanyaan**:
Pilih SEMUA pernyataan yang benar berdasarkan data harga alat tulis di atas:

- **A.** Harga 1 pensil adalah Rp2.000
- **B.** Harga 3 buku tulis adalah Rp12.000
- **C.** Harga 1 buku dan 2 pensil adalah Rp10.000
- **D.** Selisih harga 1 buku tulis dan 1 pensil adalah Rp2.000

- **Kunci Jawaban**: A,B,D
- **Kata Kunci AI**:

---

## Soal 3
- **Jenis Soal**: BENAR_SALAH
- **Domain AKM**: Literasi Sains · Perubahan Wujud Zat
- **Bobot Nilai**: 20
- **Gambar URL**:

> **Stimulus**:
> Air murni mendidih pada suhu 100°C di tekanan 1 atm dan membeku menjadi es pada suhu 0°C.

**Pertanyaan**:
Tentukan Benar atau Salah untuk setiap pernyataan berikut:

- **S1:** Es akan mencair jika dipanaskan di atas suhu 0°C|true
- **S2:** Air mendidih pada suhu 25°C di tekanan udara normal|false
- **S3:** Perubahan air menjadi uap disebut menguap|true

- **Kunci Jawaban**: S1:true,S2:false,S3:true
- **Kata Kunci AI**:

---

## Soal 4
- **Jenis Soal**: MENJODOHKAN
- **Domain AKM**: Numerasi · Geometri & Pengukuran
- **Bobot Nilai**: 20
- **Gambar URL**:

> **Stimulus**:
> Pasangkan bangun datar atau besaran satuan di kolom kiri dengan hasil yang sesuai di kolom kanan.

**Pertanyaan**:
Pasangkan setiap item berikut dengan tepat:

- **P1:** Keliling persegi dengan sisi 6 cm->24 cm
- **P2:** Luas persegi panjang 8 cm x 5 cm->40 cm²
- **P3:** Konversi 2,5 kilometer ke meter->2.500 m

- **Kunci Jawaban**: P1->24 cm,P2->40 cm²,P3->2.500 m
- **Kata Kunci AI**:

---

## Soal 5
- **Jenis Soal**: ISIAN
- **Domain AKM**: Penalaran Terbuka (Korektor Asisten AI)
- **Bobot Nilai**: 20
- **Gambar URL**:

> **Stimulus**:
> Pada saat ujian berlangsung, koneksi internet di ruang kelas dapat terputus sementara.

**Pertanyaan**:
Jelaskan manfaat penyimpanan jawaban lokal (mode offline) bagi peserta ujian saat jaringan terputus.

- **Kunci Jawaban**: Jawaban peserta tetap tersimpan aman di perangkat dan akan terkirim otomatis ketika koneksi internet kembali pulih.
- **Kata Kunci AI**: tersimpan aman, perangkat lokal, tidak hilang, kirim otomatis, koneksi pulih
```
