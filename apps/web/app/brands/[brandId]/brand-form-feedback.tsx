"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

type ActionNoticeProps = {
  kind: "error" | "success";
  message: string;
  title: string;
};

export function BrandActionNotice({ kind, message, title }: ActionNoticeProps) {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) {
    return null;
  }

  return (
    <div className={`action-toast action-toast-${kind}`} role={kind === "error" ? "alert" : "status"}>
      <div>
        <strong>{title}</strong>
        <p>{message}</p>
      </div>
      <button aria-label="Dismiss message" onClick={() => setIsVisible(false)} type="button">
        x
      </button>
    </div>
  );
}

export function BrandFormFeedback() {
  const { pending } = useFormStatus();
  const markerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const form = markerRef.current?.closest("form");

    if (!form) {
      return;
    }

    const submitters = Array.from(form.querySelectorAll<HTMLButtonElement | HTMLInputElement>('button[type="submit"], input[type="submit"]'));

    for (const submitter of submitters) {
      if (pending) {
        if (!submitter.dataset.originalDisabled) {
          submitter.dataset.originalDisabled = String(submitter.disabled);
        }

        submitter.disabled = true;
      } else if (submitter.dataset.originalDisabled) {
        submitter.disabled = submitter.dataset.originalDisabled === "true";
        delete submitter.dataset.originalDisabled;
      }
    }
  }, [pending]);

  return (
    <>
      <span className="sr-only" ref={markerRef}>
        {pending ? "Saving brand profile..." : ""}
      </span>
      {pending ? (
        <div className="action-toast action-toast-pending" role="status">
          <span className="action-spinner" aria-hidden="true" />
          <strong>Saving brand profile...</strong>
        </div>
      ) : null}
    </>
  );
}
