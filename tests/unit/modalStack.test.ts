import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openModal } from "../../src/ui/modalStack";

let root: HTMLElement;
const made: HTMLElement[] = [];
const closers: (() => void)[] = [];

/** Open a modal and remember how to close it, so no test leaks into the next one. */
function open(el: HTMLElement): () => void {
  const close = openModal(el);
  closers.push(close);
  return close;
}

function container(): HTMLElement {
  const el = document.createElement("div");
  document.body.appendChild(el);
  made.push(el);
  return el;
}

beforeEach(() => {
  root = document.createElement("div");
  root.id = "root";
  document.body.appendChild(root);
});

afterEach(() => {
  for (const close of closers.splice(0)) close();
  root.remove();
  for (const el of made.splice(0)) el.remove();
});

const isInert = (el: HTMLElement) => el.hasAttribute("inert");

describe("modalStack", () => {
  it("makes the page inert while one modal is open and not the modal itself", () => {
    const a = container();
    open(a);
    expect(isInert(root)).toBe(true);
    expect(isInert(a)).toBe(false);
  });

  it("makes the lower modal inert while a second one is open", () => {
    const a = container();
    const b = container();
    open(a);
    open(b);
    expect(isInert(root)).toBe(true);
    expect(isInert(a)).toBe(true);
    expect(isInert(b)).toBe(false);
  });

  it("makes the lower modal interactive again when the top one closes", () => {
    const a = container();
    const b = container();
    open(a);
    const closeB = open(b);
    closeB();
    expect(isInert(a)).toBe(false);
    expect(isInert(root)).toBe(true);
  });

  it("makes the page interactive again once the last modal closes", () => {
    const a = container();
    const closeA = open(a);
    closeA();
    expect(isInert(root)).toBe(false);
    expect(isInert(a)).toBe(false);
  });

  it("is safe to close twice", () => {
    const a = container();
    const b = container();
    open(a);
    const closeB = open(b);
    closeB();
    closeB();
    expect(isInert(a)).toBe(false);
    expect(isInert(root)).toBe(true);
  });

  it("works when there is no #root element", () => {
    root.remove();
    const a = container();
    const close = open(a);
    expect(isInert(a)).toBe(false);
    close();
  });
});
