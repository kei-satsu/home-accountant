import React, { useEffect } from 'react';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

const sections = [
  {
    title: '၁။ ကျွန်ုပ်တို့ စုဆောင်း/အသုံးပြုသည့် အချက်အလက်များ',
    paragraphs: [
      'အိမ်စရင်းသည် သင့်အိမ်ထောင်စု၏ ငွေစာရင်းကို ကိုယ်တိုင်မှတ်တမ်းတင်ရန် ပြုလုပ်ထားသော app ဖြစ်ပါသည်။ သင်ထည့်သွင်းသော အကောင့်အမည်နှင့် လက်ကျန်ငွေ၊ ဝင်ငွေ/အသုံးစရိတ်၊ ပမာဏ၊ အမျိုးအစား၊ ရက်စွဲ၊ မှတ်စုနှင့် အသံမှတ်တမ်းမှ ရရှိသော စာသားတို့ ပါဝင်နိုင်ပါသည်။',
      'Google Drive backup ကို ချိတ်ဆက်အသုံးပြုပါက Google မှ အတည်ပြုသည့် အကောင့်အမည်၊ အီးမေးလ်နှင့် ပရိုဖိုင်အချက်အလက်အချို့ကို ပြသနိုင်ပါသည်။ သင်ပေးသော Gemini API key ကို browser ၏ local storage တွင် သိမ်းဆည်းပါသည်။',
    ],
  },
  {
    title: '၂။ ဒေတာသိမ်းဆည်းရာနေရာ',
    paragraphs: [
      'သင့်စာရင်းဒေတာနှင့် ဆက်တင်များကို ပုံမှန်အားဖြင့် သင်အသုံးပြုနေသော browser/device ၏ local storage တွင် သိမ်းဆည်းပါသည်။ App သည် ဤဒေတာများကို ကျွန်ုပ်တို့၏ app server တွင် အကောင့်အဖြစ် စုဆောင်းသိမ်းဆည်းရန် မရည်ရွယ်ပါ။ Browser ဒေတာရှင်းလင်းခြင်း သို့မဟုတ် device ပျောက်ဆုံးခြင်းကြောင့် local copy ပျောက်နိုင်ပါသည်။',
      'Google Drive sync ကို သင်ကိုယ်တိုင်ချိတ်ဆက်ပါက စာရင်းဒေတာများကို Google Drive ရှိ သီးသန့် backup ဖိုင်သို့ တင်ပို့ပါသည်။ ပုံမှန်အလိုအလျောက် sync တွင် Gemini API key မပါဝင်ပါ။ Key ပါဝင်သော backup ကို Drive သို့ သိမ်းလိုပါက key ပါဝင်ကြောင်းသိရှိပြီး ကိုယ်တိုင်သိမ်းဆည်းမှုကို အတည်ပြုရပါမည်။ ထို Drive backup သည် end-to-end encrypted မဟုတ်ပါ။',
    ],
  },
  {
    title: '၃။ ပြင်ပဝန်ဆောင်မှုများနှင့် ဒေတာမျှဝေမှု',
    paragraphs: [
      'Google Drive ကို ချိတ်ဆက်သည့်အခါ Google/Firebase authentication နှင့် Google Drive API ကို အသုံးပြု၍ ဝင်ရောက်ခွင့်ပြုထားသော backup ဖိုင်ကို ရှာဖွေ၊ ဖတ်ရှု သို့မဟုတ် သိမ်းဆည်းပါသည်။ Google သည် ၎င်း၏ ကိုယ်ပိုင် privacy policy နှင့် စည်းကမ်းချက်များအတိုင်း ဒေတာကို စီမံဆောင်ရွက်ပါသည်။',
      'AI ဖြင့်စာရင်းခွဲခြမ်းစိတ်ဖြာရာတွင် သင်ရိုက်ထည့်/အသံမှရရှိသော စာသားနှင့် အကောင့်၊ အမျိုးအစားဆိုင်ရာ အချက်အလက်များကို app server သို့ ပို့ပါသည်။ Gemini ကို အသုံးပြုနိုင်သည့်အခါ စာသားနှင့် အကောင့်/အမျိုးအစား ID၊ အမည်နှင့် အမျိုးအစားတို့ကို Google Gemini သို့ ဆက်လက်ပို့ပြီး ခွဲခြမ်းစိတ်ဖြာမှုရလဒ်ကို ပြန်လည်ရယူပါသည်။ Gemini မသုံးနိုင်ပါက server ပေါ်ရှိ စည်းမျဉ်းအခြေပြု parser ဖြင့် စီမံနိုင်ပါသည်။ သင့်ကိုယ်ပိုင် API key သုံးပါက တောင်းဆိုမှုကို ဆောင်ရွက်ရန် server က ထို key ဖြင့် Gemini ကို ခေါ်ဆိုပါသည်။ App server တွင် key ကို သိမ်းဆည်းရန် မရည်ရွယ်ပါ။',
      'အသံထည့်သွင်းမှုအတွက် browser/device ၏ Speech Recognition ဝန်ဆောင်မှုကို အသုံးပြုနိုင်ပါသည်။ အသံကို မည်သို့စီမံမည်ဆိုသည်မှာ browser/device ဝန်ဆောင်မှုပေးသူ၏ စည်းကမ်းချက်ပေါ် မူတည်ပါသည်။ အသံမသုံးဘဲ စာရိုက်ထည့်နိုင်ပါသည်။',
      'App ကို လက်ခံထားသော hosting/server ဝန်ဆောင်မှုကလည်း တောင်းဆိုမှုများကို လုပ်ဆောင်ရန် လိုအပ်သည့် နည်းပညာဆိုင်ရာ အချက်အလက်များကို ကိုင်တွယ်နိုင်ပါသည်။ ထိုဝန်ဆောင်မှုများ၏ ကိုယ်ပိုင် privacy စည်းကမ်းချက်များလည်း သက်ဆိုင်နိုင်ပါသည်။',
    ],
  },
  {
    title: '၄။ ဒေတာထိန်းသိမ်းခြင်းနှင့် သင့်ရွေးချယ်မှုများ',
    paragraphs: [
      'Local storage ထဲရှိ ဒေတာကို app အတွင်းစာရင်းများကို ဖျက်ခြင်း သို့မဟုတ် browser/device ဒေတာကို ရှင်းလင်းခြင်းဖြင့် ဖယ်ရှားနိုင်ပါသည်။ Drive backup များကို သင့် Google Drive မှ ကိုယ်တိုင်ဖျက်နိုင်ပါသည်။ Google account ကို app မှ ချိတ်ဆက်မှုဖြုတ်ခြင်းသည် Drive ထဲရှိ backup ဖိုင်ကို အလိုအလျောက် မဖျက်ပါ။ Gemini API key ကို app ၏ key ဆက်တင်တွင် ဖယ်ရှားနိုင်ပြီး၊ Drive ထဲတွင် key ပါသော backup ရှိခဲ့ပါက ထိုဖိုင်ကိုလည်း သီးခြားဖျက်ပါ။',
      'AI တောင်းဆိုမှုများကို ရလဒ်ပေးရန်သာ ပို့ပါသည်။ ပြင်ပဝန်ဆောင်မှုများနှင့် hosting ပေးသူတို့၏ သိမ်းဆည်းကာလ၊ လုပ်ဆောင်ပုံများကို ကျွန်ုပ်တို့ မထိန်းချုပ်နိုင်သဖြင့် ၎င်းတို့၏ privacy policy များကိုလည်း စစ်ဆေးပါ။',
    ],
  },
  {
    title: '၅။ လုံခြုံရေးနှင့် မူဝါဒပြောင်းလဲမှု',
    paragraphs: [
      'ငွေကြေးမှတ်တမ်းများနှင့် API key များသည် အရေးကြီးနိုင်ပါသည်။ သင့်စက်ကို လုံခြုံစွာထားပါ၊ အခြားသူများဝင်ရောက်နိုင်သော browser/device တွင် key သိမ်းဆည်းခြင်းကို ရှောင်ပါ၊ Drive backup ဖိုင်ကို မျှဝေသည့်အခါ သတိပြုပါ။ အင်တာနက်မှတစ်ဆင့် သိမ်းဆည်းခြင်း သို့မဟုတ် ပို့ခြင်းသည် လုံခြုံမှုကို အပြည့်အဝ အာမခံနိုင်ခြင်း မရှိပါ။',
      'App ၏ လုပ်ဆောင်ချက်များ ပြောင်းလဲခြင်း သို့မဟုတ် လိုအပ်ချက်ရှိလာခြင်းကြောင့် ဤမူဝါဒကို ပြင်ဆင်နိုင်ပါသည်။ ပြင်ဆင်သည့်ရက်ကို ဤစာမျက်နှာတွင် ဖော်ပြပါမည်။',
    ],
  },
  {
    title: '၆။ ဆက်သွယ်ရန်',
    paragraphs: [
      'ကိုယ်ရေးအချက်အလက်ဆိုင်ရာ မေးခွန်း သို့မဟုတ် တောင်းဆိုချက်များအတွက် app ကို ရရှိခဲ့သော ဝက်ဘ်ဆိုက် သို့မဟုတ် ဖြန့်ချိသူ၏ ဆက်သွယ်ရန်လမ်းကြောင်းမှတစ်ဆင့် app တာဝန်ရှိသူထံ ဆက်သွယ်ပါ။',
    ],
  },
];

