const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

interface RequestOptions extends Omit<RequestInit, "headers"> {
  headers?: Record<string, string>;
  token?: string;
  data?: any;
}

async function request(path: string, options: RequestOptions = {}) {
  const { data, method = "GET", headers = {}, ...rest } = options;
  const fullUrl = `${API_BASE_URL}${path}`;

  const reqHeaders: Record<string, string> = {
    ...headers,
  };

  // Automatically add bearer token from localStorage if present
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("route53_token");
    if (token) {
      reqHeaders["Authorization"] = `Bearer ${token}`;
    }
  }

  let body: any = undefined;
  if (data) {
    if (data instanceof FormData) {
      body = data;
      // Do not set Content-Type for FormData, the browser will set it with the boundary
    } else {
      reqHeaders["Content-Type"] = "application/json";
      body = JSON.stringify(data);
    }
  }

  const response = await fetch(fullUrl, {
    method,
    headers: reqHeaders,
    body,
    ...rest,
  });

  if (response.status === 204) {
    return null;
  }

  const responseData = await response.json();
  if (!response.ok) {
    throw new Error(responseData.detail || "An error occurred during the request.");
  }

  return responseData;
}

export const api = {
  auth: {
    async signup(username: string, password: string) {
      const res = await request("/api/auth/signup", {
        method: "POST",
        data: { username, password },
      });
      return res;
    },
    async login(username: string, password: string) {
      const res = await request("/api/auth/login", {
        method: "POST",
        data: { username, password },
      });
      if (typeof window !== "undefined") {
        localStorage.setItem("route53_token", res.access_token);
        localStorage.setItem("route53_account_id", res.aws_account_id);
        localStorage.setItem("route53_username", res.username);
      }
      return res;
    },
    logout() {
      if (typeof window !== "undefined") {
        localStorage.removeItem("route53_token");
        localStorage.removeItem("route53_account_id");
        localStorage.removeItem("route53_username");
      }
    },
    async getMe() {
      return await request("/api/auth/me");
    },
    isAuthenticated(): boolean {
      if (typeof window !== "undefined") {
        return !!localStorage.getItem("route53_token");
      }
      return false;
    },
    getAwsAccountId(): string {
      if (typeof window !== "undefined") {
        return localStorage.getItem("route53_account_id") || "1234-5678-9012";
      }
      return "1234-5678-9012";
    },
    getUsername(): string {
      if (typeof window !== "undefined") {
        return localStorage.getItem("route53_username") || "";
      }
      return "";
    }
  },
  zones: {
    async list(search?: string, privateZone?: boolean) {
      let path = "/api/zones";
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (privateZone !== undefined) params.append("private_zone", String(privateZone));
      
      const query = params.toString();
      if (query) path += `?${query}`;
      
      return await request(path);
    },
    async get(zoneId: string) {
      return await request(`/api/zones/${zoneId}`);
    },
    async create(name: string, comment: string, privateZone: boolean, vpcId?: string, vpcRegion?: string) {
      return await request("/api/zones", {
        method: "POST",
        data: {
          name,
          comment,
          private_zone: privateZone,
          vpc_id: vpcId || null,
          vpc_region: vpcRegion || null,
        },
      });
    },
    async update(zoneId: string, comment: string) {
      return await request(`/api/zones/${zoneId}`, {
        method: "PUT",
        data: { comment },
      });
    },
    async delete(zoneId: string) {
      return await request(`/api/zones/${zoneId}`, {
        method: "DELETE",
      });
    },
    async bulkDelete(zoneIds: string[]) {
      return await request("/api/zones/bulk-delete", {
        method: "POST",
        data: zoneIds,
      });
    },
  },
  records: {
    async list(zoneId: string, search?: string, type?: string) {
      let path = `/api/zones/${zoneId}/records`;
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (type) params.append("type", type);
      
      const query = params.toString();
      if (query) path += `?${query}`;
      
      return await request(path);
    },
    async create(zoneId: string, record: { name: string; type: string; ttl: number; values: string[]; routing_policy?: string; weight?: number }) {
      return await request(`/api/zones/${zoneId}/records`, {
        method: "POST",
        data: record,
      });
    },
    async update(zoneId: string, recordId: string, updates: { ttl?: number; values?: string[]; routing_policy?: string; weight?: number }) {
      return await request(`/api/zones/${zoneId}/records/${recordId}`, {
        method: "PUT",
        data: updates,
      });
    },
    async delete(zoneId: string, recordId: string) {
      return await request(`/api/zones/${zoneId}/records/${recordId}`, {
        method: "DELETE",
      });
    },
    async importBind(zoneId: string, file: File) {
      const formData = new FormData();
      formData.append("file", file);
      return await request(`/api/zones/${zoneId}/records/import`, {
        method: "POST",
        data: formData,
      });
    },
    async export(zoneId: string, format: "bind" | "json") {
      return await request(`/api/zones/${zoneId}/records/export?format=${format}`);
    },
    async bulkDelete(zoneId: string, recordIds: string[]) {
      return await request(`/api/zones/${zoneId}/records/bulk-delete`, {
        method: "POST",
        data: recordIds,
      });
    },
  },
  changes: {
    async get(changeId: string) {
      return await request(`/2013-04-01/change/${changeId}`);
    },
  },
};
