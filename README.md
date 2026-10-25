# ARY Plus TV - Samsung Tizen (Q60A) Web Application

Custom-built high performance Tizen web application for Samsung Smart TVs, specifically optimized for the **Samsung Q60A QLED (Tizen 6.0)**.

## Project Structure
- `config.xml`: Tizen TV manifest with Samsung TV privileges and CSP network permissions.
- `index.html`: 10-foot TV resolution (1920x1080) interface.
- `css/style.css`: Clean TV UI with focus states, scaling transitions, and hero backdrop.
- `js/app.js`: Connects to ARY Plus backend (`be.aryplus.tv`), parses live channels and drama catalogs, and manages spatial D-Pad navigation.
- `js/player.js`: Native `webapis.avplay` hardware player with dynamic buffer tuning for Tizen 6.0 + HTML5 fallback.
- `icons/icon.png`: App launcher icon.
- `.vscode/launch.json`: VS Code launch configuration for Tizen TV.

---

## Deploying directly to your Samsung Q60A TV

### Step 1: Enable Developer Mode on your Samsung TV
1. Turn on your **Samsung Q60A**.
2. Press the **Home** button on your remote and go to **Apps**.
3. While inside Apps, press keys `1` `2` `3` `4` `5` on the remote sequentially.
4. A developer popup will appear:
   - Toggle **Developer Mode** to **ON**.
   - In the **Host PC IP** field, type your computer's local IP address (e.g. `192.168.1.xxx`).
5. Turn the TV off and back on (or hold the remote Power button for 5 seconds until the TV reboots).

### Step 2: Connect PC to TV via SDB
1. Find your TV's IP address in:
   `Settings -> General -> Network -> Network Status -> IP Settings`
2. Open PowerShell or Command Prompt on your PC and run:
   ```powershell
   sdb connect <TV_IP_ADDRESS>:26101
   ```
3. Check connected devices:
   ```powershell
   sdb devices
   ```

### Step 3: Install & Launch
Run inside this project directory:
```powershell
# 1. Package the widget
tizen package -t wgt -s <YourSecurityProfileName>

# 2. Install to TV
tizen install -n AryPlusTV.wgt -t <TV_Device_Name>

# 3. Launch App
tizen run -p tL8G1A0X4A.AryPlusTV -t <TV_Device_Name>
```

---

## Remote Control Key Map
| Remote Key | Function |
|---|---|
| **Arrow Up / Down** | Switch between content rows & categories |
| **Arrow Left / Right** | Browse items in row / Access sidebar |
| **Enter / OK** | Play selected live stream or episode |
| **Return / Back** | Exit video player / Exit app |
| **Play / Pause** | Toggle playback |
| **Fast Forward / Rewind** | Skip +/- 15 seconds (VOD streams) |

