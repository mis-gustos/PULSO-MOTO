/* PULSO MOTO — interfaz de tienda conectada a la API del servidor */
const CART_KEY = "pulsoMotoCart";
const LEGACY_CART_KEY = "rutaMotoCart";
const FALLBACK_IMAGE = "placeholder.svg";
let publicConfig = { whatsappNumber: "" };
let currentUser = null;
let allProducts = [];

const money = value => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(Number(value || 0));
const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const qs = (selector, root=document) => root.querySelector(selector);
const qsa = (selector, root=document) => [...root.querySelectorAll(selector)];

async function api(url, options={}) {
  const response = await fetch(url, { credentials: "same-origin", ...options, headers: { ...(options.body instanceof FormData ? {} : {"Content-Type":"application/json"}), ...(options.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Error ${response.status}. No se pudo completar la operación.`);
  return data;
}
function readCart() {
  try {
    let raw = localStorage.getItem(CART_KEY);
    if (!raw) {
      const legacy = JSON.parse(localStorage.getItem(LEGACY_CART_KEY) || "[]");
      if (Array.isArray(legacy) && legacy.length) {
        const migrated = legacy.map(x => typeof x === "number" ? {id:x, quantity:1} : x);
        localStorage.setItem(CART_KEY, JSON.stringify(migrated));
        localStorage.removeItem(LEGACY_CART_KEY);
        raw = JSON.stringify(migrated);
      }
    }
    const parsed = JSON.parse(raw || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.map(x => ({ id:Number(x.id), quantity:Math.max(1,Math.min(10,Number(x.quantity)||1)) })).filter(x => Number.isInteger(x.id) && x.id>0);
  } catch { return []; }
}
function saveCart(cart) { localStorage.setItem(CART_KEY, JSON.stringify(cart)); updateCartCount(); }
function updateCartCount() {
  const count = readCart().reduce((sum,line)=>sum+line.quantity,0);
  qsa("#cart-count").forEach(el => { el.textContent = count; el.hidden = count === 0; });
}
function toast(message) {
  const el = qs("#toast");
  if (!el) { alert(message); return; }
  el.textContent = message; el.classList.add("show");
  window.clearTimeout(toast.timer); toast.timer = window.setTimeout(()=>el.classList.remove("show"),3200);
}
function productPrice(p) {
  if (p.price) return `<strong class="price">${money(p.price)}</strong>`;
  if (p.reference_price) return `<strong class="price">${money(p.reference_price)}</strong><small class="reference-note">Precio sugerido de referencia</small>`;
  return `<strong class="price">Consultar precio</strong>`;
}
function card(p, isMoto=false) {
  const image = esc(p.image || FALLBACK_IMAGE);
  const specs = Array.isArray(p.specs) ? p.specs.slice(0,3) : [];
  if (isMoto) {
    const purchasePrice = p.reference_price ? `<strong class="price">${money(p.reference_price)}</strong><small class="reference-note">Precio sugerido del fabricante · verificar vigencia</small>` : `<strong class="price">Consultar precio</strong>`;
    return `<article class="product-card moto-card"><a class="product-image moto-image" href="${esc(p.source_url || 'motos.html')}" target="_blank" rel="noopener"><img src="${image}" alt="${esc(p.name)}" loading="lazy"><span class="product-tag">${esc(p.brand || 'MOTO')}</span></a><div class="product-info"><span class="product-category">${esc(p.category || 'Motocicleta')}</span><h3>${esc(p.name)}</h3><p class="moto-description">${esc(p.description || '')}</p>${specs.length?`<ul class="moto-specs">${specs.map(s=>`<li>${esc(s)}</li>`).join('')}</ul>`:''}<div class="moto-price">${purchasePrice}</div><div class="moto-actions"><a class="btn btn-primary" href="contacto.html?modelo=${encodeURIComponent(p.name)}">CONSULTAR MODELO ↗</a><a class="source-link" href="${esc(p.source_url || '#')}" target="_blank" rel="noopener">FICHA OFICIAL</a></div></div></article>`;
  }
  const canBuy = Number(p.price)>0 && Number(p.stock)>0;
  const action = canBuy ? `<button class="add-btn" type="button" data-add="${Number(p.id)}" aria-label="Agregar ${esc(p.name)}">+</button>` : `<a class="add-btn consult-btn" href="contacto.html?consulta=${encodeURIComponent(p.name)}" aria-label="Consultar ${esc(p.name)}">↗</a>`;
  return `<article class="product-card"><div class="product-image"><img src="${image}" alt="${esc(p.name)}" loading="lazy"><span class="product-tag">${esc(p.brand || p.category || 'PULSO')}</span></div><div class="product-info"><span class="product-category">${esc(p.category || '')}</span><h3>${esc(p.name)}</h3><p class="product-description">${esc(p.description || '')}</p><div class="product-bottom"><div>${productPrice(p)}</div>${action}</div>${!canBuy?'<small class="stock-note">Consultar precio y disponibilidad</small>':''}</div></article>`;
}
function renderCards(el, products, isMoto=false) {
  if (!el) return;
  el.innerHTML = products.length ? products.map(p=>card(p,isMoto)).join('') : '<div class="empty-state">Todavía no hay publicaciones disponibles en esta sección.</div>';
  qsa('img',el).forEach(img=>img.addEventListener('error',()=>{ if(img.src !== new URL(FALLBACK_IMAGE,location.href).href) img.src=FALLBACK_IMAGE; },{once:true}));
}
async function loadProducts(kind) {
  const data = await api(`/api/products?kind=${encodeURIComponent(kind)}`);
  return data.products || [];
}
async function loadCatalogs() {
  const home = qs('#home-motos');
  const motoGrid = qs('#motos-products');
  const accessoryGrid = qs('#catalog-products');
  const kitGrid = qs('#kits-products');
  const requests = [];
  if (home || motoGrid) requests.push(loadProducts('moto').then(list=>{ allProducts.push(...list); renderCards(home,list.slice(0,4),true); renderCards(motoGrid,list,true); }));
  if (accessoryGrid) requests.push(loadProducts('accessory').then(list=>{ allProducts.push(...list); setupAccessoryCatalog(list); }));
  if (kitGrid) requests.push(loadProducts('kit').then(list=>{ allProducts.push(...list); renderCards(kitGrid,list); }));
  await Promise.all(requests);
}
function setupAccessoryCatalog(list) {
  const grid=qs('#catalog-products'), count=qs('#result-count'), sortSelect=qs('#sort');
  let active='Todos', sort='featured';
  const draw=()=>{
    let filtered=list.filter(p=>active==='Todos'||p.category===active);
    if(sort==='low') filtered.sort((a,b)=>(a.price??a.reference_price??Infinity)-(b.price??b.reference_price??Infinity));
    if(sort==='high') filtered.sort((a,b)=>(b.price??b.reference_price??0)-(a.price??a.reference_price??0));
    renderCards(grid,filtered); if(count) count.textContent=`${filtered.length} artículos`;
  };
  qsa('.filter').forEach(btn=>btn.addEventListener('click',()=>{qsa('.filter').forEach(b=>b.classList.remove('active'));btn.classList.add('active');active=btn.dataset.filter||'Todos';draw();}));
  sortSelect?.addEventListener('change',e=>{sort=e.target.value;draw();}); draw();
}
function addToCart(id) {
  const p=allProducts.find(x=>Number(x.id)===Number(id));
  if(!p || !p.price || !p.stock){toast('Este artículo todavía no tiene precio y stock confirmados. Consultanos.');return;}
  const cart=readCart(), line=cart.find(x=>x.id===Number(id));
  if(line){ if(line.quantity>=10 || line.quantity>=p.stock){toast('No hay más unidades disponibles para agregar.');return;} line.quantity++; }
  else cart.push({id:Number(id),quantity:1});
  saveCart(cart); toast('Artículo agregado al carrito.');
}
async function setupCart() {
  const container=qs('#cart-items'); if(!container) return;
  const subtotal=qs('#cart-subtotal'), checkout=qs('#checkout-button');
  let products=[];
  try { products=(await api('/api/products')).products||[]; }
  catch(e){container.innerHTML=`<div class="empty-state">No se pudo conectar con la tienda. ${esc(e.message)}<br>La tienda debe ejecutarse en un servidor Node.js.</div>`;return;}
  const draw=()=>{
    const cart=readCart(); let total=0;
    if(!cart.length){container.innerHTML='<div class="empty-state cart-empty"><h3>Tu carrito está vacío.</h3><p>Cuando agregues productos, vas a poder revisarlos acá.</p><a class="btn btn-primary" href="accesorios.html">EXPLORAR ACCESORIOS ↗</a></div>'; if(subtotal) subtotal.textContent=money(0); if(checkout) checkout.disabled=true; updateCartCount(); return;}
    const rows=cart.map(line=>({line,p:products.find(p=>Number(p.id)===line.id)})).filter(x=>x.p);
    if(!rows.length){saveCart([]);container.innerHTML='<div class="empty-state">Los artículos del carrito ya no están publicados. El carrito se limpió; volvé al catálogo para elegir otros.</div>';if(subtotal)subtotal.textContent=money(0);if(checkout)checkout.disabled=true;return;}
    total=rows.reduce((sum,{line,p})=>sum+(Number(p.price)||0)*line.quantity,0);
    container.innerHTML=rows.map(({line,p})=>`<article class="cart-row"><img src="${esc(p.image||FALLBACK_IMAGE)}" alt="${esc(p.name)}"><div class="cart-row-info"><span class="product-category">${esc(p.category)}</span><h3>${esc(p.name)}</h3><strong>${p.price?money(p.price):'Precio a confirmar'}</strong><small>${Number(p.stock)>0?`${p.stock} unidades disponibles`:'Sin stock publicado'}</small></div><div class="quantity-control"><button type="button" data-qty="${p.id}" data-delta="-1" aria-label="Quitar una unidad">−</button><span>${line.quantity}</span><button type="button" data-qty="${p.id}" data-delta="1" aria-label="Agregar una unidad">+</button></div><button type="button" class="remove-item" data-remove="${p.id}">Quitar</button></article>`).join('');
    if(subtotal) subtotal.textContent=money(total); if(checkout) checkout.disabled=!rows.length || rows.some(({p})=>!p.price||p.stock<=0); updateCartCount();
  };
  container.addEventListener('click',e=>{
    const remove=e.target.closest('[data-remove]'); const qty=e.target.closest('[data-qty]');
    if(remove){saveCart(readCart().filter(x=>x.id!==Number(remove.dataset.remove)));draw();}
    if(qty){const id=Number(qty.dataset.qty),delta=Number(qty.dataset.delta),cart=readCart(),line=cart.find(x=>x.id===id),p=products.find(x=>Number(x.id)===id);if(!line)return;line.quantity+=delta;if(line.quantity<=0)saveCart(cart.filter(x=>x.id!==id));else if(line.quantity<=10 && line.quantity<=Number(p?.stock||0))saveCart(cart);else{line.quantity-=delta;toast('No hay stock suficiente.');}draw();}
  });
  checkout?.addEventListener('click',async()=>{
    const note=qs('#checkout-note'); checkout.disabled=true;
    try{
      const me=await api('/api/auth/me');
      if(!me.user){location.href='ingresar.html?next=carrito.html';return;}
      const result=await api('/api/checkout',{method:'POST',body:JSON.stringify({items:readCart()})});
      localStorage.removeItem(CART_KEY); updateCartCount(); location.href=result.checkoutUrl;
    }catch(e){if(note)note.textContent=e.message;toast(e.message);checkout.disabled=false;}
  });
  draw();
}
async function setupAuth() {
  try { const data=await api('/api/auth/me'); currentUser=data.user; } catch { currentUser=null; }
  const label=qs('#account-label'), link=qs('#account-link');
  if(label&&link&&currentUser){label.textContent='MI CUENTA';link.href='mi-cuenta.html';}
  const login=qs('#login-form');
  login?.addEventListener('submit',async e=>{e.preventDefault();const note=qs('#login-note');const fd=new FormData(login);try{const data=await api('/api/auth/login',{method:'POST',body:JSON.stringify({email:fd.get('email'),password:fd.get('password')})});currentUser=data.user;const next=new URLSearchParams(location.search).get('next');location.href=['carrito.html','mi-cuenta.html'].includes(next)?next:'mi-cuenta.html';}catch(err){if(note)note.textContent=err.message;}});
  const register=qs('#register-form');
  register?.addEventListener('submit',async e=>{e.preventDefault();const note=qs('#register-note');const fd=new FormData(register);try{await api('/api/auth/register',{method:'POST',body:JSON.stringify({name:fd.get('name'),email:fd.get('email'),password:fd.get('password')})});location.href='mi-cuenta.html';}catch(err){if(note)note.textContent=err.message;}});
  const logout=qs('#logout-button');
  logout?.addEventListener('click',async()=>{try{await api('/api/auth/logout',{method:'POST',body:'{}'});location.href='index.html';}catch(e){toast(e.message);}});
  if(qs('#profile-name')){
    if(!currentUser){location.href='ingresar.html?next=mi-cuenta.html';return;}
    qs('#profile-name').textContent=currentUser.name;qs('#profile-email').textContent=currentUser.email;
    try{const data=await api('/api/orders/mine');const target=qs('#my-orders');target.innerHTML=data.orders.length?data.orders.map(o=>`<article class="order-row"><div><strong>Pedido #${esc(o.id.slice(0,8))}</strong><small>${esc(new Date(o.created_at+'Z').toLocaleDateString('es-AR'))}</small></div><strong>${money(o.total)}</strong><span class="order-status">${esc(o.status)}</span></article>`).join(''):'<div class="empty-state">Todavía no tenés pedidos.</div>';}catch(e){qs('#my-orders').textContent=e.message;}
  }
}
async function setupPayment(){
  if(!qs('#payment-title'))return;const params=new URLSearchParams(location.search),id=params.get('pedido'),state=params.get('estado');
  if(!id){qs('#payment-title').textContent='No encontramos el pedido';qs('#payment-message').textContent='Volvé a tu cuenta para revisar el historial.';return;}
  try{const data=await api(`/api/orders/${encodeURIComponent(id)}`);const status=data.order.status;const labels={paid:['Pago confirmado','Tu pago fue aprobado y el pedido quedó registrado.'],awaiting_payment:['Pago pendiente','El pedido está esperando confirmación de Mercado Pago.'],payment_error:['No se pudo completar el pago','No se confirmó el cobro. Podés revisar el carrito e intentar nuevamente.'],cancelled:['Pedido cancelado','El pedido fue cancelado.']};const view=labels[status]||['Estado del pedido',`Estado actual: ${status}`];qs('#payment-title').textContent=view[0];qs('#payment-message').textContent=view[1];qs('#payment-id').textContent=`Pedido ${id.slice(0,8)} · ${state||status}`;}catch(e){qs('#payment-title').textContent='No pudimos verificar el pedido';qs('#payment-message').textContent=e.message;}
}
async function setupContact(){
  const form=qs('#contact-form');if(!form)return;
  try{publicConfig=await api('/api/public-config');}catch{}
  const params=new URLSearchParams(location.search);const initial=params.get('modelo')||params.get('consulta');if(initial){const message=qs('[name="mensaje"]');if(message)message.value=`Quisiera consultar por: ${initial}.` ;const tema=qs('[name="tema"]');if(tema&&params.has('modelo'))tema.value='Compra de una moto';}
  form.addEventListener('submit',e=>{e.preventDefault();const fd=new FormData(form);const message=`Hola, soy ${fd.get('nombre')}. Mi WhatsApp: ${fd.get('telefono')}. Consulta: ${fd.get('tema')}. Detalles: ${fd.get('mensaje')||'Quisiera más información.'}`;if(!publicConfig.whatsappNumber){const note=qs('#form-note');if(note)note.textContent='El formulario está listo, pero falta configurar WHATSAPP_NUMBER en el archivo .env del servidor.';return;}window.open(`https://wa.me/${publicConfig.whatsappNumber}?text=${encodeURIComponent(message)}`,'_blank','noopener');});
}
async function setupAdmin(){
 const root=qs('#admin-app');if(!root)return;
 const denied=qs('#admin-denied');
 try{const [summary,products,orders]=await Promise.all([api('/api/admin/summary'),api('/api/admin/products'),api('/api/admin/orders')]);root.classList.remove('hidden');denied?.classList.add('hidden');
  qs('#admin-stats').innerHTML=[['Productos',summary.products],['Clientes',summary.customers],['Pendientes',summary.pending],['Pagados',summary.paid]].map(([k,v])=>`<div class="stat-card"><span>${k}</span><strong>${v}</strong></div>`).join('');
  const table=qs('#admin-products');table.innerHTML=`<table><thead><tr><th>Producto</th><th>Tipo</th><th>Precio</th><th>Stock</th><th>Acciones</th></tr></thead><tbody>${products.products.map(p=>`<tr><td>${esc(p.name)}</td><td>${esc(p.kind)}</td><td>${p.price?money(p.price):'Consultar'}</td><td>${p.stock}</td><td><button data-edit="${p.id}">Editar</button> <button data-hide="${p.id}">Ocultar</button></td></tr>`).join('')}</tbody></table>`;
  qs('#admin-orders').innerHTML=orders.orders.length?`<table><thead><tr><th>Pedido</th><th>Cliente</th><th>Total</th><th>Estado</th><th>Entrega</th></tr></thead><tbody>${orders.orders.map(o=>`<tr><td>${esc(o.id.slice(0,8))}</td><td>${esc(o.customer_name)}<small>${esc(o.customer_email)}</small></td><td>${money(o.total)}</td><td>${esc(o.status)}</td><td><select data-fulfillment="${esc(o.id)}"><option value="new" ${o.fulfillment_status==='new'?'selected':''}>Nuevo</option><option value="preparing" ${o.fulfillment_status==='preparing'?'selected':''}>Preparando</option><option value="shipped" ${o.fulfillment_status==='shipped'?'selected':''}>Enviado</option><option value="delivered" ${o.fulfillment_status==='delivered'?'selected':''}>Entregado</option><option value="cancelled" ${o.fulfillment_status==='cancelled'?'selected':''}>Cancelado</option></select></td></tr>`).join('')}</tbody></table>`:'Todavía no hay pedidos.';
  table.addEventListener('click',async e=>{const edit=e.target.closest('[data-edit]');const hide=e.target.closest('[data-hide]');if(edit){const p=products.products.find(x=>x.id===Number(edit.dataset.edit));const form=qs('#product-form');for(const [k,v] of Object.entries(p)){const input=form.elements[k];if(!input||input.type==='file')continue;if(input.type==='checkbox')input.checked=!!v;else if(k==='specs')input.value=(v||[]).join('\n');else input.value=v??'';}qs('#product-form-title').textContent='EDITAR PRODUCTO';form.scrollIntoView({behavior:'smooth'});}if(hide&&confirm('¿Ocultar este producto del catálogo?')){try{await api(`/api/admin/products/${hide.dataset.hide}`,{method:'DELETE'});location.reload();}catch(err){toast(err.message);}}});
  qs('#admin-orders').addEventListener('change',async e=>{const s=e.target.closest('[data-fulfillment]');if(s){try{await api(`/api/admin/orders/${encodeURIComponent(s.dataset.fulfillment)}/fulfillment`,{method:'PATCH',body:JSON.stringify({status:s.value})});toast('Estado de entrega actualizado.');}catch(err){toast(err.message);}}});
  const form=qs('#product-form');form?.addEventListener('submit',async e=>{e.preventDefault();const fd=new FormData(form);fd.set('specs',JSON.stringify(String(fd.get('specs')||'').split('\n').map(x=>x.trim()).filter(Boolean)));fd.set('active',form.elements.active.checked?'true':'false');fd.set('featured',form.elements.featured.checked?'true':'false');const id=fd.get('id');try{await api(id?`/api/admin/products/${id}`:'/api/admin/products',{method:id?'PUT':'POST',body:fd});toast('Producto guardado.');location.reload();}catch(err){qs('#admin-product-note').textContent=err.message;}});
  qs('#reset-product')?.addEventListener('click',()=>{form.reset();form.elements.id.value='';qs('#product-form-title').textContent='CARGAR PRODUCTO.';});
 }catch(e){denied?.classList.remove('hidden');if(denied)denied.innerHTML=`${esc(e.message)} <a href="ingresar.html">Iniciar sesión</a>`;}
}

document.addEventListener('DOMContentLoaded',async()=>{
  updateCartCount();
  qs('.menu-toggle')?.addEventListener('click',()=>{const nav=qs('.nav');nav?.classList.toggle('open');const b=qs('.menu-toggle');b?.setAttribute('aria-expanded',nav?.classList.contains('open')?'true':'false');});
  try{await setupAuth();}catch(e){console.warn(e);}
  try{await loadCatalogs();}catch(e){console.error(e);qsa('#home-motos,#motos-products,#catalog-products,#kits-products').forEach(el=>el.innerHTML=`<div class="empty-state">No pudimos cargar el catálogo. Verificá que la tienda esté ejecutándose desde el servidor PULSO MOTO. (${esc(e.message)})</div>`);}
  await setupCart(); await setupPayment(); await setupContact(); await setupAdmin();
  document.addEventListener('click',e=>{const b=e.target.closest('[data-add]');if(b)addToCart(Number(b.dataset.add));});
});
