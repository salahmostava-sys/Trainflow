// ---------- TRANSLATIONS ----------
const TRANSLATIONS = {
  en: {
    copyBtn:"Copy", copyFailed:"Copy failed. Please try again.", enterCredential:"Enter the value first.",
    sessionCredentials:"The Prometric credentials are prefilled for this session.",
    appTitle:"TrainFlow",skipToContent:"Skip to content",workspaceContent:"Main content",copyAccount:"Copy Prometric account",copyPassword:"Copy Prometric password",selectAllCodes:"Select all codes",copyCode:code=>"Copy code "+code,selectCode:code=>"Select code "+code,codeNote:code=>"Notes for code "+code,
    tabKeycodes:"Keycodes", tabPrometric:"Prometric", tabCodes:"VOUCHERS", tabInventory:"Inventory",
    sidebarOpen:"Open sidebar", sidebarClose:"Close sidebar", sidebarPages:"Pages", sidebarShrink:"Show icons only", sidebarExpand:"Expand sidebar",
    codeDensityCompact:"Compact view", codeDensityComfortable:"Comfortable view", codeExpandHeight:"Expand height", codeNormalHeight:"Normal height", codeScrollToTop:"Show from start (#1)", codeScrollToToday:"Go to today's codes",
    inventoryIntro:"Codes with you are unused codes in the system. Supervisor balances decrease automatically when new codes are added.",
    inventoryWithYou:"With you", inventoryWithSupervisor:"With supervisor", inventoryNotSet:"Not set",
    inventoryUpdateTitle:"Supervisor balances",inventoryOpeningHint:"Review each category, then choose whether to set its actual balance or add new codes.",inventoryCurrentBalance:n=>"Current supervisor balance: "+n,inventoryCurrentQuantity:"Current number with supervisor",inventorySetCurrent:"Save current balance",inventorySetCurrentHint:"This replaces the previous balance with the actual count.",inventoryPurchasedQuantity:"Newly purchased codes",inventoryAddPurchased:"Add to balance",inventoryAddPurchasedHint:"This number is added to the existing supervisor balance.",
    inventoryCategory:"Category",inventoryAction:"Action",inventoryQuantity:"Number of codes",inventoryOpening:"Set starting balance",inventoryReplenish:"Add company codes",inventoryCorrection:"Correct balance",
    inventorySummaryTitle:"Inventory summary",inventoryMessageDate:date=>"Date: "+date,inventoryMessageMine:"Codes with me",inventoryMessageSupervisor:name=>"Codes with "+name,inventoryMessageTotal:"Total codes",inventoryMessageOverall:"Overall total",inventorySupervisorFallback:"supervisor",
    inventoryMessageHint:"Set the starting balance for every category to view accurate counts.",
    inventoryCopyMessage:"Copy message",inventorySupervisorName:"Supervisor name",inventorySupervisorNameInvalid:"Enter a supervisor name of up to 100 characters.",inventoryMessageLanguage:"Message language",inventoryArabic:"Arabic",inventoryEnglish:"English",
    inventoryStockNotSet:"Set the supervisor's starting balance for this category first.",inventoryStockInsufficient:"The supervisor does not have enough codes in this category.",inventoryInvalidChange:"Enter a valid non-negative number of codes.",inventorySaved:"Supervisor stock updated.",inventoryMessageCopied:"Inventory message copied.",inventoryCopyImage:"Copy as image",inventoryImageCopied:"Inventory image copied.",
    settingsTabExtensions:"Extensions", extensionsIntro:"Download the Chrome extensions here, then install them once in the same Chrome profile you use for this program.", extensionPrometricTitle:"Prometric registration", extensionPrometricDesc:"Create trainee accounts through Prometric and return their usernames and passwords to the trainee sheet.", extensionPrometricDownload:"Download Prometric extension",    extensionsInstallTitle:"Install in Google Chrome", extensionsInstallExtract:"Extract the downloaded ZIP into a permanent folder.", extensionsInstallOpen:"Open this address in Chrome:", extensionsInstallDeveloper:"Enable Developer mode, click Load unpacked, and select the extracted folder.", extensionsInstallReload:"Reload this program and Prometric in the same Chrome profile. Disable any older copy of the extension.",
    settingsTabReports:"Report columns",
    settingsTitle:"Settings", settingsTabProfile:"My account", settingsTabData:"System data", settingsTabPrometric:"Prometric", settingsTabInventory:"Inventory", settingsTabPreferences:"Preferences", settingsTabSync:"Team and sync",
    profileTitle:"My account", profileDesc:"Change your name, sign-in email, or password.", profileName:"Name", profileLoginEmail:"Username (sign-in email)", saveName:"Save name", changeEmail:"Change email", emailConfirmHint:"Confirm the new address from the verification email before using it to sign in.", currentPassword:"Current password", newPassword:"New password", confirmNewPassword:"Confirm new password", changePassword:"Change password", profileNameSaved:"Name saved", profileEmailSent:"Check your new email to confirm the change. Your current sign-in stays active until then.", profilePasswordSaved:"Password changed", profilePasswordMismatch:"The new passwords do not match.", profilePasswordShort:"Use a password with at least 8 characters.", profileSameEmail:"Enter a different email address.", profileInvalidEmail:"Enter a valid email address.",
    examTitleCol:"Exam Title", langCol:"Language", keycodeCol:"Keycode", moveCategoryCol:"Move Category",
    noExams:"No exams in this category",
    remaining:"Remaining",
    prometricAccount:"Prometric Account", prometricPassword:"Prometric Password",
    zoomMeeting:"Zoom meeting", prometricLoginLink:"Prometric login link", prometricLinkCopyHint:"Copy Prometric login link",
    dailyUsedTitle:"Codes used on a day", chooseUsedDate:"Choose a date", dailyUsedTotal:n=>"Total used: "+n, dailyUsedNone:"No codes were used on this date.",
    sharedSettingsTitle:"Shared Prometric settings", sharedSettingsDesc:"Administrators can change the account, password, and links for the team.", saveSharedSettings:"Save changes", notConfigured:"Not configured",
    invalidZoomUrl:"Enter a valid HTTPS Zoom link.", invalidPrometricUrl:"Enter a valid HTTPS Prometric link.", prometricLinkCopied:"Prometric login link copied",
    accountCopied:"Prometric Account — Copied", passwordCopied:"Prometric Password — Copied",
    copiedColon:code=>"Copied: "+code,
    movedTo:(title,cat)=>title+" moved to "+cat,
    total:"Total", copiedStat:"Copied", remainingStat:"Remaining",
    colCode:"Code", colDate:"Copy date / time", editUsedDate:"Usage date", colNotes:"Notes",
    addNewCodes:"+ Add new codes to this category",
    pasteHint:"Paste codes, one per line",
    addBtn:"Add",addCodesLabel:"New codes, one per line",
    newCodesAdded:n=>n+" new code(s) added",
    removeMark:"Remove mark", markRemoved:"Mark removed",
    deleteCode:"Delete code", codeDeleted:"Code deleted",
    deleteConfirmTitle:"Delete this item?", deleteBtn:"Delete",
    noCodesAvailable:cat=>"No codes available in "+cat,
    autoCopied:code=>"Auto-copied: "+code,
    noCodesYet:"No codes in this category yet — add some below",
    selected:n=>n+" selected",
    clear:"Clear", deleteSelected:"Delete Selected",
    confirmBulkDelete:n=>"Delete "+n+" selected code(s)? This cannot be undone.",
    codesDeleted:n=>n+" code(s) deleted",
    resetMarksTitle:"Usage marks",resetMarksHint:"This clears every used mark and its date. Download a backup first if you may need to restore them.",resetLink:"Reset all copy marks",
    confirmReset:"Reset all copy marks and dates? (The codes themselves will remain)",
    resetDone:"Reset done",
    notePlaceholder:"Note...",
    copiedGeneric:"Copied",
    moveUp:"Move up", moveDown:"Move down",
    confirmDeleteCode:code=>"Delete code \""+code+"\"? This cannot be undone.",
    recoveredCodes:n=>n+" code(s) recovered from an earlier version of this tool",
    addCategory:"+ Add category",
    categoryNameHint:"Give it a short, clear name — it'll also become a matching tab on the VOUCHERS page.",
    categoryNamePlaceholder:"Category name",
    categoryCodesHint:"Optional: paste codes for this category now, one per line (you can always add more later).",
    categoryExists:"That category already exists",
    categoryAdded:"Category added",
    addExam:"+ Add exam", examAdded:"Exam added", examRequired:"Enter an exam title and keycode", keycodeExists:"This keycode already exists",
    firstExamHint:"First exam (optional): enter its title and keycode, then choose the language and category.",
    removeCategory:"Remove category",
    confirmRemoveCategory:cat=>"Remove category \""+cat+"\"? Its exams will move back to their original category.",
    categoryRemoved:"Category removed",
    colTraineeName:"Trainee name", editBtn:"Edit", editCategory:"Edit category", editExam:"Edit exam", editCode:"Edit code", cancelBtn:"Cancel", invalidCodeEdit:"Enter a unique code and a date in DD/MM/YYYY format.", itemUpdated:"Changes saved", manageRecords:"Edit system data", manageRecordsDesc:"Choose a record here to edit it without adding controls to the daily work screen.",
    authBrandTagline:"Your team's workspace", authHeadline1:"Your codes, organized.", authHeadline2:"Your team, connected.",
    authEyebrow:"TRAINING & EXAM OPERATIONS",
    authIntro:"One place to manage codes and track their use, wherever you are.",
    authFeatureCodes:"Clearly track available and used codes", authFeatureTeam:"Shared data and individual access",
    authFeatureAccess:"Access from any internet-connected device", authFooter:"Simpler management. Clearer tracking.",
    authWelcome:"Welcome back", authSignIn:"Sign in", authSubtitle:"Sign in to keep your team's work moving.",
    authEmail:"Email address", authPassword:"Password", authPasswordPlaceholder:"Enter your password",
    authRememberMe:"Remember me",
    authAccessHelp:"Access is available to team members approved by an administrator.",
    authConnecting:"Connecting…", authInvalidInput:"Enter an email and a password of at least 8 characters.",
    authNotApproved:"Your account is not approved. Ask an administrator to add your email address.",
    authInvalidCredentials:"Invalid email or password.", authEmailNotConfirmed:"Confirm your email address before signing in.",
    authEmailLimit:"Too many emails were sent. Please try again later.", authAlreadyRegistered:"An account with this email already exists.",
    currentAccount:"Current account", accountMenu:"Account menu", adminRole:"Admin", userRole:"User", refresh:"Refresh", signOut:"Sign out",
    manageDataUsers:"Data management & backup", importLegacy:"Import old browser data", exportBackup:"Download backup",
    backupPrivacyHint:"The backup contains trainee and operational data. Store it privately.",
    newMemberEmail:"New user's email", addMember:"Approve user",
    memberRole:"Role",roleCopyOnly:"Copy codes only",roleOperator:"Operator",roleAdmin:"Administrator",memberInactive:"Inactive",memberActive:"Active",memberSave:"Save member",activityTitle:"Recent activity",activityEmpty:"No activity found.",
    auditInsert:"Added",auditUpdate:"Updated",auditDelete:"Deleted",auditCodes:"code",auditMembers:"team member",auditSettings:"system settings",auditSheets:"trainee worksheet",auditOwner:"Owner",auditUnknownUser:"User unavailable",auditUnknownSheet:"Worksheet unavailable",
    restoreTitle:"Restore a backup",restoreFile:"Choose a TrainFlow backup JSON file",restoreButton:"Restore data",restorePreview:n=>"This backup contains "+n+" codes. Restoring replaces current codes, shared settings, and any trainee sheets and supervisor balances included in the backup.",restoreDone:"Backup restored successfully.",restoreInvalid:"The backup file is invalid.",restoreConfirm:n=>"Restore the "+n+" codes in this backup, replacing current codes, shared settings, and any included trainee sheets and supervisor balances?",
    bulkImportTitle:"Import codes from a file",bulkImportCategory:"Category",bulkImportFile:"CSV or text file",bulkImportButton:"Import valid codes",exportCodesCsv:"Export codes CSV",bulkImportPreview:(valid,duplicates,invalid)=>valid+" new codes ready · "+duplicates+" duplicates skipped · "+invalid+" invalid rows",bulkImportDone:n=>n+" codes imported.",lowStockLabel:"Low-stock warning at or below",lowStockWarning:items=>"Low stock: "+items,saveBtn:"Save",
    dbConnected:"Connected to the database", saving:"Saving…", saved:"Saved to the database", refreshed:"Data refreshed",
    copyRecorded:"Code copied and marked as used", copyReserved:"Code reserved for your account, but copying failed. Click it to retry or remove the used mark.",
    codeNotFound:"Code not found. Refresh the data.", codeUsedByOther:"This code was used by someone else.",
    confirmCopyUsed:"This code was already used. Copy it again?", conflict:"Another user changed the data. The latest version has been loaded; please try again.",
    operationFailed:"Could not complete the operation: ", genericError:"An unexpected error occurred. Please try again.",
    duplicateCode:code=>"Code appears in more than one category: "+code,
    noLegacyData:"No old data was found in this browser. Open the new version in the browser you used before.",
    invalidLegacyData:"The old data format is invalid.",
    confirmImportLegacy:"Merge old codes, notes, and usage marks into the database? No cloud codes will be deleted.",
    legacyImported:"Old data merged. The original local copy was kept.",
    memberAdded:email=>email+" was approved and can create an account and confirm their email.",
    libraryLoadFailed:"Could not load the connection library. Check your internet connection and reload the page.",
    authStoryLabel:"About the application",
    codesExport:"Export vouchers",
    categoryNames:{Foundation:"Foundation",Master:"Master",BIS:"BIS",CYBP:"CYBP",Corporate:"Corporate"},
    languageNames:{Arabic:"Arabic",English:"English",العربية:"Arabic",الإنجليزية:"English"},
  },
  ar: {
    copyBtn:"نسخ", copyFailed:"تعذر النسخ. حاول مرة أخرى.", enterCredential:"أدخل القيمة أولًا.",
    sessionCredentials:"بيانات دخول Prometric موجودة مسبقًا لهذه الجلسة.",
    appTitle:"TrainFlow",skipToContent:"تجاوز التنقل إلى المحتوى",workspaceContent:"المحتوى الرئيسي",copyAccount:"نسخ حساب برومترك",copyPassword:"نسخ كلمة مرور برومترك",selectAllCodes:"تحديد جميع الأكواد",copyCode:code=>"نسخ الكود "+code,selectCode:code=>"تحديد الكود "+code,codeNote:code=>"ملاحظات الكود "+code,
    tabKeycodes:"مفاتيح الأكواد", tabPrometric:"بروميترك", tabCodes:"الفاوتشرات", tabInventory:"المخزون",
    sidebarOpen:"فتح القائمة الجانبية", sidebarClose:"إغلاق القائمة الجانبية", sidebarPages:"الصفحات", sidebarShrink:"تصغير القائمة إلى أيقونات", sidebarExpand:"توسيع القائمة الجانبية",
    codeDensityCompact:"عرض مدمج", codeDensityComfortable:"عرض مريح", codeExpandHeight:"توسيع الارتفاع", codeNormalHeight:"الارتفاع العادي", codeScrollToTop:"عرض من البداية (#1)", codeScrollToToday:"الذهاب لأكواد اليوم",
    inventoryIntro:"اللي معاك هو الأكواد غير المستخدمة في النظام. رصيد المشرف ينقص تلقائيًا عند إضافة أكواد جديدة.",
    inventoryWithYou:"معايا",inventoryWithSupervisor:"مع المشرف",inventoryNotSet:"لم يُحدد",
    inventoryUpdateTitle:"أرصدة المشرف",inventoryOpeningHint:"راجع رصيد كل فئة، ثم حدّد الرصيد الفعلي أو أضف أكوادًا جديدة.",inventoryCurrentBalance:n=>"الرصيد الحالي عند المشرف: "+n,inventoryCurrentQuantity:"عدد الأكواد الحالي عند المشرف",inventorySetCurrent:"حفظ الرصيد الحالي",inventorySetCurrentHint:"يستبدل الرصيد السابق بالعدد الفعلي.",inventoryPurchasedQuantity:"الأكواد الجديدة المشتراة",inventoryAddPurchased:"إضافتها إلى الرصيد",inventoryAddPurchasedHint:"يُضاف هذا العدد إلى رصيد المشرف الحالي.",
    inventoryCategory:"الفئة",inventoryAction:"الإجراء",inventoryQuantity:"عدد الأكواد",inventoryOpening:"تحديد الرصيد المبدئي",inventoryReplenish:"إضافة أكواد وصلت للشركة",inventoryCorrection:"تصحيح الرصيد",
    inventorySummaryTitle:"ملخص المخزون",inventoryMessageDate:date=>"التاريخ: "+date,inventoryMessageMine:"الأكواد معايا",inventoryMessageSupervisor:name=>"الأكواد مع "+name,inventoryMessageTotal:"إجمالي الأكواد",inventoryMessageOverall:"الإجمالي الكلي",inventorySupervisorFallback:"المشرف",
    inventoryMessageHint:"حدد الرصيد المبدئي لكل فئة حتى تكون أعداد التقرير دقيقة.",
    inventoryCopyMessage:"نسخ الرسالة",inventorySupervisorName:"اسم المشرف",inventorySupervisorNameInvalid:"اكتب اسم مشرف لا يزيد عن 100 حرف.",inventoryMessageLanguage:"لغة الرسالة",inventoryArabic:"العربية",inventoryEnglish:"الإنجليزية",
    inventoryStockNotSet:"حدد أولًا الرصيد المبدئي عند المشرف لهذه الفئة.",inventoryStockInsufficient:"رصيد المشرف في هذه الفئة لا يكفي.",inventoryInvalidChange:"أدخل عددًا صحيحًا غير سالب للأكواد.",inventorySaved:"تم تحديث رصيد المشرف.",inventoryMessageCopied:"تم نسخ رسالة المخزون.",inventoryCopyImage:"نسخ كصورة",inventoryImageCopied:"تم نسخ صورة كارت المخزون.",
    settingsTabExtensions:"الإضافات", extensionsIntro:"حمّل إضافات Chrome من هنا، ثم ثبّتها مرة واحدة في نفس ملف Chrome الذي تستخدم عليه البرنامج.", extensionPrometricTitle:"تسجيل Prometric", extensionPrometricDesc:"إنشاء حسابات المتدربين على Prometric وإرجاع اليوزر والباسورد إلى شيت المتدربين.", extensionPrometricDownload:"تحميل إضافة Prometric",    extensionsInstallTitle:"التثبيت في Google Chrome", extensionsInstallExtract:"فك ملف ZIP الذي حمّلته في مجلد ثابت.", extensionsInstallOpen:"افتح العنوان التالي في Chrome:", extensionsInstallDeveloper:"فعّل Developer mode، واضغط Load unpacked، ثم اختر المجلد بعد فك الضغط.", extensionsInstallReload:"أعد تحميل البرنامج وPrometric في نفس ملف Chrome. عطّل أي نسخة قديمة من الإضافة.",
    settingsTabReports:"أعمدة التقارير",
    settingsTitle:"الإعدادات", settingsTabProfile:"حسابي", settingsTabData:"بيانات النظام", settingsTabPrometric:"بروميترك", settingsTabInventory:"المخزون", settingsTabPreferences:"التفضيلات", settingsTabSync:"الفريق والتحديث",
    profileTitle:"حسابي", profileDesc:"غيّر اسمك أو بريد الدخول أو كلمة المرور.", profileName:"الاسم", profileLoginEmail:"اسم المستخدم (بريد الدخول)", saveName:"حفظ الاسم", changeEmail:"تغيير البريد", emailConfirmHint:"أكد البريد الجديد من رسالة التحقق قبل استخدامه للدخول.", currentPassword:"كلمة المرور الحالية", newPassword:"كلمة المرور الجديدة", confirmNewPassword:"تأكيد كلمة المرور الجديدة", changePassword:"تغيير كلمة المرور", profileNameSaved:"تم حفظ الاسم", profileEmailSent:"افتح بريدك الجديد وأكد التغيير. سيبقى دخولك الحالي فعالًا حتى التأكيد.", profilePasswordSaved:"تم تغيير كلمة المرور", profilePasswordMismatch:"كلمتا المرور الجديدتان غير متطابقتين.", profilePasswordShort:"استخدم كلمة مرور لا تقل عن 8 أحرف.", profileSameEmail:"أدخل بريدًا مختلفًا.", profileInvalidEmail:"أدخل بريدًا إلكترونيًا صحيحًا.",
    examTitleCol:"اسم الامتحان", langCol:"اللغة", keycodeCol:"مفتاح الكود", moveCategoryCol:"نقل الفئة",
    noExams:"لا توجد امتحانات في هذه الفئة",
    remaining:"متبقي",
    prometricAccount:"حساب بروميترك", prometricPassword:"كلمة مرور بروميترك",
    zoomMeeting:"رابط اجتماع زوم", prometricLoginLink:"رابط دخول بروميترك", prometricLinkCopyHint:"نسخ رابط دخول بروميترك",
    dailyUsedTitle:"الأكواد المستخدمة في يوم", chooseUsedDate:"اختر التاريخ", dailyUsedTotal:n=>"إجمالي الأكواد المستخدمة: "+n, dailyUsedNone:"لم تُستخدم أكواد في هذا التاريخ.",
    sharedSettingsTitle:"إعدادات بروميترك المشتركة", sharedSettingsDesc:"يستطيع المدير تعديل الحساب وكلمة المرور والروابط لجميع المستخدمين.", saveSharedSettings:"حفظ التغييرات", notConfigured:"غير مُعدّ",
    invalidZoomUrl:"أدخل رابط زوم صحيحًا يبدأ بـ HTTPS.", invalidPrometricUrl:"أدخل رابط بروميترك صحيحًا يبدأ بـ HTTPS.", prometricLinkCopied:"تم نسخ رابط دخول بروميترك",
    accountCopied:"تم نسخ حساب بروميترك", passwordCopied:"تم نسخ كلمة مرور بروميترك",
    copiedColon:code=>"تم نسخ الكود: "+code,
    movedTo:(title,cat)=>title+" نُقل إلى "+cat,
    total:"الإجمالي", copiedStat:"تم نسخه", remainingStat:"متبقي",
    colCode:"الكود", colDate:"تاريخ ووقت النسخ", editUsedDate:"تاريخ الاستخدام", colNotes:"ملاحظات",
    addNewCodes:"+ إضافة أكواد جديدة لهذه الفئة",
    pasteHint:"الصق الأكواد، كل كود في سطر منفصل",
    addBtn:"إضافة",addCodesLabel:"أكواد جديدة، كل كود في سطر",
    newCodesAdded:n=>n+" كود جديد تم إضافته",
    removeMark:"إلغاء العلامة", markRemoved:"تم إلغاء العلامة",
    deleteCode:"حذف الكود", codeDeleted:"تم حذف الكود",
    deleteConfirmTitle:"هل تريد حذف هذا العنصر؟", deleteBtn:"حذف",
    noCodesAvailable:cat=>"مفيش أكواد متاحة في "+cat,
    autoCopied:code=>"تم نسخ الكود تلقائيًا: "+code,
    noCodesYet:"لا توجد أكواد في هذه الفئة بعد — أضف أكواد من الأسفل",
    selected:n=>n+" محدد",
    clear:"إلغاء التحديد", deleteSelected:"حذف المحدد",
    confirmBulkDelete:n=>"حذف "+n+" كود محدد؟ الإجراء ده مش هينفع يتراجع فيه.",
    codesDeleted:n=>"تم حذف "+n+" كود",
    resetMarksTitle:"علامات الاستخدام",resetMarksHint:"هذا الإجراء يمسح كل علامات الاستخدام وتواريخها. نزّل نسخة احتياطية أولًا إذا قد تحتاج لاسترجاعها.",resetLink:"تصفير كل علامات النسخ",
    confirmReset:"تصفير كل علامات النسخ والتواريخ؟ (الأكواد نفسها هتفضل موجودة)",
    resetDone:"تم التصفير",
    notePlaceholder:"اكتب ملاحظة...",
    copiedGeneric:"تم النسخ",
    moveUp:"تحريك لأعلى", moveDown:"تحريك لأسفل",
    confirmDeleteCode:code=>"حذف الكود \""+code+"\"؟ الإجراء ده مش هينفع يتراجع فيه.",
    recoveredCodes:n=>"تم استرجاع "+n+" كود من نسخة سابقة من الأداة",
    addCategory:"+ إضافة فئة",
    categoryNameHint:"اكتب اسم قصير وواضح — هيظهر كمان تاب جديد في صفحة VOUCHERS.",
    categoryNamePlaceholder:"اسم الفئة",
    categoryCodesHint:"اختياري: الصق أكواد للفئة دي دلوقتي، كل كود في سطر (تقدر تضيف المزيد بعدين برضه).",
    categoryExists:"الفئة دي موجودة بالفعل",
    categoryAdded:"تم إضافة الفئة",
    addExam:"+ إضافة امتحان", examAdded:"تم إضافة الامتحان", examRequired:"أدخل اسم الامتحان ومفتاح الكود", keycodeExists:"مفتاح الكود موجود بالفعل",
    firstExamHint:"أول امتحان (اختياري): أدخل اسمه ومفتاح الكود، وحدد اللغة والفئة.",
    removeCategory:"حذف الفئة",
    confirmRemoveCategory:cat=>"حذف فئة \""+cat+"\"؟ الامتحانات اللي جواها هترجع لفئتها الأصلية.",
    categoryRemoved:"تم حذف الفئة",
    colTraineeName:"اسم المتدرب", editBtn:"تعديل", editCategory:"تعديل الفئة", editExam:"تعديل الامتحان", editCode:"تعديل الكود", cancelBtn:"إلغاء", invalidCodeEdit:"أدخل كودًا غير مكرر، واكتب التاريخ بصيغة يوم/شهر/سنة.", itemUpdated:"تم حفظ التعديل", manageRecords:"تعديل بيانات النظام", manageRecordsDesc:"اختر البيانات المطلوب تعديلها هنا، بعيدًا عن شاشة العمل اليومية.",
    authBrandTagline:"مساحة عمل فريقك", authHeadline1:"أكوادك منظّمة.", authHeadline2:"وفريقك على اتصال.",
    authEyebrow:"عمليات التدريب والاختبارات",
    authIntro:"مساحة واحدة لإدارة الأكواد ومتابعة استخدامها، أينما كنت.",
    authFeatureCodes:"متابعة واضحة للأكواد المتاحة والمستخدمة", authFeatureTeam:"بيانات مشتركة وصلاحيات لكل مستخدم",
    authFeatureAccess:"وصول من أي جهاز متصل بالإنترنت", authFooter:"إدارة أبسط. متابعة أوضح.",
    authWelcome:"مرحبًا بعودتك", authSignIn:"تسجيل الدخول", authSubtitle:"ادخل إلى حسابك لمتابعة أعمال فريقك.",
    authEmail:"البريد الإلكتروني", authPassword:"كلمة المرور", authPasswordPlaceholder:"أدخل كلمة المرور",
    authRememberMe:"تذكرني",
    authAccessHelp:"الوصول متاح للحسابات المعتمدة من مدير الفريق.",
    authConnecting:"جارٍ الاتصال…", authInvalidInput:"أدخل البريد وكلمة مرور من 8 أحرف على الأقل.",
    authNotApproved:"حسابك غير معتمد. اطلب من المدير إضافة بريدك إلى المستخدمين.",
    authInvalidCredentials:"البريد الإلكتروني أو كلمة المرور غير صحيحين.", authEmailNotConfirmed:"أكّد بريدك الإلكتروني قبل تسجيل الدخول.",
    authEmailLimit:"تم تجاوز حد رسائل البريد الإلكتروني. حاول مرة أخرى لاحقًا.", authAlreadyRegistered:"يوجد حساب مسجل بهذا البريد الإلكتروني.",
    currentAccount:"الحساب الحالي", accountMenu:"قائمة الحساب", adminRole:"مدير", userRole:"مستخدم", refresh:"تحديث", signOut:"تسجيل الخروج",
    manageDataUsers:"إدارة البيانات والنسخ الاحتياطي", importLegacy:"استيراد بيانات المتصفح القديمة", exportBackup:"تنزيل نسخة احتياطية",
    backupPrivacyHint:"النسخة تحتوي على بيانات المتدربين وبيانات التشغيل. احفظها في مكان خاص.",
    newMemberEmail:"بريد مستخدم جديد", addMember:"اعتماد المستخدم",
    memberRole:"الصلاحية",roleCopyOnly:"نسخ الأكواد فقط",roleOperator:"مشغّل",roleAdmin:"مدير",memberInactive:"معطّل",memberActive:"نشط",memberSave:"حفظ المستخدم",activityTitle:"آخر النشاطات",activityEmpty:"لا يوجد نشاط مسجل.",
    auditInsert:"إضافة",auditUpdate:"تعديل",auditDelete:"حذف",auditCodes:"كود",auditMembers:"مستخدم",auditSettings:"إعدادات النظام",auditSheets:"جدول المتدربين",auditOwner:"صاحب الجدول",auditUnknownUser:"مستخدم غير متاح",auditUnknownSheet:"جدول غير متاح",
    restoreTitle:"استعادة نسخة احتياطية",restoreFile:"اختر ملف نسخة TrainFlow بصيغة JSON",restoreButton:"استعادة البيانات",restorePreview:n=>"النسخة تحتوي على "+n+" كود. الاستعادة ستستبدل الأكواد والإعدادات المشتركة، وجداول المتدربين وأرصدة المشرف الموجودة في النسخة.",restoreDone:"تمت استعادة النسخة الاحتياطية.",restoreInvalid:"ملف النسخة الاحتياطية غير صالح.",restoreConfirm:n=>"استعادة "+n+" كود واستبدال الأكواد والإعدادات المشتركة، وجداول المتدربين وأرصدة المشرف الموجودة في النسخة؟",
    bulkImportTitle:"استيراد أكواد من ملف",bulkImportCategory:"الفئة",bulkImportFile:"ملف CSV أو نص",bulkImportButton:"استيراد الأكواد الصالحة",exportCodesCsv:"تصدير الأكواد CSV",bulkImportPreview:(valid,duplicates,invalid)=>valid+" كود جديد جاهز · "+duplicates+" مكرر تم تجاهله · "+invalid+" صف غير صالح",bulkImportDone:n=>"تم استيراد "+n+" كود.",lowStockLabel:"تنبيه انخفاض الرصيد عند",lowStockWarning:items=>"رصيد منخفض: "+items,saveBtn:"حفظ",
    dbConnected:"متصل بقاعدة البيانات", saving:"جارٍ الحفظ…", saved:"تم الحفظ في قاعدة البيانات", refreshed:"تم تحديث البيانات",
    copyRecorded:"تم نسخ الكود وتسجيل استخدامه", copyReserved:"تم حجز الكود لحسابك لكن النسخ فشل. اضغط عليه لإعادة النسخ أو ألغِ علامة الاستخدام.",
    codeNotFound:"الكود غير موجود. حدّث البيانات.", codeUsedByOther:"هذا الكود مستخدم بواسطة شخص آخر.",
    confirmCopyUsed:"هذا الكود مستخدم بالفعل. هل تريد نسخه مرة أخرى؟", conflict:"تغيّرت البيانات بواسطة مستخدم آخر. تم تحميل أحدث نسخة؛ أعد تنفيذ التعديل.",
    operationFailed:"تعذر إكمال العملية: ", genericError:"حدث خطأ غير متوقع. حاول مرة أخرى.",
    duplicateCode:code=>"الكود موجود في أكثر من فئة: "+code,
    noLegacyData:"لا توجد بيانات قديمة في هذا المتصفح. افتح النسخة الجديدة في المتصفح الذي استخدمت فيه البرنامج سابقًا.",
    invalidLegacyData:"صيغة البيانات القديمة غير صحيحة.",
    confirmImportLegacy:"دمج الأكواد القديمة والملاحظات وعلامات الاستخدام مع قاعدة البيانات؟ لن تُحذف أي أكواد سحابية.",
    legacyImported:"تم دمج البيانات القديمة. النسخة المحلية الأصلية محفوظة.",
    memberAdded:email=>"تم اعتماد "+email+"؛ يستطيع إنشاء حسابه وتأكيد بريده.",
    libraryLoadFailed:"تعذر تحميل مكتبة الاتصال. تحقق من الإنترنت ثم أعد تحميل الصفحة.",
    authStoryLabel:"عن البرنامج",
    codesExport:"تصدير الأكواد",
    categoryNames:{Foundation:"Foundation",Master:"Master",BIS:"BIS",CYBP:"CYBP",Corporate:"Corporate"},
    languageNames:{Arabic:"العربية",English:"الإنجليزية",العربية:"العربية",الإنجليزية:"الإنجليزية"},
  }
};
let currentLang = window.IBTA_START_LANGUAGE || 'ar';
function t(key){ return TRANSLATIONS[currentLang][key]; }

