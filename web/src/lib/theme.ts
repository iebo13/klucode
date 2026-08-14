/**
 * Theme plumbing shared between the server layout and the client toggle.
 *
 * This lives outside theme-toggle.tsx because that file is `'use client'`, and
 * every export of a client module becomes a client reference when a server
 * component imports it. The init script has to be a plain string the server
 * can inline into <head>, so it belongs in a module with no directive.
 */

export const THEME_STORAGE_KEY = 'kc-theme';

/**
 * Runs before first paint, inlined into <head>. Without it the page renders in
 * the OS scheme and then snaps to the stored choice, which is the flash every
 * theme switcher gets judged by.
 *
 * Deliberately tiny and dependency-free — it is parsed and executed on the
 * critical path of every page load. The try/catch is not defensive padding:
 * localStorage throws outright under some privacy settings, and an exception
 * here would abort the script and leave the document in the wrong theme.
 */
export const THEME_INIT_SCRIPT =
  `(function(){try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});` +
  `if(t==='light'||t==='dark'){document.documentElement.dataset.theme=t}}catch(e){}})()`;
