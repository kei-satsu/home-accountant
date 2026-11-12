import React, {
  cloneElement,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

export type AppLanguage = 'my' | 'en';

const LANGUAGE_STORAGE_KEY = 'home-accountant-language';

const translations: Record<string, string> = {
  'ယခုလ ဝင်ငွေ': 'Income this month',
  'ယခုလ အသုံးစရိတ်': 'Expenses this month',
  'စုစုပေါင်း လက်ကျန်ငွေ': 'Total balance',
  'လက်ကျန်ငွေ': 'Balance',
  'အကောင့်': 'account',
  'အကောင့်ခွဲများ': 'Accounts',
  'အကောင့်ခွဲများ စီမံခန့်ခွဲခြင်း': 'Manage accounts',
  'အကောင့်ပြင်မည်': 'Manage accounts',
  'အကောင့် ပြင်ဆင်မည်': 'Edit account',
  'အကောင့် အမည်:': 'Account name:',
  'အကောင့် မရှိသေးပါ': 'No accounts yet',
  'အကောင့် ရွေးချယ်ပါ': 'Select an account',
  'လွှဲရန် အခြားအကောင့် ထည့်ပါ': 'Add another account to transfer',
  'အကောင့်တစ်ခုစီတွင် လက်ရှိကျန်ရှိနေသော ငွေပမာဏ နှိုင်းယှဉ်ချက်': 'Balance by account',
  'အကောင့်ထည့်ပြီးနောက် လက်ကျန်ငွေကို ဤနေရာတွင် ကြည့်နိုင်ပါသည်': 'Add an account to see its balance here.',
  'အကောင့်များ': 'Accounts',
  'အရေးပေါ်': 'Emergency',
  'အိမ်': 'Home',
  'ကား/ခရီး': 'Transport',
  'ကျောင်း': 'Education',
  'ကျောင်းစရိတ်ထဲက ကလေးစာအုပ် ၃သောင်းဖိုး ဝယ်တယ်': 'Bought 30,000 Ks of books from the school budget.',
  'ငွေပမာဏ (ကျပ်)': 'Amount (MMK)',
  'ငွေပမာဏ (Amount MMK)': 'Amount (MMK)',
  'ငွေပမာဏ ၁၀၀၀ ကျပ် တိုးရန်': 'Increase amount by MMK 1,000',
  'ငွေပမာဏ ၁၀၀၀ ကျပ် လျှော့ရန်': 'Decrease amount by MMK 1,000',
  'ပမာဏ ရှင်းရန်': 'Clear amount',
  'ငွေလွှဲ': 'Transfer',
  'ငွေလွှဲမည်': 'Transfer',
  'ငွေလွှဲ (အကောင့်ချင်း)': 'Transfer between accounts',
  'ငွေစာရင်းစတင်ရန် သင့်ဘဏ်၊ ပိုက်ဆံအိတ် သို့မဟုတ် အခြားအကောင့်ကို ထည့်ပါ။': 'Add a bank, wallet, or another account to get started.',
  'ငွေစာရင်းတွေကို ကိုယ်တိုင်ထည့်သွင်းပြီး အောက်ပါအဆင့်တွေအတိုင်း စတင်နိုင်ပါတယ်။': 'Add your own records and follow these steps to get started.',
  'ကျန်းမာရေး': 'Health',
  'ကျေးဇူးပြု၍ အကောင့် ရွေးချယ်ပါ': 'Please select an account.',
  'ကျေးဇူးပြု၍ အကောင့်တစ်ခု ရွေးချယ်ပေးပါ။': 'Please choose an account.',
  'ကျေးဇူးပြု၍ အသံဖြင့် ပြောပါ သို့မဟုတ် စာရိုက်ထည့်ပါ': 'Please speak or type a description.',
  'ကျေးဇူးပြု၍ မှန်ကန်သော ငွေပမာဏ ရိုက်ထည့်ပါ': 'Please enter a valid amount.',
  'နားလည်ပါပြီ (ပိတ်မည်)': 'Got it',
  'နောက်ဆုံး သိမ်းဆည်းခဲ့သည့်အချိန်:': 'Last saved:',
  'နောက်ဆုံးပြင်ဆင်သည့်ရက် — ၂၀၂၆ ခုနှစ်၊ နိုဝင်ဘာလ ၁၂ ရက်': 'Last updated: November 12, 2026',
  'နမူနာများ:': 'Examples:',
  'နေ့စဉ်': 'Daily',
  'ပမာဏ (ကျပ်):': 'Amount (MMK):',
  'ပမာဏ မမှန်ကန်ပါ။ ကျေးဇူးပြု၍ ပြန်လည်စစ်ဆေးပါ။': 'Invalid amount. Please check it and try again.',
  'ပင်မ': 'Home',
  'ပထမဆုံးအကောင့် ဖွင့်မည်': 'Create your first account',
  'ပထမဆုံးစာရင်း မှတ်ပါ': 'Add your first transaction',
  'ပုံမှန်နှင့် အခြားဝင်ငွေ': 'Regular and other income',
  'ပိုက်ဆံအိတ်': 'Wallet',
  'ဖျက်မည်': 'Delete',
  'ဖျက်ပစ်မည်': 'Delete',
  'ဖေဖော်ဝါရီ': 'February',
  'မလုပ်တော့ပါ': 'Cancel',
  'မလုပ်ဆောင်ပါ': 'Cancel',
  'မတ်': 'March',
  'မနက်စာ မုန့်ဟင်းခါး၊ ကလေးကျောင်းစရိတ်...': 'Breakfast, school expenses, etc.',
  'မိုက်ခရိုဖုန်း အသုံးပြုခွင့် ပေးထားရန် လိုအပ်ပါသည်။': 'Microphone access is required.',
  'မူရင်းအကောင့်နှင့် လွှဲမည့်အကောင့် မတူညီရပါ': 'The source and destination accounts must be different.',
  'မေ': 'May',
  'မြန်မာဂဏန်း သုံးနေပါသည်': 'Myanmar numerals are on',
  'မြန်မာဂဏန်း သုံးမည်': 'Use Myanmar numerals',
  'ယခုလအတွက် စာရင်းအချက်အလက် မရှိသေးပါ': 'No transactions for this month yet.',
  'ယခုလအတွက် အသုံးစရိတ် မှတ်တမ်းမရှိသေးပါ': 'No expenses recorded this month yet.',
  'ရက်စွဲ': 'Date',
  'ရက်စွဲ:': 'Date:',
  'ရက်စွဲအလိုက် အသုံးစရိတ်': 'Expenses by day',
  'လက်ကျန်:': 'Balance:',
  'လက်ကျန်ငွေ သတ်မှတ်ရန် →': 'Set opening balance →',
  'လက်ငင်းငွေ / ပိုက်ဆံအိတ်': 'Cash / Wallet',
  'လစာ ၁၀ သိန်း KBZPay ထဲ ဝင်တယ်': 'Received a salary of 1,000,000 Ks in KBZPay.',
  'လစာ/ဝင်ငွေ': 'Salary / Income',
  'လလယ် (၁၅ ရက်)': 'Mid-month (15th)',
  'လကုန် ({dailyData.length} ရက်)': 'End of month ({dailyData.length} days)',
  'လွှဲလက်ခံမည့် အကောင့်:': 'Destination account:',
  'လွှဲပြောင်းလက်ခံမည့် အကောင့် ရွေးချယ်ပါ': 'Please select a destination account.',
  'လွှဲထုတ်မည့် အကောင့်:': 'From account:',
  'ဝင်ငွေ': 'Income',
  'ဝင်ငွေ (အဝင်)': 'Income (inflow)',
  'ဝင်ငွေ အမျိုးအစားများ': 'Income categories',
  'ဝင်ငွေ၊ အသုံးစရိတ်နဲ့ လက်ကျန်ငွေကို တစ်နေရာတည်းမှာ အလွယ်တကူ ကြည့်ရှုနိုင်ပါတယ်။': 'Easily view your income, expenses, and balance in one place.',
  'ဝင်ငွေ၊ အသုံးစရိတ်': 'Income and expenses',
  'ဝင်မည့် အကောင့်:': 'Deposit into account:',
  'ဝင်ရောက်နေပါသည်...': 'Signing in...',
  'ဝင်ရောက်ခြင်း မအောင်မြင်ပါ။ ကျေးဇူးပြု၍ ပြန်လည်စမ်းသပ်ကြည့်ပါ။': 'Sign-in failed. Please try again.',
  'သတိပြုရန် - Google Drive မချိတ်ဆက်ရသေးပါ': 'Google Drive is not connected',
  'သတိပြုရန် - Google Drive မချိတ်ထားပါက ဒေတာများ ပျောက်ဆုံးနိုင်ပါသည်': 'Warning: Your data could be lost if Google Drive is not connected.',
  'သတိပြုရန်: လက်ရှိ အချက်အလက်များကို အစားထိုးမလား?': 'Replace your current data?',
  'သိမ်းဆည်းနေပါသည်...': 'Saving...',
  'သိမ်းဆည်းပြီးပါပြီ': 'Saved',
  'သိမ်းဆည်းခြင်း': 'Backup',
  'သိမ်းမည်': 'Save',
  'သိမ်းဆည်းပါ': 'Save',
  'သိမ်းဆည်းရန်': 'Save',
  'သိမ်းဆည်းမည်': 'Save',
  'သိမ်းထားပြီးဖြစ်သည်': 'Saved',
  'သုံးသပ်ချက်': 'Insights',
  'သေချာပါသည်၊ ပြန်လည်ရယူမည်': 'Yes, restore',
  'သုံးစွဲမည်': 'Use',
  'အတည်ပြုပြီး စာရင်းသွင်းမည်': 'Confirm and add transaction',
  'အတည်ပြုပါ': 'Confirm',
  'အထွေထွေ': 'General',
  'အထွက်စရိတ်': 'Expense',
  'အထွက်': 'Expense',
  'အထွက်ငွေ': 'Expense',
  'အဝင်ငွေ': 'Income',
  'အဝင်': 'Income',
  'အရောင် ရွေးချယ်ပါ:': 'Choose a color:',
  'အိုင်ကွန် ရွေးချယ်ပါ:': 'Choose an icon:',
  'အရေးပေါ် ရန်ပုံငွေ': 'Emergency fund',
  'အကောင့်ချင်း ငွေလွှဲခြင်း': 'Transfer between accounts',
  'အကောင့်ချင်းငွေလွှဲ': 'Account transfer',
  'အကောင့်အမျိုးအစား': 'Account type',
  'အသေးစိတ် ဖော်ပြချက်:': 'Description:',
  'အသုံးစရိတ်': 'Expense',
  'အသုံးစရိတ် (အထွက်)': 'Expense (outflow)',
  'အသုံးစရိတ် အမျိုးအစားများ': 'Expense categories',
  'အသုံးစရိတ် သုံးသပ်ချက်': 'Spending insights',
  'အသုံးစရိတ်စတင်ရန်': 'Start tracking expenses',
  'အိမ်စရိတ်၊ ကျောင်းစရိတ်၊ အရေးပေါ် စသည့် အကောင့်များ စိတ်ကြိုက်ထည့်သွင်းပြင်ဆင်ပါ': 'Create and customize accounts for household expenses, school, emergencies, and more.',
  'အိမ်စရိတ်ထဲက ဈေးဖိုး ၂သောင်းဖိုး ဝယ်လိုက်တယ်': 'Spent 20,000 Ks on groceries from the household budget.',
  'အိမ်စရိတ်': 'Household expenses',
  'အိုကေ': 'OK',
  'အခြေအနေ:': 'Status:',
  'အမျိုးအစား': 'Category',
  'အမျိုးအစား (Category) ရွေးချယ်ပါ': 'Choose a category',
  'အမျိုးအစား (Category):': 'Category:',
  'အမျိုးအစား အားလုံး': 'All types',
  'အမျိုးအစားများ': 'Categories',
  'အမျိုးအစားအလိုက်': 'By category',
  'အကောင့် အားလုံး': 'All accounts',
  'အသုံးစရိတ် မရှိသေးပါ': 'No expenses yet',
  'အခြားဝင်ငွေ': 'Other income',
  'အကောင့်ခွဲ အသစ်ဖွင့်မည်': 'Create a new account',
  'အကောင့် အသစ်ဖွင့်မည်': 'Create a new account',
  'အကောင့်အသစ် ဖွင့်မည်': 'Create a new account',
  'စာရင်း မှတ်တမ်း': 'Transaction history',
  'စာရင်းမှတ်တမ်း': 'Transactions',
  'မှတ်တမ်း': 'Transactions',
  'စာရင်းမှတ်တမ်းများ': 'Transaction history',
  'စာရင်းသွင်း': 'Add transaction',
  'စာရင်းသွင်းရန်': 'Add transaction',
  'စာရင်းသွင်းရန် →': 'Add a transaction →',
  'စာရင်းသွင်းမည်': 'Add transaction',
  'စာရင်းအသစ်သွင်းခြင်း': 'New transaction',
  'စာရင်း အသစ်သွင်းခြင်း': 'New transaction',
  'စာရင်း သိမ်းဆည်းမည်': 'Save transaction',
  'စာရင်းသွင်းခလုတ် သို့မဟုတ် မိုက်ခရိုဖုန်းခလုတ်ကို သုံးပြီး ဝင်ငွေ၊ အသုံးစရိတ်ကို မှတ်ပါ။': 'Use Add transaction or the microphone button to record income and expenses.',
  'စာရင်းထည့်ရန်': 'Add a transaction',
  'စာရင်းသွင်းခလုတ်ဖြင့် စာရင်းထည့်သွင်းနိုင်ပါသည်': 'Use Add transaction to add a record.',
  'စာရင်းဒေတာ': 'Transaction data',
  'စာရင်းအမျိုးအစား': 'Transaction type',
  'စာရင်းအချက်အလက် မရှိသေးပါ': 'No records yet',
  'စာရင်းများ': 'Records',
  'စာရင်းမှတ်တမ်း မရှိသေးပါ': 'No transactions yet',
  'စာရင်းမှတ်တမ်း မရှိပါ': 'No transactions found',
  'စာရင်းမှတ်တမ်းများအတွက် ရှာဖွေရန်...': 'Search transactions...',
  'စာရင်းသွင်းပါ': 'Add transaction',
  'စာရင်းသိမ်းဆည်းမည်': 'Save transaction',
  'စာရင်းကို ရှာဖွေရန်...': 'Search transactions...',
  'စာရင်းထည့်သွင်းရန်': 'Add a transaction',
  'စာရင်းများကို ရှာဖွေရန်...': 'Search transactions...',
  'စာရင်းတင်မည်': 'Add transaction',
  'စာဖြင့် ရိုက်ထည့်ရန်:': 'Type a description:',
  'စာရင်းဒေတာများ အောင်မြင်စွာ ပြန်လည်ရယူပြီးပါပြီ!': 'Your transaction data has been restored.',
  'စာရင်းဒေတာများ အောင်မြင်စွာ သိမ်းဆည်းပြီးပါပြီ!': 'Your transaction data has been saved.',
  'စာရင်းထည့်သွင်းမည်': 'Add transaction',
  'စာရင်းအသစ် မှတ်ပါ': 'Add a new transaction',
  'စာရင်းမှတ်တမ်းမရှိသေးပါ': 'No transactions yet',
  'စာရင်းမှတ်တမ်း ရှာဖွေရန်...': 'Search transactions...',
  'စာရင်းသွင်းနည်း': 'How to add a transaction',
  'စာရင်းအမျိုးအစားများ': 'Transaction types',
  'စာရင်းသွင်းခြင်း': 'Add transaction',
  'စာရင်းသွင်းမည့် အကောင့်:': 'Account:',
  'စာရင်းခွဲခြမ်းစိတ်ဖြာရာတွင်': 'When analyzing transactions',
  'စာရင်းခွဲခြမ်းစိတ်ဖြာမှု': 'Transaction analysis',
  'စာရင်းမှတ်တမ်း စာရင်း': 'Transaction list',
  'စာရင်းများကို ဖျက်မည်': 'Delete records',
  'စတင်လက်ကျန်ငွေ (Initial Balance MMK):': 'Opening balance (MMK):',
  'စတင်အသုံးပြုရန် လမ်းညွှန်': 'Getting started',
  'စတင်လက်ကျန်ငွေ': 'Opening balance',
  'စတင်အသုံးပြုရန်': 'Get started',
  'စက်ပြောင်းသည့်အခါ မပျောက်စေရန် Google Drive နဲ့ ချိတ်ဆက်ပြီး သိမ်းဆည်းပါ။': 'Connect Google Drive to keep your data safe when changing devices.',
  'စုဆောင်းငွေ': 'Net savings',
  'စုစုပေါင်း:': 'Total:',
  'ဒေတာကို backup လုပ်ပါ': 'Back up your data',
  'ဒေတာများကို အစားထိုးမလား?': 'Replace your data?',
  'နေ့စွဲ (Date)': 'Date',
  'အမျိုးအစား (Type)': 'Type',
  'ခေါင်းစဉ် (Category)': 'Category',
  'မူရင်းအကောင့် (From Account)': 'From account',
  'လွှဲလက်ခံအကောင့် (To Account)': 'To account',
  'မှတ်ချက် (Note)': 'Note',
  'အထွက်စရိတ် အမျိုးအစားများ': 'Expense categories',
  'ရက်စွဲအလိုက်': 'By date',
  'အရောင်': 'Color',
  'အကောင့်အမည်': 'Account name',
  'အကောင့်များ အားလုံး': 'All accounts',
  'ရှာဖွေရန်...': 'Search...',
  'မှတ်ချက် / အကြောင်းအရာ': 'Note / Description',
  'ဖိုင်ပုံစံ မမှန်ကန်ပါ။ ကျေးဇူးပြု၍ စစ်ဆေးပါ။': 'Invalid file format. Please check the file.',
  'ဖိုင် ပြန်တင်မည်': 'Upload file',
  'ဖိုင် မရှိသေးပါ': 'No file yet',
  'Google Drive မချိတ်ဆက်ထားပါ': 'Google Drive is not connected',
  'Google Drive ချိတ်ဆက်မည်': 'Connect Google Drive',
  'Google Drive ချိတ်ဆက်ထားသည်': 'Google Drive connected',
  'Google Drive မှ ပြန်ယူမည်': 'Restore from Google Drive',
  'Google Drive သို့ သိမ်းမည်': 'Save to Google Drive',
  'Google Drive ချိတ်ဆက်ပြီးပါပြီ': 'Google Drive connected',
  'Google Drive ဖြင့် အကောင့်ဝင်ပါ': 'Sign in with Google',
  'Google account အတည်ပြုပြီး သိမ်းမည်': 'Verify Google account and save',
  'Google account ကို ပြန်အတည်ပြုပြီး Drive မှ ပြန်ယူမည်': 'Verify your Google account and restore from Drive',
  'Gemini API key မထည့်ရသေးပါ': 'Gemini API key is not set',
  'Gemini API key ထည့်ထားသည်': 'Gemini API key is set',
  'Gemini API key ဆက်တင်': 'Gemini API key settings',
  'AI ဆက်တင်': 'AI settings',
  'AI စာရင်းသွင်း': 'Add with AI',
  'AI ဖြင့် စာရင်းသွင်းမည်': 'Add with AI',
  'AI ဖြင့် ခွဲခြမ်းစိတ်ဖြာရန် အင်တာနက်ချိတ်ဆက်မှု လိုအပ်ပါသည်။': 'An internet connection is required for AI analysis.',
  'AI ခွဲခြမ်းစိတ်ဖြာမည်': 'Analyze with AI',
  'AI လက်ထောက် မေးခွန်း:': 'AI assistant question:',
  'API key ဖျောက်မည်': 'Hide API key',
  'API key ပြမည်': 'Show API key',
  'ကိုယ်ပိုင် Google AI Studio key ထည့်သွင်းရန်': 'Add your Google AI Studio key',
  'ပိတ်မည်': 'Close',
  'ပြင်ဆင်မည်': 'Edit',
  'အသံဖြင့် ပြောပါ': 'Speak',
  'မိုက်ခရိုဖုန်းကို နှိပ်၍ ပြောပါ': 'Tap the microphone and speak',
  'နားထောင်နေပါသည်...': 'Listening...',
  'AI တွင် အခက်အခဲရှိနေပါသည်။ လက်ဖြင့် စစ်ဆေးပြင်ဆင်နိုင်ပါသည်။': 'AI had a problem. You can review and edit the details manually.',
  'အလိုအလျောက် ခွဲခြမ်းစိတ်ဖြာမှု (စည်းမျဉ်းအခြေပြု) စစ်ဆေးရန်:': 'Review automatic analysis (rule-based):',
  'Gemini AI တွေ့ရှိချက် စစ်ဆေးရန်:': 'Review Gemini AI results:',
  'Gemini API key မရှိသေးပါ။ အောက်ပါရလဒ်ကို စည်းမျဉ်းအခြေပြု parser ဖြင့် ခန့်မှန်းထားသောကြောင့် မသိမ်းမီ သေချာစစ်ဆေးပါ။': 'No Gemini API key is set. The result below was estimated by a rule-based parser; please review it before saving.',
  'Gemini AI ကို အသုံးမပြုနိုင်သဖြင့် စည်းမျဉ်းအခြေပြု parser ကို သုံးထားပါသည်။ မသိမ်းမီ သေချာစစ်ဆေးပါ။': 'Gemini AI is unavailable, so a rule-based parser was used. Please review before saving.',
  'စာသားကို Gemini AI ဖြင့် ခွဲခြမ်းစိတ်ဖြာပါမည်။ API key မမှန်ခြင်း သို့မဟုတ် Gemini မရနိုင်ခြင်းရှိပါက စည်းမျဉ်းအခြေပြု parser သို့ ပြောင်းသုံးမည်ဖြစ်ပြီး ရလဒ်ကို စစ်ဆေးပေးပါ။': 'Your text will be analyzed with Gemini AI. If the API key is invalid or Gemini is unavailable, a rule-based parser will be used. Please review the result.',
  'တကယ့် Gemini AI ကို သုံးရန် သင့်ကိုယ်ပိုင် Google AI Studio API key လိုအပ်ပါသည်။ Key မထည့်ဘဲ ဆက်သုံးပါက AI မဟုတ်သော စည်းမျဉ်းအခြေပြု parser ဖြင့်သာ ခန့်မှန်းပေးပါမည်။': 'A personal Google AI Studio API key is required to use Gemini AI. Without a key, a non-AI rule-based parser will estimate the transaction.',
  'စာသားကို Gemini AI ဖြင့် ခွဲခြမ်းစိတ်ဖြာမည်': 'Analyze text with Gemini AI',
  'အင်တာနက်မရှိပါ။ သိမ်းထားပြီးသား UI နှင့် စာရင်းများကို ဆက်သုံးနိုင်ပါသည်။ AI နှင့် Google Drive ကို အင်တာနက်ပြန်ရမှ အသုံးပြုနိုင်ပါမည်။': 'You are offline. Saved records remain available. AI and Google Drive will work when you reconnect.',
  'Offline ဖြစ်နေပါသည်။ AI parser သုံးရန် အင်တာနက်လိုအပ်ပြီး၊ ချိတ်ဆက်မှု ပြန်ရမှ အသုံးပြုနိုင်ပါမည်။': 'You are offline. An internet connection is required to use the AI parser.',
  'စစ်ဆေးနေပါသည်...': 'Checking...',
  'Drive ဖိုင် အခြေအနေ:': 'Drive file status:',
  'Drive ပေါ်တွင် ဖိုင်မရှိသေးပါ': 'No file on Drive yet',
  'Google Drive ပေါ်တွင် ဖိုင်မရှိသေးပါ': 'No file on Google Drive yet',
  'နောက်ဆုံးသိမ်းဆည်းခဲ့သည်:': 'Last saved:',
  'Drive မှ ပြန်ယူမည်': 'Restore from Drive',
  'Drive မှ ဒေတာရယူရာတွင် အဆင်မပြေဖြစ်သွားပါသည်: ': 'Could not restore data from Drive: ',
  'Google Drive သို့ သိမ်းဆည်းရာတွင် အဆင်မပြေဖြစ်သွားပါသည်။ (Error: ': 'Could not save to Google Drive. (Error: ',
  'Google Drive ပေါ်သို့ စာရင်းဒေတာများ အောင်မြင်စွာ သိမ်းဆည်းပြီးပါပြီ!': 'Transaction data saved to Google Drive.',
  'Google Drive ပေါ်ရှိ စာရင်းဒေတာများကို အောင်မြင်စွာ ပြန်လည်ရယူပြီးပါပြီ!': 'Transaction data restored from Google Drive.',
  'Local JSON ဖိုင်မှ ဒေတာများကို အောင်မြင်စွာ ပြန်လည်ထည့်သွင်းပြီးပါပြီ!': 'Data restored from the local JSON file.',
  'မင်္ဂလာပါ ': 'Welcome, ',
  'စက်ပြောင်းသုံးခြင်းနှင့် အချက်အလက်များ မပျောက်ပျက်စေရန် သိမ်းဆည်းခြင်း': 'Back up your data when changing devices',
  'အင်တာနက်မရှိပါ။ Drive sync ကို အင်တာနက်ပြန်ရသောအခါ ပြန်အသုံးပြုနိုင်ပါမည်။': 'You are offline. Drive sync will be available when you reconnect.',
  'ထွက်မည်': 'Sign out',
  'လက်ရှိတွင် စာရင်းများကို သင့်ဖုန်း/ကွန်ပျူတာ Browser မှတ်ဉာဏ် (Local Storage) ၌သာ သိမ်းဆည်းထားပါသည်။ ဖုန်းပျောက်ခြင်း၊ စက်အသစ်ပြောင်းခြင်း (သို့မဟုတ်) Browser ဒေတာရှင်းမိပါက စာရင်းများ ပြန်မရနိုင်တော့ပါ။ စာရင်းများ အမြဲလုံခြုံစိတ်ချရစေရန် Google Drive ဖြင့် ချိတ်ဆက်ထားရန် အထူးအကြံပြုအပ်ပါသည်။': 'Your records are currently stored only in this browser on your device. They may be lost if the device is lost, replaced, or its browser data is cleared. We recommend connecting Google Drive to keep a backup.',
  'Google Drive တွင် စာရင်းများကို အလိုအလျောက် Cloud Backup သိမ်းဆည်းရန် Google Account ဖြင့် ဝင်ရောက်ပါ': 'Sign in with Google to automatically back up your records to Google Drive.',
  'Sign in with Google': 'Sign in with Google',
  'စာရင်းနှင့် API key ကို Drive သို့ backup လုပ်မည်': 'Back up records and API key to Drive',
  'လက်ရှိစာရင်းများကို Drive သို့ ပို့မည်': 'Back up current records to Drive',
  'Google Drive မှ အချက်အလက်များကို ပြန်လည်ရယူပါက လက်ရှိဖုန်း/ကွန်ပျူတာပေါ်ရှိ စာရင်းများကို Drive ရှိ နောက်ဆုံး backup ဖြင့် အစားထိုးသွားပါမည်။ သေချာပါသလား?': 'Restoring from Google Drive will replace the records on this device with the latest Drive backup. Are you sure?',
  'အော့ဖ်လိုင်း (Local) ဖိုင် အနေဖြင့် သိမ်းခြင်း / တင်ခြင်း': 'Local file backup / restore',
  'JSON ဖိုင် သိမ်းမည်': 'Download JSON backup',
  'Privacy Policy (ကိုယ်ရေးအချက်အလက် မူဝါဒ)': 'Privacy Policy',
  'ကိုယ်ရေးအချက်အလက် မူဝါဒ': 'Privacy Policy',
  'Home Accountant သို့ ပြန်သွားရန်': 'Back to Home Accountant',
  '၁။ ကျွန်ုပ်တို့ စုဆောင်း/အသုံးပြုသည့် အချက်အလက်များ': '1. Information we collect and use',
  '၂။ ဒေတာသိမ်းဆည်းရာနေရာ': '2. Where your data is stored',
  '၃။ ပြင်ပဝန်ဆောင်မှုများနှင့် ဒေတာမျှဝေမှု': '3. Third-party services and data sharing',
  '၄။ ဒေတာထိန်းသိမ်းခြင်းနှင့် သင့်ရွေးချယ်မှုများ': '4. Data retention and your choices',
  '၅။ လုံခြုံရေးနှင့် မူဝါဒပြောင်းလဲမှု': '5. Security and policy changes',
  '၆။ ဆက်သွယ်ရန်': '6. Contact',
  'Home Accountant is a personal financial management web app for tracking household expenses and syncing records to your own Google Drive. သင်ထည့်သွင်းသော အကောင့်အမည်နှင့် လက်ကျန်ငွေ၊ ဝင်ငွေ/အသုံးစရိတ်၊ ပမာဏ၊ အမျိုးအစား၊ ရက်စွဲ၊ မှတ်စုနှင့် အသံမှတ်တမ်းမှ ရရှိသော စာသားတို့ကို စက်တွင်း browser storage တွင် သိမ်းဆည်းပါသည်။': 'Home Accountant is a personal finance app for tracking household expenses and syncing records to your own Google Drive. Account names and balances, income and expenses, amounts, categories, dates, notes, and text transcribed from voice input are stored in your browser storage.',
  'Google sign-in ပြုလုပ်သည့်အခါ သင့် Google အီးမေးလ်လိပ်စာ၊ Google account user ID၊ အမည်နှင့် profile photo URL အပါအဝင် Google မှ ပေးပို့သော profile အချက်အလက်များကို authentication နှင့် ချိတ်ဆက်ထားသော Drive account ကို ပြသရန် လက်ခံရရှိပါသည်။ Google Drive အသုံးပြုမှုကို သင်ခွင့်ပြုပါက `drive.file` scope အရ app ဖန်တီးထားသော သို့မဟုတ် app ဖြင့်ဖွင့်ထားသော Drive ဖိုင်များကိုသာ ဝင်ရောက်အသုံးပြုပါသည်။ သင်ထည့်သော Gemini API key ကို browser ၏ local storage တွင် သိမ်းဆည်းပါသည်။': 'When you sign in with Google, we receive profile information such as your email address, Google account user ID, name, and profile photo URL to authenticate you and show the connected Drive account. If you authorize Google Drive, the app accesses only Drive files it creates or opens, using the `drive.file` scope. Your Gemini API key is stored in your browser local storage.',
  'သင့်စာရင်းဒေတာနှင့် ဆက်တင်များကို ပုံမှန်အားဖြင့် သင်အသုံးပြုနေသော browser/device ၏ local storage တွင် သိမ်းဆည်းပါသည်။ App သည် ဤဒေတာများကို ကျွန်ုပ်တို့၏ app server တွင် အကောင့်အဖြစ် စုဆောင်းသိမ်းဆည်းရန် မရည်ရွယ်ပါ။ Browser ဒေတာရှင်းလင်းခြင်း သို့မဟုတ် device ပျောက်ဆုံးခြင်းကြောင့် local copy ပျောက်နိုင်ပါသည်။': 'Your records and settings are normally stored in the local storage of the browser and device you use. The app is not designed to collect and store this data as an account on our app server. The local copy may be lost if browser data is cleared or the device is lost.',
  'Google Drive ခွင့်ပြုချက်သည် သင့်ကိုယ်ပိုင် Google Drive ထဲရှိ Home Accountant backup ဖိုင်ကို ရှာဖွေ၊ ဖတ်ရှု၊ ဖန်တီးနှင့် အပ်ဒိတ်လုပ်ရန်သာ လိုအပ်ပါသည်။ ဤခွင့်ပြုချက်ကို အခြားရည်ရွယ်ချက်အတွက် အသုံးမပြုပါ။ ပုံမှန်အလိုအလျောက် sync တွင် Gemini API key မပါဝင်ပါ။ Key ပါဝင်သော backup ကို Drive သို့ သိမ်းလိုပါက key ပါဝင်ကြောင်း သိရှိပြီး ကိုယ်တိုင်သိမ်းဆည်းမှုကို အတည်ပြုရပါမည်။ ထို Drive backup သည် end-to-end encrypted မဟုတ်ပါ။': 'Google Drive access is used only to find, read, create, and update the Home Accountant backup file in your Drive. It is not used for other purposes. Automatic sync does not include your Gemini API key. To include the key in a Drive backup, you must knowingly confirm a manual save. That backup is not end-to-end encrypted.',
  'Home Accountant သည် သင့်ဒေတာကို မည်သူ့ထံမျှ မရောင်းချပါ၊ ကြော်ငြာ သို့မဟုတ် marketing အတွက် ပြင်ပအဖွဲ့အစည်းများနှင့် မျှဝေခြင်းမပြုပါ။ Google/Firebase သို့ အီးမေးလ်နှင့် profile အချက်အလက်များကို sign-in ဝန်ဆောင်မှုပေးရန် ပေးပို့ပြီး၊ Google Drive သို့ သင်ရွေးချယ်ထားသော backup/sync ကို လုပ်ဆောင်ရန် စာရင်းဒေတာများကို ပေးပို့ပါသည်။ Google က ၎င်း၏ ကိုယ်ပိုင် privacy policy နှင့် စည်းကမ်းချက်များအတိုင်း ထိုဒေတာများကို စီမံဆောင်ရွက်ပါသည်။': 'Home Accountant does not sell your data or share it with third parties for advertising or marketing. Email and profile information are sent to Google/Firebase for sign-in, and your records are sent to Google Drive when you choose to use backup or sync. Google processes that data under its own privacy policy and terms.',
  'AI ဖြင့်စာရင်းခွဲခြမ်းစိတ်ဖြာရာတွင် သင်ရိုက်ထည့်/အသံမှရရှိသော စာသားနှင့် အကောင့်၊ အမျိုးအစားဆိုင်ရာ အချက်အလက်များကို app server သို့ ပို့ပါသည်။ Gemini ကို အသုံးပြုနိုင်သည့်အခါ စာသားနှင့် အကောင့်/အမျိုးအစား ID၊ အမည်နှင့် အမျိုးအစားတို့ကို Google Gemini သို့ ဆက်လက်ပို့ပြီး ခွဲခြမ်းစိတ်ဖြာမှုရလဒ်ကို ပြန်လည်ရယူပါသည်။ Gemini မသုံးနိုင်ပါက server ပေါ်ရှိ စည်းမျဉ်းအခြေပြု parser ဖြင့် စီမံနိုင်ပါသည်။ သင့်ကိုယ်ပိုင် API key သုံးပါက တောင်းဆိုမှုကို ဆောင်ရွက်ရန် server က ထို key ဖြင့် Gemini ကို ခေါ်ဆိုပါသည်။ App server တွင် key ကို သိမ်းဆည်းရန် မရည်ရွယ်ပါ။': 'For AI transaction analysis, the text you type or provide by voice and related account and category information are sent to the app server. When Gemini is available, the text and account/category IDs, names, and types are forwarded to Google Gemini for analysis. If Gemini is unavailable, the server may process the text with a rule-based parser. If you use your own API key, the server uses it to call Gemini for your request. The app server is not designed to store your key.',
  'ဤလုပ်ဆောင်ချက်များကို ပေးဆောင်ရန် шаардသည့် ဝန်ဆောင်မှုပေးသူများအပြင် အခြားပြင်ပအဖွဲ့အစည်းများထံ သင့်ဒေတာကို ရောင်းချခြင်း၊ ပေးအပ်ခြင်း သို့မဟုတ် လွှဲပြောင်းခြင်း မပြုပါ။ Google Drive သို့မဟုတ် Gemini ကို အသုံးပြုရန် သင်ရွေးချယ်ပါက သက်ဆိုင်ရာအချက်အလက်များကို Google ထံ ပေးပို့ရခြင်းဖြစ်ပြီး Google သည် သီးခြားဝန်ဆောင်မှုပေးသူအဖြစ် ဒေတာကို ၎င်း၏ စည်းကမ်းချက်များအတိုင်း ကိုင်တွယ်ပါသည်။': 'We do not sell, provide, or transfer your data to third parties other than service providers needed to provide these features. If you choose to use Google Drive or Gemini, relevant information is sent to Google, which handles it as a separate service provider under its own terms.',
  'အသံထည့်သွင်းမှုအတွက် browser/device ၏ Speech Recognition ဝန်ဆောင်မှုကို အသုံးပြုနိုင်ပါသည်။ အသံကို မည်သို့စီမံမည်ဆိုသည်မှာ browser/device ဝန်ဆောင်မှုပေးသူ၏ စည်းကမ်းချက်ပေါ် မူတည်ပါသည်။ အသံမသုံးဘဲ စာရိုက်ထည့်နိုင်ပါသည်။': 'Voice input may use your browser or device speech recognition service. How voice data is processed depends on that provider’s terms. You can type instead of using voice input.',
  'App ကို လက်ခံထားသော hosting/server ဝန်ဆောင်မှုကလည်း တောင်းဆိုမှုများကို လုပ်ဆောင်ရန် လိုအပ်သည့် နည်းပညာဆိုင်ရာ အချက်အလက်များကို ကိုင်တွယ်နိုင်ပါသည်။ ထိုဝန်ဆောင်မှုများ၏ ကိုယ်ပိုင် privacy စည်းကမ်းချက်များလည်း သက်ဆိုင်နိုင်ပါသည်။': 'The hosting or server provider may process technical information needed to handle requests. The providers’ own privacy terms may also apply.',
  'Local storage ထဲရှိ ဒေတာကို app အတွင်းစာရင်းများကို ဖျက်ခြင်း သို့မဟုတ် browser/device ဒေတာကို ရှင်းလင်းခြင်းဖြင့် ဖယ်ရှားနိုင်ပါသည်။ Drive backup များကို သင့် Google Drive မှ ကိုယ်တိုင်ဖျက်နိုင်ပါသည်။ Google account ကို app မှ ချိတ်ဆက်မှုဖြုတ်ခြင်းသည် Drive ထဲရှိ backup ဖိုင်ကို အလိုအလျောက် မဖျက်ပါ။ Gemini API key ကို app ၏ key ဆက်တင်တွင် ဖယ်ရှားနိုင်ပြီး၊ Drive ထဲတွင် key ပါသော backup ရှိခဲ့ပါက ထိုဖိုင်ကိုလည်း သီးခြားဖျက်ပါ။': 'You can remove local data by deleting records in the app or clearing browser/device data. You can delete Drive backups from your Google Drive. Disconnecting your Google account from the app does not automatically delete Drive backups. You can remove your Gemini API key in the app settings; if a Drive backup contains the key, delete that file separately.',
  'AI တောင်းဆိုမှုများကို ရလဒ်ပေးရန်သာ ပို့ပါသည်။ ပြင်ပဝန်ဆောင်မှုများနှင့် hosting ပေးသူတို့၏ သိမ်းဆည်းကာလ၊ လုပ်ဆောင်ပုံများကို ကျွန်ုပ်တို့ မထိန်းချုပ်နိုင်သဖြင့် ၎င်းတို့၏ privacy policy များကိုလည်း စစ်ဆေးပါ။': 'AI requests are sent only to provide results. We do not control the retention or handling practices of external services or hosting providers; please review their privacy policies.',
  'ငွေကြေးမှတ်တမ်းများနှင့် API key များသည် အရေးကြီးနိုင်ပါသည်။ သင့်စက်ကို လုံခြုံစွာထားပါ၊ အခြားသူများဝင်ရောက်နိုင်သော browser/device တွင် key သိမ်းဆည်းခြင်းကို ရှောင်ပါ၊ Drive backup ဖိုင်ကို မျှဝေသည့်အခါ သတိပြုပါ။ အင်တာနက်မှတစ်ဆင့် သိမ်းဆည်းခြင်း သို့မဟုတ် ပို့ခြင်းသည် လုံခြုံမှုကို အပြည့်အဝ အာမခံနိုင်ခြင်း မရှိပါ။': 'Financial records and API keys may be sensitive. Secure your device, avoid saving keys in browsers or devices accessible to others, and be careful when sharing Drive backup files. Storage or transmission over the internet cannot be guaranteed to be completely secure.',
  'App ၏ လုပ်ဆောင်ချက်များ ပြောင်းလဲခြင်း သို့မဟုတ် လိုအပ်ချက်ရှိလာခြင်းကြောင့် ဤမူဝါဒကို ပြင်ဆင်နိုင်ပါသည်။ ပြင်ဆင်သည့်ရက်ကို ဤစာမျက်နှာတွင် ဖော်ပြပါမည်။': 'This policy may be updated when the app’s features change or when needed. The revision date will be shown on this page.',
  'ကိုယ်ရေးအချက်အလက်ဆိုင်ရာ မေးခွန်း သို့မဟုတ် တောင်းဆိုချက်များအတွက် app ကို ရရှိခဲ့သော ဝက်ဘ်ဆိုက် သို့မဟုတ် ဖြန့်ချိသူ၏ ဆက်သွယ်ရန်လမ်းကြောင်းမှတစ်ဆင့် app တာဝန်ရှိသူထံ ဆက်သွယ်ပါ။': 'For privacy questions or requests, contact the app maintainer through the website or distributor from which you obtained the app.',
  'ဤမူဝါဒတွင် Home Accountant ကို အသုံးပြုသည့်အခါ အချက်အလက်များကို မည်သို့သိမ်းဆည်း၊ အသုံးပြု၊ မျှဝေသည်ကို ရှင်းပြထားပါသည်။ Drive နှင့် AI လုပ်ဆောင်ချက်များသည် သင်ရွေးချယ်အသုံးပြုမှသာ လုပ်ဆောင်ပါသည်။': 'This policy explains how information is stored, used, and shared when you use Home Accountant. Drive and AI features run only when you choose to use them.',
  'ခု': 'items',
  'ခုများ': 'items',
  'ကြိမ် မှတ်ထားသည်': 'times recorded',
  'ဘာသာစကား ပြောင်းရန်': 'Change language',
  'ဘယ်အကောင့်ထဲမှ ': 'Choose which account to ',
  'ရမလဲ ရွေးချယ်ပေးပါခင်ဗျာ:': ' from:',
  'ထည့်': 'deposit',
  'နှုတ်': 'withdraw',
  '၁ ရက်': 'Day 1',
  'ဒီနေ့မနက် မနက်စာ ငါးထောင်ဖိုးစားလိုက်တယ်...': 'I spent 5,000 Ks on breakfast this morning...',
  'သင့် browser တွင် Speech Recognition အဆင်မပြေပါက စာရိုက်၍ ထည့်သွင်းနိုင်ပါသည်။': 'If speech recognition is unavailable in your browser, you can type instead.',
  'Internet/server ကို ချိတ်ဆက်မရပါ။ AI သုံးရန် connection ပြန်ရမှ ပြန်စမ်းပါ။': 'Could not connect to the internet or server. Reconnect and try AI again.',
  'AI ခွဲခြမ်းစိတ်ဖြာရာတွင် အခက်အခဲရှိနေပါသည်။ လက်ဖြင့် စစ်ဆေးပြင်ဆင်နိုင်ပါသည်။': 'AI analysis failed. You can review and edit the details manually.',
  'API key ဆက်တင်ပြင်ရန် →': 'Update API key settings →',
  'API key ထည့်ရန် →': 'Add API key →',
  'မှတ်ချက်:': 'Note:',
  'ကြည့်ရန်:': 'Review:',
  'ပြီးနောက်': 'after',
  'ဥပမာ - မုန့်ဖိုး ရန်ပုံငွေ': 'e.g. Household cash',
  'ဥပမာ - ကလေးများ မုန့်ဖိုးနှင့် ကစားစရာစရိတ်': 'e.g. Children’s allowance and toy expenses',
  'Google AI Studio မှ API key ရယူရန် ↗': 'Get an API key from Google AI Studio ↗',
  'API key ကို server တွင် မသိမ်းပါ။ Gemini သို့ စာရင်းစာသားခွဲခြမ်းစိတ်ဖြာရန်သာ ပို့ပြီး၊ မသိမ်းထားလျှင် စည်းမျဉ်းအခြေပြု parser ကို သုံးပါမည်။': 'Your API key is not stored on the server. It is only used to analyze transaction text with Gemini. If no key is set, a rule-based parser is used.',
  'Key ကို ဒီ browser ထဲတွင် သိမ်းပါမည်။ အလိုအလျောက် Drive sync တွင် key မပါဝင်ပါ။ Key ကို Drive backup ထဲထည့်ရန် Drive ထဲတွင် “သိမ်းမည်” ကို ကိုယ်တိုင်နှိပ်ပြီး Google account ကို ပြန်အတည်ပြုပါ။ Drive ဖိုင်ကို ဝင်ကြည့်နိုင်သူသည် key ကို ဖတ်နိုင်သဖြင့် ဤနည်းသည် end-to-end encryption မဟုတ်ပါ။': 'The key is stored in this browser and is excluded from automatic Drive sync. To include it in a backup, manually save to Drive and reauthorize your Google account. Anyone with access to that Drive file can read the key; this is not end-to-end encryption.',
  'Drive မချိတ်ထားသဖြင့် key ကို ဒီ browser ထဲတွင်သာ သိမ်းပါမည်။ စက်အသစ်၊ browser အသစ်တွင် ပြန်ထည့်ရန်လိုပြီး local JSON export ထဲတွင် key မပါဝင်ပါ။': 'Because Drive is not connected, the key is stored only in this browser. You will need to add it again on a new device or browser. It is not included in local JSON exports.',
  'Key ကို ဖယ်ရှားပြီးနောက် Drive ထဲက copy ကိုပါ ဖယ်ရှားရန် key မပါဘဲ Drive backup အသစ်တစ်ခု သိမ်းပါ။': 'After removing the key, create a new Drive backup without it to replace the old copy.',
  'Key ဖယ်ရှားမည်': 'Remove key',
  'Google အကောင့်ဖြင့် ဝင်ရောက်ခြင်း မအောင်မြင်ပါ။ ကျေးဇူးပြု၍ ပြန်လည်စမ်းသပ်ကြည့်ပါ။': 'Google sign-in failed. Please try again.',
  'အိမ်စရင်း': 'household-ledger',
  'AI ဖြင့် ခွဲခြမ်းစိတ်ဖြာရာတွင်': 'AI analysis',
  'အင်္ဂလိပ်ဂဏန်း သုံးနေပါသည်': 'English numerals are on',
  'အင်္ဂလိပ်ဂဏန်း သုံးမည်': 'Use English numerals',
  'အမှောင်မုဒ်သို့ ပြောင်းမည်': 'Switch to dark mode',
  'အလင်းမုဒ်သို့ ပြောင်းမည်': 'Switch to light mode',
  'အလင်းမုဒ်': 'Light mode',
  'အမှောင်မုဒ်': 'Dark mode',
  'AI parser မရှိသေးပါ': 'AI parser is unavailable',
  'Google Drive နှင့် အောင်မြင်စွာ ချိတ်ဆက်ပြီးပါပြီ။': 'Connected to Google Drive successfully.',
  'Google Drive သို့ သိမ်းဆည်းပြီးပါပြီ': 'Saved to Google Drive',
  'အင်တာနက်ပြန်ရသောအခါ Drive သို့ အလိုအလျောက် သိမ်းဆည်းပါမည်။': 'Changes will sync to Drive when you are back online.',
  'Drive ခွင့်ပြုချက် မရရှိသေးပါ။ Sync ကိုဖွင့်၍ Google account ဖြင့် ပြန်ချိတ်ဆက်ပါ။': 'Drive permission is missing. Open sync settings and reconnect your Google account.',
  'Google Drive သို့ အလိုအလျောက် သိမ်းဆည်းနေပါသည်...': 'Automatically saving to Google Drive...',
  'Google Drive သို့ သိမ်းဆည်းပြီးပါပြီ (': 'Saved to Google Drive (',
  'Drive သို့ အလိုအလျောက် သိမ်းမရပါ။ Sync ကိုဖွင့်၍ account ခွင့်ပြုချက်နှင့် အင်တာနက်ကို စစ်ဆေးပါ။': 'Could not automatically save to Drive. Check your account permissions and internet connection.',
  'ကြည့်ပါ': 'Review',
  'Main Account တွင် စတင်လက်ကျန်ငွေကို သတ်မှတ်ပါ။ နောက်ထပ်အကောင့်များကို လိုအပ်မှသာ ကိုယ်တိုင်ထည့်နိုင်ပါတယ်။': 'Set an opening balance for your Main Account. Add more accounts only if you need them.',
  'ဖုန်း/ကွန်ပျူတာ Browser မှတ်ဉာဏ် (Local Storage)': 'browser storage on your device',
  'ထိုင်း': 'Thailand',
  'ဥပမာ - မနက်စာ မုန့်ဟင်းခါး၊ ကလေးကျောင်းစရိတ်...': 'e.g. breakfast or school expenses...',
  'သင့်ဖုန်း/စက်တွင်း၌သာ သိမ်းဆည်းထားပါသည်။': 'stored only on your device.',
  'လက်ရှိမှတ်တမ်းများအတွက် ရှာဖွေရန်...': 'Search current records...',
  'အသံ / စာဖြင့် AI စာရင်းသွင်းမည်': 'Add a transaction with AI by voice or text',
  'ကိုယ်ပိုင် Gemini API key ထည့်ရန်': 'Add your own Gemini API key',
  'Google Drive နှင့် ချိတ်ဆက်ထားပြီးဖြစ်သည်': 'Google Drive is connected',
  'Google Drive မချိတ်ရသေးပါ (ဒေတာမပျောက်စေရန် ချိတ်ဆက်ထားပါ)': 'Google Drive is not connected (connect to protect your data)',
  'လောလောဆယ် စာရင်းများကို သင့်ဖုန်း/စက်တွင်း၌သာ သိမ်းဆည်းထားပါသည်။ ဖုန်းပျောက်ခြင်း၊ စက်အသစ်လဲလှယ်ခြင်း (သို့မဟုတ်) Browser ဒေတာများ ရှင်းလင်း (Clear Cache) မိပါက စာရင်းများ ပျောက်ဆုံးသွားနိုင်သဖြင့် Google Drive တွင် Backup ချိတ်ဆက်ထားရန် အကြံပြုအပ်ပါသည်။': 'Your records are currently stored only on this device. If your phone is lost, you switch devices, or browser data is cleared, your records may be lost. We recommend connecting Google Drive for backup.',
  'ဆက်တင်များ': 'Settings',
  'AI စာရင်းသွင်းရန်': 'Add with AI',
  'အိမ်အသုံးစရိတ် / ဈေးဖိုး': 'Household / Groceries',
  'ဈေးဖိုး / ကုန်စုံ': 'Groceries',
  'အစားအသောက် / မနက်စာ': 'Food / Breakfast',
  'အိမ်စရိတ် / မီတာခ / ရေဖိုး': 'Household / Utilities',
  'ကျောင်းစရိတ် / ကျူရှင်': 'School / Tuition',
  'ကျန်းမာရေး / ဆေးဝါး': 'Health / Medicine',
  'သွားလာစရိတ် / ဆီဖိုး': 'Transport / Fuel',
  'လူမှုရေး / အလှူအတန်း': 'Donations',
  'အထွေထွေ အသုံးစရိတ်': 'Other expenses',
  'လစာ / ပုံမှန်ဝင်ငွေ': 'Salary / Regular income',
  'အရောင်းအဝယ် / စီးပွားရေး': 'Business income',
  'အပိုဝင်ငွေ / Bonus': 'Extra income / Bonus',
  'မုန့်ဖိုး / လက်ဆောင်ငွေ': 'Allowance / Gift',
  'ဘဏ်ကတ်': 'Bank card',
  'စုငွေ': 'Savings',
  'ဒီနေ့မနက် မနက်စာ ငါးထောင်ဖိုးစားလိုက်တယ်': 'I spent 5,000 Ks on breakfast this morning',
  'Main Account စတင်ပြင်ဆင်ပါ': 'Set up your Main Account',
  'Google Drive ချိတ်ရန် →': 'Connect Google Drive →',
  'CSV ဖိုင် ထုတ်ယူမည်': 'Export CSV file',
  'CSV ထုတ်မည်': 'Export CSV',
  'ရွေးချယ်ထားသော အချက်အလက်များအတွက် မှတ်တမ်း မရှိသေးပါ': 'No records match your filters.',
  '"AI စာရင်းသွင်း" သို့မဟုတ် "စာရင်းသွင်း" ခလုတ်ဖြင့် စာရင်းထည့်သွင်းနိုင်ပါသည်': 'Use “Add with AI” or “Add transaction” to create a record.',
  'မဖျက်ပါ': 'Keep',
  'နှုတ်ယူမည့် အကောင့်:': 'Withdraw from account:',
  'ထည့်သွင်းမည့် အကောင့်:': 'Deposit into account:',
  '+ သွင်းမည်': '+ Add',
  'ရက်': 'days',
  'လကုန်': 'End of month',
  'Google Drive အရန်သိမ်းခြင်း': 'Google Drive backup and sync',
  'လမ်းညွှန်ကို ပိတ်မည်': 'Close getting-started guide',
  'အသံဖြင့် AI စာရင်းသွင်းမည်': 'Add a transaction with AI by voice',
  'Үндсэн навигаци': 'Main navigation',
};

const dynamicPrefixes: Array<[string, string]> = [
  ['Google Drive သို့ သိမ်းဆည်းပြီးပါပြီ (', 'Saved to Google Drive ('],
  ['Google Drive သို့ သိမ်းဆည်းရာတွင် အဆင်မပြေဖြစ်သွားပါသည်။ (Error: ', 'Could not save to Google Drive. (Error: '],
  ['Drive မှ ဒေတာရယူရာတွင် အဆင်မပြေဖြစ်သွားပါသည်: ', 'Could not restore data from Drive: '],
  ['မင်္ဂလာပါ ', 'Welcome, '],
];

const translateText = (text: string, language: AppLanguage): string => {
  if (language === 'my') return text;
  const leading = text.match(/^\s*/)?.[0] ?? '';
  const trailing = text.match(/\s*$/)?.[0] ?? '';
  const content = text.trim();
  const exact = translations[content];
  if (exact) return `${leading}${exact}${trailing}`;

  const prefix = dynamicPrefixes.find(([source]) => content.startsWith(source));
  if (prefix) {
    return `${leading}${prefix[1]}${content.slice(prefix[0].length)}${trailing}`;
  }
  return text;
};

interface LanguageContextValue {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  t: (text: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export const LanguageProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [language, setLanguage] = useState<AppLanguage>(() => {
    try {
      return localStorage.getItem(LANGUAGE_STORAGE_KEY) === 'en' ? 'en' : 'my';
    } catch (error) {
      console.error('Failed to load language preference:', error);
      return 'my';
    }
  });

  useEffect(() => {
    document.documentElement.lang = language;
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch (error) {
      console.error('Failed to save language preference:', error);
    }
  }, [language]);

  const t = useCallback((text: string) => translateText(text, language), [language]);
  const value = useMemo(() => ({ language, setLanguage, t }), [language, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = (): LanguageContextValue => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within a LanguageProvider');
  return context;
};

const translateNode = (node: React.ReactNode, language: AppLanguage): React.ReactNode => {
  if (typeof node === 'string') return translateText(node, language);

  if (Array.isArray(node)) {
    return node.map((child, index) => {
      const translated = translateNode(child, language);
      return isValidElement(translated) && translated.key === null
        ? cloneElement(translated, { key: `localized-${index}` })
        : translated;
    });
  }
  if (!isValidElement(node)) return node;
  if (typeof node.type !== 'string' && node.type !== React.Fragment) return node;

  const props = node.props as Record<string, unknown>;
  const translatedProps = { ...props };
  for (const key of ['aria-label', 'aria-description', 'alt', 'placeholder', 'title']) {
    const value = translatedProps[key];
    if (typeof value === 'string') translatedProps[key] = translateText(value, language);
  }

  translatedProps.children = translateNode(props.children as React.ReactNode, language);
  return cloneElement(node, translatedProps);
};

export const Localized: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { language } = useLanguage();
  return <>{translateNode(children, language)}</>;
};
