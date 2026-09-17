"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";

// next/script injects the actual <script> tag at the document root for the
// "afterInteractive" strategy (not at this component's position in the JSX
// tree), and the Buy Me a Coffee widget then inserts its button next to
// wherever that script tag landed — i.e. loose in <body>, not in our header.
// So we let it load wherever, then relocate the resulting element into our
// own container so it renders inline in the nav instead of floating.
// Only match on the element's own id/class (never on outerHTML/innerHTML):
// once the widget has been relocated once, every ancestor up to <body> would
// also "contain" its markup, so a substring search over serialized HTML
// produces false positives on re-scans (e.g. React effect re-runs during
// Fast Refresh) and can try to append an ancestor into its own descendant.
function isBmcNode(node: Node): node is HTMLElement {
  if (!(node instanceof HTMLElement)) return false;
  const id = node.id?.toLowerCase() ?? "";
  const cls = typeof node.className === "string" ? node.className.toLowerCase() : "";
  return id.includes("bmc") || cls.includes("bmc");
}

export default function BuyMeACoffeeButton() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const relocate = (node: HTMLElement) => {
      // Guard against ever moving an ancestor of `container` into itself
      // (which throws) — belt-and-suspenders alongside the id/class match.
      if (!container.contains(node) && !node.contains(container)) {
        container.appendChild(node);
      }
    };

    for (const node of Array.from(document.body.children)) {
      if (isBmcNode(node)) relocate(node);
    }

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (isBmcNode(node)) relocate(node);
        });
      }
    });
    observer.observe(document.body, { childList: true });

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="flex items-center shrink-0 origin-right scale-90 sm:scale-100"
    >
      <Script
        id="bmc-button-script"
        src="https://cdnjs.buymeacoffee.com/1.0.0/button.prod.min.js"
        data-name="bmc-button"
        data-slug="jeremiahninteman"
        data-color="#FFDD00"
        data-emoji=""
        data-font="Bree"
        data-text="Buy me a coffee"
        data-outline-color="#000000"
        data-font-color="#000000"
        data-coffee-color="#ffffff"
        strategy="afterInteractive"
      />
    </div>
  );
}
