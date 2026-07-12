'use strict';

// ===== Planner Life for Soil 7.6 =====
// مدیریت مالی شخصی، درآمد/هزینه، بودجه، پس‌انداز، سرمایه‌گذاری، وام و اقساط و پیش‌بینی جریان نقدی.
const V74_SCHEMA='planner-life-os-v7.5';
const V74_TX_TYPES=[['income','درآمد'],['expense','هزینه']];
const V74_TX_STATUSES=[['actual','قطعی/انجام‌شده'],['planned','برنامه‌ریزی‌شده'],['probable','احتمالی']];
const V74_ALLOCATION_TYPES=[['saving','پس‌انداز'],['investment','سرمایه‌گذاری']];
const V74_LOAN_STATUSES=[['active','فعال'],['paused','متوقف'],['completed','تسویه‌شده']];
const V74_DEFAULT_INCOME_SOURCES=['حقوق','فروش کتاب','دوره آموزشی','مشاوره','سخنرانی','خدمات شرکتی','سایر'];
const V74_DEFAULT_EXPENSE_CATEGORIES=['مسکن','خوراک','حمل‌ونقل','سلامت','آموزش','خانواده','تفریح','قبوض','قسط و بدهی','سایر'];

function v74Now(){return new Date().toISOString()}
function v74Uid(prefix='f'){return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`}
function v74Num(v,f=0){const n=Number(v);return Number.isFinite(n)?n:f}
function v74Clamp(v,a=0,b=100){return Math.max(a,Math.min(b,v74Num(v)))}
function v74Money(v){return fa(Math.round(v74Num(v)).toLocaleString('en-US'))+' تومان'}
function v74SignedMoney(v){const n=v74Num(v);return (n<0?'− ':'')+v74Money(Math.abs(n))}
function v74Label(list,value){return list.find(x=>x[0]===value)?.[1]||value||'—'}
function v74DateOk(s){return !!jDate(s)}
function v74MonthKey(d=todayJ()){return String(d||'').slice(0,7)}
function v74DateDiff(a,b){try{return Math.round((jToDate(b)-jToDate(a))/86400000)}catch(_){return 0}}
function v74AddMonths(date,months){
  const p=par(date),idx=(p.jm-1)+months,ny=p.jy+Math.floor(idx/12),nm=((idx%12)+12)%12+1;
  return fmt(ny,nm,Math.min(p.jd,ml(ny,nm)));
}
function v74DueIn(date,days){const x=v74DateDiff(todayJ(),date);return x>=0&&x<=days}
function v74MonthName(key){const p=String(key||'').split('-');return `${C.months[(+p[1]||1)-1]||''} ${fa(p[0]||'')}`}
function v74Touch(entity,id){const x=(S[entity]||[]).find(r=>r.id===id);if(x)x.updatedAt=v74Now()}

function v74EnsureState(){
  S.financeSettings=Object.assign({
    openingBalance:0,openingDate:todayJ(),salaryEnabled:false,salaryAmount:0,salaryDay:1,salarySource:'حقوق',
    includeProbableInForecast:true,currency:'تومان',migrationDone:false
  },S.financeSettings||{});
  S.financeTransactions=Array.isArray(S.financeTransactions)?S.financeTransactions:[];
  S.financeBudgets=Array.isArray(S.financeBudgets)?S.financeBudgets:[];
  S.financeAllocations=Array.isArray(S.financeAllocations)?S.financeAllocations:[];
  S.loans=Array.isArray(S.loans)?S.loans:[];
  S.installments=Array.isArray(S.installments)?S.installments:[];
  S.financeCategories=S.financeCategories||{income:[...V74_DEFAULT_INCOME_SOURCES],expense:[...V74_DEFAULT_EXPENSE_CATEGORIES]};
  S.financeCategories.income=Array.from(new Set([...(S.financeCategories.income||[]),...V74_DEFAULT_INCOME_SOURCES]));
  S.financeCategories.expense=Array.from(new Set([...(S.financeCategories.expense||[]),...V74_DEFAULT_EXPENSE_CATEGORIES]));

  if(!S.financeSettings.migrationDone&&S.finance){
    const now=v74Now();
    (S.finance.incomes||[]).forEach(x=>S.financeTransactions.push({id:x.id||v74Uid('tx'),type:'income',title:x.title||x.source||'درآمد',amount:v74Num(x.amount),date:jDate(x.date)||todayJ(),status:x.status||'actual',source:x.source||'سایر',category:'',note:x.note||'',createdAt:x.createdAt||now,updatedAt:x.updatedAt||now}));
    (S.finance.expenses||[]).forEach(x=>S.financeTransactions.push({id:x.id||v74Uid('tx'),type:'expense',title:x.title||x.category||'هزینه',amount:v74Num(x.amount),date:jDate(x.date)||todayJ(),status:x.status||'actual',source:'',category:x.category||'سایر',note:x.note||'',createdAt:x.createdAt||now,updatedAt:x.updatedAt||now}));
    (S.finance.budgets||[]).forEach(x=>S.financeBudgets.push({id:x.id||v74Uid('budget'),month:x.month||v74MonthKey(),category:x.category||'سایر',limit:v74Num(x.limit||x.amount),createdAt:x.createdAt||now,updatedAt:x.updatedAt||now}));
    (S.finance.savings||[]).forEach(x=>S.financeAllocations.push({id:x.id||v74Uid('alloc'),kind:'saving',title:x.title||'پس‌انداز',amount:v74Num(x.amount),date:jDate(x.date)||todayJ(),status:x.status||'actual',note:x.note||'',createdAt:x.createdAt||now,updatedAt:x.updatedAt||now}));
    (S.finance.investments||[]).forEach(x=>S.financeAllocations.push({id:x.id||v74Uid('alloc'),kind:'investment',title:x.title||'سرمایه‌گذاری',amount:v74Num(x.amount),date:jDate(x.date)||todayJ(),status:x.status||'actual',note:x.note||'',createdAt:x.createdAt||now,updatedAt:x.updatedAt||now}));
    if(v74Num(S.finance.balance)&&!v74Num(S.financeSettings.openingBalance))S.financeSettings.openingBalance=v74Num(S.finance.balance);
    S.financeSettings.migrationDone=true;
  }

  const stamp=S.updatedAt||v74Now();
  ['financeTransactions','financeBudgets','financeAllocations','loans','installments'].forEach(k=>(S[k]||[]).forEach(x=>{x.createdAt=x.createdAt||stamp;x.updatedAt=x.updatedAt||x.createdAt}));
  S.loans.forEach(l=>{
    l.principal=v74Num(l.principal);l.balance=Math.max(0,v74Num(l.balance,l.principal));l.totalCount=Math.max(0,v74Num(l.totalCount));l.remainingCount=Math.max(0,v74Num(l.remainingCount,l.totalCount));l.paidCount=Math.max(0,v74Num(l.paidCount,Math.max(0,l.totalCount-l.remainingCount)));
    l.dueDay=Math.max(1,Math.min(31,v74Num(l.dueDay,1)));l.defaultAmount=Math.max(0,v74Num(l.defaultAmount));l.installmentMode=l.installmentMode||'fixed';l.status=l.status||'active';
  });
  S.installments.forEach(i=>{i.amount=Math.max(0,v74Num(i.amount));i.status=i.status||'unpaid';i.dueDate=jDate(i.dueDate)||todayJ()});
  S.meta=S.meta||{};S.meta.schemaVersion=V74_SCHEMA;
  if(typeof v74EnsureSalaryEntries==='function')v74EnsureSalaryEntries();
  localStorage.setItem(K,JSON.stringify(S));window.S=S;
}

function v74ActualTransactions(){return S.financeTransactions.filter(t=>t.status==='actual')}
function v74CashBalance(){
  const f=S.financeSettings,opening=v74Num(f.openingBalance);
  const tx=v74ActualTransactions().reduce((sum,t)=>sum+(t.type==='income'?v74Num(t.amount):-v74Num(t.amount)),0);
  const alloc=S.financeAllocations.filter(a=>a.status==='actual').reduce((sum,a)=>sum+v74Num(a.amount),0);
  return opening+tx-alloc;
}
function v74AllocationTotal(kind,status='actual'){return S.financeAllocations.filter(a=>(!kind||a.kind===kind)&&(!status||a.status===status)).reduce((s,a)=>s+v74Num(a.amount),0)}
function v74DebtBalance(){return S.loans.filter(l=>l.status!=='completed').reduce((s,l)=>s+Math.max(0,v74Num(l.balance)),0)}
function v74NetWorth(){return v74CashBalance()+v74AllocationTotal('saving')+v74AllocationTotal('investment')-v74DebtBalance()}
function v74InRange(date,start,end){return date>=start&&date<=end}
function v74Forecast(days){
  const start=todayJ(),end=addDays(start,days),includeProbable=S.financeSettings.includeProbableInForecast!==false;
  const tx=S.financeTransactions.filter(t=>v74InRange(t.date,start,end)&&t.status!=='actual'&&(t.status==='planned'||(includeProbable&&t.status==='probable')));
  const incomes=tx.filter(t=>t.type==='income').reduce((s,t)=>s+v74Num(t.amount),0);
  const expenses=tx.filter(t=>t.type==='expense').reduce((s,t)=>s+v74Num(t.amount),0);
  const installments=S.installments.filter(i=>i.status!=='paid'&&v74InRange(i.dueDate,start,end)).reduce((s,i)=>s+v74Num(i.amount),0);
  const allocations=S.financeAllocations.filter(a=>a.status!=='actual'&&v74InRange(a.date,start,end)).reduce((s,a)=>s+v74Num(a.amount),0);
  const obligations=expenses+installments+allocations;
  return{days,start,end,incomes,expenses,installments,allocations,obligations,forecast:v74CashBalance()+incomes-obligations};
}
function v74MonthActual(month,type){return S.financeTransactions.filter(t=>t.status==='actual'&&t.type===type&&v74MonthKey(t.date)===month).reduce((s,t)=>s+v74Num(t.amount),0)}
function v74BudgetSpent(b){return S.financeTransactions.filter(t=>t.status==='actual'&&t.type==='expense'&&v74MonthKey(t.date)===b.month&&t.category===b.category).reduce((s,t)=>s+v74Num(t.amount),0)}
function v74NextInstallment(){return [...S.installments].filter(i=>i.status!=='paid').sort((a,b)=>a.dueDate.localeCompare(b.dueDate))[0]||null}
function v74Loan(id){return S.loans.find(x=>x.id===id)}
function v74Installment(id){return S.installments.find(x=>x.id===id)}
function v74LoanInstallments(id){return S.installments.filter(x=>x.loanId===id).sort((a,b)=>a.dueDate.localeCompare(b.dueDate))}
function v74LoanProgress(l){
  if(l.principal>0)return v74Clamp((l.principal-l.balance)/l.principal*100);
  const total=Math.max(1,l.totalCount||l.paidCount+l.remainingCount);return v74Clamp(l.paidCount/total*100);
}

function v74EnsureSalaryEntries(){
  const f=S.financeSettings;if(!f.salaryEnabled||v74Num(f.salaryAmount)<=0)return;
  const today=todayJ(),start=fmt(par(today).jy,par(today).jm,1);
  for(let n=0;n<15;n++){
    const base=v74AddMonths(start,n),p=par(base),day=Math.min(Math.max(1,v74Num(f.salaryDay,1)),ml(p.jy,p.jm)),date=fmt(p.jy,p.jm,day),key=`salary-${p.jy}-${pad(p.jm)}`;
    const existing=S.financeTransactions.find(t=>t.recurrenceKey===key);if(!existing)S.financeTransactions.push({id:v74Uid('tx'),type:'income',title:'حقوق ماهانه',amount:v74Num(f.salaryAmount),date,status:'planned',source:f.salarySource||'حقوق',category:'',note:'ایجاد خودکار از تنظیمات مالی',recurrenceKey:key,createdAt:v74Now(),updatedAt:v74Now()});else if(existing.status!=='actual'){existing.amount=v74Num(f.salaryAmount);existing.date=date;existing.source=f.salarySource||'حقوق';existing.title=existing.title||'حقوق ماهانه';}
  }
}

function v74Options(list,current){return list.map(([v,l])=>`<option value="${esc(v)}" ${v===current?'selected':''}>${esc(l)}</option>`).join('')}
function v74CategoryOptions(type,current=''){
  const rows=S.financeCategories[type==='income'?'income':'expense']||[];
  return rows.map(x=>`<option value="${esc(x)}" ${x===current?'selected':''}>${esc(x)}</option>`).join('')+`<option value="__custom__">عنوان جدید...</option>`;
}
function v74LoanOptions(current=''){return S.loans.map(l=>`<option value="${l.id}" ${l.id===current?'selected':''}>${esc(l.title)}</option>`).join('')}

function v74BuildDialogs(){
  if(document.getElementById('v74TransactionDialog'))return;
  document.body.insertAdjacentHTML('beforeend',`
  <dialog id="v74TransactionDialog"><form id="v74TransactionForm"><div class="dlgHead"><div><h3 id="v74TransactionTitle">ثبت تراکنش</h3><p class="muted">تمام مبالغ به تومان ثبت می‌شوند.</p></div><button type="button" onclick="v74Close('v74TransactionDialog')">×</button></div><input id="v74TransactionId" type="hidden"><div class="formGrid"><label>نوع<select id="v74TransactionType">${v74Options(V74_TX_TYPES,'income')}</select></label><label>وضعیت<select id="v74TransactionStatus">${v74Options(V74_TX_STATUSES,'actual')}</select></label><label class="wide">عنوان<input id="v74TransactionName" required></label><label>مبلغ به تومان<input id="v74TransactionAmount" type="number" min="0" step="1000" required></label><label>تاریخ شمسی<input id="v74TransactionDate" required></label><label id="v74TransactionCategoryWrap">منبع / دسته‌بندی<select id="v74TransactionCategory"></select></label><label id="v74CustomCategoryWrap" class="hide">عنوان جدید<input id="v74CustomCategory"></label><label>تکرار<select id="v74TransactionRepeat"><option value="none">بدون تکرار</option><option value="monthly">ماهانه</option></select></label><label>تعداد تکرار آینده<input id="v74TransactionRepeatCount" type="number" min="1" max="36" value="12"></label><label class="wide">یادداشت<textarea id="v74TransactionNote"></textarea></label></div><footer><button type="button" id="v74DeleteTransaction" class="danger hide">حذف</button><span></span><button type="button" onclick="v74Close('v74TransactionDialog')">انصراف</button><button class="primary">ذخیره</button></footer></form></dialog>

  <dialog id="v74FinanceSettingsDialog"><form id="v74FinanceSettingsForm"><div class="dlgHead"><div><h3>تنظیمات مالی</h3><p class="muted">موجودی اولیه و حقوق ماهانه مبنای پیش‌بینی جریان نقدی هستند.</p></div><button type="button" onclick="v74Close('v74FinanceSettingsDialog')">×</button></div><div class="formGrid"><label>موجودی اولیه کلی<input id="v74OpeningBalance" type="number" step="1000"></label><label>تاریخ موجودی اولیه<input id="v74OpeningDate"></label><label class="v74Check wide"><input id="v74SalaryEnabled" type="checkbox"> ایجاد خودکار حقوق ماهانه</label><label>مبلغ حقوق<input id="v74SalaryAmount" type="number" min="0" step="1000"></label><label>روز واریز حقوق<input id="v74SalaryDay" type="number" min="1" max="31"></label><label>نام منبع حقوق<input id="v74SalarySource"></label><label class="v74Check"><input id="v74IncludeProbable" type="checkbox"> درآمدهای احتمالی در پیش‌بینی لحاظ شود</label></div><footer><span></span><button type="button" onclick="v74Close('v74FinanceSettingsDialog')">انصراف</button><button class="primary">ذخیره تنظیمات</button></footer></form></dialog>

  <dialog id="v74BudgetDialog"><form id="v74BudgetForm"><div class="dlgHead"><h3>بودجه ماهانه</h3><button type="button" onclick="v74Close('v74BudgetDialog')">×</button></div><input id="v74BudgetId" type="hidden"><div class="formGrid"><label>ماه شمسی<input id="v74BudgetMonth" placeholder="1405-05"></label><label>دسته‌بندی<input id="v74BudgetCategory" list="v74ExpenseCats"></label><datalist id="v74ExpenseCats"></datalist><label class="wide">سقف بودجه به تومان<input id="v74BudgetLimit" type="number" min="0" step="1000"></label></div><footer><button type="button" id="v74DeleteBudget" class="danger hide">حذف</button><span></span><button type="button" onclick="v74Close('v74BudgetDialog')">انصراف</button><button class="primary">ذخیره بودجه</button></footer></form></dialog>

  <dialog id="v74AllocationDialog"><form id="v74AllocationForm"><div class="dlgHead"><h3>پس‌انداز یا سرمایه‌گذاری</h3><button type="button" onclick="v74Close('v74AllocationDialog')">×</button></div><input id="v74AllocationId" type="hidden"><div class="formGrid"><label>نوع<select id="v74AllocationKind">${v74Options(V74_ALLOCATION_TYPES,'saving')}</select></label><label>وضعیت<select id="v74AllocationStatus">${v74Options(V74_TX_STATUSES,'actual')}</select></label><label class="wide">عنوان<input id="v74AllocationTitle" required></label><label>مبلغ<input id="v74AllocationAmount" type="number" min="0" step="1000" required></label><label>تاریخ<input id="v74AllocationDate" required></label><label class="wide">یادداشت<textarea id="v74AllocationNote"></textarea></label></div><footer><button type="button" id="v74DeleteAllocation" class="danger hide">حذف</button><span></span><button type="button" onclick="v74Close('v74AllocationDialog')">انصراف</button><button class="primary">ذخیره</button></footer></form></dialog>

  <dialog id="v74LoanDialog"><form id="v74LoanForm"><div class="dlgHead"><div><h3>ثبت وام یا بدهی</h3><p class="muted">برای اقساط متغیر، مبلغ هر قسط پس از تولید قابل ویرایش است.</p></div><button type="button" onclick="v74Close('v74LoanDialog')">×</button></div><input id="v74LoanId" type="hidden"><div class="formGrid"><label class="wide">عنوان وام<input id="v74LoanTitle" required></label><label>وام‌دهنده / بانک<input id="v74LoanLender"></label><label>وضعیت<select id="v74LoanStatus">${v74Options(V74_LOAN_STATUSES,'active')}</select></label><label>مبلغ اولیه وام<input id="v74LoanPrincipal" type="number" min="0" step="1000"></label><label>مانده فعلی بدهی<input id="v74LoanBalance" type="number" min="0" step="1000" required></label><label>تعداد کل اقساط<input id="v74LoanTotalCount" type="number" min="0"></label><label>تعداد اقساط باقی‌مانده<input id="v74LoanRemainingCount" type="number" min="0" required></label><label>تعداد اقساط پرداخت‌شده<input id="v74LoanPaidCount" type="number" min="0"></label><label>روز سررسید ماه<input id="v74LoanDueDay" type="number" min="1" max="31"></label><label>اولین سررسید بعدی<input id="v74LoanNextDue" required></label><label>نوع مبلغ قسط<select id="v74LoanMode"><option value="fixed">ثابت</option><option value="variable">متغیر</option></select></label><label>مبلغ پیش‌فرض هر قسط<input id="v74LoanDefaultAmount" type="number" min="0" step="1000"></label><label>تاریخ تقریبی پایان<input id="v74LoanEndDate"></label><label class="v74Check"><input id="v74GenerateOnSave" type="checkbox" checked> اقساط باقی‌مانده خودکار ساخته شوند</label><label class="wide">یادداشت<textarea id="v74LoanNote"></textarea></label></div><footer><button type="button" id="v74DeleteLoan" class="danger hide">حذف</button><span></span><button type="button" onclick="v74Close('v74LoanDialog')">انصراف</button><button class="primary">ذخیره وام</button></footer></form></dialog>

  <dialog id="v74InstallmentDialog"><form id="v74InstallmentForm"><div class="dlgHead"><h3>ثبت یا ویرایش قسط</h3><button type="button" onclick="v74Close('v74InstallmentDialog')">×</button></div><input id="v74InstallmentId" type="hidden"><div class="formGrid"><label>وام<select id="v74InstallmentLoan" required></select></label><label>سررسید<input id="v74InstallmentDate" required></label><label>مبلغ<input id="v74InstallmentAmount" type="number" min="0" step="1000" required></label><label>وضعیت<select id="v74InstallmentStatus"><option value="unpaid">در انتظار</option><option value="paid">پرداخت‌شده</option></select></label><label class="wide">یادداشت<textarea id="v74InstallmentNote"></textarea></label></div><footer><button type="button" id="v74DeleteInstallment" class="danger hide">حذف</button><span></span><button type="button" onclick="v74Close('v74InstallmentDialog')">انصراف</button><button class="primary">ذخیره قسط</button></footer></form></dialog>
  <dialog id="v74MoreNavDialog"><form method="dialog"><div class="dlgHead"><div><h3>همه بخش‌های Planner Life for Soil</h3><p class="muted">بخش موردنظر را انتخاب کن.</p></div><button type="button" onclick="v74Close('v74MoreNavDialog')">×</button></div><div id="v74MoreNavGrid" class="v74MoreNavGrid"></div></form></dialog>`);

  document.getElementById('v74TransactionType').onchange=()=>v74RefreshTransactionCategory();
  document.getElementById('v74TransactionCategory').onchange=e=>document.getElementById('v74CustomCategoryWrap').classList.toggle('hide',e.target.value!=='__custom__');
  document.getElementById('v74TransactionForm').onsubmit=e=>{e.preventDefault();v74SaveTransaction()};
  document.getElementById('v74FinanceSettingsForm').onsubmit=e=>{e.preventDefault();v74SaveFinanceSettings()};
  document.getElementById('v74BudgetForm').onsubmit=e=>{e.preventDefault();v74SaveBudget()};
  document.getElementById('v74AllocationForm').onsubmit=e=>{e.preventDefault();v74SaveAllocation()};
  document.getElementById('v74LoanForm').onsubmit=e=>{e.preventDefault();v74SaveLoan()};
  document.getElementById('v74InstallmentForm').onsubmit=e=>{e.preventDefault();v74SaveInstallment()};
}
function v74Close(id){document.getElementById(id)?.close()}
window.v74Close=v74Close;

function v74RefreshTransactionCategory(current=''){
  const type=document.getElementById('v74TransactionType').value,el=document.getElementById('v74TransactionCategory');
  el.innerHTML=v74CategoryOptions(type,current);document.getElementById('v74TransactionCategoryWrap').firstChild.textContent=type==='income'?'منبع درآمد':'دسته‌بندی هزینه';
  document.getElementById('v74CustomCategoryWrap').classList.add('hide');
}
function v74OpenTransaction(type='income',id=''){
  v74BuildDialogs();const t=S.financeTransactions.find(x=>x.id===id)||{};
  if(t.linkedInstallmentId)return alert('این تراکنش از پرداخت قسط ساخته شده است؛ وضعیت را از بخش اقساط تغییر بده.');
  document.getElementById('v74TransactionId').value=t.id||'';document.getElementById('v74TransactionTitle').textContent=t.id?'ویرایش تراکنش':'ثبت '+(type==='expense'?'هزینه':'درآمد');
  document.getElementById('v74TransactionType').value=t.type||type;document.getElementById('v74TransactionStatus').value=t.status||'actual';document.getElementById('v74TransactionName').value=t.title||'';document.getElementById('v74TransactionAmount').value=t.amount||'';document.getElementById('v74TransactionDate').value=t.date||todayJ();
  v74RefreshTransactionCategory(t.type==='income'?t.source:t.category);document.getElementById('v74TransactionRepeat').value='none';document.getElementById('v74TransactionRepeatCount').value=12;document.getElementById('v74TransactionNote').value=t.note||'';
  const del=document.getElementById('v74DeleteTransaction');del.classList.toggle('hide',!t.id);del.onclick=()=>v74DeleteTransaction(t.id);document.getElementById('v74TransactionDialog').showModal();
}
window.v74OpenTransaction=v74OpenTransaction;
function v74SaveTransaction(){
  const id=document.getElementById('v74TransactionId').value,type=document.getElementById('v74TransactionType').value,title=document.getElementById('v74TransactionName').value.trim(),amount=v74Num(document.getElementById('v74TransactionAmount').value),date=jDate(document.getElementById('v74TransactionDate').value);
  if(!title||amount<=0||!date)return alert('عنوان، مبلغ و تاریخ معتبر را وارد کن.');
  let cat=document.getElementById('v74TransactionCategory').value;if(cat==='__custom__')cat=document.getElementById('v74CustomCategory').value.trim();if(!cat)cat=type==='income'?'سایر':'سایر';
  const old=S.financeTransactions.find(x=>x.id===id),now=v74Now(),row={id:id||v74Uid('tx'),type,title,amount,date,status:document.getElementById('v74TransactionStatus').value,source:type==='income'?cat:'',category:type==='expense'?cat:'',note:document.getElementById('v74TransactionNote').value.trim(),recurrenceKey:old?.recurrenceKey||'',createdAt:old?.createdAt||now,updatedAt:now};
  const idx=S.financeTransactions.findIndex(x=>x.id===row.id);idx>=0?S.financeTransactions[idx]=row:S.financeTransactions.unshift(row);
  const list=S.financeCategories[type==='income'?'income':'expense'];if(!list.includes(cat))list.push(cat);
  if(!id&&document.getElementById('v74TransactionRepeat').value==='monthly'){
    const count=Math.max(1,Math.min(36,v74Num(document.getElementById('v74TransactionRepeatCount').value,12)));
    for(let n=1;n<count;n++){const d=v74AddMonths(date,n);S.financeTransactions.push({...row,id:v74Uid('tx'),date:d,status:'planned',recurrenceKey:`manual-${row.id}-${n}`,createdAt:now,updatedAt:now})}
  }
  save();v74Close('v74TransactionDialog');render();
}
function v74DeleteTransaction(id){if(!id||!confirm('این تراکنش حذف شود؟'))return;v7MarkDeleted?.('financeTransactions',id);S.financeTransactions=S.financeTransactions.filter(x=>x.id!==id);save();v74Close('v74TransactionDialog');render()}

function v74OpenFinanceSettings(){
  v74BuildDialogs();const f=S.financeSettings;document.getElementById('v74OpeningBalance').value=f.openingBalance||0;document.getElementById('v74OpeningDate').value=f.openingDate||todayJ();document.getElementById('v74SalaryEnabled').checked=!!f.salaryEnabled;document.getElementById('v74SalaryAmount').value=f.salaryAmount||0;document.getElementById('v74SalaryDay').value=f.salaryDay||1;document.getElementById('v74SalarySource').value=f.salarySource||'حقوق';document.getElementById('v74IncludeProbable').checked=f.includeProbableInForecast!==false;document.getElementById('v74FinanceSettingsDialog').showModal();
}
window.v74OpenFinanceSettings=v74OpenFinanceSettings;
function v74SaveFinanceSettings(){
  const date=jDate(document.getElementById('v74OpeningDate').value);if(!date)return alert('تاریخ موجودی اولیه معتبر نیست.');
  Object.assign(S.financeSettings,{openingBalance:v74Num(document.getElementById('v74OpeningBalance').value),openingDate:date,salaryEnabled:document.getElementById('v74SalaryEnabled').checked,salaryAmount:Math.max(0,v74Num(document.getElementById('v74SalaryAmount').value)),salaryDay:Math.max(1,Math.min(31,v74Num(document.getElementById('v74SalaryDay').value,1))),salarySource:document.getElementById('v74SalarySource').value.trim()||'حقوق',includeProbableInForecast:document.getElementById('v74IncludeProbable').checked,updatedAt:v74Now()});
  v74EnsureSalaryEntries();save();v74Close('v74FinanceSettingsDialog');render();
}

function v74OpenBudget(id=''){
  v74BuildDialogs();const b=S.financeBudgets.find(x=>x.id===id)||{};document.getElementById('v74BudgetId').value=b.id||'';document.getElementById('v74BudgetMonth').value=b.month||v74MonthKey();document.getElementById('v74BudgetCategory').value=b.category||'';document.getElementById('v74BudgetLimit').value=b.limit||'';document.getElementById('v74ExpenseCats').innerHTML=(S.financeCategories.expense||[]).map(x=>`<option value="${esc(x)}">`).join('');const del=document.getElementById('v74DeleteBudget');del.classList.toggle('hide',!b.id);del.onclick=()=>v74DeleteBudget(b.id);document.getElementById('v74BudgetDialog').showModal();
}
window.v74OpenBudget=v74OpenBudget;
function v74SaveBudget(){const id=document.getElementById('v74BudgetId').value,month=en(document.getElementById('v74BudgetMonth').value).replace('/','-'),category=document.getElementById('v74BudgetCategory').value.trim(),limit=v74Num(document.getElementById('v74BudgetLimit').value);if(!/^\d{4}-\d{2}$/.test(month)||!category||limit<=0)return alert('ماه، دسته‌بندی و سقف معتبر وارد کن.');const old=S.financeBudgets.find(x=>x.id===id),row={id:id||v74Uid('budget'),month,category,limit,createdAt:old?.createdAt||v74Now(),updatedAt:v74Now()};const i=S.financeBudgets.findIndex(x=>x.id===row.id);i>=0?S.financeBudgets[i]=row:S.financeBudgets.unshift(row);save();v74Close('v74BudgetDialog');render()}
function v74DeleteBudget(id){if(!confirm('این بودجه حذف شود؟'))return;v7MarkDeleted?.('financeBudgets',id);S.financeBudgets=S.financeBudgets.filter(x=>x.id!==id);save();v74Close('v74BudgetDialog');render()}

function v74OpenAllocation(kind='saving',id=''){
  v74BuildDialogs();const a=S.financeAllocations.find(x=>x.id===id)||{};document.getElementById('v74AllocationId').value=a.id||'';document.getElementById('v74AllocationKind').value=a.kind||kind;document.getElementById('v74AllocationStatus').value=a.status||'actual';document.getElementById('v74AllocationTitle').value=a.title||'';document.getElementById('v74AllocationAmount').value=a.amount||'';document.getElementById('v74AllocationDate').value=a.date||todayJ();document.getElementById('v74AllocationNote').value=a.note||'';const del=document.getElementById('v74DeleteAllocation');del.classList.toggle('hide',!a.id);del.onclick=()=>v74DeleteAllocation(a.id);document.getElementById('v74AllocationDialog').showModal();
}
window.v74OpenAllocation=v74OpenAllocation;
function v74SaveAllocation(){const id=document.getElementById('v74AllocationId').value,title=document.getElementById('v74AllocationTitle').value.trim(),amount=v74Num(document.getElementById('v74AllocationAmount').value),date=jDate(document.getElementById('v74AllocationDate').value);if(!title||amount<=0||!date)return alert('عنوان، مبلغ و تاریخ معتبر وارد کن.');const old=S.financeAllocations.find(x=>x.id===id),row={id:id||v74Uid('alloc'),kind:document.getElementById('v74AllocationKind').value,status:document.getElementById('v74AllocationStatus').value,title,amount,date,note:document.getElementById('v74AllocationNote').value.trim(),createdAt:old?.createdAt||v74Now(),updatedAt:v74Now()};const i=S.financeAllocations.findIndex(x=>x.id===row.id);i>=0?S.financeAllocations[i]=row:S.financeAllocations.unshift(row);save();v74Close('v74AllocationDialog');render()}
function v74DeleteAllocation(id){if(!confirm('این مورد حذف شود؟'))return;v7MarkDeleted?.('financeAllocations',id);S.financeAllocations=S.financeAllocations.filter(x=>x.id!==id);save();v74Close('v74AllocationDialog');render()}

function v74OpenLoan(id=''){
  v74BuildDialogs();const l=v74Loan(id)||{};document.getElementById('v74LoanId').value=l.id||'';document.getElementById('v74LoanTitle').value=l.title||'';document.getElementById('v74LoanLender').value=l.lender||'';document.getElementById('v74LoanStatus').value=l.status||'active';document.getElementById('v74LoanPrincipal').value=l.principal||'';document.getElementById('v74LoanBalance').value=l.balance||'';document.getElementById('v74LoanTotalCount').value=l.totalCount||'';document.getElementById('v74LoanRemainingCount').value=l.remainingCount??'';document.getElementById('v74LoanPaidCount').value=l.paidCount||0;document.getElementById('v74LoanDueDay').value=l.dueDay||1;document.getElementById('v74LoanNextDue').value=l.nextDueDate||fmt(par(todayJ()).jy,par(todayJ()).jm,1);document.getElementById('v74LoanMode').value=l.installmentMode||'fixed';document.getElementById('v74LoanDefaultAmount').value=l.defaultAmount||'';document.getElementById('v74LoanEndDate').value=l.endDate||'';document.getElementById('v74LoanNote').value=l.note||'';document.getElementById('v74GenerateOnSave').checked=!l.id;const del=document.getElementById('v74DeleteLoan');del.classList.toggle('hide',!l.id);del.onclick=()=>v74DeleteLoan(l.id);document.getElementById('v74LoanDialog').showModal();
}
window.v74OpenLoan=v74OpenLoan;
function v74SaveLoan(){
  const id=document.getElementById('v74LoanId').value,title=document.getElementById('v74LoanTitle').value.trim(),balance=v74Num(document.getElementById('v74LoanBalance').value),remaining=Math.max(0,v74Num(document.getElementById('v74LoanRemainingCount').value)),next=jDate(document.getElementById('v74LoanNextDue').value);if(!title||balance<0||!next)return alert('عنوان، مانده بدهی و اولین سررسید معتبر وارد کن.');
  const old=v74Loan(id),now=v74Now(),total=Math.max(0,v74Num(document.getElementById('v74LoanTotalCount').value)),paid=Math.max(0,v74Num(document.getElementById('v74LoanPaidCount').value));
  const row={id:id||v74Uid('loan'),title,lender:document.getElementById('v74LoanLender').value.trim(),status:document.getElementById('v74LoanStatus').value,principal:Math.max(balance,v74Num(document.getElementById('v74LoanPrincipal').value)),balance,totalCount:total||paid+remaining,remainingCount:remaining,paidCount:paid,dueDay:Math.max(1,Math.min(31,v74Num(document.getElementById('v74LoanDueDay').value,1))),nextDueDate:next,installmentMode:document.getElementById('v74LoanMode').value,defaultAmount:Math.max(0,v74Num(document.getElementById('v74LoanDefaultAmount').value)),endDate:jDate(document.getElementById('v74LoanEndDate').value)||'',note:document.getElementById('v74LoanNote').value.trim(),createdAt:old?.createdAt||now,updatedAt:now};
  const i=S.loans.findIndex(x=>x.id===row.id);i>=0?S.loans[i]=row:S.loans.unshift(row);if(document.getElementById('v74GenerateOnSave').checked)v74GenerateInstallments(row.id,false);save();v74Close('v74LoanDialog');render();
}
function v74DeleteLoan(id){const linked=v74LoanInstallments(id);if(linked.some(i=>i.status==='paid'))return alert('وامی که قسط پرداخت‌شده دارد حذف نمی‌شود؛ آن را تسویه‌شده یا متوقف کن.');if(!confirm('وام و اقساط پرداخت‌نشده آن حذف شوند؟'))return;linked.forEach(i=>v7MarkDeleted?.('installments',i.id));v7MarkDeleted?.('loans',id);S.installments=S.installments.filter(x=>x.loanId!==id);S.loans=S.loans.filter(x=>x.id!==id);save();v74Close('v74LoanDialog');render()}
function v74GenerateInstallments(loanId,notify=true){
  const l=v74Loan(loanId);if(!l)return;const count=Math.max(0,l.remainingCount);if(!count)return notify&&alert('تعداد اقساط باقی‌مانده صفر است.');let date=l.nextDueDate||todayJ(),made=0;
  for(let n=0;n<count;n++){
    const p=par(date),due=fmt(p.jy,p.jm,Math.min(l.dueDay||p.jd,ml(p.jy,p.jm)));
    if(!S.installments.some(i=>i.loanId===loanId&&i.dueDate===due)){S.installments.push({id:v74Uid('inst'),loanId,dueDate:due,amount:l.defaultAmount||0,status:'unpaid',autoGenerated:true,note:l.installmentMode==='variable'?'مبلغ این قسط را بررسی و ویرایش کن.':'',createdAt:v74Now(),updatedAt:v74Now()});made++}
    date=v74AddMonths(date,1);
  }
  l.endDate=l.endDate||v74AddMonths(l.nextDueDate,Math.max(0,count-1));l.updatedAt=v74Now();if(notify){save();render();alert(fa(made)+' قسط جدید ساخته شد.')}
}
window.v74GenerateInstallments=v74GenerateInstallments;

function v74OpenInstallment(id='',loanId=''){
  v74BuildDialogs();const x=v74Installment(id)||{};document.getElementById('v74InstallmentId').value=x.id||'';document.getElementById('v74InstallmentLoan').innerHTML=v74LoanOptions(x.loanId||loanId);document.getElementById('v74InstallmentDate').value=x.dueDate||todayJ();document.getElementById('v74InstallmentAmount').value=x.amount||'';document.getElementById('v74InstallmentStatus').value=x.status||'unpaid';document.getElementById('v74InstallmentNote').value=x.note||'';const del=document.getElementById('v74DeleteInstallment');del.classList.toggle('hide',!x.id);del.onclick=()=>v74DeleteInstallment(x.id);document.getElementById('v74InstallmentDialog').showModal();
}
window.v74OpenInstallment=v74OpenInstallment;
function v74SaveInstallment(){
  const id=document.getElementById('v74InstallmentId').value,loanId=document.getElementById('v74InstallmentLoan').value,date=jDate(document.getElementById('v74InstallmentDate').value),amount=v74Num(document.getElementById('v74InstallmentAmount').value),desired=document.getElementById('v74InstallmentStatus').value;
  if(!loanId||!date||amount<0)return alert('وام، تاریخ و مبلغ معتبر وارد کن.');
  const old=v74Installment(id);
  if(old?.status==='paid'){
    const oldLoan=v74Loan(old.loanId);if(oldLoan){oldLoan.balance=v74Num(oldLoan.balance)+v74Num(old.amount);oldLoan.remainingCount=v74Num(oldLoan.remainingCount)+1;oldLoan.paidCount=Math.max(0,v74Num(oldLoan.paidCount)-1);if(oldLoan.status==='completed')oldLoan.status='active';oldLoan.updatedAt=v74Now()}
    S.financeTransactions=S.financeTransactions.filter(t=>t.linkedInstallmentId!==old.id);
  }
  const row={id:id||v74Uid('inst'),loanId,dueDate:date,amount,status:'unpaid',autoGenerated:old?.autoGenerated||false,note:document.getElementById('v74InstallmentNote').value.trim(),createdAt:old?.createdAt||v74Now(),updatedAt:v74Now()};
  const i=S.installments.findIndex(x=>x.id===row.id);i>=0?S.installments[i]=row:S.installments.push(row);
  if(desired==='paid')v74SetInstallmentPaid(row.id,true);else{save();v74Close('v74InstallmentDialog');render()}
}
function v74DeleteInstallment(id){const x=v74Installment(id);if(!x)return;if(x.status==='paid')return alert('ابتدا وضعیت پرداخت این قسط را لغو کن.');if(!confirm('این قسط حذف شود؟'))return;v7MarkDeleted?.('installments',id);S.installments=S.installments.filter(x=>x.id!==id);save();v74Close('v74InstallmentDialog');render()}
function v74SetInstallmentPaid(id,paid){
  const x=v74Installment(id),l=v74Loan(x?.loanId);if(!x||!l)return;const was=x.status==='paid';if(was===paid){save();v74Close('v74InstallmentDialog');render();return}
  const link='installment-'+x.id;
  if(paid){x.status='paid';x.paidAt=v74Now();l.balance=Math.max(0,v74Num(l.balance)-v74Num(x.amount));l.remainingCount=Math.max(0,v74Num(l.remainingCount)-1);l.paidCount=v74Num(l.paidCount)+1;if(!S.financeTransactions.some(t=>t.linkedInstallmentId===x.id))S.financeTransactions.unshift({id:v74Uid('tx'),type:'expense',title:'پرداخت قسط '+l.title,amount:x.amount,date:todayJ(),status:'actual',source:'',category:'قسط و بدهی',note:'ثبت خودکار با تیک پرداخت قسط',linkedInstallmentId:x.id,recurrenceKey:link,createdAt:v74Now(),updatedAt:v74Now()});if(l.balance<=0||l.remainingCount<=0){l.status='completed';l.completedAt=v74Now();}}
  else{x.status='unpaid';x.paidAt='';l.balance=v74Num(l.balance)+v74Num(x.amount);l.remainingCount=v74Num(l.remainingCount)+1;l.paidCount=Math.max(0,v74Num(l.paidCount)-1);if(l.status==='completed')l.status='active';S.financeTransactions=S.financeTransactions.filter(t=>t.linkedInstallmentId!==x.id)}
  x.updatedAt=l.updatedAt=v74Now();save();v74Close('v74InstallmentDialog');render();
}
window.v74SetInstallmentPaid=v74SetInstallmentPaid;

function v74StatusBadge(status,type='tx'){
  if(type==='inst'){const late=status!=='paid';return `<span class="badge ${status==='paid'?'ok':''}">${status==='paid'?'پرداخت‌شده':'در انتظار'}</span>`}
  const map={actual:['قطعی','ok'],planned:['برنامه‌ریزی‌شده','medium'],probable:['احتمالی','low']},x=map[status]||[status,''];return `<span class="badge ${x[1]}">${x[0]}</span>`;
}
function v74ForecastCards(){return [3,30,90].map(d=>{const f=v74Forecast(d),bad=f.forecast<0;return `<article class="v74ForecastCard ${bad?'bad':''}"><span>تا ${fa(d)} روز آینده</span><b>${v74SignedMoney(f.forecast)}</b><small>درآمد ${v74Money(f.incomes)} · تعهد ${v74Money(f.obligations)}</small></article>`}).join('')}
function v74TransactionRows(){
  const f=JSON.parse(sessionStorage.v74TxFilter||'{}'),month=f.month||v74MonthKey(),type=f.type||'all',status=f.status||'all';let rows=[...S.financeTransactions].filter(t=>!month||v74MonthKey(t.date)===month);if(type!=='all')rows=rows.filter(t=>t.type===type);if(status!=='all')rows=rows.filter(t=>t.status===status);rows.sort((a,b)=>b.date.localeCompare(a.date)||String(b.updatedAt).localeCompare(String(a.updatedAt)));
  return{rows,filter:{month,type,status}};
}
function v74TransactionsHtml(rows){if(!rows.length)return '<div class="empty">تراکنشی در این بازه ثبت نشده است.</div>';return `<div class="v74TxList">${rows.map(t=>`<button ${t.linkedInstallmentId?'disabled':''} onclick="v74OpenTransaction('${t.type}','${t.id}')"><span class="v74TxIcon ${t.type}">${t.type==='income'?'↑':'↓'}</span><div><b>${esc(t.title)}</b><small>${fa(t.date)} · ${esc(t.type==='income'?t.source:t.category)}</small></div><div class="v74TxAmount ${t.type}">${t.type==='income'?'+':'−'} ${v74Money(t.amount)}${v74StatusBadge(t.status)}</div></button>`).join('')}</div>`}
function v74BudgetsHtml(month){const rows=S.financeBudgets.filter(b=>b.month===month);if(!rows.length)return '<div class="empty">برای این ماه بودجه‌ای تعریف نشده است.</div>';return `<div class="v74BudgetGrid">${rows.map(b=>{const spent=v74BudgetSpent(b),p=b.limit?Math.round(spent/b.limit*100):0;return `<button onclick="v74OpenBudget('${b.id}')" class="${p>100?'over':''}"><div><b>${esc(b.category)}</b><span>${v74Money(spent)} از ${v74Money(b.limit)}</span></div><div class="bar"><i style="width:${Math.min(100,p)}%"></i></div><small>${fa(p)}٪ مصرف</small></button>`}).join('')}</div>`}
function v74AllocationsHtml(){const rows=[...S.financeAllocations].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,10);if(!rows.length)return '<div class="empty">هنوز پس‌انداز یا سرمایه‌گذاری ثبت نشده است.</div>';return `<div class="v74AllocationList">${rows.map(a=>`<button onclick="v74OpenAllocation('${a.kind}','${a.id}')"><span>${a.kind==='saving'?'💰':'📈'}</span><div><b>${esc(a.title)}</b><small>${fa(a.date)} · ${v74Label(V74_ALLOCATION_TYPES,a.kind)}</small></div><strong>${v74Money(a.amount)}</strong></button>`).join('')}</div>`}

function v74FinanceView(){
  v74EnsureState();const month=v74MonthKey(),income=v74MonthActual(month,'income'),expense=v74MonthActual(month,'expense'),tx=v74TransactionRows();
  document.getElementById('app').innerHTML=`
  <section class="card v74FinanceHero"><div><small>مدیریت مالی شخصی</small><h3>${v74SignedMoney(v74CashBalance())}</h3><p>موجودی نقدی فعلی؛ تمام ورودی‌ها با منبع درآمد مشخص ثبت می‌شوند.</p></div><div><button onclick="v74OpenFinanceSettings()">تنظیمات</button><button onclick="v74OpenTransaction('expense')">− هزینه</button><button onclick="v74OpenTransaction('income')" class="primary">+ درآمد</button></div></section>
  <section class="v74MoneyKpis"><article><span>درآمد این ماه</span><b class="good">${v74Money(income)}</b><small>${v74MonthName(month)}</small></article><article><span>هزینه این ماه</span><b class="bad">${v74Money(expense)}</b><small>بدون اقساط آینده</small></article><article><span>پس‌انداز</span><b>${v74Money(v74AllocationTotal('saving'))}</b><small>تخصیص قطعی</small></article><article><span>سرمایه‌گذاری</span><b>${v74Money(v74AllocationTotal('investment'))}</b><small>تخصیص قطعی</small></article><article><span>خالص دارایی</span><b class="${v74NetWorth()<0?'bad':'good'}">${v74SignedMoney(v74NetWorth())}</b><small>نقد + تخصیص‌ها − بدهی</small></article></section>
  <section class="v74ForecastGrid">${v74ForecastCards()}</section>
  <section class="grid dash"><div class="card c7"><div class="v74SectionHead"><div><h3>پیش‌بینی جریان نقدی ۹۰ روزه</h3><p class="muted">براساس درآمدهای آینده، هزینه‌ها، اقساط و تخصیص‌های ثبت‌شده</p></div></div><canvas id="v74CashflowChart" class="v74CashflowChart"></canvas></div><div class="card c5"><div class="v74SectionHead"><h3>منابع درآمد این ماه</h3></div><div id="v74IncomeSources"></div></div></section>
  <section class="card"><div class="v74SectionHead"><div><h3>تراکنش‌ها</h3><p class="muted">درآمد و هزینه قطعی، برنامه‌ریزی‌شده و احتمالی</p></div><div><button onclick="v74OpenTransaction('expense')">هزینه</button><button onclick="v74OpenTransaction('income')" class="primary">درآمد</button></div></div><div class="toolbar"><label>ماه<input id="v74TxMonth" value="${tx.filter.month}"></label><label>نوع<select id="v74TxType"><option value="all">همه</option><option value="income" ${tx.filter.type==='income'?'selected':''}>درآمد</option><option value="expense" ${tx.filter.type==='expense'?'selected':''}>هزینه</option></select></label><label>وضعیت<select id="v74TxStatus"><option value="all">همه</option>${V74_TX_STATUSES.map(([v,l])=>`<option value="${v}" ${tx.filter.status===v?'selected':''}>${l}</option>`).join('')}</select></label><button id="v74ApplyTx">اعمال</button></div>${v74TransactionsHtml(tx.rows)}</section>
  <section class="grid dash"><div class="card c7"><div class="v74SectionHead"><div><h3>بودجه‌های ${v74MonthName(month)}</h3><p class="muted">کنترل سقف هزینه هر دسته</p></div><button onclick="v74OpenBudget()">+ بودجه</button></div>${v74BudgetsHtml(month)}</div><div class="card c5"><div class="v74SectionHead"><div><h3>پس‌انداز و سرمایه‌گذاری</h3><p class="muted">تخصیص از موجودی کلی</p></div><div><button onclick="v74OpenAllocation('saving')">پس‌انداز</button><button onclick="v74OpenAllocation('investment')">سرمایه‌گذاری</button></div></div>${v74AllocationsHtml()}</div></section>
  <section class="card v74PrintBar"><div><h3>گزارش مالی شخصی</h3><p class="muted">خلاصه موجودی، جریان نقدی، بودجه‌ها، بدهی‌ها و اقساط</p></div><button onclick="v74PrintFinance()">خروجی PDF مالی</button></section>`;
  document.getElementById('v74ApplyTx').onclick=()=>{sessionStorage.v74TxFilter=JSON.stringify({month:document.getElementById('v74TxMonth').value.trim(),type:document.getElementById('v74TxType').value,status:document.getElementById('v74TxStatus').value});render()};
  requestAnimationFrame(()=>{v74DrawCashflow(document.getElementById('v74CashflowChart'));v74RenderIncomeSources(document.getElementById('v74IncomeSources'),month)});
}

function v74RenderIncomeSources(el,month){const map={};S.financeTransactions.filter(t=>t.type==='income'&&t.status==='actual'&&v74MonthKey(t.date)===month).forEach(t=>map[t.source||'سایر']=(map[t.source||'سایر']||0)+v74Num(t.amount));const rows=Object.entries(map).sort((a,b)=>b[1]-a[1]);el.innerHTML=rows.length?`<div class="v74SourceList">${rows.map(([k,v])=>`<div><span>${esc(k)}</span><b>${v74Money(v)}</b></div>`).join('')}</div>`:'<div class="empty">درآمد قطعی این ماه ثبت نشده است.</div>'}
function v74CashflowPoints(days=90){let balance=v74CashBalance(),out=[];for(let n=0;n<=days;n++){const d=addDays(todayJ(),n);S.financeTransactions.filter(t=>t.date===d&&t.status!=='actual'&&(t.status==='planned'||(S.financeSettings.includeProbableInForecast!==false&&t.status==='probable'))).forEach(t=>balance+=t.type==='income'?v74Num(t.amount):-v74Num(t.amount));S.installments.filter(i=>i.dueDate===d&&i.status!=='paid').forEach(i=>balance-=v74Num(i.amount));S.financeAllocations.filter(a=>a.date===d&&a.status!=='actual').forEach(a=>balance-=v74Num(a.amount));if(n===0||n===days||n%7===0)out.push({date:d,value:balance})}return out}
function v74DrawCashflow(canvas){if(!canvas)return;const pts=v74CashflowPoints(90),b=canvas.getBoundingClientRect(),r=devicePixelRatio||1,w=Math.max(360,b.width),h=300;canvas.width=w*r;canvas.height=h*r;const x=canvas.getContext('2d');x.setTransform(r,0,0,r,0,0);x.clearRect(0,0,w,h);x.fillStyle='#fbfefb';x.fillRect(0,0,w,h);const values=pts.map(p=>p.value),min=Math.min(0,...values),max=Math.max(1,...values),range=max-min||1,pad=44,cw=w-pad*2,ch=h-75;for(let i=0;i<5;i++){const y=pad+ch*i/4;x.strokeStyle='#e1ebe0';x.beginPath();x.moveTo(pad,y);x.lineTo(w-pad,y);x.stroke()}const yFor=v=>pad+(max-v)/range*ch;if(min<0&&max>0){x.strokeStyle='#d85c5c';x.setLineDash([5,5]);x.beginPath();x.moveTo(pad,yFor(0));x.lineTo(w-pad,yFor(0));x.stroke();x.setLineDash([])}x.beginPath();pts.forEach((p,i)=>{const xx=pad+(cw/(pts.length-1||1))*i,yy=yFor(p.value);i?x.lineTo(xx,yy):x.moveTo(xx,yy)});x.strokeStyle='#2f7a43';x.lineWidth=3;x.stroke();pts.forEach((p,i)=>{if(i%2&&i!==pts.length-1)return;const xx=pad+(cw/(pts.length-1||1))*i,yy=yFor(p.value);x.fillStyle=p.value<0?'#d85c5c':'#2f7a43';x.beginPath();x.arc(xx,yy,4,0,Math.PI*2);x.fill();x.font='10px Vazirmatn';x.textAlign='center';x.fillStyle='#657468';x.fillText(fa(p.date.slice(5)),xx,h-20)});x.font='11px Vazirmatn';x.textAlign='right';x.fillStyle='#657468';x.fillText(v74SignedMoney(max),w-pad,pad-10);x.fillText(v74SignedMoney(min),w-pad,h-42)}

function v74LoanCards(){const rows=[...S.loans].sort((a,b)=>({active:0,paused:1,completed:2}[a.status]??9)-({active:0,paused:1,completed:2}[b.status]??9));if(!rows.length)return '<div class="empty">هنوز وامی ثبت نشده است.</div>';return `<div class="v74LoanGrid">${rows.map(l=>{const p=v74LoanProgress(l),next=v74LoanInstallments(l.id).find(i=>i.status!=='paid');return `<article class="v74LoanCard ${l.status}"><div class="v74LoanTop"><div><span>${esc(l.lender||'وام / بدهی')}</span><h3>${esc(l.title)}</h3></div><button onclick="v74OpenLoan('${l.id}')">ویرایش</button></div><div class="v74LoanMoney"><b>${v74Money(l.balance)}</b><small>مانده از ${v74Money(l.principal)}</small></div><div class="bar"><i style="width:${p}%"></i></div><div class="v74LoanMeta"><span>پیشرفت ${fa(Math.round(p))}٪</span><span>${fa(l.remainingCount)} قسط مانده</span><span>سررسید بعدی ${fa(next?.dueDate||'—')}</span></div><div class="v74LoanActions"><button onclick="v74OpenInstallment('','${l.id}')">+ قسط دستی</button><button onclick="v74GenerateInstallments('${l.id}')">تولید اقساط</button></div>${l.status==='completed'?'<div class="v74InvestmentSuggestion">قسط آزادشده را به سرمایه‌گذاری منتقل کن.</div>':''}</article>`}).join('')}</div>`}
function v74InstallmentsTable(){const f=JSON.parse(sessionStorage.v74InstFilter||'{}'),loan=f.loan||'all',status=f.status||'unpaid';let rows=[...S.installments];if(loan!=='all')rows=rows.filter(i=>i.loanId===loan);if(status!=='all')rows=rows.filter(i=>i.status===status);rows.sort((a,b)=>a.dueDate.localeCompare(b.dueDate));if(!rows.length)return '<div class="empty">قسطی با این فیلتر وجود ندارد.</div>';return `<div class="tableWrap"><table class="v74InstallmentTable"><thead><tr><th>پرداخت</th><th>سررسید</th><th>وام</th><th>مبلغ</th><th>وضعیت</th><th>عملیات</th></tr></thead><tbody>${rows.map(i=>{const l=v74Loan(i.loanId),over=i.status!=='paid'&&i.dueDate<todayJ();return `<tr class="${over?'overdue':''}"><td><input type="checkbox" ${i.status==='paid'?'checked':''} onchange="v74SetInstallmentPaid('${i.id}',this.checked)"></td><td>${fa(i.dueDate)}</td><td>${esc(l?.title||'وام حذف‌شده')}</td><td>${v74Money(i.amount)}</td><td>${i.status==='paid'?'<span class="badge ok">پرداخت‌شده</span>':over?'<span class="badge late">عقب‌افتاده</span>':'<span class="badge medium">در انتظار</span>'}</td><td><button onclick="v74OpenInstallment('${i.id}')">ویرایش</button></td></tr>`}).join('')}</tbody></table></div>`}
function v74LoansView(){
  v74EnsureState();const next=v74NextInstallment(),active=S.loans.filter(l=>l.status==='active').length,f3=v74Forecast(3),f30=v74Forecast(30),f90=v74Forecast(90),flt=JSON.parse(sessionStorage.v74InstFilter||'{}');
  document.getElementById('app').innerHTML=`<section class="card v74FinanceHero"><div><small>وام‌ها و اقساط</small><h3>${v74Money(v74DebtBalance())}</h3><p>مانده کل بدهی؛ پرداخت هر قسط فقط با یک تیک ثبت می‌شود.</p></div><div><button onclick="v74OpenInstallment()">+ قسط دستی</button><button onclick="v74OpenLoan()" class="primary">+ وام جدید</button></div></section>
  <section class="v74MoneyKpis"><article><span>وام فعال</span><b>${fa(active)}</b><small>از ${fa(S.loans.length)} وام</small></article><article><span>قسط بعدی</span><b>${next?v74Money(next.amount):'—'}</b><small>${next?fa(next.dueDate):'ثبت نشده'}</small></article><article><span>تعهد ۳ روز</span><b>${v74Money(f3.installments)}</b><small>فقط اقساط</small></article><article><span>تعهد ۳۰ روز</span><b>${v74Money(f30.installments)}</b><small>فقط اقساط</small></article><article><span>تعهد ۹۰ روز</span><b>${v74Money(f90.installments)}</b><small>فقط اقساط</small></article></section>
  <section class="card"><div class="v74SectionHead"><div><h3>پرونده وام‌ها</h3><p class="muted">مانده بدهی، تعداد اقساط و تاریخ سررسید</p></div></div>${v74LoanCards()}</section>
  <section class="card"><div class="v74SectionHead"><div><h3>تقویم اقساط</h3><p class="muted">برای ثبت پرداخت، تیک ستون اول را بزن.</p></div><button onclick="v74OpenInstallment()">+ قسط</button></div><div class="toolbar"><label>وام<select id="v74InstLoan"><option value="all">همه وام‌ها</option>${S.loans.map(l=>`<option value="${l.id}" ${flt.loan===l.id?'selected':''}>${esc(l.title)}</option>`).join('')}</select></label><label>وضعیت<select id="v74InstStatus"><option value="all">همه</option><option value="unpaid" ${flt.status==='unpaid'?'selected':''}>در انتظار</option><option value="paid" ${flt.status==='paid'?'selected':''}>پرداخت‌شده</option></select></label><button id="v74ApplyInst">اعمال</button></div>${v74InstallmentsTable()}</section>`;
  document.getElementById('v74ApplyInst').onclick=()=>{sessionStorage.v74InstFilter=JSON.stringify({loan:document.getElementById('v74InstLoan').value,status:document.getElementById('v74InstStatus').value});render()};
}

function v74PrintFinance(){const m=v74MonthKey(),f30=v74Forecast(30),loans=S.loans.filter(l=>l.status!=='completed'),inst=S.installments.filter(i=>i.status!=='paid').sort((a,b)=>a.dueDate.localeCompare(b.dueDate)).slice(0,20);document.getElementById('printArea').innerHTML=`<h1>گزارش مالی Planner Life for Soil</h1><p>تاریخ گزارش: ${showDate(todayJ())}</p><div class="printCard"><h2>خلاصه مالی</h2><p>موجودی نقدی: ${v74Money(v74CashBalance())}</p><p>درآمد ماه: ${v74Money(v74MonthActual(m,'income'))} | هزینه ماه: ${v74Money(v74MonthActual(m,'expense'))}</p><p>پس‌انداز: ${v74Money(v74AllocationTotal('saving'))} | سرمایه‌گذاری: ${v74Money(v74AllocationTotal('investment'))}</p><p>مانده بدهی: ${v74Money(v74DebtBalance())} | خالص دارایی: ${v74SignedMoney(v74NetWorth())}</p></div><div class="printCard"><h2>پیش‌بینی ۳۰ روزه</h2><p>درآمد آینده: ${v74Money(f30.incomes)} | تعهدات: ${v74Money(f30.obligations)} | مانده پیش‌بینی‌شده: ${v74SignedMoney(f30.forecast)}</p></div><div class="printCard"><h2>وام‌های فعال</h2><table><thead><tr><th>عنوان</th><th>مانده</th><th>قسط مانده</th><th>پایان</th></tr></thead><tbody>${loans.map(l=>`<tr><td>${esc(l.title)}</td><td>${v74Money(l.balance)}</td><td>${fa(l.remainingCount)}</td><td>${fa(l.endDate||'—')}</td></tr>`).join('')}</tbody></table></div><div class="printCard"><h2>اقساط آینده</h2><table><thead><tr><th>تاریخ</th><th>وام</th><th>مبلغ</th></tr></thead><tbody>${inst.map(i=>`<tr><td>${fa(i.dueDate)}</td><td>${esc(v74Loan(i.loanId)?.title||'—')}</td><td>${v74Money(i.amount)}</td></tr>`).join('')}</tbody></table></div>`;window.print()}
window.v74PrintFinance=v74PrintFinance;

// ===== هشدارهای مالی و ارتقای داشبورد =====
const v74AlertsBase=v73Alerts;
v73Alerts=function(){const out=v74AlertsBase();const tomorrow=addDays(todayJ(),1);S.installments.filter(i=>i.status!=='paid'&&i.dueDate<todayJ()).slice(0,4).forEach(i=>out.push({level:'red',title:'قسط عقب‌افتاده',detail:`${v74Loan(i.loanId)?.title||'وام'} — ${v74Money(i.amount)}`,view:'loansV7'}));if(v74Forecast(30).forecast<0)out.push({level:'red',title:'کسری نقدینگی ۳۰ روزه',detail:v74SignedMoney(v74Forecast(30).forecast),view:'financeV7'});S.installments.filter(i=>i.status!=='paid'&&i.dueDate===tomorrow).forEach(i=>out.push({level:'yellow',title:'قسط فردا',detail:`${v74Loan(i.loanId)?.title||'وام'} — ${v74Money(i.amount)}`,view:'loansV7'}));const rank={red:0,yellow:1,green:2};return out.sort((a,b)=>rank[a.level]-rank[b.level]).slice(0,12)};
window.v73Alerts=v73Alerts;
const v74DashboardBase=v73Dashboard;
v73Dashboard=function(){v74DashboardBase();const grid=document.querySelector('.v73KpiGrid'),last=grid?.lastElementChild,f=v74Forecast(30);if(last){last.className=f.forecast<0?'danger':'';last.innerHTML=`${v73Ring(f.forecast<0?0:Math.min(100,50+f.forecast/Math.max(1,Math.abs(v74CashBalance()))*50),'مالی')}<div><span>مانده ۳۰ روز آینده</span><b>${v74SignedMoney(f.forecast)}</b><small>${f.forecast<0?'کسری احتمالی':'جریان نقدی مثبت'}</small></div>`}const alerts=document.querySelector('[data-card="alerts"] .v73AlertList');if(alerts){} };
window.v73Dashboard=v73Dashboard;dash=v73Dashboard;window.dash=dash;

// ===== گزارش‌ها، منو و رندر =====
const v74ReportsBase=v73ReportsView;
v73ReportsView=function(){v74ReportsBase();document.getElementById('app')?.insertAdjacentHTML('beforeend',`<section class="card v74PrintBar"><div><h3>گزارش مالی</h3><p class="muted">موجودی، درآمد و هزینه، بودجه، وام و اقساط آینده</p></div><button onclick="v74PrintFinance()">گزارش مالی PDF</button></section>`)};

C.nav=[
  ['dashboard','📊','داشبورد','مرکز فرماندهی زندگی'],['inbox','📥','Inbox','ورودی‌ها / Inbox'],
  ['daily','☀️','روزانه','برنامه روزانه'],['weekly','🗓️','هفتگی','برنامه هفتگی'],['monthly','📅','ماهانه','برنامه ماهانه'],
  ['goalsV7','🎯','اهداف حرفه‌ای','اهداف حرفه‌ای و تمرکز ۹۰روزه'],['projectsV7','🧩','پروژه‌ها','پروژه‌های متصل به اهداف'],
  ['systemsV7','⚙️','سیستم‌ها','سیستم‌ساز شخصی'],['wheelV7','🧭','چرخ زندگی','چرخ زندگی و امتیاز LEVEL UP'],
  ['financeV7','💳','مدیریت مالی','درآمد، هزینه، بودجه و جریان نقدی'],['loansV7','🏦','وام و اقساط','وام‌ها، بدهی‌ها و تقویم اقساط'],
  ['reviewsV7','📝','مرورها','مرور روزانه و هفتگی'],['reportsV7','📄','گزارش‌ها','گزارش‌های شخصی، پروژه‌ای و مالی'],
  ['habits','🟩','عادت‌ها','Habit Tracker'],['yearly','🗺️','سالانه','برنامه سالانه'],['goals','📦','اهداف قبلی','اهداف نسخه قبلی'],['tasks','✅','کارها','مدیریت کارها و جست‌وجو']
];
function v74Navigate(name){view=name;const item=C.nav.find(n=>n[0]===name);if(item)document.getElementById('pageTitle').textContent=item[3];document.getElementById('v74MoreNavDialog')?.close();buildNav();render()}
window.v74Navigate=v74Navigate;
buildNav=function(){
  const full=C.nav.map(n=>`<button class="nav ${view===n[0]?'active':''}" data-v="${n[0]}"><span>${n[1]}</span><span>${n[2]}</span></button>`).join('');
  document.getElementById('sideNav').innerHTML=full;
  const primary=['dashboard','daily','inbox','goalsV7'];
  const bottom=primary.map(k=>C.nav.find(n=>n[0]===k)).filter(Boolean).map(n=>`<button class="nav ${view===n[0]?'active':''}" data-v="${n[0]}"><span>${n[1]}</span><span>${n[2]}</span></button>`).join('')+`<button class="nav" id="v74MoreNavBtn"><span>☰</span><span>بیشتر</span></button>`;
  document.getElementById('bottomNav').innerHTML=bottom;
  document.querySelectorAll('#sideNav .nav[data-v],#bottomNav .nav[data-v]').forEach(b=>b.onclick=()=>v74Navigate(b.dataset.v));
  const more=document.getElementById('v74MoreNavBtn');if(more)more.onclick=()=>{const grid=document.getElementById('v74MoreNavGrid');if(grid)grid.innerHTML=C.nav.filter(n=>!primary.includes(n[0])).map(n=>`<button type="button" onclick="v74Navigate('${n[0]}')"><span>${n[1]}</span><b>${n[2]}</b></button>`).join('');document.getElementById('v74MoreNavDialog')?.showModal()};
};window.buildNav=buildNav;

const v74RenderBase=render;
render=function(){if(view==='financeV7'){v74FinanceView();return}if(view==='loansV7'){v74LoansView();return}return v74RenderBase()};window.render=render;

function v74Init(){
  v74EnsureState();v74BuildDialogs();
  const title=document.querySelector('title');if(title)title.textContent='Planner Life for Soil 7.6';
  const label=document.getElementById('calendarLabel');if(label)label.textContent='Planner Life for Soil 7.6 · مدیریت کامل زندگی و مالی';
  buildNav();render();
}

v74Init();
