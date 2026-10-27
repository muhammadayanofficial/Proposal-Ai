(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  const form = $("brief-form");
  const inputs = {
    title: $("title"),
    client_name: $("client_name"),
    category: $("category"),
    tone: $("tone"),
    budget: $("budget"),
    deadline: $("deadline"),
    brief: $("brief"),
  };
  const editor = $("proposal_text");
  const generateBtn = $("generate-btn");
  const saveBtn = $("save-btn");
  const downloadBtn = $("download-btn");
  const deleteBtn = $("delete-btn");
  const newBtn = $("new-btn");
  const pill = $("status-pill");
  const notice = $("notice");
  const noticeText = $("notice-text");
  const listEl = $("proposal-list");
  const listEmpty = $("list-empty");
  const listCount = $("list-count");
  const briefCount = $("brief-count");
  const briefMax = inputs.brief.maxLength;

  const state = { id: null, dirty: false, busy: false, noticeTimer: null };

  /* ---------------------------------------------------------- helpers */

  async function api(path, { method = "GET", body, timeout = 30000 } = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const res = await fetch(path, {
        method,
        headers: body ? { "Content-Type": "application/json" } : {},
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      let data = {};
      try { data = await res.json(); } catch (_) { /* non-JSON response */ }
      if (!res.ok) throw new Error(data.error || "Request failed (" + res.status + ").");
      return data;
    } catch (err) {
      if (err.name === "AbortError") throw new Error("The request timed out. Please try again.");
      if (err instanceof TypeError) throw new Error("Could not reach the server. Is the app still running?");
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  function showNotice(message, type) {
    clearTimeout(state.noticeTimer);
    noticeText.textContent = message;
    notice.className = "notice" + (type ? " " + type : "");
    notice.hidden = false;
    if (type === "success") {
      state.noticeTimer = setTimeout(hideNotice, 4500);
    }
  }

  function hideNotice() {
    clearTimeout(state.noticeTimer);
    notice.hidden = true;
  }

  function formatDate(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return "";
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }

  function slugify(text) {
    const slug = text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
    return slug || "proposal";
  }

  function getFields() {
    const out = {};
    Object.keys(inputs).forEach((k) => { out[k] = inputs[k].value; });
    return out;
  }

  function setFields(p) {
    Object.keys(inputs).forEach((k) => {
      if (p[k] !== undefined && p[k] !== null) inputs[k].value = p[k];
    });
    updateBriefCount();
  }

  function updateBriefCount() {
    briefCount.textContent = inputs.brief.value.length + " / " + briefMax;
  }

  /* --------------------------------------------------------------- UI */

  function render() {
    const hasText = editor.value.trim().length > 0;
    saveBtn.disabled = state.busy || !hasText;
    downloadBtn.disabled = !hasText;
    generateBtn.disabled = state.busy;
    deleteBtn.hidden = state.id === null;
    deleteBtn.disabled = state.busy;
    newBtn.disabled = state.busy;
    saveBtn.textContent = state.id === null ? "Save proposal" : "Update proposal";

    if (!hasText && state.id === null) {
      pill.textContent = "No draft";
      pill.className = "pill";
    } else if (state.id === null) {
      pill.textContent = "Not saved";
      pill.className = "pill dirty";
    } else if (state.dirty) {
      pill.textContent = "Unsaved changes";
      pill.className = "pill dirty";
    } else {
      pill.textContent = "Saved";
      pill.className = "pill saved";
    }

    listEl.querySelectorAll(".proposal-item").forEach((el) => {
      el.classList.toggle("active", Number(el.dataset.id) === state.id);
    });
  }

  function setBusy(busy) {
    state.busy = busy;
    Object.values(inputs).forEach((el) => { el.disabled = busy; });
    editor.disabled = busy;
    render();
  }

  function markDirty() {
    state.dirty = true;
    render();
  }

  function renderList(items) {
    listEl.replaceChildren();
    listEmpty.hidden = items.length > 0;
    listCount.textContent = items.length ? String(items.length) : "";
    items.forEach((p) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "proposal-item";
      btn.dataset.id = p.id;
      const title = document.createElement("span");
      title.className = "pi-title";
      title.textContent = p.title;
      const meta = document.createElement("span");
      meta.className = "pi-meta";
      meta.textContent = p.client_name + " \u00B7 " + formatDate(p.updated_at);
      btn.append(title, meta);
      btn.addEventListener("click", () => openProposal(p.id));
      listEl.appendChild(btn);
    });
    render();
  }

  async function refreshList() {
    try {
      const data = await api("/api/proposals");
      renderList(data.proposals);
    } catch (err) {
      showNotice("Could not load saved proposals: " + err.message, "error");
    }
  }

  function discardOk() {
    if (!state.dirty && !(state.id === null && editor.value.trim())) return true;
    return window.confirm("You have unsaved changes. Discard them?");
  }

  /* ---------------------------------------------------------- actions */

  async function generate(event) {
    event.preventDefault();
    if (!form.reportValidity()) return;
    if (editor.value.trim() && !window.confirm("Replace the current draft with a newly generated proposal?")) return;

    hideNotice();
    const payload = getFields();
    setBusy(true);
    generateBtn.classList.add("loading");
    generateBtn.textContent = "Generating...";
    try {
      const data = await api("/api/generate", { method: "POST", body: payload, timeout: 100000 });
      editor.value = data.proposal;
      state.dirty = true;
      showNotice("Draft generated. Review and edit it before saving or sending.", "success");
    } catch (err) {
      showNotice(err.message, "error");
    } finally {
      generateBtn.classList.remove("loading");
      generateBtn.textContent = "Generate proposal";
      setBusy(false);
    }
  }

  async function save() {
    if (!form.reportValidity()) return;
    const body = Object.assign(getFields(), { proposal_text: editor.value });
    hideNotice();
    setBusy(true);
    saveBtn.classList.add("loading");
    try {
      const isNew = state.id === null;
      const data = await api(isNew ? "/api/proposals" : "/api/proposals/" + state.id, {
        method: isNew ? "POST" : "PUT",
        body,
      });
      state.id = data.proposal.id;
      state.dirty = false;
      showNotice(isNew ? "Proposal saved." : "Proposal updated.", "success");
      await refreshList();
    } catch (err) {
      showNotice(err.message, "error");
    } finally {
      saveBtn.classList.remove("loading");
      setBusy(false);
    }
  }

  async function openProposal(id) {
    if (id === state.id && !state.dirty) return;
    if (!discardOk()) return;
    hideNotice();
    setBusy(true);
    try {
      const data = await api("/api/proposals/" + id);
      setFields(data.proposal);
      editor.value = data.proposal.proposal_text;
      state.id = data.proposal.id;
      state.dirty = false;
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      showNotice(err.message, "error");
      refreshList();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (state.id === null) return;
    if (!window.confirm("Delete this saved proposal permanently?")) return;
    hideNotice();
    setBusy(true);
    try {
      await api("/api/proposals/" + state.id, { method: "DELETE" });
      resetWorkspace();
      showNotice("Proposal deleted.", "success");
      await refreshList();
    } catch (err) {
      showNotice(err.message, "error");
    } finally {
      setBusy(false);
    }
  }

  function resetWorkspace() {
    form.reset();
    editor.value = "";
    state.id = null;
    state.dirty = false;
    updateBriefCount();
    render();
  }

  function startNew() {
    if (!discardOk()) return;
    hideNotice();
    resetWorkspace();
    inputs.title.focus();
  }

  function download() {
    const text = editor.value;
    if (!text.trim()) return;
    const name = slugify(inputs.title.value.trim() || "proposal") + ".md";
    const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showNotice("Downloaded " + name, "success");
  }

  /* ----------------------------------------------------------- events */

  form.addEventListener("submit", generate);
  saveBtn.addEventListener("click", save);
  downloadBtn.addEventListener("click", download);
  deleteBtn.addEventListener("click", remove);
  newBtn.addEventListener("click", startNew);
  $("notice-close").addEventListener("click", hideNotice);

  editor.addEventListener("input", markDirty);
  Object.values(inputs).forEach((el) => el.addEventListener("input", () => {
    if (state.id !== null || editor.value.trim()) markDirty();
  }));
  inputs.brief.addEventListener("input", updateBriefCount);

  window.addEventListener("beforeunload", (e) => {
    if (state.dirty && editor.value.trim()) {
      e.preventDefault();
      e.returnValue = "";
    }
  });

  updateBriefCount();
  render();
  refreshList();
})();
