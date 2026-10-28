'use client';

import NextLink from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

export function Link({ to, state, onClick, ...props }) {
  const href = typeof to === 'string' ? to : '/';
  return <NextLink href={href} {...props} onClick={(event) => {
    if (state && typeof window !== 'undefined') sessionStorage.setItem('markethub-navigation-state', JSON.stringify(state));
    onClick?.(event);
  }} />;
}

export function useNavigate() {
  const router = useRouter();
  return useCallback((to, options = {}) => {
    if (typeof to === 'number') return router.back();
    if (options.state && typeof window !== 'undefined') sessionStorage.setItem('markethub-navigation-state', JSON.stringify(options.state));
    return options.replace ? router.replace(to) : router.push(to);
  }, [router]);
}

export function useLocation() {
  const pathname = usePathname();
  const [state, setState] = useState(null);
  useEffect(() => {
    try {
      setState(JSON.parse(sessionStorage.getItem('markethub-navigation-state') || 'null'));
      sessionStorage.removeItem('markethub-navigation-state');
    } catch { setState(null); }
  }, [pathname]);
  return { pathname, state };
}

export function useSearchParams() {
  const pathname = usePathname();
  const router = useRouter();
  const [params, setParams] = useState(() => new URLSearchParams());
  useEffect(() => {
    const sync = () => setParams(new URLSearchParams(window.location.search));
    sync();
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, [pathname]);
  const updateParams = useCallback((next) => {
    const value = typeof next === 'function' ? next(new URLSearchParams(params)) : next;
    const query = value.toString();
    setParams(new URLSearchParams(query));
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [params, pathname, router]);
  return [params, updateParams];
}

export function useParams() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean).map((part) => decodeURIComponent(part));
  if (segments[0] === 'product') return { id: segments[1] };
  if (segments[0] === 'store') return { slug: segments[1] };
  if (segments[0] === 'category') return { category: segments[1] };
  return {};
}
