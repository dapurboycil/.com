# Dapur BoyCill — E-Kasir

Project HTML/CSS/JavaScript untuk warung makan Dapur BoyCill.

## Isi
- Login wajib sebelum dashboard
- Dashboard modern
- Pemesanan + keranjang
- No. antrian otomatis
- Diskon, tunai, kembalian
- Cetak struk detail
- Kasir/transaksi
- Stok, modal, harga jual, profit per unit
- Pengeluaran
- Laporan periode
- Riwayat struk
- Export CSV
- Backup/import JSON
- Ubah username/password
- Reset password
- Sinkronisasi JSON ke Google Drive melalui Google Apps Script
- Logo Dapur BoyCill sudah disertakan

## Login awal
Username: admin
Password: admin123

## Menjalankan
Buka `index.html` menggunakan browser. Untuk VS Code, bisa menggunakan Live Server.

## Google Drive
Browser tidak dapat menulis file ke Google Drive hanya dengan "link folder Drive". Karena itu project ini memakai Google Apps Script sebagai endpoint resmi.

1. Buka folder `google-apps-script`.
2. Salin `Code.gs` ke Google Apps Script.
3. Deploy sebagai Web App.
4. Salin URL `/exec`.
5. Buka Pengaturan pada aplikasi.
6. Tempel URL tersebut pada bagian Google Drive.
7. Klik Simpan URL lalu Sinkron.

Data aplikasi akan disimpan sebagai `dapur-boycill-data.json`.

## Catatan keamanan
Versi HTML murni ini cocok untuk penggunaan satu komputer/perangkat atau prototipe. Password tersimpan pada penyimpanan browser. Untuk sistem produksi dengan banyak kasir/perangkat, gunakan backend/database dan autentikasi server-side.

Tidak ada aplikasi yang bisa dijamin "100% tanpa bug" hanya dari pembuatan kode. Project ini dibuat dengan validasi alur utama dan error handling dasar; tetap lakukan uji pada perangkat dan browser yang akan dipakai sebelum operasional.
