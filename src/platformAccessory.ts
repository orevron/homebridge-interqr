import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';

import { InterQRPlatform } from './platform';

export class InterQRAccessory {
    private service: Service;
    private autoRelockTimer?: NodeJS.Timeout;

    constructor(
        private readonly platform: InterQRPlatform,
        private readonly accessory: PlatformAccessory,
    ) {
        const device = accessory.context.device;

        this.accessory.getService(this.platform.Service.AccessoryInformation)!
            .setCharacteristic(this.platform.Characteristic.Manufacturer, 'InterQR')
            .setCharacteristic(this.platform.Characteristic.Model, 'Smart Lock')
            .setCharacteristic(this.platform.Characteristic.SerialNumber, device.uuid);

        this.service = this.accessory.getService(this.platform.Service.LockMechanism) || this.accessory.addService(this.platform.Service.LockMechanism);

        this.service.setCharacteristic(this.platform.Characteristic.Name, device.description || device.name);

        // Initial state is Locked
        this.service.updateCharacteristic(this.platform.Characteristic.LockCurrentState, this.platform.Characteristic.LockCurrentState.SECURED);
        this.service.updateCharacteristic(this.platform.Characteristic.LockTargetState, this.platform.Characteristic.LockTargetState.SECURED);

        this.service.getCharacteristic(this.platform.Characteristic.LockTargetState)
            .onSet(this.setLockTargetState.bind(this));
    }

    async setLockTargetState(value: CharacteristicValue) {
        if (value === this.platform.Characteristic.LockTargetState.SECURED) {
            this.platform.log.debug(`[${this.accessory.displayName}] Ignoring lock command since InterQR is unlock-only.`);

            this.service.updateCharacteristic(this.platform.Characteristic.LockCurrentState, this.platform.Characteristic.LockCurrentState.SECURED);
            return;
        }

        // Unsecured requested
        try {
            this.platform.log.info(`[${this.accessory.displayName}] Sending unlock command...`);
            await this.platform.apiClient.unlock(this.accessory.context.device.uuid);
            this.platform.log.info(`[${this.accessory.displayName}] Unlocked successfully.`);

            this.service.updateCharacteristic(this.platform.Characteristic.LockCurrentState, this.platform.Characteristic.LockCurrentState.UNSECURED);

            if (this.autoRelockTimer) {
                clearTimeout(this.autoRelockTimer);
            }

            this.autoRelockTimer = setTimeout(() => {
                this.platform.log.debug(`[${this.accessory.displayName}] Auto-relocking homebridge state.`);
                this.service.updateCharacteristic(this.platform.Characteristic.LockTargetState, this.platform.Characteristic.LockTargetState.SECURED);
                this.service.updateCharacteristic(this.platform.Characteristic.LockCurrentState, this.platform.Characteristic.LockCurrentState.SECURED);
            }, 5000);

        } catch (error: any) {
            this.platform.log.error(`[${this.accessory.displayName}] Failed to unlock: ${error.message}`);
            // Revert to locked state
            this.service.updateCharacteristic(this.platform.Characteristic.LockTargetState, this.platform.Characteristic.LockTargetState.SECURED);
            this.service.updateCharacteristic(this.platform.Characteristic.LockCurrentState, this.platform.Characteristic.LockCurrentState.SECURED);
        }
    }
}