// ---------- DATA ----------
const CATEGORY_ORDER = ["Foundation","Master","BIS","Corporate","CYBP"];
const CATEGORY_LINK = {"Foundation":"Foundation-100","Master":"Master-10","BIS":"BIS-40","Corporate":"Corporate","CYBP":"CYBP-5"};

function sortCategories(cats){
  if(!Array.isArray(cats))return [];
  const order=["Foundation","Master","BIS","Corporate","CYBP"];
  return [...cats].sort((a,b)=>{
    const cleanA=String(a||'').replace(/-\d+$/,''),cleanB=String(b||'').replace(/-\d+$/,'');
    const isCybA=cleanA.toUpperCase()==='CYBP',isCybB=cleanB.toUpperCase()==='CYBP';
    if(isCybA&&!isCybB)return 1;
    if(!isCybA&&isCybB)return -1;
    const idxA=order.indexOf(cleanA),idxB=order.indexOf(cleanB);
    if(idxA!==-1&&idxB!==-1)return idxA-idxB;
    if(idxA!==-1)return -1;
    if(idxB!==-1)return 1;
    return String(a).localeCompare(String(b));
  });
}
// Display-only helper: strips the trailing "-NN" quota number from a codes category
// key so the user sees "Foundation" instead of "Foundation-100". The full key (with
// the number) is still used internally for all state lookups — only the label changes.
function displayCatName(cat){
  const name=cat.replace(/-\d+$/, '');
  if(CATEGORY_ORDER.includes(name))return name;
  return state?.categoryLabels?.[cat] || state?.categoryLabels?.[name] || t('categoryNames')[name] || name;
}

