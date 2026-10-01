"use client";

import { useEffect, useRef, useState } from "react";

const MODEL_URL = "/api/models/hubble";

export function ProductModelViewer() {
  const viewerRef = useRef<HTMLElement | null>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    import("@google/model-viewer")
      .then(() => {
        if (!cancelled) {
          setScriptReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !scriptReady) {
      return;
    }

    const onLoad = () => setModelReady(true);
    const onError = () => setFailed(true);
    viewer.addEventListener("load", onLoad);
    viewer.addEventListener("error", onError);
    queueMicrotask(() => {
      if ("loaded" in viewer && viewer.loaded === true) {
        setModelReady(true);
      }
    });

    return () => {
      viewer.removeEventListener("load", onLoad);
      viewer.removeEventListener("error", onError);
    };
  }, [scriptReady]);

  return (
    <div className="overflow-hidden rounded-3xl border border-line bg-card shadow-sm">
      <div className="relative aspect-[4/3] w-full bg-[radial-gradient(circle_at_center,#e7f3f1_0%,#f3f6f7_70%)]">
        {failed ? (
          <div className="flex h-full items-center justify-center px-6 text-center" role="alert">
            <p className="text-sm leading-6 text-ink">
              The 3D model could not be loaded. The feature details below are still available.
            </p>
          </div>
        ) : scriptReady ? (
          <model-viewer
            ref={viewerRef}
            src={MODEL_URL}
            alt="Cavli Hubble C41 QS module"
            camera-controls
            touch-action="pan-y"
            auto-rotate
            shadow-intensity="0.8"
            exposure="1"
            className="h-full w-full"
            style={{ width: "100%", height: "100%", background: "transparent" }}
          />
        ) : null}
        {!failed && !modelReady ? (
          <p
            role="status"
            className="pointer-events-none absolute inset-x-0 bottom-4 text-center text-sm text-muted"
          >
            Loading 3D model…
          </p>
        ) : null}
      </div>
      <p className="border-t border-line px-4 py-3 text-sm leading-6 text-muted">
        Drag to rotate. Scroll or pinch to zoom.
      </p>
    </div>
  );
}
