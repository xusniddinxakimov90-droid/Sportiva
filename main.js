/* ===== Sportiva — main.js ===== */
const STORE_NAME = 'Sportiva';
const KEY = { products: 'sportMaxProducts', theme: 'sportMaxTheme', cart: 'sportMaxCart' };
const OLD_KEY = { products: 'sportEliteProducts', theme: 'sportEliteTheme' }; // eski ma'lumotni ko'chirish uchun

let products = [];
let cart = []; // [{ id, qty }]
let currentFilter = 'all';
let deleteId = null;
let viewId = null;
let pendingImg = '';
let editPendingImg = '';

const CAT_LABELS = {
    'krossovka': '👟 Krossovka',
    'futbol-topi': '⚽ Futbol to\'pi',
    'kiyim': '👕 Kiyim',
    'anjom': '🏋️ Anjom'
};
const CAT_ICONS = { krossovka: '👟', 'futbol-topi': '⚽', kiyim: '👕', anjom: '🏋️' };
const CAT_TITLES = { krossovka: '👟 Krossovkalar', 'futbol-topi': '⚽ Futbol to\'plari', kiyim: '👕 Kiyimlar', anjom: '🏋️ Anjomlar' };
const PLACEHOLDER_PREVIEW = '<span style="font-size:2rem">📷</span><span style="font-size:0.85rem">Rasm tanlash uchun bosing</span>';
const PLACEHOLDER_PREVIEW_SM = '<span style="font-size:1.5rem">📷</span>';

