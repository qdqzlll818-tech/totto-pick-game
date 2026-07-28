(() => {
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

  function getClient() {
    if (client) return client;
    if (!window.supabase?.createClient) {
      throw new Error("云同步组件加载失败，请刷新页面重试");
    }
    client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
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
      bestScore: Math.max(0, Number(rawProgress.bestScore) || 0)
    };
    const skins = unique(readJson(SKIN_KEY, []));
    const equipped = localStorage.getItem(EQUIPPED_KEY) || "default";
    return { progress, skins, equipped };
  }

  function saveLocalData(data) {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(data.progress));
    localStorage.setItem(SKIN_KEY, JSON.stringify(data.skins));
    localStorage.setItem(EQUIPPED_KEY, data.equipped);
  }

  async function getSession() {
    const { data, error } = await getClient().auth.getSession();
    if (error) throw error;
    return data.session;
  }

  async function signInWithEmail(email) {
    const redirectTo = `${location.origin}${location.pathname}`;
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
    const remoteBest = Math.max(0, ...remoteLevels.map(row => Number(row.best_score) || 0));
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

    const merged = { progress, skins, equipped };
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
        const remote = remoteLevels.find(row => row.level_id === levelId);
        return {
          user_id: userId,
          level_id: levelId,
          completed: true,
          best_score: Math.max(
            Number(remote?.best_score) || 0,
            levelId === "hotpot" ? progress.bestScore : 0
          ),
          best_time_ms: remote?.best_time_ms ?? null,
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

    window.dispatchEvent(new CustomEvent("totto:cloud-synced", {
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

  window.TottoCloud = {
    getClient,
    getSession,
    signInWithEmail,
    signOut,
    syncLocalProgress,
    onAuthStateChange,
    getLocalData
  };
})();
