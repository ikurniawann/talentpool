type QueryValue = string | number | boolean | undefined | null;

export function buildListUrl(base: string, params?: Record<string, QueryValue>) {
  if (!params) return base;

  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      qs.set(key, String(value));
    }
  });

  const query = qs.toString();
  return query ? `${base}?${query}` : base;
}

async function parseJson<T>(res: Response): Promise<T> {
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      typeof json === "object" && json && "error" in json
        ? String((json as { error?: string }).error)
        : `Request failed (${res.status})`;
    throw new Error(message);
  }
  return json as T;
}

export function apiGet<T>(url: string) {
  return fetch(url).then((res) => parseJson<T>(res));
}

export function apiPost<T>(url: string, body: unknown) {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then((res) => parseJson<T>(res));
}

export function apiPut<T>(url: string, body: unknown) {
  return fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then((res) => parseJson<T>(res));
}

export function apiPatch<T>(url: string, body: unknown) {
  return fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then((res) => parseJson<T>(res));
}

export function apiDelete(url: string) {
  return fetch(url, { method: "DELETE" }).then((res) => parseJson<{ success?: boolean }>(res));
}
