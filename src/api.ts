import crypto from 'crypto';

const DEFAULT_BASE_URL = "https://www.interqr.com/api";
const ENDPOINT_INIT = "/init";
const ENDPOINT_LOGIN = "/login";
const ENDPOINT_LOGOUT = "/logout";
const ENDPOINT_TWOFA_START = "/twofa/start";
const ENDPOINT_TWOFA_VERIFY = "/twofa/verify";
const ENDPOINT_USER_DETAILS = "/resource/user/details";
const ENDPOINT_UNLOCK = "/locks/{uuid}/unlock";
const ENDPOINT_UNLOCK_LONG = "/locks/{uuid}/unlock-long";

const APP_VERSION = "3.5.8";
const DEVICE_MANUFACTURER = "Athom";
const DEVICE_MODEL = "Integration";
const DEVICE_PLATFORM = "Homebridge";

export class InterQRApiClient {
    public baseUrl: string;
    public token: string | null = null;
    public deviceUuid: string | null = null;

    constructor(baseUrl: string = DEFAULT_BASE_URL) {
        this.baseUrl = baseUrl.replace(/\/$/, '');
    }

    setToken(token: string) {
        this.token = token;
    }

    setDeviceUuid(uuid: string) {
        this.deviceUuid = uuid;
    }

    async _request(method: string, endpoint: string, options: { jsonData?: any, authenticated?: boolean } = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        if (options.authenticated && this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        const fetchOptions: RequestInit = {
            method,
            headers,
        };

        if (options.jsonData) {
            fetchOptions.body = JSON.stringify(options.jsonData);
        }

        const response = await fetch(url, fetchOptions);

        const contentType = response.headers.get('Content-Type') || '';
        if (!contentType.includes('application/json')) {
            throw new Error(`Unexpected response type from server: ${contentType}`);
        }

        const data = await response.json() as any;

        if (response.status === 401) {
            throw new Error('Authentication failed');
        }

        if (response.status >= 400) {
            throw new Error(data.message || `API error (HTTP ${response.status})`);
        }

        return data;
    }

    async initDevice(deviceUuid: string | null = null) {
        if (!deviceUuid) {
            deviceUuid = crypto.randomUUID();
        }
        this.deviceUuid = deviceUuid;

        const payload = {
            device_uuid: this.deviceUuid,
            manufacturer: DEVICE_MANUFACTURER,
            model: DEVICE_MODEL,
            platform: DEVICE_PLATFORM,
            os_version: "1.0",
            app_version: APP_VERSION,
        };

        const result = await this._request('POST', ENDPOINT_INIT, { jsonData: payload });
        if (result && result.data && result.data.device_uuid) {
            this.deviceUuid = result.data.device_uuid;
        }
        return result;
    }

    async start2FA(phoneNumber: string, deviceUuid: string) {
        const payload = {
            number: phoneNumber,
            device_uuid: deviceUuid,
        };
        return await this._request('POST', ENDPOINT_TWOFA_START, { jsonData: payload });
    }

    async verify2FA(phoneNumber: string, code: string, deviceUuid: string, secondAuthToken: string | null = null) {
        const payload: any = {
            number: phoneNumber,
            code: code,
            device_uuid: deviceUuid,
        };
        if (secondAuthToken) {
            payload.second_auth_token = secondAuthToken;
        }

        const result = await this._request('POST', ENDPOINT_TWOFA_VERIFY, { jsonData: payload });
        if (result && result.data && result.data.token) {
            this.token = result.data.token;
        } else {
            throw new Error('No token in verify response');
        }

        return result;
    }

    async login(deviceUuid: string | null = null) {
        const uuidToUse = deviceUuid || this.deviceUuid;
        if (!uuidToUse) {
            throw new Error('No device_uuid available for login');
        }

        const payload = { device_uuid: uuidToUse };
        const result = await this._request('POST', ENDPOINT_LOGIN, { jsonData: payload });
        if (result && result.data && result.data.token) {
            this.token = result.data.token;
        }
        return result;
    }

    async logout() {
        if (!this.token) return;
        try {
            await this._request('POST', ENDPOINT_LOGOUT, { authenticated: true });
        } catch (err) {
            // Best-effort logout
        } finally {
            this.token = null;
        }
    }

    async getUserDetails() {
        return await this._request('GET', ENDPOINT_USER_DETAILS, { authenticated: true });
    }

    async unlock(lockUuid: string) {
        const endpoint = ENDPOINT_UNLOCK.replace('{uuid}', lockUuid);
        return await this._request('POST', endpoint, { authenticated: true });
    }

    async unlockLong(lockUuid: string) {
        const endpoint = ENDPOINT_UNLOCK_LONG.replace('{uuid}', lockUuid);
        return await this._request('POST', endpoint, { authenticated: true });
    }
}
