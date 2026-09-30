(() => {
"use strict";

const KEY = "dapurBoyCillEKasir_v1";
const DEFAULT_PRODUCTS = [
["Pecel Ayam+Nasi",9150,12000],["Paket Pecel Ayam+Nasi+Tea Jus",9889,15000],
["Indomie Goreng Komplit",6800,10000],["Indomie Kuah Komplit",6600,10000],
["Goday Capuchino Hot",2350,6000],["Goday Capuchino Drink",2459,6000],
["Goday Mocachino Hot",1750,5000],["Goday Mocachino Drink",1859,5000],
["Tea Hot",1000,5000],["Tea Jus Drink",739,4000],
["Kapal Api Special Mix Hot",1950,5000],["Luwak White Coffe Hot",1800,5000]
];
const rupiah = n => new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(Number(n)||0);
const uid = p => p + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2,7);
const nowISO = () => new Date().toISOString();
const dateKey = d => { const x=new Date(d); return x.toISOString().slice(0,10); };
const esc = s => String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));

let state = loadState();
let cart = [];
let currentPage = "dashboard";

function freshState(){
  return {
    version:1, shop:{name:"Dapur BoyCill",address:"Cibinong, Cikaret",wa:"087785835454"},
    auth:{username:"admin",password:"admin123"},
    driveUrl:"",
    products:DEFAULT_PRODUCTS.map((x,i)=>({id:"p"+(i+1),name:x[0],cost:x[1],price:x[2],stock:0})),
    transactions:[], expenses:[], nextQueue:1, lastSync:""
  };
}
function loadState(){
  try { const raw=localStorage.getItem(KEY); if(raw){ const x=JSON.parse(raw); return {...freshState(),...x}; } } catch(e){}
  return freshState();
}
function saveState(){
  localStorage.setItem(KEY,JSON.stringify(state));
  updateSyncUI();
}
function money(n){return rupiah(Math.round(Number(n)||0))}
function toast(msg,type=""){const el=document.createElement("div");el.className="toast "+type;el.textContent=msg;document.getElementById("toastContainer").appendChild(el);setTimeout(()=>el.remove(),2800)}
function byId(id){return document.getElementById(id)}
function today(){return dateKey(new Date())}
function formatDateTime(v){return new Date(v).toLocaleString("id-ID",{dateStyle:"medium",timeStyle:"short"})}

