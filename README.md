<p align="center">
  <img src="https://raw.githubusercontent.com/orevron/ha-interqr/main/logo.png" alt="InterQR Logo" width="180" />
</p>

# homebridge-interqr

<p align="center">
  <a href="https://github.com/orevron/homebridge-interqr/releases"><img alt="Release" src="https://img.shields.io/github/v/release/orevron/homebridge-interqr?style=flat-square" /></a>
  <a href="https://github.com/homebridge/homebridge"><img alt="Homebridge Compatible" src="https://img.shields.io/badge/homebridge-compatible-4db8ea.svg?style=flat-square" /></a>
  <a href="https://github.com/orevron/homebridge-interqr/blob/main/LICENSE"><img alt="License" src="https://img.shields.io/github/license/orevron/homebridge-interqr?style=flat-square" /></a>
</p>

<p align="center">Control your InterQR smart locks directly from Homebridge.</p>

## Description

**InterQR** is a QR-code-based building access and smart lock system commonly used in residential and office buildings. The `homebridge-interqr` plugin allows you to integrate your InterQR locks seamlessly into your Apple Home ecosystem.

You can easily add your locks using the same phone number and SMS verification code used in the InterQR mobile app. Once authenticated, your authorized locks automatically populate as physical Lock mechanisms within Homebridge and Apple Home.

## Features

- **Unlock InterQR Locks:** Open connected building or office doors with a tap from the Home app or via Siri.
- **Auto-Relock State Tracking:** InterQR systems are typically "unlock-only" access controls (the physical door locks automatically). To ensure consistency, Homebridge will automatically revert the device state back to "locked" 5 seconds after an unlock command is issued.
- **Seamless Authentication:** Log in securely via the Homebridge UI settings using your mobile number and SMS 2FA code. The plugin securely manages session tokens in the background and attempts automatic silent re-authentication.
- **Multi-Lock Support:** Automatically discovers and creates accessory entities for all locks assigned to your InterQR account.

## Supported Devices

- InterQR Smart Locks (including Palgate-compatible locks managed via InterQR)

## Installation & Setup

1. Install the plugin using `npm`:
   ```sh
   npm install -g homebridge-interqr
   ```
   Or install it directly via the Homebridge Config UI X (search for `homebridge-interqr`).
   
2. Navigate to the Plugins tab in your Homebridge Config UI X.

3. Open the **Settings** for `homebridge-interqr`.

4. Use the custom configuration interface to:
   - Enter your phone number (with the country code, e.g., `+1234567890`)
   - Click "Send SMS Code"
   - Enter the 4-8 digit SMS verification code received
   - Click "Verify Code"

5. Restart Homebridge. Your connected locks will be discovered and added to Apple Home automatically.

## Usage

Once installed and configured, your InterQR lock(s) will appear as standard Lock accessories in Homebridge and Apple Home, displaying a Locked/Unlocked status.

### Behaviours

- **Unlocking:** Toggling the lock to "Unlocked" will trigger the physical unlock command via the InterQR cloud API. 
- **Auto Re-Locking:** As the physical InterQR locks are unlock-only, the Apple Home accessory status will briefly show "Unlocked" and wait 5 seconds before reverting to "Locked" to reflect the actual state of the entrance door.
- **Actioning "Lock":** Manually toggling the lock to "Locked" does not send a command but correctly establishes the consistent state in HomeKit.

## Error Handling & Re-authentication

If a session token naturally expires, the plugin will log an error and attempt to silently refresh the token via the background API. If your token was significantly revoked, you may see an `Authentication failed` log. In this case, simply revisit the Homebridge UI Plugin Settings, walk through the SMS login workflow again, and restart the service.

## Security

This plugin:
- Employs secure SMS-based 2FA.
- Communicates directly with the official InterQR Cloud HTTPS API.
- Stores zero personally identifiable credential data in your public repositories.
- Only maintains minimal session payloads inside the standard config UI context JSON.

## Disclaimer

This plugin is not officially affiliated with or endorsed by InterQR. It was developed independently. Use at your own risk.