let DEFAULT_KEYCODES = [];
let PROMETRIC_ACCOUNT = '', PROMETRIC_PASSWORD = '', ZOOM_URL = '', PROMETRIC_LOGIN_URL = '';
async function saveState(){ return Cloud.persist(); }
let state = {usedCodes:{},codesByCategory:{},categoryLabels:{},keycodeOverrides:{},dateColors:{},settings:{},codeNotes:{},uiLang:currentLang,categoryOrder:[],keycodeOrder:{}};
function getLinkedCodesCat(cat){
  return CATEGORY_LINK[cat] || cat;
}
function fillManageSelect(id,entries){
  const select=document.getElementById(id),selected=select.value;
  window.WorkspaceViews.options(select,{options:entries.map(([value,label])=>({value,label}))});
  if(entries.some(([value])=>value===selected))select.value=selected;
  else select.value=entries[0]?.[0] || '';
}
function renderManageData(){
  fillManageSelect('manage-category',sortCategories(state.categoryOrder).map(cat=>[cat,displayCatName(cat)]));
  fillManageSelect('manage-exam',DEFAULT_KEYCODES.map(item=>[item.code,displayCatName(state.keycodeOverrides[item.code] || item.category)+' · '+item.title+' · '+item.code]));
  fillManageSelect('manage-code-category',sortCategories(Object.keys(state.codesByCategory)).map(cat=>[cat,displayCatName(cat)]));
  const cat=document.getElementById('manage-code-category').value;
  fillManageSelect('manage-code',(state.codesByCategory[cat] || []).map(code=>[code,code]));
  document.getElementById('manage-exam-edit').disabled=!DEFAULT_KEYCODES.length;
  document.getElementById('manage-code-edit').disabled=!(state.codesByCategory[cat] || []).length;
  fillManageSelect('bulk-import-category',sortCategories(Object.keys(state.codesByCategory)).map(cat=>[cat,displayCatName(cat)]));
}
document.getElementById('manage-code-category').addEventListener('change',renderManageData);
document.getElementById('manage-category-edit').addEventListener('click',()=>openEdit('category',document.getElementById('manage-category').value));
document.getElementById('manage-exam-edit').addEventListener('click',()=>{
  const item=DEFAULT_KEYCODES.find(item=>item.code===document.getElementById('manage-exam').value);if(item)openEdit('exam',item);
});
document.getElementById('manage-code-edit').addEventListener('click',()=>{
  const code=document.getElementById('manage-code').value;if(code)openEdit('code',code);
});
let editTarget=null;
function openEdit(kind,target){
  editTarget={kind,target};
  const dialog=document.getElementById('edit-dialog');
  const isCategory=kind==='category',isExam=kind==='exam';
  document.getElementById('edit-heading').textContent=t(isCategory?'editCategory':isExam?'editExam':'editCode');
  document.getElementById('edit-name-field').hidden=!isCategory;
  document.getElementById('edit-title-field').hidden=!isExam;
  document.getElementById('edit-language-field').hidden=!isExam;
  document.getElementById('edit-code-field').hidden=isCategory;
  document.getElementById('edit-category-field').hidden=isCategory;
  document.getElementById('edit-date-field').hidden=kind!=='code';
  document.getElementById('edit-notes-field').hidden=kind!=='code';
  document.getElementById('edit-code').required=!isCategory;
  document.getElementById('edit-code-label').textContent=t(isExam?'keycodeCol':'colCode');
  document.getElementById('edit-name').value=isCategory?displayCatName(target):'';
  document.getElementById('edit-title').value=isExam?target.title:'';
  document.getElementById('edit-language').value=isExam?target.lang:'English';
  [...document.getElementById('edit-language').options].forEach(option=>option.textContent=t('languageNames')[option.value]);
  document.getElementById('edit-code').value=isCategory?'':isExam?target.code:target;
  document.getElementById('edit-date').value=kind==='code'?(state.usedCodes[target] || ''):'';
  document.getElementById('edit-notes').value=kind==='code'?(state.codeNotes[target] || ''):'';
  const select=document.getElementById('edit-category');
  window.WorkspaceViews.options(select,{options:(isExam?state.categoryOrder:Object.keys(state.codesByCategory)).map(value=>({value,label:displayCatName(value)}))});
  if(!isCategory) select.value=isExam?(state.keycodeOverrides[target.code] || target.category):Object.keys(state.codesByCategory).find(cat=>state.codesByCategory[cat].includes(target));
  dialog.showModal();
}
document.getElementById('edit-cancel').addEventListener('click',()=>document.getElementById('edit-dialog').close());
document.getElementById('edit-form').addEventListener('submit',async e=>{
  e.preventDefault();
  if(!editTarget)return;
  const {kind,target}=editTarget,code=document.getElementById('edit-code').value.trim(),cat=document.getElementById('edit-category').value;
  let saved=false;
  if(kind==='category'){
    const name=document.getElementById('edit-name').value.trim();
    if(!name || state.categoryOrder.some(other=>other!==target && displayCatName(other).toLowerCase()===name.toLowerCase())){showToast(t('categoryExists'));return;}
    state.categoryLabels[target]=name;
    saved=await saveState();
  }else if(kind==='exam'){
    const title=document.getElementById('edit-title').value.trim();
    if(!title || !code){showToast(t('examRequired'));return;}
    if(DEFAULT_KEYCODES.some(item=>item!==target && item.code.toLowerCase()===code.toLowerCase())){showToast(t('keycodeExists'));return;}
    const oldCode=target.code;
    target.title=title;target.lang=document.getElementById('edit-language').value;target.code=code;target.category=cat;
    delete state.keycodeOverrides[oldCode];
    Object.values(state.keycodeOrder).forEach(order=>{const i=order.indexOf(oldCode);if(i!==-1)order.splice(i,1);});
    saved=await saveState();
  }else{
    const date=document.getElementById('edit-date').value.trim();
    const notes=document.getElementById('edit-notes').value.trim();
    saved=await Cloud.editCode(target,code,cat,date,notes);
  }
  if(saved){document.getElementById('edit-dialog').close();editTarget=null;renderKeycodes();renderCodeTabs();renderCodeGrid();renderManageData();showToast(t('itemUpdated'));}
});
state.categoryOrder.forEach(c=>{
  const linked = getLinkedCodesCat(c);
  if(!state.codesByCategory[linked]) state.codesByCategory[linked] = [];
});
if(!state.keycodeOrder) state.keycodeOrder = {};
currentLang = state.uiLang;
let selectedCodes = new Set();
let draggedKcCode = null;
let draggedKcCat = null;

