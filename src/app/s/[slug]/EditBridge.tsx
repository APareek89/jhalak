"use client";

import { useEffect } from "react";

/**
 * Mounted on tenant pages only when ?edit=1 (Studio preview). Turns the live page
 * into a lightweight visual editor:
 *  - hover a [data-edit] text node → dashed outline; click → contentEditable; blur →
 *    postMessage {type:"edit", path, value} to the Studio, which persists it.
 *  - click a [data-section] block → select it (solid outline) and postMessage
 *    {type:"select", section, sectionType} so the Studio can scope the next chat message.
 * All navigation is suppressed while editing so the session stays put.
 */
export default function EditBridge() {
  useEffect(() => {
    const post = (msg: Record<string, unknown>) => {
      try { window.parent?.postMessage({ __jhalak: true, ...msg }, "*"); } catch { /* no parent */ }
    };

    const style = document.createElement("style");
    style.textContent = `
      [data-edit]{ cursor:text; outline:1px dashed transparent; outline-offset:3px; transition:outline-color .12s,background .12s; border-radius:3px; }
      [data-edit]:hover{ outline-color:rgba(37,99,235,.6); }
      [data-edit].jhalak-editing{ outline:2px solid #2563eb; background:rgba(37,99,235,.06); }
      [data-section]{ cursor:pointer; }
      [data-section].jhalak-hover{ outline:2px dashed rgba(37,99,235,.4); outline-offset:-3px; }
      [data-section].jhalak-selected{ outline:2px solid #2563eb; outline-offset:-3px; }
    `;
    document.head.appendChild(style);

    let selected: HTMLElement | null = null;
    let editing: HTMLElement | null = null;

    const selectSection = (el: HTMLElement) => {
      if (selected && selected !== el) selected.classList.remove("jhalak-selected");
      selected = el;
      el.classList.remove("jhalak-hover");
      el.classList.add("jhalak-selected");
      post({ type: "select", section: el.getAttribute("data-section"), sectionType: el.getAttribute("data-section-type") || "" });
    };

    const startEdit = (el: HTMLElement) => {
      if (editing) return;
      editing = el;
      const original = (el.innerText || "").trim();
      const multiline = el.getAttribute("data-edit") === "about";
      el.classList.add("jhalak-editing");
      el.setAttribute("contenteditable", "true");
      el.focus();
      const sel = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(el); range.collapse(false);
      sel?.removeAllRanges(); sel?.addRange(range);

      const finish = () => {
        el.removeAttribute("contenteditable");
        el.classList.remove("jhalak-editing");
        el.removeEventListener("blur", finish);
        el.removeEventListener("keydown", onKey);
        editing = null;
        const value = (el.innerText || "").trim();
        if (value && value !== original) post({ type: "edit", path: el.getAttribute("data-edit"), value });
        else if (!value) el.innerText = original; // don't allow empty
      };
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey && !multiline) { e.preventDefault(); el.blur(); }
        else if (e.key === "Escape") { el.innerText = original; el.blur(); }
      };
      el.addEventListener("blur", finish);
      el.addEventListener("keydown", onKey);
    };

    const onOver = (e: MouseEvent) => {
      const sec = (e.target as HTMLElement).closest("[data-section]") as HTMLElement | null;
      document.querySelectorAll<HTMLElement>("[data-section].jhalak-hover").forEach((x) => {
        if (x !== sec) x.classList.remove("jhalak-hover");
      });
      if (sec && sec !== selected) sec.classList.add("jhalak-hover");
    };

    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      const editEl = t.closest("[data-edit]") as HTMLElement | null;
      if (editEl) { e.preventDefault(); e.stopPropagation(); if (editEl !== editing) startEdit(editEl); return; }
      // block stray navigation while editing
      if (t.closest("a")) e.preventDefault();
      const secEl = t.closest("[data-section]") as HTMLElement | null;
      if (secEl) { e.stopPropagation(); selectSection(secEl); }
    };

    const onMsg = (e: MessageEvent) => {
      if (e.data?.__jhalakParent && e.data.type === "clear-selection" && selected) {
        selected.classList.remove("jhalak-selected");
        selected = null;
      }
    };

    document.addEventListener("mouseover", onOver, true);
    document.addEventListener("click", onClick, true);
    window.addEventListener("message", onMsg);
    post({ type: "ready" });

    return () => {
      document.removeEventListener("mouseover", onOver, true);
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("message", onMsg);
      style.remove();
    };
  }, []);

  return null;
}
