$ErrorActionPreference = 'Stop'
$root = (Get-Location).Path
$files = @('index.html','app.js','styles.css')
foreach ($f in $files) { if (!(Test-Path (Join-Path $root $f))) { throw "فایل $f پیدا نشد. اسکریپت را در ریشه پروژه اجرا کن." } }
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
foreach ($f in $files) { Copy-Item (Join-Path $root $f) (Join-Path $root "$f.backup-$stamp") }

# index.html: hero image and image picker controls
$p = Join-Path $root 'index.html'; $s = [IO.File]::ReadAllText($p)
$old = '<div id="genericAssetArt" class="generic-asset-art hidden">◇</div>'
$new = $old + "`r`n                <img id=`"heroAssetImage`" class=`"hero-asset-image hidden`" alt=`"تصویر دارایی`">"
if (!$s.Contains('id="heroAssetImage"')) { if (!$s.Contains($old)) { throw 'نقطه درج تصویر داشبورد در index.html پیدا نشد.' }; $s = $s.Replace($old,$new) }
$old = '                </select></label>' + "`r`n            <div id=`"categoryFields`" class=`"vehicle-fields`"></div>"
$new = @'
                </select></label>
            <section class="asset-image-picker">
                <label for="assetImageFile">تصویر اختصاصی دارایی (PNG)</label>
                <input id="assetImageFile" type="file" accept="image/png">
                <input type="hidden" name="image" value="">
                <div id="assetImagePreview" class="asset-image-preview hidden"><img id="assetImagePreviewImg" alt="پیش‌نمایش تصویر دارایی"><button id="clearAssetImage" class="small-btn" type="button">حذف انتخاب تصویر</button></div>
                <small class="muted">تصاویر ثابت را داخل پوشه assets/images قرار بده.</small>
                <div id="assetImageChoices" class="asset-image-choices"></div>
            </section>
            <div id="categoryFields" class="vehicle-fields"></div>
'@
if (!$s.Contains('id="assetImageChoices"')) { if (!$s.Contains($old)) { throw 'نقطه درج انتخاب تصویر در فرم دارایی پیدا نشد.' }; $s = $s.Replace($old,$new) }
[IO.File]::WriteAllText($p,$s,[Text.UTF8Encoding]::new($false))