function getOrderedKeycodeItems(cat, items){
  const order = state.keycodeOrder[cat];
  if(!order || !order.length) return items;
  const byCode = {};
  items.forEach(it=>byCode[it.code]=it);
  const ordered = [];
  order.forEach(code=>{
    if(byCode[code]){ ordered.push(byCode[code]); delete byCode[code]; }
  });
  items.forEach(it=>{ if(byCode[it.code]) ordered.push(it); });
  return ordered;
}

// Clear, unmistakable day colors: red, green, blue, yellow first, then more vivid hues to cycle through.
// Matches the spreadsheet's own highlight-color style (Excel-like fills):
// yellow, red, purple, dark green, maroon, blue, salmon/pink, teal, orange, light green, gray, gold.
const DAY_COLOR_PALETTE = ["#FFC000","#FF0000","#7030A0","#375623","#C00000","#0070C0","#FF99CC","#00B0A0","#ED7D31","#92D050","#7F7F7F","#FFD966"];
function getDayColors(){
  // Every category shares the same ordered set of used days. Keep existing
  // colors where possible, but repair a collision with the preceding used day.
  const dates = [...new Set(Object.values(state.usedCodes).filter(Boolean))];
  const dayNumber = dateStr=>{
    const date = parseAnyDateString(dateStr);
    return date ? Date.UTC(date.year, date.month - 1, date.day) : 0;
  };
  dates.sort((a,b)=>dayNumber(a)-dayNumber(b) || a.localeCompare(b));
  const colors = {};
  let previousColor = '';
  dates.forEach(dateStr=>{
    const saved = state.dateColors?.[dateStr];
    const hash = [...dateStr].reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,0);
    let color = typeof saved === 'string' && /^#[0-9a-f]{6}$/i.test(saved)
      ? saved.toUpperCase() : DAY_COLOR_PALETTE[hash % DAY_COLOR_PALETTE.length];
    if(color === previousColor){
      const start = DAY_COLOR_PALETTE.indexOf(color);
      color = DAY_COLOR_PALETTE[(start + 1 + DAY_COLOR_PALETTE.length) % DAY_COLOR_PALETTE.length];
    }
    colors[dateStr] = color;
    previousColor = color;
  });
  return colors;
}

// Picks black or white text so it stays readable against a solid fill of any color
// in the palette — same idea as Excel auto-contrasting text on a colored cell fill.
function getContrastText(hex){
  const h = hex.replace('#','');
  const r = parseInt(h.substring(0,2),16), g = parseInt(h.substring(2,4),16), b = parseInt(h.substring(4,6),16);
  const luminance = (0.299*r + 0.587*g + 0.114*b) / 255;
  return luminance > 0.6 ? '#1A1A1A' : '#FFFFFF';
}
function todayStr(){
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{
    timeZone:'Asia/Riyadh',day:'2-digit',month:'2-digit',year:'numeric'
  }).formatToParts(new Date()).map(part=>[part.type,part.value]));
  return formatEnglishDate(parts.day,parts.month,parts.year);
}
function codeCopyTime(iso){
  if(!iso)return '';
  const date=new Date(iso);
  if(Number.isNaN(date.getTime()))return '';
  return new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Riyadh',hour:'2-digit',minute:'2-digit',hour12:false}).format(date);
}

