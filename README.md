# ARY Plus TV - Samsung Tizen Web Application

Custom-built high performance Tizen web application for Samsung Smart TVs, specifically optimized for the **Samsung Q60A QLED (Tizen 6.0+)**.

---

## Features
- **Official ARY Plus Design**: Brand colors (`#6bfe12` neon green), high-contrast TV focus indicators, and 1080p full HD spatial layout.
- **AVPlay Hardware Decoding**: High performance video rendering using Samsung's native `webapis.avplay` hardware underlay.
- **Full Catalog & Live Streaming**: Browse TV dramas, shows, categories, and live TV channels with pagination and episode selection drawer.
- **D-Pad Navigation**: Optimized for remote control navigation without requiring an air mouse or pointer.

---

## Installation via Apps2Samsung (Easiest Method - No Tizen Studio Required)

[Apps2Samsung](https://github.com/Apps2Samsung/Apps2Samsung) allows sideloading custom `.wgt` apps directly onto your Samsung TV from Windows, macOS, Linux, or even an Android phone.

### Step 1: Enable Developer Mode on your Samsung TV
1. Turn on your Samsung TV.
2. Press the **Home** button on your remote and navigate to **Apps**.
3. On your remote, press the numeric sequence **`1` `2` `3` `4` `5`** (use the remote number buttons or the on-screen `123` keypad).
4. The **Developer Mode** popup will appear:
   - Toggle **Developer Mode** to **ON**.
   - In the **Host PC IP** field, enter your PC's or mobile phone's local network IP address (e.g., `192.168.1.xxx`).
5. **Restart your TV**: Hold down the **Power** button on your Samsung remote for 5 seconds until the TV turns off and reboots with the Samsung logo.

### Step 2: Download the ARY Plus TV Package
Download the latest `AryPlusTV_signed.wgt` or `AryPlusTV.wgt` from the **[Releases](https://github.com/punkidow/AryPlusTV-Tizen/releases)** section of this repository.

### Step 3: Install using Apps2Samsung
1. Download and run **[Apps2Samsung](https://github.com/Apps2Samsung/Apps2Samsung/releases)** on your PC or Android device (ensure your device is on the same Wi-Fi/local network as your TV).
2. Select your TV from the discovered device list (or manually enter your TV's IP address).
3. If prompted, sign in with a Samsung account to let Apps2Samsung generate the required developer certificate.
4. Choose **Install Custom WGT** (or drag & drop the downloaded `AryPlusTV.wgt` / `AryPlusTV_signed.wgt` file into Apps2Samsung).
5. Click **Install**. Once finished, ARY Plus will appear in your TV's home launcher bar and Apps drawer!

---

## Alternative Installation: Developer CLI (Tizen Studio / SDB)

For developers with Tizen CLI and SDB installed on their machine:

### 1. Connect via SDB
```powershell
sdb connect <TV_IP_ADDRESS>:26101
sdb devices
```

### 2. Build & Package
```powershell
# Rebuild single-page bundle
node rebuild_index.js

# Package WGT
powershell -ExecutionPolicy Bypass -File build.ps1

# Sign package (if using developer certificate profile)
& tz pack -t wgt -s DevProfile -p .\profiles.xml -b .\AryPlusTV.wgt -o .\AryPlusTV_signed.wgt
```

### 3. Install & Launch
```powershell
# Install to TV
& tz install -e <TV_IP_ADDRESS>:26101 -p .\AryPlusTV_signed.wgt

# Launch app
& sdb -s <TV_IP_ADDRESS>:26101 shell 0 was_execute tL8G1A0X4A.AryPlusTV
```

---

## Remote Control Key Map

| Remote Key | Function |
|---|---|
| **Arrow Up / Down** | Switch between content rows & categories |
| **Arrow Left / Right** | Browse items in row / Access sidebar drawer |
| **Enter / OK** | Select item / Play selected live stream or episode |
| **Return / Back** | Close video player / Close drawer / Exit app |
| **Play / Pause** | Toggle video playback |
| **Fast Forward / Rewind** | Seek +/- 10 seconds |

---

## Project Structure
```text
AryPlusTV-Tizen/
├── config.xml             # Tizen TV manifest, privileges, and icon definition
├── index.html             # Bundled single-page app shell (1080p canvas)
├── icon.png               # App launcher icon (117x117)
├── build.ps1              # Packaging script for AryPlusTV.wgt
├── package_wgt.js         # Zip bundler with POSIX forward slash normalization
├── rebuild_index.js       # Inlines CSS and JS into single-file index.html
├── profiles.xml           # Tizen developer signature profile
├── css/
│   └── style.css          # TV UI styling, high contrast focus states
├── js/
│   ├── app.js             # D-Pad navigation, API coordinator & UI state
│   ├── player.js          # AVPlay hardware video engine
│   ├── fallback_categories.js # Instant offline boot catalog
│   └── fallback_data.js   # Offline catalog fallback
└── icons/                 # Brand assets
```
