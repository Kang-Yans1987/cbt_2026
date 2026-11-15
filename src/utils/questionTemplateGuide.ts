export const TEMPLATE_GUIDE_MARKDOWN = `# Panduan Format Template Soal DutawangiCBT

Aplikasi **DutawangiCBT** menggunakan format **Microsoft Excel (.xlsx)** dengan tabel resmi yang tertata rapi serta **Microsoft Word (.docx & .doc)** (bukan CSV) dan mendukung format **Markdown (.md)**:

1. **Microsoft Excel (\`.xlsx\`)** — tabel resmi dengan header biru terbekukan, garis tabel rapi, wrap text otomatis, dropdown *Jenis_Soal*, dan sheet \`Panduan_Pengisian\`.
2. **Microsoft Word (\`.docx\` & \`.doc\`)** — tersusun rapi dalam bentuk tabel kartu 2 kolom per soal sehingga nyaman dibaca, disunting, dan dicetak guru.
3. **Markdown (\`.md\`)** — format teks terstruktur ringan yang dapat diunduh atau langsung ditempel pada kolom impor.

---

## 1. Struktur Tabel Excel (\`.xlsx\`)

Pada sheet **\`Bank_Soal\`** (header pada baris 4):

| No | Nama Kolom | Keterangan | Contoh |
| --- | --- | --- | --- |
| 1 | \`Nomor\` | Nomor urut soal | \`1\` |
| 2 | \`Jenis_Soal\` | \`PG\`, \`PG_KOMPLEKS\`, \`BENAR_SALAH\`, \`MENJODOHKAN\`, atau \`ISIAN\` | \`PG\` |
| 3 | \`Domain_AKM\` | Domain atau kompetensi dasar | \`Literasi · Teks Informasi\` |
| 4 | \`Stimulus\` | Teks bacaan / konteks pengantar (opsional) | \`Sekolah menerapkan bebas plastik...\` |
| 5 | \`Pertanyaan\` | Kalimat inti pertanyaan (wajib) | \`Tujuan utama program adalah...\` |
| 6–9 | \`Opsi_A\` .. \`Opsi_D\` | Pilihan jawaban / pernyataan / pasangan | \`A. Pilihan pertama\` |
| 10 | \`Kunci_Jawaban\` | Kunci jawaban sesuai jenis soal | \`B\` atau \`A,B,D\` |
| 11 | \`Kata_Kunci_AI\` | Kata kunci korektor AI khusus \`ISIAN\` | \`lokal, otomatis, aman\` |
| 12 | \`Bobot_Nilai\` | Bobot skor maksimal | \`20\` |
| 13 | \`Gambar_URL\` | URL gambar (opsional) | \`https://...\` |

---

## 2. Struktur Tabel Kartu Word (\`.docx\` / \`.doc\`)

Di Microsoft Word, setiap soal disusun dalam **1 tabel 2 kolom** (\`Field\` | \`Isi\`) setelah judul \`SOAL #1 — ...\`:
- **Nomor**, **Jenis Soal**, **Domain AKM**, **Bobot Nilai**
- **Stimulus**, **Pertanyaan**
- **Opsi A–D** (untuk PG/PG Kompleks), **Pernyataan S1–S4** (untuk Benar/Salah), atau **Pasangan P1–P4** (untuk Menjodohkan)
- **Kunci Jawaban**, **Kata Kunci AI**, **Gambar URL**`;