// ---------- Unified English-numeral date formatting ----------
const ARABIC_DIGITS = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
function toWesternDigits(str){
  return String(str).replace(/[٠-٩]/g, d => ARABIC_DIGITS.indexOf(d));
}
function formatEnglishDate(day, month, year){
  const pad = n => String(n).padStart(2,'0');
  return `${pad(day)}/${pad(month)}/${year}`;
}
// Parses either DD/MM/YYYY or YYYY/MM/DD (Western or Arabic-Indic digits) — formats
// this tool has produced across earlier versions — using the 4-digit year
// (always > 31) to detect which slot is the year, regardless of position.
function parseAnyDateString(str){
  const western = toWesternDigits(str);
  const parts = western.split('/').map(p=>parseInt(p,10));
  if(parts.length !== 3 || parts.some(isNaN)) return null;
  let day, month, year;
  if(parts[0] > 31){ year = parts[0]; month = parts[1]; day = parts[2]; }
  else { day = parts[0]; month = parts[1]; year = parts[2]; }
  return { day, month, year };
}
function normalizeAllDates(){
  let changed = false;
  const newUsedCodes = {};
  for(const code in state.usedCodes){
    const raw = state.usedCodes[code];
    const parsed = parseAnyDateString(raw);
    const formatted = parsed ? formatEnglishDate(parsed.day, parsed.month, parsed.year) : raw;
    if(formatted !== raw) changed = true;
    newUsedCodes[code] = formatted;
  }
  state.usedCodes = newUsedCodes;

  const newDateColors = {};
  for(const key in state.dateColors){
    const parsed = parseAnyDateString(key);
    const newKey = parsed ? formatEnglishDate(parsed.day, parsed.month, parsed.year) : key;
    if(newKey !== key) changed = true;
    if(!newDateColors[newKey]) newDateColors[newKey] = state.dateColors[key];
  }
  state.dateColors = newDateColors;

  // Date normalization is persisted only by an explicit import or edit.
}
normalizeAllDates();

// ---------- TOAST ----------
let toastTimer;
function showToast(msg){
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>{el.classList.remove('show');el.textContent='';}, 5000);
}
function confirmDelete(message){
  const dialog=document.getElementById('delete-dialog');
  document.getElementById('delete-dialog-message').textContent=message;
  dialog.showModal();
  return new Promise(resolve=>{
    const done=answer=>{dialog.close();resolve(answer);};
    document.getElementById('delete-cancel').onclick=()=>done(false);
    document.getElementById('delete-confirm').onclick=()=>done(true);
    dialog.oncancel=e=>{e.preventDefault();done(false);};
  });
}
async function copyText(text){
  try{
    if(navigator.clipboard && navigator.clipboard.writeText){
      await navigator.clipboard.writeText(text);
      return true;
    }
  }catch(e){}
  if(fallbackCopy(text)) return true;
  showToast(t('copyFailed'));
  return false;
}
function fallbackCopy(text){
  const focused = document.activeElement;
  const ta = document.createElement('textarea');
  ta.value = text; ta.style.position='fixed'; ta.style.opacity='0';
  document.body.appendChild(ta); ta.select();
  try{ return document.execCommand('copy') === true; }
  catch(e){ return false; }
  finally{
    document.body.removeChild(ta);
    if(focused && focused.focus) focused.focus();
  }
}

// ---------- LANGUAGE ----------
function applyLanguage(){
  const html = document.getElementById('html-root');
  html.lang = currentLang;
  html.dir = currentLang === 'ar' ? 'rtl' : 'ltr';
  const authBox = document.getElementById('auth-box');
  authBox.lang = currentLang;
  authBox.dir = html.dir;
  document.querySelector('.auth-story').setAttribute('aria-label',t('authStoryLabel'));
  document.body.classList.toggle('lang-ar', currentLang === 'ar');
  document.getElementById('doc-title').textContent = t('appTitle');
  document.title = t('appTitle');
  document.getElementById('lang-btn').textContent = currentLang === 'en' ? 'AR' : 'EN';
  document.getElementById('auth-lang-btn').textContent = currentLang === 'en' ? 'AR' : 'EN';
  document.getElementById('settings-btn').title = t('settingsTitle');
  document.getElementById('settings-tabs').setAttribute('aria-label',t('settingsTitle'));
  document.getElementById('account-menu-btn').title = t('accountMenu');
  document.getElementById('account-menu-btn').setAttribute('aria-label',t('accountMenu'));
  document.getElementById('prometric-login-card').setAttribute('aria-label',t('prometricLinkCopyHint'));
  document.getElementById('cred-account').setAttribute('aria-label',t('copyAccount'));
  document.getElementById('cred-password').setAttribute('aria-label',t('copyPassword'));
  document.getElementById('select-all-codes').setAttribute('aria-label',t('selectAllCodes'));
  document.getElementById('add-codes-input').setAttribute('aria-label',t('addCodesLabel'));
  document.getElementById('workspace-main').setAttribute('aria-label',t('workspaceContent'));
  document.querySelectorAll('[data-i18n]').forEach(el=>{
    el.textContent = t(el.dataset.i18n);
  });
  document.getElementById('add-codes-input').placeholder = 'IBTAMEAF-XXXX-XXXX';
  document.getElementById('auth-password').placeholder = t('authPasswordPlaceholder');
  if(typeof VoucherColumns!=='undefined')VoucherColumns.translate();
  Cloud.translateUi();
  if(typeof Trainees!=='undefined')Trainees.translate();
  if(typeof TraineeReports!=='undefined')TraineeReports.translate();
  renderKeycodes();
  renderCodeTabs();
  renderCodeGrid();
  const scrollLabel=document.getElementById('code-scroll-label');
  if(scrollLabel)scrollLabel.textContent=t('codeScrollToTop');
  renderManageData();
  if(typeof renderInventory==='function')renderInventory();
  if(typeof renderMemberList==='function' && document.getElementById('admin-tools').open)renderMemberList();
  if(typeof renderAuditList==='function' && document.getElementById('audit-details').open)renderAuditList();
  updateSettingsProfileHero();
  updateSidebar();
}
function toggleLanguage(){
  currentLang = currentLang === 'en' ? 'ar' : 'en';
  state.uiLang = currentLang;
  try{
    const prefs=JSON.parse(localStorage.getItem('ibta_ui_preferences') || '{}') || {};
    localStorage.setItem('ibta_ui_preferences',JSON.stringify({...prefs,uiLang:currentLang}));
  }catch{}
  applyLanguage();
}
document.getElementById('lang-btn').addEventListener('click',toggleLanguage);
document.getElementById('auth-lang-btn').addEventListener('click',toggleLanguage);

// =============================================
// SIDEBAR — open / closed / compact state
// =============================================

function setSidebarOpen(open, persist = false) {
  if (!open) closeAccountMenu();
  window.IBTA_SIDEBAR_OPEN = Boolean(open);
  document.getElementById('html-root').dataset.sidebar = open ? 'open' : 'closed';
  if (persist) {
    try { localStorage.setItem('trainflow_sidebar_open', open ? '1' : '0'); } catch {}
  }
  updateSidebar();
}

function updateSidebar() {
  const open       = Boolean(window.IBTA_SIDEBAR_OPEN);
  const compact    = Boolean(window.IBTA_SIDEBAR_COMPACT);
  const toggle     = document.getElementById('sidebar-toggle');
  const sidebar    = document.getElementById('workspace-sidebar');
  const sizeButton = document.getElementById('sidebar-compact');
  const backdrop   = document.getElementById('sidebar-backdrop');
  const dock       = document.getElementById('sidebar-toggle-dock');

  // Keep the same control reachable when its sidebar is hidden or inert.
  const toggleHost = open ? document.getElementById('sidebar-controls') : dock;
  if (toggle.parentElement !== toggleHost) toggleHost.appendChild(toggle);
  dock.hidden = open;

  // Toggle button
  toggle.setAttribute('aria-expanded', String(open));
  toggle.title = t(open ? 'sidebarClose' : 'sidebarOpen');
  toggle.setAttribute('aria-label', toggle.title);

  // Sidebar panel
  sidebar.inert = !open;
  sidebar.setAttribute('aria-label', t('sidebarPages'));
  const mobileDrawer = open && !compact && window.matchMedia('(max-width:760px)').matches;
  document.getElementById('workspace-main').inert = mobileDrawer;

  // Tab labels
  document.querySelector('nav.tabs').setAttribute('aria-label', t('sidebarPages'));
  document.querySelectorAll('nav.tabs [data-tab]').forEach(button => {
    const label = button.querySelector('span')?.textContent || '';
    button.title = label;
    button.setAttribute('aria-label', label);
  });

  // Compact / expand size button
  sizeButton.title = t(compact ? 'sidebarExpand' : 'sidebarShrink');
  sizeButton.setAttribute('aria-label', sizeButton.title);
  sizeButton.setAttribute('aria-expanded', String(!compact));

  // Mobile backdrop
  if (backdrop) {
    backdrop.setAttribute('aria-label', t('sidebarClose'));
    backdrop.hidden = !mobileDrawer;
  }
  if (mobileDrawer && !document.getElementById('app').hidden && !sidebar.contains(document.activeElement)) toggle.focus();
  positionAccountMenu();
}

document.addEventListener('keydown', e => {
  if (e.key !== 'Tab' || e.defaultPrevented || document.getElementById('app').hidden || document.getElementById('sidebar-backdrop').hidden || document.querySelector('dialog[open]')) return;
  const sidebar = document.getElementById('workspace-sidebar');
  const controls = [...sidebar.querySelectorAll('button:not(:disabled),a[href]')].filter(el => el.getClientRects().length);
  const first = controls[0], last = controls[controls.length - 1];
  if (e.shiftKey && document.activeElement === first || !e.shiftKey && document.activeElement === last || !sidebar.contains(document.activeElement)) {
    e.preventDefault();
    (e.shiftKey ? last : first).focus();
  }
});

// Compact toggle
document.getElementById('sidebar-compact').addEventListener('click', () => {
  window.IBTA_SIDEBAR_COMPACT = !window.IBTA_SIDEBAR_COMPACT;
  document.getElementById('html-root').dataset.sidebarSize = window.IBTA_SIDEBAR_COMPACT ? 'compact' : 'expanded';
  try { localStorage.setItem('trainflow_sidebar_compact', window.IBTA_SIDEBAR_COMPACT ? '1' : '0'); } catch {}
  updateSidebar();
});

// Open / close via toggle button
document.getElementById('sidebar-toggle').addEventListener('click', () => {
  setSidebarOpen(!window.IBTA_SIDEBAR_OPEN, true);
  document.getElementById('sidebar-toggle').focus();
});

// Close via mobile backdrop tap
document.getElementById('sidebar-backdrop')?.addEventListener('click', () => {
  setSidebarOpen(false, true);
  document.getElementById('sidebar-toggle')?.focus();
});

// Re-evaluate backdrop visibility on resize
window.addEventListener('resize', updateSidebar);

// Close sidebar with Escape key (unless a dialog is open)
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !e.defaultPrevented && window.IBTA_SIDEBAR_OPEN && document.getElementById('account-menu-popover').hidden && !document.querySelector('dialog[open],.sheet-command-popover:popover-open') && !document.body.classList.contains('sheet-expanded-open')) {
    setSidebarOpen(false, true);
    document.getElementById('sidebar-toggle').focus();
  }
});

updateSidebar();