# app.js helpers
$p = Join-Path $root 'app.js'; $s = [IO.File]::ReadAllText($p)
if (!$s.Contains('function assetImagePath(a)')) {
$anchor = 'function sortedServices(){'
$helper = @'
const ASSET_IMAGE_OPTIONS=[
 {file:"car.png",label:"خودرو"},{file:"motorcycle.png",label:"موتورسیکلت"},{file:"house.png",label:"خانه و ملک"},{file:"electronics.png",label:"موبایل و الکترونیک"},{file:"furniture.png",label:"مبلمان و لوازم خانه"},{file:"finance.png",label:"دارایی مالی"},{file:"personal.png",label:"دارایی شخصی"},{file:"health.png",label:"تجهیزات پزشکی"},{file:"other.png",label:"سایر دارایی‌ها"}
];
function assetImagePath(a){
 if(!a)return ""; if(a.image)return a.image;
 const n=(a.name||"").toLocaleLowerCase("fa");
 if(a.category==="موتورسیکلت"||/موتور|اسکوتر/.test(n))return "assets/images/motorcycle.png";
 if(a.category==="خانه"||/خانه|ملک|آپارتمان|زمین|ویلا/.test(n))return "assets/images/house.png";
 if(a.category==="مالی"||/سپرده|سهام|طلا|سکه|ارز|سرمایه|حساب/.test(n))return "assets/images/finance.png";
 if(a.category==="سلامت"||/پزشکی|دستگاه فشار|تجهیزات پزشکی/.test(n))return "assets/images/health.png";
 if(a.category==="شخصی")return "assets/images/personal.png";
 if(/موبایل|گوشی|لپ.?تاپ|کامپیوتر|تلویزیون|تبلت|الکترونیک/.test(n))return "assets/images/electronics.png";
 if(/مبل|کاناپه|صندلی|میز|یخچال|لباسشویی|لوازم خانه/.test(n))return "assets/images/furniture.png";
 if(a.category==="خودرو"||/پژو|پراید|سمند|خودرو|ماشین|۲۰۶|206|۲۰۷|207|تیبا|دنا/.test(n))return "assets/images/car.png";
 if(a.category==="وسایل")return "assets/images/furniture.png"; return "assets/images/other.png";
}
function renderAssetImageChoices(selectedPath=""){
 const box=$("assetImageChoices");if(!box)return;
 box.innerHTML=ASSET_IMAGE_OPTIONS.map(o=>{const path="assets/images/"+o.file;return `<button type="button" class="asset-image-choice${selectedPath===path?" active":""}" data-asset-image="${path}" title="${esc(o.label)}"><img src="${path}" alt=""><span>${esc(o.label)}</span></button>`}).join("");
}
function setAssetImage(path){const f=$("assetForm");if(!f)return;f.elements.image.value=path||"";const box=$("assetImagePreview"),img=$("assetImagePreviewImg");if(box)box.classList.toggle("hidden",!path);if(img&&path)img.src=path;document.querySelectorAll("[data-asset-image]").forEach(b=>b.classList.toggle("active",b.dataset.assetImage===path));}
function initAssetImagePicker(){
 renderAssetImageChoices();
 $("assetImageChoices")?.addEventListener("click",e=>{const b=e.target.closest("[data-asset-image]");if(b)setAssetImage(b.dataset.assetImage)});
 $("assetImageFile")?.addEventListener("change",e=>{const file=e.target.files?.[0];if(!file)return;if(file.type!=="image/png"){toast("لطفاً فقط فایل PNG انتخاب کن.");e.target.value="";return}if(file.size>1200000){toast("حجم تصویر باید کمتر از ۱٫۲ مگابایت باشد.");e.target.value="";return}const reader=new FileReader();reader.onload=()=>setAssetImage(String(reader.result||""));reader.readAsDataURL(file)});
 $("clearAssetImage")?.addEventListener("click",()=>{setAssetImage("");if($("assetImageFile"))$("assetImageFile").value=""});
}
initAssetImagePicker();
'@
 if (!$s.Contains($anchor)) { throw 'نقطه درج توابع تصویر در app.js پیدا نشد.' }; $s = $s.Replace($anchor,$helper+"`r`n"+$anchor)
}
# Replace reset/edit functions
$old = 'function resetAssetForm(){editingAssetId=null;const f=$("assetForm");f.reset();f.elements.category.value="خودرو";renderCategoryFields("خودرو",{});$("assetDialogTitle").textContent="افزودن دارایی"}'
$new = 'function resetAssetForm(){editingAssetId=null;const f=$("assetForm");f.reset();f.elements.category.value="خودرو";setAssetImage("");renderAssetImageChoices();renderCategoryFields("خودرو",{});$("assetDialogTitle").textContent="افزودن دارایی"}'
if ($s.Contains($old)) { $s=$s.Replace($old,$new) } elseif (!$s.Contains('setAssetImage("");renderAssetImageChoices();renderCategoryFields("خودرو",{})')) { throw 'تابع resetAssetForm با نسخه مورد انتظار تطبیق ندارد.' }
$old = 'f.elements.notes.value=a.notes||"";renderCategoryFields(a.category||"خودرو",{...a,details:a.details||{}});$("assetDialogTitle").textContent="ویرایش دارایی";open("assetDialog")'
$new = 'f.elements.notes.value=a.notes||"";setAssetImage(a.image||assetImagePath(a));renderAssetImageChoices(a.image||assetImagePath(a));renderCategoryFields(a.category||"خودرو",{...a,details:a.details||{}});$("assetDialogTitle").textContent="ویرایش دارایی";open("assetDialog")'
if ($s.Contains($old)) { $s=$s.Replace($old,$new) } elseif (!$s.Contains('setAssetImage(a.image||assetImagePath(a))')) { throw 'نقطه ویرایش تصویر در editAsset پیدا نشد.' }
# Add image field without replacing the whole minified submit handler
$old = 'const a={id:editingAssetId||uid(),name:d.get("name").trim(),category,metricUnit,'
$new = 'const oldAsset=editingAssetId?state.assets.find(x=>x.id===editingAssetId):null;const chosenImage=String(d.get("image")||"");const a={id:editingAssetId||uid(),name:d.get("name").trim(),category,image:chosenImage||oldAsset?.image||assetImagePath({name:d.get("name").trim(),category}),metricUnit,'
if ($s.Contains($old)) { $s=$s.Replace($old,$new) } elseif (!$s.Contains('category,image:chosenImage||oldAsset?.image')) { throw 'نقطه ذخیره تصویر در فرم دارایی پیدا نشد.' }
$old = 'createdAt:new Date().toISOString(),status:"active"};if(editingAssetId)'
$new = 'createdAt:oldAsset?.createdAt||new Date().toISOString(),status:"active"};if(editingAssetId)'
if ($s.Contains($old)) { $s=$s.Replace($old,$new) } elseif (!$s.Contains('createdAt:oldAsset?.createdAt||new Date().toISOString()')) { throw 'نقطه حفظ تاریخ ایجاد دارایی پیدا نشد.' }
# Dashboard hero: show custom image; keep existing SVG fallback when image fails
$old = 'const art=$("vehicleArt"),generic=$("genericAssetArt");if(art)art.classList.toggle("generic-mode",!!a&&! ["خودرو","موتورسیکلت"].includes(a.category));'
# source has no space before array; perform on exact shorter fragment
$old = 'const art=$("vehicleArt"),generic=$("genericAssetArt");if(art)art.classList.toggle("generic-mode",!!a&&!["خودرو","موتورسیکلت"].includes(a.category));'
$new = 'const art=$("vehicleArt"),generic=$("genericAssetArt"),heroImage=$("heroAssetImage");if(art)art.classList.toggle("generic-mode",!!a&&!["خودرو","موتورسیکلت"].includes(a.category));if(heroImage){const path=assetImagePath(a);heroImage.classList.add("hidden");if(path){heroImage.onerror=()=>{heroImage.classList.add("hidden");art?.classList.remove("has-custom-image")};heroImage.onload=()=>{heroImage.classList.remove("hidden");art?.classList.add("has-custom-image")};heroImage.src=path;}}'
if ($s.Contains($old)) { $s=$s.Replace($old,$new) } elseif (!$s.Contains('heroImage=$("heroAssetImage")')) { throw 'نقطه نمایش تصویر در داشبورد پیدا نشد.' }
[IO.File]::WriteAllText($p,$s,[Text.UTF8Encoding]::new($false))