export const PrivacyPolicy: React.FC = () => {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'ကိုယ်ရေးအချက်အလက် မူဝါဒ | အိမ်စရင်း';
    return () => {
      document.title = previousTitle;
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 text-slate-800 dark:bg-slate-950 dark:text-slate-200 sm:px-6 sm:py-12">
      <main className="mx-auto max-w-3xl">
        <a
          href="/"
          className="inline-flex items-center gap-2 rounded-lg text-sm font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300"
        >
          <ArrowLeft className="h-4 w-4" />
          အိမ်စရင်းသို့ ပြန်သွားရန်
        </a>

        <article className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-9">
          <header className="border-b border-slate-200 pb-6 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                <ShieldCheck className="h-6 w-6" />
              </span>
              <div>
                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">အိမ်စရင်း</p>
                <h1 className="text-2xl font-black text-slate-950 dark:text-white sm:text-3xl">
                  ကိုယ်ရေးအချက်အလက် မူဝါဒ
                </h1>
              </div>
            </div>
            <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-400">
              နောက်ဆုံးပြင်ဆင်သည့်ရက် — ၂၀၂၆ ခုနှစ်၊ နိုဝင်ဘာလ ၁၁ ရက်
            </p>
            <p className="mt-3 text-sm leading-7 text-slate-700 dark:text-slate-300">
              ဤမူဝါဒတွင် အိမ်စရင်း (Myanmar Home Ledger) ကို အသုံးပြုသည့်အခါ
              အချက်အလက်များကို မည်သို့သိမ်းဆည်း၊ အသုံးပြု၊ မျှဝေသည်ကို ရှင်းပြထားပါသည်။
              Drive နှင့် AI လုပ်ဆောင်ချက်များသည် သင်ရွေးချယ်အသုံးပြုမှသာ လုပ်ဆောင်ပါသည်။
            </p>
          </header>

          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {sections.map((section) => (
              <section key={section.title} className="space-y-3 py-6 first:pt-6 last:pb-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  {section.title}
                </h2>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph} className="text-sm leading-7 text-slate-600 dark:text-slate-400">
                    {paragraph}
                  </p>
                ))}
              </section>
            ))}
          </div>
        </article>
        <p className="py-6 text-center text-xs text-slate-500 dark:text-slate-500">
          အိမ်စရင်း (Myanmar Home Ledger)
        </p>
      </main>
    </div>
  );
};