// =============================================
// WORKSPACE VIEW — persist & restore panel
// =============================================

const SETTINGS_TAB_IDS = ['profile', 'data', 'prometric', 'inventory', 'extensions', 'reports', 'sync'];

function workspaceView() {
  try {
    return JSON.parse(localStorage.getItem('ibta_workspace_view:' + Cloud.userId()) || '{}') || {};
  } catch { return {}; }
}

function rememberWorkspaceView(change) {
  if (!Cloud.userId()) return;
  try {
    localStorage.setItem(
      'ibta_workspace_view:' + Cloud.userId(),
      JSON.stringify({ ...workspaceView(), ...change })
    );
  } catch {}
}

async function restoreWorkspaceView() {
  if (document.readyState === 'loading') {
    await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve, { once: true }));
  }
  const saved   = workspaceView();
  const view    = { panel: 'trainees', ...saved, ...(window.TRAINFLOW_ROUTE_VIEW?.() || {}) };
  const valid   = ['keycodes', 'prometric', 'codes', 'inventory', 'trainees', 'settings'];
  if (!valid.includes(view.panel)) return;

  await showPanel(view.panel);
  if (view.panel === 'settings') activateSettingsTab(view.settingsTab || 'profile');
  if (saved.panel === view.panel && Number.isFinite(view.pageTop) && view.pageTop >= 0) {
    window.scrollTo(0, Math.min(view.pageTop, 10000000));
  }
}

function saveWorkspaceScroll() {
  const app = document.getElementById('app');
  if (!app.hidden && !app.classList.contains('workspace-restoring')) {
    rememberWorkspaceView({ pageTop: window.scrollY });
  }
}

let workspaceScrollTimer;
window.addEventListener('scroll', () => {
  clearTimeout(workspaceScrollTimer);
  workspaceScrollTimer = setTimeout(saveWorkspaceScroll, 200);
}, { passive: true });
window.addEventListener('beforeunload', saveWorkspaceScroll);
window.addEventListener('pagehide',     saveWorkspaceScroll);

// =============================================
// SETTINGS PANEL — profile hero & tab routing
// =============================================

function updateSettingsProfileHero() {
  const avatar  = document.getElementById('settings-hero-avatar');
  const nameEl  = document.getElementById('settings-hero-name');
  const emailEl = document.getElementById('settings-hero-email');
  const roleEl  = document.getElementById('settings-hero-role');
  if (!avatar || !nameEl || !emailEl || !roleEl) return;

  avatar.textContent  = document.getElementById('account-avatar')?.textContent || 'TF';
  nameEl.textContent  = document.getElementById('account-menu-name')?.textContent  || (typeof t === 'function' ? t('currentAccount') : 'الحساب الحالي');
  emailEl.textContent = document.getElementById('account-menu-email')?.textContent || '';

  const role    = typeof Cloud !== 'undefined' && Cloud.role ? Cloud.role() : 'admin';
  const roleKey = role === 'admin' ? 'roleAdmin' : role === 'operator' ? 'roleOperator' : 'roleCopyOnly';
  roleEl.textContent = (typeof t === 'function' ? t(roleKey) : '') || role;
}

function activateSettingsTab(id) {
  if (!SETTINGS_TAB_IDS.includes(id) || document.getElementById('settings-tab-' + id).hidden) {
    id = 'profile';
  }
  SETTINGS_TAB_IDS.forEach(tabId => {
    const button = document.getElementById('settings-tab-' + tabId);
    const active = tabId === id;
    button.setAttribute('aria-selected', String(active));
    button.tabIndex = active ? 0 : -1;
    document.getElementById('settings-pane-' + tabId).hidden = !active;
  });
  rememberWorkspaceView({ settingsTab: id });
  window.TRAINFLOW_PANEL_CHANGED?.();
  if (id === 'profile') updateSettingsProfileHero();
  if (id === 'extensions') updateSettingsExtensionDownload();
  if (id === 'reports' && typeof TraineeReports !== 'undefined') TraineeReports.setupSettings();
}

function updateSettingsExtensionDownload() {
  const link = document.getElementById('settings-download-prometric');
  if (!link) return;
  const script = document.getElementById('prometric-registration-script');
  link.href = script?.dataset?.extension || '/workspace/trainflow-prometric.zip';
}

const settingsDesktop=matchMedia('(min-width:761px)');
function syncSettingsTabOrientation(){document.getElementById('settings-tabs').setAttribute('aria-orientation',settingsDesktop.matches?'vertical':'horizontal');}
syncSettingsTabOrientation();settingsDesktop.addEventListener('change',syncSettingsTabOrientation);
SETTINGS_TAB_IDS.forEach(id => {
  const button = document.getElementById('settings-tab-' + id);
  button.addEventListener('click', () => activateSettingsTab(id));
  button.addEventListener('keydown', e => {
    const vertical=settingsDesktop.matches;
    if (!['ArrowRight','ArrowLeft','Home','End',...(vertical?['ArrowDown','ArrowUp']:[])].includes(e.key)) return;
    e.preventDefault();
    const visible   = SETTINGS_TAB_IDS.filter(tabId => !document.getElementById('settings-tab-' + tabId).hidden);
    const direction = e.key==='ArrowDown'?1:e.key==='ArrowUp'?-1:(e.key === 'ArrowRight' ? 1 : -1) * (currentLang === 'ar' ? -1 : 1);
    const next      = e.key==='Home'?visible[0]:e.key==='End'?visible.at(-1):visible[(visible.indexOf(id) + direction + visible.length) % visible.length];
    activateSettingsTab(next);
    document.getElementById('settings-tab-' + next).focus();
  });
});

// =============================================
// ACCOUNT MENU
// =============================================

function positionAccountMenu() {
  const menu = document.getElementById('account-menu-popover');
  if (menu.hidden) return;
  const anchor = document.getElementById('account-menu-btn').getBoundingClientRect();
  const box = menu.getBoundingClientRect();
  const left = Math.max(12, Math.min(window.innerWidth - box.width - 12, anchor.right - box.width));
  const above = anchor.top - box.height - 9;
  const top = above >= 12 ? above : Math.min(anchor.bottom + 9, window.innerHeight - box.height - 12);
  menu.style.left = left + 'px';
  menu.style.top = Math.max(12, top) + 'px';
}

document.getElementById('workspace-sidebar').addEventListener('scroll', positionAccountMenu, {passive:true});

function closeAccountMenu() {
  document.getElementById('account-menu-popover').hidden = true;
  document.getElementById('account-menu-btn').setAttribute('aria-expanded', 'false');
}

document.getElementById('account-menu-btn').addEventListener('click', () => {
  const menu    = document.getElementById('account-menu-popover');
  const opening = menu.hidden;
  // Render outside the scrolling sidebar so its edges cannot clip the menu.
  const app = document.getElementById('app');
  if (opening && menu.parentElement !== app) app.appendChild(menu);
  menu.hidden   = !opening;
  positionAccountMenu();
  document.getElementById('account-menu-btn').setAttribute('aria-expanded', String(opening));
});

// Close menu when clicking outside
document.addEventListener('click', e => {
  if (!document.getElementById('account-menu').contains(e.target) && !document.getElementById('account-menu-popover').contains(e.target)) closeAccountMenu();
});

// Close menu with Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !document.getElementById('account-menu-popover').hidden) {
    closeAccountMenu();
    document.getElementById('account-menu-btn').focus();
  }
});

// =============================================
// PANEL SWITCHING
// =============================================

function showPanel(id) {
  const validPanels = ['keycodes', 'prometric', 'codes', 'inventory', 'trainees', 'settings'];
  if (!validPanels.includes(id)) return;
  if (window.TRAINFLOW_REQUEST_PANEL?.(id)) return;

  if (typeof Trainees !== 'undefined') Trainees.savePosition();
  closeAccountMenu();

  // Full-width mode only for trainees panel
  document.getElementById('app').classList.toggle('sheet-wide', id === 'trainees');

  // Render panel-specific content if needed
  if (id === 'keycodes') renderKeycodes();

  // Deactivate all sidebar tabs and panels
  document.querySelectorAll('nav.tabs [data-tab]').forEach(b => {
    b.classList.remove('active');
    b.removeAttribute('aria-current');
  });
  document.querySelectorAll('section.panel').forEach(p => p.classList.remove('active'));

  // Activate the requested panel and its tab
  document.getElementById('account-menu-btn').classList.toggle('active', id === 'settings');
  document.getElementById('panel-' + id).classList.add('active');
  document.querySelector('nav.tabs [data-tab="' + id + '"]')?.classList.add('active');
  document.querySelector('nav.tabs [data-tab="' + id + '"]')?.setAttribute('aria-current', 'page');

  rememberWorkspaceView({ panel: id });
  window.TRAINFLOW_PANEL_CHANGED?.();

  // Panel-specific side effects
  if (id === 'codes') { codeTimelineReset = true; positionCodeTimeline(); }
  if (id === 'trainees' && typeof Trainees !== 'undefined') return Trainees.open();
}


// Sidebar nav tab clicks
document.querySelectorAll('nav.tabs [data-tab]').forEach(btn => {
  btn.addEventListener('click', async () => {
    showPanel(btn.dataset.tab);
    if (btn.dataset.tab === 'settings') activateSettingsTab('profile');
    if (window.matchMedia?.('(max-width:760px)')?.matches && !window.IBTA_SIDEBAR_COMPACT) setSidebarOpen(false);
    btn.classList.add('active');
    if (btn.dataset.tab === 'codes' || btn.dataset.tab === 'inventory') await Cloud.refresh();
  });
});

// Settings shortcut button (account menu area)
document.getElementById('settings-btn').addEventListener('click', async () => {
  showPanel('settings');
  activateSettingsTab('profile');
});

// ---------- PANEL 1: KEYCODES ----------
async function goToCodesCategory(codesCat){
  activeCategory = codesCat;
  if (window.TRAINFLOW_REQUEST_PANEL?.('codes')) return;
  showPanel('codes');
  document.querySelector('nav.tabs [data-tab="codes"]').classList.add('active');
  activeCategory = codesCat;
  selectedCodes.clear();
  renderCodeTabs();
  renderCodeGrid();
  await Cloud.refresh();
}