function init(){
  byId("loginForm").addEventListener("submit",e=>{e.preventDefault();login()});
  document.addEventListener("click",handleClick);
  byId("menuSearch").addEventListener("input",renderMenu);
  ["discount","cashPaid"].forEach(id=>byId(id).addEventListener("input",renderCart));
  byId("passwordForm").addEventListener("submit",changePassword);
  byId("importJson").addEventListener("change",importJSON);
  byId("driveUrl").value=state.driveUrl||"";
  byId("settingUser").value=state.auth.username;
  byId("reportFrom").value=today(); byId("reportTo").value=today();
  renderAll();
  updateClock();
  setInterval(updateClock,1000);
}
function updateClock(){byId("clockText").textContent=new Date().toLocaleString("id-ID",{weekday:"long",day:"2-digit",month:"long",year:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit"})}
function login(){
  const u=byId("loginUser").value.trim(), p=byId("loginPass").value;
  if(u===state.auth.username && p===state.auth.password){
    sessionStorage.setItem("dapurLoggedIn","1"); showApp(); toast("Login berhasil","success");
  } else toast("Username atau password salah","error");
}
function showApp(){byId("loginScreen").classList.add("hidden");byId("appShell").classList.remove("hidden");showPage("dashboard")}
function logout(){sessionStorage.removeItem("dapurLoggedIn");location.reload()}
function showPage(page){
  currentPage=page;
  document.querySelectorAll(".page").forEach(x=>x.classList.remove("active"));
  byId("page-"+page)?.classList.add("active");
  document.querySelectorAll(".nav-item").forEach(x=>x.classList.toggle("active",x.dataset.page===page));
  const titles={dashboard:"Dashboard",order:"Pemesanan",transactions:"Kasir / Transaksi",stock:"Stok Barang",expenses:"Pengeluaran",reports:"Laporan",history:"Riwayat Struk",settings:"Pengaturan"};
  byId("pageTitle").textContent=titles[page]||"Dashboard";
  if(page==="order"){prepareOrder();renderMenu();renderCart()}
  if(page==="transactions")renderTransactions();
  if(page==="stock")renderStock();
  if(page==="expenses")renderExpenses();
  if(page==="reports")renderReport();
  if(page==="history")renderHistory();
  if(page==="settings"){byId("settingUser").value=state.auth.username;byId("driveUrl").value=state.driveUrl||""}
  byId("sidebar").classList.remove("open");
}
function handleClick(e){
  const pageBtn=e.target.closest("[data-page]"); if(pageBtn){showPage(pageBtn.dataset.page);return}
  const action=e.target.closest("[data-action]")?.dataset.action;
  if(!action)return;
  const fn={forgot:forgotPassword,reset:resetPassword,logout, "toggle-sidebar":()=>byId("sidebar").classList.toggle("open"),
    sync:syncDrive, "clear-cart":clearCart,checkout, "download-transactions":downloadTransactions,
    "add-product":addProduct, "download-stock":downloadStock,"add-expense":addExpense,
    "download-expenses":downloadExpenses,"refresh-report":renderReport,"download-report":downloadReport,
    "download-history":downloadHistory,"save-drive":saveDrive,"export-json":exportJSON,
    "factory-reset":factoryReset,"close-modal":closeModal}[action];
  if(fn)fn();
  if(action==="remove-cart")removeCartItem(e.target.closest("[data-id]")?.dataset.id);
  if(action==="minus-cart")changeQty(e.target.closest("[data-id]")?.dataset.id,-1);
  if(action==="plus-cart")changeQty(e.target.closest("[data-id]")?.dataset.id,1);
  if(action==="print-trx")printTransaction(e.target.closest("[data-id]")?.dataset.id);
  if(action==="edit-product")editProduct(e.target.closest("[data-id]")?.dataset.id);
  if(action==="delete-product")deleteProduct(e.target.closest("[data-id]")?.dataset.id);
  if(action==="delete-expense")deleteExpense(e.target.closest("[data-id]")?.dataset.id);
}
function renderAll(){renderDashboard();updateSyncUI()}
function renderDashboard(){
  const t=state.transactions.filter(x=>dateKey(x.date)===today());
  const sales=t.reduce((a,x)=>a+x.total,0), profit=t.reduce((a,x)=>a+x.profit,0);
  byId("statSales").textContent=money(sales);byId("statProfit").textContent=money(profit);
  byId("statOrders").textContent=t.length+" transaksi";byId("statProducts").textContent=state.products.length;
  byId("statLowStock").textContent=state.products.filter(x=>x.stock<=5).length;
}
function prepareOrder(){
  byId("queueNo").value=String(state.nextQueue).padStart(3,"0");
  byId("orderDate").value=formatDateTime(new Date());
}
function renderMenu(){
  const q=(byId("menuSearch").value||"").toLowerCase();
  const products=state.products.filter(p=>p.name.toLowerCase().includes(q));
  byId("menuGrid").innerHTML=products.map(p=>`<button class="menu-card" data-action="add-to-cart" data-id="${p.id}"><strong>${esc(p.name)}</strong><small>Stok: ${p.stock}</small><b>${money(p.price)}</b></button>`).join("") || '<div class="muted">Menu tidak ditemukan.</div>';
}
document.addEventListener("click",e=>{
  const b=e.target.closest('[data-action="add-to-cart"]'); if(b)addToCart(b.dataset.id);
});
function addToCart(id){
  const p=state.products.find(x=>x.id===id);if(!p)return;
  const found=cart.find(x=>x.id===id), qty=found?found.qty:0;
  if(qty>=p.stock){toast("Stok tidak cukup. Tambahkan stok terlebih dahulu.","error");return}
  if(found)found.qty++;else cart.push({id,qty:1});
  renderCart();
}
function changeQty(id,delta){
  const item=cart.find(x=>x.id===id), p=state.products.find(x=>x.id===id);if(!item||!p)return;
  item.qty+=delta;
  if(item.qty<=0)cart=cart.filter(x=>x.id!==id);
  if(item.qty>p.stock)item.qty=p.stock;
  renderCart();
}
function removeCartItem(id){cart=cart.filter(x=>x.id!==id);renderCart()}
function clearCart(){cart=[];byId("discount").value=0;byId("cashPaid").value="";renderCart()}
function calcCart(){
  const subtotal=cart.reduce((s,i)=>{const p=state.products.find(x=>x.id===i.id);return s+p.price*i.qty},0);
  const discount=Math.min(Math.max(Number(byId("discount").value)||0,0),subtotal);
  const total=subtotal-discount,cash=Number(byId("cashPaid").value)||0;
  return {subtotal,discount,total,cash,change:Math.max(0,cash-total)};
}
function renderCart(){
  const c=calcCart();
  byId("cartList").innerHTML=cart.map(i=>{const p=state.products.find(x=>x.id===i.id);return `<div class="cart-row" data-id="${i.id}"><div><strong>${esc(p.name)}</strong><small>${money(p.price)} × ${i.qty} = ${money(p.price*i.qty)}</small></div><div class="qty"><button data-action="minus-cart">−</button><b>${i.qty}</b><button data-action="plus-cart">+</button><button data-action="remove-cart" class="mini danger">×</button></div></div>`}).join("")||'<div class="muted" style="padding:20px;text-align:center">Keranjang masih kosong.</div>';
  byId("cartSubtotal").textContent=money(c.subtotal);byId("cartDiscount").textContent=money(c.discount);byId("cartTotal").textContent=money(c.total);byId("cashChange").textContent=money(c.change);
}
function checkout(){
  if(!cart.length)return toast("Keranjang masih kosong","error");
  const c=calcCart();if(c.cash<c.total)return toast("Tunai belum mencukupi","error");
  const items=cart.map(i=>{const p=state.products.find(x=>x.id===i.id);return {productId:p.id,name:p.name,qty:i.qty,price:p.price,cost:p.cost}});
  const hpp=items.reduce((s,i)=>s+i.cost*i.qty,0), profit=c.total-hpp;
  const trx={id:uid("trx"),date:nowISO(),queueNo:String(state.nextQueue).padStart(3,"0"),customer:byId("customerName").value.trim()||"Umum",discount:c.discount,subtotal:c.subtotal,total:c.total,cash:c.cash,change:c.change,hpp,profit,items};
  items.forEach(i=>{const p=state.products.find(x=>x.id===i.productId);p.stock-=i.qty});
  state.transactions.unshift(trx);state.nextQueue++;
  saveState();clearCart();byId("customerName").value="";renderAll();renderMenu();renderCart();showPage("history");printTransaction(trx.id);
}
function receiptHTML(trx){
  return `<div class="receipt"><h2>Dapur BoyCill</h2><div class="center">Cibinong, Cikaret<br>WA: 087785835454</div><hr>
  <div class="receipt-row"><span>Tanggal</span><b>${formatDateTime(trx.date)}</b></div>
  <div class="receipt-row"><span>No. Antrian</span><b>#${esc(trx.queueNo)}</b></div>
  <div class="receipt-row"><span>Pemesan</span><b>${esc(trx.customer)}</b></div><hr>
  <div class="receipt-items">${trx.items.map(i=>`<div><span>${esc(i.name)} × ${i.qty}</span><b>${money(i.price*i.qty)}</b></div>`).join("")}</div><hr>
  <div class="receipt-row"><span>Subtotal</span><b>${money(trx.subtotal)}</b></div>
  <div class="receipt-row"><span>Diskon</span><b>-${money(trx.discount)}</b></div>
  <div class="receipt-row receipt-total"><span>TOTAL</span><b>${money(trx.total)}</b></div>
  <div class="receipt-row"><span>Tunai</span><b>${money(trx.cash)}</b></div>
  <div class="receipt-row"><span>Kembalian</span><b>${money(trx.change)}</b></div><hr>
  <div class="footer">Terima kasih sudah jajan di Dapur BoyCill ❤️<br>Struk dibuat oleh E-Kasir Dapur BoyCill</div></div>`;
}
function printTransaction(id){
  const t=state.transactions.find(x=>x.id===id);if(!t)return;
  const w=window.open("","_blank","width=460,height=700");if(!w){toast("Izinkan popup browser untuk mencetak struk","error");return}
  w.document.write(`<html><head><title>Struk #${t.queueNo}</title><style>body{margin:0;font-family:Arial;background:#eee}.receipt{background:#fff;max-width:380px;margin:20px auto;padding:18px}@media print{body{background:#fff}.receipt{margin:0}}</style></head><body>${receiptHTML(t)}<script>window.onload=()=>window.print()<\/script></body></html>`);w.document.close();
}
function renderTransactions(){
  const t=state.transactions, sales=t.reduce((a,x)=>a+x.total,0), profit=t.reduce((a,x)=>a+x.profit,0);
  byId("trxCount").textContent=t.length;byId("trxSales").textContent=money(sales);byId("trxProfit").textContent=money(profit);
  byId("transactionTable").innerHTML=t.map(x=>`<tr><td>${formatDateTime(x.date)}</td><td>#${x.queueNo}</td><td>${esc(x.customer)}</td><td>${money(x.total)}</td><td>${money(x.cash)}</td><td>${money(x.change)}</td><td><div class="actions"><button class="mini" data-action="print-trx" data-id="${x.id}">Cetak</button></div></td></tr>`).join("")||'<tr><td colspan="7" class="muted">Belum ada transaksi.</td></tr>';
}
function renderStock(){
  byId("stockTable").innerHTML=state.products.map(p=>{const profit=p.price-p.cost;const status=p.stock<=0?`<span class="badge out">Habis</span>`:p.stock<=5?`<span class="badge warn">Menipis</span>`:`<span class="badge ok">Aman</span>`;return `<tr><td><b>${esc(p.name)}</b></td><td>${p.stock}</td><td>${money(p.cost)}</td><td>${money(p.price)}</td><td>${money(profit)}</td><td>${status}</td><td><div class="actions"><button class="mini" data-action="edit-product" data-id="${p.id}">Edit</button><button class="mini danger" data-action="delete-product" data-id="${p.id}">Hapus</button></div></td></tr>`}).join("");
}
function addProduct(){openModal("Tambah Produk",productForm({name:"",cost:0,price:0,stock:0},"add"))}
function editProduct(id){const p=state.products.find(x=>x.id===id);if(p)openModal("Edit Produk",productForm(p,"edit"))}
function productForm(p,mode){return `<form id="productForm" class="stack-form"><label>Nama Produk<input id="pName" value="${esc(p.name)}" required></label><label>Harga Modal<input id="pCost" type="number" min="0" value="${p.cost}" required></label><label>Harga Jual<input id="pPrice" type="number" min="0" value="${p.price}" required></label><label>Stok<input id="pStock" type="number" min="0" value="${p.stock}" required></label><button class="btn btn-primary" type="submit">Simpan</button></form>`}
function openModal(title,body){
  byId("modalTitle").textContent=title;
  byId("modalBody").innerHTML=body;
  byId("modal").classList.remove("hidden");
  byId("productForm")?.addEventListener("submit",e=>{
    e.preventDefault();
    const product={name:byId("pName").value.trim(),cost:Number(byId("pCost").value),price:Number(byId("pPrice").value),stock:Number(byId("pStock").value)};
    if(!product.name)return;
    const editId=window.__editProductId;
    const duplicate=state.products.find(x=>x.name.toLowerCase()===product.name.toLowerCase() && x.id!==editId);
    if(duplicate)return toast("Nama produk sudah ada","error");
    if(editId){
      const target=state.products.find(x=>x.id===editId);
      if(target)Object.assign(target,product);
      window.__editProductId=null;
    } else {
      state.products.push({id:uid("p"),...product});
    }
    saveState();closeModal();renderStock();renderMenu();renderDashboard();toast("Produk disimpan","success");
  });
}
const oldEdit=editProduct;
editProduct=function(id){window.__editProductId=id;const p=state.products.find(x=>x.id===id);if(p)openModal("Edit Produk",productForm(p,"edit"))}
function deleteProduct(id){const p=state.products.find(x=>x.id===id);if(p&&confirm("Hapus "+p.name+"?")){state.products=state.products.filter(x=>x.id!==id);saveState();renderStock();renderMenu();renderDashboard();toast("Produk dihapus","success")}}
function renderExpenses(){
  const total=state.expenses.reduce((a,x)=>a+x.amount,0);byId("expenseTotal").textContent=money(total);byId("expenseCount").textContent=state.expenses.length;
  byId("expenseTable").innerHTML=state.expenses.map(x=>`<tr><td>${formatDateTime(x.date)}</td><td>${esc(x.note)}</td><td>${esc(x.category)}</td><td>${money(x.amount)}</td><td><button class="mini danger" data-action="delete-expense" data-id="${x.id}">Hapus</button></td></tr>`).join("")||'<tr><td colspan="5" class="muted">Belum ada pengeluaran.</td></tr>';
}
function addExpense(){openModal("Tambah Pengeluaran",`<form id="expenseForm" class="stack-form"><label>Keterangan<input id="eNote" required></label><label>Kategori<select id="eCat"><option>Bahan Baku</option><option>Operasional</option><option>Transportasi</option><option>Listrik/Air</option><option>Lainnya</option></select></label><label>Nominal<input id="eAmount" type="number" min="1" required></label><button class="btn btn-primary" type="submit">Simpan</button></form>`);byId("expenseForm").addEventListener("submit",e=>{e.preventDefault();state.expenses.unshift({id:uid("exp"),date:nowISO(),note:byId("eNote").value.trim(),category:byId("eCat").value,amount:Number(byId("eAmount").value)});saveState();closeModal();renderExpenses();renderReport();toast("Pengeluaran tersimpan","success")})}
function deleteExpense(id){if(confirm("Hapus catatan pengeluaran?")){state.expenses=state.expenses.filter(x=>x.id!==id);saveState();renderExpenses();renderReport()}}
function renderReport(){
  const from=byId("reportFrom").value||today(),to=byId("reportTo").value||today();
  const tx=state.transactions.filter(x=>dateKey(x.date)>=from&&dateKey(x.date)<=to), ex=state.expenses.filter(x=>dateKey(x.date)>=from&&dateKey(x.date)<=to);
  const sales=tx.reduce((a,x)=>a+x.total,0),hpp=tx.reduce((a,x)=>a+x.hpp,0),expense=ex.reduce((a,x)=>a+x.amount,0);
  byId("reportSales").textContent=money(sales);byId("reportHpp").textContent=money(hpp);byId("reportExpense").textContent=money(expense);byId("reportNet").textContent=money(sales-hpp-expense);
  const map={};tx.forEach(t=>t.items.forEach(i=>{if(!map[i.productId])map[i.productId]={name:i.name,qty:0,sales:0,hpp:0};map[i.productId].qty+=i.qty;map[i.productId].sales+=i.price*i.qty;map[i.productId].hpp+=i.cost*i.qty}));
  byId("reportProductTable").innerHTML=Object.values(map).map(x=>`<tr><td>${esc(x.name)}</td><td>${x.qty}</td><td>${money(x.sales)}</td><td>${money(x.hpp)}</td><td>${money(x.sales-x.hpp)}</td></tr>`).join("")||'<tr><td colspan="5" class="muted">Tidak ada data pada periode ini.</td></tr>';
}
function renderHistory(){
  byId("historyTable").innerHTML=state.transactions.map(x=>`<tr><td>${formatDateTime(x.date)}</td><td>#${x.queueNo}</td><td>${esc(x.customer)}</td><td>${x.items.reduce((a,i)=>a+i.qty,0)}</td><td>${money(x.total)}</td><td><button class="mini" data-action="print-trx" data-id="${x.id}">Cetak / PDF</button></td></tr>`).join("")||'<tr><td colspan="6" class="muted">Belum ada struk.</td></tr>';
}
function csvDownload(filename,rows){
  const csv=rows.map(r=>r.map(v=>`"${String(v??"").replace(/"/g,'""')}"`).join(",")).join("\n");
  const blob=new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=filename;a.click();URL.revokeObjectURL(a.href);
}
function downloadTransactions(){csvDownload("transaksi-dapur-boycill.csv",[["Tanggal","No Antrian","Pemesan","Subtotal","Diskon","Total","Tunai","Kembalian","HPP","Profit"],...state.transactions.map(x=>[formatDateTime(x.date),x.queueNo,x.customer,x.subtotal,x.discount,x.total,x.cash,x.change,x.hpp,x.profit])])}
function downloadStock(){csvDownload("stok-dapur-boycill.csv",[["Produk","Stok","Modal","Harga Jual","Untung/Unit"],...state.products.map(p=>[p.name,p.stock,p.cost,p.price,p.price-p.cost])])}
function downloadExpenses(){csvDownload("pengeluaran-dapur-boycill.csv",[["Tanggal","Keterangan","Kategori","Nominal"],...state.expenses.map(x=>[formatDateTime(x.date),x.note,x.category,x.amount])])}
function downloadHistory(){downloadTransactions()}
function downloadReport(){const from=byId("reportFrom").value,to=byId("reportTo").value;const tx=state.transactions.filter(x=>dateKey(x.date)>=from&&dateKey(x.date)<=to);csvDownload(`laporan-${from}-${to}.csv`,[["Periode",from+" s/d "+to],["Omzet",tx.reduce((a,x)=>a+x.total,0)],["HPP",tx.reduce((a,x)=>a+x.hpp,0)],["Profit Kotor",tx.reduce((a,x)=>a+x.profit,0)]])}
function exportJSON(){const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="backup-dapur-boycill.json";a.click();URL.revokeObjectURL(a.href)}
function importJSON(e){const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const x=JSON.parse(r.result);if(!x.products||!x.auth)throw Error();state=x;saveState();location.reload()}catch(_){toast("File JSON tidak valid","error")}};r.readAsText(f)}
function factoryReset(){if(confirm("Reset seluruh data transaksi, pengeluaran dan stok? Data login juga kembali ke admin/admin123.")){state=freshState();saveState();location.reload()}}
function changePassword(e){e.preventDefault();const old=byId("oldPass").value,n=byId("newPass").value,c=byId("confirmPass").value,u=byId("settingUser").value.trim();if(old!==state.auth.password)return toast("Password lama salah","error");if(n.length<6)return toast("Password minimal 6 karakter","error");if(n!==c)return toast("Konfirmasi password tidak sama","error");state.auth={username:u||"admin",password:n};saveState();e.target.reset();byId("settingUser").value=state.auth.username;toast("Login berhasil diperbarui","success")}
function forgotPassword(){const u=prompt("Masukkan username:",state.auth.username);if(u===state.auth.username)alert("Untuk keamanan aplikasi browser, gunakan menu Reset password. Jika lupa password master, gunakan Reset Data.");else toast("Username tidak ditemukan","error")}
function resetPassword(){if(confirm("Reset login ke admin / admin123? Data transaksi dan stok tetap dipertahankan.")){state.auth={username:"admin",password:"admin123"};saveState();toast("Password direset. Login: admin / admin123","success")}}
function saveDrive(){state.driveUrl=byId("driveUrl").value.trim();saveState();toast("URL Google Drive Web App disimpan","success")}
function updateSyncUI(){const dot=byId("syncDot"),txt=byId("syncText");if(!dot||!txt)return;if(state.driveUrl){dot.classList.remove("warn");txt.textContent=state.lastSync?"Drive sync: "+new Date(state.lastSync).toLocaleTimeString("id-ID"):"Google Drive siap"}else{dot.classList.add("warn");txt.textContent="Penyimpanan lokal"}}
async function syncDrive(){
  if(!state.driveUrl)return toast("Isi URL Web App Google Apps Script di Pengaturan terlebih dahulu","error");
  try{
    byId("syncStatus").textContent="Mengirim data ke Google Drive...";
    const r=await fetch(state.driveUrl,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({action:"save",payload:state})});
    const x=await r.json();if(!x.ok)throw Error(x.error||"Gagal");
    state.lastSync=nowISO();saveState();byId("syncStatus").textContent="✓ Sinkron berhasil: "+formatDateTime(state.lastSync);toast("Data tersimpan ke Google Drive","success");
  }catch(e){byId("syncStatus").textContent="✕ Sinkron gagal: "+e.message;toast("Sinkron gagal. Periksa URL Web App dan izin akses.","error")}
}
function closeModal(){byId("modal").classList.add("hidden");byId("modalBody").innerHTML=""}

if(sessionStorage.getItem("dapurLoggedIn")==="1")showApp();
init();
})();