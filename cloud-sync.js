(root => {
  "use strict";

  const SUPABASE_URL = "https://xbvgmkikyhhpsqirqwjs.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_xynGygnLUumJPQ1GEEKbKQ_TNGUIEzu";
  const SKIN_KEY = "totto-pick-skins-v1";
  const EQUIPPED_KEY = "totto-pick-equipped-skin-v1";
  const PROGRESS_KEY = "totto-pick-progress-v1";

  let client;
  let syncPromise = null;

  function readJson(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch {
      return fallback;
    }
  }

  function unique(values) {
    return [...new Set(values.filter(Boolean))];
  }

  function mergeLevelRows(localRows, remoteRows) {
    const rows = new Map();
    for (const row of [...localRows, ...remoteRows]) {
      const current = rows.get(row.level_id);
      rows.set(row.level_id, {
        level_id: row.level_id,
        best_score: Math.max(current?.best_score || 0, row.best_score || 0),
        best_time_ms: [current?.best_time_ms, row.best_time_ms]
          .filter(value => Number.isFinite(value) && value > 0)
          .sort((a, b) => a - b)[0] || null
      });
    }
    return [...rows.values()];
  }

  function canClaimDailyBonus(lastDate, today) {
    return lastDate !== today;
  }

  function getClient() {
    if (client) return client;
    if (!root.supabase?.createClient) {
      throw new Error("云同步组件加载失败，请刷新页面重试");
    }
    client = root.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
    return client;
  }

  function getLocalData() {
    const rawProgress = readJson(PROGRESS_KEY, {});
    const progress = {
      completed: Array.isArray(rawProgress.completed) ? unique(rawProgress.completed) : [],
      coins: Math.max(0, Number(rawProgress.coins) || 0),
      clears: Math.max(0, Number(rawProgress.clears) || 0),
      bestScore: Math.max(0, Number(rawProgress.bestScore) || 0),
      levels: rawProgress.levels && typeof rawProgress.levels === "object" ? rawProgress.levels : {},
      bobaBonusDate: rawProgress.bobaBonusDate || null
    };
    const skins = unique(readJson(SKIN_KEY, []));
    const equipped = localStorage.getItem(EQUIPPED_KEY) || "default";
    const levels = Object.entries(progress.levels).map(([level_id, values]) => ({
      level_id,
      best_score: Math.max(0, Number(values?.best_score) || 0),
      best_time_ms: Number(values?.best_time_ms) > 0 ? Number(values.best_time_ms) : null
    }));
    return { progress, skins, equipped, levels };
  }

  function saveLocalData(data) {
    const levels = Object.fromEntries((data.levels || []).map(row => [row.level_id, {
      best_score: row.best_score,
      best_time_ms: row.best_time_ms
    }]));
    localStorage.setItem(PROGRESS_KEY, JSON.stringify({ ...data.progress, levels }));
    localStorage.setItem(SKIN_KEY, JSON.stringify(data.skins));
    localStorage.setItem(EQUIPPED_KEY, data.equipped);
  }

  async function getSession() {
    const { data, error } = await getClient().auth.getSession();
    if (error) throw error;
    return data.session;
  }

  async function signInWithEmail(email) {
    const redirectTo = `${root.location.origin}${root.location.pathname}`;
    const { error } = await getClient().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo }
    });
    if (error) throw error;
  }

  async function signOut() {
    const { error } = await getClient().auth.signOut();
    if (error) throw error;
  }

  async function performSync() {
    const session = await getSession();
    if (!session) return null;

    const api = getClient();
    const userId = session.user.id;
    const local = getLocalData();
    const [profileResult, levelsResult, skinsResult] = await Promise.all([
      api.from("profiles").select("*").eq("id", userId).maybeSingle(),
      api.from("level_progress").select("*").eq("user_id", userId),
      api.from("user_skins").select("*").eq("user_id", userId)
    ]);

    const readError = profileResult.error || levelsResult.error || skinsResult.error;
    if (readError) throw readError;

    const profile = profileResult.data;
    const remoteLevels = levelsResult.data || [];
    const remoteSkins = (skinsResult.data || []).map(row => row.skin_id);
    const completed = unique([
      ...local.progress.completed,
      ...remoteLevels.filter(row => row.completed).map(row => row.level_id)
    ]);
    const skins = unique([...local.skins, ...remoteSkins]);
    const levels = mergeLevelRows(local.levels, remoteLevels);
    const remoteBest = Math.max(0, ...levels.map(row => Number(row.best_score) || 0));
    const progress = {
      completed,
      coins: Math.max(local.progress.coins, Number(profile?.coins) || 0),
      clears: Math.max(local.progress.clears, Number(profile?.clears) || 0),
      bestScore: Math.max(local.progress.bestScore, Number(profile?.best_score) || 0, remoteBest)
    };

    let equipped = local.equipped;
    if (equipped !== "default" && !skins.includes(equipped)) {
      equipped = profile?.equipped_skin || "default";
    }
    if (equipped !== "default" && !skins.includes(equipped)) equipped = "default";

    const merged = { progress, skins, equipped, levels };
    saveLocalData(merged);

    const writes = [
      api.from("profiles").upsert({
        id: userId,
        display_name: session.user.email?.split("@")[0] || "托托玩家",
        coins: progress.coins,
        clears: progress.clears,
        best_score: progress.bestScore,
        equipped_skin: equipped,
        updated_at: new Date().toISOString()
      })
    ];

    if (completed.length) {
      writes.push(api.from("level_progress").upsert(completed.map(levelId => {
        const current = levels.find(row => row.level_id === levelId);
        const remote = remoteLevels.find(row => row.level_id === levelId);
        return {
          user_id: userId,
          level_id: levelId,
          completed: true,
          best_score: current?.best_score || 0,
          best_time_ms: current?.best_time_ms ?? null,
          completed_at: remote?.completed_at || new Date().toISOString()
        };
      })));
    }

    if (skins.length) {
      writes.push(api.from("user_skins").upsert(
        skins.map(skinId => ({ user_id: userId, skin_id: skinId })),
        { onConflict: "user_id,skin_id", ignoreDuplicates: true }
      ));
    }

    const results = await Promise.all(writes);
    const writeError = results.find(result => result.error)?.error;
    if (writeError) throw writeError;

    root.dispatchEvent(new root.CustomEvent("totto:cloud-synced", {
      detail: { ...merged, user: session.user }
    }));
    return { ...merged, user: session.user };
  }

  function syncLocalProgress() {
    if (syncPromise) return syncPromise;
    syncPromise = performSync().finally(() => {
      syncPromise = null;
    });
    return syncPromise;
  }

  function onAuthStateChange(callback) {
    return getClient().auth.onAuthStateChange((event, session) => callback(event, session));
  }

  const api = {
    getClient,
    getSession,
    signInWithEmail,
    signOut,
    syncLocalProgress,
    onAuthStateChange,
    getLocalData,
    unique,
    mergeLevelRows,
    canClaimDailyBonus
  };
  if (typeof module === "object" && module.exports) {
    module.exports = { unique, mergeLevelRows, canClaimDailyBonus };
  }
  if (root) root.TottoCloud = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