function renderSettingsAddForms(){
  window.WorkspaceViews.addForms(document.getElementById('settings-add-forms'),{
    options:state.categoryOrder.map(value=>({value,label:displayCatName(value)})),languages:['Arabic','English'].map(value=>({value,label:t('languageNames')[value]})),
    labels:{addExam:t('addExam'),addCategory:t('addCategory'),category:t('categoryNamePlaceholder'),title:t('examTitleCol'),language:t('langCol'),code:t('keycodeCol'),destination:t('moveCategoryCol'),add:t('addBtn'),categoryHint:t('categoryNameHint'),firstExamHint:t('firstExamHint'),codesHint:t('categoryCodesHint')},
    addExam:async exam=>{
      if(!exam.title||!exam.code){showToast(t('examRequired'));return;}
      if(DEFAULT_KEYCODES.some(item=>item.code.toLowerCase()===exam.code.toLowerCase())){showToast(t('keycodeExists'));return;}
      DEFAULT_KEYCODES.push({title:exam.title,lang:exam.language,code:exam.code,category:exam.category});
      if(exam.destination!==exam.category)state.keycodeOverrides[exam.code]=exam.destination;
      if(await saveState()){renderKeycodes();showToast(t('examAdded'));}
    },
    addCategory:async category=>{
      const {name,title,code,language,destination,codes}=category;if(!name)return;
      if((title&&!code)||(!title&&code)){showToast(t('examRequired'));return;}
      if(code&&DEFAULT_KEYCODES.some(item=>item.code.toLowerCase()===code.toLowerCase())){showToast(t('keycodeExists'));return;}
      const isNew=!state.categoryOrder.includes(name);if(isNew)state.categoryOrder.push(name);
      if(title&&code){DEFAULT_KEYCODES.push({title,lang:language,code,category:name});if(destination&&destination!==name)state.keycodeOverrides[code]=destination;}
      const linked=getLinkedCodesCat(name);state.codesByCategory[linked]||=[];
      const existing=new Set(state.codesByCategory[linked]);let added=0;
      for(const voucher of codes.split('\n').map(line=>line.trim()).filter(Boolean))if(!existing.has(voucher)){state.codesByCategory[linked].push(voucher);existing.add(voucher);added++;}
      if(!isNew&&!added&&!code){showToast(t('categoryExists'));return;}
      if(await saveState()){showToast(isNew?t('categoryAdded'):t('newCodesAdded')(added));renderKeycodes();renderCodeTabs();}
    }
  });
}

