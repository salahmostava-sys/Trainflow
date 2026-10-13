/* Database requests use the JavaScript server; Auth remains with Supabase. */
const Cloud = (() => {
  const SUPABASE_URL = "https://xaeffreqwtozsgqajzpc.supabase.co";
  const KEY = "sb_publishable_TB0SB3SNFP1ygpRvMoeSGg_s8o0mHeO";
  const REMEMBER_KEY = "trainflow_remember_me";
  const sessionStore = () =>
    localStorage.getItem(REMEMBER_KEY) === "1" ? localStorage : sessionStorage;
  const authStorage = {
    getItem(key: string) {
      return sessionStore().getItem(key);
    },
    setItem(key: string, serializedSession: string) {
      const selected = sessionStore();
      const previous = selected === localStorage ? sessionStorage : localStorage;
      selected.setItem(key, serializedSession);
      previous.removeItem(key);
    },
    removeItem(key: string) {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    },
  };
  async function serverFetch(
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    const url = new URL(
      input instanceof Request ? input.url : String(input),
      location.origin,
    );
    if (url.origin !== SUPABASE_URL || !url.pathname.startsWith("/rest/v1/"))
      return fetch(input, init);
    const target = new URL(
      "/api/data/" + url.pathname.slice("/rest/v1/".length) + url.search,
      location.origin,
    );
    // Fail closed: API errors must never retry a write through direct PostgREST.
    return fetch(
      input instanceof Request ? new Request(target, input) : target,
      init,
    );
  }
  let client: CloudClient,
    config: { id: number; version: number; payload: CloudSettings },
    user: CloudUser,
    role: CloudRole;
  let rows = new Map<string, CloudCode>(),
    stock = new Map<string, number>(),
    busy = false,
    ready = false;
  let sessionDeadline = 0,
    sessionTimer,
    endingSession = false,
    retainedDraftUser = "";
  const dailyMessage = () =>
    currentLang === "ar"
      ? "انتهت الجلسة الساعة 5 مساءً بتوقيت السعودية. سجّل الدخول من جديد."
      : "Your session ended at 5 PM Saudi time. Please sign in again.";
  async function endDailySession() {
    if (endingSession) return;
    endingSession = true;
    clearTimeout(sessionTimer);

    $("app").hidden = true;
    $("cloud-tools").hidden = true;
    if (typeof Trainees !== "undefined") Trainees.suspend?.();
    const priorUser = user?.id;
    try {
      if (typeof Trainees !== "undefined") {
        await Trainees.flush();
        if (Trainees.hasDraft()) retainedDraftUser = priorUser;
      }
      ready = false;
      await client.auth.signOut({ scope: "local" });
    } finally {
      ready = false;
      $("app").hidden = true;
      $("cloud-tools").hidden = true;
      $("sign-out").hidden = true;
      $("auth-box").hidden = false;
      $("auth-message").textContent =
        dailyMessage() +
        (retainedDraftUser
          ? currentLang === "ar"
            ? " تعديلات الجدول محفوظة مؤقتًا في الصفحة. ادخل بنفس الحساب ولا تغلق الصفحة."
            : " Sheet edits remain in this page. Sign in with the same account and keep the page open."
          : "");
      endingSession = false;
    }
  }
  function checkDailySession() {
    if (ready && Date.now() >= sessionDeadline) {
      void endDailySession().catch(() => {});
      return true;
    }
    return false;
  }
  let nextBackgroundRefresh = 0;
  let statusKey = "",
    statusArgs = [],
    statusError = false,
    authStatusKey = "authAccessHelp",
    authStatusArgs = [];
  let profileStatusKey = "",
    profileStatusError = false;
  const BACKGROUND_REFRESH_MS = 120000;
  const $ = <T extends HTMLElement = HTMLInputElement>(id: string): T =>
    document.getElementById(id) as T;
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const accountName = () =>
    typeof user?.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name.trim()
      : "";
  function validHttpsUrl(value: string, domain: string) {
    try {
      const url = new URL(value);
      return (
        url.protocol === "https:" &&
        !url.username &&
        !url.password &&
        (url.hostname === domain || url.hostname.endsWith("." + domain))
      );
    } catch {
      return false;
    }
  }
  function message(text, error = false) {
    $("cloud-status").textContent = text;
    $("cloud-status").style.color = error ? "#b42318" : "";
  }
  function translated(key, ...args) {
    const value = t(key) as string | ((...values: string[]) => string);
    return typeof value === "function" ? value(...args) : value;
  }
  function errorText(error) {
    const raw = error?.message || String(error);
    if (raw === "DAILY_SIGN_IN_REQUIRED") return dailyMessage();
    if (raw === "AUTH_RATE_LIMITED" || raw === "MEMBERSHIP_RATE_LIMITED")
      return currentLang === "ar"
        ? "طلبات كثيرة. انتظر قليلًا ثم حاول مرة أخرى."
        : "Too many requests. Wait a moment and retry.";
    if (raw === "AUTH_UNAVAILABLE" || raw === "MEMBERSHIP_UNAVAILABLE")
      return currentLang === "ar"
        ? "خدمة التحقق من الحساب غير متاحة مؤقتًا. حاول مرة أخرى."
        : "Account verification is temporarily unavailable. Please retry.";
    if (raw.startsWith("SERVER_UNAVAILABLE"))
      return currentLang === "ar"
        ? "تعذر إكمال الاتصال بالسيرفر. حاول مرة أخرى؛ وإذا استمرت المشكلة أرسل رمز الخطأ: " +
            raw
        : "The server could not complete the request. Retry; if it persists, share this code: " +
            raw;
    if (raw === "IBTA_AUTH_INVALID_INPUT") return t("authInvalidInput");
    if (raw === "IBTA_NOT_APPROVED") return t("authNotApproved");
    if (raw === "IBTA_CODE_NOT_FOUND") return t("codeNotFound");
    if (raw === "IBTA_CODE_USED_BY_OTHER") return t("codeUsedByOther");
    if (raw === "IBTA_NO_LEGACY_DATA") return t("noLegacyData");
    if (raw === "IBTA_INVALID_LEGACY_DATA") return t("invalidLegacyData");
    if (raw === "IBTA_INVALID_ZOOM_URL") return t("invalidZoomUrl");
    if (raw === "IBTA_INVALID_PROMETRIC_URL") return t("invalidPrometricUrl");
    if (raw === "IBTA_CREDENTIAL_REQUIRED") return t("enterCredential");
    if (raw === "IBTA_INVALID_CODE_EDIT") return t("invalidCodeEdit");
    if (raw === "IBTA_STOCK_NOT_SET") return t("inventoryStockNotSet");
    if (raw === "IBTA_STOCK_INSUFFICIENT")
      return t("inventoryStockInsufficient");
    if (raw === "IBTA_INVALID_STOCK_CHANGE") return t("inventoryInvalidChange");
    if (raw === "IBTA_LIBRARY_LOAD_FAILED") return t("libraryLoadFailed");
    if (raw.startsWith("IBTA_DUPLICATE_CODE:"))
      return t("duplicateCode")(raw.slice(20));
    if (
      /invalid login credentials|invalid credentials/i.test(raw) ||
      error?.code === "invalid_credentials"
    )
      return t("authInvalidCredentials");
    if (
      /email not confirmed/i.test(raw) ||
      error?.code === "email_not_confirmed"
    )
      return t("authEmailNotConfirmed");
    if (
      /email rate limit|rate limit exceeded/i.test(raw) ||
      error?.code === "over_email_send_rate_limit"
    )
      return t("authEmailLimit");
    if (/permission denied/i.test(raw))
      return currentLang === "ar"
        ? "انتهت صلاحية الجلسة أو الحساب غير مصرح له بجدول الأكواد. يرجى تسجيل الدخول مجددًا."
        : "Session expired or account not authorized for codes table. Please sign in again.";
    if (
      /user already registered/i.test(raw) ||
      error?.code === "user_already_exists"
    )
      return t("authAlreadyRegistered");
    return currentLang === "ar" && !/[\u0600-\u06ff]/.test(raw)
      ? t("genericError")
      : raw;
  }
  function renderStatus() {
    if (!statusKey) return;
    const text =
      statusKey === "error"
        ? t("operationFailed") + errorText(statusArgs[0])
        : translated(statusKey, ...statusArgs);
    message(text, statusError);
  }
  function setStatus(key, error = false, ...args) {
    statusKey = key;
    statusError = error;
    statusArgs = args;
    renderStatus();
  }
  function setAuthStatus(key, ...args) {
    authStatusKey = key;
    authStatusArgs = args;
    $("auth-message").textContent =
      key === "error" ? errorText(args[0]) : translated(key, ...args);
  }
  function translateUi() {
    if (user) {
      const email = user.email || "";
      const name = accountName();
      $("account-menu-name").textContent = name || t("currentAccount");
      $("account-menu-email").textContent = email;
      $("account-avatar").textContent =
        (name || email).trim().charAt(0).toUpperCase() || "TF";
    }
    if (profileStatusKey) {
      $("profile-status").textContent =
        profileStatusKey === "error"
          ? errorText(profileStatusError)
          : t(profileStatusKey);
      $("profile-status").style.color =
        profileStatusKey === "error" ? "#b42318" : "";
    }
    $("zoom-link-val").textContent = ZOOM_URL || t("notConfigured");
    $("prometric-link-val").textContent =
      PROMETRIC_LOGIN_URL || t("notConfigured");
    if (ZOOM_URL) $("zoom-card").setAttribute("href", ZOOM_URL);
    else $("zoom-card").removeAttribute("href");
    renderStatus();
    setAuthStatus(authStatusKey, ...authStatusArgs);
  }
  function lock(value: boolean) {
    busy = value;
    $("app").inert = value;
    $("cloud-tools").inert = value;
  }
  function fail(error) {
    if (/CONFLICT|duplicate key/.test(error.message || ""))
      setStatus("conflict", true);
    else setStatus("error", true, error);
    showToast($("cloud-status").textContent);
  }
  async function allRows() {
    const result = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await client
        .from("ibta_codes")
        .select("*")
        .order("code")
        .range(offset, offset + 999);
      if (error) throw error;
      result.push(...data);
      if (data.length < 1000) return result;
    }
  }
  function sortCategories(cats: string[]) {
    if (
      typeof window !== "undefined" &&
      typeof window.sortCategories === "function"
    )
      return window.sortCategories(cats);
    if (
      typeof globalThis !== "undefined" &&
      typeof globalThis.sortCategories === "function"
    )
      return globalThis.sortCategories(cats);
    if (!Array.isArray(cats)) return [];
    const order = ["Foundation", "Master", "BIS", "Corporate", "CYBP"];
    return [...cats].sort((a, b) => {
      const cleanA = String(a || "").replace(/-\d+$/, ""),
        cleanB = String(b || "").replace(/-\d+$/, "");
      const isCybA = cleanA.toUpperCase() === "CYBP",
        isCybB = cleanB.toUpperCase() === "CYBP";
      if (isCybA && !isCybB) return 1;
      if (!isCybA && isCybB) return -1;
      const idxA = order.indexOf(cleanA),
        idxB = order.indexOf(cleanB);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return String(a).localeCompare(String(b));
    });
  }
  function project() {
    const p = config.payload;
    let prefs: { uiLang?: string } = {};
    try {
      prefs =
        JSON.parse(localStorage.getItem("ibta_ui_preferences") || "{}") || {};
    } catch {}
    state = {
      usedCodes: {},
      codeUseTimes: {},
      codesByCategory: {},
      codeNotes: {},
      voucherNames: {},
      categoryLabels: clone(p.categoryLabels || {}),
      keycodeOverrides: clone(p.keycodeOverrides || {}),
      keycodeOrder: clone(p.keycodeOrder || {}),
      categoryOrder: sortCategories(p.categoryOrder),
      dateColors: clone(p.dateColors || {}),
      settings: {},
      lowStockThreshold: Number.isInteger(p.lowStockThreshold)
        ? p.lowStockThreshold
        : 10,
      uiLang: prefs.uiLang === "en" ? "en" : "ar",
    };
    for (const cat of sortCategories(p.codeCategories || []))
      state.codesByCategory[cat] = [];
    for (const r of rows.values()) {
      (state.codesByCategory[r.category] ||= []).push(r.code);
      if (r.used_on) state.usedCodes[r.code] = r.used_on;
      if (r.used_on && r.used_at) state.codeUseTimes[r.code] = r.used_at;
      if (r.notes) state.codeNotes[r.code] = r.notes;
      if (r.trainee_name) state.voucherNames[r.code] = r.trainee_name;
    }
    DEFAULT_KEYCODES = clone(p.keycodes || []);
    PROMETRIC_ACCOUNT = p.credentials?.account || "";
    PROMETRIC_PASSWORD = p.credentials?.password || "";
    ZOOM_URL = validHttpsUrl(p.links?.zoom, "zoom.us") ? p.links.zoom : "";
    PROMETRIC_LOGIN_URL = validHttpsUrl(p.links?.prometric, "prometric.com")
      ? p.links.prometric
      : "";
    $("cred-account-val").textContent = PROMETRIC_ACCOUNT;
    $("cred-password-val").textContent = PROMETRIC_PASSWORD;
    $("settings-prometric-account").value = PROMETRIC_ACCOUNT;
    $("settings-prometric-password").value = PROMETRIC_PASSWORD;
    $("settings-zoom-link").value = p.links?.zoom || "";
    $("settings-prometric-link").value = p.links?.prometric || "";
    if ($("inventory-supervisor-name"))
      $("inventory-supervisor-name").value = p.inventorySupervisorName || "";
    if ($("inventory-message-language"))
      $("inventory-message-language").value =
        p.inventoryMessageLanguage === "en" ? "en" : "ar";
    $("profile-name").value = accountName();
    $("profile-email").value = user?.email || "";
    currentLang = state.uiLang;
    const routeCategory =
      location.pathname === "/vouchers"
        ? new URLSearchParams(location.search).get("category")
        : null;
    if (routeCategory && Object.hasOwn(state.codesByCategory, routeCategory))
      activeCategory = routeCategory;
    if (!Object.hasOwn(state.codesByCategory, activeCategory))
      activeCategory = Object.keys(state.codesByCategory)[0];
    selectedCodes.clear();
    applyLanguage();
    decorate();
    if (typeof renderInventory === "function") renderInventory();
  }
  function decorate() {
    const admin = role === "admin";
    document
      .querySelectorAll<HTMLElement>(
        ".kc-remove-cat-btn,.kc-order-btn,.kc-col-cat select,.kc-drag-handle,.kc-add-exam,.add-box,#bulk-delete-btn,#reset-btn,.icon-btn.danger",
      )
      .forEach((el) => {
        el.hidden = !admin;
      });
    $("admin-tools").hidden = !admin;
    $("manage-data").hidden = !admin;
    $("settings-add-forms").hidden = !admin;
    $("prometric-settings").hidden = !admin;
    $("settings-tab-data").hidden = !admin;
    $("settings-tab-prometric").hidden = !admin;
    $("settings-tab-inventory").hidden = !admin;
    $("code-bulk-tools").hidden = !admin;
    $("reset-tools").hidden = !admin;
    $("inventory-admin").hidden = !admin;
    document
      .querySelectorAll<HTMLInputElement>(".col-notes input")
      .forEach((el) => {
        el.disabled = role === "copy_only";
      });
    document
      .querySelectorAll<HTMLInputElement>(".col-trainee-name input")
      .forEach((el) => {
        el.disabled = role === "copy_only";
      });
    document.querySelectorAll<HTMLElement>(".code-unmark-btn").forEach((el) => {
      el.hidden = role === "copy_only";
    });
    if (
      !admin &&
      ($("settings-tab-data").getAttribute("aria-selected") === "true" ||
        $("settings-tab-prometric").getAttribute("aria-selected") === "true" ||
        $("settings-tab-inventory").getAttribute("aria-selected") === "true")
    )
      activateSettingsTab("profile");
    translateUi();
  }
  async function load() {
    const [settings, codes, stockResult] = await Promise.all([
      client.from("ibta_settings").select("*").eq("id", 1).single(),
      allRows(),
      client.from("ibta_supervisor_stock").select("category,remaining"),
    ]);
    if (settings.error) throw settings.error;
    if (stockResult.error) throw stockResult.error;
    config = settings.data;
    rows = new Map(codes.map((r) => [r.code, r]));
    stock = new Map(stockResult.data.map((r) => [r.category, r.remaining]));
    project();
  }
  function metadata() {
    return {
      ...clone(config.payload),
      keycodes: clone(DEFAULT_KEYCODES),
      categoryOrder: clone(state.categoryOrder),
      categoryLabels: clone(state.categoryLabels),
      keycodeOverrides: clone(state.keycodeOverrides),
      keycodeOrder: clone(state.keycodeOrder),
      codeCategories: Object.keys(state.codesByCategory),
      ...(Object.hasOwn(config.payload, "lowStockThreshold") ||
      state.lowStockThreshold !== 10
        ? { lowStockThreshold: state.lowStockThreshold }
        : {}),
    };
  }
  async function persist() {
    if (!ready) return true;
    if (busy) return false;
    const changes = [],
      seen = new Set();
    try {
      localStorage.setItem(
        "ibta_ui_preferences",
        JSON.stringify({ uiLang: state.uiLang }),
      );
      for (const [category, codes] of Object.entries(state.codesByCategory))
        for (const code of codes) {
          if (seen.has(code)) throw Error("IBTA_DUPLICATE_CODE:" + code);
          seen.add(code);
          const prior = rows.get(code),
            notes = state.codeNotes[code] || "",
            used_on = state.usedCodes[code] || null;
          if (!prior)
            changes.push({ op: "insert", code, category, notes, used_on });
          else if (prior.notes !== notes || prior.used_on !== used_on)
            changes.push({
              op: "update",
              code,
              version: prior.version,
              notes,
              used_on,
            });
        }
      for (const [code, prior] of rows)
        if (!seen.has(code))
          changes.push({ op: "delete", code, version: prior.version });
      const payload = metadata(),
        changed = !same(payload, config.payload);
      if (!changes.length && !changed) return true;
      lock(true);
      setStatus("saving");
      const { error } = await client.rpc("ibta_apply_changes", {
        changes,
        settings_payload: changed ? payload : null,
        settings_version: config.version,
      });
      if (error) throw error;
      await load();
      setStatus("saved");
      return true;
    } catch (error) {
      try {
        await load();
      } catch {
        project();
      }
      fail(error);
      return false;
    } finally {
      lock(false);
    }
  }
  async function copyCode(code: string) {
    if (!ready || busy) return false;
    lock(true);
    try {
      const prior = rows.get(code);
      if (!prior) throw Error("IBTA_CODE_NOT_FOUND");
      if (prior.used_on) {
        if (prior.used_by !== user.id && role !== "admin")
          throw Error("IBTA_CODE_USED_BY_OTHER");
        const ok = await (window.AppDialog
          ? AppDialog.confirm({
              title:
                currentLang === "ar"
                  ? "كود مستخدم بالفعل"
                  : "Code Already Used",
              message: t("confirmCopyUsed"),
              confirmText:
                currentLang === "ar" ? "نسخ على أي حال" : "Copy Anyway",
              cancelText: currentLang === "ar" ? "إلغاء" : "Cancel",
              danger: false,
              icon: "warning",
            })
          : confirm(t("confirmCopyUsed")));
        if (!ok) return false;
      } else {
        const { data, error } = await client.rpc("ibta_claim_code", {
          target_code: code,
          expected_version: prior.version,
          use_date: todayStr(),
        });
        if (error) throw error;
        if (!data.length) throw Error("CONFLICT");
        rows.set(code, data[0]);
      }
      const copied = await copyText(code);
      await load();
      if (copied) {
        setStatus("copyRecorded");
        showToast(t("copiedGeneric"));
      } else setStatus("copyReserved", true);
      return copied;
    } catch (error) {
      try {
        await load();
      } catch {}
      fail(error);
      return false;
    } finally {
      lock(false);
    }
  }
  async function editCode(
    oldCode: string,
    newCode: string,
    category: string,
    usedOn: string,
    notes: string,
  ) {
    if (!ready || busy || role !== "admin") return false;
    const prior = rows.get(oldCode);
    if (!prior) return false;
    if (
      !newCode ||
      newCode.length > 200 ||
      !Object.hasOwn(state.codesByCategory, category) ||
      (usedOn && !/^\d{2}\/\d{2}\/\d{4}$/.test(usedOn)) ||
      (newCode !== oldCode &&
        [...rows.keys()].some(
          (code) => code.toLowerCase() === newCode.toLowerCase(),
        ))
    ) {
      fail(Error("IBTA_INVALID_CODE_EDIT"));
      return false;
    }
    if (
      newCode === oldCode &&
      category === prior.category &&
      usedOn === (prior.used_on || "") &&
      notes === prior.notes
    )
      return true;
    lock(true);
    setStatus("saving");
    try {
      const { error } = await client.rpc("ibta_apply_changes", {
        changes: [
          {
            op: "replace",
            code: oldCode,
            version: prior.version,
            new_code: newCode,
            new_category: category,
            used_on: usedOn || null,
            notes,
          },
        ],
        settings_payload: null,
        settings_version: config.version,
      });
      if (error) throw error;
      await load();
      setStatus("saved");
      return true;
    } catch (error) {
      try {
        await load();
      } catch {}
      fail(error);
      return false;
    } finally {
      lock(false);
    }
  }
  async function claimTraineeCode(
    category: string,
    targetOwner: string,
    traineeName: string = "",
  ) {
    if (!ready || busy) throw Error("BUSY");
    lock(true);
    try {
      await load();
      let candidate = [...rows.values()].find(
        (r) =>
          r.category === category &&
          !r.used_on &&
          (r.owner_id === targetOwner || (role === "admin" && !r.owner_id)),
      );
      if (!candidate)
        throw Error(
          currentLang === "ar"
            ? "لا توجد أكواد متاحة لهذه الفئة للمستخدم."
            : "No available codes in this category for this user.",
        );
      if (candidate.owner_id !== targetOwner) {
        const { error } = await client.rpc("ibta_assign_codes", {
          target_owner: targetOwner,
          items: [{ code: candidate.code, version: candidate.version }],
        });
        if (error) throw error;
        await load();
        candidate = rows.get(candidate.code);
        if (
          !candidate ||
          candidate.used_on ||
          candidate.owner_id !== targetOwner
        )
          throw Error("CONFLICT");
      }
      const { data, error } = await client.rpc("ibta_claim_trainee_voucher", {
        target_code: candidate.code,
        expected_version: candidate.version,
        use_date: todayStr(),
        trainee_name: traineeName.trim(),
      });
      if (error) throw error;
      if (!data?.length) throw Error("CONFLICT");
      rows.set(candidate.code, data[0]);
      project();
      return candidate.code;
    } catch (error) {
      fail(error);
      throw error;
    } finally {
      lock(false);
    }
  }
  async function showVoucherNameError(code: string, editingUser: string, saveError) {
    if (!ready || user.id !== editingUser) return;
    if (/CONFLICT/.test(saveError.message || "")) {
      try {
        const latest = (await allRows()).find((row) => row.code === code);
        if (ready && user.id === editingUser && latest) {
          rows.set(code, latest);
          state.voucherNames[code] = latest.trainee_name || "";
        }
      } catch (refreshError) {
        fail(refreshError);
        return;
      }
    }
    fail(saveError);
  }
  async function saveVoucherName(code: string, name: string) {
    if (!ready || busy || !["admin", "operator"].includes(role)) return false;
    const prior = rows.get(code);
    if (!prior || typeof name !== "string" || name.length > 200) return false;
    const editingUser = user.id;
    setStatus("saving");
    try {
      const { data: version, error } = await client.rpc(
        "ibta_set_voucher_trainee_name",
        { target_code: code, expected_version: prior.version, trainee_name: name.trim() },
      );
      if (error) throw error;
      if (!ready || user.id !== editingUser) return false;
      const current = rows.get(code);
      if (current && current.version <= version) {
        rows.set(code, { ...current, trainee_name: name.trim(), version });
        state.voucherNames[code] = name.trim();
      }
      setStatus("saved");
      return true;
    } catch (error) {
      await showVoucherNameError(code, editingUser, error);
      return false;
    }
  }
  async function saveReportColumns(columns: Record<"operations" | "success", number[]>) {
    if (!ready) return false;
    if (!(["operations", "success"] as const).every(kind =>
      Array.isArray(columns?.[kind]) && columns[kind].length > 0 && columns[kind].length <= 20 &&
      columns[kind].every(index => Number.isInteger(index) && index >= 0 && index < 20),
    )) return false;
    const editingUser = user.id;
    try {
      const { data, error } = await client.auth.updateUser({
        data: { report_columns: columns, report_destinations: null },
      });
      if (error) throw error;
      if (!ready || user.id !== editingUser) return false;
      user = data.user || user;
      return true;
    } catch (error) {
      if (ready && user.id === editingUser) fail(error);
      return false;
    }
  }
  async function refresh(background = false) {
    if (!ready || busy) return false;
    if (
      background === true &&
      (Date.now() < nextBackgroundRefresh || hasDraftInput())
    )
      return false;
    nextBackgroundRefresh = Date.now() + BACKGROUND_REFRESH_MS;
    lock(true);
    try {
      await load();
      setStatus("refreshed");
      return true;
    } catch (e) {
      if (e.status === 429 || e.status === 503)
        nextBackgroundRefresh = Date.now() + 300000;
      if (background !== true) fail(e);
      return false;
    } finally {
      lock(false);
    }
  }
  function hasDraftInput() {
    if (typeof Trainees !== "undefined" && Trainees.hasDraft()) return true;
    if ($<HTMLDialogElement>("edit-dialog")?.open) return true;
    if (
      $("profile-name").value !== accountName() ||
      $("profile-email").value !== (user?.email || "") ||
      $("profile-current-password").value ||
      $("profile-new-password").value ||
      $("profile-confirm-password").value
    )
      return true;
    if ($("add-codes-input")?.value.trim()) return true;
    if (role === "admin" && config) {
      const p = config.payload;
      const shared = [
        ["settings-prometric-account", p.credentials?.account || ""],
        ["settings-prometric-password", p.credentials?.password || ""],
        ["settings-zoom-link", p.links?.zoom || ""],
        ["settings-prometric-link", p.links?.prometric || ""],
      ];
      if (shared.some(([id, value]) => $(id) && $(id).value !== value))
        return true;
    }
    return [
      ...document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
        ".kc-add-cat-input, .add-box textarea",
      ),
    ].some((input) => input.value.trim());
  }
  async function savePrometricSettings(event) {
    event.preventDefault();
    if (role !== "admin" || busy || !ready) return false;
    const account = $("settings-prometric-account").value.trim();
    const password = $("settings-prometric-password").value;
    const zoom = $("settings-zoom-link").value.trim();
    const prometric = $("settings-prometric-link").value.trim();
    try {
      if (!account || !password) throw Error("IBTA_CREDENTIAL_REQUIRED");
      if (!validHttpsUrl(zoom, "zoom.us")) throw Error("IBTA_INVALID_ZOOM_URL");
      if (!validHttpsUrl(prometric, "prometric.com"))
        throw Error("IBTA_INVALID_PROMETRIC_URL");
      const payload = clone(config.payload);
      payload.credentials = {
        ...(payload.credentials || {}),
        account,
        password,
      };
      payload.links = { ...(payload.links || {}), zoom, prometric };
      if (same(payload, config.payload)) return true;
      lock(true);
      setStatus("saving");
      const { error } = await client.rpc("ibta_apply_changes", {
        changes: [],
        settings_payload: payload,
        settings_version: config.version,
      });
      if (error) throw error;
      await load();
      setStatus("saved");
      showToast(t("saved"));
      return true;
    } catch (error) {
      if (/CONFLICT/.test(error.message || ""))
        try {
          await load();
        } catch {}
      fail(error);
      return false;
    } finally {
      lock(false);
    }
  }
  function profileMessage(key, error = null) {
    profileStatusKey = key;
    profileStatusError = error;
    translateUi();
  }
  async function saveProfileName(event) {
    event.preventDefault();
    if (!ready || busy) return;
    const name = $("profile-name").value.trim();
    if (!name) return;
    if (name === accountName()) return;
    lock(true);
    try {
      const { data, error } = await client.auth.updateUser({
        data: { full_name: name },
      });
      if (error) throw error;
      user = data.user || user;
      $("profile-name").value = name;
      profileMessage("profileNameSaved");
    } catch (error) {
      profileMessage("error", error);
    } finally {
      lock(false);
    }
  }
  async function saveProfileEmail(event) {
    event.preventDefault();
    if (!ready || busy) return;
    const email = $("profile-email").value.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      profileMessage("profileInvalidEmail");
      return;
    }
    if (email === (user.email || "").toLowerCase()) {
      profileMessage("profileSameEmail");
      return;
    }
    lock(true);
    try {
      const { data, error } = await client.auth.updateUser({ email });
      if (error) throw error;
      user = data.user || user;
      $("profile-email").value = user.email || "";
      profileMessage("profileEmailSent");
    } catch (error) {
      profileMessage("error", error);
    } finally {
      lock(false);
    }
  }
  async function saveProfilePassword(event) {
    event.preventDefault();
    if (!ready || busy) return;
    const current = $("profile-current-password").value,
      newPassword = $("profile-new-password").value,
      confirm = $("profile-confirm-password").value;
    if (newPassword.length < 8) {
      profileMessage("profilePasswordShort");
      return;
    }
    if (newPassword !== confirm) {
      profileMessage("profilePasswordMismatch");
      return;
    }
    lock(true);
    try {
      const attributes: CloudUserAttributes = {
        password: newPassword,
        current_password: current,
      };
      const { error } = await client.auth.updateUser(attributes);
      if (error) throw error;
      $("profile-current-password").value = "";
      $("profile-new-password").value = "";
      $("profile-confirm-password").value = "";
      profileMessage("profilePasswordSaved");
    } catch (error) {
      profileMessage("error", error);
    } finally {
      lock(false);
    }
  }
  async function enter(session: CloudSession | null) {
    if (!session) {
      ready = false;
      $("app").hidden = true;
      $("cloud-tools").hidden = true;
      $("sign-out").hidden = true;
      $("auth-box").hidden = false;
      return;
    }
    user = session.user;
    if (retainedDraftUser && retainedDraftUser !== user.id) {
      await client.auth.signOut({ scope: "local" });
      throw Error(
        currentLang === "ar"
          ? "ادخل بالحساب السابق لحفظ تعديلات الجدول أولًا."
          : "Sign in with the previous account to save your sheet edits first.",
      );
    }
    sessionDeadline = SessionPolicy.expiresAt(session.access_token || "");
    if (Date.now() >= sessionDeadline) {
      await endDailySession();
      return;
    }
    let member = await client
      .from("ibta_members")
      .select("role,active,user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (member.error) throw member.error;
    if (!member.data)
      member = await client
        .from("ibta_members")
        .select("role,active,user_id")
        .eq("email", user.email.toLowerCase())
        .maybeSingle();
    if (
      member.error ||
      !member.data?.active ||
      (member.data.user_id && member.data.user_id !== user.id)
    )
      throw Error("IBTA_NOT_APPROVED");
    role = member.data.role;
    await load();
    ready = true;
    if (typeof TraineeReports !== "undefined") TraineeReports.translate();
    clearTimeout(sessionTimer);
    sessionTimer = setTimeout(
      () => {
        void endDailySession().catch(() => {});
      },
      Math.max(0, sessionDeadline - Date.now()),
    );
    if (retainedDraftUser && typeof Trainees !== "undefined") {
      if (await Trainees.flush()) retainedDraftUser = "";
    }
    $("app").classList.add("workspace-restoring");
    $("auth-box").hidden = true;
    $("app").hidden = false;
    $("cloud-tools").hidden = false;
    $("sign-out").hidden = false;
    try {
      if (typeof restoreWorkspaceView === "function")
        await restoreWorkspaceView();
    } finally {
      $("app").classList.remove("workspace-restoring");
    }
    setStatus("dbConnected");
  }
  async function authenticate() {
    if ($("auth-actions").inert) return;
    const email = $("auth-email").value.trim(),
      password = $("auth-password").value;
    setAuthStatus("authConnecting");
    $("auth-actions").inert = true;
    try {
      if (!email || password.length < 8) throw Error("IBTA_AUTH_INVALID_INPUT");
      localStorage.setItem(REMEMBER_KEY, $("auth-remember").checked ? "1" : "0");
      const result = await client.auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;
      $("auth-password").value = "";
      if (result.data.session) await enter(result.data.session);
    } catch (e) {
      setAuthStatus("error", e);
    } finally {
      $("auth-actions").inert = false;
    }
  }
  async function importLegacy() {
    if (role !== "admin" || busy) return;
    try {
      const raw = localStorage.getItem("ibta_ops_state_v4");
      if (!raw) throw Error("IBTA_NO_LEGACY_DATA");
      const legacy = JSON.parse(raw);
      if (!legacy.codesByCategory || typeof legacy.codesByCategory !== "object")
        throw Error("IBTA_INVALID_LEGACY_DATA");
      const ok = await (window.AppDialog
        ? AppDialog.confirm({
            title:
              currentLang === "ar"
                ? "استيراد البيانات السابقة"
                : "Import Legacy Data",
            message: t("confirmImportLegacy"),
            confirmText: currentLang === "ar" ? "استيراد" : "Import",
            cancelText: currentLang === "ar" ? "إلغاء" : "Cancel",
            danger: false,
            icon: "info",
          })
        : confirm(t("confirmImportLegacy")));
      if (!ok) return;
      await refresh();
      for (const [cat, codes] of Object.entries(legacy.codesByCategory)) {
        if (!Array.isArray(codes)) continue;
        state.codesByCategory[cat] ||= [];
        for (const code of codes) {
          if (typeof code !== "string" || !code.trim()) continue;
          if (!rows.has(code)) state.codesByCategory[cat].push(code);
          if (
            !state.usedCodes[code] &&
            typeof legacy.usedCodes?.[code] === "string"
          )
            state.usedCodes[code] = legacy.usedCodes[code];
          if (
            !state.codeNotes[code] &&
            typeof legacy.codeNotes?.[code] === "string"
          )
            state.codeNotes[code] = legacy.codeNotes[code];
        }
      }
      for (const cat of legacy.categoryOrder || [])
        if (typeof cat === "string" && !state.categoryOrder.includes(cat))
          state.categoryOrder.push(cat);
      if (await persist()) setStatus("legacyImported");
    } catch (e) {
      fail(e);
    }
  }
  async function addMember() {
    if (role !== "admin" || !$("member-email")) return;
    const email = $("member-email").value.trim().toLowerCase();
    if (!email || !email.includes("@")) return;
    const memberRole = $("member-role")?.value || "operator";
    if (!["copy_only", "operator", "admin"].includes(memberRole)) return;
    const { error } = await client
      .from("ibta_members")
      .insert({ email, role: memberRole, active: true });
    if (error) fail(error);
    else {
      setStatus("memberAdded", false, email);
      if ($("member-email")) $("member-email").value = "";
      if (typeof renderMemberList === "function" && $("member-list"))
        renderMemberList();
    }
  }
  async function exportData() {
    if (role !== "admin") return;
    if (typeof Trainees !== "undefined" && !(await Trainees.flush())) return;
    if (!(await refresh())) return;
    const traineeSheets = [];
    try {
      for (let offset = 0; ; offset += 100) {
        const { data, error } = await client
          .from("ibta_trainee_sheets")
          .select(
            "owner_id,sheet_id,sheet_name,sheet_order,sheet_hidden,tab_color,cells,format",
          )
          .order("owner_id")
          .order("sheet_id")
          .range(offset, offset + 99);
        if (error) throw error;
        traineeSheets.push(...data);
        if (data.length < 100) break;
      }
    } catch (error) {
      fail(error);
      return;
    }
    const blob = new Blob(
      [
        JSON.stringify(
          {
            format: "trainflow-backup",
            version: 4,
            exportedAt: new Date().toISOString(),
            settings: config.payload,
            codes: [...rows.values()],
            supervisorStock: [...stock].map(([category, remaining]) => ({
              category,
              remaining,
            })),
            traineeSheets,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    if (blob.size > 10000000) {
      setStatus(
        "error",
        true,
        Error(
          currentLang === "ar"
            ? "النسخة تتجاوز 10 ميجابايت. انسخ جداول المتدربين منفصلة قبل المتابعة."
            : "Backup exceeds 10 MB. Copy trainee sheets separately before continuing.",
        ),
      );
      return;
    }
    const url = window.URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download =
      "trainflow-backup-" + new Date().toISOString().slice(0, 10) + ".json";
    a.click();
    window.URL.revokeObjectURL(url);
  }
  async function exportCodesCsv() {
    if (role !== "admin") return;
    if (!(await refresh())) return;
    const csvCell = (value) => {
      let text = String(value ?? "");
      if (/^[=+@\-\t\r]/.test(text)) text = "'" + text;
      return '"' + text.replaceAll('"', '""') + '"';
    };
    const lines = [
      ["Code", "Category", "Used On", "Trainee name"],
      ...[...rows.values()].map((row) => [
        row.code,
        row.category,
        row.used_on || "",
        row.trainee_name || "",
      ]),
    ];
    const blob = new Blob(
      [
        "\uFEFF" +
          lines.map((line) => line.map(csvCell).join(",")).join("\r\n"),
      ],
      { type: "text/csv;charset=utf-8" },
    );
    const url = window.URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download =
      "trainflow-codes-" + new Date().toISOString().slice(0, 10) + ".csv";
    a.click();
    window.URL.revokeObjectURL(url);
  }
  async function restoreData(backup) {
    if (!ready || role !== "admin") throw Error("IBTA_NOT_APPROVED");
    if (typeof Trainees !== "undefined" && !(await Trainees.flush()))
      throw Error("UNSAVED_SHEET");
    if (
      backup?.format &&
      !["trainflow-backup", "ibta-ops-backup"].includes(backup.format)
    )
      throw Error("IBTA_INVALID_BACKUP");
    if (
      !Array.isArray(backup?.settings?.categoryOrder) ||
      !Array.isArray(backup?.settings?.codeCategories) ||
      !Array.isArray(backup?.settings?.keycodes) ||
      !Array.isArray(backup.codes)
    )
      throw Error("IBTA_INVALID_BACKUP");
    if (
      backup.supervisorStock !== undefined &&
      (!Array.isArray(backup.supervisorStock) ||
        backup.supervisorStock.some(
          (row) =>
            !row ||
            typeof row.category !== "string" ||
            !Number.isInteger(row.remaining) ||
            row.remaining < 0 ||
            row.remaining > 1000000,
        ))
    )
      throw Error("IBTA_INVALID_BACKUP");
    lock(true);
    setStatus("saving");
    try {
      const { error } = await client.rpc("ibta_restore_backup", {
        backup,
        expected_version: config.version,
      });
      if (error) throw error;
      if (backup.traineeSheets !== undefined && typeof Trainees !== "undefined")
        Trainees.reset();
      await load();
      setStatus("saved");
      return true;
    } catch (error) {
      fail(error);
      throw error;
    } finally {
      lock(false);
    }
  }
  async function importCodes(category: string, codes: string[]) {
    if (!ready || role !== "admin") throw Error("IBTA_NOT_APPROVED");
    if (!Object.hasOwn(state.codesByCategory, category))
      throw Error("IBTA_INVALID_CATEGORY");
    lock(true);
    setStatus("saving");
    try {
      const { data, error } = await client.rpc("ibta_import_codes", {
        target_category: category,
        new_codes: codes,
      });
      if (error) throw error;
      await load();
      setStatus("saved");
      return data;
    } catch (error) {
      fail(error);
      throw error;
    } finally {
      lock(false);
    }
  }
  async function changeSupervisorStock(
    category: string,
    mode: "opening" | "replenishment" | "correction",
    quantity: number,
  ) {
    if (!ready || role !== "admin") throw Error("IBTA_NOT_APPROVED");
    if (
      !Object.hasOwn(state.codesByCategory, category) ||
      !["opening", "replenishment", "correction"].includes(mode) ||
      !Number.isInteger(quantity) ||
      quantity < 0 ||
      quantity > 1000000
    )
      throw Error("IBTA_INVALID_STOCK_CHANGE");
    lock(true);
    setStatus("saving");
    try {
      const { error } = await client.rpc("ibta_change_supervisor_stock", {
        target_category: category,
        mode,
        quantity,
      });
      if (error) throw error;
      await load();
      setStatus("saved");
      return true;
    } catch (error) {
      fail(error);
      throw error;
    } finally {
      lock(false);
    }
  }
  async function listMembers(): Promise<CloudMember[]> {
    if (role !== "admin") return [];
    const { data, error } = await client
      .from("ibta_members")
      .select("email,role,active,user_id")
      .order("email");
    if (error) throw error;
    return data;
  }
  async function updateMember(
    email: string,
    nextRole: CloudRole,
    active: boolean,
  ) {
    if (role !== "admin") throw Error("IBTA_NOT_APPROVED");
    if (!["copy_only", "operator", "admin"].includes(nextRole))
      throw Error("IBTA_INVALID_ROLE");
    const { error } = await client
      .from("ibta_members")
      .update({ role: nextRole, active })
      .eq("email", email);
    if (error) throw error;
  }
  async function auditEvents() {
    if (role !== "admin") return [];
    const { data, error } = await client
      .from("ibta_audit")
      .select("id,actor,action,entity,record_key,happened_at")
      .order("happened_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return data;
  }
  async function boot() {
    $("auth-box").hidden = true;
    $("startup-screen").hidden = false;
    $("startup-message").textContent =
      currentLang === "ar" ? "جارٍ تحميل مساحة العمل…" : "Loading workspace…";
    try {
      if (!window.supabase) throw Error("IBTA_LIBRARY_LOAD_FAILED");
      $("auth-remember").checked = localStorage.getItem(REMEMBER_KEY) === "1";
      client = window.supabase.createClient(SUPABASE_URL, KEY, {
        global: { fetch: serverFetch },
        auth: {
          storage: authStorage,
          persistSession: true,
          detectSessionInUrl: false,
        },
      });
      $("auth-form").addEventListener("submit", (e) => {
        e.preventDefault();
        authenticate();
      });
      $("import-legacy").addEventListener("click", importLegacy);
      $("export-data").addEventListener("click", exportData);
      $("export-codes-csv").addEventListener("click", exportCodesCsv);
      if ($("add-member")) $("add-member").addEventListener("click", addMember);
      $("prometric-settings-form").addEventListener(
        "submit",
        savePrometricSettings,
      );
      $("profile-name-form").addEventListener("submit", saveProfileName);
      $("profile-email-form").addEventListener("submit", saveProfileEmail);
      $("profile-password-form").addEventListener(
        "submit",
        saveProfilePassword,
      );
      $("sign-out").addEventListener("click", async () => {
        if (typeof Trainees !== "undefined" && !(await Trainees.flush()))
          return;
        ready = false;
        await client.auth.signOut({ scope: "local" });
        location.reload();
      });
      client.auth.onAuthStateChange((event, session) => {
        if (event === "SIGNED_OUT") {
          ready = false;
          clearTimeout(sessionTimer);
          if (typeof Trainees !== "undefined" && !retainedDraftUser)
            Trainees.reset();
          $("app").hidden = true;
          $("cloud-tools").hidden = true;
          $("sign-out").hidden = true;
          $("auth-box").hidden = false;
        }
        if (event === "USER_UPDATED" && session?.user) {
          user = session.user;
          translateUi();
        }
      });
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      await enter(data.session);
      setInterval(() => {
        if (checkDailySession()) return;
        if (
          ready &&
          sessionDeadline - Date.now() < 60000 &&
          typeof Trainees !== "undefined" &&
          Trainees.hasDraft()
        ) {
          void Trainees.flush();
        }
        if (
          ready &&
          !busy &&
          !document.hidden &&
          !document.activeElement?.matches("input,textarea,select") &&
          !selectedCodes.size
        ) {
          refresh(true);
        }
      }, 30000);
      window.addEventListener("focus", checkDailySession);
      document.addEventListener("visibilitychange", () => {
        if (!document.hidden) checkDailySession();
      });
      window.addEventListener("beforeunload", (e) => {
        if (busy) {
          e.preventDefault();
          e.returnValue = "";
        }
      });
    } catch (e) {
      setAuthStatus("error", e);
    } finally {
      $("startup-screen").hidden = true;
      if (!ready) $("auth-box").hidden = false;
    }
  }
  const FIRST_SHEET = "00000000-0000-0000-0000-000000000001";
  async function listTraineeSheets(owner: string): Promise<CloudWorksheet[]> {
    if (!ready) throw Error("AUTH_REQUIRED");
    const { data, error } = await client
      .from("ibta_trainee_sheets")
      .select("sheet_id,sheet_name,sheet_order,sheet_hidden,tab_color")
      .eq("owner_id", owner)
      .order("sheet_order")
      .order("sheet_id");
    if (error) throw error;
    return data.length
      ? data
      : [
          {
            sheet_id: FIRST_SHEET,
            sheet_name: "Sheet 1",
            sheet_order: 0,
            sheet_hidden: false,
            tab_color: null,
          },
        ];
  }
  async function traineeSheetAction(
    owner: string,
    sheet: string,
    action: CloudSheetAction,
    options: CloudSheetOptions = {},
  ) {
    if (!ready) throw Error("AUTH_REQUIRED");
    const { data, error } = await client.rpc("ibta_trainee_worksheet_action", {
      target_owner: owner,
      target_sheet: sheet,
      action,
      new_name: options.name ?? null,
      new_order: options.order ?? null,
      new_color: options.color ?? null,
    });
    if (error) throw error;
    return data;
  }
  async function readTrainees(
    owner: string,
    sheet: string = FIRST_SHEET,
  ): Promise<CloudSheet> {
    if (!ready) throw Error("AUTH_REQUIRED");
    const { data, error } = await client
      .from("ibta_trainee_sheets")
      .select("cells,version,format")
      .eq("owner_id", owner)
      .eq("sheet_id", sheet)
      .maybeSingle();
    if (error) throw error;
    return data || { cells: [], version: 0 };
  }
  // Keep the tested grid's positional save contract during this migration.
  async function saveTrainees(
    owner: string,
    cells: CloudCells,
    version: number,
    format: Record<string, CloudJson>,
    sheet: string = FIRST_SHEET,
  ): Promise<number> {
    if (!ready) throw Error("AUTH_REQUIRED");
    const { data, error } = await client.rpc("ibta_save_trainee_worksheet", {
      target_owner: owner,
      target_sheet: sheet,
      new_cells: cells,
      expected_version: version,
      new_format: format,
    });
    if (error) throw error;
    return data;
  }
  async function assignCodes(
    owner: string | null,
    items: { code: string; version: number }[],
  ) {
    if (!ready || role !== "admin") throw Error("IBTA_NOT_APPROVED");
    const { error } = await client.rpc("ibta_assign_codes", {
      target_owner: owner,
      items,
    });
    if (error) throw error;
    await load();
  }
  return {
    boot,
    persist,
    copyCode,
    claimTraineeCode,
    saveVoucherName,
    saveReportColumns,
    reportColumns: () => ready ? user?.user_metadata?.report_columns || null : undefined,
    editCode,
    decorate,
    refresh,
    translateUi,
    restoreData,
    exportData,
    importCodes,
    listMembers,
    updateMember,
    auditEvents,
    exportCodesCsv,
    changeSupervisorStock,
    readTrainees,
    saveTrainees,
    listTraineeSheets,
    traineeSheetAction,
    assignCodes,
    userId: () => user?.id || "",
    codeSnapshot: () => [...rows.values()].map((row) => ({ ...row })),
    role: () => role,
    email: () => user?.email || "",
    existingCodes: () => [...rows.keys()],
    stockSnapshot: () => Object.fromEntries(stock),
    inventoryMessageSettings: () => ({
      name: config?.payload?.inventorySupervisorName || "",
      language:
        config?.payload?.inventoryMessageLanguage === "en" ? "en" : "ar",
    }),
  };
})();
