/* Sandbox TikTok demo for geek-innovation.com.
   The browser talks only to the company Worker. It never sends or stores
   a client secret, access token, or refresh token. */
(function (factory) {
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof document === "undefined") return;
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { api.mount(); });
  } else {
    api.mount();
  }
})(function () {
  "use strict";

  var API = "https://geek-innovation-api.guoyi4491.workers.dev";
  var REDIRECT_URI = "https://geek-innovation.com/tiktok-demo/callback/";
  var SAMPLE_VIDEO_URL = "https://geek-innovation.com/tiktok-demo/media/sample.mp4";
  var AUTHORIZE_URL = "https://www.tiktok.com/v2/auth/authorize/";
  var SCOPES = "user.info.basic,video.publish";
  var STATE_KEY = "tiktok_demo_oauth_state";
  var SESSION_KEY = "tiktok_demo_session";
  var STATE_COOKIE = "tiktok_demo_state";

  function isSecretKey(key) {
    return /secret|access_token|refresh_token|id_token|password|auth_code|authorization/i.test(String(key));
  }

  function redact(value, depth) {
    if (depth === undefined) depth = 0;
    if (depth > 6) return null;
    if (Array.isArray(value)) {
      return value.map(function (item) { return redact(item, depth + 1); });
    }
    if (value && typeof value === "object") {
      var out = {};
      Object.keys(value).forEach(function (key) {
        out[key] = isSecretKey(key) ? "[removed]" : redact(value[key], depth + 1);
      });
      return out;
    }
    if (typeof value === "string") {
      if (/^(act\.|rft\.)/.test(value)) return "[removed]";
      return value.length > 4000 ? value.slice(0, 4000) + "…" : value;
    }
    return value;
  }

  function hasCredentialFields(value, depth) {
    if (!value || typeof value !== "object" || (depth || 0) > 5) return false;
    var keys = Object.keys(value);
    for (var i = 0; i < keys.length; i++) {
      var present = value[keys[i]] != null && value[keys[i]] !== "";
      if (isSecretKey(keys[i]) && present) return true;
      if (hasCredentialFields(value[keys[i]], (depth || 0) + 1)) return true;
    }
    return false;
  }

  function publicText(value) {
    return String(value || "")
      .replace(/act\.[A-Za-z0-9._~+/-]+/g, "[removed]")
      .replace(/rft\.[A-Za-z0-9._~+/-]+/g, "[removed]")
      .slice(0, 500);
  }

  function unwrap(body) {
    if (!body || typeof body !== "object" || Array.isArray(body)) return body;
    if (!body.data || typeof body.data !== "object" || Array.isArray(body.data)) return body;
    var merged = {};
    Object.keys(body).forEach(function (key) {
      if (key !== "data") merged[key] = body[key];
    });
    Object.keys(body.data).forEach(function (key) {
      merged[key] = body.data[key];
    });
    return merged;
  }

  function isPublicClientKey(value) {
    return typeof value === "string" && /^[A-Za-z0-9_-]{8,128}$/.test(value);
  }

  function clientKeyFromConfig(body) {
    var source = unwrap(body);
    if (!source || typeof source !== "object") return "";
    var value = source.client_key || source.clientKey;
    return isPublicClientKey(value) ? value : "";
  }

  function cleanId(value) {
    if (typeof value !== "string") return "";
    var trimmed = value.trim();
    if (!trimmed || trimmed.length > 180) return "";
    if (/act\.|rft\.|secret|token/i.test(trimmed)) return "";
    return trimmed;
  }

  function safeSession(body) {
    var source = unwrap(body);
    if (!source || typeof source !== "object") return null;
    var openId = cleanId(source.open_id);
    if (!openId) return null;
    var session = { open_id: openId };
    if (typeof source.scope === "string" && !/act\.|rft\.|secret/i.test(source.scope)) {
      session.scope = source.scope.trim().slice(0, 300);
    }
    if (typeof source.expires_in === "number" && isFinite(source.expires_in) && source.expires_in >= 0) {
      session.expires_in = source.expires_in;
    }
    if (typeof source.token_type === "string" && !/act\.|rft\.|secret/i.test(source.token_type)) {
      session.token_type = source.token_type.trim().slice(0, 40);
    }
    var nickname = source.creator_nickname || source.nickname || source.display_name;
    if (typeof nickname === "string" && nickname.trim()) {
      session.nickname = nickname.trim().slice(0, 80);
    }
    ["comment_disabled", "duet_disabled", "stitch_disabled"].forEach(function (key) {
      if (typeof source[key] === "boolean") session[key] = source[key];
    });
    if (typeof source.max_video_post_duration_sec === "number" && source.max_video_post_duration_sec > 0) {
      session.max_video_post_duration_sec = source.max_video_post_duration_sec;
    }
    if (Array.isArray(source.privacy_level_options)) {
      session.privacy_level_options = source.privacy_level_options.filter(function (item) {
        return item === "PUBLIC_TO_EVERYONE" || item === "MUTUAL_FOLLOW_FRIENDS" || item === "FOLLOWER_OF_CREATOR" || item === "SELF_ONLY";
      });
    }
    if (typeof source.obtained_at === "number") session.obtained_at = source.obtained_at;
    return session;
  }

  function workerOk(result) {
    if (!result || result.network || !result.ok) return false;
    if (!result.body) return true;
    if (result.body.ok === false) return false;
    if (typeof result.body.error === "string" && result.body.error && result.body.error !== "ok") return false;
    if (result.body.error && typeof result.body.error === "object" && result.body.error.code && result.body.error.code !== "ok") return false;
    return true;
  }

  function explainFailure(route, result) {
    if (!result || result.network) {
      return "The browser could not read " + API + route + ". Open this demo on https://geek-innovation.com or https://www.geek-innovation.com. Those are the origins the Worker allows. On any other host the browser blocks the response, even when the Worker is online.";
    }
    var code = "";
    if (result.body && typeof result.body.error === "string") code = result.body.error;
    if (result.body && result.body.error && typeof result.body.error.code === "string") code = result.body.error.code;
    if (result.status === 404 || code === "not_found") {
      if (route === "/config") {
        return "GET /config is not on the Worker yet, so this page does not have the public client key and will not open TikTok with a substitute. When the route is ready, it should return JSON containing only the public client_key. The client secret stays on the Worker.";
      }
      if (route === "/oauth/token") {
        return "POST /oauth/token is not on the Worker yet. This page sends the one-time authorization code and the registered redirect URI there. The Worker exchanges them with TikTok and should return only ok, open_id, scope, expires_in, and token_type.";
      }
      if (route === "/publish") {
        return "POST /publish is not on the Worker yet, so nothing was posted to TikTok. Next step: the Worker should accept the JSON shown above, use the access token it stored for this open_id during the code exchange, and call https://open.tiktokapis.com/v2/post/publish/video/init/ with source PULL_FROM_URL and privacy_level SELF_ONLY. The access token must not come back to this browser.";
      }
    }
    if (result.status === 503 || code === "server_not_configured") {
      return "The Worker is reachable, and it reports that the TikTok app credentials are not configured. Set them in the Worker environment only. This website cannot finish the code exchange or the post until GET /health reports configured: true.";
    }
    if (code === "origin_not_allowed") {
      return "The Worker refused this page's origin. Open the demo on https://geek-innovation.com or https://www.geek-innovation.com. Those are the origins it allows.";
    }
    if (result.status === 401 || result.status === 403) {
      return "The Worker rejected the request (HTTP " + result.status + "). If the authorization code expired, start Login Kit again. This page does not keep the code.";
    }
    return "The Worker returned HTTP " + result.status + " for " + route + ". Credential fields are removed from the body below.";
  }

  function parseVideoUrl(value) {
    var url;
    try { url = new URL(value); }
    catch (error) { return { error: "Enter an https address that ends in .mp4." }; }
    if (url.protocol !== "https:") return { error: "TikTok can pull the video only from an https address." };
    if (url.username || url.password) return { error: "Remove the username and password from the video address." };
    var secretQuery = false;
    url.searchParams.forEach(function (_value, key) {
      if (isSecretKey(key)) secretQuery = true;
    });
    if (secretQuery) return { error: "That address has a credential parameter. Use a public MP4 address instead." };
    if (!url.pathname.toLowerCase().endsWith(".mp4")) return { error: "The address needs to end with .mp4." };
    return { url: url.toString() };
  }

  function buildAuthorizeUrl(clientKey, state) {
    if (!isPublicClientKey(clientKey)) throw new Error("missing client key");
    var params = new URLSearchParams();
    params.set("client_key", clientKey);
    params.set("response_type", "code");
    params.set("scope", SCOPES);
    params.set("redirect_uri", REDIRECT_URI);
    params.set("state", state);
    params.set("disable_auto_auth", "1");
    return AUTHORIZE_URL + "?" + params.toString();
  }

  function buildPublishBody(session, form) {
    var postInfo = {
      disable_comment: !form.allowComment,
      disable_duet: !form.allowDuet,
      disable_stitch: !form.allowStitch,
      video_cover_timestamp_ms: form.coverMs,
      brand_content_toggle: !!form.brandContent,
      brand_organic_toggle: !!form.brandOrganic
    };
    if (form.privacy === "SELF_ONLY") postInfo.privacy_level = "SELF_ONLY";
    if (form.caption) postInfo.title = form.caption;
    var body = {
      post_info: postInfo,
      source_info: { source: "PULL_FROM_URL" }
    };
    if (form.videoUrl) body.source_info.video_url = form.videoUrl;
    if (session && session.open_id) body.open_id = session.open_id;
    return body;
  }

  function formProblems(form) {
    var problems = [];
    if (form.privacyBlocked) {
      problems.push("This TikTok account did not offer Only me, so this sandbox demo cannot post.");
    } else if (form.privacy !== "SELF_ONLY") {
      problems.push("Choose Only me (SELF_ONLY). Sandbox Direct Post is private.");
    }
    if (!form.videoUrl) problems.push(form.videoError || "Choose a public https MP4.");
    if (form.captionLength > 2200) problems.push("The caption must be 2,200 characters or fewer.");
    if (form.durationSec && form.maxDurationSec && form.durationSec > form.maxDurationSec) {
      problems.push("This video is longer than the " + form.maxDurationSec + " seconds TikTok currently allows for this account.");
    }
    if (form.commercial) {
      if (form.brandContent) problems.push("Branded content visibility cannot be set to private.");
      else if (!form.brandOrganic) problems.push("You need to indicate if your content promotes yourself, a third party, or both.");
    }
    if (!form.consent) problems.push("Confirm TikTok's Music Usage Confirmation before posting.");
    return problems;
  }

  function renderJson(value) {
    if (value == null) return "No response body.";
    try { return JSON.stringify(redact(value), null, 2); }
    catch (error) { return "The response could not be shown."; }
  }

  function mount() {
    if (location.hostname === "www.geek-innovation.com") {
      location.replace("https://geek-innovation.com" + location.pathname + location.search + location.hash);
      return;
    }

    var page = document.body.getAttribute("data-demo-page") || "";
    var clientKey = "";
    var session = loadSession();
    var durationSec = 0;
    var posting = false;

    function $(id) { return document.getElementById(id); }

    function storageGet(key) {
      try { return sessionStorage.getItem(key); }
      catch (error) { return null; }
    }
    function storageSet(key, value) {
      try { sessionStorage.setItem(key, value); }
      catch (error) { /* this tab can still finish the current visit */ }
    }
    function storageRemove(key) {
      try { sessionStorage.removeItem(key); }
      catch (error) { /* ignore */ }
    }

    function loadSession() {
      var raw = null;
      try { raw = sessionStorage.getItem(SESSION_KEY); }
      catch (error) { raw = null; }
      if (!raw) return null;
      try { return safeSession(JSON.parse(raw)); }
      catch (error) { return null; }
    }

    function persistSession(value) {
      var safe = safeSession(value);
      if (!safe) return null;
      safe.obtained_at = safe.obtained_at || Date.now();
      storageSet(SESSION_KEY, JSON.stringify(safeSession(safe)));
      session = safeSession(safe);
      return session;
    }

    function readCookie(name) {
      var parts = document.cookie ? document.cookie.split(/; */) : [];
      for (var i = 0; i < parts.length; i++) {
        var eq = parts[i].indexOf("=");
        if (eq === -1) continue;
        if (parts[i].slice(0, eq) === name) {
          try { return decodeURIComponent(parts[i].slice(eq + 1)); }
          catch (error) { return ""; }
        }
      }
      return "";
    }

    function writeStateCookie(state) {
      var secure = location.protocol === "https:" ? "; Secure" : "";
      document.cookie = STATE_COOKIE + "=" + encodeURIComponent(state) + "; Max-Age=600; Path=/tiktok-demo/; SameSite=Lax" + secure;
    }

    function clearState() {
      storageRemove(STATE_KEY);
      var secure = location.protocol === "https:" ? "; Secure" : "";
      document.cookie = STATE_COOKIE + "=; Max-Age=0; Path=/tiktok-demo/; SameSite=Lax" + secure;
    }

    function randomState() {
      if (!window.crypto || !window.crypto.getRandomValues) return "";
      var bytes = new Uint8Array(24);
      window.crypto.getRandomValues(bytes);
      var binary = "";
      for (var i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
    }

    function setPill(id, kind, text) {
      var pill = $(id);
      if (!pill) return;
      pill.className = "demo-pill " + kind;
      pill.textContent = text;
    }

    function setText(id, text) {
      var el = $(id);
      if (el) el.textContent = text;
    }

    function setNotice(id, kind, message) {
      var el = $(id);
      if (!el) return;
      el.className = "notice" + (kind ? " " + kind : "");
      while (el.firstChild) el.removeChild(el.firstChild);
      var p = document.createElement("p");
      p.textContent = message;
      el.appendChild(p);
    }

    function readResponse(response) {
      return response.text().then(function (text) {
        var parsed = null;
        if (text) {
          try { parsed = JSON.parse(text); }
          catch (error) { parsed = { error: "unreadable_response" }; }
        }
        return {
          ok: response.ok,
          network: false,
          status: response.status,
          leaked: hasCredentialFields(parsed),
          body: redact(parsed)
        };
      });
    }

    function getJson(url) {
      return fetch(url, {
        method: "GET",
        credentials: "omit",
        cache: "no-store",
        headers: { "Accept": "application/json" }
      }).then(readResponse, function () {
        return { ok: false, network: true, status: 0, leaked: false, body: null };
      });
    }

    function postJson(url, payload) {
      return fetch(url, {
        method: "POST",
        credentials: "omit",
        cache: "no-store",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      }).then(readResponse, function () {
        return { ok: false, network: true, status: 0, leaked: false, body: null };
      });
    }

    function leakSentence(result) {
      return result && result.leaked
        ? " Credential fields in the Worker response were removed and were not saved in this browser."
        : "";
    }

    function renderAccount() {
      var el = $("account-summary");
      if (!el) return;
      while (el.firstChild) el.removeChild(el.firstChild);
      if (!session) {
        var empty = document.createElement("p");
        empty.textContent = "No TikTok authorization is stored in this tab. Start from the demo page. After TikTok redirects here, the open ID for this tab appears in this card.";
        el.appendChild(empty);
        return;
      }
      var rows = [
        ["Nickname", session.nickname || "Not returned. This page shows creator_nickname when the Worker includes it. The browser does not query TikTok itself."],
        ["Open ID", session.open_id],
        ["Scope", session.scope || "Not returned"],
        ["Expires in", session.expires_in != null ? String(session.expires_in) + " seconds" : "Not returned"],
        ["Token type", session.token_type || "Not returned"]
      ];
      var dl = document.createElement("dl");
      dl.className = "demo-specs";
      rows.forEach(function (row) {
        var dt = document.createElement("dt");
        var dd = document.createElement("dd");
        dt.textContent = row[0];
        dd.textContent = row[1];
        dl.appendChild(dt);
        dl.appendChild(dd);
      });
      el.appendChild(dl);
      var note = document.createElement("p");
      note.className = "form-note";
      note.textContent = "The access token and refresh token are not in this browser. The Worker keeps them.";
      el.appendChild(note);
      if (session.scope && session.scope.indexOf("video.publish") === -1) {
        var warn = document.createElement("p");
        warn.className = "form-note";
        warn.textContent = "video.publish was not granted. Authorize again and allow both requested scopes before posting.";
        el.appendChild(warn);
      }
    }

    function privacyBlocked() {
      return !!(session && session.privacy_level_options && session.privacy_level_options.length && session.privacy_level_options.indexOf("SELF_ONLY") === -1);
    }

    function readForm() {
      var sample = $("video-sample");
      var custom = ($("custom-url") && $("custom-url").value || "").trim();
      var useCustom = $("video-custom") && $("video-custom").checked;
      var parsed = useCustom ? parseVideoUrl(custom) : { url: SAMPLE_VIDEO_URL };
      var caption = ($("caption") && $("caption").value || "").trim();
      var commercial = !!($("commercial") && $("commercial").checked);
      var privacySelect = $("privacy");
      return {
        privacy: privacySelect ? privacySelect.value : "",
        privacyBlocked: privacyBlocked(),
        videoUrl: parsed.url || "",
        videoError: parsed.error || "",
        caption: caption,
        captionLength: caption.length,
        durationSec: durationSec,
        maxDurationSec: session && session.max_video_post_duration_sec || 0,
        commercial: commercial,
        brandOrganic: commercial && !!($("your-brand") && $("your-brand").checked),
        brandContent: commercial && !!($("branded") && $("branded").checked && !$("branded").disabled),
        allowComment: !!($("allow-comment") && $("allow-comment").checked && !$("allow-comment").disabled),
        allowDuet: !!($("allow-duet") && $("allow-duet").checked && !$("allow-duet").disabled),
        allowStitch: !!($("allow-stitch") && $("allow-stitch").checked && !$("allow-stitch").disabled),
        consent: !!($("consent") && $("consent").checked),
        coverMs: durationSec && durationSec < 1.05 ? 0 : 1000
      };
    }

    function syncCommercial() {
      var commercial = $("commercial");
      var options = $("commercial-options");
      var prompt = $("commercial-prompt");
      var yourBrand = $("your-brand");
      var branded = $("branded");
      var music = $("declare-music");
      var brandedDeclare = $("declare-branded");
      if (!commercial || !options) return;
      options.hidden = !commercial.checked;
      if (!commercial.checked) {
        if (yourBrand) yourBrand.checked = false;
        if (branded) branded.checked = false;
      }
      if (branded) {
        branded.disabled = true;
        branded.checked = false;
        branded.title = "Branded content visibility cannot be set to private.";
      }
      var showBrand = commercial.checked && yourBrand && yourBrand.checked;
      if (prompt) {
        prompt.hidden = !showBrand;
        prompt.textContent = showBrand ? "Your video will be labeled as 'Promotional content'." : "";
      }
      if (music) music.hidden = false;
      if (brandedDeclare) brandedDeclare.hidden = true;
    }

    function applyCreatorLimits() {
      [
        ["allow-comment", session && session.comment_disabled, "Comments are turned off in this TikTok account's privacy settings."],
        ["allow-duet", session && session.duet_disabled, "Duets are turned off in this TikTok account's privacy settings."],
        ["allow-stitch", session && session.stitch_disabled, "Stitch is turned off in this TikTok account's privacy settings."]
      ].forEach(function (item) {
        var input = $(item[0]);
        if (!input) return;
        if (item[1]) {
          input.checked = false;
          input.disabled = true;
          input.title = item[2];
        }
      });
      var privacy = $("privacy");
      if (privacy && privacyBlocked()) {
        privacy.value = "";
        privacy.disabled = true;
      }
      var note = $("privacy-note");
      if (!note) return;
      if (!session || !session.privacy_level_options || !session.privacy_level_options.length) {
        note.textContent = "Sandbox Direct Post uses SELF_ONLY. The TikTok account should be private. Public viewership is unavailable until TikTok audits the app, and this demo does not offer it.";
      } else if (privacyBlocked()) {
        note.textContent = "Creator info did not include SELF_ONLY (" + session.privacy_level_options.join(", ") + "). This sandbox demo cannot post.";
      } else {
        note.textContent = "Creator info listed " + session.privacy_level_options.join(", ") + ". This sandbox demo still posts only after you choose Only me (SELF_ONLY).";
      }
    }

    function refreshForm() {
      if (!$("post-form")) return;
      syncCommercial();
      var form = readForm();
      var problems = formProblems(form);
      if (!problems.length && (!session || !session.open_id)) {
        problems.push("Finish Login Kit before posting. Continue with TikTok first. This page stores only the open ID.");
      }
      var button = $("post-button");
      if (button) {
        button.disabled = posting || problems.length > 0;
        button.title = problems[0] || "Post this video privately to the connected TikTok account.";
      }
      setText("post-hint", problems.length ? problems[0] : "Ready to send a private Direct Post. TikTok may take a few minutes to process it.");
      var preview = buildPublishBody(session, form);
      setText("request-preview", JSON.stringify(redact(preview), null, 2));
    }

    function renderHealth(result) {
      if (!result || result.network) {
        setPill("health-pill", "bad", "Unreachable");
        setText("health-text", explainFailure("/health", result));
        return;
      }
      var configured = result.body && result.body.configured;
      if (result.ok && configured === true) {
        setPill("health-pill", "ok", "Configured");
        setText("health-text", "The Worker is online and reports configured: true.");
      } else if (result.ok && configured === false) {
        setPill("health-pill", "wait", "Not configured");
        setText("health-text", "The Worker is online and reports configured: false. Code exchange and publishing stay on the Worker, and they will not succeed until the TikTok app credentials are set there.");
      } else {
        setPill("health-pill", "bad", "Check failed");
        setText("health-text", explainFailure("/health", result));
      }
    }

    function renderConfig(result) {
      clientKey = result && !result.network ? clientKeyFromConfig(result.body) : "";
      var leaked = result && result.leaked ? " Credential fields in that response were discarded." : "";
      if (!result || result.network) {
        setPill("config-pill", "bad", "Unreachable");
        setText("config-text", explainFailure("/config", result));
      } else if (clientKey) {
        setPill("config-pill", "ok", "Key ready");
        setText("config-text", "Public client key loaded from GET /config. It identifies the app in the authorize URL. The client secret is not on this page." + leaked);
      } else if (result.status === 404 || (result.body && result.body.error === "not_found")) {
        setPill("config-pill", "wait", "Route missing");
        setText("config-text", explainFailure("/config", result) + leaked);
      } else {
        setPill("config-pill", "wait", "No key");
        setText("config-text", "GET /config responded without a usable public client_key, so authorization cannot start." + leaked);
      }
      var button = $("authorize-button");
      if (button) button.disabled = !clientKey;
      var note = [];
      if (!clientKey) {
        note.push("Continue with TikTok stays off until GET /config returns the public client key.");
      } else {
        note.push("TikTok will show its consent screen. Grant user.info.basic and video.publish. Use a private sandbox test account.");
      }
      if (session && session.open_id && page === "start") {
        note.push("This tab already has open ID " + session.open_id + ". Continue on the callback to post.");
      }
      setText("authorize-note", note.join(" "));
    }

    function startAuth() {
      if (!isPublicClientKey(clientKey)) return;
      var state = randomState();
      if (!state) {
        setText("authorize-note", "This browser could not generate the Login Kit state value, so authorization did not start.");
        return;
      }
      storageSet(STATE_KEY, state);
      writeStateCookie(state);
      location.assign(buildAuthorizeUrl(clientKey, state));
    }

    function showResult(kind, message, body) {
      setNotice("result-summary", kind, message);
      setText("result-body", renderJson(body));
      var card = $("result-card");
      if (card && card.scrollIntoView) {
        var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        card.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "nearest" });
      }
    }

    function onPost(event) {
      event.preventDefault();
      var form = readForm();
      var problems = formProblems(form);
      if (problems.length || posting) {
        refreshForm();
        return;
      }
      if (!session || !session.open_id) {
        showResult("warn", "Finish Login Kit before posting. The demo page starts authorization, and this callback keeps only the open ID for the post. No TikTok token is stored here.", null);
        return;
      }
      var payload = buildPublishBody(session, form);
      posting = true;
      refreshForm();
      setNotice("result-summary", "", "Sending the private Direct Post to the Worker. The access token is not in this request.");
      postJson(API + "/publish", payload).then(function (result) {
        posting = false;
        refreshForm();
        var publishId = result.body && (result.body.publish_id || (result.body.data && result.body.data.publish_id));
        if (workerOk(result)) {
          var success = "The Worker accepted the post. privacy_level is SELF_ONLY, so the video is private to the authorized account. TikTok may take a few minutes to process it before it appears on that profile.";
          if (typeof publishId === "string" && publishId) success += " publish_id: " + publicText(publishId) + ".";
          else success += " The response did not include a publish_id. The body below is everything this page received.";
          showResult("ok", success + leakSentence(result), result.body);
        } else if (result.ok) {
          showResult("warn", "The Worker responded, but the post was not accepted." + leakSentence(result), result.body);
        } else {
          showResult("warn", explainFailure("/publish", result) + leakSentence(result), result.body);
        }
      });
    }

    function stripAuthQuery() {
      var url = new URL(location.href);
      ["code", "state", "scopes", "error", "error_description"].forEach(function (key) {
        url.searchParams.delete(key);
      });
      history.replaceState({}, "", url.pathname + url.search + url.hash);
    }

    function handleCallback() {
      var params = new URLSearchParams(location.search);
      var code = params.get("code") || "";
      var state = params.get("state") || "";
      var error = params.get("error") || "";
      var errorDescription = params.get("error_description") || "";
      var granted = params.get("scopes") || "";
      if (code || state || error) stripAuthQuery();
      renderAccount();
      applyCreatorLimits();
      if (error) {
        setNotice("callback-status", "warn", "TikTok did not complete authorization (" + publicText(error) + ")." + (errorDescription ? " " + publicText(errorDescription) : "") + " Start again from this page.");
        return;
      }
      if (!code) {
        setNotice("callback-status", session ? "ok" : "", session
          ? "This tab already has a Login Kit result. Choose the video settings below and post privately."
          : "This is the registered Login Kit callback. Start authorization, then TikTok returns the browser here with a one-time code.");
        return;
      }
      var saved = storageGet(STATE_KEY) || "";
      var cookieState = readCookie(STATE_COOKIE);
      if (!state || (state !== saved && state !== cookieState)) {
        setNotice("callback-status", "bad", "The state in TikTok's response did not match the state this site stored, so the authorization code was not sent to the Worker. Start authorization again.");
        clearState();
        return;
      }
      clearState();
      setNotice("callback-status", "", "Sending the authorization code to the Worker. This page will not keep the code.");
      postJson(API + "/oauth/token", { code: code, redirect_uri: REDIRECT_URI }).then(function (result) {
        code = "";
        var next = result.body ? safeSession(result.body) : null;
        if (next && granted && !next.scope) next.scope = publicText(granted);
        showExchange(result.body);
        if (!workerOk(result) || !next) {
          var reason = workerOk(result) && !next
            ? "The Worker accepted the code but did not return an open_id. This page will not invent one, and it cannot attach a later post without it."
            : explainFailure("/oauth/token", result);
          setNotice("callback-status", "warn", reason + leakSentence(result));
          return;
        }
        next.obtained_at = Date.now();
        session = persistSession(next);
        renderAccount();
        applyCreatorLimits();
        refreshForm();
        setNotice("callback-status", "ok", "Login Kit finished for this tab. Choose Only me, confirm the declaration, and post. The Worker kept the token; this page stored only the open ID, scope, and expiry." + leakSentence(result));
      });
    }

    function showExchange(body) {
      var pre = $("exchange-body");
      if (!pre) return;
      pre.hidden = !body;
      pre.textContent = body ? renderJson(body) : "";
    }

    var authButton = $("authorize-button");
    if (authButton) authButton.addEventListener("click", startAuth);
    var form = $("post-form");
    if (form) {
      form.addEventListener("submit", onPost);
      form.addEventListener("input", refreshForm);
      form.addEventListener("change", refreshForm);
    }
    var preview = $("preview");
    if (preview) {
      preview.addEventListener("loadedmetadata", function () {
        durationSec = isFinite(preview.duration) ? preview.duration : 0;
        var note = $("duration-note");
        if (note && durationSec) {
          note.textContent = "Browser preview: " + durationSec.toFixed(1) + " seconds, " + preview.videoWidth + " by " + preview.videoHeight + ".";
        }
        refreshForm();
      });
      preview.addEventListener("error", function () {
        var note = $("duration-note");
        if (note) note.textContent = "The browser could not preview this file. TikTok pulls the https address directly and does not use the preview.";
      });
    }
    var customToggle = $("video-custom");
    var sampleToggle = $("video-sample");
    function syncPreviewSource() {
      var wrap = $("custom-url-wrap");
      var useCustom = customToggle && customToggle.checked;
      if (wrap) wrap.hidden = !useCustom;
      if (!preview) return;
      if (!useCustom) {
        preview.src = preview.getAttribute("data-sample") || preview.src;
        return;
      }
      var parsed = parseVideoUrl(($("custom-url") && $("custom-url").value || "").trim());
      if (parsed.url) preview.src = parsed.url;
    }
    if (customToggle) customToggle.addEventListener("change", syncPreviewSource);
    if (sampleToggle) sampleToggle.addEventListener("change", syncPreviewSource);
    if ($("custom-url")) $("custom-url").addEventListener("change", syncPreviewSource);

    renderAccount();
    applyCreatorLimits();
    refreshForm();
    if (page === "callback") handleCallback();

    setPill("health-pill", "wait", "Checking");
    setText("health-text", "Checking the Worker…");
    setPill("config-pill", "wait", "Checking");
    setText("config-text", "Asking the Worker for the public client key…");
    getJson(API + "/health").then(renderHealth);
    getJson(API + "/config").then(renderConfig);
  }

  return {
    mount: mount,
    redact: redact,
    hasCredentialFields: hasCredentialFields,
    explainFailure: explainFailure,
    parseVideoUrl: parseVideoUrl,
    buildAuthorizeUrl: buildAuthorizeUrl,
    buildPublishBody: buildPublishBody,
    formProblems: formProblems,
    safeSession: safeSession,
    workerOk: workerOk,
    clientKeyFromConfig: clientKeyFromConfig,
    isPublicClientKey: isPublicClientKey,
    REDIRECT_URI: REDIRECT_URI,
    SAMPLE_VIDEO_URL: SAMPLE_VIDEO_URL,
    SCOPES: SCOPES,
    API: API
  };
});
