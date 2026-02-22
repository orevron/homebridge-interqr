import {
    API,
    DynamicPlatformPlugin,
    Logger,
    PlatformAccessory,
    PlatformConfig,
    Service,
    Characteristic,
} from 'homebridge';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { InterQRAccessory } from './platformAccessory';
import { InterQRApiClient } from './api';

export class InterQRPlatform implements DynamicPlatformPlugin {
    public readonly Service: typeof Service;
    public readonly Characteristic: typeof Characteristic;

    public readonly accessories: Map<string, PlatformAccessory> = new Map();
    public apiClient: InterQRApiClient;
    private updateIntervalMs: number;
    private refreshTimer?: NodeJS.Timeout;

    constructor(
        public readonly log: Logger,
        public readonly config: PlatformConfig,
        public readonly api: API,
    ) {
        this.Service = this.api.hap.Service;
        this.Characteristic = this.api.hap.Characteristic;

        this.log.debug('Finished initializing platform:', this.config.name);

        this.apiClient = new InterQRApiClient();
        this.updateIntervalMs = (this.config.updateInterval || 5) * 60 * 1000;

        this.api.on('didFinishLaunching', () => {
            this.log.debug('Executed didFinishLaunching callback');

            if (!this.config.token || !this.config.deviceUuid) {
                this.log.error('Authentication token or Device UUID missing. Please configure the plugin via the Homebridge UI.');
                return;
            }

            this.apiClient.setToken(this.config.token);
            this.apiClient.setDeviceUuid(this.config.deviceUuid);

            this.discoverDevices();
        });
    }

    configureAccessory(accessory: PlatformAccessory) {
        this.log.info('Loading accessory from cache:', accessory.displayName);
        this.accessories.set(accessory.UUID, accessory);
    }

    async discoverDevices(): Promise<void> {
        try {
            const details = await this.apiClient.getUserDetails();

            if (!details || !details.data || !details.data.locks) {
                this.log.warn('No locks found for this account.');
                return;
            }

            const locks = details.data.locks;
            const discoveredUUIDs: string[] = [];

            for (const lock of locks) {
                const uuid = this.api.hap.uuid.generate(lock.uuid);
                discoveredUUIDs.push(uuid);
                let accessory = this.accessories.get(uuid);

                if (accessory) {
                    this.log.info('Restoring existing accessory from cache:', accessory.displayName);
                    accessory.context.device = lock;
                    this.api.updatePlatformAccessories([accessory]);
                    new InterQRAccessory(this, accessory);
                } else {
                    this.log.info('Adding new accessory:', lock.description || lock.name);
                    accessory = new this.api.platformAccessory(lock.description || lock.name, uuid);
                    accessory.context.device = lock;

                    this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
                    this.accessories.set(uuid, accessory);
                    new InterQRAccessory(this, accessory);
                }
            }

            // Remove stale accessories
            for (const [uuid, accessory] of this.accessories.entries()) {
                if (!discoveredUUIDs.includes(uuid)) {
                    this.log.info('Removing existing accessory from cache:', accessory.displayName);
                    this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
                    this.accessories.delete(uuid);
                }
            }

            this.scheduleNextUpdate();

        } catch (error: any) {
            if (error.message.includes('Authentication failed')) {
                this.log.warn('Authentication failed. Attempting silent token refresh via login...');
                const success = await this.refreshAuthToken();
                if (success) {
                    this.log.info('Token refreshed successfully. Retrying discovery...');
                    return this.discoverDevices();
                } else {
                    this.log.error('Failed to refresh token. Please re-authenticate via Homebridge Settings or check configuration.');
                }
            } else {
                this.log.error('Error discovering devices:', error.message);
            }

            // Try again later even if failed
            this.scheduleNextUpdate();
        }
    }

    async refreshAuthToken(): Promise<boolean> {
        try {
            if (!this.config.deviceUuid) return false;
            const result = await this.apiClient.login(this.config.deviceUuid);
            if (result && result.data && result.data.token) {
                // Technically, this token is stored in memory. We'd ideally save it back to config.
                // Since homebridge doesn't officially support programmatic config updates easily,
                // we'll at least keep it working until restart. The user should update config if they restart.
                this.config.token = result.data.token;
                this.log.warn('Token refreshed in memory. Please note that if you restart Homebridge, you might need to re-login via UI if the old token is permanently revoked.');
                return true;
            }
            return false;
        } catch (error: any) {
            this.log.error('Silent refresh failed:', error.message);
            return false;
        }
    }

    scheduleNextUpdate() {
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
        }

        this.refreshTimer = setTimeout(() => {
            this.discoverDevices();
        }, this.updateIntervalMs);
    }
}
