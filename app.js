/* Hamrah Man v3 - local-first prototype */
const STORE_KEY="hamrah-man-v1", STORE_KEY_V2="hamrah-man-v3";
const $=id=>document.getElementById(id);
// Attach dialog close controls immediately so an unrelated render error cannot disable them.
document.addEventListener("click",e=>{const b=e.target.closest("[data-close]");if(!b)return;const d=$(b.dataset.close);if(d?.open){e.preventDefault();e.stopPropagation();d.close()}},true);
let installPrompt=null, editingAssetId=null;
function uid(){return (crypto.randomUUID?crypto.randomUUID():String(Date.now())+Math.random().toString(16).slice(2))}
function loadState(){
 try{
  const current=JSON.parse(localStorage.getItem(STORE_KEY_V2)||"null");
  if(current&&Array.isArray(current.assets)){
   const normalized=normalize(current);
   // Recover legacy records without replacing current data.
   const old=JSON.parse(localStorage.getItem(STORE_KEY)||"{}");
   const oldState=normalize({assets:Array.isArray(old.assets)?old.assets:[],reminders:Array.isArray(old.reminders)?old.reminders:[],services:Array.isArray(old.services)?old.services:[]});
   oldState.assets.forEach(a=>{if(!normalized.assets.some(x=>x.id===a.id||x.name===a.name&&x.category===a.category))normalized.assets.push(a)});
   oldState.reminders.forEach(r=>{if(!normalized.reminders.some(x=>x.id===r.id||x.title===r.title&&x.assetId===r.assetId))normalized.reminders.push(r)});
   oldState.services.forEach(s=>{if(!normalized.services.some(x=>x.id===s.id||x.date===s.date&&x.cost===s.cost&&x.assetId===s.assetId&&x.reminderId===s.reminderId&&x.part===s.part))normalized.services.push(s)});
   return normalized;
  }
  const old=JSON.parse(localStorage.getItem(STORE_KEY)||"{}");
  const migrated=normalize({assets:Array.isArray(old.assets)?old.assets:[],reminders:Array.isArray(old.reminders)?old.reminders:[],services:[]});
  localStorage.setItem(STORE_KEY_V2,JSON.stringify(migrated)); return migrated;
 }catch{return {version:3,assets:[],reminders:[],services:[]}}
}
function normalize(v){
 const assets=(v.assets||[]).map(a=>({...a,id:a.id||uid(),category:a.category||"خودرو",model:a.model||"",year:a.year||"",plate:a.plate||"",vin:a.vin||"",odometer:Number(a.odometer)||0,notes:a.notes||"",details:a.details||{},status:a.status||"active"}));
 const reminders=(v.reminders||[]).map(r=>({...r,id:r.id||uid(),assetId:r.assetId||"",status:r.status||"open",triggerType:r.triggerType||"date",dueOdometer:r.dueOdometer||"",intervalDays:r.intervalDays||"",intervalKm:r.intervalKm||"",intervalValue:r.intervalValue||"",intervalUnit:r.intervalUnit||"days",dependsOn:r.dependsOn||"",history:Array.isArray(r.history)?r.history:[]}));
 const services=Array.isArray(v.services)?v.services.map(s=>({...s,id:s.id||uid(),reminderId:s.reminderId||"",assetId:s.assetId||"",cost:Number(s.cost)||0,odometer:Number(s.odometer)||0,part:s.part||"",notes:s.notes||""})):[];
// Recover the asset link from its reminder when older service records omitted assetId.
services.forEach(s=>{if(!s.assetId&&s.reminderId){const r=reminders.find(x=>x.id===s.reminderId);if(r?.assetId)s.assetId=r.assetId;}});
 // Older versions stored completed service records inside each reminder.history array.
 // Import those into the unified service ledger without deleting or overwriting the original history.
 reminders.forEach(r=>(r.history||[]).forEach((h,i)=>{
  if(!h||typeof h!=="object")return;
  const rawDate=h.date||h.serviceDate||h.completedAt||h.performedAt||h.createdAt||"";
  const date=typeof rawDate==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(rawDate)?rawDate:(rawDate?toISODate(rawDate):"");
  const legacy={id:"legacy-"+r.id+"-"+i,reminderId:r.id,assetId:h.assetId||r.assetId||"",date,odometer:Number(h.odometer??h.kilometers??h.km)||0,part:h.part||h.item||h.product||"",cost:Number(h.cost??h.amount??h.price)||0,notes:h.notes||h.note||"",attachmentName:h.attachmentName||"",attachmentData:h.attachmentData||"",createdAt:h.createdAt||""};
  const duplicate=services.some(s=>s.reminderId===legacy.reminderId&&(s.id===legacy.id||(s.date===legacy.date&&Number(s.cost||0)===legacy.cost&&Number(s.odometer||0)===legacy.odometer&&(s.part||"")===legacy.part)));
  if(!duplicate&&(legacy.date||legacy.cost||legacy.odometer||legacy.part||legacy.notes))services.push(legacy);
 }));
 return {version:3,assets,reminders,services};
}
let state=loadState();
function persist(){try{localStorage.setItem(STORE_KEY_V2,JSON.stringify(state));render()}catch(e){showToast("فضای ذخیره‌سازی دستگاه کافی نیست؛ از اطلاعات پشتیبان بگیر.")}}
function fa(n){return new Intl.NumberFormat("fa-IR").format(Number(n)||0)}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function toast(msg){const t=$("toast");t.textContent=msg;t.classList.remove("hidden");clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.add("hidden"),2800)}
function open(id){$(id).showModal()} function close(id){$(id).close()}
function today(){return new Date().toISOString().slice(0,10)}
function fmtDate(v){if(!v)return "بدون تاریخ";try{return new Intl.DateTimeFormat("fa-IR-u-ca-persian",{year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(v+"T12:00:00")).replace(/[\u200e\u200f]/g,"").replace(/-/g,"/")}catch{return v}}
function jalaliParts(date){const p=new Intl.DateTimeFormat("en-US-u-ca-persian-nu-latn",{year:"numeric",month:"2-digit",day:"2-digit",timeZone:"UTC"}).formatToParts(date);return Object.fromEntries(p.filter(x=>["year","month","day"].includes(x.type)).map(x=>[x.type,Number(x.value)]))}
function toISODate(value){if(!value)return "";const raw=String(value).trim().replace(/[۰-۹]/g,d=>"۰۱۲۳۴۵۶۷۸۹".indexOf(d)).replace(/[٠-٩]/g,d=>"٠١٢٣٤٥٦٧٨٩".indexOf(d)).replace(/[.\-]/g,"/");if(/^\d{4}-\d{2}-\d{2}$/.test(String(value)))return String(value);const m=raw.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);if(!m)return "";const jy=+m[1],jm=+m[2],jd=+m[3];if(jm<1||jm>12||jd<1||jd>31)return "";const target=`${jy}-${jm}-${jd}`;const base=new Date(Date.UTC(jy+621,2,20));for(let offset=-100;offset<400;offset++){const d=new Date(base.getTime()+offset*86400000),p=jalaliParts(d);if(p.year===jy&&p.month===jm&&p.day===jd)return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,"0")}-${String(d.getUTCDate()).padStart(2,"0")}`}return ""}
function toJalaliInput(iso){if(!iso)return "";const m=String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);if(!m)return String(iso);const p=jalaliParts(new Date(Date.UTC(+m[1],+m[2]-1,+m[3])));return `${p.year}/${String(p.month).padStart(2,"0")}/${String(p.day).padStart(2,"0")}`}
const CATEGORY_FIELDS={
 "خودرو":[["model","مدل / تیپ","text","مثلاً پژو ۲۰۶ تیپ ۵"],["year","سال ساخت","number","مثلاً ۱۳۹۵"],["plate","پلاک","text","ایران ..."],["odometer","کیلومتر فعلی","number","مثلاً ۱۲۵۰۰۰"],["vin","شماره شاسی (اختیاری)","text",""]],
 "موتورسیکلت":[["model","مدل موتورسیکلت","text","مثلاً آپاچی RTR 180"],["year","سال ساخت","number","مثلاً ۱۴۰۲"],["plate","پلاک","text",""],["odometer","کیلومتر فعلی","number","مثلاً ۱۸۰۰۰"]],
 "خانه":[["details.propertyType","نوع ملک","text","آپارتمان، خانه، زمین..."],["details.address","نشانی","text","شهر، محله یا نشانی"],["details.area","متراژ (متر مربع)","number","مثلاً ۱۲۰"],["details.ownership","وضعیت مالکیت","select","مالک|رهن|اجاره|مشارکتی"]],
 "وسایل":[["details.itemType","نوع وسیله","text","مثلاً یخچال"],["details.brand","برند","text",""],["details.model","مدل","text",""],["details.purchaseDate","تاریخ خرید","date",""],["details.warrantyDate","پایان ضمانت","date",""]],
 "مالی":[["details.obligationType","نوع تعهد مالی","text","قسط، بدهی، بیمه..."],["details.amount","مبلغ (تومان)","number",""],["details.dueDate","تاریخ سررسید","date",""],["details.counterparty","طرف حساب","text",""]],
 "شخصی":[["details.itemType","نوع دارایی شخصی","text",""],["details.brand","برند / مرجع","text",""],["details.startDate","تاریخ خرید یا شروع","date",""]],
 "سلامت":[["details.recordType","نوع وسیله یا پرونده","text","مثلاً فشارسنج"],["details.brand","برند / مشخصات","text",""],["details.lastCheck","تاریخ آخرین بررسی","date",""],["details.nextCheck","تاریخ بررسی بعدی","date",""]]
};
function getPath(obj,path){return path.split(".").reduce((o,k)=>o?.[k],obj)}
function setPath(obj,path,value){const keys=path.split(".");let cur=obj;keys.slice(0,-1).forEach(k=>cur=cur[k]||(cur[k]={}));cur[keys.at(-1)]=value}
function renderCategoryFields(category,values={}){const box=$("categoryFields");if(!box)return;box.innerHTML=(CATEGORY_FIELDS[category]||CATEGORY_FIELDS["خودرو"]).map(([key,label,type,placeholder])=>{const value=getPath(values,key)??"";const date=type==="date";let input;if(type==="select"){input=`<select name="${esc(key)}">${placeholder.split("|").map(o=>`<option ${value===o?"selected":""}>${esc(o)}</option>`).join("")}</select>`}else input=`<input name="${esc(key)}" type="${date?"text":type}" ${date?'class="jalali-date" inputmode="numeric" placeholder="۱۴۰۵/۰۷/۲۸"':`placeholder="${esc(placeholder)}"`} ${type==="number"?'min="0"':''} value="${esc(date?toJalaliInput(value):value)}" autocomplete="off">`;return `<label>${esc(label)}${input}</label>`}).join("");installJalaliCalendars();}
function readCategoryDetails(form,category){const out={};for(const [key,label,type] of (CATEGORY_FIELDS[category]||[])){const el=form.elements.namedItem(key);if(!el)continue;let val=el.value.trim();if(type==="date"&&val){val=toISODate(val);if(!val){el.setCustomValidity("تاریخ را به شکل شمسی ۱۴۰۵/۰۷/۲۸ وارد کن.");el.reportValidity();el.setCustomValidity("");return null}}setPath(out,key,val)}return out}
function validateJalaliFields(form){for(const el of form.querySelectorAll(".jalali-date")){if(!el.value.trim()){if(el.required){el.setCustomValidity("تاریخ شمسی را وارد کن.");el.reportValidity();el.setCustomValidity("");return false}continue}if(!toISODate(el.value)){el.setCustomValidity("تاریخ را به شکل شمسی ۱۴۰۵/۰۷/۲۸ وارد کن.");el.reportValidity();el.setCustomValidity("");return false}}return true}
function selectedVehicle(){return state.assets.find(a=>a.id===state.selectedAssetId&&a.status!=="archived")||state.assets.find(a=>a.status!=="archived")||null}
function isLate(r){const a=state.assets.find(x=>x.id===r.assetId);return r.status==="open"&&((r.dueDate&&r.dueDate<today())||(Number(r.dueOdometer)>0&&a&&Number(a.odometer)>=Number(r.dueOdometer)))}
function dueSoon(r){const a=state.assets.find(x=>x.id===r.assetId), days=r.dueDate?Math.ceil((new Date(r.dueDate+"T12:00:00")-new Date(today()+"T12:00:00"))/86400000):9999;
 return r.status==="open"&&((r.dueDate&&days>=0&&days<=7)||(Number(r.dueOdometer)>0&&a&&Number(r.dueOdometer)-Number(a.odometer)<=500&&Number(r.dueOdometer)>=Number(a.odometer)))}
function refreshOptions(){
 const sel=$("reminderAsset"), dep=$("dependsOn"), serviceAsset=$("serviceAsset"), serviceReminder=$("serviceReminder");
 const assetOptions=state.assets.filter(a=>a.status!=="archived").map(a=>`<option value="${esc(a.id)}">${esc(a.name)} · ${esc(a.category)}</option>`).join("")+'<option value="">بدون دارایی مشخص</option>';
 if(sel){const old=sel.value;sel.innerHTML=assetOptions;if(old&&state.assets.some(a=>a.id===old))sel.value=old;}
 if(dep){const old=dep.value;dep.innerHTML='<option value="">بدون وابستگی</option>'+state.reminders.filter(r=>r.status!=="cancelled").map(r=>`<option value="${esc(r.id)}">${esc(r.title)}</option>`).join("");dep.value=old;}
 if(serviceAsset){const old=serviceAsset.value;serviceAsset.innerHTML=assetOptions;if(old&&state.assets.some(a=>a.id===old))serviceAsset.value=old;}
 if(serviceReminder){const old=serviceReminder.value;serviceReminder.innerHTML='<option value="">سرویس مستقل</option>'+state.reminders.filter(r=>r.status!=="cancelled").map(r=>`<option value="${esc(r.id)}">${esc(r.title)}</option>`).join("");if(old&&state.reminders.some(r=>r.id===old))serviceReminder.value=old;}
}
function renderReports(){
 const summary=$("reportSummary"),breakdown=$("reportAssetBreakdown");if(!summary||!breakdown)return;
 const services=sortedServices(),total=services.reduce((sum,s)=>sum+(Number(s.cost)||0),0),month=today().slice(0,7),monthTotal=services.filter(s=>(s.date||"").startsWith(month)).reduce((sum,s)=>sum+(Number(s.cost)||0),0);
 summary.innerHTML=`<div class="report-stat"><span>کل هزینه‌های ثبت‌شده</span><strong>${fa(total)} تومان</strong><small>${fa(services.length)} سرویس</small></div><div class="report-stat"><span>هزینه ماه جاری</span><strong>${fa(monthTotal)} تومان</strong><small>${fa(services.filter(s=>(s.date||"").startsWith(month)).length)} سرویس</small></div>`;
 const groups=new Map();services.forEach(s=>{const asset=state.assets.find(a=>a.id===s.assetId),name=asset?.name||"بدون دارایی مشخص";groups.set(name,(groups.get(name)||0)+(Number(s.cost)||0))});
 const rows=[...groups.entries()].sort((a,b)=>b[1]-a[1]);breakdown.innerHTML=rows.length?rows.map(([name,cost])=>`<div class="report-row"><span>${esc(name)}</span><strong>${fa(cost)} تومان</strong></div>`).join(""):'<p class="muted">پس از ثبت سرویس و هزینه، گزارش اینجا نمایش داده می‌شود.</p>';
}
function render(){
 const vehicle=selectedVehicle(), openRem=state.reminders.filter(r=>r.status==="open"), doneRem=state.reminders.filter(r=>r.status==="done");
 if($("assetCount")) $("assetCount").textContent=`${fa(state.assets.length)} دارایی ثبت‌شده`;
 $("heroAssetName").innerHTML=vehicle?`${esc(vehicle.name)} <span>${esc([vehicle.model,vehicle.year].filter(Boolean).join(" · ")||"خودرو")}</span>`:"خودروی من <span>خودرویی ثبت نشده</span>";
 $("heroOdometer").textContent=vehicle&&vehicle.odometer?fa(vehicle.odometer):"—";
 $("assetIdentity").textContent=vehicle?[vehicle.plate?"پلاک "+vehicle.plate:"بدون پلاک",vehicle.vin?"شاسی "+vehicle.vin:""].filter(Boolean).join(" · ")||"مشخصات ثبت نشده":"خودرویی ثبت نشده";
 const urgent=openRem.filter(isLate); $("urgentCount").textContent=`${fa(urgent.length)} مورد`;
 $("urgentList").innerHTML=urgent.length?urgent.map(r=>`<article class="urgent-item"><span class="urgent-dot">!</span><div class="urgent-copy"><strong>${esc(r.title)}</strong><small>${esc((state.assets.find(a=>a.id===r.assetId)||{}).name||"بدون دارایی")} · ${esc(r.dueDate?fmtDate(r.dueDate):("کیلومتر "+fa(r.dueOdometer)))}</small></div><button class="small-btn" data-action="complete" data-id="${esc(r.id)}">ثبت سرویس</button></article>`).join(""):'<div class="urgent-empty"><span>✓</span><div><strong>فعلاً مورد عقب‌افتاده‌ای نداری</strong><small>فقط موارد واقعاً عقب‌افتاده در این قسمت نمایش داده می‌شوند.</small></div></div>';
 const relevant=state.reminders.filter(r=>r.status!=="cancelled");
 $("reminderList").innerHTML=relevant.length?relevant.map(r=>{
  const a=state.assets.find(x=>x.id===r.assetId),late=isLate(r),soon=dueSoon(r),done=r.status==="done";
  const duebits=[];if(r.dueDate)duebits.push(fmtDate(r.dueDate));if(r.dueOdometer)duebits.push(fa(r.dueOdometer)+" "+metricInfo(a).unit);
  const dependency=r.dependsOn&&state.reminders.find(x=>x.id===r.dependsOn);
  return `<article class="service-card"><div class="service-title"><span class="service-icon ${late?"warn":""}">${done?"✓":late?"!":"◷"}</span><strong>${esc(r.title)}</strong><button class="small-btn" data-action="history" data-id="${esc(r.id)}">جزئیات</button></div><div class="service-meta"><span>◷</span>${esc(duebits.join(" · ")||"سررسید تعیین نشده")}</div><div class="service-meta"><span>◇</span>${esc(a?a.name:"بدون دارایی")}</div>${dependency?`<div class="service-meta"><span>↳</span>وابسته به: ${esc(dependency.title)}</div>`:""}<div class="gauge ${late?"orange":"blue"}"><span>${done?"انجام‌شده":late?"عقب‌افتاده":soon?"نزدیک":"باز"}</span></div><div class="item-actions"><button class="small-btn" data-action="${done?"reopen":"complete"}" data-id="${esc(r.id)}">${done?"بازگشایی":"ثبت سرویس"}</button><button class="small-btn" data-action="edit-reminder" data-id="${esc(r.id)}">ویرایش</button><button class="small-btn danger" data-action="delete-reminder" data-id="${esc(r.id)}">حذف</button></div></article>`
 }).join(""):'<article class="service-card sample"><div class="service-title"><span class="service-icon">◇</span><strong>هنوز سرویسی ثبت نشده</strong></div><div class="service-meta">اولین سرویس را تعریف کن.</div><button class="small-btn" data-action="new-reminder">＋ تعریف سرویس</button></article>';
 const allAssets=state.assets.filter(a=>a.status!=="archived");
 const categories=[...new Set(allAssets.map(a=>a.category||"سایر"))].sort((a,b)=>a.localeCompare(b,"fa"));
 $("assetList").className=allAssets.length?"item-list asset-category-list":"list-empty compact";
 $("assetList").innerHTML=allAssets.length?categories.map(category=>{
  const items=allAssets.filter(a=>(a.category||"سایر")===category);
  return `<section class="asset-category-group"><div class="asset-category-title"><strong>${esc(category)}</strong><span>${fa(items.length)} دارایی</span></div>${items.map(a=>`<article class="item asset-list-item"><div class="item-mark">◇</div><div class="item-main"><strong>${esc(a.name)}</strong><p>${esc(assetShortDescription(a))}</p><div class="item-actions"><button class="small-btn" data-action="edit-asset" data-id="${esc(a.id)}">ویرایش</button><button class="small-btn danger" data-action="delete-asset" data-id="${esc(a.id)}">بایگانی</button></div></div></article>`).join("")}</section>`;
 }).join(""):'<div class="empty-icon">◇</div><strong>هنوز دارایی‌ای اضافه نکرده‌ای</strong><p>خودرو، خانه، وسایل یا سایر دارایی‌ها را ثبت کن؛ هر دسته در این بخش جداگانه نمایش داده می‌شود.</p>';
 renderRecentServices();renderAllServices();
 const completedTarget=$("completedServicesList");if(completedTarget){const completed=sortedServices();completedTarget.innerHTML=completed.length?completed.map(serviceRowHtml).join(""):'<div class="list-empty compact"><strong>هنوز سرویس انجام‌شده‌ای ثبت نشده است.</strong><p>بعد از ثبت سرویس، سوابق اینجا نمایش داده می‌شوند.</p></div>';}
 $("doneCount").textContent=`${fa(doneRem.length)} انجام‌شده`;
 const reminderRows=state.reminders.filter(r=>r.status!=="cancelled").slice().sort((a,b)=>(a.dueDate||"9999").localeCompare(b.dueDate||"9999")).map(r=>`<div class="schedule-row"><span class="schedule-status ${r.status==="done"?"complete":isLate(r)?"late":"pending"}"></span><div><strong>${esc(r.title)}</strong><small>${esc((state.assets.find(a=>a.id===r.assetId)||{}).name||"بدون دارایی")} · ${esc(fmtDate(r.dueDate))} · ${r.status==="done"?"انجام‌شده":isLate(r)?"عقب‌افتاده":"باز"}</small></div><button class="small-btn" data-action="history" data-id="${esc(r.id)}">سوابق</button></div>`).join("");
 $("scheduleList").innerHTML=`<div class="schedule-subhead">سرویس‌های تعریف‌شده و یادآوری‌ها</div>${reminderRows||"<p>هنوز سرویسی تعریف نشده است.</p>"}`;
 refreshOptions();
}
function assetShortDescription(a){
 const bits=[];
 if(["خودرو","موتورسیکلت"].includes(a.category)){if(a.model)bits.push(a.model);if(a.year)bits.push("سال "+a.year);if(a.plate)bits.push("پلاک "+a.plate);if(a.odometer)bits.push(fa(a.odometer)+" کیلومتر");}
 else {for(const [key,label,type] of (CATEGORY_FIELDS[a.category]||[])){const value=getPath(a,key);if(value===undefined||value===null||String(value).trim()==="")continue;bits.push(label+" "+(type==="date"?fmtDate(value):String(value)));}}
 if(a.notes)bits.push(a.notes);return bits.slice(0,4).join(" · ")||"بدون توضیحات تکمیلی";
}
function sortedServices(){return state.services.slice().sort((a,b)=>(b.date||"").localeCompare(a.date||"")||(b.createdAt||"").localeCompare(a.createdAt||""))}
function serviceAssetId(s){if(s?.assetId)return s.assetId;return state.reminders.find(r=>r.id===s?.reminderId)?.assetId||"";}
function serviceRowHtml(s){
 const rem=state.reminders.find(r=>r.id===s.reminderId),asset=state.assets.find(a=>a.id===s.assetId)||state.assets.find(a=>a.id===rem?.assetId);
 const details=[rem?.title||"سرویس مستقل",asset?.name||"بدون دارایی مشخص",s.odometer?fa(s.odometer)+" کیلومتر":"",s.part||"",s.notes||""].filter(Boolean).map(esc).join(" · ");
 return `<article class="item service-history-row"><div class="item-mark">✓</div><div class="item-main"><strong>${esc(fmtDate(s.date))} · ${fa(s.cost)} تومان</strong><p>${details}</p>${s.attachmentName?`<small>پیوست: ${esc(s.attachmentName)}</small>`:""}</div></article>`;
}
function renderRecentServices(){const target=$("recentServicesList");if(!target)return;const items=sortedServices().slice(0,5);target.innerHTML=items.length?items.map(serviceRowHtml).join(""):'<div class="list-empty compact"><strong>هنوز سرویسی ثبت نشده</strong><p>با ثبت سرویس، پنج مورد آخر به‌صورت خودکار در این قسمت نمایش داده می‌شوند.</p></div>';}
function previousMonthRange(){
 const now=new Date(today()+"T00:00:00Z"),start=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()-1,1)),end=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),0));
 const iso=d=>d.getUTCFullYear()+"-"+String(d.getUTCMonth()+1).padStart(2,"0")+"-"+String(d.getUTCDate()).padStart(2,"0");return {from:iso(start),to:iso(end)};
}
function setupServiceHistoryFilters(){const from=$("historyFrom"),to=$("historyTo");if(!from||!to)return;if(!from.value&&!to.value){const range=previousMonthRange();from.value=toJalaliInput(range.from);to.value=toJalaliInput(range.to);}}
function renderAllServices(){
 const list=$("allServicesList"),summary=$("allServicesSummary"),sel=$("historyAssetCategory");if(!list||!summary||!sel)return;
 const old=sel.value,categories=[...new Set(state.assets.map(a=>a.category||"سایر"))].sort((a,b)=>a.localeCompare(b,"fa"));
 sel.innerHTML='<option value="">همه دسته‌ها</option>'+categories.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join("");if(categories.includes(old))sel.value=old;
 const fr=$("historyFrom").value.trim(),tr=$("historyTo").value.trim(),from=fr?toISODate(fr):"",to=tr?toISODate(tr):"",category=sel.value;
 const items=sortedServices().filter(s=>{if(fr&&!from)return false;if(tr&&!to)return false;if(from&&(!s.date||s.date<from))return false;if(to&&(!s.date||s.date>to))return false;if(category){const r=state.reminders.find(x=>x.id===s.reminderId),a=state.assets.find(x=>x.id===s.assetId)||state.assets.find(x=>x.id===r?.assetId);if((a?.category||"بدون دسته")!==category)return false;}return true;});
 const total=items.reduce((sum,s)=>sum+(Number(s.cost)||0),0);summary.innerHTML=`<span>تعداد: <b>${fa(items.length)}</b></span><span>جمع هزینه: <b>${fa(total)} تومان</b></span>`;
 list.innerHTML=items.length?items.map(serviceRowHtml).join(""):'<div class="list-empty compact"><strong>سابقه‌ای مطابق فیلترها پیدا نشد</strong><p>بازه تاریخ یا نوع دارایی را تغییر بده.</p></div>';
}
function resetAssetForm(){editingAssetId=null;const f=$("assetForm");f.reset();f.elements.category.value="خودرو";renderCategoryFields("خودرو",{});$("assetDialogTitle").textContent="افزودن دارایی"}
function editAsset(id){const a=state.assets.find(x=>x.id===id);if(!a)return;editingAssetId=id;const f=$("assetForm");f.elements.name.value=a.name||"";f.elements.category.value=a.category||"خودرو";if(f.elements.metricUnit)f.elements.metricUnit.value=a.metricUnit||(["خودرو","موتورسیکلت"].includes(a.category)?"کیلومتر":a.category==="خانه"?"متر مربع":a.category==="وسایل"?"ساعت":"تعداد");if(f.elements.metricValue)f.elements.metricValue.value=a.details?.metricValue||"";f.elements.notes.value=a.notes||"";renderCategoryFields(a.category||"خودرو",{...a,details:a.details||{}});$("assetDialogTitle").textContent="ویرایش دارایی";open("assetDialog")}
function editReminder(id){const r=state.reminders.find(x=>x.id===id);if(!r)return;const f=$("reminderForm");for(const k of ["title","assetId","triggerType","dueOdometer","intervalDays","intervalKm","intervalValue","intervalUnit","dependsOn","notes"])if(f.elements[k])f.elements[k].value=r[k]??"";f.elements.dueDate.value=toJalaliInput(r.dueDate||"");f.dataset.editId=id;open("reminderDialog")}
function openServiceForm(reminderId=""){
 const f=$("serviceForm");f.reset();refreshOptions();
 f.elements.reminderId.value=reminderId;
 const r=state.reminders.find(x=>x.id===reminderId), assetId=r?.assetId||selectedVehicle()?.id||"";
 f.elements.assetId.value=assetId;
 f.elements.date.value=toJalaliInput(today());
 const a=state.assets.find(x=>x.id===assetId);f.elements.odometer.value=a?.odometer||"";
 open("serviceDialog");
}
function completeReminder(id){const r=state.reminders.find(x=>x.id===id);if(!r)return;const dep=state.reminders.find(x=>x.id===r.dependsOn);if(dep&&dep.status!=="done"){if(!confirm(`سرویس «${dep.title}» هنوز انجام نشده. با این حال ثبت سرویس ادامه پیدا کند؟`))return}openServiceForm(id)}
function showHistory(id){
 const rem=state.reminders.find(r=>r.id===id), items=state.services.filter(s=>id?s.reminderId===id:true).slice().sort((a,b)=>(b.date||"").localeCompare(a.date||""));
 const total=items.reduce((sum,s)=>sum+(Number(s.cost)||0),0);
 $("historyContent").innerHTML=`<p>${esc(rem?.title||(id?"سرویس":"تمام سوابق سرویس‌ها"))} · تعداد: <b>${fa(items.length)}</b> · جمع هزینه: <b>${fa(total)} تومان</b></p>`+(items.length?items.map(s=>{const asset=state.assets.find(a=>a.id===s.assetId),operation=state.reminders.find(r=>r.id===s.reminderId);return `<article class="item"><div class="item-main"><strong>${esc(fmtDate(s.date))} · ${fa(s.cost)} تومان</strong><p>${esc(operation?.title||"سرویس مستقل")} · ${esc(asset?.name||"بدون دارایی")}${s.odometer?" · "+fa(s.odometer)+" کیلومتر":""} · ${esc(s.part||"بدون قطعه ثبت‌شده")}${s.notes?" · "+esc(s.notes):""}</p>${s.attachmentName?`<p>پیوست: ${esc(s.attachmentName)}</p>`:""}</div></article>`}).join(""):"<p>هنوز سابقه‌ای ثبت نشده است.</p>");
 open("historyDialog");
}
$("addAssetBtn").addEventListener("click",()=>{resetAssetForm();open("assetDialog")});
$("addOtherAssetBtn").addEventListener("click",()=>{resetAssetForm();$("assetForm").elements.category.value="وسایل";open("assetDialog")});
$("addReminderBtn").addEventListener("click",()=>{ $("reminderForm").reset();delete $("reminderForm").dataset.editId;refreshOptions();open("reminderDialog")});
$("navAddBtn").addEventListener("click",()=>open("quickAddDialog"));
document.querySelectorAll("[data-quick-action]").forEach(button=>button.addEventListener("click",()=>{
 const action=button.dataset.quickAction;close("quickAddDialog");
 if(action==="asset"){resetAssetForm();open("assetDialog")}
 else if(action==="reminder"){$("reminderForm").reset();delete $("reminderForm").dataset.editId;refreshOptions();open("reminderDialog")}
 else if(action==="service")openServiceForm("");
}));
$("editAssetBtn").addEventListener("click",()=>{const a=selectedVehicle();a?editAsset(a.id):(resetAssetForm(),open("assetDialog"))});
$("addServiceBtn").addEventListener("click",()=>openServiceForm(""));
$("exportBtn")?.addEventListener("click",exportBackup);
$("moreBackupBtn")?.addEventListener("click",exportBackup);
$("moreRestoreBtn")?.addEventListener("click",()=>$("importFile").click());
$("importBtn")?.addEventListener("click",()=>$("importFile").click());
$("importFile").addEventListener("change",async e=>{const file=e.target.files[0];if(!file)return;try{const incoming=normalize(JSON.parse(await file.text()));if(!confirm("بازیابی، اطلاعات فعلی را با نسخهٔ انتخاب‌شده جایگزین می‌کند. ابتدا از اطلاعات فعلی پشتیبان بگیر. ادامه؟"))return;state=incoming;persist();toast("پشتیبان بازیابی شد.")}catch{toast("فایل پشتیبان معتبر نیست.")}e.target.value=""});
function exportBackup(){const blob=new Blob([JSON.stringify({...state,exportedAt:new Date().toISOString(),app:"HamrahMan"},null,2)],{type:"application/json"});const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="hamrah-man-backup-"+today()+".json";a.click();URL.revokeObjectURL(url);toast("فایل پشتیبان دانلود شد.")}
document.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",()=>close(b.dataset.close)));
$("assetForm").elements.category.addEventListener("change",e=>{renderCategoryFields(e.target.value,{});const m=$("assetMetricUnit");if(m)m.value=["خودرو","موتورسیکلت"].includes(e.target.value)?"کیلومتر":e.target.value==="خانه"?"متر مربع":e.target.value==="وسایل"?"ساعت":"تعداد";$("assetMetricValueField")?.classList.toggle("hidden",["کیلومتر","متر مربع"].includes(m?.value||"کیلومتر"));});
$("assetForm").addEventListener("submit",e=>{e.preventDefault();const f=e.currentTarget;if(!validateJalaliFields(f))return;const d=new FormData(f),category=d.get("category"),details=readCategoryDetails(f,category);if(details===null)return;const metricUnit=d.get("metricUnit")||(["خودرو","موتورسیکلت"].includes(category)?"کیلومتر":category==="خانه"?"متر مربع":category==="وسایل"?"ساعت":"تعداد");if(category!=="خودرو"&&category!=="موتورسیکلت"&&category!=="خانه")details.metricValue=Number(d.get("metricValue"))||0;const a={id:editingAssetId||uid(),name:d.get("name").trim(),category,metricUnit,model:["خودرو","موتورسیکلت"].includes(category)?(d.get("model")||""):"",year:["خودرو","موتورسیکلت"].includes(category)?(d.get("year")||""):"",plate:["خودرو","موتورسیکلت"].includes(category)?(d.get("plate")||""):"",odometer:["خودرو","موتورسیکلت"].includes(category)?(Number(d.get("odometer"))||0):0,vin:category==="خودرو"?(d.get("vin")||""):"",details,notes:d.get("notes").trim(),createdAt:new Date().toISOString(),status:"active"};if(editingAssetId){const old=state.assets.findIndex(x=>x.id===editingAssetId);if(old>=0)state.assets[old]={...state.assets[old],...a}}else state.assets.push(a);state.selectedAssetId=a.id;resetAssetForm();close("assetDialog");persist();toast("دارایی ذخیره شد.")});
$("reminderForm").addEventListener("submit",e=>{e.preventDefault();const f=e.currentTarget;if(!validateJalaliFields(f))return;const d=new FormData(f),editId=f.dataset.editId,dueRaw=d.get("dueDate"),dueDate=dueRaw?toISODate(dueRaw):"";if(dueRaw&&!dueDate){toast("تاریخ سررسید را شمسی و به شکل ۱۴۰۵/۰۷/۲۸ وارد کن.");return}const obj={title:d.get("title").trim(),assetId:d.get("assetId"),triggerType:d.get("triggerType"),dueDate,dueOdometer:d.get("dueOdometer"),intervalDays:d.get("intervalDays"),intervalKm:d.get("intervalKm"),intervalValue:d.get("intervalValue"),intervalUnit:d.get("intervalUnit")||"days",dependsOn:d.get("dependsOn"),notes:d.get("notes").trim()};if(obj.dependsOn===editId){toast("یک سرویس نمی‌تواند به خودش وابسته باشد.");return}if(editId){const r=state.reminders.find(x=>x.id===editId);if(r)Object.assign(r,obj)}else state.reminders.push({id:uid(),...obj,status:"open",createdAt:new Date().toISOString()});f.reset();delete f.dataset.editId;close("reminderDialog");persist();toast("سرویس ذخیره شد.")});
$("serviceReminder").addEventListener("change",e=>{const r=state.reminders.find(x=>x.id===e.target.value);if(r){$("serviceAsset").value=r.assetId||"";const a=state.assets.find(x=>x.id===r.assetId);$("serviceForm").elements.odometer.value=a?.odometer||"";}});
$("serviceForm").addEventListener("submit",async e=>{e.preventDefault();const f=e.currentTarget;if(!validateJalaliFields(f))return;const d=new FormData(f),serviceDate=toISODate(d.get("date")),id=d.get("reminderId")||"",r=state.reminders.find(x=>x.id===id),assetId=r?.assetId||d.get("assetId")||"",a=state.assets.find(x=>x.id===assetId);let attachmentName="",attachmentData="";const file=f.elements.attachment.files[0];if(file){if(file.size>2*1024*1024){toast("حجم پیوست در نسخهٔ محلی حداکثر ۲ مگابایت است.");return}attachmentName=file.name;attachmentData=await new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.readAsDataURL(file)})}
 if(!serviceDate){toast("تاریخ انجام را شمسی و به شکل ۱۴۰۵/۰۷/۲۸ وارد کن.");return}const service={id:uid(),reminderId:id,assetId,date:serviceDate,odometer:Number(d.get("odometer"))||0,part:d.get("part").trim(),cost:Number(d.get("cost"))||0,notes:d.get("notes").trim(),attachmentName,attachmentData,createdAt:new Date().toISOString()};
 state.services.push(service);if(r){r.status="done";r.lastCompletedAt=service.date;if(r.intervalDays){const dt=new Date(service.date+"T12:00:00");dt.setDate(dt.getDate()+Number(r.intervalDays));r.dueDate=dt.toISOString().slice(0,10);r.status="open"}if(r.intervalKm&&service.odometer){r.dueOdometer=Number(service.odometer)+Number(r.intervalKm);r.status="open"}if(Number(r.intervalValue)>0){const amount=Number(r.intervalValue);if(["days","months","years"].includes(r.intervalUnit)){const dt=new Date(service.date+"T12:00:00");if(r.intervalUnit==="days")dt.setDate(dt.getDate()+amount);if(r.intervalUnit==="months")dt.setMonth(dt.getMonth()+amount);if(r.intervalUnit==="years")dt.setFullYear(dt.getFullYear()+amount);r.dueDate=dt.toISOString().slice(0,10);if(r.triggerType==="odometer")r.triggerType="both";r.status="open"}else if(r.intervalUnit==="counter"&&service.odometer){r.dueOdometer=Number(service.odometer)+amount;if(r.triggerType==="date")r.triggerType="odometer";r.status="open"}}}
 if(a&&service.odometer)a.odometer=Math.max(Number(a.odometer)||0,service.odometer);
 close("serviceDialog");persist();toast("سرویس و هزینه در سوابق ثبت شد.");});
document.body.addEventListener("click",e=>{const b=e.target.closest("[data-action]");if(!b)return;const {action,id}=b.dataset;
 if(action==="complete")completeReminder(id);if(action==="reopen"){const r=state.reminders.find(x=>x.id===id);if(r)r.status="open";persist()}
 if(action==="delete-reminder"){if(!confirm("این سرویس تعریف‌شده حذف شود؟ سوابق سرویس‌های انجام‌شده حفظ می‌شوند."))return;state.reminders=state.reminders.filter(r=>r.id!==id);persist()}
 if(action==="delete-asset"){if(!confirm("این دارایی بایگانی شود؟ سوابق و هزینه‌ها حفظ می‌شوند و یادآوری‌های آینده بسته می‌شوند."))return;const a=state.assets.find(x=>x.id===id);if(a)a.status="archived";state.reminders.forEach(r=>{if(r.assetId===id&&r.status==="open")r.status="cancelled"});persist();toast("دارایی بایگانی شد؛ سوابق حفظ شدند.")}
 if(action==="edit-asset")editAsset(id);if(action==="edit-reminder")editReminder(id);if(action==="history")showHistory(id);if(action==="new-reminder"){$("reminderForm").reset();open("reminderDialog")}
});
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();installPrompt=e;$("installBtn").classList.remove("hidden")});
$("installBtn").addEventListener("click",async()=>{if(!installPrompt){toast("در آیفون: Safari ← Share ← Add to Home Screen.");return}installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;$("installBtn").classList.add("hidden")});
if("serviceWorker"in navigator&&location.protocol==="https:")window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
installJalaliCalendars();

/* Interactive Persian calendar for every Jalali date field */
let activeCalendarInput=null,calendarYear=0,calendarMonth=0;
const persianMonthNames=["فروردین","اردیبهشت","خرداد","تیر","مرداد","شهریور","مهر","آبان","آذر","دی","بهمن","اسفند"];
function installJalaliCalendars(){
 document.querySelectorAll(".jalali-date").forEach(input=>{
  if(input.parentElement?.classList.contains("date-input-wrap"))return;
  const wrap=document.createElement("span");wrap.className="date-input-wrap";input.parentNode.insertBefore(wrap,input);wrap.appendChild(input);
  const button=document.createElement("button");button.type="button";button.className="date-picker-trigger";button.dataset.calendarOpen="1";button.setAttribute("aria-label","باز کردن تقویم شمسی");button.textContent="▦";wrap.appendChild(button);
 });
 if(!$("jalaliCalendar")){
  const panel=document.createElement("div");panel.id="jalaliCalendar";panel.className="jalali-calendar hidden";panel.setAttribute("role","dialog");panel.setAttribute("aria-label","تقویم شمسی");document.body.appendChild(panel);
 }
}
function calendarDatesForMonth(year,month){
 const base=new Date(Date.UTC(year+621,2,20)),found=[];
 for(let offset=-100;offset<400;offset++){const d=new Date(base.getTime()+offset*86400000),p=jalaliParts(d);if(p.year===year&&p.month===month)found.push({day:p.day,iso:`${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,"0")}-${String(d.getUTCDate()).padStart(2,"0")}`,weekday:(d.getUTCDay()+1)%7});}
 return found.sort((a,b)=>a.day-b.day);
}
function drawJalaliCalendar(){
 const panel=$("jalaliCalendar");if(!panel||!activeCalendarInput)return;
 const dates=calendarDatesForMonth(calendarYear,calendarMonth),selected=toISODate(activeCalendarInput.value),first=dates[0]?.weekday||0;
 const cells=Array(first).fill('<span class="calendar-blank"></span>').concat(dates.map(d=>`<button type="button" class="calendar-day ${d.iso===selected?"selected":""}" data-calendar-date="${d.iso}">${fa(d.day)}</button>`));
 panel.innerHTML=`<div class="calendar-head"><button type="button" data-calendar-month="-1" aria-label="ماه قبل">‹</button><strong>${persianMonthNames[calendarMonth-1]} ${fa(calendarYear)}</strong><button type="button" data-calendar-month="1" aria-label="ماه بعد">›</button></div><div class="calendar-weekdays"><span>ش</span><span>ی</span><span>د</span><span>س</span><span>چ</span><span>پ</span><span>ج</span></div><div class="calendar-days">${cells.join("")}</div><div class="calendar-foot"><button type="button" data-calendar-today="1">امروز</button><button type="button" data-calendar-close="1">بستن</button></div>`;
 panel.classList.remove("hidden");
 const rect=activeCalendarInput.getBoundingClientRect(),width=Math.min(320,window.innerWidth-24);
 panel.style.width=width+"px";panel.style.top=Math.min(window.innerHeight-350,Math.max(8,rect.bottom+6))+"px";panel.style.left=Math.max(12,Math.min(window.innerWidth-width-12,rect.left))+"px";
}
function openJalaliCalendar(input){
 installJalaliCalendars();activeCalendarInput=input;
 const panel=$("jalaliCalendar"),owner=input.closest("dialog");(owner||document.body).appendChild(panel);
 const iso=toISODate(input.value)||today(),parts=jalaliParts(new Date(iso+"T12:00:00Z"));
 calendarYear=parts.year;calendarMonth=parts.month;drawJalaliCalendar();
}
document.addEventListener("click",e=>{
 const trigger=e.target.closest("[data-calendar-open]");
 if(trigger){e.preventDefault();const input=trigger.parentElement.querySelector(".jalali-date");if(input)openJalaliCalendar(input);return;}
 const day=e.target.closest("[data-calendar-date]");
 if(day&&activeCalendarInput){activeCalendarInput.value=toJalaliInput(day.dataset.calendarDate);activeCalendarInput.dispatchEvent(new Event("input",{bubbles:true}));activeCalendarInput.dispatchEvent(new Event("change",{bubbles:true}));$("jalaliCalendar").classList.add("hidden");activeCalendarInput=null;return;}
 const month=e.target.closest("[data-calendar-month]");
 if(month&&activeCalendarInput){calendarMonth+=Number(month.dataset.calendarMonth);if(calendarMonth<1){calendarMonth=12;calendarYear--}if(calendarMonth>12){calendarMonth=1;calendarYear++}drawJalaliCalendar();return;}
 if(e.target.closest("[data-calendar-today]")&&activeCalendarInput){activeCalendarInput.value=toJalaliInput(today());activeCalendarInput.dispatchEvent(new Event("input",{bubbles:true}));activeCalendarInput.dispatchEvent(new Event("change",{bubbles:true}));$("jalaliCalendar").classList.add("hidden");activeCalendarInput=null;return;}
 if(e.target.closest("[data-calendar-close]")){$("jalaliCalendar").classList.add("hidden");activeCalendarInput=null;return;}
 if(!e.target.closest("#jalaliCalendar")){$("jalaliCalendar")?.classList.add("hidden");activeCalendarInput=null;}
});
window.addEventListener("resize",()=>{if(activeCalendarInput)drawJalaliCalendar()});
window.addEventListener("scroll",()=>{if(activeCalendarInput)drawJalaliCalendar()},{passive:true});

setupServiceHistoryFilters();
// Bottom navigation switches distinct views instead of scrolling through one long page.
function activatePage(page,updateHash=true){
 const pageMeta={dashboard:["خانه","خلاصه وضعیت و آخرین فعالیت‌ها"],assets:["دارایی‌ها","مدیریت دسته‌بندی‌شده دارایی‌ها"],services:["سرویس‌ها","برنامه نگهداری و یادآوری‌ها"],history:["سوابق","جست‌وجوی سرویس‌های انجام‌شده"],more:["بیشتر","گزارش‌ها و ابزارهای برنامه"],reports:["گزارش‌ها","خلاصه هزینه‌ها"]};
 const valid=["dashboard","services","history","assets","more","reports"].includes(page)?page:"dashboard";
 document.querySelectorAll("[data-page]").forEach(el=>{const hide=el.dataset.page!==valid;el.hidden=hide;el.classList.toggle("page-hidden",hide)});
 const meta=pageMeta[valid]||pageMeta.dashboard;if($("pageTitle"))$("pageTitle").textContent=meta[0];if($("pageEyebrow"))$("pageEyebrow").textContent=meta[1];
 if(valid==="reports")renderReports();
 document.querySelectorAll("[data-page-nav]").forEach(link=>{
  const active=link.dataset.pageNav===valid;
  link.classList.toggle("active",active);
  if(active)link.setAttribute("aria-current","page");else link.removeAttribute("aria-current");
 });
 if(updateHash){const target={dashboard:"top",services:"reminderList",history:"serviceHistoryView",assets:"otherAssets",more:"more",reports:"reports"}[valid];history.replaceState(null,"","#"+target);}
 window.scrollTo({top:0,behavior:"instant"});
}
document.querySelectorAll("[data-page-nav]").forEach(link=>link.addEventListener("click",e=>{e.preventDefault();activatePage(link.dataset.pageNav)}));
document.querySelectorAll("[data-open-page]").forEach(button=>button.addEventListener("click",()=>activatePage(button.dataset.openPage)));
window.addEventListener("hashchange",()=>{const target=location.hash;activatePage(({"#reminderList":"services","#serviceHistoryView":"history","#otherAssets":"assets","#top":"dashboard","#more":"more","#reports":"reports"})[target]||"dashboard",false)});
activatePage(({"#reminderList":"services","#serviceHistoryView":"history","#otherAssets":"assets","#top":"dashboard","#more":"more","#reports":"reports"})[location.hash]||"dashboard",false);
$("applyServiceFilters")?.addEventListener("click",()=>{if(validateJalaliFields($("serviceHistoryView")))renderAllServices();});
$("resetServiceFilters")?.addEventListener("click",()=>{const r=previousMonthRange();$("historyFrom").value=toJalaliInput(r.from);$("historyTo").value=toJalaliInput(r.to);$("historyAssetCategory").value="";renderAllServices();});
render();

/* Dashboard carousel + editable service ledger */
let selectedServiceEditId=null, selectedCarouselTimer=null;
function dashboardAsset(){return state.assets.find(a=>a.id===state.selectedAssetId&&a.status!=="archived")||state.assets.find(a=>a.status!=="archived")||null}
function dashboardMetric(a){const unit=a?.metricUnit||(["خودرو","موتورسیکلت"].includes(a?.category)?"کیلومتر":a?.category==="خانه"?"متر مربع":a?.category==="وسایل"?"ساعت":"واحد");const value=unit==="کیلومتر"?Number(a?.odometer)||0:unit==="متر مربع"?Number(a?.details?.area)||0:Number(a?.details?.metricValue)||0;return {unit,value}}
function renderHero(){
 const assets=state.assets.filter(a=>a.status!=="archived"),a=dashboardAsset(),idx=Math.max(0,assets.findIndex(x=>x.id===a?.id)),m=dashboardMetric(a);
 if(a)state.selectedAssetId=a.id;
 $("heroAssetName").innerHTML=a?esc(a.name)+' <span>'+esc(["خودرو","موتورسیکلت"].includes(a.category)?[a.model,a.year].filter(Boolean).join(" · ")||a.category:a.category)+'</span>':'دارایی‌ای ثبت نشده <span>از دکمه + یک دارایی اضافه کن</span>';
 $("heroOdometer").textContent=a&&m.value?fa(m.value):"—";$("heroMetricLabel").textContent=m.unit;
 $("heroAssetSubtitle").textContent=a?"نمای کلی و سرویس‌های دوره‌ای این دارایی":"پس از ثبت دارایی، خلاصه وضعیت اینجا نمایش داده می‌شود";
 $("assetIdentity").textContent=a?assetShortDescription(a):"دارایی‌ای ثبت نشده";
 const art=$("vehicleArt"),generic=$("genericAssetArt");if(art)art.classList.toggle("generic-mode",!!a&&!["خودرو","موتورسیکلت"].includes(a.category));
 if(generic){generic.classList.toggle("hidden",!a||a.category==="خودرو");generic.textContent=a?(a.category==="موتورسیکلت"?"🏍️":a.category==="خانه"?"⌂":a.category==="وسایل"?"▣":a.category==="سلامت"?"✚":a.category==="مالی"?"＄":"◇"):"◇";const svg=art?.querySelector("svg");if(svg)svg.style.display=a&&a.category==="خودرو"?"":"none";}
 const dots=$("assetCarouselDots");if(dots)dots.innerHTML=assets.map((x,i)=>'<button type="button" aria-label="'+esc(x.name)+'" class="'+(i===idx?"active":"")+'" data-carousel-index="'+i+'"></button>').join("");
 const count=$("assetCarouselCount");if(count)count.textContent=assets.length?fa(idx+1)+" / "+fa(assets.length):"۰ / ۰";const assetCount=$("assetCount");if(assetCount)assetCount.textContent=fa(assets.length)+" دارایی";
 const next=state.reminders.filter(r=>r.assetId===a?.id&&r.status==="open").sort((x,y)=>(x.dueDate||"9999").localeCompare(y.dueDate||"9999"))[0];
 $("assetNextService").textContent=next?next.title+" · "+(next.dueDate?fmtDate(next.dueDate):"سررسید ثبت نشده"):"برای این دارایی سرویسی تعریف نشده";
}
function moveDashboardAsset(step){const assets=state.assets.filter(a=>a.status!=="archived");if(!assets.length){toast("ابتدا یک دارایی ثبت کن.");return}let i=assets.findIndex(a=>a.id===state.selectedAssetId);if(i<0)i=0;i=(i+step+assets.length)%assets.length;state.selectedAssetId=assets[i].id;render()}
function serviceRowHtml(s){
 const r=state.reminders.find(x=>x.id===s.reminderId),asset=state.assets.find(x=>x.id===serviceAssetId(s)),m=dashboardMetric(asset);
 const details=[r?.title||"سرویس مستقل",asset?.name||"بدون دارایی مشخص",s.odometer?fa(s.odometer)+" "+m.unit:"",s.part||"",s.notes||""].filter(Boolean).map(esc).join(" · ");
 const attachment=s.attachmentData?'<div class="item-actions"><button class="small-btn" data-action="view-attachment" data-id="'+esc(s.id)+'">مشاهده پیوست</button><button class="small-btn" data-action="download-attachment" data-id="'+esc(s.id)+'">دانلود پیوست</button></div>':(s.attachmentName?'<small>نام پیوست موجود است، اما دادهٔ فایل در اطلاعات فعلی موجود نیست.</small>':'');
 return '<article class="item service-history-row"><div class="item-mark">✓</div><div class="item-main"><strong>'+esc(fmtDate(s.date))+' · '+fa(s.cost)+' تومان</strong><p>'+details+'</p>'+(s.attachmentName?'<small>پیوست: '+esc(s.attachmentName)+'</small>':'')+attachment+'<div class="item-actions"><button class="small-btn" data-action="edit-service" data-id="'+esc(s.id)+'">ویرایش</button><button class="small-btn danger" data-action="delete-service" data-id="'+esc(s.id)+'">حذف</button></div></div></article>';
}
function renderRecentServices(){const target=$("recentServicesList");if(!target)return;const a=dashboardAsset();if($("recentServicesHeading"))$("recentServicesHeading").textContent=a?"۵ سرویس اخیر · "+a.name:"۵ سرویس اخیر";const rows=sortedServices().filter(s=>!a||serviceAssetId(s)===a.id).slice(0,5);target.innerHTML=rows.length?rows.map(serviceRowHtml).join(""):'<div class="list-empty compact"><strong>هنوز سرویسی برای این دارایی ثبت نشده</strong><p>با جابه‌جایی بین دارایی‌ها، سوابق همان دارایی نمایش داده می‌شود.</p></div>'}
function syncDashboardMetric(a){
 const m=dashboardMetric(a),has=!!a;
 ["serviceCounterField","reminderCounterField","reminderIntervalCounterField"].forEach(id=>$(id)?.classList.toggle("hidden",!has));
 if($("serviceCounterLabel"))$("serviceCounterLabel").textContent=m.unit;
 if($("reminderCounterLabel"))$("reminderCounterLabel").textContent=m.unit;
 if($("reminderIntervalCounterLabel"))$("reminderIntervalCounterLabel").textContent=m.unit;const counterOption=$("intervalUnit")?.querySelector('option[value="counter"]');if(counterOption)counterOption.textContent="معیار دارایی ("+m.unit+")";
 const t=$("reminderTriggerType")?.value||"date";
 $("reminderCounterField")?.classList.toggle("hidden",!has||t==="date");
 $("reminderDateField")?.classList.toggle("hidden",t==="odometer");
}
function openServiceEdit(id){
 const s=state.services.find(x=>x.id===id);if(!s)return;selectedServiceEditId=id;
 const f=$("serviceForm");f.reset();refreshOptions();f.elements.reminderId.value=s.reminderId||"";f.elements.assetId.value=s.assetId||"";
 f.elements.date.value=toJalaliInput(s.date||"");f.elements.odometer.value=s.odometer||"";f.elements.part.value=s.part||"";
 f.elements.cost.value=s.cost||"";f.elements.notes.value=s.notes||"";syncDashboardMetric(state.assets.find(a=>a.id===s.assetId));
 $("serviceDialog").querySelector("h2").textContent="ویرایش سرویس ثبت‌شده";f.querySelector('[type="submit"]').textContent="ذخیره تغییرات";open("serviceDialog");
}
function saveEditedService(e){
 e.preventDefault();e.stopImmediatePropagation();const f=$("serviceForm");if(!validateJalaliFields(f))return;
 const s=state.services.find(x=>x.id===selectedServiceEditId);if(!s)return;const d=new FormData(f),date=toISODate(d.get("date"));if(!date){toast("تاریخ را به شکل شمسی وارد کن.");return}
 const reminderId=d.get("reminderId")||"",rem=state.reminders.find(x=>x.id===reminderId),assetId=rem?.assetId||d.get("assetId")||"";
 Object.assign(s,{reminderId,assetId,date,odometer:Number(d.get("odometer"))||0,part:String(d.get("part")||"").trim(),cost:Number(d.get("cost"))||0,notes:String(d.get("notes")||"").trim(),updatedAt:new Date().toISOString()});
 const file=f.elements.attachment.files[0];if(file){if(file.size>2*1024*1024){toast("حجم پیوست حداکثر ۲ مگابایت است.");return}const reader=new FileReader();reader.onload=()=>{s.attachmentName=file.name;s.attachmentData=reader.result;finishEditedService(f)};reader.readAsDataURL(file);return}
 finishEditedService(f);
}
function finishEditedService(f){selectedServiceEditId=null;f.reset();f.querySelector("h2").textContent="ثبت انجام سرویس";f.querySelector('[type="submit"]').textContent="ثبت در سوابق";close("serviceDialog");persist();toast("سابقه سرویس ویرایش شد.")}
const previousRenderForHero=render;
render=function(){
 previousRenderForHero();renderHero();syncDashboardMetric(dashboardAsset());
 const a=dashboardAsset();
 const items=state.reminders.filter(r=>r.status==="open"&&r.assetId===a?.id).map(r=>({...r,late:isLate(r),soon:dueSoon(r)})).filter(r=>r.late||r.soon).sort((x,y)=>Number(y.late)-Number(x.late));
 $("urgentCount").textContent=fa(items.length)+" مورد";
 $("urgentList").innerHTML=items.length?items.map(r=>'<article class="urgent-item"><span class="urgent-dot">!</span><div class="urgent-copy"><strong>'+esc(r.title)+'</strong><small>'+esc(a?.name||"دارایی")+" · "+(r.late?"موعد گذشته":"نزدیک موعد")+'</small></div><button class="small-btn" data-action="complete" data-id="'+esc(r.id)+'">ثبت سرویس</button></article>').join(""):'<div class="urgent-empty"><span>✓</span><div><strong>سرویس نزدیک موعد یا عقب‌افتاده‌ای برای این دارایی نیست</strong><small>با جابه‌جایی بین دارایی‌ها، موارد همان دارایی نمایش داده می‌شوند.</small></div></div>';
};
document.addEventListener("click",e=>{
 const step=e.target.closest("[data-carousel-step]");if(step){e.preventDefault();moveDashboardAsset(Number(step.dataset.carouselStep));return}
 const dot=e.target.closest("[data-carousel-index]");if(dot){e.preventDefault();const a=state.assets.filter(x=>x.status!=="archived")[Number(dot.dataset.carouselIndex)];if(a){state.selectedAssetId=a.id;persist()}return}
 const b=e.target.closest("[data-action]");if(!b)return;const id=b.dataset.id,action=b.dataset.action;
 if(action==="edit-service"){e.preventDefault();e.stopImmediatePropagation();openServiceEdit(id)}
 if(action==="view-attachment"||action==="download-attachment"){e.preventDefault();e.stopImmediatePropagation();const s=state.services.find(x=>x.id===id);if(!s?.attachmentData){toast("فایل پیوست در اطلاعات فعلی موجود نیست.");return}const a=document.createElement("a");a.href=s.attachmentData;if(action==="download-attachment")a.download=s.attachmentName||"service-attachment";else{a.target="_blank";a.rel="noopener"}document.body.appendChild(a);a.click();a.remove();}
 if(action==="delete-service"){e.preventDefault();e.stopImmediatePropagation();if(!confirm("این سابقه سرویس حذف شود؟"))return;const s=state.services.find(x=>x.id===id);state.services=state.services.filter(x=>x.id!==id);if(s?.reminderId&&!state.services.some(x=>x.reminderId===s.reminderId)){const r=state.reminders.find(x=>x.id===s.reminderId);if(r)r.status="open"}persist();toast("سابقه سرویس حذف شد.")}
},true);
document.addEventListener("submit",e=>{if(e.target?.id==="serviceForm"&&selectedServiceEditId)saveEditedService(e)},true);
$("serviceAsset")?.addEventListener("change",e=>syncDashboardMetric(state.assets.find(a=>a.id===e.target.value)));
$("reminderAsset")?.addEventListener("change",e=>syncDashboardMetric(state.assets.find(a=>a.id===e.target.value)));
$("reminderTriggerType")?.addEventListener("change",()=>syncDashboardMetric(state.assets.find(a=>a.id===$("reminderAsset").value)));
$("viewAssetServicesBtn")?.addEventListener("click",()=>activatePage("services"));
$("serviceDialog")?.addEventListener("close",()=>{selectedServiceEditId=null;const f=$("serviceForm");if(f){f.querySelector("h2").textContent="ثبت انجام سرویس";f.querySelector('[type="submit"]').textContent="ثبت در سوابق"}});
if(!selectedCarouselTimer)selectedCarouselTimer=setInterval(()=>{if(state.assets.filter(a=>a.status!=="archived").length>1)moveDashboardAsset(1)},10000);
$("assetMetricUnit")?.addEventListener("change",e=>{$("assetMetricValueField")?.classList.toggle("hidden",["کیلومتر","متر مربع"].includes(e.target.value));});$("addOtherAssetBtn")?.addEventListener("click",()=>{if($("assetMetricUnit"))$("assetMetricUnit").value="ساعت";$("assetMetricValueField")?.classList.remove("hidden")});
$("assetForm")?.addEventListener("submit",()=>{const unit=$("assetMetricUnit")?.value||"کیلومتر",field=$("assetMetricValueField");if(field)field.classList.toggle("hidden",["کیلومتر","متر مربع"].includes(unit));const name=$("assetForm").elements.name.value.trim(),cat=$("assetForm").elements.category.value;setTimeout(()=>{const a=state.assets.find(x=>x.name===name&&x.category===cat&&x.status!=="archived");if(a){a.metricUnit=unit;if(unit!=="کیلومتر"&&unit!=="متر مربع")a.details.metricValue=Number($("assetForm").elements.metricValue.value)||0;persist()}},0)});
function isLate(r){const a=state.assets.find(x=>x.id===r.assetId),m=dashboardMetric(a);return r.status==="open"&&((r.dueDate&&r.dueDate<today())||((r.triggerType==="odometer"||r.triggerType==="both")&&Number(r.dueOdometer)>0&&m.value>=Number(r.dueOdometer)))}
function dueSoon(r){const a=state.assets.find(x=>x.id===r.assetId),m=dashboardMetric(a),days=r.dueDate?Math.ceil((new Date(r.dueDate+"T12:00:00")-new Date(today()+"T12:00:00"))/86400000):9999;return r.status==="open"&&((r.dueDate&&days>=0&&days<=7)||((r.triggerType==="odometer"||r.triggerType==="both")&&Number(r.dueOdometer)>0&&Number(r.dueOdometer)-m.value<=500&&Number(r.dueOdometer)>=m.value))}

render();

let carouselTouchStartX=0;document.querySelector(".asset-hero")?.addEventListener("touchstart",e=>{carouselTouchStartX=e.changedTouches?.[0]?.clientX||0},{passive:true});document.querySelector(".asset-hero")?.addEventListener("touchend",e=>{const end=e.changedTouches?.[0]?.clientX||0,delta=end-carouselTouchStartX;if(Math.abs(delta)>45)moveDashboardAsset(delta<0?1:-1)},{passive:true});

const openServiceFormBase=openServiceForm;openServiceForm=function(reminderId=""){openServiceFormBase(reminderId);syncDashboardMetric(state.assets.find(a=>a.id===$("serviceAsset").value));};$("serviceReminder")?.addEventListener("change",()=>syncDashboardMetric(state.assets.find(a=>a.id===$("serviceAsset").value)));$("addReminderBtn")?.addEventListener("click",()=>syncDashboardMetric(state.assets.find(a=>a.id===$("reminderAsset").value)));
