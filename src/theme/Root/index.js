import React, {useEffect, useState} from "react";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import {useLocation} from "@docusaurus/router";

const CONSENT_COOKIE = "zq_analytics_consent";
const STORAGE_KEY = "zeroquarry_cookie_consent";
const ACCEPTED = "accepted";
const DECLINED = "declined";

let gaLoaded = false;
let posthogLoaded = false;

function cookieChoice() {
  const match = document.cookie.match(
    new RegExp("(?:^|;\\s*)" + CONSENT_COOKIE + "=([^;]+)"),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

function getChoice() {
  const sharedChoice = cookieChoice();
  if (sharedChoice) return sharedChoice;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch (_error) {
    return null;
  }
}

function setChoice(choice) {
  try {
    window.localStorage.setItem(STORAGE_KEY, choice);
  } catch (_error) {
    // The parent-domain cookie remains the source of truth.
  }
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  const domain = /(^|\.)zeroquarry\.com$/i.test(window.location.hostname)
    ? "; Domain=.zeroquarry.com"
    : "";
  document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(choice)}`
    + `; Path=/; Max-Age=31536000; SameSite=Lax${domain}${secure}`;
}

function hostnameParts() {
  const host = window.location.hostname;
  if (!host || host === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    return [""];
  }
  const parts = host.split(".");
  const domains = [""];
  for (let index = 0; index < parts.length - 1; index += 1) {
    domains.push("." + parts.slice(index).join("."));
  }
  return domains;
}

function deleteCookie(name) {
  const expires = "Thu, 01 Jan 1970 00:00:00 GMT";
  hostnameParts().forEach((domain) => {
    const domainPart = domain ? "; domain=" + domain : "";
    document.cookie = `${name}=; expires=${expires}; path=/${domainPart}`;
  });
}

function deleteAnalyticsCookies() {
  document.cookie
    .split(";")
    .map((cookie) => cookie.split("=")[0].trim())
    .filter((name) => /^_ga/.test(name) || name === "_gid" || name === "_gat"
      || /^_gac_/.test(name) || /^ph_/.test(name))
    .forEach(deleteCookie);
}

function loadGoogleAnalytics(measurementId) {
  if (!measurementId || gaLoaded) return;
  gaLoaded = true;
  window[`ga-disable-${measurementId}`] = false;
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() {
    window.dataLayer.push(arguments);
  };
  window.gtag("js", new Date());
  const config = {anonymize_ip: true, send_page_view: false};
  if (/(^|\.)zeroquarry\.com$/i.test(window.location.hostname)) {
    config.cookie_domain = "zeroquarry.com";
  }
  window.gtag("config", measurementId, config);

  const gaScript = document.createElement("script");
  gaScript.async = true;
  gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  document.head.appendChild(gaScript);
}

function loadPostHog(projectKey, publicHost, uiHost) {
  if (!projectKey) return;
  if (posthogLoaded) {
    window.posthog?.opt_in_capturing?.();
    return;
  }
  posthogLoaded = true;
  !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture identify reset opt_in_capturing opt_out_capturing".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
  window.posthog.init(projectKey, {
    api_host: publicHost,
    ui_host: uiHost,
    person_profiles: "identified_only",
    capture_pageview: false,
    capture_pageleave: true,
    cross_subdomain_cookie: true,
    disable_session_recording: true,
  });
  window.posthog.opt_in_capturing();
}

function enableAnalytics(config) {
  loadGoogleAnalytics(config.googleAnalyticsMeasurementId);
  loadPostHog(
    config.posthogProjectKey,
    config.posthogPublicHost,
    config.posthogUiHost,
  );
}

function capturePageView(config) {
  const pagePath = window.location.pathname + window.location.search;
  if (config.googleAnalyticsMeasurementId && window.gtag) {
    window.gtag("event", "page_view", {
      page_location: window.location.href,
      page_path: pagePath,
      page_title: document.title,
    });
  }
  if (config.posthogProjectKey && window.posthog) {
    window.posthog.capture("$pageview", {$current_url: window.location.href});
  }
}

function disableAnalytics(measurementId) {
  if (measurementId) window[`ga-disable-${measurementId}`] = true;
  window.posthog?.opt_out_capturing?.();
  deleteAnalyticsCookies();
}

export default function Root({children}) {
  const {siteConfig} = useDocusaurusContext();
  const analyticsConfig = siteConfig.customFields;
  const location = useLocation();
  const [choice, setConsentChoice] = useState(undefined);

  useEffect(() => {
    setConsentChoice(getChoice());
  }, []);

  useEffect(() => {
    if (choice !== ACCEPTED) return;
    enableAnalytics(analyticsConfig);
    capturePageView(analyticsConfig);
  }, [choice, location.pathname, location.search, analyticsConfig]);

  useEffect(() => {
    function onClick(event) {
      const link = event.target?.closest?.("a[href]");
      if (!link || choice !== ACCEPTED || !window.posthog) return;
      let destination;
      try {
        destination = new URL(link.href, window.location.href);
      } catch (_error) {
        return;
      }
      if (destination.hostname !== "console.zeroquarry.com") return;
      window.posthog.capture("docs_console_clicked", {
        cta_text: (link.textContent || "").trim().replace(/\s+/g, " ").slice(0, 120),
        source_path: window.location.pathname,
        destination_url: destination.origin + destination.pathname,
      });
    }

    function onSearch(event) {
      if (event.key !== "Enter" || choice !== ACCEPTED || !window.posthog) return;
      const input = event.target;
      if (!(input instanceof HTMLInputElement)) return;
      if (input.type !== "search" && input.getAttribute("role") !== "searchbox") return;
      const query = input.value.trim();
      if (!query) return;
      window.posthog.capture("docs_search", {
        query,
        source_path: window.location.pathname,
      });
    }

    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onSearch);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onSearch);
    };
  }, [choice]);

  function acceptAnalytics() {
    setChoice(ACCEPTED);
    setConsentChoice(ACCEPTED);
  }

  function declineAnalytics() {
    setChoice(DECLINED);
    disableAnalytics(analyticsConfig.googleAnalyticsMeasurementId);
    setConsentChoice(DECLINED);
  }

  return (
    <>
      {children}
      {choice === null && (
        <section className="zq-cookie-consent" aria-label="Cookie consent">
          <div className="zq-cookie-consent__copy">
            <h2>Analytics cookies</h2>
            <p>
              We use Google Analytics and PostHog to understand documentation
              traffic and the journey into our product. You can decline and we
              will not load analytics tracking.
            </p>
          </div>
          <div className="zq-cookie-consent__actions">
            <button type="button" className="button button--secondary" onClick={declineAnalytics}>
              Decline
            </button>
            <button type="button" className="button button--primary" onClick={acceptAnalytics}>
              Accept analytics
            </button>
            <a href="https://zeroquarry.com/privacy">Privacy policy</a>
          </div>
        </section>
      )}
    </>
  );
}