# styles.css: append self-contained styles
$p = Join-Path $root 'styles.css'; $s = [IO.File]::ReadAllText($p)
if (!$s.Contains('.hero-asset-image{')) {
$css = @'

/* PNG asset images */
.hero-asset-image{display:block;width:min(100%,560px);height:200px;object-fit:contain;margin:-3px auto 0;filter:drop-shadow(0 14px 14px #0005)}
.hero-asset-image.hidden{display:none!important}.vehicle-art.has-custom-image>svg,.vehicle-art.has-custom-image>.generic-asset-art{display:none!important}
.asset-image-picker{margin-top:8px;padding:10px;border:1px solid #ffffff12;border-radius:14px;background:#ffffff04}.asset-image-picker>label{margin-top:0}
.asset-image-choices{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:10px}.asset-image-choice{min-width:0;padding:8px 4px;border:1px solid #ffffff14;border-radius:11px;background:#ffffff06;color:var(--text);font:inherit;font-size:10px;cursor:pointer}.asset-image-choice.active{border-color:var(--cyan);background:#36c8d51a}.asset-image-choice img{display:block;width:100%;height:48px;object-fit:contain;margin-bottom:5px}.asset-image-choice span{display:block;overflow-wrap:anywhere}.asset-image-preview{display:flex;align-items:center;gap:10px;margin-top:8px}.asset-image-preview img{width:62px;height:62px;object-fit:contain;background:#ffffff08;border-radius:10px}.asset-image-preview.hidden{display:none!important}
'@
$s += $css
}
[IO.File]::WriteAllText($p,$s,[Text.UTF8Encoding]::new($false))

# create expected image directory and README
New-Item -ItemType Directory -Force (Join-Path $root 'assets/images') | Out-Null
$readme = @'
تصاویر پیشنهادی PNG را با نام‌های زیر در همین پوشه قرار بده:
car.png - خودرو
motorcycle.png - موتورسیکلت
house.png - خانه و ملک
electronics.png - موبایل و الکترونیک
furniture.png - مبلمان و لوازم خانه
finance.png - دارایی مالی
personal.png - دارایی شخصی
health.png - تجهیزات پزشکی
other.png - سایر دارایی‌ها
پیشنهاد: PNG مربعی 512x512 با پس‌زمینه شفاف و حجم کمتر از 1.2 مگابایت.
'@
[IO.File]::WriteAllText((Join-Path $root 'assets/images/README.txt'),$readme,[Text.UTF8Encoding]::new($false))
Write-Host 'انجام شد: فایل‌های index.html، app.js و styles.css اصلاح شدند و نسخه پشتیبان کنار هر فایل ساخته شد.' -ForegroundColor Green
Write-Host 'حالا صفحه را refresh کن و ابتدا با یک دارایی آزمایشی انتخاب تصویر را تست کن. هیچ داده‌ای پاک نشده است.'
