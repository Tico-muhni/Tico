const TRANSIENT_STATUSES = new Set([429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 3;

function getConfig() {
  const baseUrl = process.env.SMART_NPV_BASE_URL;
  const token = process.env.SMART_NPV_API_TOKEN;
  if (!baseUrl || !token) {
    throw new Error(
      "SMART_NPV_BASE_URL and SMART_NPV_API_TOKEN must be set. See .env.example."
    );
  }
  return { baseUrl: baseUrl.replace(/\/$/, ""), token };
}

async function request<T>(
  method: "GET" | "POST",
  path: string,
  body?: Record<string, unknown>
): Promise<T> {
  const { baseUrl, token } = getConfig();
  let lastError = "";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });

    if (res.ok) {
      return (await res.json()) as T;
    }

    const text = await res.text();
    lastError = `Smart NPV API ${method} ${path} → ${res.status}: ${text.slice(0, 300)}`;

    if (!TRANSIENT_STATUSES.has(res.status) || attempt === MAX_ATTEMPTS) {
      throw new Error(lastError);
    }
    await new Promise((r) => setTimeout(r, attempt * 2000));
  }

  throw new Error(lastError);
}

// ── Clients ──

export type SnpvClient = {
  id: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  [key: string]: unknown;
};

export async function getClient(clientId: string): Promise<SnpvClient> {
  return request<SnpvClient>("GET", `/clients/${clientId}`);
}

export async function getClientsList(params?: {
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{ data: SnpvClient[]; total?: number }> {
  const qs = new URLSearchParams();
  if (params?.search) qs.set("search", params.search);
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  const query = qs.toString();
  return request("GET", `/clients${query ? `?${query}` : ""}`);
}

export async function createClient(data: {
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  [key: string]: unknown;
}): Promise<SnpvClient> {
  return request("POST", "/clients", data);
}

export async function updateClient(
  clientId: string,
  data: Record<string, unknown>
): Promise<SnpvClient> {
  return request("POST", `/clients/${clientId}/update`, data);
}

// ── Documents ──

export type SnpvDocumentation = {
  id: string;
  name?: string;
  type?: string;
  status?: string;
  [key: string]: unknown;
};

export async function getClientDocumentations(
  clientId: string
): Promise<SnpvDocumentation[]> {
  const res = await request<{ data: SnpvDocumentation[] } | SnpvDocumentation[]>(
    "GET",
    `/clients/${clientId}/documentations`
  );
  return Array.isArray(res) ? res : res.data;
}

export async function addDocumentation(
  clientId: string,
  data: { name: string; type?: string; [key: string]: unknown }
): Promise<SnpvDocumentation> {
  return request("POST", `/clients/${clientId}/documentation`, data);
}

export async function saveDocument(
  clientId: string,
  data: {
    name: string;
    file?: string; // base64
    fileUrl?: string;
    type?: string;
    [key: string]: unknown;
  }
): Promise<{ id: string; [key: string]: unknown }> {
  return request("POST", `/clients/${clientId}/document`, data);
}

// ── Records ──

export async function getRecords(
  clientId: string
): Promise<Record<string, unknown>[]> {
  const res = await request<{ data: Record<string, unknown>[] } | Record<string, unknown>[]>(
    "GET",
    `/clients/${clientId}/records`
  );
  return Array.isArray(res) ? res : res.data;
}

// ── Status ──

export async function getClientStatus(
  clientId: string
): Promise<{ status: string; [key: string]: unknown }> {
  return request("GET", `/clients/${clientId}/status`);
}

// ── Workflow / Tasks ──

export async function getClientWorkflow(
  clientId: string
): Promise<Record<string, unknown>[]> {
  const res = await request<{ data: Record<string, unknown>[] } | Record<string, unknown>[]>(
    "GET",
    `/clients/${clientId}/workflow`
  );
  return Array.isArray(res) ? res : res.data;
}

export async function addTask(
  clientId: string,
  task: { title: string; description?: string; [key: string]: unknown }
): Promise<Record<string, unknown>> {
  return request("POST", `/clients/${clientId}/task`, task);
}

// ── Payments ──

export async function getClientPayments(
  clientId: string
): Promise<Record<string, unknown>[]> {
  const res = await request<{ data: Record<string, unknown>[] } | Record<string, unknown>[]>(
    "GET",
    `/clients/${clientId}/payments`
  );
  return Array.isArray(res) ? res : res.data;
}
