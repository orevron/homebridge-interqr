const { HomebridgePluginUiServer } = require('@homebridge/plugin-ui-utils');

class PluginUiServer extends HomebridgePluginUiServer {
    constructor() {
        super();
        let api;
        try {
            api = require('../dist/api').InterQRApiClient;
        } catch (e) {
            this.pushEvent('print-log', 'Failed to load api client. Please ensure you built the plugin.');
        }

        this.apiClient = new api();
        this.currentDeviceUuid = null;

        this.onRequest('/request-sms', this.handleRequestSms.bind(this));
        this.onRequest('/verify-sms', this.handleVerifySms.bind(this));

        this.ready();
    }

    async handleRequestSms(payload) {
        try {
            const initRes = await this.apiClient.initDevice();
            this.currentDeviceUuid = initRes.data.device_uuid;

            await this.apiClient.start2FA(payload.phone, this.currentDeviceUuid);
            return { success: true };
        } catch (e) {
            throw new Error(e.message || 'Failed to request SMS code');
        }
    }

    async handleVerifySms(payload) {
        try {
            const res = await this.apiClient.verify2FA(payload.phone, payload.code, this.currentDeviceUuid);
            return {
                success: true,
                token: res.data.token,
                deviceUuid: this.currentDeviceUuid
            };
        } catch (e) {
            throw new Error(e.message || 'Failed to verify SMS code');
        }
    }
}

(() => {
    return new PluginUiServer();
})();
