'use strict';

// ===== Planner for Best Life 7.9 =====
// ادغام نهایی تغییرات 7.7 روی جدیدترین پایه 7.8:
// سه مجموعه پیام روزانه + نمودارهای دایره‌ای + حفظ تایم‌باکسینگ افقی/عمودی.
const V79_SCHEMA='planner-life-for-soil-v7.9';

function v79EnsureState(){
  S.meta=S.meta||{};
  S.meta.schemaVersion=V79_SCHEMA;
  S.settingsV7=S.settingsV7||{};
  if(typeof S.settingsV7.dailyWisdomEnabled!=='boolean')S.settingsV7.dailyWisdomEnabled=true;
  S.settingsV7.dailyWisdomCollections=['motivation','discipline','power'];
  localStorage.setItem(K,JSON.stringify(S));
  window.S=S;
}

// در تمام نماهایی که از kpi() استفاده می‌کنند، کارت آماری را به رینگ دایره‌ای تبدیل می‌کند.
function v79ApplyCircularMetrics(){
  if(typeof v77MetricCircle==='function'){
    kpi=v77MetricCircle;
    window.kpi=v77MetricCircle;
  }
}

// پیام روز باید بعد از هر رندر، در بالای محتوای همان صفحه دیده شود.
function v79ApplyDailyWisdom(){
  if(typeof v77InjectDailyWisdom==='function')v77InjectDailyWisdom();
}

function v79Rename(){
  document.title='Planner for Best Life 7.9';
  const label=document.getElementById('calendarLabel');
  if(label)label.textContent='Planner for Best Life 7.9 · تمرکز، تایم‌باکسینگ و پیشرفت';
  const brand=document.querySelector('.brand h1');
  if(brand)brand.textContent='Planner for Best Life';
}

const v79RenderBase=render;
render=function(){
  v79ApplyCircularMetrics();
  const out=v79RenderBase();
  v79ApplyDailyWisdom();
  v79Rename();
  return out;
};
window.render=render;

function v79Init(){
  v79EnsureState();
  v79ApplyCircularMetrics();
  v79Rename();
  render();
  setTimeout(()=>{
    v79ApplyCircularMetrics();
    v79ApplyDailyWisdom();
    v79Rename();
  },0);
}

v79Init();
