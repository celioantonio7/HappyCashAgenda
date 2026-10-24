/** Remove the deployment directory before interpreting app routes. */
export function appPathname(pathname: string) {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  if (base && (pathname === base || pathname.startsWith(`${base}/`))) {
    return pathname.slice(base.length) || "/";
  }
  return pathname;
}