async function saveKeycodeOrder(category,orderedCodes){
  state.keycodeOrder[category]=orderedCodes;
  if(!await saveState())return false;
  renderKeycodes();return true;
}
async function moveKeycode(category,code,step){
  const exams=DEFAULT_KEYCODES.filter(exam=>(state.keycodeOverrides[exam.code] || exam.category)===category);
  const order=getOrderedKeycodeItems(category,exams).map(exam=>exam.code);
  const position=order.indexOf(code),destination=position+step;
  // A stale control, first item moving up, or last item moving down must not wrap.
  if(position<0 || destination<0 || destination>=order.length)return;
  [order[position],order[destination]]=[order[destination],order[position]];
  if(!await saveKeycodeOrder(category,order))return;
  const movedRow=[...document.querySelectorAll('.kc-row')].find(row=>row.dataset.keycode===code);
  movedRow.querySelector('.copy-code-btn').focus();
}
function renderKeycodes(){
  const groups={};state.categoryOrder.forEach(category=>groups[category]=[]);
  for(const exam of DEFAULT_KEYCODES){const category=state.keycodeOverrides[exam.code]||exam.category;(groups[category]||=[]).push(exam);}
  const moveCategory=async(index,step)=>{const order=state.categoryOrder;[order[index+step],order[index]]=[order[index],order[index+step]];if(await saveState())renderKeycodes();};
  window.WorkspaceViews.keycodes(document.getElementById('panel-keycodes'),{
    options:state.categoryOrder.map(value=>({value,label:displayCatName(value)})),
    headings:['',t('examTitleCol'),t('langCol'),t('keycodeCol'),t('moveCategoryCol')],emptyLabel:t('noExams'),
    groups:state.categoryOrder.map((cat,index)=>{
      const items=getOrderedKeycodeItems(cat,groups[cat]||[]),linked=getLinkedCodesCat(cat),codes=state.codesByCategory[linked]||[],remaining=codes.filter(code=>!state.usedCodes[code]).length;
      return {category:cat,title:displayCatName(cat)+' ('+items.length+')',linkedLabel:'🔗 '+displayCatName(linked)+' · '+t('remaining')+' '+remaining,
        upLabel:t('moveUp'),downLabel:t('moveDown'),removeLabel:t('removeCategory'),first:index===0,last:index===state.categoryOrder.length-1,removable:!CATEGORY_ORDER.includes(cat),
        moveUp:()=>moveCategory(index,-1),moveDown:()=>moveCategory(index,1),openCodes:()=>goToCodesCategory(linked),
        remove:async()=>{
          if(!await confirmDelete(t('confirmRemoveCategory')(cat)))return;
          for(const exam of DEFAULT_KEYCODES)if(exam.category===cat)exam.category=state.keycodeOverrides[exam.code]||CATEGORY_ORDER[0];
          for(const code of Object.keys(state.keycodeOverrides))if(state.keycodeOverrides[code]===cat)delete state.keycodeOverrides[code];
          state.categoryOrder=state.categoryOrder.filter(category=>category!==cat);delete state.categoryLabels[cat];delete state.keycodeOrder[cat];
          if(await saveState()){renderKeycodes();showToast(t('categoryRemoved'));}
        },
        rows:items.map((exam,rowIndex)=>({code:exam.code,title:exam.title,language:t('languageNames')[exam.lang]||exam.lang,copyLabel:t('copyCode')(exam.code),categoryLabel:t('moveCategoryCol')+': '+exam.title,
          first:rowIndex===0,last:rowIndex===items.length-1,moveUp:()=>moveKeycode(cat,exam.code,-1),moveDown:()=>moveKeycode(cat,exam.code,1),
          copy:async()=>{if(!await copyText(exam.code))return false;showToast(t('copiedColon')(exam.code));return true;},
          move:async(category)=>{state.keycodeOverrides[exam.code]=category;if(await saveState()){renderKeycodes();showToast(t('movedTo')(exam.title,displayCatName(category)));}},
          dragStart:event=>{draggedKcCode=exam.code;draggedKcCat=cat;event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',exam.code);},
          dragEnd:()=>{draggedKcCode=draggedKcCat=null;},
          dragOver:event=>{if(draggedKcCat!==cat||draggedKcCode===null)return false;event.preventDefault();return true;},
          drop:async event=>{event.preventDefault();if(draggedKcCat!==cat||!draggedKcCode||draggedKcCode===exam.code)return;
            const order=items.map(item=>item.code),from=order.indexOf(draggedKcCode);if(from<0)return;order.splice(from,1);order.splice(order.indexOf(exam.code),0,draggedKcCode);
            if(await saveKeycodeOrder(cat,order))draggedKcCode=draggedKcCat=null;
          }
        }))
      };
    })
  });
  renderSettingsAddForms();Cloud.decorate();
}

// ---------- PANEL 2: PROMETRIC ----------
document.getElementById('cred-account-val').textContent = PROMETRIC_ACCOUNT;
document.getElementById('cred-password-val').textContent = PROMETRIC_PASSWORD;
async function handlePrometricCopy(inputId, labelKey){
  const value = document.getElementById(inputId).textContent;
  if(!value){ showToast(t('enterCredential')); return; }
  if(!await copyText(value)) return;
  showToast(t(labelKey));
}
document.getElementById('cred-account').addEventListener('click', async ()=>{
  handlePrometricCopy('cred-account-val', 'accountCopied');
});
document.getElementById('cred-password').addEventListener('click', async ()=>{
  handlePrometricCopy('cred-password-val', 'passwordCopied');
});
async function copyPrometricLogin(){
  if(!PROMETRIC_LOGIN_URL){showToast(t('notConfigured'));return;}
  if(await copyText(PROMETRIC_LOGIN_URL)) showToast(t('prometricLinkCopied'));
}
document.getElementById('prometric-login-card').addEventListener('click',copyPrometricLogin);
document.getElementById('prometric-login-card').addEventListener('keydown',async e=>{
  if(e.key==='Enter' || e.key===' '){e.preventDefault();await copyPrometricLogin();}
});

// ---------- PANEL 3: CODES ----------
let activeCategory = Object.keys(state.codesByCategory)[0];
let codeTimelineReset=true,codeTimelineFrame=0;
let codeCompact = localStorage.getItem('ibta_code_compact') !== 'false';
let codeExpanded = localStorage.getItem('ibta_code_expanded') === 'true';


function applyCodeDensity(){
  const sheet=document.querySelector('.code-sheet');
  const btn=document.getElementById('code-density-btn');
  const label=document.getElementById('code-density-label');
  if(!sheet||!btn)return;
  sheet.classList.toggle('compact',codeCompact);
  btn.classList.toggle('active',codeCompact);
  if(label)label.textContent=codeCompact?t('codeDensityCompact'):t('codeDensityComfortable');
  try{localStorage.setItem('ibta_code_compact',String(codeCompact));}catch{}
}

function applyCodeExpand(){
  const scroll=document.getElementById('code-sheet-viewport');
  const btn=document.getElementById('code-expand-btn');
  const label=document.getElementById('code-expand-label');
  if(!scroll||!btn)return;
  scroll.classList.toggle('expanded',codeExpanded);
  btn.classList.toggle('active',codeExpanded);
  if(label)label.textContent=codeExpanded?t('codeNormalHeight'):t('codeExpandHeight');
  try{localStorage.setItem('ibta_code_expanded',String(codeExpanded));}catch{}
  positionCodeTimeline();
}



function codeDayNumber(value){
  const date=parseAnyDateString(value || '');
  return date?Date.UTC(date.year,date.month-1,date.day):0;
}
function orderedCodeTimeline(list){
  const ordered=list.map((code,index)=>({code,index,day:state.usedCodes[code]?codeDayNumber(state.usedCodes[code]):Infinity}));
  ordered.sort((a,b)=>a.day-b.day || (Date.parse(state.codeUseTimes?.[a.code])||0)-(Date.parse(state.codeUseTimes?.[b.code])||0) || a.index-b.index);
  const today=codeDayNumber(todayStr());
  let start=ordered.findIndex(item=>item.day>=today);
  if(start<0&&ordered.length){const newest=ordered[ordered.length-1].day;start=ordered.findIndex(item=>item.day===newest);}
  return {ordered,start};
}
function captureCodeTimeline(){
  const scroll=document.getElementById('code-sheet-viewport'),grid=document.getElementById('code-grid');
  if(codeTimelineReset||grid.dataset.category!==activeCategory||typeof scroll.getBoundingClientRect!=='function'||!document.getElementById('panel-codes').classList.contains('active'))return null;
  const top=scroll.getBoundingClientRect().top+scroll.querySelector('.code-sheet-head').offsetHeight;
  const first=[...grid.querySelectorAll('.code-row')].find(row=>row.getBoundingClientRect().bottom>top);
  return {code:first?.dataset.code,delta:first?first.getBoundingClientRect().top-top:0,scrollTop:scroll.scrollTop};
}
function positionCodeTimeline(previous=null){
  if(typeof window.requestAnimationFrame!=='function')return;
  window.cancelAnimationFrame(codeTimelineFrame);
  codeTimelineFrame=window.requestAnimationFrame(()=>{
    if(!document.getElementById('panel-codes').classList.contains('active'))return;
    const scroll=document.getElementById('code-sheet-viewport'),grid=document.getElementById('code-grid'),head=scroll.querySelector('.code-sheet-head');
    const anchor=grid.querySelector('.code-current-start');
    grid.style.paddingBottom='0px';
    const maximumHeight=codeExpanded?Math.max(120,window.innerHeight-100):Math.min(window.innerHeight*.82,850);
    const targetHeight=Math.min(maximumHeight,Math.max(120,grid.offsetHeight+head.offsetHeight))+'px';
    scroll.style.height=grid.dataset.hasHistory==='true'?targetHeight:'';
    const top=scroll.getBoundingClientRect().top,headHeight=head.offsetHeight;
    const target=anchor?anchor.getBoundingClientRect().top-top+scroll.scrollTop-headHeight:0;
    if(grid.dataset.hasHistory==='true')grid.style.paddingBottom=Math.max(0,scroll.clientHeight-(headHeight+grid.offsetHeight-target))+'px';
    if(previous&&!codeTimelineReset){
      const row=[...grid.querySelectorAll('.code-row')].find(row=>row.dataset.code===previous.code);
      scroll.scrollTop=row?row.getBoundingClientRect().top-top+scroll.scrollTop-headHeight-previous.delta:previous.scrollTop;
    }else scroll.scrollTop=Math.max(0,target);
    codeTimelineReset=false;
  });
}

function renderCodeTabs(){
  window.WorkspaceViews.categories(document.getElementById('code-cat-tabs'),{
    options:sortCategories(Object.keys(state.codesByCategory)).map(value=>({value,label:displayCatName(value)})),selected:activeCategory,
    choose:category=>{
      activeCategory=category;selectedCodes.clear();
      const label=document.getElementById('code-scroll-label');if(label)label.textContent=t('codeScrollToTop');
      document.getElementById('code-scroll-top-btn')?.classList.remove('active');renderCodeTabs();renderCodeGrid();
      window.TRAINFLOW_PANEL_CHANGED?.();
    }
  });
}

function renderStats(){
  const codes=state.codesByCategory[activeCategory]||[],used=codes.filter(code=>state.usedCodes[code]).length;
  window.WorkspaceViews.stats(document.getElementById('code-stats'),{stats:[{label:t('total'),count:codes.length},{label:t('copiedStat'),count:used},{label:t('remainingStat'),count:codes.length-used}]});
  renderDailyUsed();
}

document.getElementById('daily-used-details').addEventListener('toggle',()=>{
  document.getElementById('daily-used-panel').hidden=!document.getElementById('daily-used-details').open;
});
function dailyUsedGroups(iso){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return [];
  const [year,month,day]=iso.split('-').map(Number);
  return sortCategories(Object.keys(state.codesByCategory)).map(cat=>({
    cat,
    codes:(state.codesByCategory[cat] || []).filter(code=>{
      const used=state.usedCodes[code];
      if(!used)return false;
      const date=parseAnyDateString(used);
      return date && date.day===day && date.month===month && date.year===year;
    })
  }));
}
function renderDailyUsed(){
  const date=document.getElementById('daily-used-date').value,groups=date?dailyUsedGroups(date):[],total=groups.reduce((sum,group)=>sum+group.codes.length,0);
  window.WorkspaceViews.daily(document.getElementById('daily-used-results'),{groups:groups.filter(group=>group.codes.length).map(group=>({category:displayCatName(group.cat),codes:group.codes})),totalLabel:date?t('dailyUsedTotal')(total):undefined,emptyLabel:!date?t('chooseUsedDate'):total===0?t('dailyUsedNone'):undefined});
}

document.getElementById('daily-used-date').addEventListener('change',renderDailyUsed);

function updateBulkBar(){
  const bar = document.getElementById('bulk-bar');
  const count = selectedCodes.size;
  document.getElementById('bulk-count').textContent = t('selected')(count);
  bar.classList.toggle('show', count > 0);
  const selectAll = document.getElementById('select-all-codes');
  const list = state.codesByCategory[activeCategory] || [];
  selectAll.checked = list.length > 0 && list.every(c => selectedCodes.has(c));
}

function renderCodeGrid(){
  applyCodeDensity();
  applyCodeExpand();
  renderKeycodes();
  const grid = document.getElementById('code-grid');
  const previous=captureCodeTimeline();
  const list = state.codesByCategory[activeCategory] || [];
  const timeline=orderedCodeTimeline(list);
  grid.dataset.category=activeCategory || '';grid.dataset.hasHistory=String(timeline.start>0);
  const hint=document.getElementById('code-history-hint');if(hint){hint.hidden=timeline.start<=0;
  hint.textContent=currentLang==='ar'?'الأيام الأقدم موجودة بالأعلى — مرّر لأعلى داخل جدول الأكواد لعرضها.':'Earlier days are above — scroll up inside the code table to view them.';}
  document.getElementById('code-sheet-viewport').setAttribute('aria-label',currentLang==='ar'?'الأكواد — مرّر لأعلى للأيام الأقدم':'Codes — scroll up for earlier days');
  const dayColors = getDayColors();
  renderStats();
  updateBulkBar();
  window.WorkspaceViews.vouchers(grid,{emptyLabel:t('noCodesYet'),rows:timeline.ordered.map(({code,index},position)=>{
    const used=state.usedCodes[code],background=used?dayColors[used]:undefined;
    return {code,number:index+1,used:!!used,current:position===timeline.start,background,foreground:used?getContrastText(background):undefined,
      date:used?used+(state.codeUseTimes?.[code]?' '+codeCopyTime(state.codeUseTimes[code]):''):'',name:state.voucherNames?.[code]||'',notes:state.codeNotes[code]||'',selected:selectedCodes.has(code),readOnlyName:Cloud.role()==='copy_only',
      labels:{select:t('selectCode')(code),copy:t('copyCode')(code),name:currentLang==='ar'?'اسم المتدرب للفاوتشر '+code:'Trainee name for voucher '+code,namePlaceholder:currentLang==='ar'?'اسم المتدرب':'Trainee name',notes:t('codeNote')(code),notesPlaceholder:t('notePlaceholder'),unmark:t('removeMark'),remove:t('deleteCode')},
      copy:()=>Cloud.copyCode(code),select:selected=>{if(selected)selectedCodes.add(code);else selectedCodes.delete(code);updateBulkBar();},
      saveName:async name=>{const saved=await Cloud.saveVoucherName(code,name);if(saved)showToast(currentLang==='ar'?'تم حفظ اسم المتدرب':'Trainee name saved');return saved;},
      saveNotes:async notes=>{if(notes.trim())state.codeNotes[code]=notes;else delete state.codeNotes[code];await saveState();},
      unmark:async()=>{
        const isAr=currentLang==='ar';
        const editingUser=Cloud.userId(),editingState=state;
        const sameAccount=()=>Cloud.userId()===editingUser&&state===editingState;
        let choice=true;
        if(window.AppDialog){
          choice=await AppDialog.confirm({
            title:isAr?'إلغاء علامة الكود':'Unmark Voucher',
            message:isAr
              ?`هل تريد إزالة الكود (${code}) من صفحة المتدربين أيضًا، أم الاكتفاء بإلغاء علامة الاستخدام فقط؟`
              :`Would you like to remove code (${code}) from the trainees worksheet, or only unmark it?`,
            confirmText:isAr?'إزالة وإلغاء':'Remove & unmark',
            altText:isAr?'إلغاء فقط':'Unmark only',
            cancelText:isAr?'تراجع':'Cancel',
            icon:'warning'
          });
        }else{
          choice=confirm(isAr?`إلغاء علامة الكود (${code})؟ موافق للإزالة من المتدربين أيضاً.`:`Unmark code (${code})?`);
        }
        if(!choice||!sameAccount())return;
        let removedFromSheet=false;
        if(choice==='confirm'||choice===true){
          try{
            removedFromSheet=await Trainees.removeCode(code);
          }catch{
            if(!sameAccount())return;
            showToast(isAr?'تعذر إزالة الكود من صفحة المتدربين. علامة الاستخدام لم تتغير؛ حاول مجددًا.':'Could not clear the code from trainees. Its usage mark is unchanged; please retry.');
            return;
          }
        }
        if(!sameAccount())return;
        delete state.usedCodes[code];
        if(state.codeUseTimes)delete state.codeUseTimes[code];
        if(!await saveState()||Cloud.userId()!==editingUser)return;
        renderCodeGrid();
        if(choice==='confirm'||choice===true){
          showToast(removedFromSheet
            ?(isAr?'تم إلغاء العلامة وإزالة الكود من صفحة المتدربين':'Mark removed and code cleared from trainees sheet')
            :(isAr?'تم إلغاء العلامة (الكود غير موجود في صفحة المتدربين)':'Mark removed (code was not in trainees sheet)'));
        }else{
          showToast(t('markRemoved'));
        }
      },
      remove:async()=>{if(!await confirmDelete(t('confirmDeleteCode')(code)))return;
        state.codesByCategory[activeCategory]=state.codesByCategory[activeCategory].filter(item=>item!==code);delete state.usedCodes[code];delete state.codeNotes[code];selectedCodes.delete(code);
        if(await saveState()){renderCodeGrid();showToast(t('codeDeleted'));}
      }
    };
  })});
  Cloud.decorate();
  positionCodeTimeline(previous);
}

document.getElementById('select-all-codes').addEventListener('change', async (e)=>{
  const list = state.codesByCategory[activeCategory] || [];
  if(e.target.checked){ list.forEach(c=>selectedCodes.add(c)); }
  else { list.forEach(c=>selectedCodes.delete(c)); }
  renderCodeGrid();
});

document.getElementById('clear-sel-btn').addEventListener('click', async ()=>{
  selectedCodes.clear();
  renderCodeGrid();
});

document.getElementById('bulk-delete-btn').addEventListener('click', async ()=>{
  const count = selectedCodes.size;
  if(count === 0) return;
  if(await confirmDelete(t('confirmBulkDelete')(count))){
    state.codesByCategory[activeCategory] = (state.codesByCategory[activeCategory] || []).filter(c => !selectedCodes.has(c));
    selectedCodes.forEach(c=>{
      delete state.usedCodes[c];
      delete state.codeNotes[c];
    });
    selectedCodes.clear();
    if(!await saveState()) return;
    renderCodeGrid();
    showToast(t('codesDeleted')(count));
  }
});

document.getElementById('add-codes-btn').addEventListener('click', async ()=>{
  const ta = document.getElementById('add-codes-input');
  const lines = ta.value.split('\n').map(s=>s.trim()).filter(Boolean);
  if(lines.length === 0) return;
  if(!state.codesByCategory[activeCategory]) state.codesByCategory[activeCategory] = [];
  const existing = new Set(state.codesByCategory[activeCategory]);
  let added = 0;
  lines.forEach(code=>{
    if(!existing.has(code)){
      state.codesByCategory[activeCategory].push(code);
      existing.add(code);
      added++;
    }
  });
  if(!await saveState()) return;
  ta.value = '';
  renderCodeGrid();
  showToast(t('newCodesAdded')(added));
});

document.getElementById('reset-btn').addEventListener('click', async ()=>{
  if(await confirmDelete(t('confirmReset'))){
    state.usedCodes = {};
    if(!await saveState()) return;
    renderCodeGrid();
    showToast(t('resetDone'));
  }
});



// ---------- init ----------
const [initialDay,initialMonth,initialYear]=todayStr().split('/');
document.getElementById('daily-used-date').value=initialYear+'-'+initialMonth+'-'+initialDay;
try{
  const prefs=JSON.parse(localStorage.getItem('ibta_ui_preferences') || '{}') || {};
  currentLang=prefs.uiLang==='en'?'en':'ar';
  state.uiLang=currentLang;
}catch{currentLang='ar';state.uiLang='ar';}
applyLanguage();
window.TRAINFLOW_BOOT_WORKSPACE=()=>Cloud.boot();