/* ---------- Yordamchi funksiyalar ---------- */
function esc(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
// Faqat http(s) va data:image manzillariga ruxsat (XSS himoyasi)
function safeUrl(u) {
    u = (u || '').trim();
    return /^(https?:\/\/|data:image\/)/i.test(u) ? u : '';
}
function fmt(n) {
    return new Intl.NumberFormat('uz-UZ').format(Math.round(n)) + ' so\'m';
}
function icon(p) { return CAT_ICONS[p.category] || '📦'; }

// Rasm yuklanmasa ikonka bilan almashtirish
function imgFail(el) {
    const d = document.createElement('div');
    d.className = el.dataset.fb || 'img-fallback';
    d.textContent = el.dataset.icon || '📦';
    el.replaceWith(d);
}
function imgHtml(p, cls, fb) {
    const url = safeUrl(p.img);
    if (!url) return `<div class="${fb || 'img-fallback'}">${icon(p)}</div>`;
    return `<img ${cls ? `class="${cls}"` : ''} src="${esc(url)}" alt="${esc(p.name)}" loading="lazy" data-icon="${icon(p)}" data-fb="${fb || 'img-fallback'}" onerror="imgFail(this)">`;
}

/* ---------- Saqlash ---------- */
function saveProducts() {
    try {
        localStorage.setItem(KEY.products, JSON.stringify(products));
        return true;
    } catch (e) {
        showToast('error', '⚠️', 'Xotira to\'lgan! Rasmlarni kichikroq tanlang yoki ba\'zi mahsulotlarni o\'chiring.');
        return false;
    }
}
function loadProducts() {
    try {
        let d = localStorage.getItem(KEY.products);
        if (d === null) d = localStorage.getItem(OLD_KEY.products); // eski do'kon ma'lumotlarini ko'chirish
        products = d ? JSON.parse(d) : [];
        if (!Array.isArray(products)) products = [];
    } catch (e) { products = []; }
    if (!products.length) seedDemoData(); else saveProducts();
}
function seedDemoData() {
    products = [
        { id: '1', name: 'Nike Air Max 270', price: 1250000, oldPrice: 1600000, category: 'krossovka', img: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400', desc: 'Eng zamonaviy Nike Air Max seriyasidan. Maksimal rahatlik va chiroyli dizayn.' },
        { id: '2', name: 'Adidas Ultraboost 22', price: 980000, category: 'krossovka', img: 'https://images.unsplash.com/photo-1551107696-a4b0c5a0d9a2?w=400', desc: 'Yugurishga mo\'ljallangan professional krossovka. Boost texnologiyasi bilan.' },
        { id: '3', name: 'FIFA Pro Ball 2024', price: 320000, oldPrice: 400000, category: 'futbol-topi', img: 'https://images.unsplash.com/photo-1606925797300-0b35e9d1794e?w=400', desc: 'Chempionlik darajasidagi futbol to\'pi. Rasmiy o\'lcham va vazn.' },
        { id: '4', name: 'Adidas Sport Futbolka', price: 185000, oldPrice: 230000, category: 'kiyim', img: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400', desc: 'Nafas oladigan sport futbolkasi. Poliester va elastan aralashmasi.' },
        { id: '5', name: 'Protein Shaker Pro', price: 95000, category: 'anjom', img: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400', desc: 'Sifatli plastikdan yasalgan 700ml protein shaker. Chiqmaydigan qopqoq.' },
        { id: '6', name: 'Puma RS-X Level Up', price: 870000, oldPrice: 1000000, category: 'krossovka', img: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=400', desc: 'Puma RS-X seriyasi — retro uslub va zamonaviy texnologiyalar birikuvi.' },
    ];
    saveProducts();
}

/* ---------- Savat ---------- */
function loadCart() {
    try { cart = JSON.parse(localStorage.getItem(KEY.cart) || '[]'); } catch (e) { cart = []; }
    if (!Array.isArray(cart)) cart = [];
    cart = cart.filter(i => i && products.some(p => p.id === i.id) && i.qty > 0);
}
function saveCart() {
    try { localStorage.setItem(KEY.cart, JSON.stringify(cart)); } catch (e) { /* e'tiborsiz */ }
    updateCartBadge();
}
function updateCartBadge() {
    document.getElementById('cartBadge').textContent = cart.reduce((s, i) => s + i.qty, 0);
}
function addToCart(id) {
    const p = products.find(x => x.id === id);
    if (!p) return;
    const item = cart.find(i => i.id === id);
    if (item) item.qty++; else cart.push({ id, qty: 1 });
    saveCart();
    showToast('success', '🛒', `"${p.name}" savatga qo'shildi!`);
}
function changeQty(id, d) {
    const item = cart.find(i => i.id === id);
    if (!item) return;
    item.qty += d;
    if (item.qty <= 0) cart = cart.filter(i => i.id !== id);
    saveCart();
    renderCart();
}
function removeFromCart(id) {
    cart = cart.filter(i => i.id !== id);
    saveCart();
    renderCart();
}
function clearCart() {
    cart = [];
    saveCart();
    renderCart();
}
function checkout() {
    if (!cart.length) return;
    clearCart();
    closeModal('cartModal');
    showToast('success', '✅', 'Buyurtmangiz qabul qilindi! Tez orada bog\'lanamiz.');
}
function openCart() {
    renderCart();
    openModal('cartModal');
}
function renderCart() {
    const box = document.getElementById('cartItems');
    cart = cart.filter(i => products.some(p => p.id === i.id));
    let total = 0;
    if (!cart.length) {
        box.innerHTML = '<p style="color:var(--text-secondary);text-align:center;padding:2rem">Savat bo\'sh 🛒</p>';
    } else {
        box.innerHTML = cart.map(i => {
            const p = products.find(x => x.id === i.id);
            total += p.price * i.qty;
            return `<div class="cart-item">
        <div class="cart-thumb">${imgHtml(p, '', 'img-fallback')}</div>
        <div class="cart-info">
          <div class="cart-name">${esc(p.name)}</div>
          <div class="cart-price">${fmt(p.price * i.qty)}</div>
        </div>
        <div class="qty">
          <button onclick="changeQty('${p.id}',-1)" aria-label="Kamaytirish">−</button>
          <span>${i.qty}</span>
          <button onclick="changeQty('${p.id}',1)" aria-label="Ko'paytirish">+</button>
        </div>
        <button class="qty-remove" onclick="removeFromCart('${p.id}')" title="O'chirish">🗑️</button>
      </div>`;
        }).join('');
    }
    document.getElementById('cartTotal').textContent = fmt(total);
    document.getElementById('cartActions').style.display = cart.length ? 'block' : 'none';
    updateCartBadge();
}

/* ---------- Navigatsiya ---------- */
function navigate(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    const el = document.getElementById('page-' + page);
    if (el) el.classList.add('active');
    document.querySelectorAll(`.nav-link[data-page="${page}"]`).forEach(l => l.classList.add('active'));
    document.getElementById('mobileMenu').classList.remove('open');
    window.scrollTo(0, 0);
    renderPage(page);
    setTimeout(initScrollAnimations, 100);
}
function renderPage(page) {
    if (page === 'home') renderHome();
    else if (page === 'products') renderProducts();
    else if (page === 'categories') renderCategories();
    else if (page === 'admin') renderAdmin();
}
// Hozir ochiq sahifani qayta chizish (qo'shish/tahrirlash/o'chirishdan keyin)
function refreshAll() {
    const active = document.querySelector('.page.active');
    if (active) renderPage(active.id.replace('page-', ''));
    updateStats();
}
function toggleMobile() {
    document.getElementById('mobileMenu').classList.toggle('open');
}

/* ---------- Bosh sahifa ---------- */
function updateStats() {
    document.getElementById('statTotal').textContent = products.length;
    document.getElementById('statCats').textContent = Object.keys(CAT_LABELS).length;
}
function renderHome() {
    updateStats();
    const grid = document.getElementById('homeProductsGrid');
    const top = products.slice(0, 6);
    grid.innerHTML = top.length ? top.map(productCard).join('') : '<p style="color:var(--text-secondary);grid-column:1/-1;text-align:center;padding:3rem">Hali mahsulot yo\'q. Admin paneldan qo\'shing!</p>';
    renderDeals();
    duplicateSlider();
}
function renderDeals() {
    const grid = document.getElementById('dealsGrid');
    // Faqat haqiqiy eski narxi bor (chegirmali) mahsulotlar
    const items = products.filter(p => p.oldPrice && p.oldPrice > p.price).slice(0, 4);
    if (!items.length) {
        grid.innerHTML = '<p style="color:var(--text-secondary);text-align:center;padding:2rem;grid-column:1/-1">Hozircha chegirmali mahsulot yo\'q. Mahsulot qo\'shishda "Eski narx" kiriting.</p>';
        return;
    }
    grid.innerHTML = items.map(p => {
        const pct = Math.round((1 - p.price / p.oldPrice) * 100);
        return `<div class="deal-card">
      <div class="deal-ribbon">-${pct}%</div>
      <div class="deal-card-img">${imgHtml(p, '', 'img-fallback')}</div>
      <div class="deal-info">
        <div class="deal-name">${esc(p.name)}</div>
        <div class="deal-prices">
          <span class="deal-price-new">${fmt(p.price)}</span>
          <span class="deal-price-old">${fmt(p.oldPrice)}</span>
        </div>
        <button class="btn btn-outline" style="width:100%;padding:0.5rem;font-size:0.85rem" onclick="openView('${p.id}')">Ko'rish →</button>
      </div>
    </div>`;
    }).join('');
}
function duplicateSlider() {
    const t = document.getElementById('sliderTrack');
    if (!t || t.dataset.dup) return;
    t.innerHTML += t.innerHTML;
    t.dataset.dup = '1';
}

/* ---------- Mahsulotlar ---------- */
function productCard(p) {
    return `<div class="product-card">
    <div class="product-img-wrap">
      ${imgHtml(p, 'product-img', 'product-no-img')}
      <div class="product-badge badge-new">${esc(CAT_LABELS[p.category] || p.category)}</div>
      <div class="product-overlay">
        <button class="overlay-btn" onclick="openView('${p.id}')" title="Ko'rish">👁</button>
        <button class="overlay-btn" onclick="openEdit('${p.id}')" title="Tahrirlash">✏️</button>
        <button class="overlay-btn del" onclick="openDelete('${p.id}')" title="O'chirish">🗑️</button>
      </div>
    </div>
    <div class="product-info">
      <div class="product-category">${esc(CAT_LABELS[p.category] || p.category)}</div>
      <div class="product-name">${esc(p.name)}</div>
      <div class="product-desc">${esc(p.desc || '')}</div>
      <div class="product-footer">
        <div class="product-price">${fmt(p.price)}</div>
        <button class="add-cart-btn" onclick="addToCart('${p.id}')" title="Savatga qo'shish">+</button>
      </div>
    </div>
  </div>`;
}
function renderProducts() { filterProducts(); }
function filterProducts() {
    const q = (document.getElementById('searchInput')?.value || '').trim().toLowerCase();
    const sort = document.getElementById('sortSelect')?.value || '';
    const list = products.filter(p => {
        const matchCat = currentFilter === 'all' || p.category === currentFilter;
        const matchQ = !q || p.name.toLowerCase().includes(q) || (p.desc || '').toLowerCase().includes(q);
        return matchCat && matchQ;
    });
    if (sort === 'cheap') list.sort((a, b) => a.price - b.price);
    else if (sort === 'expensive') list.sort((a, b) => b.price - a.price);
    else if (sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
    const grid = document.getElementById('productsGrid');
    const noEl = document.getElementById('noProducts');
    if (!list.length) { grid.innerHTML = ''; noEl.style.display = 'block'; }
    else { noEl.style.display = 'none'; grid.innerHTML = list.map(productCard).join(''); }
}
function setFilter(cat) {
    currentFilter = cat;
    document.querySelectorAll('.filter-tab').forEach(t => t.classList.toggle('active', t.dataset.cat === cat));
    filterProducts();
}

/* ---------- Kategoriyalar ---------- */
let currentCat = 'all';
function renderCategories() {
    Object.keys(CAT_LABELS).forEach(c => {
        const el = document.getElementById('count-' + c);
        if (el) el.textContent = products.filter(p => p.category === c).length + ' mahsulot';
    });
    renderCatProducts(currentCat);
}
function goCat(cat) {
    currentCat = cat;
    navigate('categories');
}
function renderCatProducts(cat) {
    currentCat = cat;
    const list = cat === 'all' ? products : products.filter(p => p.category === cat);
    const title = document.getElementById('catSectionTitle');
    if (title) title.textContent = CAT_TITLES[cat] || 'Barcha mahsulotlar';
    document.getElementById('catProductsGrid').innerHTML = list.length
        ? list.map(productCard).join('')
        : '<p style="color:var(--text-secondary);grid-column:1/-1;text-align:center;padding:3rem">Bu kategoriyada mahsulot yo\'q</p>';
}

/* ---------- Admin ---------- */
function adminNav(section) {
    document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
    document.getElementById('as-' + section).classList.add('active');
    document.getElementById('sl-' + section).classList.add('active');
    if (section === 'dashboard') renderDashboard();
    if (section === 'manage') renderAdminProducts();
}
function renderAdmin() {
    renderDashboard();
    // Agar "boshqarish" bo'limi ochiq bo'lsa, uni ham yangilaymiz
    if (document.getElementById('as-manage').classList.contains('active')) renderAdminProducts();
}
function renderDashboard() {
    const cnt = c => products.filter(p => p.category === c).length;
    document.getElementById('dashTotal').textContent = products.length;
    document.getElementById('dashShoe').textContent = cnt('krossovka');
    document.getElementById('dashBall').textContent = cnt('futbol-topi');
    document.getElementById('dashCloth').textContent = cnt('kiyim');
    document.getElementById('dashGear').textContent = cnt('anjom');
    const rec = document.getElementById('recentProducts');
    const recent = products.slice(0, 5); // eng yangilari boshida (unshift)
    rec.innerHTML = recent.length ? recent.map(p => `
    <div class="recent-row">
      <div class="cart-thumb">${imgHtml(p, '', 'img-fallback')}</div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:600;font-size:0.9rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(p.name)}</div>
        <div style="font-size:0.78rem;color:var(--text-secondary)">${esc(CAT_LABELS[p.category] || p.category)}</div>
      </div>
      <div style="font-weight:700;color:var(--accent);font-size:0.9rem;flex-shrink:0">${fmt(p.price)}</div>
    </div>`).join('') : '<p style="color:var(--text-secondary);text-align:center;padding:2rem">Hali mahsulot yo\'q</p>';
}
function renderAdminProducts() {
    const grid = document.getElementById('adminProductsGrid');
    const noEl = document.getElementById('noAdminProducts');
    if (!products.length) { grid.innerHTML = ''; noEl.style.display = 'block'; return; }
    noEl.style.display = 'none';
    grid.innerHTML = products.map(p => `<div class="admin-card">
      <div class="admin-card-img">${imgHtml(p, 'admin-thumb', 'img-fallback')}</div>
      <div class="admin-card-body">
        <div class="admin-card-cat">${esc(CAT_LABELS[p.category] || p.category)}</div>
        <div class="admin-card-name">${esc(p.name)}</div>
        <div class="admin-card-price" style="margin-bottom:0.75rem">${fmt(p.price)}</div>
        <div class="admin-card-actions">
          <button class="action-btn edit" onclick="openEdit('${p.id}')">✏️ Edit</button>
          <button class="action-btn del" onclick="openDelete('${p.id}')">🗑️ Del</button>
        </div>
      </div>
    </div>`).join('');
}

/* ---------- Rasm yuklash (kichraytirib) ---------- */
function readImage(file, cb) {
    const reader = new FileReader();
    reader.onload = e => {
        const im = new Image();
        im.onload = () => {
            const k = Math.min(1, 700 / Math.max(im.width, im.height));
            const c = document.createElement('canvas');
            c.width = Math.round(im.width * k);
            c.height = Math.round(im.height * k);
            c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
            cb(c.toDataURL('image/jpeg', 0.8));
        };
        im.onerror = () => showToast('error', '⚠️', 'Rasmni o\'qib bo\'lmadi!');
        im.src = e.target.result;
    };
    reader.readAsDataURL(file);
}
function setPreview(id, url, placeholder) {
    const prev = document.getElementById(id);
    const u = safeUrl(url);
    prev.innerHTML = u ? `<img src="${esc(u)}" alt="" onerror="this.style.display='none'">` : placeholder;
}
function previewImg() {
    const url = document.getElementById('fImgUrl').value.trim();
    pendingImg = safeUrl(url);
    setPreview('imgPreview', url, PLACEHOLDER_PREVIEW);
}
function handleFileUpload(input) {
    const file = input.files[0];
    if (!file) return;
    readImage(file, data => { pendingImg = data; setPreview('imgPreview', data, PLACEHOLDER_PREVIEW); });
}
function previewEditImg() {
    const url = document.getElementById('eImgUrl').value.trim();
    editPendingImg = safeUrl(url);
    setPreview('eImgPreview', url, PLACEHOLDER_PREVIEW_SM);
}
function handleEditFileUpload(input) {
    const file = input.files[0];
    if (!file) return;
    readImage(file, data => { editPendingImg = data; setPreview('eImgPreview', data, PLACEHOLDER_PREVIEW_SM); });
}

/* ---------- Qo'shish / tahrirlash / o'chirish ---------- */
function readOldPrice(id, price) {
    const raw = document.getElementById(id).value;
    if (raw === '') return { ok: true, value: undefined };
    const v = parseFloat(raw);
    if (!(v > price)) { showToast('error', '⚠️', 'Eski narx joriy narxdan katta bo\'lishi kerak!'); return { ok: false }; }
    return { ok: true, value: v };
}
function addProduct() {
    const name = document.getElementById('fName').value.trim();
    const price = parseFloat(document.getElementById('fPrice').value);
    const cat = document.getElementById('fCat').value;
    const desc = document.getElementById('fDesc').value.trim();
    if (!name) { showToast('error', '⚠️', 'Mahsulot nomini kiriting!'); return; }
    if (!price || price <= 0) { showToast('error', '⚠️', 'Narxni kiriting!'); return; }
    if (!cat) { showToast('error', '⚠️', 'Kategoriyani tanlang!'); return; }
    const old = readOldPrice('fOld', price);
    if (!old.ok) return;
    const p = { id: Date.now().toString(), name, price, category: cat, img: pendingImg || safeUrl(document.getElementById('fImgUrl').value), desc };
    if (old.value) p.oldPrice = old.value;
    products.unshift(p);
    if (!saveProducts()) { products.shift(); return; }
    clearForm();
    showToast('success', '✅', `"${name}" muvaffaqiyatli qo'shildi!`);
    refreshAll();
}
function clearForm() {
    ['fName', 'fPrice', 'fOld', 'fDesc', 'fImgUrl'].forEach(id => { document.getElementById(id).value = ''; });
    document.getElementById('fCat').value = '';
    document.getElementById('fImgFile').value = '';
    document.getElementById('imgPreview').innerHTML = PLACEHOLDER_PREVIEW;
    pendingImg = '';
}
function openEdit(id) {
    const p = products.find(x => x.id === id);
    if (!p) return;
    document.getElementById('eId').value = id;
    document.getElementById('eName').value = p.name;
    document.getElementById('ePrice').value = p.price;
    document.getElementById('eOld').value = p.oldPrice || '';
    document.getElementById('eCat').value = p.category;
    document.getElementById('eImgUrl').value = /^data:/i.test(p.img || '') ? '' : (p.img || '');
    document.getElementById('eImgFile').value = '';
    document.getElementById('eDesc').value = p.desc || '';
    editPendingImg = p.img || '';
    setPreview('eImgPreview', p.img, PLACEHOLDER_PREVIEW_SM);
    openModal('editModal');
}
function saveEdit() {
    const id = document.getElementById('eId').value;
    const name = document.getElementById('eName').value.trim();
    const price = parseFloat(document.getElementById('ePrice').value);
    const cat = document.getElementById('eCat').value;
    const desc = document.getElementById('eDesc').value.trim();
    if (!name) { showToast('error', '⚠️', 'Nomi bo\'sh bo\'lmasin!'); return; }
    if (!price || price <= 0) { showToast('error', '⚠️', 'Narx kiritilmadi!'); return; }
    const old = readOldPrice('eOld', price);
    if (!old.ok) return;
    const idx = products.findIndex(p => p.id === id);
    if (idx < 0) return;
    const prev = products[idx];
    const updated = { id, name, price, category: cat, img: editPendingImg || safeUrl(document.getElementById('eImgUrl').value), desc };
    if (old.value) updated.oldPrice = old.value;
    products[idx] = updated;
    if (!saveProducts()) { products[idx] = prev; return; }
    closeModal('editModal');
    showToast('success', '✅', `"${name}" tahrirlandi!`);
    refreshAll();
}
function openDelete(id) {
    const p = products.find(x => x.id === id);
    if (!p) return;
    deleteId = id;
    document.getElementById('deleteProductName').textContent = p.name;
    openModal('deleteModal');
}
function confirmDelete() {
    if (!deleteId) return;
    const p = products.find(x => x.id === deleteId);
    products = products.filter(x => x.id !== deleteId);
    cart = cart.filter(i => i.id !== deleteId);
    saveProducts();
    saveCart();
    deleteId = null;
    closeModal('deleteModal');
    showToast('success', '🗑️', `"${p ? p.name : ''}" o'chirildi!`);
    refreshAll();
}
function openView(id) {
    const p = products.find(x => x.id === id);
    if (!p) return;
    viewId = id;
    document.getElementById('viewImg').innerHTML = imgHtml(p, '', 'img-fallback big');
    document.getElementById('viewCat').textContent = CAT_LABELS[p.category] || p.category;
    document.getElementById('viewName').textContent = p.name;
    document.getElementById('viewPrice').textContent = fmt(p.price);
    document.getElementById('viewDesc').textContent = p.desc || 'Tavsif mavjud emas.';
    openModal('viewModal');
}

/* ---------- Modal ---------- */
function openModal(id) {
    document.getElementById(id).classList.add('open');
    document.body.style.overflow = 'hidden';
}
function closeModal(id) {
    document.getElementById(id).classList.remove('open');
    if (!document.querySelector('.modal-overlay.open')) document.body.style.overflow = '';
}
document.querySelectorAll('.modal-overlay').forEach(m => {
    m.addEventListener('click', e => { if (e.target === m) closeModal(m.id); });
});
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') document.querySelectorAll('.modal-overlay.open').forEach(m => closeModal(m.id));
});

/* ---------- Toast ---------- */
function showToast(type, ic, msg) {
    const tc = document.getElementById('toastContainer');
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    const i = document.createElement('span'); i.className = 'toast-icon'; i.textContent = ic;
    const m = document.createElement('span'); m.textContent = msg; // textContent — xavfsiz
    t.append(i, m);
    tc.appendChild(t);
    requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add('show')));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, 3500);
}

/* ---------- Tema (qorong'i = 🌙, yorug' = ☀️) ---------- */
function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    document.querySelector('.theme-btn').textContent = t === 'dark' ? '🌙' : '☀️';
}
function toggleTheme() {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    try { localStorage.setItem(KEY.theme, next); } catch (e) { /* e'tiborsiz */ }
}

/* ---------- Skroll animatsiyalari ---------- */
window.addEventListener('scroll', () => {
    document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 20);
});
const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('visible'); revealObserver.unobserve(e.target); }
    });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
function initScrollAnimations() {
    document.querySelectorAll('.reveal:not(.visible),.reveal-left:not(.visible),.reveal-right:not(.visible)')
        .forEach(el => revealObserver.observe(el));
}

/* ---------- Ishga tushirish ---------- */
window.addEventListener('DOMContentLoaded', () => {
    let t = null;
    try { t = localStorage.getItem(KEY.theme) || localStorage.getItem(OLD_KEY.theme); } catch (e) { /* e'tiborsiz */ }
    applyTheme(t === 'light' ? 'light' : 'dark');
    document.querySelectorAll('.year').forEach(el => { el.textContent = new Date().getFullYear(); });
    loadProducts();
    loadCart();
    updateCartBadge();
    renderHome();
    initScrollAnimations();
    setTimeout(() => {
        const l = document.getElementById('loader');
        l.style.opacity = '0';
        setTimeout(() => l.remove(), 500);
    }, 1400);
});
